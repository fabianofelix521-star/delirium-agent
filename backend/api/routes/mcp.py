"""MCP Marketplace API - Browse, install, and manage MCP servers."""

import json
import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# Persistent storage
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_MCP_FILE = _DATA_DIR / "mcp_installed.json"


def _load_installed() -> dict:
    if _MCP_FILE.exists():
        return json.loads(_MCP_FILE.read_text())
    return {}


def _save_installed(data: dict):
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _MCP_FILE.write_text(json.dumps(data, indent=2))


# ─── MCP Marketplace Catalog ─────────────────────────────

MCP_CATALOG = [
    {
        "id": "filesystem",
        "name": "Filesystem",
        "description": "Read, write, and manage files and directories on the local system",
        "author": "Anthropic",
        "category": "system",
        "icon": "📁",
        "stars": 4800,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users"],
        "env": {},
        "featured": True,
    },
    {
        "id": "github",
        "name": "GitHub",
        "description": "Manage repositories, issues, PRs, branches, and code search via GitHub API",
        "author": "Anthropic",
        "category": "developer",
        "icon": "🐙",
        "stars": 5200,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": ""},
        "featured": True,
    },
    {
        "id": "postgres",
        "name": "PostgreSQL",
        "description": "Query and manage PostgreSQL databases with read-only or read-write access",
        "author": "Anthropic",
        "category": "database",
        "icon": "🐘",
        "stars": 3200,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-postgres"],
        "env": {"POSTGRES_CONNECTION_STRING": ""},
        "featured": True,
    },
    {
        "id": "brave-search",
        "name": "Brave Search",
        "description": "Web and local search using the Brave Search API",
        "author": "Anthropic",
        "category": "search",
        "icon": "🦁",
        "stars": 3800,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {"BRAVE_API_KEY": ""},
        "featured": True,
    },
    {
        "id": "puppeteer",
        "name": "Puppeteer",
        "description": "Browser automation - navigate pages, take screenshots, fill forms, execute JS",
        "author": "Anthropic",
        "category": "browser",
        "icon": "🎭",
        "stars": 4100,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
        "env": {},
        "featured": True,
    },
    {
        "id": "memory",
        "name": "Memory",
        "description": "Persistent memory using a knowledge graph for long-term context",
        "author": "Anthropic",
        "category": "system",
        "icon": "🧠",
        "stars": 3600,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"],
        "env": {},
        "featured": False,
    },
    {
        "id": "fetch",
        "name": "Fetch",
        "description": "Fetch and extract content from any URL - HTML, JSON, plain text",
        "author": "Anthropic",
        "category": "search",
        "icon": "🌐",
        "stars": 2900,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-fetch"],
        "env": {},
        "featured": False,
    },
    {
        "id": "slack",
        "name": "Slack",
        "description": "Read and send messages, manage channels in Slack workspaces",
        "author": "Anthropic",
        "category": "communication",
        "icon": "💬",
        "stars": 2800,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-slack"],
        "env": {"SLACK_BOT_TOKEN": "", "SLACK_TEAM_ID": ""},
        "featured": False,
    },
    {
        "id": "google-drive",
        "name": "Google Drive",
        "description": "Search and read files from Google Drive with OAuth authentication",
        "author": "Anthropic",
        "category": "productivity",
        "icon": "📂",
        "stars": 2500,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-gdrive"],
        "env": {},
        "featured": False,
    },
    {
        "id": "google-maps",
        "name": "Google Maps",
        "description": "Location search, directions, place details, and distance calculations",
        "author": "Anthropic",
        "category": "search",
        "icon": "🗺️",
        "stars": 2200,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-google-maps"],
        "env": {"GOOGLE_MAPS_API_KEY": ""},
        "featured": False,
    },
    {
        "id": "sqlite",
        "name": "SQLite",
        "description": "Query and analyze SQLite databases with business intelligence features",
        "author": "Anthropic",
        "category": "database",
        "icon": "🗄️",
        "stars": 2100,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sqlite"],
        "env": {},
        "featured": False,
    },
    {
        "id": "sequential-thinking",
        "name": "Sequential Thinking",
        "description": "Dynamic problem-solving through structured thought sequences and revision",
        "author": "Anthropic",
        "category": "reasoning",
        "icon": "💭",
        "stars": 3100,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
        "env": {},
        "featured": True,
    },
    {
        "id": "redis",
        "name": "Redis",
        "description": "Interact with Redis key-value store, pub/sub, and data structures",
        "author": "Community",
        "category": "database",
        "icon": "🔴",
        "stars": 1800,
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-redis"],
        "env": {"REDIS_URL": "redis://localhost:6379"},
        "featured": False,
    },
    {
        "id": "docker",
        "name": "Docker",
        "description": "Manage Docker containers, images, volumes, and networks",
        "author": "Community",
        "category": "developer",
        "icon": "🐳",
        "stars": 2400,
        "command": "npx",
        "args": ["-y", "mcp-server-docker"],
        "env": {},
        "featured": False,
    },
    {
        "id": "notion",
        "name": "Notion",
        "description": "Search, read, and update Notion pages, databases, and blocks",
        "author": "Community",
        "category": "productivity",
        "icon": "📝",
        "stars": 2000,
        "command": "npx",
        "args": ["-y", "mcp-server-notion"],
        "env": {"NOTION_API_KEY": ""},
        "featured": False,
    },
    {
        "id": "supabase",
        "name": "Supabase",
        "description": "Manage Supabase projects — database, auth, storage, edge functions",
        "author": "Supabase",
        "category": "database",
        "icon": "⚡",
        "stars": 2600,
        "command": "npx",
        "args": ["-y", "mcp-server-supabase"],
        "env": {"SUPABASE_URL": "", "SUPABASE_SERVICE_KEY": ""},
        "featured": True,
    },
    {
        "id": "stripe",
        "name": "Stripe",
        "description": "Manage payments, subscriptions, customers, and invoices via Stripe API",
        "author": "Community",
        "category": "finance",
        "icon": "💳",
        "stars": 1500,
        "command": "npx",
        "args": ["-y", "mcp-server-stripe"],
        "env": {"STRIPE_SECRET_KEY": ""},
        "featured": False,
    },
    {
        "id": "vercel",
        "name": "Vercel",
        "description": "Deploy and manage Vercel projects, domains, and serverless functions",
        "author": "Community",
        "category": "developer",
        "icon": "▲",
        "stars": 1900,
        "command": "npx",
        "args": ["-y", "mcp-server-vercel"],
        "env": {"VERCEL_TOKEN": ""},
        "featured": False,
    },
    {
        "id": "linear",
        "name": "Linear",
        "description": "Manage issues, projects, and team workflows in Linear",
        "author": "Community",
        "category": "productivity",
        "icon": "📐",
        "stars": 1600,
        "command": "npx",
        "args": ["-y", "mcp-server-linear"],
        "env": {"LINEAR_API_KEY": ""},
        "featured": False,
    },
    {
        "id": "figma",
        "name": "Figma",
        "description": "Read Figma designs, extract components, styles, and layout information",
        "author": "Community",
        "category": "design",
        "icon": "🎨",
        "stars": 2300,
        "command": "npx",
        "args": ["-y", "mcp-server-figma"],
        "env": {"FIGMA_ACCESS_TOKEN": ""},
        "featured": False,
    },
]


