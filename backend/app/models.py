"""
SQLAlchemy ORM Data Models for the Airway Route Deviation Prediction System.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class Flight(Base):
    """
    Flight table representing route metadata for the Phase 1 CRUD module.
    """
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    flight_number = Column(String(50), index=True, nullable=False)
    aircraft_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=False)  # feet
    speed = Column(Float, nullable=False)     # knots
    heading = Column(Float, nullable=False)   # degrees (0-360)
    origin = Column(String(100), nullable=False)       # ICAO / Airport Name
    destination = Column(String(100), nullable=False)  # ICAO / Airport Name
    status = Column(String(50), nullable=False, default="Scheduled") # Scheduled, In Flight, Delayed, Landed, Deviated
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Flight(id={self.id}, flight_number='{self.flight_number}', status='{self.status}')>"


class AircraftTelemetry(Base):
    """Live aircraft state snapshots collected from OpenSky."""
    __tablename__ = "aircraft_telemetry"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    icao24 = Column(String(20), unique=True, index=True, nullable=False)
    callsign = Column(String(50), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    altitude = Column(Float, nullable=True)
    velocity = Column(Float, nullable=True)
    heading = Column(Float, nullable=True)
    vertical_rate = Column(Float, nullable=True)
    origin_country = Column(String(100), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    weather_data = relationship("WeatherTelemetry", back_populates="aircraft", cascade="all, delete-orphan")


class WeatherTelemetry(Base):
    """Weather snapshots linked to a specific aircraft telemetry record."""
    __tablename__ = "weather_telemetry"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft_telemetry.id"), nullable=False)
    temperature = Column(Float, nullable=True)
    feels_like = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    wind_direction = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    visibility = Column(Float, nullable=True)
    cloud_coverage = Column(Float, nullable=True)
    rainfall = Column(Float, nullable=True)
    weather_description = Column(String(200), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    aircraft = relationship("AircraftTelemetry", back_populates="weather_data")
class FlightRouteCache(Base):
    """Flight route cache for real aviation API lookups."""
    __tablename__ = "flight_route_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    callsign = Column(String(50), index=True, nullable=False, unique=True)
    airline = Column(String(100), nullable=True)
    flight_number = Column(String(50), nullable=True)
    aircraft_registration = Column(String(50), nullable=True)
    aircraft_model = Column(String(100), nullable=True)
    origin_airport = Column(String(200), nullable=True)
    origin_iata = Column(String(10), nullable=True)
    origin_icao = Column(String(10), nullable=True)
    destination_airport = Column(String(200), nullable=True)
    destination_iata = Column(String(10), nullable=True)
    destination_icao = Column(String(10), nullable=True)
    departure_time = Column(String(50), nullable=True)
    arrival_time = Column(String(50), nullable=True)
    flight_status = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
