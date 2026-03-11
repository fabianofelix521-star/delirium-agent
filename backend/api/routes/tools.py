"""Tools API Route - Tool management and execution."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Built-in tools registry
_tools: list[dict] = [
    {"id": "code_exec", "name": "Code Execution", "description": "Execute Python, Node.js, or Bash code",
     "category": "code", "icon": "⚡", "enabled": True},
    {"id": "web_browse", "name": "Web Browser", "description": "Browse and scrape web pages",
     "category": "web", "icon": "🌐", "enabled": True},
    {"id": "file_ops", "name": "File Operations", "description": "Read, write, list, and search files",
     "category": "file", "icon": "📁", "enabled": True},
    {"id": "shell", "name": "Shell Commands", "description": "Execute system shell commands",
     "category": "system", "icon": "🖥️", "enabled": True},
    {"id": "web_search", "name": "Web Search", "description": "Search the web for information",
     "category": "web", "icon": "🔍", "enabled": True},
    {"id": "git_ops", "name": "Git Operations", "description": "Git clone, commit, push, pull",
     "category": "code", "icon": "📦", "enabled": True},
    {"id": "screenshot", "name": "Screenshot", "description": "Capture screen and OCR text",
     "category": "system", "icon": "📸", "enabled": False},
    {"id": "send_email", "name": "Email", "description": "Send and read emails via Gmail",
     "category": "communication", "icon": "📧", "enabled": False},
    {"id": "whatsapp", "name": "WhatsApp", "description": "Send and receive WhatsApp messages",
     "category": "communication", "icon": "💬", "enabled": False},
    {"id": "telegram", "name": "Telegram", "description": "Send messages via Telegram bot",
     "category": "communication", "icon": "✈️", "enabled": False},
    {"id": "pix", "name": "Pix Payment", "description": "Send Pix payments",
     "category": "finance", "icon": "💰", "enabled": False},
    {"id": "binance", "name": "Binance Trading", "description": "Trade crypto on Binance",
     "category": "finance", "icon": "📈", "enabled": False},
]

_tool_logs: list[dict] = []


class ToolToggle(BaseModel):
    enabled: bool


@router.get("/")
async def list_tools(category: str | None = None) -> list[dict]:
    """List all available tools, optionally filtered by category."""
    if category:
        return [t for t in _tools if t["category"] == category]
    return _tools


@router.get("/{tool_id}")
async def get_tool(tool_id: str) -> dict:
    """Get details for a specific tool."""
    for t in _tools:
        if t["id"] == tool_id:
            return t
    return {"error": "Tool not found"}


@router.put("/{tool_id}/toggle")
async def toggle_tool(tool_id: str, toggle: ToolToggle) -> dict:
    """Enable or disable a tool."""
    for t in _tools:
        if t["id"] == tool_id:
            t["enabled"] = toggle.enabled
            return {"id": tool_id, "enabled": toggle.enabled}
    return {"error": "Tool not found"}


@router.get("/{tool_id}/logs")
async def get_tool_logs(tool_id: str) -> list[dict]:
    """Get execution logs for a tool."""
    return [log for log in _tool_logs if log.get("tool_id") == tool_id][-100:]


@router.get("/categories/list")
async def list_categories() -> list[str]:
    """List all tool categories."""
    return list(set(t["category"] for t in _tools))
