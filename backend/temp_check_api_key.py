from app.services.weather_service import _get_api_key
print('key_loaded=' + str(bool(_get_api_key())))
