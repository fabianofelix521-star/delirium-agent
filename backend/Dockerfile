# ═══════════════════════════════════════════════════════════
# Backend Dockerfile - Delirium Infinite
# ═══════════════════════════════════════════════════════════
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN groupadd -r delirium && useradd -r -g delirium -d /home/delirium -m delirium && \
    mkdir -p /app/data /app/data/workspace && chown -R delirium:delirium /app /home/delirium

USER delirium

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
