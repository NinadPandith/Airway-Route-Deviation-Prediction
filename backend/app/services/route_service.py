"""Real Flight Route API Integration with Caching."""

import os
from datetime import datetime
from typing import Optional
import requests
from sqlalchemy.orm import Session
from .. import models, schemas
import airportsdata

# Load IATA airport data globally
airports_iata = airportsdata.load('IATA')

AVIATIONSTACK_API_KEY = os.getenv("AVIATIONSTACK_API_KEY", "").strip()
AVIATIONSTACK_URL = "http://api.aviationstack.com/v1/flights"

def get_route_for_aircraft(db: Session, callsign: str) -> Optional[schemas.RouteInfoResponse]:
    """Fetch flight route from DB cache, or Aviation API if not cached."""
    if not callsign:
        return None

    # Clean callsign
    callsign = callsign.strip().upper()

    # 1. Check local cache
    cached = db.query(models.FlightRouteCache).filter(models.FlightRouteCache.callsign == callsign).first()
    if cached:
        return schemas.RouteInfoResponse(
            callsign=cached.callsign,
            airline=cached.airline,
            flight_number=cached.flight_number,
            aircraft_registration=cached.aircraft_registration,
            aircraft_model=cached.aircraft_model,
            origin_airport=cached.origin_airport,
            origin_iata=cached.origin_iata,
            origin_icao=cached.origin_icao,
            origin_lat=airports_iata.get(cached.origin_iata, {}).get("lat") if cached.origin_iata else None,
            origin_lon=airports_iata.get(cached.origin_iata, {}).get("lon") if cached.origin_iata else None,
            destination_airport=cached.destination_airport,
            destination_iata=cached.destination_iata,
            destination_icao=cached.destination_icao,
            destination_lat=airports_iata.get(cached.destination_iata, {}).get("lat") if cached.destination_iata else None,
            destination_lon=airports_iata.get(cached.destination_iata, {}).get("lon") if cached.destination_iata else None,
            departure_time=cached.departure_time,
            arrival_time=cached.arrival_time,
            flight_status=cached.flight_status,
            cached=True
        )

    # 2. Fetch from API if key available
    if not AVIATIONSTACK_API_KEY:
        return None
        
    try:
        # AviationStack expects flight_icao or flight_iata, callsign is usually flight_icao
        params = {
            "access_key": AVIATIONSTACK_API_KEY,
            "flight_icao": callsign,
            "limit": 1
        }
        
        # We use HTTP because AviationStack free tier does not support HTTPS
        response = requests.get(AVIATIONSTACK_URL, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if "data" in data and len(data["data"]) > 0:
            flight = data["data"][0]
            
            # Extract data
            airline = flight.get("airline", {}).get("name")
            flight_number = flight.get("flight", {}).get("iata") or flight.get("flight", {}).get("icao")
            
            # Aircraft Info
            aircraft = flight.get("aircraft")
            registration = aircraft.get("registration") if aircraft else None
            model = aircraft.get("iata") or aircraft.get("icao") if aircraft else None
            
            # Departure
            departure = flight.get("departure", {})
            dep_airport = departure.get("airport")
            dep_iata = departure.get("iata")
            dep_icao = departure.get("icao")
            dep_time = departure.get("estimated") or departure.get("scheduled")
            
            # Arrival
            arrival = flight.get("arrival", {})
            arr_airport = arrival.get("airport")
            arr_iata = arrival.get("iata")
            arr_icao = arrival.get("icao")
            arr_time = arrival.get("estimated") or arrival.get("scheduled")
            
            status = flight.get("flight_status")

            # 3. Save to Cache
            new_cache = models.FlightRouteCache(
                callsign=callsign,
                airline=airline,
                flight_number=flight_number,
                aircraft_registration=registration,
                aircraft_model=model,
                origin_airport=dep_airport,
                origin_iata=dep_iata,
                origin_icao=dep_icao,
                destination_airport=arr_airport,
                destination_iata=arr_iata,
                destination_icao=arr_icao,
                departure_time=dep_time,
                arrival_time=arr_time,
                flight_status=status
            )
            db.add(new_cache)
            db.commit()
            
            return schemas.RouteInfoResponse(
                callsign=callsign,
                airline=airline,
                flight_number=flight_number,
                aircraft_registration=registration,
                aircraft_model=model,
                origin_airport=dep_airport,
                origin_iata=dep_iata,
                origin_icao=dep_icao,
                origin_lat=airports_iata.get(dep_iata, {}).get("lat") if dep_iata else None,
                origin_lon=airports_iata.get(dep_iata, {}).get("lon") if dep_iata else None,
                destination_airport=arr_airport,
                destination_iata=arr_iata,
                destination_icao=arr_icao,
                destination_lat=airports_iata.get(arr_iata, {}).get("lat") if arr_iata else None,
                destination_lon=airports_iata.get(arr_iata, {}).get("lon") if arr_iata else None,
                departure_time=dep_time,
                arrival_time=arr_time,
                flight_status=status,
                cached=False
            )
            
    except Exception as e:
        print(f"Failed to fetch route for {callsign}: {e}")
        
    return None
