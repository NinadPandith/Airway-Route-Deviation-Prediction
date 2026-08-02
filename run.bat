@echo off
TITLE Airway Radar - Dev Servers
echo =======================================================
echo    Starting Airway Route Deviation Prediction System
echo =======================================================
echo.

echo [1/2] Starting FastAPI Backend on Port 8000...
start "FastAPI Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"

echo [2/2] Starting Vite Frontend on Port 5173...
start "Vite Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo All services have been launched in separate windows!
echo.
echo - Frontend URL: http://localhost:5173/
echo - Backend API:  http://localhost:8000/
echo.

echo Waiting for FastAPI backend to start before fetching initial telemetry...
timeout /t 3 /nobreak > NUL
echo Fetching live telemetry so the dashboard is online...
curl -s http://127.0.0.1:8000/api/live-aircraft?refresh=true > NUL
echo.

echo To stop the servers, simply close the two command windows that just opened.
echo.
pause
