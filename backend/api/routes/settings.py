"""Settings API Route - Application configuration management."""

import os
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel
from agent.router import router as llm_router


router = APIRouter()

# In-memory settings store
_settings: dict[str, Any] = {
    "general": {
        "language": "pt-BR",
        "timezone": "America/Sao_Paulo",
        "theme": "dark",
    },
    "llm": {
        "default_provider": os.getenv("DEFAULT_PROVIDER", "alibaba"),
        "temperature": 0.7,
        "max_tokens": 4096,
        "auto_fallback": True,
    },
    "voice": {
        "stt_engine": "whisper_local",
        "tts_engine": "edge_tts",
        "tts_voice": "pt-BR-AntonioNeural",
        "tts_speed": 1.0,
        "wake_word": "Hey Delirium",
    },
    "notifications": {
        "desktop": True,
        "sound": True,
        "email": False,
    },
}


class SettingsUpdate(BaseModel):
    category: str
    settings: dict[str, Any]


@router.get("/")
async def get_settings() -> dict:
    """Get all application settings."""
    return _settings


@router.get("/{category}")
async def get_category_settings(category: str) -> dict:
    """Get settings for a specific category."""
    if category not in _settings:
        return {"error": f"Category '{category}' not found"}
    return _settings[category]


@router.put("/")
async def update_settings(update: SettingsUpdate) -> dict:
    """Update settings for a specific category."""
    if update.category not in _settings:
        _settings[update.category] = {}
    _settings[update.category].update(update.settings)
    return {"status": "saved", "category": update.category}


@router.get("/providers/list")
async def list_providers() -> list[dict]:
    """List all configured LLM providers."""
    return llm_router.list_providers()


@router.post("/providers/test/{provider_name}")
async def test_provider(provider_name: str) -> dict:
    """Test connection to a specific provider."""
    try:
        provider = llm_router.get_provider(provider_name)
        ok = await provider.test_connection()
        return {"provider": provider_name, "status": "connected" if ok else "failed"}
    except Exception as e:
        return {"provider": provider_name, "status": "error", "message": str(e)}