class InstallRequest(BaseModel):
    env: dict = {}


class ConfigUpdateRequest(BaseModel):
    env: dict = {}


@router.get("/catalog")
async def get_catalog() -> list[dict]:
    """Get the full MCP marketplace catalog."""
    installed = _load_installed()
    catalog = []
    for mcp in MCP_CATALOG:
        item = {**mcp}
        item["installed"] = mcp["id"] in installed
        if mcp["id"] in installed:
            item["config"] = installed[mcp["id"]].get("env", {})
        catalog.append(item)
    return catalog


@router.get("/installed")
async def get_installed() -> list[dict]:
    """Get all installed MCP servers."""
    installed = _load_installed()
    result = []
    for mcp in MCP_CATALOG:
        if mcp["id"] in installed:
            item = {**mcp, **installed[mcp["id"]], "installed": True}
            result.append(item)
    # Include custom MCPs
    for mcp_id, data in installed.items():
        if not any(m["id"] == mcp_id for m in MCP_CATALOG):
            result.append({**data, "id": mcp_id, "installed": True})
    return result


@router.post("/{mcp_id}/install")
async def install_mcp(mcp_id: str, request: InstallRequest) -> dict:
    """Install an MCP server."""
    mcp = next((m for m in MCP_CATALOG if m["id"] == mcp_id), None)
    if not mcp:
        return {"error": "MCP not found in catalog"}
    installed = _load_installed()
    installed[mcp_id] = {
        "env": {**mcp.get("env", {}), **request.env},
        "command": mcp["command"],
        "args": mcp["args"],
        "name": mcp["name"],
        "status": "installed",
    }
    _save_installed(installed)
    return {"id": mcp_id, "status": "installed"}


@router.post("/{mcp_id}/uninstall")
async def uninstall_mcp(mcp_id: str) -> dict:
    """Uninstall an MCP server."""
    installed = _load_installed()
    if mcp_id in installed:
        del installed[mcp_id]
        _save_installed(installed)
    return {"id": mcp_id, "status": "uninstalled"}


@router.post("/{mcp_id}/configure")
async def configure_mcp(mcp_id: str, request: ConfigUpdateRequest) -> dict:
    """Update configuration for an installed MCP server."""
    installed = _load_installed()
    if mcp_id not in installed:
        return {"error": "MCP not installed"}
    installed[mcp_id]["env"].update(request.env)
    _save_installed(installed)
    return {"id": mcp_id, "status": "configured", "env": installed[mcp_id]["env"]}


@router.get("/categories")
async def get_categories() -> list[dict]:
    """Get all MCP categories with counts."""
    cats: dict[str, int] = {}
    for mcp in MCP_CATALOG:
        cat = mcp.get("category", "other")
        cats[cat] = cats.get(cat, 0) + 1
    return [{"id": k, "name": k.title(), "count": v} for k, v in sorted(cats.items())]
