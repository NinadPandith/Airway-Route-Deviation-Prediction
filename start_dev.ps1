# start_dev.ps1
Write-Host "Starting Airway Route Deviation DEV Environment..." -ForegroundColor Green

# Define paths
$backendDir = Join-Path $PWD "backend"
$frontendDir = Join-Path $PWD "frontend"

# Start the backend in the background
Write-Host "Starting FastAPI Backend on port 8000..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    # Ensure uvicorn is available in the current context
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
} -ArgumentList $backendDir

# Wait a brief moment to ensure backend starts
Start-Sleep -Seconds 2

# Start the frontend in the background
Write-Host "Starting Vite Frontend on port 5173..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    npm run dev
} -ArgumentList $frontendDir

Write-Host ""
Write-Host "Both servers are running in the background." -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to stop both servers..." -ForegroundColor Red
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Job -Job $backendJob, $frontendJob
Remove-Job -Job $backendJob, $frontendJob
Write-Host "Servers stopped." -ForegroundColor Green
