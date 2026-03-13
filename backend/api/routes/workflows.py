"""Workflows API — Visual workflow builder with drag-and-drop nodes."""

from __future__ import annotations

import time
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── In-memory workflows store ────────────────────────────
_workflows: list[dict] = [
    {
        "id": "wf-onboard",
        "name": "New User Onboarding",
        "description": "Welcome new users with a personalized onboarding flow",
        "status": "active",
        "trigger": {"type": "event", "event": "user.signup"},
        "nodes": [
            {"id": "n1", "type": "action", "action": "send_email", "config": {"template": "welcome"}},
            {"id": "n2", "type": "delay", "delay_seconds": 86400},
            {"id": "n3", "type": "condition", "condition": "user.completed_profile == false"},
            {"id": "n4", "type": "action", "action": "send_notification", "config": {"message": "Complete your profile!"}},
        ],
        "edges": [{"from": "n1", "to": "n2"}, {"from": "n2", "to": "n3"}, {"from": "n3", "to": "n4"}],
        "runs": 42,
        "last_run": time.time() - 3600,
        "created_at": time.time() - 86400 * 30,
    },
    {
        "id": "wf-lead",
        "name": "Lead Qualification Pipeline",
        "description": "Automatically qualify and route incoming leads",
        "status": "active",
        "trigger": {"type": "webhook", "path": "/webhooks/lead"},
        "nodes": [
            {"id": "n1", "type": "action", "action": "enrich_lead"},
            {"id": "n2", "type": "condition", "condition": "lead.score >= 0.7"},
            {"id": "n3", "type": "action", "action": "assign_to_sales"},
            {"id": "n4", "type": "action", "action": "add_to_nurture"},
        ],
        "edges": [{"from": "n1", "to": "n2"}, {"from": "n2", "to": "n3"}, {"from": "n2", "to": "n4"}],
        "runs": 156,
        "last_run": time.time() - 1800,
        "created_at": time.time() - 86400 * 14,
    },
    {
        "id": "wf-monitor",
        "name": "Website Monitor & Alert",
        "description": "Monitor websites for changes and send alerts",
        "status": "paused",
        "trigger": {"type": "schedule", "cron": "*/30 * * * *"},
        "nodes": [
            {"id": "n1", "type": "action", "action": "check_urls"},
            {"id": "n2", "type": "condition", "condition": "changes_detected == true"},
            {"id": "n3", "type": "action", "action": "send_alert", "config": {"channels": ["telegram", "email"]}},
        ],
        "edges": [{"from": "n1", "to": "n2"}, {"from": "n2", "to": "n3"}],
        "runs": 890,
        "last_run": time.time() - 7200,
        "created_at": time.time() - 86400 * 60,
    },
    {
        "id": "wf-content",
        "name": "Content Publishing Pipeline",
        "description": "Auto-publish content across social media channels",
        "status": "active",
        "trigger": {"type": "manual"},
        "nodes": [
            {"id": "n1", "type": "action", "action": "generate_content"},
            {"id": "n2", "type": "action", "action": "review_content"},
            {"id": "n3", "type": "action", "action": "publish_twitter"},
            {"id": "n4", "type": "action", "action": "publish_linkedin"},
            {"id": "n5", "type": "action", "action": "track_analytics"},
        ],
        "edges": [{"from": "n1", "to": "n2"}, {"from": "n2", "to": "n3"}, {"from": "n2", "to": "n4"}, {"from": "n3", "to": "n5"}, {"from": "n4", "to": "n5"}],
        "runs": 23,
        "last_run": time.time() - 43200,
        "created_at": time.time() - 86400 * 7,
    },
]


class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    trigger: dict = {"type": "manual"}
    nodes: list[dict] = []
    edges: list[dict] = []


class WorkflowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    trigger: dict | None = None
    nodes: list[dict] | None = None
    edges: list[dict] | None = None


@router.get("")
@router.get("/")
async def list_workflows():
    """List all workflows."""
    return {
        "workflows": _workflows,
        "total": len(_workflows),
        "active": sum(1 for w in _workflows if w["status"] == "active"),
        "total_runs": sum(w.get("runs", 0) for w in _workflows),
    }


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    for w in _workflows:
        if w["id"] == workflow_id:
            return w
    raise HTTPException(status_code=404, detail="Workflow not found")


@router.post("")
@router.post("/")
async def create_workflow(req: WorkflowCreate):
    wf = {
        "id": f"wf-{uuid.uuid4().hex[:8]}",
        "name": req.name,
        "description": req.description,
        "status": "paused",
        "trigger": req.trigger,
        "nodes": req.nodes,
        "edges": req.edges,
        "runs": 0,
        "last_run": None,
        "created_at": time.time(),
    }
    _workflows.append(wf)
    return wf


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, req: WorkflowUpdate):
    for w in _workflows:
        if w["id"] == workflow_id:
            if req.name is not None:
                w["name"] = req.name
            if req.description is not None:
                w["description"] = req.description
            if req.status is not None:
                w["status"] = req.status
            if req.trigger is not None:
                w["trigger"] = req.trigger
            if req.nodes is not None:
                w["nodes"] = req.nodes
            if req.edges is not None:
                w["edges"] = req.edges
            return w
    raise HTTPException(status_code=404, detail="Workflow not found")


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    for i, w in enumerate(_workflows):
        if w["id"] == workflow_id:
            _workflows.pop(i)
            return {"deleted": True}
    raise HTTPException(status_code=404, detail="Workflow not found")


@router.post("/{workflow_id}/run")
async def run_workflow(workflow_id: str):
    for w in _workflows:
        if w["id"] == workflow_id:
            w["runs"] = w.get("runs", 0) + 1
            w["last_run"] = time.time()
            return {"status": "running", "workflow_id": workflow_id, "run_number": w["runs"]}
    raise HTTPException(status_code=404, detail="Workflow not found")
