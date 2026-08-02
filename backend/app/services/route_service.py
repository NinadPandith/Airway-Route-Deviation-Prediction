"""Real Flight Route API Integration with Caching and Simulation Engine."""

import os
from datetime import datetime
from typing import Optional
import requests
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from .. import models, schemas, crud
import airportsdata
from ..utils.geo import haversine, bearing

# Load ICAO airport data globally
airports_icao = airportsdata.load('ICAO')

AVIATIONSTACK_API_KEY = os.getenv("AVIATIONSTACK_API_KEY", "").strip()
AVIATIONSTACK_URL = "http://api.aviationstack.com/v1/flights"

def simulate_route(db: Session, callsign: str) -> Optional[schemas.RouteInfoResponse]:
    """Generate a simulated route if real flight plan is unavailable."""
    # First, try to find the live aircraft telemetry using the provided callsign/icao24
    aircraft = crud.get_aircraft_telemetry_by_icao24(db, callsign)
    if not aircraft and callsign:
        # Fallback to querying by callsign directly if it's different
        aircraft = db.query(models.AircraftTelemetry).filter(models.AircraftTelemetry.callsign == callsign.upper()).first()

    if not aircraft or aircraft.latitude is None or aircraft.longitude is None:
        return None

    alat, alon, aheading = aircraft.latitude, aircraft.longitude, aircraft.heading or 0.0

    # 1. Find nearest origin airport
    min_d = float('inf')
    origin = None
    for code, ap in airports_icao.items():
        d = haversine(alat, alon, ap['lat'], ap['lon'])
        if d < min_d:
            min_d = d
            origin = ap

    if not origin:
        return None

    # 2. Find realistic destination in heading direction
    best_dest = None
    max_d = 0
    for code, ap in airports_icao.items():
        d = haversine(alat, alon, ap['lat'], ap['lon'])
        if 500 < d < 4000:  # Realistic flight distances
            b = bearing(alat, alon, ap['lat'], ap['lon'])
            diff = abs(b - aheading)
            if diff > 180:
                diff = 360 - diff
            
            # If airport is roughly in front of the plane (+- 15 degrees)
            if diff < 15:
                # Prioritize larger/further airports to simulate a long route
                if d > max_d:
                    max_d = d
                    best_dest = ap
    
    # If no destination found in heading, pick a fallback destination somewhat far away
    if not best_dest:
        for code, ap in airports_icao.items():
            d = haversine(alat, alon, ap['lat'], ap['lon'])
            if 1000 < d < 2000:
                best_dest = ap
                break

    if not best_dest:
        return None

    # 3. Save the simulated route to cache
    new_cache = models.FlightRouteCache(
        callsign=callsign,
        airline="Simulated Airlines",
        flight_number=f"SIM-{callsign}",
        aircraft_registration=None,
        aircraft_model=None,
        origin_airport=origin.get('name'),
        origin_iata=origin.get('iata', ''),
        origin_icao=origin.get('icao', ''),
        destination_airport=best_dest.get('name'),
        destination_iata=best_dest.get('iata', ''),
        destination_icao=best_dest.get('icao', ''),
        departure_time=None,
        arrival_time=None,
        flight_status="active"
    )
    try:
        db.add(new_cache)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Already inserted by another concurrent request, which is fine

    return schemas.RouteInfoResponse(
        callsign=callsign,
        airline="Simulated Airlines",
        flight_number=f"SIM-{callsign}",
        origin_airport=origin.get('name'),
        origin_iata=origin.get('iata'),
        origin_icao=origin.get('icao'),
        origin_lat=origin.get('lat'),
        origin_lon=origin.get('lon'),
        destination_airport=best_dest.get('name'),
        destination_iata=best_dest.get('iata'),
        destination_icao=best_dest.get('icao'),
        destination_lat=best_dest.get('lat'),
        destination_lon=best_dest.get('lon'),
        cached=True
    )

