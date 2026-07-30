# DEV_GUIDE.md

## Running the Development Environment

To start both the React frontend and the FastAPI backend concurrently with hot-reloading enabled, run the following script from the root of the project:

```powershell
.\start_dev.ps1
```

This script will:
1. Start the FastAPI backend on `http://127.0.0.1:8000`
2. Start the Vite React frontend on `http://localhost:5173`

Both servers will run in the background within the current PowerShell session. If you edit any Python or React files, the respective servers will automatically reload.

## Stopping the Environment
Press `Ctrl + C` in the terminal where you ran the script to terminate both servers.
