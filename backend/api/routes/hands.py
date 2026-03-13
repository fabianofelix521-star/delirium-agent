"""Hands API — 8 autonomous agent hands matching OpenFang."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Hand Definitions ─────────────────────────────────────

HANDS: list[dict] = [
    {
        "id": "browser",
        "name": "Browser",
        "icon": "🌐",
        "description": "Autonomous web browsing — navigate, fill forms, click buttons, complete multi-step web tasks",
        "status": "available",
        "tools": ["navigate_url", "click_element", "fill_form", "screenshot", "extract_data", "wait_for_element"],
        "requirements": ["playwright", "beautifulsoup4"],
        "settings": {"headless": True, "timeout": 30000, "max_pages": 10},
    },
    {
        "id": "clip",
        "name": "Clip",
        "icon": "🎬",
        "description": "Video to short clips — extract highlights, add captions, format for TikTok/Reels/Shorts",
        "status": "available",
        "tools": ["download_video", "extract_clip", "add_subtitles", "generate_thumbnail", "format_platform"],
        "requirements": ["ffmpeg", "yt-dlp", "whisper"],
        "settings": {"max_duration": 60, "output_format": "mp4", "subtitle_style": "modern"},
    },
    {
        "id": "collector",
        "name": "Collector",
        "icon": "🔍",
        "description": "Intelligence collection — monitor targets continuously with change detection and knowledge graphs",
        "status": "available",
        "tools": ["add_target", "monitor", "detect_changes", "build_graph", "generate_report", "set_alerts"],
        "requirements": ["httpx", "beautifulsoup4", "networkx"],
        "settings": {"check_interval": 3600, "max_targets": 50, "alert_threshold": 0.3},
    },
    {
        "id": "lead",
        "name": "Lead",
        "icon": "📊",
        "description": "Autonomous lead generation — discover, enrich, score, and deliver qualified leads on schedule",
        "status": "available",
        "tools": ["search_leads", "enrich_lead", "score_lead", "export_leads", "generate_outreach"],
        "requirements": ["httpx", "csv"],
        "settings": {"max_leads_per_run": 100, "min_score": 0.6, "enrichment_depth": "full"},
    },
    {
        "id": "predictor",
        "name": "Predictor",
        "icon": "🔮",
        "description": "Future prediction engine — collect signals, build reasoning chains, make calibrated predictions, track accuracy",
        "status": "available",
        "tools": ["collect_signals", "build_chain", "predict", "track_outcome", "calibrate"],
        "requirements": ["numpy", "scipy"],
        "settings": {"confidence_threshold": 0.6, "max_horizon_days": 365, "track_accuracy": True},
    },
    {
        "id": "researcher",
        "name": "Researcher",
        "icon": "🧪",
        "description": "Deep autonomous research — exhaustive investigation with cross-referencing and structured reports",
        "status": "available",
        "tools": ["web_search", "deep_dive", "cross_reference", "fact_check", "generate_report", "cite_sources"],
        "requirements": ["httpx", "ddgs"],
        "settings": {"max_sources": 50, "depth": "exhaustive", "fact_check": True},
    },
    {
        "id": "trading",
        "name": "Trading",
        "icon": "📈",
        "description": "Market intelligence — multi-signal analysis, adversarial bull/bear reasoning, calibrated confidence scoring",
        "status": "available",
        "tools": ["analyze_market", "technical_analysis", "sentiment_analysis", "risk_assessment", "portfolio_review"],
        "requirements": ["numpy", "pandas"],
        "settings": {"risk_tolerance": "moderate", "max_position_size": 0.1, "alert_on_signals": True},
    },
    {
        "id": "twitter",
        "name": "Twitter/X",
        "icon": "𝕏",
        "description": "Social media management — compose tweets, schedule posts, engage with followers, track analytics",
        "status": "available",
        "tools": ["compose_tweet", "schedule_post", "reply", "search_trending", "analytics", "manage_threads"],
        "requirements": ["tweepy"],
        "settings": {"auto_engage": False, "max_posts_per_day": 10, "content_filter": True},
    },
]

# ── In-memory state ──────────────────────────────────────
_hand_states: dict[str, dict] = {}


class HandConfigRequest(BaseModel):
    settings: dict | None = None
    enabled: bool = True


@router.get("/")
async def list_hands():
    """List all autonomous hands."""
    hands = []
    for h in HANDS:
        state = _hand_states.get(h["id"], {})
        hands.append({
            **h,
            "enabled": state.get("enabled", False),
            "last_run": state.get("last_run"),
            "runs": state.get("runs", 0),
        })
    return {"hands": hands, "total": len(hands)}


@router.get("/{hand_id}")
async def get_hand(hand_id: str):
    """Get a specific hand's details."""
    for h in HANDS:
        if h["id"] == hand_id:
            state = _hand_states.get(hand_id, {})
            return {**h, "enabled": state.get("enabled", False),
                    "last_run": state.get("last_run"), "runs": state.get("runs", 0)}
    raise HTTPException(status_code=404, detail="Hand not found")


@router.post("/{hand_id}/enable")
async def enable_hand(hand_id: str, req: HandConfigRequest):
    """Enable/configure an autonomous hand."""
    found = None
    for h in HANDS:
        if h["id"] == hand_id:
            found = h
            break
    if not found:
        raise HTTPException(status_code=404, detail="Hand not found")
    if hand_id not in _hand_states:
        _hand_states[hand_id] = {"enabled": False, "runs": 0, "last_run": None}
    _hand_states[hand_id]["enabled"] = req.enabled
    if req.settings:
        _hand_states[hand_id]["settings"] = req.settings
    return {"status": "enabled" if req.enabled else "disabled", "hand_id": hand_id}


@router.post("/{hand_id}/run")
async def run_hand(hand_id: str):
    """Trigger a manual run of an autonomous hand."""
    for h in HANDS:
        if h["id"] == hand_id:
            import time
            if hand_id not in _hand_states:
                _hand_states[hand_id] = {"enabled": True, "runs": 0, "last_run": None}
            _hand_states[hand_id]["runs"] += 1
            _hand_states[hand_id]["last_run"] = time.time()
            return {"status": "running", "hand_id": hand_id, "run_number": _hand_states[hand_id]["runs"]}
    raise HTTPException(status_code=404, detail="Hand not found")
