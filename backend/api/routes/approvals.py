"""
Delirium Infinite - Approvals API
Execution approval queue for sensitive agent actions.
"""

import time
import uuid
from typing import Any

from fastapi import APIRouter, Query

router = APIRouter()

# ─── In-memory approvals store ───────────────────────────
_approvals: list[dict[str, Any]] = []


def request_approval(
    agent_id: str,
    agent_name: str,
    action: str,
    description: str,
    risk_level: str = "medium",
) -> dict:
    """Request approval for a sensitive action."""
    approval = {
        "id": str(uuid.uuid4()),
        "agent_id": agent_id,
        "agent_name": agent_name,
        "action": action,
        "description": description,
        "risk_level": risk_level,
        "status": "pending",
        "requested_at": time.time(),
        "resolved_at": None,
        "resolved_by": None,
    }
    _approvals.append(approval)
    return approval


@router.get("/")
async def list_approvals(status: str | None = None) -> list:
    """List all approvals, optionally filtered by status."""
    result = sorted(_approvals, key=lambda a: -a["requested_at"])
    if status and status.lower() != "all":
        result = [a for a in result if a["status"] == status.lower()]
    return result


@router.get("/pending")
async def get_pending() -> list:
    """Get only pending approvals."""
    return [a for a in _approvals if a["status"] == "pending"]


@router.get("/{approval_id}")
async def get_approval(approval_id: str) -> dict:
    """Get a specific approval."""
    for a in _approvals:
        if a["id"] == approval_id:
            return a
    return {"error": "Approval not found"}


@router.post("/{approval_id}/approve")
async def approve(approval_id: str) -> dict:
    """Approve a pending request."""
    for a in _approvals:
        if a["id"] == approval_id and a["status"] == "pending":
            a["status"] = "approved"
            a["resolved_at"] = time.time()
            a["resolved_by"] = "admin"
            return {"ok": True, "approval": a}
    return {"error": "Approval not found or already resolved"}


@router.post("/{approval_id}/reject")
async def reject(approval_id: str) -> dict:
    """Reject a pending request."""
    for a in _approvals:
        if a["id"] == approval_id and a["status"] == "pending":
            a["status"] = "rejected"
            a["resolved_at"] = time.time()
            a["resolved_by"] = "admin"
            return {"ok": True, "approval": a}
    return {"error": "Approval not found or already resolved"}


@router.post("/request")
async def create_approval(body: dict) -> dict:
    """Create a new approval request."""
    approval = request_approval(
        agent_id=body.get("agent_id", ""),
        agent_name=body.get("agent_name", ""),
        action=body.get("action", ""),
        description=body.get("description", ""),
        risk_level=body.get("risk_level", "medium"),
    )
    return approval
