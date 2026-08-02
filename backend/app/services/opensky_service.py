"""OpenSky Network integration for live aircraft telemetry."""

import os
import time
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import concurrent.futures

import requests
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .. import crud

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

OPENSKY_BASE_URL = "https://opensky-network.org/api/states/all"

logger = logging.getLogger(__name__)

# Bounding boxes: lamin, lomin, lamax, lomax
REGIONS = {
    "North America": (15.0, -170.0, 72.0, -50.0),
    "South America": (-60.0, -90.0, 15.0, -30.0),
    "Europe": (35.0, -10.0, 70.0, 40.0),
    "Africa": (-35.0, -20.0, 35.0, 55.0),
    "Middle East": (10.0, 35.0, 40.0, 65.0),
    "India": (5.0, 65.0, 35.0, 95.0),
    "East Asia": (15.0, 95.0, 55.0, 150.0),
    "Southeast Asia": (-10.0, 90.0, 15.0, 150.0),
    "Australia": (-50.0, 110.0, -10.0, 180.0)
}

# Cache to prevent rate limiting
_global_cache = {
    "data": [],
    "last_fetched": 0,
    "ttl_seconds": 30
}

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
    
    # Validation
    if state[5] is None or state[6] is None:
        return {}
        
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

def fetch_region(name: str, bbox: Tuple[float, float, float, float], auth: Optional[Tuple[str, str]], timeout: int = 10) -> List[Dict[str, Any]]:
    """Fetch aircraft states for a specific geographic bounding box."""
    lamin, lomin, lamax, lomax = bbox
    params = {
        "lamin": lamin,
        "lomin": lomin,
        "lamax": lamax,
        "lomax": lomax
    }
    
    try:
        response = requests.get(OPENSKY_BASE_URL, params=params, auth=auth, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
        states = payload.get("states") or []
        
        normalized = []
        for state in states:
            norm = _normalize_aircraft_state(state)
            if norm:
                normalized.append(norm)
                
        logger.debug(f"Fetched {len(normalized)} aircraft in {name}")
        return normalized
    except Exception as exc:
        logger.warning(f"Failed to fetch OpenSky region {name}: {exc}")
        return []

def fetch_live_aircraft_worldwide(timeout: int = 10) -> List[Dict[str, Any]]:
    """Fetch aircraft from all configured regions concurrently."""
    auth = _get_auth_credentials()
    all_aircraft = []
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(REGIONS)) as executor:
        futures = {
            executor.submit(fetch_region, name, bbox, auth, timeout): name 
            for name, bbox in REGIONS.items()
        }
        
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                all_aircraft.extend(result)
            except Exception as e:
                name = futures[future]
                logger.error(f"Error processing region {name}: {e}")
                
    # Deduplicate by icao24
    unique_aircraft = {}
    for ac in all_aircraft:
        icao24 = ac.get("icao24")
        if icao24:
            unique_aircraft[icao24] = ac
            
    # Cap at 5000 to prevent client browser from hanging due to excessive markers
    return list(unique_aircraft.values())[:5000]

import threading
_fetch_lock = threading.Lock()

def collect_live_aircraft(db: Session, refresh: bool = True) -> Dict[str, Any]:
    """Fetch and persist live aircraft telemetry worldwide, using cache to respect limits."""
    global _global_cache
    
    current_time = time.time()
    
    if refresh:
        with _fetch_lock:
            # Re-check cache after acquiring lock
            current_time = time.time()
            if current_time - _global_cache["last_fetched"] >= _global_cache["ttl_seconds"]:
                # Fetch fresh data
                logger.info("Fetching fresh worldwide aircraft data from OpenSky API...")
                aircraft_payloads = fetch_live_aircraft_worldwide()
                
                if aircraft_payloads:
                    logger.info(f"Total unique worldwide aircraft received from OpenSky: {len(aircraft_payloads)}")
                    crud.bulk_upsert_aircraft_telemetry(db, aircraft_payloads)
                    db.commit()
                    
                    # Update cache
                    _global_cache["data"] = aircraft_payloads
                    _global_cache["last_fetched"] = time.time()
            else:
                logger.info("Using cached aircraft data to avoid rate limits (stampede prevented).")
                
    aircrafts = crud.get_current_aircraft_telemetry(db, limit=700)
    logger.info(f"Total aircraft displayed (stored in SQLite): {len(aircrafts)}")
    
    return {
        "aircrafts": aircrafts,
        "message": "Live aircraft data temporarily unavailable." if not aircrafts else None,
        "last_updated": datetime.utcnow().isoformat(),
        "source": "database" if aircrafts else "unavailable",
    }
