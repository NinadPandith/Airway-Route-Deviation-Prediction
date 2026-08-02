# QA / UAT Deployment Guide

The QA environment is designed to mirror production more closely than the local DEV setup, while allowing you to test features independently without impacting your DEV database or ports.

## Differences from DEV
1. **Ports:** 
   - QA Frontend runs on `http://localhost:5174`
   - QA Backend API runs on `http://localhost:8001/api`
2. **Database:** QA uses a separate Docker volume (`qa_db_data`) so that tests don't corrupt your local `airway.db`.
3. **Execution:** QA uses standard Docker images without host volume mounting for source code. This mimics production behavior, meaning changes to the source code require a rebuild of the QA containers.
4. **Environment:** Runs with `DEBUG=False` and `ENVIRONMENT=qa`.

## Starting the QA Environment

To start the QA environment, ensure Docker is running and execute:

```powershell
docker compose -f docker-compose.qa.yml up --build -d
```

## Stopping the QA Environment

To stop the containers and free up the ports:

```powershell
docker compose -f docker-compose.qa.yml down
```

*Note: The QA database volume will persist even if you run `down`. To completely wipe the QA database, run `docker compose -f docker-compose.qa.yml down -v`.*
