"""
Pydantic schemas for data validation and serialization/deserialization.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class FlightBase(BaseModel):
    """
    Base schema shared across Flight request and response models.
    """
    flight_number: str = Field(..., min_length=2, max_length=50, example="AI-202")
    aircraft_name: str = Field(..., min_length=2, max_length=100, example="Boeing 787-9 Dreamliner")
    latitude: float = Field(..., ge=-90.0, le=90.0, example=28.5562)
    longitude: float = Field(..., ge=-180.0, le=180.0, example=77.1000)
    altitude: float = Field(..., ge=0.0, example=35000.0, description="Altitude in feet")
    speed: float = Field(..., ge=0.0, example=485.5, description="Speed in knots")
    heading: float = Field(..., ge=0.0, le=360.0, example=120.0, description="Heading in degrees")
    origin: str = Field(..., min_length=2, max_length=100, example="DEL - Indira Gandhi Intl")
    destination: str = Field(..., min_length=2, max_length=100, example="LHR - London Heathrow")
    status: str = Field(default="In Flight", example="In Flight")


class FlightCreate(FlightBase):
    """
    Schema for creating a new Flight record.
    """
    pass


class FlightUpdate(BaseModel):
    """
    Schema for updating an existing Flight record. All fields are optional.
    """
    flight_number: Optional[str] = Field(None, min_length=2, max_length=50)
    aircraft_name: Optional[str] = Field(None, min_length=2, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    altitude: Optional[float] = Field(None, ge=0.0)
    speed: Optional[float] = Field(None, ge=0.0)
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    origin: Optional[str] = Field(None, min_length=2, max_length=100)
    destination: Optional[str] = Field(None, min_length=2, max_length=100)
    status: Optional[str] = Field(None)


class FlightResponse(FlightBase):
    """
    Schema for returning Flight details in API responses.
    """
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AircraftTelemetryBase(BaseModel):
    """Base schema for live aircraft telemetry records."""
    icao24: str = Field(..., min_length=2, max_length=20)
    callsign: Optional[str] = Field(None, max_length=50)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    altitude: Optional[float] = Field(None)
    velocity: Optional[float] = Field(None, ge=0.0)
    heading: Optional[float] = Field(None, ge=0.0, le=360.0)
    vertical_rate: Optional[float] = Field(None)
    origin_country: Optional[str] = Field(None, max_length=100)


class AircraftTelemetryResponse(AircraftTelemetryBase):
    """Response payload for a live aircraft telemetry record."""
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class WeatherTelemetryBase(BaseModel):
    """Base schema for weather telemetry records."""
    temperature: Optional[float] = Field(None)
    feels_like: Optional[float] = Field(None)
    wind_speed: Optional[float] = Field(None)
    wind_direction: Optional[float] = Field(None)
    humidity: Optional[float] = Field(None)
    pressure: Optional[float] = Field(None)
    visibility: Optional[float] = Field(None)
    cloud_coverage: Optional[float] = Field(None)
    rainfall: Optional[float] = Field(None)
    weather_description: Optional[str] = Field(None, max_length=200)


class WeatherTelemetryResponse(WeatherTelemetryBase):
    """Response payload for weather telemetry."""
    id: int
    aircraft_id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class LiveAircraftResponse(BaseModel):
    """Response payload for live aircraft data."""
    aircrafts: List[AircraftTelemetryResponse] = []
    message: Optional[str] = None
    last_updated: datetime
    source: str


class LiveWeatherResponse(BaseModel):
    """Response payload for weather data tied to an aircraft."""
    weather: Optional[WeatherTelemetryResponse] = None
    message: Optional[str] = None
    timestamp: datetime


class LiveDashboardResponse(BaseModel):
    """Response payload for dashboard statistics."""
    total_live_aircraft: int
    average_speed: float
    average_altitude: float
    average_wind_speed: float
    weather_severity: str
    last_updated: datetime
    status_message: Optional[str] = None


class PredictionRequest(BaseModel):
    aircraft_id: str = Field(..., description="The ICAO24 identifier of the aircraft")


class PredictionResponse(BaseModel):
    risk_level: str
    probability: float
    estimated_delay: int
    weather_risk: str
    prediction_time: str
    planned_route_distance: Optional[float] = None
    current_distance_travelled: Optional[float] = None
    deviation_distance: Optional[float] = None
    deviation_percentage: Optional[float] = None
    overall_risk_score: Optional[float] = None
    weather_impact_score: Optional[float] = None
    confidence_score: Optional[float] = None
    suggested_action: Optional[str] = None
    error: bool = False
    message: Optional[str] = None

class RouteInfoResponse(BaseModel):
    callsign: str
    airline: Optional[str] = None
    flight_number: Optional[str] = None
    aircraft_registration: Optional[str] = None
    aircraft_model: Optional[str] = None
    origin_airport: Optional[str] = None
    origin_iata: Optional[str] = None
    origin_icao: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    destination_airport: Optional[str] = None
    destination_iata: Optional[str] = None
    destination_icao: Optional[str] = None
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    flight_status: Optional[str] = None
    cached: bool = False
    error: bool = False
    message: Optional[str] = None

class SimulationSessionCreate(BaseModel):
    flight_id: int

class SimulationSessionResponse(BaseModel):
    id: int
    flight_id: int
    start_time: datetime
    end_time: Optional[datetime]
    status: str

    model_config = ConfigDict(from_attributes=True)

class SimulationTelemetryCreate(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    altitude: float
    speed: float
    heading: float
    weather_severity: Optional[float] = None
    
    # Optional fields for route distance tracking passed from frontend
    prev_latitude: Optional[float] = None
    prev_longitude: Optional[float] = None
    prev_altitude: Optional[float] = None
    prev_speed: Optional[float] = None
    prev_heading: Optional[float] = None
    
    # Route info for deviation calculation
    origin_lat: Optional[float] = None
    origin_lon: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lon: Optional[float] = None
    wind_speed: Optional[float] = 0.0
    wind_direction: Optional[float] = 0.0

class SimulationTelemetryResponse(BaseModel):
    id: int
    session_id: int
    timestamp: datetime
    latitude: float
    longitude: float
    altitude: float
    speed: float
    heading: float
    weather_severity: Optional[float]
    risk_level: Optional[str]
    deviation_percentage: Optional[float]
    confidence_score: Optional[float]
    estimated_delay: Optional[int]

    model_config = ConfigDict(from_attributes=True)

