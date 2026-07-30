FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose FastAPI default port
EXPOSE 8000

# Run Uvicorn server, binding to 0.0.0.0 is critical for Docker container networking
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
