"""System API Route - System monitoring (CPU, RAM, Disk, Services)."""

import psutil
from fastapi import APIRouter
import httpx

router = APIRouter()


@router.get("/metrics")
async def get_system_metrics() -> dict:
    """Get current system metrics."""
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    return {
        "cpu": {"percent": psutil.cpu_percent(interval=0.5), "cores": psutil.cpu_count()},
        "memory": {"total_gb": round(mem.total / (1024**3), 1), "used_gb": round(mem.used / (1024**3), 1),
                    "percent": mem.percent},
        "disk": {"total_gb": round(disk.total / (1024**3), 1), "used_gb": round(disk.used / (1024**3), 1),
                 "percent": round(disk.percent, 1)},
        "network": {"bytes_sent": psutil.net_io_counters().bytes_sent, "bytes_recv": psutil.net_io_counters().bytes_recv},
    }


@router.get("/services")
async def get_services_status() -> list[dict]:
    """Check status of all dependent services."""
    services = []

    # Ollama
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get("http://localhost:11434/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
            services.append({"name": "Ollama", "status": "online", "details": {"models": models}})
    except Exception:
        services.append({"name": "Ollama", "status": "offline", "details": {}})

    # Redis
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get("http://localhost:6379")
            services.append({"name": "Redis", "status": "online", "details": {}})
    except Exception:
        services.append({"name": "Redis", "status": "offline", "details": {}})

    # Qdrant
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get("http://localhost:6333/healthz")
            services.append({"name": "Qdrant", "status": "online" if r.status_code == 200 else "offline", "details": {}})
    except Exception:
        services.append({"name": "Qdrant", "status": "offline", "details": {}})

    return services


@router.get("/processes")
async def list_processes() -> list[dict]:
    """List top processes by CPU usage."""
    procs = []
    for p in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            info = p.info
            if info["cpu_percent"] and info["cpu_percent"] > 0:
                procs.append(info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    return sorted(procs, key=lambda x: x.get("cpu_percent", 0), reverse=True)[:30]
