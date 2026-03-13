"""
Delirium Infinite - Sessions API
Conversation session management with message history and memory.
"""

import time
import uuid
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter()

# ─── In-memory session store ─────────────────────────────
_sessions: dict[str, dict[str, Any]] = {}


def create_session(agent_name: str, agent_id: str = "") -> dict:
    """Create a new conversation session."""
    sid = str(uuid.uuid4())
    session = {
        "id": sid,
        "agent_name": agent_name,
        "agent_id": agent_id or sid,
        "messages": [],
        "message_count": 0,
        "created_at": time.time(),
        "updated_at": time.time(),
        "status": "active",
    }
    _sessions[sid] = session
    return session


def add_message(session_id: str, role: str, content: str) -> bool:
    """Add a message to a session."""
    if session_id not in _sessions:
        return False
    msg = {
        "id": str(uuid.uuid4()),
        "role": role,
        "content": content,
        "timestamp": time.time(),
    }
    _sessions[session_id]["messages"].append(msg)
    _sessions[session_id]["message_count"] += 1
    _sessions[session_id]["updated_at"] = time.time()
    return True


@router.get("/")
async def list_sessions(agent: str | None = None, limit: int = Query(50, le=500)) -> list:
    """List all sessions, optionally filtered by agent."""
    sessions = sorted(_sessions.values(), key=lambda s: -s["updated_at"])
    if agent:
        q = agent.lower()
        sessions = [s for s in sessions if q in s["agent_name"].lower()]
    return [
        {
            "id": s["id"],
            "agent_name": s["agent_name"],
            "message_count": s["message_count"],
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
            "status": s["status"],
        }
        for s in sessions[:limit]
    ]


@router.get("/{session_id}")
async def get_session(session_id: str) -> dict:
    """Get a session with full messages."""
    if session_id not in _sessions:
        return {"error": "Session not found"}
    return _sessions[session_id]


@router.delete("/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Delete a session."""
    if session_id in _sessions:
        del _sessions[session_id]
        return {"ok": True}
    return {"error": "Session not found"}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str) -> list:
    """Get messages for a session."""
    if session_id not in _sessions:
        return []
    return _sessions[session_id]["messages"]


@router.post("/{session_id}/messages")
async def post_message(session_id: str, body: dict) -> dict:
    """Add a message to a session."""
    ok = add_message(session_id, body.get("role", "user"), body.get("content", ""))
    return {"ok": ok}
