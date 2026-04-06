FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Build frontend
COPY frontend/package.json frontend/package-lock.json frontend/
RUN cd frontend && npm ci

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy backend (includes pre-computed data)
COPY backend/ backend/

# Expose port (HF Spaces uses 7860)
EXPOSE 7860

# Start Flask
CMD ["gunicorn", "--chdir", "backend", "app:app", "--bind", "0.0.0.0:7860", "--timeout", "120", "--workers", "1"]
