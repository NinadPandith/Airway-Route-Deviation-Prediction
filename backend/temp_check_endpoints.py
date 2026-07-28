from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

print('calling_live_aircraft')
resp = client.get('/api/live-aircraft?refresh=true')
print('status_live_aircraft=', resp.status_code)
print('live_aircraft_keys=', list(resp.json().keys()))

resp2 = client.get('/api/live-weather/458665')
print('status_live_weather=', resp2.status_code)
print('live_weather=', resp2.json())
