"""Memory API Route - Agent memory search and management."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# In-memory store (will be replaced with Qdrant/SQLite)
_memories: list[dict] = []


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
        results = [m for m in results if q.lower() in m.get("content", "").lower()]
    if type:
        results = [m for m in results if m.get("type") == type]
    return results[:limit]


@router.post("")
@router.post("/")
async def add_memory(entry: MemoryEntry) -> dict:
    """Add a memory entry."""
    import time
    mem = {"id": len(_memories), "content": entry.content, "type": entry.type,
           "importance": entry.importance, "metadata": entry.metadata, "created_at": time.time()}
    _memories.append(mem)
    return mem


@router.delete("/{memory_id}")
async def delete_memory(memory_id: int) -> dict:
    """Delete a specific memory."""
    global _memories
    _memories = [m for m in _memories if m.get("id") != memory_id]
    return {"deleted": True}


@router.get("/stats")
async def memory_stats() -> dict:
    """Get memory statistics."""
    return {"total": len(_memories), "types": list(set(m.get("type", "") for m in _memories))}
