from app.services.weather_service import _get_api_key
from app.services.opensky_service import _get_auth_credentials
print('OPENWEATHER_present=' + str(bool(_get_api_key())))
print('OPENSKY_credentials_present=' + str(bool(_get_auth_credentials())))
