import re
from sqlalchemy import create_engine, text
import os
DATABASE_URL=os.getenv('DATABASE_URL','sqlite:///./airway.db')
engine=create_engine(DATABASE_URL)
with engine.connect() as conn:
    rows=conn.execute(text('SELECT icao24,latitude,longitude FROM aircraft_telemetry LIMIT 20')).fetchall()
    bad=[]
    for r in rows:
        icao=str(r[0]) if r[0] is not None else ''
        lat=r[1]
        lon=r[2]
        ok_icao = bool(re.match(r'^[0-9A-Fa-f]{6}$', icao))
        bad.append({'icao':icao,'icao_ok':ok_icao,'lat':lat is not None,'lon':lon is not None})
    print(bad)
