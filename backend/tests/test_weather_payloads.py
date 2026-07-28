import os
import unittest
from unittest.mock import patch

from app import models, schemas
from app.services import weather_service


class WeatherPayloadTests(unittest.TestCase):
    def test_weather_schema_accepts_feels_like(self):
        payload = schemas.WeatherTelemetryBase.model_validate({
            "temperature": 24.8,
            "feels_like": 23.7,
            "wind_speed": 3.2,
        })
        self.assertEqual(payload.feels_like, 23.7)

    def test_weather_model_has_feels_like_column(self):
        self.assertTrue(hasattr(models.WeatherTelemetry, "feels_like"))

    def test_missing_api_key_returns_meaningful_message(self):
        class DummyAircraft:
            id = 1
            latitude = 12.34
            longitude = 45.67

        with patch.dict(os.environ, {"OPENWEATHER_API_KEY": ""}, clear=False):
            with patch("app.services.weather_service.crud.get_aircraft_telemetry_by_icao24", return_value=DummyAircraft):
                with patch("app.services.weather_service.crud.get_latest_weather_for_aircraft", return_value=None):
                    result = weather_service.get_weather_for_aircraft(None, "ABC123")

        self.assertIsNone(result["weather"])
        self.assertIn("OpenWeather API key", result["message"])

    def test_fetch_weather_parses_openweather_response(self):
        class DummyResponse:
            status_code = 200

            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "weather": [{"description": "light breeze"}],
                    "main": {
                        "temp": 16.4,
                        "feels_like": 15.0,
                        "humidity": 74,
                        "pressure": 1018,
                    },
                    "wind": {"speed": 4.2, "deg": 145},
                    "visibility": 10000,
                    "clouds": {"all": 20},
                    "rain": {"1h": 0.0},
                }

        with patch.dict(os.environ, {"OPENWEATHER_API_KEY": "testkey"}, clear=False):
            with patch("app.services.weather_service.requests.get", return_value=DummyResponse()):
                weather_data, error = weather_service.fetch_weather_for_coordinates(51.5, -0.1)

        self.assertIsNone(error)
        self.assertEqual(weather_data["temperature"], 16.4)
        self.assertEqual(weather_data["feels_like"], 15.0)
        self.assertEqual(weather_data["humidity"], 74)
        self.assertEqual(weather_data["pressure"], 1018)
        self.assertEqual(weather_data["wind_speed"], 4.2)
        self.assertEqual(weather_data["wind_direction"], 145)
        self.assertEqual(weather_data["visibility"], 10000)
        self.assertEqual(weather_data["cloud_coverage"], 20)
        self.assertEqual(weather_data["rainfall"], 0.0)
        self.assertEqual(weather_data["weather_description"], "light breeze")


if __name__ == "__main__":
    unittest.main()
