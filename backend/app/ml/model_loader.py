import os
import datetime

class DummyModel:
    def predict(self, features):
        return [1] # Always return Medium Risk
    def predict_proba(self, features):
        return [[0.2, 0.6, 0.2]]

class DummyScaler:
    def transform(self, features):
        return features

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, '..', '..', 'ml', 'models')

MODEL_PATH = os.path.join(MODELS_DIR, 'model.pkl')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.pkl')
ENCODER_PATH = os.path.join(MODELS_DIR, 'label_encoder.pkl')

_model = None
_scaler = None

def load_models():
    global _model, _scaler
    if JOBLIB_AVAILABLE and os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
            print("Successfully loaded ML models from disk.")
        except Exception as e:
            print(f"Error loading models: {e}. Falling back to Dummy.")
            _model = DummyModel()
            _scaler = DummyScaler()
    else:
        print("Models not found or joblib not installed. Falling back to DummyModel.")
        _model = DummyModel()
        _scaler = DummyScaler()

def get_model():
    if _model is None:
        load_models()
    return _model

def get_scaler():
    if _scaler is None:
        load_models()
    return _scaler
