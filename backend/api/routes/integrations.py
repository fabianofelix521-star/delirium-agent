"""Integrations API Route - External service connections."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

_integrations: list[dict] = [
    {"id": "gmail", "name": "Gmail", "icon": "📧", "description": "Send and receive emails",
     "status": "disconnected", "config": {}},
    {"id": "whatsapp", "name": "WhatsApp", "icon": "💬", "description": "Send and receive WhatsApp messages",
     "status": "disconnected", "config": {}},
    {"id": "telegram", "name": "Telegram", "icon": "✈️", "description": "Telegram bot integration",
     "status": "disconnected", "config": {}},
    {"id": "gdrive", "name": "Google Drive", "icon": "📁", "description": "File storage and sharing",
     "status": "disconnected", "config": {}},
    {"id": "notion", "name": "Notion", "icon": "📝", "description": "Notion workspace integration",
     "status": "disconnected", "config": {}},
    {"id": "calendar", "name": "Google Calendar", "icon": "📅", "description": "Calendar management",
     "status": "disconnected", "config": {}},
    {"id": "binance", "name": "Binance", "icon": "📈", "description": "Crypto trading",
     "status": "disconnected", "config": {}},
    {"id": "icloud", "name": "iCloud", "icon": "☁️", "description": "Apple iCloud sync",
     "status": "disconnected", "config": {}},
]


class ConnectRequest(BaseModel):
    config: dict = {}


@router.get("")
@router.get("/")
async def list_integrations() -> list[dict]:
    """List all available integrations."""
    return _integrations


@router.get("/{integration_id}")
async def get_integration(integration_id: str) -> dict:
    """Get details for a specific integration."""
    for i in _integrations:
        if i["id"] == integration_id:
            return i
    return {"error": "Integration not found"}


@router.post("/{integration_id}/connect")
async def connect_integration(integration_id: str, request: ConnectRequest) -> dict:
    """Connect an integration."""
    for i in _integrations:
        if i["id"] == integration_id:
            i["status"] = "connected"
            i["config"].update(request.config)
            return {"id": integration_id, "status": "connected"}
    return {"error": "Integration not found"}


@router.post("/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str) -> dict:
    """Disconnect an integration."""
    for i in _integrations:
        if i["id"] == integration_id:
            i["status"] = "disconnected"
            return {"id": integration_id, "status": "disconnected"}
    return {"error": "Integration not found"}
