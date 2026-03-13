"""
Delirium Infinite - Backend Entry Point
FastAPI application with WebSocket support, JWT auth, and CORS.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from dotenv import load_dotenv

# Load .env from project root (one level up from backend/)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

import psutil
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.auth import router as auth_router
from api.routes.chat import router as chat_router
from api.routes.tools import router as tools_router
from api.routes.memory import router as memory_router
from api.routes.settings import router as settings_router
from api.routes.integrations import router as integrations_router
from api.routes.system import router as system_router
from api.routes.voice import router as voice_router
from api.routes.github import router as github_router
from api.routes.mcp import router as mcp_router
from api.routes.agents import router as agents_router
from api.routes.skills import router as skills_router
from api.routes.channels import router as channels_router
from api.routes.hands import router as hands_router
from api.routes.workflows import router as workflows_router
from api.routes.scheduler import router as scheduler_router
from api.routes.overview import router as overview_router
from api.routes.analytics import router as analytics_router
from api.routes.logs import router as logs_router
from api.routes.sessions import router as sessions_router
from api.routes.approvals import router as approvals_router
from api.routes.comms import router as comms_router
from api.routes.runtime import router as runtime_router
from api.routes.copilot import router as copilot_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    print("🚀 Delirium Infinite starting up...")
    yield
    print("👋 Delirium Infinite shutting down...")


app = FastAPI(
    title="Delirium Infinite",
    description="Autonomous AI Agent — Full Web Interface",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# ─── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ──────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(chat_router, prefix="/api/chat", tags=["chat"])
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])
app.include_router(memory_router, prefix="/api/memory", tags=["memory"])
app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
app.include_router(integrations_router, prefix="/api/integrations", tags=["integrations"])
app.include_router(system_router, prefix="/api/system", tags=["system"])
app.include_router(voice_router, prefix="/api/voice", tags=["voice"])
app.include_router(github_router, prefix="/api/github", tags=["github"])
app.include_router(mcp_router, prefix="/api/mcp", tags=["mcp"])
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
app.include_router(skills_router, prefix="/api/skills", tags=["skills"])
app.include_router(channels_router, prefix="/api/channels", tags=["channels"])
app.include_router(hands_router, prefix="/api/hands", tags=["hands"])
app.include_router(workflows_router, prefix="/api/workflows", tags=["workflows"])
app.include_router(scheduler_router, prefix="/api/scheduler", tags=["scheduler"])
app.include_router(overview_router, prefix="/api/overview", tags=["overview"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["analytics"])
app.include_router(logs_router, prefix="/api/logs", tags=["logs"])
app.include_router(sessions_router, prefix="/api/sessions", tags=["sessions"])
app.include_router(approvals_router, prefix="/api/approvals", tags=["approvals"])
app.include_router(comms_router, prefix="/api/comms", tags=["comms"])
app.include_router(runtime_router, prefix="/api/runtime", tags=["runtime"])
app.include_router(copilot_router, prefix="/api/copilot", tags=["copilot"])


# ─── Health Check ────────────────────────────────────────
@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for Docker and monitoring."""
    return {
        "status": "healthy",
        "service": "delirium-infinite",
        "version": "1.0.0",
        "cpu_percent": psutil.cpu_percent(),
        "memory_percent": psutil.virtual_memory().percent,
    }


# ─── Global Error Handler ───────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all error handler for unhandled exceptions."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
