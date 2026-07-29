"""Open-Meteo integration for live weather telemetry."""

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

import requests
from sqlalchemy.orm import Session

from .. import crud

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

WMO_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

def _build_error_message(status_code: Optional[int], error_message: str, latitude: Optional[float], longitude: Optional[float], url: str) -> str:
    if not error_message:
        error_message = "Unknown error"
    return f"Open-Meteo API request failed: {error_message} (status: {status_code})"


def fetch_weather_for_coordinates(latitude: Optional[float], longitude: Optional[float], retries: int = 1, timeout: int = 4) -> Tuple[Optional[Dict[str, Any]], Optional[Exception]]:
    """Fetch current weather data for a latitude/longitude pair from Open-Meteo."""
    if latitude is None or longitude is None:
        error = ValueError("Latitude and longitude are required")
        logger.warning(
            "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
            OPEN_METEO_URL,
            latitude,
            longitude,
            None,
            str(error),
        )
        return None, error

    last_error: Optional[Exception] = None
    
    # We fetch relevant current variables
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,visibility",
        "wind_speed_unit": "ms"
    }
    
    url = f"{OPEN_METEO_URL}?latitude={latitude}&longitude={longitude}"
    for attempt in range(retries):
        try:
            response = requests.get(
                OPEN_METEO_URL,
                params=params,
                timeout=timeout,
            )
            if response.status_code != 200:
                detail = response.text[:500]
                error = RuntimeError(detail or f"HTTP {response.status_code}")
                logger.warning(
                    "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
                    url,
                    latitude,
                    longitude,
                    response.status_code,
                    str(error),
                )
                return None, error

            payload = response.json()
            current = payload.get("current", {})
            
            code = current.get("weather_code", 0)
            description = WMO_CODES.get(code, "Unknown")
            
            # Map Open-Meteo fields to the expected dictionary
            weather_data = {
                "temperature": current.get("temperature_2m"),
                "feels_like": current.get("apparent_temperature"),
                "wind_speed": current.get("wind_speed_10m"),
                "wind_direction": current.get("wind_direction_10m"),
                "humidity": current.get("relative_humidity_2m"),
                "pressure": current.get("surface_pressure"),
                "visibility": current.get("visibility"),
                "cloud_coverage": current.get("cloud_cover"),
                "rainfall": current.get("precipitation"),
                "weather_description": description,
            }
            
            logger.info(
                "Weather API request succeeded | url=%s | lat=%s | lon=%s | status=%s | description=%s",
                url,
                latitude,
                longitude,
                response.status_code,
                description,
            )
            return weather_data, None
            
        except requests.RequestException as exc:  # pragma: no cover - network fallback path
            last_error = exc
            logger.warning(
                "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
                url,
                latitude,
                longitude,
                getattr(exc, "response", None).status_code if getattr(exc, "response", None) is not None else None,
                str(exc),
            )
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))
        except Exception as exc:  # pragma: no cover - network fallback path
            last_error = exc
            logger.warning(
                "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
                url,
                latitude,
                longitude,
                None,
                str(exc),
            )
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))

    return None, last_error


def get_weather_for_aircraft(db: Session, icao24: str) -> Dict[str, Any]:
    """Fetch weather for an aircraft and persist the latest result."""
    aircraft = crud.get_aircraft_telemetry_by_icao24(db, icao24)
    if not aircraft:
        return {
            "weather": None,
            "message": "Weather lookup failed: no live aircraft record was found for that ICAO24 code.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    weather_payload, error = fetch_weather_for_coordinates(aircraft.latitude, aircraft.longitude)
    if weather_payload:
        weather_record = crud.save_weather_telemetry(db, aircraft.id, weather_payload)
        if db is not None:
            db.commit()
        return {
            "weather": weather_record,
            "message": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    existing_weather = crud.get_latest_weather_for_aircraft(db, aircraft.id) if db is not None else None
    message = _build_error_message(
        None,
        str(error) if error else "Unknown weather service error",
        aircraft.latitude,
        aircraft.longitude,
        OPEN_METEO_URL,
    )
    return {
        "weather": existing_weather,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
