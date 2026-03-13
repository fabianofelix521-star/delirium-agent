"""
Delirium Infinite - Overview / Dashboard API
System overview with metrics, providers, health, channels, recent activity.
"""

import time
import uuid
from typing import Any

import psutil
from fastapi import APIRouter

router = APIRouter()

# ─── In-memory activity log ─────────────────────────────
_activity_log: list[dict[str, Any]] = []
_start_time = time.time()


def log_activity(event_type: str, agent_id: str = "", details: str = "") -> None:
    """Record an activity event."""
    _activity_log.append({
        "id": str(uuid.uuid4()),
        "type": event_type,
        "agent_id": agent_id,
        "details": details,
        "timestamp": time.time(),
    })
    # Keep last 200
    if len(_activity_log) > 200:
        _activity_log.pop(0)


# ─── Provider registry ──────────────────────────────────
PROVIDERS = [
    {"id": "anthropic", "name": "Anthropic", "status": "not_configured"},
    {"id": "openai", "name": "OpenAI", "status": "not_configured"},
    {"id": "google", "name": "Google Gemini", "status": "not_configured"},
    {"id": "deepseek", "name": "DeepSeek", "status": "not_configured"},
    {"id": "groq", "name": "Groq", "status": "not_configured"},
    {"id": "openrouter", "name": "OpenRouter", "status": "ready"},
    {"id": "mistral", "name": "Mistral AI", "status": "not_configured"},
    {"id": "together", "name": "Together AI", "status": "not_configured"},
    {"id": "fireworks", "name": "Fireworks AI", "status": "not_configured"},
    {"id": "ollama", "name": "Ollama", "status": "not_configured"},
    {"id": "vllm", "name": "vLLM", "status": "not_configured"},
    {"id": "lmstudio", "name": "LM Studio", "status": "not_configured"},
    {"id": "perplexity", "name": "Perplexity AI", "status": "not_configured"},
    {"id": "cohere", "name": "Cohere", "status": "not_configured"},
    {"id": "ai21", "name": "AI21 Labs", "status": "not_configured"},
    {"id": "cerebras", "name": "Cerebras", "status": "not_configured"},
    {"id": "sambanova", "name": "SambaNova", "status": "not_configured"},
    {"id": "huggingface", "name": "Hugging Face", "status": "not_configured"},
    {"id": "xai", "name": "xAI (Grok)", "status": "not_configured"},
    {"id": "replicate", "name": "Replicate", "status": "not_configured"},
    {"id": "github_copilot", "name": "GitHub Copilot", "status": "not_configured"},
    {"id": "chutes", "name": "Chutes.ai", "status": "not_configured"},
    {"id": "venice", "name": "Venice.ai", "status": "not_configured"},
    {"id": "qwen", "name": "Qwen (Alibaba)", "status": "ready"},
    {"id": "minimax", "name": "MiniMax", "status": "not_configured"},
    {"id": "zhipu", "name": "Zhipu AI (GLM)", "status": "not_configured"},
    {"id": "moonshot", "name": "Moonshot (Kimi)", "status": "not_configured"},
    {"id": "baidu", "name": "Baidu Qianfan", "status": "not_configured"},
    {"id": "volcano", "name": "Volcano Engine", "status": "not_configured"},
    {"id": "bedrock", "name": "AWS Bedrock", "status": "not_configured"},
    {"id": "alibaba_coding", "name": "Alibaba Coding", "status": "ready"},
    {"id": "dashscope", "name": "DashScope", "status": "ready"},
]

SECURITY_SYSTEMS = [
    "Merkle Audit",
    "Taint Tracking",
    "WASM Sandbox",
    "GCRA Rate Limit",
    "Ed25519 Signing",
    "SSRF Protection",
    "Secret Zeroize",
    "Loop Guard",
    "Session Repair",
]


@router.get("/")
async def get_overview() -> dict:
    """Full overview dashboard data."""
    import os

    uptime_secs = time.time() - _start_time
    hours = int(uptime_secs // 3600)
    mins = int((uptime_secs % 3600) // 60)

    configured = [p for p in PROVIDERS if p["status"] == "ready"]

    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime": f"{hours}h {mins}m",
        "uptime_seconds": uptime_secs,
        "metrics": {
            "agents_running": 1,
            "tokens_used": 0,
            "total_cost": 0.0,
            "tool_calls": 0,
        },
        "providers": {
            "total": len(PROVIDERS),
            "configured": len(configured),
            "list": PROVIDERS,
        },
        "security_systems": SECURITY_SYSTEMS,
        "security_count": len(SECURITY_SYSTEMS),
        "quick_actions": [
            {"id": "new_agent", "label": "New Agent", "icon": "bot"},
            {"id": "browse_skills", "label": "Browse Skills", "icon": "sparkles"},
            {"id": "add_channel", "label": "Add Channel", "icon": "radio"},
            {"id": "create_workflow", "label": "Create Workflow", "icon": "git-branch"},
            {"id": "settings", "label": "Settings", "icon": "settings"},
        ],
        "recent_activity": _activity_log[-20:][::-1],
        "system_health": {
            "cpu_percent": psutil.cpu_percent(),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage("/").percent,
        },
    }


@router.get("/providers")
async def get_providers() -> list:
    return PROVIDERS


@router.get("/activity")
async def get_activity() -> list:
    return _activity_log[-50:][::-1]


@router.post("/activity")
async def post_activity(body: dict) -> dict:
    log_activity(
        event_type=body.get("type", "custom"),
        agent_id=body.get("agent_id", ""),
        details=body.get("details", ""),
    )
    return {"ok": True}
