"""
Delirium Infinite - Runtime API
System runtime information, environment, dependencies, performance.
"""

import os
import platform
import sys
import time

import psutil
from fastapi import APIRouter

router = APIRouter()

_start_time = time.time()


@router.get("")
@router.get("/")
async def get_runtime() -> dict:
    """Full runtime information."""
    uptime = time.time() - _start_time
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    cpu_freq = psutil.cpu_freq()

    return {
        "system": {
            "platform": platform.platform(),
            "python_version": sys.version,
            "architecture": platform.machine(),
            "hostname": platform.node(),
            "os": platform.system(),
            "os_version": platform.version(),
        },
        "process": {
            "pid": os.getpid(),
            "uptime_seconds": uptime,
            "uptime_human": f"{int(uptime // 3600)}h {int((uptime % 3600) // 60)}m {int(uptime % 60)}s",
            "working_directory": os.getcwd(),
        },
        "cpu": {
            "cores_physical": psutil.cpu_count(logical=False),
            "cores_logical": psutil.cpu_count(logical=True),
            "usage_percent": psutil.cpu_percent(interval=0.1),
            "frequency_mhz": cpu_freq.current if cpu_freq else None,
        },
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "available_gb": round(mem.available / (1024**3), 2),
            "percent": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent,
        },
        "environment": {
            "BACKEND_URL": os.environ.get("BACKEND_URL", "not set"),
            "PORT": os.environ.get("PORT", "8000"),
            "NODE_ENV": os.environ.get("NODE_ENV", "not set"),
            "RAILWAY_ENVIRONMENT": os.environ.get("RAILWAY_ENVIRONMENT", "not set"),
        },
        "dependencies": {
            "fastapi": _get_version("fastapi"),
            "uvicorn": _get_version("uvicorn"),
            "psutil": _get_version("psutil"),
            "httpx": _get_version("httpx"),
            "pydantic": _get_version("pydantic"),
        },
    }


def _get_version(package: str) -> str:
    try:
        from importlib.metadata import version
        return version(package)
    except Exception:
        return "unknown"


@router.get("/health")
async def health() -> dict:
    """Quick health check."""
    return {
        "status": "healthy",
        "uptime": time.time() - _start_time,
        "cpu": psutil.cpu_percent(),
        "memory": psutil.virtual_memory().percent,
    }


@router.get("/metrics")
async def metrics() -> dict:
    """Prometheus-style metrics."""
    mem = psutil.virtual_memory()
    return {
        "cpu_usage_percent": psutil.cpu_percent(),
        "memory_usage_percent": mem.percent,
        "memory_used_bytes": mem.used,
        "disk_usage_percent": psutil.disk_usage("/").percent,
        "process_uptime_seconds": time.time() - _start_time,
        "python_version": sys.version,
    }
