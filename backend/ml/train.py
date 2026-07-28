import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix
import xgboost as xgb

def create_target_labels(row):
    """
    Generate target labels using heuristic logical rules.
    0 = Low Risk, 1 = Medium Risk, 2 = High Risk
    """
    # High Risk criteria
    if row['weather_severity_score'] > 0.8 or row['visibility'] < 2000 or row['wind_speed'] > 25 or row['deviation_percentage'] > 15:
        return 2
    # Medium Risk criteria
    elif row['weather_severity_score'] > 0.4 or row['visibility'] < 5000 or row['wind_speed'] > 15 or abs(row['altitude_change']) > 500 or row['deviation_percentage'] > 5:
        return 1
    # Low Risk criteria
    else:
        return 0

def run_training_pipeline():
    print("Starting ML Model Development Pipeline...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, 'models')
    plots_dir = os.path.join(base_dir, 'plots')
    
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
        
    # 1. Load feature_dataset.csv
    # Actually, we load processed_dataset.csv to get the raw unscaled features so we can fit the StandardScaler
    # and save it for production inference.
    dataset_path = os.path.join(base_dir, 'processed_dataset.csv')
    print(f"Loading dataset from {dataset_path}...")
    df = pd.read_csv(dataset_path)
    
    # 2. Create target column: route_deviation_risk
    print("Generating target labels...")
    df['route_deviation_risk'] = df.apply(create_target_labels, axis=1)
    
    # Drop rows with NaNs if any slipped through
    df = df.dropna()
    
    # Define features to train on
    features = [
        'altitude', 'speed', 'heading', 'wind_speed', 'temperature', 
        'pressure', 'humidity', 'visibility', 'altitude_change', 
        'speed_change', 'heading_change', 'wind_effect', 
        'route_distance', 'weather_severity_score', 
        'deviation_distance', 'deviation_percentage'
    ]
    
    X = df[features]
    y = df['route_deviation_risk']
    
    # 3. Split dataset into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Scale Features
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save the scaler
    joblib.dump(scaler, os.path.join(models_dir, 'scaler.pkl'))
    
    # Label encoder for target (though it's already 0,1,2, good practice)
    le = LabelEncoder()
    y_train_encoded = le.fit_transform(y_train)
    y_test_encoded = le.transform(y_test)
    joblib.dump(le, os.path.join(models_dir, 'label_encoder.pkl'))
    
    # 4. Train multiple models
    print("Training models...")
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, random_state=42),
        'XGBoost': xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    }
    
    results = {}
    best_f1 = -1
    best_model_name = ""
    best_model = None
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train_scaled, y_train_encoded)
        preds = model.predict(X_test_scaled)
        
        # 5. Compare metrics (using weighted average for multi-class)
        acc = accuracy_score(y_test_encoded, preds)
        prec = precision_score(y_test_encoded, preds, average='weighted', zero_division=0)
        rec = recall_score(y_test_encoded, preds, average='weighted', zero_division=0)
        f1 = f1_score(y_test_encoded, preds, average='weighted', zero_division=0)
        
        results[name] = {'Accuracy': acc, 'Precision': prec, 'Recall': rec, 'F1 Score': f1}
        
        # 6. Select the best-performing model automatically based on F1
        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model = model

    print("\n--- Model Comparison ---")
    results_df = pd.DataFrame(results).T
    print(results_df)
    
    print(f"\nBest Model Selected: {best_model_name} (F1: {best_f1:.4f})")
    
    # 7. Save the best model
    model_path = os.path.join(models_dir, 'model.pkl')
    joblib.dump(best_model, model_path)
    print(f"Saved best model to {model_path}")
    
    # 8. Generate evaluation artifacts for the best model
    best_preds = best_model.predict(X_test_scaled)
    
    # Classification Report
    report = classification_report(y_test_encoded, best_preds, zero_division=0)
    with open(os.path.join(plots_dir, 'classification_report.txt'), 'w') as f:
        f.write(f"Best Model: {best_model_name}\n\n")
        f.write(report)
        
    # Confusion Matrix
    cm = confusion_matrix(y_test_encoded, best_preds)
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Low', 'Medium', 'High'], yticklabels=['Low', 'Medium', 'High'])
    plt.title(f'Confusion Matrix - {best_model_name}')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.savefig(os.path.join(plots_dir, 'confusion_matrix.png'), bbox_inches='tight')
    plt.close()
    
    # Feature Importance (if applicable)
    if hasattr(best_model, 'feature_importances_'):
        importances = best_model.feature_importances_
        indices = np.argsort(importances)[::-1]
        
        plt.figure(figsize=(10, 6))
        plt.title("Feature Importances")
        plt.bar(range(X.shape[1]), importances[indices], align="center")
        plt.xticks(range(X.shape[1]), np.array(features)[indices], rotation=45, ha='right')
        plt.xlim([-1, X.shape[1]])
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, 'feature_importance.png'))
        plt.close()
    elif hasattr(best_model, 'coef_'):
        # For Logistic Regression
        importances = np.abs(best_model.coef_[0])
        indices = np.argsort(importances)[::-1]
        
        plt.figure(figsize=(10, 6))
        plt.title("Feature Importances (Absolute Coefficients)")
        plt.bar(range(X.shape[1]), importances[indices], align="center")
        plt.xticks(range(X.shape[1]), np.array(features)[indices], rotation=45, ha='right')
        plt.xlim([-1, X.shape[1]])
        plt.tight_layout()
        plt.savefig(os.path.join(plots_dir, 'feature_importance.png'))
        plt.close()
        
    # 9. Print model accuracy
    print(f"\nModel {best_model_name} Final Accuracy: {results[best_model_name]['Accuracy']*100:.2f}%")

if __name__ == "__main__":
    run_training_pipeline()
