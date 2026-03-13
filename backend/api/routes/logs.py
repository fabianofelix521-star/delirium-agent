"""
Delirium Infinite - Logs API
Live logging, audit trail, log search and export.
"""

import time
import uuid
from enum import Enum
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter()


class LogLevel(str, Enum):
    INFO = "INFO"
    WARN = "WARN"
    ERROR = "ERROR"
    DEBUG = "DEBUG"


# ─── In-memory log store ─────────────────────────────────
_logs: list[dict[str, Any]] = []
_audit_trail: list[dict[str, Any]] = []


def add_log(level: str, message: str, source: str = "system", meta: dict | None = None) -> None:
    """Add a log entry."""
    _logs.append({
        "id": str(uuid.uuid4()),
        "level": level.upper(),
        "message": message,
        "source": source,
        "meta": meta or {},
        "timestamp": time.time(),
    })
    if len(_logs) > 5000:
        _logs.pop(0)


def add_audit(action: str, entity: str, entity_id: str = "", details: str = "", user: str = "system") -> None:
    """Add an audit trail entry."""
    _audit_trail.append({
        "id": str(uuid.uuid4()),
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "details": details,
        "user": user,
        "timestamp": time.time(),
    })
    if len(_audit_trail) > 5000:
        _audit_trail.pop(0)


# Seed some initial logs
add_log("INFO", "Delirium Infinite started", "core")
add_log("INFO", "CORS middleware configured", "middleware")
add_log("INFO", "All API routes registered", "router")
add_log("INFO", "Security systems initialized", "security")


@router.get("")
@router.get("/")
async def get_logs(
    level: str | None = None,
    search: str | None = None,
    limit: int = Query(100, le=1000),
) -> list:
    """Get logs with optional filtering."""
    result = _logs[::-1]

    if level and level.upper() != "ALL":
        result = [l for l in result if l["level"] == level.upper()]

    if search:
        q = search.lower()
        result = [l for l in result if q in l["message"].lower() or q in l["source"].lower()]

    return result[:limit]


@router.get("/audit")
async def get_audit_trail(limit: int = Query(100, le=1000)) -> list:
    """Get audit trail events."""
    return _audit_trail[-limit:][::-1]


@router.post("")
@router.post("/")
async def post_log(body: dict) -> dict:
    """Add a log entry."""
    add_log(
        level=body.get("level", "INFO"),
        message=body.get("message", ""),
        source=body.get("source", "api"),
        meta=body.get("meta"),
    )
    return {"ok": True}


@router.delete("")
@router.delete("/")
async def clear_logs() -> dict:
    """Clear all logs."""
    _logs.clear()
    return {"ok": True, "cleared": True}


@router.get("/export")
async def export_logs() -> dict:
    """Export all logs and audit trail."""
    return {
        "logs": _logs,
        "audit_trail": _audit_trail,
        "exported_at": time.time(),
    }
