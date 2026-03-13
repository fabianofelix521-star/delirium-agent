"""Scheduler API — Cron-based task scheduling."""

from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── In-memory scheduled tasks ───────────────────────────
_tasks: list[dict] = [
    {
        "id": "task-daily-digest",
        "name": "Daily Research Digest",
        "description": "Compile and deliver a daily digest of research topics",
        "cron": "0 8 * * *",
        "agent_id": "researcher",
        "action": "research_digest",
        "config": {"topics": ["AI", "crypto", "startups"], "channels": ["email"]},
        "status": "active",
        "runs": 30,
        "last_run": time.time() - 3600,
        "next_run": time.time() + 82800,
        "created_at": time.time() - 86400 * 30,
    },
    {
        "id": "task-lead-gen",
        "name": "Weekly Lead Generation",
        "description": "Generate new leads every Monday morning",
        "cron": "0 9 * * 1",
        "agent_id": "lead",
        "action": "generate_leads",
        "config": {"icp": "SaaS companies, 10-200 employees", "max_leads": 50},
        "status": "active",
        "runs": 8,
        "last_run": time.time() - 86400 * 3,
        "next_run": time.time() + 86400 * 4,
        "created_at": time.time() - 86400 * 60,
    },
    {
        "id": "task-monitor",
        "name": "Competitor Price Monitor",
        "description": "Check competitor pricing pages every 6 hours",
        "cron": "0 */6 * * *",
        "agent_id": "collector",
        "action": "monitor_prices",
        "config": {"urls": ["https://competitor1.com/pricing", "https://competitor2.com/pricing"]},
        "status": "active",
        "runs": 240,
        "last_run": time.time() - 7200,
        "next_run": time.time() + 14400,
        "created_at": time.time() - 86400 * 90,
    },
    {
        "id": "task-social",
        "name": "Social Media Auto-Post",
        "description": "Post curated content 3x daily on Twitter and LinkedIn",
        "cron": "0 9,13,18 * * *",
        "agent_id": "twitter",
        "action": "auto_post",
        "config": {"platforms": ["twitter", "linkedin"], "content_type": "curated"},
        "status": "paused",
        "runs": 45,
        "last_run": time.time() - 86400,
        "next_run": None,
        "created_at": time.time() - 86400 * 15,
    },
    {
        "id": "task-backup",
        "name": "Memory Backup",
        "description": "Export and backup agent memory daily",
        "cron": "0 2 * * *",
        "agent_id": "assistant",
        "action": "backup_memory",
        "config": {"format": "json", "destination": "local"},
        "status": "active",
        "runs": 60,
        "last_run": time.time() - 28800,
        "next_run": time.time() + 57600,
        "created_at": time.time() - 86400 * 60,
    },
]


class TaskCreate(BaseModel):
    name: str
    description: str = ""
    cron: str = "0 * * * *"
    agent_id: str = "assistant"
    action: str = ""
    config: dict = {}


class TaskUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    cron: str | None = None
    status: str | None = None
    agent_id: str | None = None
    action: str | None = None
    config: dict | None = None


@router.get("/")
async def list_tasks():
    """List all scheduled tasks."""
    return {
        "tasks": _tasks,
        "total": len(_tasks),
        "active": sum(1 for t in _tasks if t["status"] == "active"),
        "total_runs": sum(t.get("runs", 0) for t in _tasks),
    }


@router.get("/{task_id}")
async def get_task(task_id: str):
    for t in _tasks:
        if t["id"] == task_id:
            return t
    raise HTTPException(status_code=404, detail="Task not found")


@router.post("/")
async def create_task(req: TaskCreate):
    task = {
        "id": f"task-{uuid.uuid4().hex[:8]}",
        "name": req.name,
        "description": req.description,
        "cron": req.cron,
        "agent_id": req.agent_id,
        "action": req.action,
        "config": req.config,
        "status": "paused",
        "runs": 0,
        "last_run": None,
        "next_run": None,
        "created_at": time.time(),
    }
    _tasks.append(task)
    return task


@router.put("/{task_id}")
async def update_task(task_id: str, req: TaskUpdate):
    for t in _tasks:
        if t["id"] == task_id:
            if req.name is not None:
                t["name"] = req.name
            if req.description is not None:
                t["description"] = req.description
            if req.cron is not None:
                t["cron"] = req.cron
            if req.status is not None:
                t["status"] = req.status
            if req.agent_id is not None:
                t["agent_id"] = req.agent_id
            if req.action is not None:
                t["action"] = req.action
            if req.config is not None:
                t["config"] = req.config
            return t
    raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    for i, t in enumerate(_tasks):
        if t["id"] == task_id:
            _tasks.pop(i)
            return {"deleted": True}
    raise HTTPException(status_code=404, detail="Task not found")


@router.post("/{task_id}/run")
async def run_task(task_id: str):
    for t in _tasks:
        if t["id"] == task_id:
            t["runs"] = t.get("runs", 0) + 1
            t["last_run"] = time.time()
            return {"status": "running", "task_id": task_id, "run_number": t["runs"]}
    raise HTTPException(status_code=404, detail="Task not found")
