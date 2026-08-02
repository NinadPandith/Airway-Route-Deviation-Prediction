"""
CRUD (Create, Read, Update, Delete) database operations for Flight entities.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas


def get_flights(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[models.Flight]:
    """
    Retrieve list of flights with optional search query and status filtering.
    """
    query = db.query(models.Flight)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Flight.flight_number.ilike(search_pattern),
                models.Flight.aircraft_name.ilike(search_pattern),
                models.Flight.origin.ilike(search_pattern),
                models.Flight.destination.ilike(search_pattern)
            )
        )

    if status and status.lower() != "all":
        query = query.filter(models.Flight.status.ilike(status))

    return query.order_by(models.Flight.created_at.desc()).offset(skip).limit(limit).all()


def get_flight_by_id(db: Session, flight_id: int) -> Optional[models.Flight]:
    """
    Fetch a single flight record by its primary key ID.
    """
    return db.query(models.Flight).filter(models.Flight.id == flight_id).first()


def create_flight(db: Session, flight: schemas.FlightCreate) -> models.Flight:
    """
    Create and persist a new Flight record in the database.
    """
    db_flight = models.Flight(**flight.model_dump())
    db.add(db_flight)
    db.commit()
    db.refresh(db_flight)
    return db_flight


def update_flight(
    db: Session,
    flight_id: int,
    flight_update: schemas.FlightUpdate
) -> Optional[models.Flight]:
    """
    Update an existing flight record attributes.
    """
    db_flight = get_flight_by_id(db, flight_id)
    if not db_flight:
        return None

    update_data = flight_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_flight, field, value)

    db.commit()
    db.refresh(db_flight)
    return db_flight


def delete_flight(db: Session, flight_id: int) -> bool:
    """
    Delete a flight record from the database by ID.
    """
    db_flight = get_flight_by_id(db, flight_id)
    if not db_flight:
        return False

    db.delete(db_flight)
    db.commit()
    return True


def bulk_upsert_aircraft_telemetry(db: Session, aircraft_data_list: List[dict]):
    """Insert or update the latest aircraft telemetry for multiple aircraft in a single optimized pass."""
    if not aircraft_data_list:
        return
        
    from sqlalchemy.dialects.sqlite import insert
    
    now = datetime.utcnow()
    
    # Deduplicate incoming data to prevent SQLite IntegrityError within the same batch
    unique_incoming = {}
    for data in aircraft_data_list:
        icao24 = data.get("icao24")
        if icao24:
            icao24_normalized = str(icao24).strip().upper()  # Must match models.py / schema convention
            data["icao24"] = icao24_normalized
            unique_incoming[icao24_normalized] = {
                "icao24": icao24_normalized,
                "callsign": data.get("callsign"),
                "latitude": data.get("latitude"),
                "longitude": data.get("longitude"),
                "altitude": data.get("altitude"),
                "velocity": data.get("velocity"),
                "heading": data.get("heading"),
                "vertical_rate": data.get("vertical_rate"),
                "origin_country": data.get("origin_country"),
                "timestamp": now
            }

    if not unique_incoming:
        return

    # Process in chunks to avoid SQLite "too many SQL variables" error
    # SQLite has a limit of 32766 variables per query. We have 10 columns per row, so max 3000 rows per query.
    chunk_size = 500
    values_list = list(unique_incoming.values())
    
    for i in range(0, len(values_list), chunk_size):
        chunk = values_list[i:i + chunk_size]
        stmt = insert(models.AircraftTelemetry).values(chunk)
        
        # Update all fields except icao24 if the record already exists
        update_dict = {
            c.name: c
            for c in stmt.excluded
            if c.name not in ["id", "icao24"]
        }
        
        upsert_stmt = stmt.on_conflict_do_update(
            index_elements=["icao24"],
            set_=update_dict
        )
        
        db.execute(upsert_stmt)
    # We do NOT flush or commit here; let the caller handle db.commit() to ensure a single transaction.


def get_current_aircraft_telemetry(db: Session, limit: Optional[int] = None) -> List[models.AircraftTelemetry]:
    """Return the latest aircraft telemetry snapshot per aircraft."""
    query = db.query(models.AircraftTelemetry).order_by(models.AircraftTelemetry.timestamp.desc())
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_aircraft_telemetry_by_icao24(db: Session, icao24: str) -> Optional[models.AircraftTelemetry]:
    return db.query(models.AircraftTelemetry).filter(models.AircraftTelemetry.icao24 == icao24.upper()).first()


def save_weather_telemetry(db: Session, aircraft_id: int, weather_data: dict) -> models.WeatherTelemetry:
    """Persist a new weather telemetry snapshot for an aircraft."""
    record = models.WeatherTelemetry(aircraft_id=aircraft_id, **weather_data)
    db.add(record)
    db.flush()
    return record


def get_latest_weather_for_aircraft(db: Session, aircraft_id: int) -> Optional[models.WeatherTelemetry]:
    return (
        db.query(models.WeatherTelemetry)
        .filter(models.WeatherTelemetry.aircraft_id == aircraft_id)
        .order_by(models.WeatherTelemetry.timestamp.desc())
        .first()
    )


def get_live_dashboard_stats(db: Session) -> dict:
    """Build summary statistics for the live dashboard."""
    aircrafts = get_current_aircraft_telemetry(db, limit=700)
    if not aircrafts:
        return {
            "total_live_aircraft": 0,
            "average_speed": 0.0,
            "average_altitude": 0.0,
            "average_wind_speed": 0.0,
            "weather_severity": "Low",
            "last_updated": datetime.utcnow(),
            "status_message": "Live aircraft data temporarily unavailable.",
        }

    average_speed = round(sum((aircraft.velocity or 0.0) for aircraft in aircrafts) / len(aircrafts), 1)
    average_altitude = round(sum((aircraft.altitude or 0.0) for aircraft in aircrafts) / len(aircrafts), 1)
    
    # FIX: Fetch the most recent weather data in a single query to avoid O(N) database locks
    weather_rows = db.query(models.WeatherTelemetry).order_by(models.WeatherTelemetry.timestamp.desc()).limit(100).all()
    average_wind_speed = round(sum((weather.wind_speed or 0.0) for weather in weather_rows) / len(weather_rows), 1) if weather_rows else 0.0

    if average_wind_speed >= 20:
        weather_severity = "High"
    elif average_wind_speed >= 10:
        weather_severity = "Moderate"
    else:
        weather_severity = "Low"

    last_updated = max([aircraft.timestamp for aircraft in aircrafts] + [weather.timestamp for weather in weather_rows], default=datetime.utcnow())

    return {
        "total_live_aircraft": len(aircrafts),
        "average_speed": average_speed,
        "average_altitude": average_altitude,
        "average_wind_speed": average_wind_speed,
        "weather_severity": weather_severity,
        "last_updated": last_updated,
        "status_message": None,
    }


def get_history(db: Session, limit: int = 100) -> List[models.AircraftTelemetry]:
    """Return historical aircraft telemetry records."""
    return db.query(models.AircraftTelemetry).order_by(models.AircraftTelemetry.timestamp.desc()).limit(limit).all()
