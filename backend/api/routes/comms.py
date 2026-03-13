"""
Delirium Infinite - Comms API
Agent-to-agent communication, message bus, task posting.
"""

import time
import uuid
from typing import Any

from fastapi import APIRouter

router = APIRouter()

# ─── In-memory comms store ───────────────────────────────
_messages: list[dict[str, Any]] = []
_tasks: list[dict[str, Any]] = []


@router.get("/messages")
async def list_messages(limit: int = 50) -> list:
    """List agent communication messages."""
    return sorted(_messages, key=lambda m: -m["timestamp"])[:limit]


@router.post("/messages")
async def send_message(body: dict) -> dict:
    """Send a message between agents."""
    msg = {
        "id": str(uuid.uuid4()),
        "from_agent": body.get("from_agent", "system"),
        "to_agent": body.get("to_agent", "all"),
        "subject": body.get("subject", ""),
        "content": body.get("content", ""),
        "priority": body.get("priority", "normal"),
        "status": "delivered",
        "timestamp": time.time(),
    }
    _messages.append(msg)
    if len(_messages) > 1000:
        _messages.pop(0)
    return msg


@router.get("/tasks")
async def list_tasks(status: str | None = None) -> list:
    """List posted tasks."""
    result = sorted(_tasks, key=lambda t: -t["created_at"])
    if status:
        result = [t for t in result if t["status"] == status]
    return result


@router.post("/tasks")
async def post_task(body: dict) -> dict:
    """Post a task to the agent task queue."""
    task = {
        "id": str(uuid.uuid4()),
        "title": body.get("title", ""),
        "description": body.get("description", ""),
        "assigned_to": body.get("assigned_to", ""),
        "priority": body.get("priority", "normal"),
        "status": "pending",
        "created_at": time.time(),
        "completed_at": None,
    }
    _tasks.append(task)
    return task


@router.post("/tasks/{task_id}/complete")
async def complete_task(task_id: str) -> dict:
    """Mark a task as completed."""
    for t in _tasks:
        if t["id"] == task_id:
            t["status"] = "completed"
            t["completed_at"] = time.time()
            return {"ok": True, "task": t}
    return {"error": "Task not found"}


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str) -> dict:
    """Delete a task."""
    for i, t in enumerate(_tasks):
        if t["id"] == task_id:
            _tasks.pop(i)
            return {"ok": True}
    return {"error": "Task not found"}


@router.get("/stats")
async def get_stats() -> dict:
    """Get communication stats."""
    return {
        "total_messages": len(_messages),
        "total_tasks": len(_tasks),
        "pending_tasks": sum(1 for t in _tasks if t["status"] == "pending"),
        "completed_tasks": sum(1 for t in _tasks if t["status"] == "completed"),
    }
