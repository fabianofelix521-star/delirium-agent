"""
Delirium Infinite - Analytics API
Token usage tracking, cost analytics, model usage breakdown.
"""

import time
import uuid
from typing import Any

from fastapi import APIRouter

router = APIRouter()

# ─── In-memory analytics store ───────────────────────────
_usage_records: list[dict[str, Any]] = []
_daily_stats: dict[str, dict] = {}


def record_usage(provider: str, model: str, tokens_in: int, tokens_out: int, cost: float) -> None:
    """Record an LLM usage event."""
    now = time.time()
    day_key = time.strftime("%Y-%m-%d", time.localtime(now))
    _usage_records.append({
        "id": str(uuid.uuid4()),
        "provider": provider,
        "model": model,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "total_tokens": tokens_in + tokens_out,
        "cost": cost,
        "timestamp": now,
    })
    # Keep last 10k
    if len(_usage_records) > 10000:
        _usage_records.pop(0)

    if day_key not in _daily_stats:
        _daily_stats[day_key] = {"calls": 0, "tokens": 0, "cost": 0.0}
    _daily_stats[day_key]["calls"] += 1
    _daily_stats[day_key]["tokens"] += tokens_in + tokens_out
    _daily_stats[day_key]["cost"] += cost


@router.get("/")
async def get_analytics() -> dict:
    """Aggregated analytics overview."""
    total_tokens = sum(r["total_tokens"] for r in _usage_records)
    total_cost = sum(r["cost"] for r in _usage_records)
    total_calls = len(_usage_records)

    # Provider breakdown
    by_provider: dict[str, dict] = {}
    for r in _usage_records:
        p = r["provider"]
        if p not in by_provider:
            by_provider[p] = {"calls": 0, "tokens": 0, "cost": 0.0}
        by_provider[p]["calls"] += 1
        by_provider[p]["tokens"] += r["total_tokens"]
        by_provider[p]["cost"] += r["cost"]

    # Model breakdown
    by_model: dict[str, dict] = {}
    for r in _usage_records:
        m = r["model"]
        if m not in by_model:
            by_model[m] = {"calls": 0, "tokens": 0, "cost": 0.0}
        by_model[m]["calls"] += 1
        by_model[m]["tokens"] += r["total_tokens"]
        by_model[m]["cost"] += r["cost"]

    # Daily breakdown (last 7 days)
    daily = []
    for i in range(6, -1, -1):
        day = time.strftime("%Y-%m-%d", time.localtime(time.time() - i * 86400))
        stats = _daily_stats.get(day, {"calls": 0, "tokens": 0, "cost": 0.0})
        daily.append({"date": day, **stats})

    return {
        "total_tokens": total_tokens,
        "total_cost": total_cost,
        "total_calls": total_calls,
        "by_provider": [
            {"provider": k, **v} for k, v in sorted(by_provider.items(), key=lambda x: -x[1]["cost"])
        ],
        "by_model": [
            {"model": k, **v} for k, v in sorted(by_model.items(), key=lambda x: -x[1]["tokens"])
        ],
        "daily": daily,
    }


@router.get("/usage")
async def get_usage_records(limit: int = 100) -> list:
    """Recent raw usage records."""
    return _usage_records[-limit:][::-1]


@router.post("/record")
async def add_record(body: dict) -> dict:
    """Manually record a usage event."""
    record_usage(
        provider=body.get("provider", "unknown"),
        model=body.get("model", "unknown"),
        tokens_in=body.get("tokens_in", 0),
        tokens_out=body.get("tokens_out", 0),
        cost=body.get("cost", 0.0),
    )
    return {"ok": True}
