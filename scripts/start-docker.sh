#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Delirium Infinite - Docker Compose Startup Script
# Ensures Docker Desktop is running, then starts all services
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$HOME/Library/Logs/Delirium"
mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_DIR/startup.log"
}

log "=== Delirium startup initiated ==="

# ─── 1. Ensure Docker Desktop is running ─────────────────
if ! /usr/local/bin/docker info &>/dev/null; then
  log "Docker daemon not running. Starting Docker Desktop..."
  open -a Docker
  
  # Wait up to 120 seconds for Docker daemon
  RETRIES=0
  MAX_RETRIES=60
  while ! /usr/local/bin/docker info &>/dev/null; do
    RETRIES=$((RETRIES + 1))
    if [ "$RETRIES" -ge "$MAX_RETRIES" ]; then
      log "ERROR: Docker daemon failed to start after ${MAX_RETRIES}x2 seconds"
      exit 1
    fi
    sleep 2
  done
  log "Docker daemon is ready (waited ~$((RETRIES * 2))s)"
else
  log "Docker daemon already running"
fi

# ─── 2. Start services with Docker Compose ───────────────
cd "$PROJECT_DIR"
log "Starting docker compose in $PROJECT_DIR..."

/usr/local/bin/docker compose up -d 2>&1 | tee -a "$LOG_DIR/startup.log"

log "=== Delirium startup complete ==="
log "Backend:  http://localhost:8000"
log "Frontend: http://localhost:3000"
