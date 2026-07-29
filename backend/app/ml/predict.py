import datetime
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models import AircraftTelemetry, WeatherTelemetry, FlightRouteCache
from app.ml.model_loader import get_model, get_scaler
import airportsdata

airports_iata = airportsdata.load('IATA')

def calculate_haversine(lat1, lon1, lat2, lon2):
    lon1, lat1, lon2, lat2 = map(np.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a)) 
    r = 6371
    return c * r

def make_prediction(icao24: str, db: Session):
    # 1. Retrieve the latest AircraftTelemetry
    telemetry = db.query(AircraftTelemetry).filter(AircraftTelemetry.icao24 == icao24).order_by(desc(AircraftTelemetry.timestamp)).first()
    
    if not telemetry:
        raise ValueError(f"No telemetry found for aircraft {icao24}")

    # 2. Retrieve the latest WeatherTelemetry
    weather = db.query(WeatherTelemetry).filter(WeatherTelemetry.aircraft_id == telemetry.id).order_by(desc(WeatherTelemetry.timestamp)).first()
    
    # 3. Build the feature vector
    # Features order expected by scaler:
    # ['altitude', 'speed', 'heading', 'wind_speed', 'temperature', 'pressure', 'humidity', 
    # 'visibility', 'altitude_change', 'speed_change', 'heading_change', 'wind_effect', 
    # 'route_distance', 'weather_severity_score']
    
    alt = telemetry.altitude or 0.0
    spd = telemetry.velocity or 0.0
    hdg = telemetry.heading or 0.0
    
    if weather:
        w_spd = weather.wind_speed or 0.0
        temp = weather.temperature or 0.0
        press = weather.pressure or 1013.25
        hum = weather.humidity or 0.0
        vis = weather.visibility or 10000.0
        cloud = weather.cloud_coverage or 0.0
        rain = weather.rainfall or 0.0
        w_dir = weather.wind_direction or 0.0
    else:
        w_spd = 0.0
        temp = 15.0
        press = 1013.25
        hum = 50.0
        vis = 10000.0
        cloud = 0.0
        rain = 0.0
        w_dir = 0.0

    # For change features, try to get the previous telemetry point
    prev_telemetry = db.query(AircraftTelemetry).filter(
        AircraftTelemetry.icao24 == icao24,
        AircraftTelemetry.id != telemetry.id
    ).order_by(desc(AircraftTelemetry.timestamp)).first()

    if prev_telemetry:
        alt_change = alt - (prev_telemetry.altitude or 0.0)
        spd_change = spd - (prev_telemetry.velocity or 0.0)
        hdg_change = hdg - (prev_telemetry.heading or 0.0)
        route_dist = calculate_haversine(prev_telemetry.latitude or 0, prev_telemetry.longitude or 0, telemetry.latitude or 0, telemetry.longitude or 0)
    else:
        alt_change = 0.0
        spd_change = 0.0
        hdg_change = 0.0
        route_dist = 0.0

    # Calculate Route Deviation
    planned_route_distance = 0.0
    current_distance_travelled = 0.0
    deviation_distance = 0.0
    deviation_percentage = 0.0
    
    # Import inside function to avoid circular imports if any
    from app.services.route_service import get_route_for_aircraft
    from app.utils.geo import haversine, cross_track_distance
    
    if telemetry.callsign or telemetry.icao24:
        route = get_route_for_aircraft(db, telemetry.callsign or telemetry.icao24)
        if route and route.origin_lat and route.destination_lat:
            olat, olon = route.origin_lat, route.origin_lon
            dlat, dlon = route.destination_lat, route.destination_lon
            clat, clon = telemetry.latitude or 0.0, telemetry.longitude or 0.0

            planned_route_distance = haversine(olat, olon, dlat, dlon)
            current_distance_travelled = haversine(olat, olon, clat, clon)
            deviation_distance = cross_track_distance(olat, olon, dlat, dlon, clat, clon)

            if planned_route_distance > 0:
                deviation_percentage = (deviation_distance / planned_route_distance) * 100

    wind_effect = w_spd * np.cos(np.radians(hdg - w_dir))
    weather_severity_score = (w_spd / 30.0) + ((10000 - vis) / 10000.0) + (rain / 10.0) + (cloud / 100.0)

    # Features order expected by new scaler:
    # ['altitude', 'speed', 'heading', 'wind_speed', 'temperature', 'pressure', 'humidity', 
    # 'visibility', 'altitude_change', 'speed_change', 'heading_change', 'wind_effect', 
    # 'route_distance', 'weather_severity_score', 'deviation_distance', 'deviation_percentage']

    features = [
        alt, spd, hdg, w_spd, temp, press, hum, vis,
        alt_change, spd_change, hdg_change, wind_effect, route_dist, weather_severity_score,
        deviation_distance, deviation_percentage
    ]

    # Reshape for sklearn (1 sample, n features)
    features_array = np.array(features).reshape(1, -1)

    # 4. Load model and scaler
    model = get_model()
    scaler = get_scaler()

    # 5. Predict
    try:
        scaled_features = scaler.transform(features_array)
        prediction = model.predict(scaled_features)[0]
        probabilities = model.predict_proba(scaled_features)[0]
    except Exception as e:
        # Fallback if something goes wrong with shapes
        print(f"Prediction error: {e}")
        prediction = 0
        probabilities = [1.0, 0.0, 0.0]

    risk_mapping = {0: "Low Risk", 1: "Medium Risk", 2: "High Risk"}
    risk_level = risk_mapping.get(int(prediction), "Unknown")
    
    # Probability of the predicted class
    prob = float(np.max(probabilities))
    
    # Calculate estimated delay (heuristic based on risk)
    if risk_level == "High Risk":
        estimated_delay = 45 # mins
    elif risk_level == "Medium Risk":
        estimated_delay = 15
    else:
        estimated_delay = 0

    # Weather Risk descriptive
    if weather_severity_score > 0.8:
        weather_risk = "Severe Weather"
    elif weather_severity_score > 0.4:
        weather_risk = "Moderate Weather"
    else:
        weather_risk = "Clear"
        
    overall_risk_score = min((prob * 100) + (deviation_percentage * 2) + (weather_severity_score * 20), 100.0)
    confidence_score = prob * 100
    
    suggested_action = "Maintain course"
    if deviation_percentage > 5:
        suggested_action = "Correct heading to planned route"
    if weather_severity_score > 0.6:
        suggested_action = "Monitor weather radar, prepare to deviate"
    if risk_level == "High Risk":
        suggested_action = "Urgent: High deviation and delay expected, contact ATC"

    return {
        "risk_level": risk_level,
        "probability": round(prob, 2),
        "estimated_delay": estimated_delay,
        "weather_risk": weather_risk,
        "prediction_time": datetime.datetime.utcnow().isoformat(),
        "planned_route_distance": round(planned_route_distance, 2) if planned_route_distance > 0 else None,
        "current_distance_travelled": round(current_distance_travelled, 2) if planned_route_distance > 0 else None,
        "deviation_distance": round(deviation_distance, 2) if planned_route_distance > 0 else None,
        "deviation_percentage": round(deviation_percentage, 2) if planned_route_distance > 0 else None,
        "overall_risk_score": round(overall_risk_score, 2),
        "weather_impact_score": round(weather_severity_score * 10, 2),
        "confidence_score": round(confidence_score, 2),
        "suggested_action": suggested_action
    }
