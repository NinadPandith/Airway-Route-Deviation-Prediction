import os
import sqlite3
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def calculate_haversine(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth."""
    # Convert decimal degrees to radians 
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def run_pipeline():
    print("Starting Phase 3 Data Processing Pipeline...")
    
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, '..', 'airway.db')
    plots_dir = os.path.join(base_dir, 'plots')
    
    if not os.path.exists(plots_dir):
        os.makedirs(plots_dir)

    # 1. Read data directly from SQLite
    print("Connecting to database and reading tables...")
    conn = sqlite3.connect(db_path)
    
    aircraft_df = pd.read_sql_query("SELECT * FROM aircraft_telemetry", conn)
    weather_df = pd.read_sql_query("SELECT * FROM weather_telemetry", conn)
    flights_df = pd.read_sql_query("SELECT * FROM flights", conn)
    conn.close()
    
    # 2. Merge AircraftTelemetry and WeatherTelemetry using aircraft_id and timestamps
    # In SQLite schema, weather_telemetry.aircraft_id maps to aircraft_telemetry.id
    print("Merging telemetry and weather data...")
    df = pd.merge(aircraft_df, weather_df, left_on='id', right_on='aircraft_id', how='left', suffixes=('_ac', '_wx'))
    
    # 3. Handle missing values
    print("Handling missing values...")
    # Drop rows without critical location data
    df = df.dropna(subset=['latitude', 'longitude', 'altitude', 'velocity'])
    
    # Fill missing weather with medians (or sensible defaults) because most aircraft lack weather
    numerical_cols_wx = ['temperature', 'feels_like', 'wind_speed', 'wind_direction', 'humidity', 'pressure', 'visibility', 'cloud_coverage', 'rainfall']
    for col in numerical_cols_wx:
        median_val = df[col].median()
        if pd.isna(median_val):
            median_val = 0 # Fallback if entirely empty
        df[col] = df[col].fillna(median_val)
        
    df['weather_description'] = df['weather_description'].fillna('Clear')
    
    # 4. Remove duplicate records
    print("Removing duplicates...")
    # Using icao24 and timestamp_ac to identify duplicates
    df = df.drop_duplicates(subset=['icao24', 'timestamp_ac'])
    
    # 5. Convert timestamps into datetime
    print("Converting timestamps...")
    df['timestamp_ac'] = pd.to_datetime(df['timestamp_ac'])
    df = df.sort_values(by=['icao24', 'timestamp_ac']).reset_index(drop=True)
    
    # 7. Create new engineered features
    print("Engineering new features...")
    
    # Group by aircraft for temporal features
    grouped = df.groupby('icao24')
    
    df['altitude_change'] = grouped['altitude'].diff().fillna(0)
    df['speed_change'] = grouped['velocity'].diff().fillna(0)
    df['heading_change'] = grouped['heading'].diff().fillna(0)
    
    # Calculate route_distance (distance covered since last point)
    # Shift lat/lon to get previous point
    df['prev_lat'] = grouped['latitude'].shift(1)
    df['prev_lon'] = grouped['longitude'].shift(1)
    
    # Apply Haversine formula, fill NaNs with 0 (first point of the aircraft)
    df['route_distance'] = df.apply(
        lambda row: calculate_haversine(row['prev_lat'], row['prev_lon'], row['latitude'], row['longitude']) 
        if pd.notna(row['prev_lat']) else 0.0, 
        axis=1
    )
    df = df.drop(columns=['prev_lat', 'prev_lon'])
    
    # Wind effect (Wind speed * cos(heading - wind_direction))
    df['wind_effect'] = df['wind_speed'] * np.cos(np.radians(df['heading'] - df['wind_direction']))
    
    # Weather severity score (simple heuristic formulation)
    # High wind, low visibility, high rain, high cloud coverage increase severity
    # Normalize components roughly to 0-1 range and sum
    norm_wind = df['wind_speed'] / 30.0
    norm_vis = (10000 - df['visibility'].clip(upper=10000)) / 10000.0
    norm_rain = df['rainfall'] / 10.0
    norm_cloud = df['cloud_coverage'] / 100.0
    df['weather_severity_score'] = norm_wind + norm_vis + norm_rain + norm_cloud

    # Synthetic deviation metrics for training
    # Deviations are higher when weather is worse or altitude changes a lot
    np.random.seed(42)
    base_deviation = np.random.uniform(0, 5, size=len(df)) # Base 0-5 km deviation
    df['deviation_distance'] = base_deviation + (df['weather_severity_score'] * 15) + (np.abs(df['heading_change']) / 10.0)
    
    # Synthetic planned route distance to calculate percentage (assume avg flight is 1000km)
    synth_planned_distance = np.random.uniform(200, 2000, size=len(df))
    df['deviation_percentage'] = (df['deviation_distance'] / synth_planned_distance) * 100
    
    # Categorical features
    df['altitude_category'] = pd.cut(
        df['altitude'], 
        bins=[-np.inf, 10000, 25000, np.inf], 
        labels=['Low', 'Medium', 'High']
    )
    
    df['speed_category'] = pd.cut(
        df['velocity'], 
        bins=[-np.inf, 250, 400, np.inf], 
        labels=['Slow', 'Cruising', 'Fast']
    )
    
    # Rename velocity to speed for normalization requirements consistency
    df = df.rename(columns={'velocity': 'speed'})
    
    # Keep a copy before normalization for processed_dataset.csv
    processed_df = df.copy()
    
    # 6. Normalize numerical features
    print("Normalizing features...")
    features_to_normalize = ['altitude', 'speed', 'heading', 'wind_speed', 'temperature', 'pressure', 'humidity', 'visibility']
    
    feature_df = df.copy()
    for col in features_to_normalize:
        mean = feature_df[col].mean()
        std = feature_df[col].std()
        if std > 0:
            feature_df[col] = (feature_df[col] - mean) / std
        else:
            feature_df[col] = 0.0
            
    # 8. Generate summary statistics
    print("Generating summary statistics...")
    stats_df = processed_df.describe()
    stats_df.to_csv(os.path.join(base_dir, 'summary_statistics.csv'))
    
    # 9. Generate visualizations using Matplotlib
    print("Generating visualizations...")
    
    # Speed Distribution
    plt.figure(figsize=(8, 5))
    plt.hist(processed_df['speed'].dropna(), bins=30, color='skyblue', edgecolor='black')
    plt.title('Speed Distribution')
    plt.xlabel('Speed (knots)')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.75)
    plt.savefig(os.path.join(plots_dir, 'speed_distribution.png'))
    plt.close()
    
    # Altitude Distribution
    plt.figure(figsize=(8, 5))
    plt.hist(processed_df['altitude'].dropna(), bins=30, color='lightgreen', edgecolor='black')
    plt.title('Altitude Distribution')
    plt.xlabel('Altitude (ft)')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.75)
    plt.savefig(os.path.join(plots_dir, 'altitude_distribution.png'))
    plt.close()
    
    # Wind Speed Distribution
    plt.figure(figsize=(8, 5))
    plt.hist(processed_df['wind_speed'].dropna(), bins=30, color='coral', edgecolor='black')
    plt.title('Wind Speed Distribution')
    plt.xlabel('Wind Speed (m/s)')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.75)
    plt.savefig(os.path.join(plots_dir, 'wind_speed_distribution.png'))
    plt.close()
    
    # Weather Severity Distribution
    plt.figure(figsize=(8, 5))
    plt.hist(processed_df['weather_severity_score'].dropna(), bins=30, color='purple', edgecolor='black')
    plt.title('Weather Severity Score Distribution')
    plt.xlabel('Severity Score')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.75)
    plt.savefig(os.path.join(plots_dir, 'weather_severity_distribution.png'))
    plt.close()
    
    # Route Distance Distribution
    plt.figure(figsize=(8, 5))
    # Filter out 0 distances which represent the first point
    valid_distances = processed_df[processed_df['route_distance'] > 0]['route_distance']
    if not valid_distances.empty:
        plt.hist(valid_distances, bins=30, color='orange', edgecolor='black')
    plt.title('Route Distance Distribution (km per interval)')
    plt.xlabel('Distance (km)')
    plt.ylabel('Frequency')
    plt.grid(axis='y', alpha=0.75)
    plt.savefig(os.path.join(plots_dir, 'route_distance_distribution.png'))
    plt.close()
    
    # Correlation Heatmap
    corr_cols = features_to_normalize + ['altitude_change', 'speed_change', 'heading_change', 'weather_severity_score']
    corr_df = processed_df[corr_cols].corr()
    
    plt.figure(figsize=(10, 8))
    cax = plt.matshow(corr_df, cmap='coolwarm', vmin=-1, vmax=1, fignum=1)
    plt.colorbar(cax)
    plt.xticks(range(len(corr_cols)), corr_cols, rotation=45, ha='left')
    plt.yticks(range(len(corr_cols)), corr_cols)
    plt.title('Feature Correlation Heatmap', pad=20)
    plt.savefig(os.path.join(plots_dir, 'correlation_heatmap.png'), bbox_inches='tight')
    plt.close()

    # 10. Save processed_dataset.csv and feature_dataset.csv
    print("Saving datasets...")
    processed_df.to_csv(os.path.join(base_dir, 'processed_dataset.csv'), index=False)
    feature_df.to_csv(os.path.join(base_dir, 'feature_dataset.csv'), index=False)
    
    print("Pipeline execution completed successfully.")
    print(f"Processed records: {len(processed_df)}")

if __name__ == "__main__":
    run_pipeline()
