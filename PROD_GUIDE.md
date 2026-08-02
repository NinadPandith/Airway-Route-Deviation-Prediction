# Production Deployment Guide

This repository now supports a fully optimized, enterprise-grade production environment leveraging Docker Compose, Nginx, and Gunicorn.

## Architecture
- **Frontend:** A multi-stage Docker build statically compiles the React/Vite application. The static assets are then served by a lightweight Nginx container.
- **Backend:** The FastAPI application runs via Uvicorn workers managed by Gunicorn. This significantly improves concurrency and stability under load compared to the standard development server.
- **Networking:** Only port `80` is exposed to the host machine. Nginx automatically routes `/api` requests internally to the backend, completely bypassing CORS issues and ensuring a secure network perimeter.

## Starting Production
To build the optimized images and start the production environment in the background:

```powershell
docker compose -f docker-compose.prod.yml up --build -d
```
Access the application natively on `http://localhost/` (no port required).

## Stopping Production
To safely shut down the production environment:

```powershell
docker compose -f docker-compose.prod.yml down
```
*Note: The production database volume `prod_db_data` will be securely persisted across restarts.*
