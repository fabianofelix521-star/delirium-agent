"""Tools API Route - Tool management (connected to real executor registry)."""

from fastapi import APIRouter
from pydantic import BaseModel
from tools.executor import TOOLS

router = APIRouter()

# Map real tools to display categories + icons
_TOOL_META: dict[str, dict] = {
    "shell": {"category": "system", "icon": "🖥️"},
    "python": {"category": "code", "icon": "🐍"},
    "web_search": {"category": "web", "icon": "🔍"},
    "web_browse": {"category": "web", "icon": "🌐"},
    "read_file": {"category": "file", "icon": "📄"},
    "write_file": {"category": "file", "icon": "✏️"},
    "list_files": {"category": "file", "icon": "📁"},
    "edit_file": {"category": "file", "icon": "🔧"},
    "search_files": {"category": "file", "icon": "🔎"},
    "git": {"category": "code", "icon": "📦"},
    "supabase_query": {"category": "database", "icon": "🗄️"},
    "supabase_rpc": {"category": "database", "icon": "⚡"},
    "supabase_storage": {"category": "database", "icon": "💾"},
    "github_repos": {"category": "github", "icon": "🐙"},
    "github_create_repo": {"category": "github", "icon": "➕"},
    "github_read_file": {"category": "github", "icon": "📖"},
    "github_issues": {"category": "github", "icon": "🎫"},
    "github_create_issue": {"category": "github", "icon": "🆕"},
    "http_request": {"category": "web", "icon": "🌍"},
    "install_package": {"category": "system", "icon": "📦"},
    "create_project": {"category": "code", "icon": "🚀"},
    "scrape_design": {"category": "design", "icon": "🎨"},
    "generate_ui_component": {"category": "design", "icon": "🧩"},
}


class ToolToggle(BaseModel):
    enabled: bool


@router.get("")
@router.get("/")
async def list_tools(category: str | None = None) -> list[dict]:
    """List all available tools from the real executor registry."""
    tools_list = []
    for name, info in TOOLS.items():
        meta = _TOOL_META.get(name, {"category": "other", "icon": "🔧"})
        tool_data = {
            "id": name,
            "name": name.replace("_", " ").title(),
            "description": info["description"],
            "category": meta["category"],
            "icon": meta["icon"],
            "enabled": name not in _disabled_tools,
            "parameters": info["parameters"],
        }
        if category and tool_data["category"] != category:
            continue
        tools_list.append(tool_data)
    return tools_list


@router.get("/categories/list")
async def list_categories() -> list[str]:
    """List all tool categories."""
    cats = set()
    for name in TOOLS:
        meta = _TOOL_META.get(name, {"category": "other"})
        cats.add(meta["category"])
    return sorted(cats)


@router.get("/{tool_id}")
async def get_tool(tool_id: str) -> dict:
    """Get details for a specific tool."""
    if tool_id not in TOOLS:
        return {"error": "Tool not found"}
    info = TOOLS[tool_id]
    meta = _TOOL_META.get(tool_id, {"category": "other", "icon": "🔧"})
    return {
        "id": tool_id,
        "name": tool_id.replace("_", " ").title(),
        "description": info["description"],
        "category": meta["category"],
        "icon": meta["icon"],
        "enabled": tool_id not in _disabled_tools,
        "parameters": info["parameters"],
    }


# In-memory set of disabled tools
_disabled_tools: set[str] = set()


@router.put("/{tool_id}/toggle")
async def toggle_tool(tool_id: str, body: ToolToggle) -> dict:
    """Enable or disable a tool."""
    if tool_id not in TOOLS:
        return {"error": "Tool not found"}
    if body.enabled:
        _disabled_tools.discard(tool_id)
    else:
        _disabled_tools.add(tool_id)
    return {"id": tool_id, "enabled": body.enabled}
