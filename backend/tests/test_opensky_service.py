import unittest
from unittest.mock import patch

from app.services import opensky_service


class DummyDB:
    def commit(self):
        return None


class OpenSkyServiceTests(unittest.TestCase):
    def test_collect_live_aircraft_caps_processed_payloads(self):
        fake_payloads = [
            {
                "icao24": f"ABC{i:03d}",
                "callsign": f"CALL{i}",
                "latitude": 0.0,
                "longitude": 0.0,
            }
            for i in range(120)
        ]

        with patch("app.services.opensky_service.fetch_live_aircraft", return_value=(fake_payloads, None)) as mock_fetch, \
             patch("app.services.opensky_service.crud.upsert_aircraft_telemetry") as mock_upsert, \
             patch("app.services.opensky_service.crud.get_current_aircraft_telemetry", return_value=[{"icao24": "ABC000"}]) as mock_get_current:
            result = opensky_service.collect_live_aircraft(DummyDB(), refresh=True)

        self.assertEqual(mock_fetch.call_count, 1)
        self.assertEqual(mock_upsert.call_count, 100)
        self.assertEqual(mock_get_current.call_count, 1)
        self.assertEqual(result["aircrafts"], [{"icao24": "ABC000"}])


if __name__ == "__main__":
    unittest.main()
