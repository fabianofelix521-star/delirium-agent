"""Memory API Route - Agent memory search and management with file persistence."""

import json
import os
import time
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ─── File-based persistence ─────────────────────────────────────

_DATA_DIR = Path(os.getenv("MEMORY_DIR", "data"))
_MEMORY_FILE = _DATA_DIR / "memories.json"
_next_id = 0


def _load_memories() -> list[dict]:
    """Load memories from JSON file."""
    global _next_id
    if _MEMORY_FILE.exists():
        try:
            data = json.loads(_MEMORY_FILE.read_text(encoding="utf-8"))
            if isinstance(data, list):
                _next_id = max((m.get("id", 0) for m in data), default=0) + 1
                return data
        except (json.JSONDecodeError, IOError):
            pass
    return []


def _save_memories(memories: list[dict]) -> None:
    """Persist memories to JSON file."""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _MEMORY_FILE.write_text(json.dumps(memories, ensure_ascii=False, indent=2), encoding="utf-8")


# Load on startup
_memories: list[dict] = _load_memories()


class MemoryEntry(BaseModel):
    content: str
    type: str = "interaction"
    importance: float = 0.5
    metadata: dict = {}


@router.get("/search")
async def search_memory(q: str = "", type: str | None = None, limit: int = 50) -> list[dict]:
    """Search agent memory."""
    results = _memories
    if q:
        q_lower = q.lower()
        results = [m for m in results if q_lower in m.get("content", "").lower()
                    or q_lower in m.get("type", "").lower()
                    or any(q_lower in str(v).lower() for v in m.get("metadata", {}).values())]
    if type:
        results = [m for m in results if m.get("type") == type]
    return sorted(results, key=lambda m: m.get("created_at", 0), reverse=True)[:limit]


@router.post("")
@router.post("/")
async def add_memory(entry: MemoryEntry) -> dict:
    """Add a memory entry and persist to disk."""
    global _next_id
    mem = {
        "id": _next_id,
        "content": entry.content,
        "type": entry.type,
        "importance": entry.importance,
        "metadata": entry.metadata,
        "created_at": time.time(),
    }
    _next_id += 1
    _memories.append(mem)
    _save_memories(_memories)
    return mem


@router.delete("/{memory_id}")
async def delete_memory(memory_id: int) -> dict:
    """Delete a specific memory and persist."""
    global _memories
    _memories = [m for m in _memories if m.get("id") != memory_id]
    _save_memories(_memories)
    return {"deleted": True}


@router.delete("")
@router.delete("/")
async def clear_all_memories() -> dict:
    """Clear all memories."""
    global _memories, _next_id
    _memories = []
    _next_id = 0
    _save_memories(_memories)
    return {"cleared": True}


@router.get("/stats")
async def memory_stats() -> dict:
    """Get memory statistics."""
    types_count: dict[str, int] = {}
    for m in _memories:
        t = m.get("type", "unknown")
        types_count[t] = types_count.get(t, 0) + 1
    return {
        "total": len(_memories),
        "types": list(types_count.keys()),
        "by_type": types_count,
        "oldest": min((m.get("created_at", 0) for m in _memories), default=None),
        "newest": max((m.get("created_at", 0) for m in _memories), default=None),
    }


@router.get("/export")
async def export_memories() -> list[dict]:
    """Export all memories."""
    return _memories


@router.post("/import")
async def import_memories(memories: list[dict]) -> dict:
    """Import memories from a list (merges with existing)."""
    global _next_id
    imported = 0
    for m in memories:
        m["id"] = _next_id
        _next_id += 1
        if "created_at" not in m:
            m["created_at"] = time.time()
        _memories.append(m)
        imported += 1
    _save_memories(_memories)
    return {"imported": imported, "total": len(_memories)}
