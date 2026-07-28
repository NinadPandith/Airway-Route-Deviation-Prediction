import requests
import json
base='http://127.0.0.1:8000'
results={}

def check_get(path):
    try:
        r=requests.get(base+path, timeout=10)
        return (r.status_code, r.headers.get('content-type',''), r.text[:200])
    except Exception as e:
        return ('ERR',str(e),'')

# 1 root
results['/']=check_get('/')
results['/api/health']=check_get('/api/health')
results['/api/flights']=check_get('/api/flights')
# POST create flight
try:
    payload={
        "flight_number":"TST-1",
        "aircraft_name":"TestJet",
        "latitude":10.0,
        "longitude":20.0,
        "altitude":30000.0,
        "speed":450.0,
        "heading":90.0,
        "origin":"AAA",
        "destination":"BBB",
        "status":"Scheduled"
    }
    r=requests.post(base+'/api/flights',json=payload,timeout=10)
    results['POST /api/flights']=(r.status_code, r.text[:200])
    created_id=None
    if r.status_code==201:
        created_id=r.json().get('id')
        results['created_id']=created_id
        # PUT update
        up={'status':'In Flight'}
        r2=requests.put(base+f'/api/flights/{created_id}', json=up, timeout=10)
        results['PUT /api/flights/{id}']=(r2.status_code, r2.text[:200])
        # DELETE
        r3=requests.delete(base+f'/api/flights/{created_id}', timeout=10)
        results['DELETE /api/flights/{id}']=(r3.status_code, r3.text[:200])
    else:
        results['POST_error']=r.text
except Exception as e:
    results['POST_exception']=str(e)

# Live APIs
results['/api/live-aircraft']=check_get('/api/live-aircraft?refresh=false')
results['/api/live-weather']=check_get('/api/live-weather/458665')
results['/api/live-dashboard']=check_get('/api/live-dashboard')
results['/api/history']=check_get('/api/history')

print(json.dumps(results, indent=2))