def get_route_for_aircraft(db: Session, callsign: str) -> Optional[schemas.RouteInfoResponse]:
    """Fetch flight route from DB cache, API, or Simulator."""
    if not callsign:
        return None

    callsign = callsign.strip().upper()

    # 1. Check local cache
    cached = db.query(models.FlightRouteCache).filter(models.FlightRouteCache.callsign == callsign).first()
    if cached:
        origin_lat = airports_icao.get(cached.origin_icao, {}).get("lat") if cached.origin_icao else None
        origin_lon = airports_icao.get(cached.origin_icao, {}).get("lon") if cached.origin_icao else None
        dest_lat = airports_icao.get(cached.destination_icao, {}).get("lat") if cached.destination_icao else None
        dest_lon = airports_icao.get(cached.destination_icao, {}).get("lon") if cached.destination_icao else None

        return schemas.RouteInfoResponse(
            callsign=cached.callsign,
            airline=cached.airline,
            flight_number=cached.flight_number,
            aircraft_registration=cached.aircraft_registration,
            aircraft_model=cached.aircraft_model,
            origin_airport=cached.origin_airport,
            origin_iata=cached.origin_iata,
            origin_icao=cached.origin_icao,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            destination_airport=cached.destination_airport,
            destination_iata=cached.destination_iata,
            destination_icao=cached.destination_icao,
            destination_lat=dest_lat,
            destination_lon=dest_lon,
            departure_time=cached.departure_time,
            arrival_time=cached.arrival_time,
            flight_status=cached.flight_status,
            cached=True
        )

    # 2. Fetch from API if key available
    if AVIATIONSTACK_API_KEY:
        try:
            params = {
                "access_key": AVIATIONSTACK_API_KEY,
                "flight_icao": callsign,
                "limit": 1
            }
            response = requests.get(AVIATIONSTACK_URL, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            if "data" in data and len(data["data"]) > 0:
                flight = data["data"][0]
                airline = flight.get("airline", {}).get("name")
                flight_number = flight.get("flight", {}).get("iata") or flight.get("flight", {}).get("icao")
                
                aircraft = flight.get("aircraft")
                registration = aircraft.get("registration") if aircraft else None
                model = aircraft.get("iata") or aircraft.get("icao") if aircraft else None
                
                departure = flight.get("departure", {})
                dep_airport = departure.get("airport")
                dep_iata = departure.get("iata")
                dep_icao = departure.get("icao")
                dep_time = departure.get("estimated") or departure.get("scheduled")
                
                arrival = flight.get("arrival", {})
                arr_airport = arrival.get("airport")
                arr_iata = arrival.get("iata")
                arr_icao = arrival.get("icao")
                arr_time = arrival.get("estimated") or arrival.get("scheduled")
                status = flight.get("flight_status")

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
                try:
                    db.add(new_cache)
                    db.commit()
                except IntegrityError:
                    db.rollback()
                    # Already inserted by another concurrent request
                
                return schemas.RouteInfoResponse(
                    callsign=callsign,
                    airline=airline,
                    flight_number=flight_number,
                    aircraft_registration=registration,
                    aircraft_model=model,
                    origin_airport=dep_airport,
                    origin_iata=dep_iata,
                    origin_icao=dep_icao,
                    origin_lat=airports_icao.get(dep_icao, {}).get("lat") if dep_icao else None,
                    origin_lon=airports_icao.get(dep_icao, {}).get("lon") if dep_icao else None,
                    destination_airport=arr_airport,
                    destination_iata=arr_iata,
                    destination_icao=arr_icao,
                    destination_lat=airports_icao.get(arr_icao, {}).get("lat") if arr_icao else None,
                    destination_lon=airports_icao.get(arr_icao, {}).get("lon") if arr_icao else None,
                    departure_time=dep_time,
                    arrival_time=arr_time,
                    flight_status=status,
                    cached=False
                )
        except Exception as e:
            print(f"Failed to fetch real route for {callsign}: {e}")

    # 3. If real API failed or is not configured, generate a simulated route
    return simulate_route(db, callsign)
