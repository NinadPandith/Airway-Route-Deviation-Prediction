"""
FastAPI REST API Server for the Airway Route Deviation Prediction System.
"""

import os
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, init_db
from . import crud, schemas
from .services.opensky_service import collect_live_aircraft
from .services.weather_service import get_weather_for_aircraft, fetch_weather_array
from .ml.predict import make_prediction

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Initialize database tables on startup
init_db()

app = FastAPI(
    title="Airway Route Deviation Prediction System - API",
    description="Backend REST API service for flight telemetry and route tracking.",
    version="1.0.0"
)

# Configure CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health Check"])
def root_health_check():
    """
    Root health check endpoint.
    """
    return {
        "system": "Airway Route Deviation Prediction System API",
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/api/health", tags=["Health Check"])
def health_status():
    """
    System status endpoint.
    """
    return {"status": "healthy"}


@app.get("/api/live-aircraft", response_model=schemas.LiveAircraftResponse, tags=["Live Data"])
def get_live_aircraft(
    refresh: bool = Query(True, description="Refresh data from the OpenSky API when available"),
    db: Session = Depends(get_db)
):
    """Return the latest live aircraft telemetry snapshot."""
    result = collect_live_aircraft(db, refresh=refresh)
    return schemas.LiveAircraftResponse(
        aircrafts=result["aircrafts"],
        message=result["message"],
        last_updated=datetime.fromisoformat(result["last_updated"]) if isinstance(result["last_updated"], str) else result["last_updated"],
        source=result["source"],
    )


@app.get("/api/live-weather/{icao24}", response_model=schemas.LiveWeatherResponse, tags=["Live Data"])
def get_live_weather(icao24: str, db: Session = Depends(get_db)):
    """Return weather data for the selected aircraft."""
    result = get_weather_for_aircraft(db, icao24.upper())
    return schemas.LiveWeatherResponse(
        weather=result["weather"],
        message=result["message"],
        timestamp=datetime.fromisoformat(result["timestamp"]) if isinstance(result["timestamp"], str) else result["timestamp"],
    )


@app.get("/api/live-dashboard", response_model=schemas.LiveDashboardResponse, tags=["Live Data"])
def get_live_dashboard(db: Session = Depends(get_db)):
    """Return a summary dashboard payload for the live monitoring experience."""
    stats = crud.get_live_dashboard_stats(db)
    return schemas.LiveDashboardResponse(**stats)


@app.get("/api/history", response_model=List[schemas.AircraftTelemetryResponse], tags=["Live Data"])
def get_history(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Return historical aircraft telemetry for analysis workflows."""
    return crud.get_history(db, limit=limit)


@app.post(
    "/api/flights",
    response_model=schemas.FlightResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Flights"]
)
def create_flight(flight: schemas.FlightCreate, db: Session = Depends(get_db)):
    """
    Create a new flight telemetry record.
    """
    return crud.create_flight(db=db, flight=flight)


@app.get(
    "/api/flights",
    response_model=List[schemas.FlightResponse],
    tags=["Flights"]
)
def read_flights(
    search: Optional[str] = Query(None, description="Search by flight number, aircraft, origin, or destination"),
    status: Optional[str] = Query(None, description="Filter by status (Scheduled, In Flight, Delayed, Landed, Deviated)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """
    Get all flight records with optional search query and status filters.
    """
    return crud.get_flights(db=db, search=search, status=status, skip=skip, limit=limit)


@app.get(
    "/api/flights/{flight_id}",
    response_model=schemas.FlightResponse,
    tags=["Flights"]
)
def read_flight_by_id(flight_id: int, db: Session = Depends(get_db)):
    """
    Get a single flight by its database ID.
    """
    flight = crud.get_flight_by_id(db=db, flight_id=flight_id)
    if not flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )
    return flight


@app.put(
    "/api/flights/{flight_id}",
    response_model=schemas.FlightResponse,
    tags=["Flights"]
)
def update_flight(
    flight_id: int,
    flight_update: schemas.FlightUpdate,
    db: Session = Depends(get_db)
):
    """
    Update an existing flight record attributes.
    """
    updated_flight = crud.update_flight(db=db, flight_id=flight_id, flight_update=flight_update)
    if not updated_flight:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )
    return updated_flight


@app.delete(
    "/api/flights/{flight_id}",
    status_code=status.HTTP_200_OK,
    tags=["Flights"]
)
def delete_flight(flight_id: int, db: Session = Depends(get_db)):
    """
    Delete a flight record by ID.
    """
    success = crud.delete_flight(db=db, flight_id=flight_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight with ID {flight_id} not found."
        )
    return {"message": f"Flight {flight_id} deleted successfully."}


logger = logging.getLogger(__name__)

@app.post(
    "/api/predict", 
    response_model=schemas.PredictionResponse, 
    tags=["Prediction"]
)
def predict_route_deviation(
    request: schemas.PredictionRequest, 
    db: Session = Depends(get_db)
):
    """
    Predict the route deviation risk for a given live aircraft.
    """
    logger.info(f"Received prediction request for aircraft: {request.aircraft_id}")
    try:
        result = make_prediction(request.aircraft_id, db)
        logger.info(f"Prediction successful for {request.aircraft_id}: {result}")
        return result
    except ValueError as e:
        logger.warning(f"Prediction failed for {request.aircraft_id}: {e}")
        return schemas.PredictionResponse(
            risk_level="Unknown",
            probability=0.0,
            estimated_delay=0,
            weather_risk="Unknown",
            prediction_time=datetime.now(timezone.utc).isoformat(),
            error=True,
            message=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during prediction for {request.aircraft_id}: {e}")
        return schemas.PredictionResponse(
            risk_level="Unknown",
            probability=0.0,
            estimated_delay=0,
            weather_risk="Unknown",
            prediction_time=datetime.now(timezone.utc).isoformat(),
            error=True,
            message=f"An error occurred during prediction: {str(e)}"
        )

@app.get("/api/route/{callsign}", response_model=schemas.RouteInfoResponse, tags=["Live Data"])
def get_live_route(callsign: str, db: Session = Depends(get_db)):
    """Return flight route info for a specific callsign from AviationStack."""
    from .services.route_service import get_route_for_aircraft
    route = get_route_for_aircraft(db, callsign)
    if not route:
        return schemas.RouteInfoResponse(
            callsign=callsign,
            error=True,
            message="Route information unavailable"
        )
    return route

# ==========================================
# SIMULATION FLIGHTS API
# ==========================================

@app.post("/api/simulation/start", response_model=schemas.SimulationSessionResponse, tags=["Simulation"])
def start_simulation(session_data: schemas.SimulationSessionCreate, db: Session = Depends(get_db)):
    """Initialize a new simulation session for a flight."""
    return crud.create_simulation_session(db, session_data.flight_id)

@app.get("/api/simulation/history", response_model=List[schemas.SimulationSessionResponse], tags=["Simulation"])
def get_simulation_history(limit: int = 50, db: Session = Depends(get_db)):
    """Get past simulation sessions."""
    return crud.get_simulation_sessions(db, limit)

@app.get("/api/simulation/{flight_id}/route", tags=["Simulation"])
def get_simulation_route(flight_id: int, db: Session = Depends(get_db)):
    """Generate a route for a manual flight."""
    flight = crud.get_flight_by_id(db, flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
        
    import airportsdata
    airports = airportsdata.load('IATA')
    airports_icao = airportsdata.load('ICAO')
    
    import re
    
    def resolve_airport(name: str):
        # Extract 3-letter (IATA) or 4-letter (ICAO) codes using regex
        matches = re.findall(r'\b[A-Z]{3,4}\b', name.upper())
        for code in matches:
            if len(code) == 3 and code in airports:
                return airports[code]['lat'], airports[code]['lon']
            if len(code) == 4 and code in airports_icao:
                return airports_icao[code]['lat'], airports_icao[code]['lon']
                
        # If regex fails, try checking the whole string just in case
        clean_name = name.strip().upper()
        if len(clean_name) == 3 and clean_name in airports:
            return airports[clean_name]['lat'], airports[clean_name]['lon']
        if len(clean_name) == 4 and clean_name in airports_icao:
            return airports_icao[clean_name]['lat'], airports_icao[clean_name]['lon']

        # Fallback to the flight's provided coordinates if we absolutely cannot find the origin,
        # but for destination, just use an offset.
        return None

    olat_olon = resolve_airport(flight.origin)
    dlat_dlon = resolve_airport(flight.destination)
    
    origin_lat, origin_lon = olat_olon
    dest_lat, dest_lon = dlat_dlon
    
    # Fallback to provided coordinates if lookup fails
    route = {
        "origin_lat": origin_lat or flight.origin_latitude or 0.0,
        "origin_lon": origin_lon or flight.origin_longitude or 0.0,
        "destination_lat": dest_lat or flight.destination_latitude or 0.0,
        "destination_lon": dest_lon or flight.destination_longitude or 0.0,
    }
    
    return route


@app.get("/api/simulation/{flight_id}/weather-route", tags=["Simulation"])
def get_weather_aware_route(flight_id: int, db: Session = Depends(get_db)):
    """Generate a weather-aware route for a manual flight with intermediate waypoints."""
    flight = crud.get_flight_by_id(db, flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
        
    import airportsdata
    import re
    import math
    from app.services.weather_service import fetch_weather_array
    
    airports = airportsdata.load('IATA')
    airports_icao = airportsdata.load('ICAO')
    
    def resolve_airport(name: str):
        matches = re.findall(r'\b[A-Z]{3,4}\b', name.upper())
        for code in matches:
            if len(code) == 3 and code in airports:
                return airports[code]['lat'], airports[code]['lon']
            if len(code) == 4 and code in airports_icao:
                return airports_icao[code]['lat'], airports_icao[code]['lon']
        return None, None

    o_lat, o_lon = resolve_airport(flight.origin)
    d_lat, d_lon = resolve_airport(flight.destination)
    
    start_lat = o_lat or flight.origin_latitude or 0.0
    start_lon = o_lon or flight.origin_longitude or 0.0
    end_lat = d_lat or flight.destination_latitude or 0.0
    end_lon = d_lon or flight.destination_longitude or 0.0

    # Calculate great-circle distance to determine number of waypoints
    def to_rad(deg): return deg * math.pi / 180.0
    def to_deg(rad): return rad * 180.0 / math.pi
    
    R = 6371
    d_lat_rad = to_rad(end_lat - start_lat)
    d_lon_rad = to_rad(end_lon - start_lon)
    a = math.sin(d_lat_rad/2)**2 + math.cos(to_rad(start_lat)) * math.cos(to_rad(end_lat)) * math.sin(d_lon_rad/2)**2
    total_dist = 2 * R * math.asin(math.sqrt(a))
    
    # Generate 5 waypoints (0=start, 1,2,3, 4=end)
    num_segments = 4
    waypoints = []
    
    for i in range(num_segments + 1):
        f = i / num_segments
        if f == 0:
            waypoints.append((start_lat, start_lon))
            continue
        if f == 1:
            waypoints.append((end_lat, end_lon))
            continue
            
        A = math.sin((1 - f) * (total_dist / R)) / math.sin(total_dist / R)
        B = math.sin(f * (total_dist / R)) / math.sin(total_dist / R)
        x = A * math.cos(to_rad(start_lat)) * math.cos(to_rad(start_lon)) + B * math.cos(to_rad(end_lat)) * math.cos(to_rad(end_lon))
        y = A * math.cos(to_rad(start_lat)) * math.sin(to_rad(start_lon)) + B * math.cos(to_rad(end_lat)) * math.sin(to_rad(end_lon))
        z = A * math.sin(to_rad(start_lat)) + B * math.sin(to_rad(end_lat))
        
        lat = to_deg(math.atan2(z, math.sqrt(x**2 + y**2)))
        lon = to_deg(math.atan2(y, x))
        waypoints.append((lat, lon))

    # Fetch weather array
    lats = [wp[0] for wp in waypoints]
    lons = [wp[1] for wp in waypoints]
    weather_results, error = fetch_weather_array(lats, lons)
    
    if not weather_results or len(weather_results) != len(waypoints):
        # Fallback if weather fails
        weather_results = [{
            "temperature": 15, "wind_speed": 5, "wind_direction": 0, "weather_code": 0, "weather_description": "Clear sky"
        } for _ in waypoints]

    original_route = []
    optimized_route = []
    weather_markers = []

    for i in range(len(waypoints)):
        lat, lon = waypoints[i]
        w = weather_results[i]
        
        original_route.append({"lat": lat, "lon": lon})
        
        # Check for severe weather
        # Codes: 61+ rain/snow, 95+ thunderstorm. Wind > 15 m/s
        code = w.get("weather_code", 0)
        wind = w.get("wind_speed", 0)
        
        is_deviated = False
        opt_lat, opt_lon = lat, lon
        
        if (code >= 61 or wind > 15) and i > 0 and i < len(waypoints) - 1:
            is_deviated = True
            # Shift by ~50km perpendicular. (Rough approx: 0.5 degrees)
            # Find bearing of route segment
            prev_lat, prev_lon = waypoints[i-1]
            bearing = math.atan2(
                math.sin(to_rad(lon - prev_lon)) * math.cos(to_rad(lat)),
                math.cos(to_rad(prev_lat)) * math.sin(to_rad(lat)) - math.sin(to_rad(prev_lat)) * math.cos(to_rad(lat)) * math.cos(to_rad(lon - prev_lon))
            )
            perp_bearing = bearing + math.pi / 2
            shift_dist = 50 / R # 50 km
            
            opt_lat = math.asin(math.sin(to_rad(lat)) * math.cos(shift_dist) + math.cos(to_rad(lat)) * math.sin(shift_dist) * math.cos(perp_bearing))
            opt_lon = to_rad(lon) + math.atan2(math.sin(perp_bearing) * math.sin(shift_dist) * math.cos(to_rad(lat)), math.cos(shift_dist) - math.sin(to_rad(lat)) * math.sin(opt_lat))
            
            opt_lat = to_deg(opt_lat)
            opt_lon = to_deg(opt_lon)

        optimized_route.append({
            "lat": opt_lat,
            "lon": opt_lon,
            "weather": w,
            "is_deviated": is_deviated
        })
        
        weather_markers.append({
            "lat": opt_lat,
            "lon": opt_lon,
            "weather": w
        })

    return {
        "origin_lat": start_lat,
        "origin_lon": start_lon,
        "destination_lat": end_lat,
        "destination_lon": end_lon,
        "original_route": original_route,
        "optimized_route": optimized_route,
        "weather_markers": weather_markers
    }

@app.get("/api/simulation/{session_id}/replay", response_model=List[schemas.SimulationTelemetryResponse], tags=["Simulation"])
def replay_simulation(session_id: int, db: Session = Depends(get_db)):
    """Get all telemetry points for a specific session for replay."""
    return crud.get_simulation_telemetry(db, session_id)

@app.post("/api/simulation/telemetry", response_model=schemas.SimulationTelemetryResponse, tags=["Simulation"])
def record_simulation_telemetry(telemetry: schemas.SimulationTelemetryCreate, db: Session = Depends(get_db)):
    """
    Record a simulated telemetry point, calculate deviation, and run ML prediction.
    Returns the prediction and saves it to history.
    """
    # 1. Prepare ML Features
    from app.utils.geo import haversine, cross_track_distance
    from app.ml.predict import make_prediction_from_payload
    import numpy as np
    
    # Calculate route geometry
    planned_route_distance = 0.0
    current_distance_travelled = 0.0
    deviation_distance = 0.0
    deviation_percentage = 0.0
    
    clat, clon = telemetry.latitude, telemetry.longitude
    olat, olon = telemetry.origin_lat, telemetry.origin_lon
    dlat, dlon = telemetry.destination_lat, telemetry.destination_lon
    
    if olat is not None and olon is not None and dlat is not None and dlon is not None:
        planned_route_distance = haversine(olat, olon, dlat, dlon)
        current_distance_travelled = haversine(olat, olon, clat, clon)
        deviation_distance = cross_track_distance(olat, olon, dlat, dlon, clat, clon)
        if planned_route_distance > 0:
            deviation_percentage = (deviation_distance / planned_route_distance) * 100

    # Calculate change features based on previous telemetry provided by frontend
    alt_change = telemetry.altitude - (telemetry.prev_altitude or telemetry.altitude)
    spd_change = telemetry.speed - (telemetry.prev_speed or telemetry.speed)
    hdg_change = telemetry.heading - (telemetry.prev_heading or telemetry.heading)
    route_dist = 0.0
    if telemetry.prev_latitude and telemetry.prev_longitude:
        route_dist = haversine(telemetry.prev_latitude, telemetry.prev_longitude, clat, clon)

    wind_effect = telemetry.wind_speed * np.cos(np.radians(telemetry.heading - telemetry.wind_direction))
    
    weather_sev = telemetry.weather_severity or 0.0

    features = [
        telemetry.altitude, telemetry.speed, telemetry.heading, telemetry.wind_speed, 15.0, 1013.25, 50.0, 10000.0,
        alt_change, spd_change, hdg_change, wind_effect, route_dist, weather_sev,
        deviation_distance, deviation_percentage
    ]
    
    payload = {
        "icao24": f"SIM-{telemetry.session_id}",
        "features": features,
        "planned_route_distance": planned_route_distance,
        "current_distance_travelled": current_distance_travelled,
        "deviation_distance": deviation_distance,
        "deviation_percentage": deviation_percentage,
        "weather_severity_score": weather_sev
    }
    
    # 2. Run Prediction
    try:
        prediction = make_prediction_from_payload(payload)
    except Exception as e:
        logger.error(f"Simulation ML error: {e}")
        prediction = {}
    
    # 3. Save to Database
    db_data = {
        "session_id": telemetry.session_id,
        "latitude": telemetry.latitude,
        "longitude": telemetry.longitude,
        "altitude": telemetry.altitude,
        "speed": telemetry.speed,
        "heading": telemetry.heading,
        "weather_severity": weather_sev,
        "risk_level": prediction.get("risk_level", "Unknown"),
        "deviation_percentage": deviation_percentage,
        "confidence_score": prediction.get("confidence_score", 0.0),
        "estimated_delay": prediction.get("estimated_delay", 0)
    }
    
    saved_telemetry = crud.create_simulation_telemetry(db, db_data)
    return saved_telemetry
