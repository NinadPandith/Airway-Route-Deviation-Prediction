from sqlalchemy import create_engine, text
import os
DATABASE_URL=os.getenv('DATABASE_URL','sqlite:///./airway.db')
engine=create_engine(DATABASE_URL)
with engine.connect() as conn:
    res=conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"))
    tables=[r[0] for r in res.fetchall()]
    print('tables=',tables)
    for t in ['flights','aircraft_telemetry','weather_telemetry']:
        try:
            c=conn.execute(text(f'SELECT COUNT(*) FROM {t}')).scalar()
            print(f'{t}_count={c}')
        except Exception as e:
            print(f'{t}_count=ERR:{e}')
    # show latest aircraft row
    try:
        r=conn.execute(text('SELECT id,icao24,latitude,longitude,timestamp FROM aircraft_telemetry ORDER BY timestamp DESC LIMIT 1')).fetchone()
        print('latest_aircraft=',dict(r) if r else None)
    except Exception as e:
        print('latest_aircraft_err',e)
    try:
        r=conn.execute(text('SELECT id,aircraft_id,temperature,feels_like,humidity,pressure,wind_speed,wind_direction,visibility,cloud_coverage,rainfall,weather_description,timestamp FROM weather_telemetry ORDER BY timestamp DESC LIMIT 1')).fetchone()
        print('latest_weather=',dict(r) if r else None)
    except Exception as e:
        print('latest_weather_err',e)
