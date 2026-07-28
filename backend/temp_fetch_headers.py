import requests
try:
    r = requests.get('http://127.0.0.1:8000/api/live-aircraft?refresh=false', timeout=10, headers={'Origin':'http://localhost:5173'})
    print('status', r.status_code)
    print('headers:', r.headers)
    print('body_snippet:', r.text[:200])
except Exception as e:
    print('error', e)
