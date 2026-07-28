"""OpenSky Network integration for live aircraft telemetry."""

import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .. import crud

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

OPENSKY_BASE_URL = "https://opensky-network.org/api/states/all"
MAX_LIVE_AIRCRAFT_BATCH = 100


def _get_auth_credentials() -> Optional[Tuple[str, str]]:
    username = os.getenv("OPENSKY_USERNAME", "").strip()
    password = os.getenv("OPENSKY_PASSWORD", "").strip()
    if username and password:
        return username, password
    return None


def _normalize_aircraft_state(state: List[Any]) -> Dict[str, Any]:
    if not state or not state[0]:
        return {}

    altitude = state[13] if state[13] is not None else state[7]
    return {
        "icao24": (state[0] or "").strip().upper(),
        "callsign": (state[1] or "").strip(),
        "origin_country": (state[2] or "").strip(),
        "latitude": state[6],
        "longitude": state[5],
        "altitude": altitude,
        "velocity": state[9],
        "heading": state[10],
        "vertical_rate": state[11],
        "timestamp": datetime.utcfromtimestamp(int(state[4]) if state[4] is not None else int(time.time())),
        "last_contact": state[4],
    }


def fetch_live_aircraft(retries: int = 1, timeout: int = 4) -> Tuple[List[Dict[str, Any]], Optional[Exception]]:
    """Fetch aircraft states from the OpenSky API with retry support."""
    last_error: Optional[Exception] = None
    auth = _get_auth_credentials()

    for attempt in range(retries):
        try:
            response = requests.get(OPENSKY_BASE_URL, auth=auth, timeout=timeout)
            response.raise_for_status()
            payload = response.json()
            states = payload.get("states", []) or []
            aircraft_payloads = [
                normalized
                for normalized in (_normalize_aircraft_state(state) for state in states)
                if normalized
            ]
            return aircraft_payloads, None
        except Exception as exc:  # pragma: no cover - network fallback path
            last_error = exc
            if attempt < retries - 1:
                time.sleep(1.5 * (attempt + 1))

    return [], last_error


import logging
logger = logging.getLogger(__name__)

def collect_live_aircraft(db: Session, refresh: bool = True) -> Dict[str, Any]:
    """Fetch and persist live aircraft telemetry, falling back to the database if needed."""
    if refresh:
        # Use a shorter timeout and a capped batch so live monitoring remains responsive.
        aircraft_payloads, error = fetch_live_aircraft(retries=1, timeout=4)
        if aircraft_payloads:
            logger.info(f"Total aircraft received from OpenSky: {len(aircraft_payloads)}")
            crud.bulk_upsert_aircraft_telemetry(db, aircraft_payloads)
            db.commit()
            aircrafts = crud.get_current_aircraft_telemetry(db)
            logger.info(f"Total aircraft displayed (stored in SQLite): {len(aircrafts)}")
            return {
                "aircrafts": aircrafts,
                "message": None,
                "last_updated": datetime.utcnow().isoformat(),
                "source": "opensky",
            }

    aircrafts = crud.get_current_aircraft_telemetry(db, limit=MAX_LIVE_AIRCRAFT_BATCH)
    return {
        "aircrafts": aircrafts,
        "message": "Live aircraft data temporarily unavailable." if not aircrafts else None,
        "last_updated": datetime.utcnow().isoformat(),
        "source": "database" if aircrafts else "unavailable",
    }
