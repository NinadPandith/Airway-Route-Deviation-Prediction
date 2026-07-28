"""
Seed script to pre-populate the SQLite airway.db database with realistic sample flight records.
"""

import sys
import os

# Ensure backend root is on Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models import Flight

# Ensure database schema exists
Base.metadata.create_all(bind=engine)

SAMPLE_FLIGHTS = [
    {
        "flight_number": "AI-202",
        "aircraft_name": "Boeing 787-9 Dreamliner",
        "latitude": 28.5562,
        "longitude": 77.1000,
        "altitude": 35000.0,
        "speed": 485.0,
        "heading": 120.0,
        "origin": "DEL (Delhi)",
        "destination": "LHR (London Heathrow)",
        "status": "In Flight"
    },
    {
        "flight_number": "BA-117",
        "aircraft_name": "Airbus A350-1000",
        "latitude": 51.4700,
        "longitude": -0.4543,
        "altitude": 38000.0,
        "speed": 510.0,
        "heading": 275.0,
        "origin": "LHR (London Heathrow)",
        "destination": "JFK (New York)",
        "status": "In Flight"
    },
    {
        "flight_number": "EK-505",
        "aircraft_name": "Airbus A380-800",
        "latitude": 25.2532,
        "longitude": 55.3657,
        "altitude": 32000.0,
        "speed": 490.0,
        "heading": 95.0,
        "origin": "DXB (Dubai)",
        "destination": "BOM (Mumbai)",
        "status": "Deviated"
    },
    {
        "flight_number": "DL-404",
        "aircraft_name": "Boeing 777-300ER",
        "latitude": 40.6413,
        "longitude": -73.7781,
        "altitude": 0.0,
        "speed": 0.0,
        "heading": 0.0,
        "origin": "JFK (New York)",
        "destination": "LAX (Los Angeles)",
        "status": "Delayed"
    },
    {
        "flight_number": "SQ-321",
        "aircraft_name": "Boeing 777-300ER",
        "latitude": 1.3644,
        "longitude": 103.9915,
        "altitude": 40000.0,
        "speed": 525.0,
        "heading": 310.0,
        "origin": "SIN (Singapore)",
        "destination": "CDG (Paris)",
        "status": "In Flight"
    },
    {
        "flight_number": "LH-456",
        "aircraft_name": "Airbus A340-600",
        "latitude": 50.0379,
        "longitude": 8.5622,
        "altitude": 0.0,
        "speed": 0.0,
        "heading": 180.0,
        "origin": "FRA (Frankfurt)",
        "destination": "SFO (San Francisco)",
        "status": "Landed"
    },
    {
        "flight_number": "AA-100",
        "aircraft_name": "Boeing 787-8",
        "latitude": 33.9416,
        "longitude": -118.4085,
        "altitude": 15000.0,
        "speed": 340.0,
        "heading": 65.0,
        "origin": "LAX (Los Angeles)",
        "destination": "ORD (Chicago)",
        "status": "Scheduled"
    }
]


def seed_database():
    """
    Populate database with sample flight records if empty.
    """
    db = SessionLocal()
    try:
        existing_count = db.query(Flight).count()
        if existing_count > 0:
            print(f"Database already contains {existing_count} flight records. Skipping seed.")
            return

        print("Seeding database with sample flights...")
        for flight_data in SAMPLE_FLIGHTS:
            flight = Flight(**flight_data)
            db.add(flight)

        db.commit()
        print(f"Successfully seeded {len(SAMPLE_FLIGHTS)} flight records into airway.db!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
