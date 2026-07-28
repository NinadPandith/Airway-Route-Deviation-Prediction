"""OpenWeatherMap integration for live weather telemetry."""

import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .. import crud

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5/weather"


def _get_api_key() -> str:
    return os.getenv("OPENWEATHER_API_KEY", "").strip()


def _build_error_message(status_code: Optional[int], error_message: str, latitude: Optional[float], longitude: Optional[float], url: str) -> str:
    if not error_message:
        error_message = "Unknown error"

    if status_code == 401 or "401" in error_message:
        return f"OpenWeather API request failed: invalid or missing API key. Verify OPENWEATHER_API_KEY in backend/.env. Details: {error_message}"
    if status_code == 429 or "429" in error_message:
        return f"OpenWeather API request failed: rate limit exceeded. Details: {error_message}"
    return f"OpenWeather API request failed: {error_message}"


def fetch_weather_for_coordinates(latitude: Optional[float], longitude: Optional[float], retries: int = 1, timeout: int = 4) -> Tuple[Optional[Dict[str, Any]], Optional[Exception]]:
    """Fetch current weather data for a latitude/longitude pair."""
    api_key = _get_api_key()
    if not api_key:
        error = RuntimeError("OpenWeather API key not configured")
        logger.warning(
            "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
            OPENWEATHER_BASE_URL,
            latitude,
            longitude,
            None,
            str(error),
        )
        return None, error

    if latitude is None or longitude is None:
        error = ValueError("Latitude and longitude are required")
        logger.warning(
            "Weather API request failed | url=%s | lat=%s | lon=%s | status=%s | error=%s",
            OPENWEATHER_BASE_URL,
            latitude,
            longitude,
            None,
            str(error),
        )
        return None, error

    last_error: Optional[Exception] = None
    url = f"{OPENWEATHER_BASE_URL}?lat={latitude}&lon={longitude}&appid={'*' * 8}&units=metric"
    for attempt in range(retries):
        try:
            response = requests.get(
                OPENWEATHER_BASE_URL,
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "appid": api_key,
                    "units": "metric",
                },
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
            weather = (payload.get("weather") or [{}])[0]
            main = payload.get("main") or {}
            wind = payload.get("wind") or {}
            clouds = payload.get("clouds") or {}
            rain = payload.get("rain") or {}
            rainfall = rain.get("1h")
            if rainfall is None:
                rainfall = rain.get("3h", 0.0)
            logger.info(
                "Weather API request succeeded | url=%s | lat=%s | lon=%s | status=%s | description=%s",
                url,
                latitude,
                longitude,
                response.status_code,
                weather.get("description", "Unknown"),
            )
            return {
                "temperature": main.get("temp"),
                "feels_like": main.get("feels_like"),
                "wind_speed": wind.get("speed"),
                "wind_direction": wind.get("deg"),
                "humidity": main.get("humidity"),
                "pressure": main.get("pressure"),
                "visibility": payload.get("visibility"),
                "cloud_coverage": clouds.get("all"),
                "rainfall": rainfall,
                "weather_description": weather.get("description", "Unknown"),
            }, None
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
        OPENWEATHER_BASE_URL,
    )
    return {
        "weather": existing_weather,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
