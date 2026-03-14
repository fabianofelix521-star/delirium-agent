"""System API Route - System monitoring plus local attachment uploads."""

import mimetypes
import re
import uuid
from pathlib import Path

import psutil
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
import httpx

from api.auth import get_current_user

router = APIRouter()

UPLOADS_ROOT = Path(__file__).resolve().parents[2] / "data" / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)


def _safe_filename(filename: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(filename or "upload").name)
        cleaned = cleaned.strip(".-") or "upload"
        return cleaned[:120]


def _build_markdown(url: str, filename: str, content_type: str) -> str:
        kind = content_type.lower()
        if kind.startswith("image/"):
            return f"![{filename}]({url})"
        if kind.startswith("video/"):
            return url
        if filename.lower().endswith(".pdf"):
            return f"[{filename}]({url})"
        return f"[{filename}]({url})"


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


@router.post("/uploads")
async def upload_attachment(
    request: Request,
    file: UploadFile = File(...),
    scope: str = Query("general"),
    _email: str = Depends(get_current_user),
) -> dict:
    """Persist an uploaded attachment locally and return a renderer-friendly URL."""
    original_name = _safe_filename(file.filename or "upload")
    content_type = file.content_type or mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    extension = Path(original_name).suffix
    scope_dir = UPLOADS_ROOT / re.sub(r"[^A-Za-z0-9_-]+", "-", scope)[:40]
    scope_dir.mkdir(parents=True, exist_ok=True)

    blob = await file.read()
    if not blob:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(blob) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Limit is 25MB")

    stored_name = f"{uuid.uuid4().hex}{extension}"
    stored_path = scope_dir / stored_name
    stored_path.write_bytes(blob)

    relative_url = f"/uploads/{scope_dir.name}/{stored_name}"
    public_url = str(request.base_url).rstrip("/") + relative_url

    return {
        "filename": original_name,
        "content_type": content_type,
        "size": len(blob),
        "url": relative_url,
        "public_url": public_url,
        "markdown": _build_markdown(relative_url, original_name, content_type),
    }


@router.get("/uploads")
async def list_uploaded_attachments(
    scope: str = Query("general"),
    _email: str = Depends(get_current_user),
) -> dict:
    """List locally persisted uploads for a given scope."""
    scope_dir = UPLOADS_ROOT / re.sub(r"[^A-Za-z0-9_-]+", "-", scope)[:40]
    if not scope_dir.exists():
        return {"files": []}

    files = []
    for item in sorted(scope_dir.iterdir(), key=lambda path: path.stat().st_mtime, reverse=True):
        if not item.is_file():
            continue
        files.append(
            {
                "name": item.name,
                "url": f"/uploads/{scope_dir.name}/{item.name}",
                "size": item.stat().st_size,
                "modified_at": item.stat().st_mtime,
                "content_type": mimetypes.guess_type(item.name)[0] or "application/octet-stream",
            }
        )

    return {"files": files}
