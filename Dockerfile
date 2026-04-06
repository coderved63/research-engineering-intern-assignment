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

# Copy backend code and small data files
COPY backend/ backend/
COPY data.jsonl .

# Generate large data files during build (avoids LFS requirement)
RUN cd backend && python pipeline/ingest.py
RUN cd backend && python pipeline/embed.py
RUN cd backend && python pipeline/reduce_dims.py
RUN cd backend && python pipeline/build_graph.py
RUN cd backend && python pipeline/cluster.py

# Expose port (HF Spaces uses 7860)
EXPOSE 7860

# Start Flask
CMD ["gunicorn", "--chdir", "backend", "app:app", "--bind", "0.0.0.0:7860", "--timeout", "120", "--workers", "1"]
