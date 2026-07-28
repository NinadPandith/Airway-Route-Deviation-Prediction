"""
FastAPI REST API Server for the Airway Route Deviation Prediction System.
"""

import os
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, init_db
from . import crud, schemas
from .services.opensky_service import collect_live_aircraft
from .services.weather_service import get_weather_for_aircraft
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during prediction for {request.aircraft_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during prediction: {str(e)}"
        )

@app.get("/api/route/{callsign}", response_model=schemas.RouteInfoResponse, tags=["Live Data"])
def get_live_route(callsign: str, db: Session = Depends(get_db)):
    """Return flight route info for a specific callsign from AviationStack."""
    from .services.route_service import get_route_for_aircraft
    route = get_route_for_aircraft(db, callsign)
    if not route:
        raise HTTPException(status_code=404, detail="Route information unavailable")
    return route
