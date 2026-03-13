"""Hands API — Autonomous agent hands (22 total)."""

from __future__ import annotations

import time
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
    # ═══════════════════════════════════════════════════════
    # NEW HANDS — Inspired by Agent Zero, OpenCraw, AutoGPT
    # ═══════════════════════════════════════════════════════
    {
        "id": "coder",
        "name": "Coder",
        "icon": "💻",
        "description": "Autonomous code generation — scaffold projects, write/edit files, run tests, debug and push to GitHub",
        "status": "available",
        "tools": ["write_file", "read_file", "edit_file", "shell", "python", "git", "create_project"],
        "requirements": ["aiofiles"],
        "settings": {"auto_test": True, "auto_commit": False, "max_files_per_run": 50},
    },
    {
        "id": "crawler",
        "name": "Crawler",
        "icon": "🕷️",
        "description": "Deep web crawler — follow links, build site maps, extract structured data across entire domains",
        "status": "available",
        "tools": ["crawl_domain", "follow_links", "extract_structured", "build_sitemap", "export_data"],
        "requirements": ["httpx", "beautifulsoup4", "lxml"],
        "settings": {"max_depth": 5, "max_pages": 500, "respect_robots": True, "delay_ms": 200},
    },
    {
        "id": "emailer",
        "name": "Emailer",
        "icon": "📧",
        "description": "Email automation — compose, send, track opens/clicks, manage outreach campaigns and follow-ups",
        "status": "available",
        "tools": ["compose_email", "send_email", "track_opens", "schedule_followup", "manage_templates"],
        "requirements": ["aiosmtplib"],
        "settings": {"max_emails_per_day": 50, "track_opens": True, "auto_followup": True},
    },
    {
        "id": "designer",
        "name": "Designer",
        "icon": "🎨",
        "description": "UI/UX generation — create mockups, generate components, design systems, color palettes, and icons",
        "status": "available",
        "tools": ["generate_ui_component", "create_palette", "design_layout", "generate_icon", "export_figma"],
        "requirements": ["pillow"],
        "settings": {"style": "liquid-glass", "framework": "react-tailwind", "responsive": True},
    },
    {
        "id": "devops",
        "name": "DevOps",
        "icon": "⚙️",
        "description": "Infrastructure automation — deploy apps, manage Docker, configure CI/CD, monitor uptime and logs",
        "status": "available",
        "tools": ["deploy_app", "manage_docker", "configure_ci", "monitor_uptime", "manage_dns", "scale_service"],
        "requirements": ["httpx"],
        "settings": {"auto_rollback": True, "health_check_interval": 60, "alert_on_failure": True},
    },
    {
        "id": "data-analyst",
        "name": "Data Analyst",
        "icon": "📉",
        "description": "Data processing pipeline — clean, transform, analyze CSVs/databases, generate visualizations and reports",
        "status": "available",
        "tools": ["load_data", "clean_transform", "analyze", "visualize", "generate_report", "export_csv"],
        "requirements": ["pandas", "matplotlib"],
        "settings": {"max_rows": 1000000, "auto_visualize": True, "output_format": "html"},
    },
    {
        "id": "scheduler-hand",
        "name": "Scheduler",
        "icon": "⏰",
        "description": "Task scheduler — run any hand or workflow on cron schedules with retry logic and notifications",
        "status": "available",
        "tools": ["create_schedule", "list_schedules", "pause_schedule", "trigger_now", "view_history"],
        "requirements": ["croniter"],
        "settings": {"max_concurrent": 5, "retry_count": 3, "notify_on_failure": True},
    },
    {
        "id": "memory-manager",
        "name": "Memory Manager",
        "icon": "🧠",
        "description": "Long-term memory — store, retrieve, and reason over knowledge graphs, conversations, and learned facts",
        "status": "available",
        "tools": ["store_memory", "recall", "build_knowledge_graph", "semantic_search", "forget", "summarize_context"],
        "requirements": ["qdrant-client"],
        "settings": {"max_memories": 100000, "auto_summarize": True, "embedding_model": "all-minilm"},
    },
    {
        "id": "security",
        "name": "Security",
        "icon": "🛡️",
        "description": "Security auditor — scan for vulnerabilities, check dependencies, audit code, test endpoints",
        "status": "available",
        "tools": ["scan_deps", "audit_code", "check_headers", "test_auth", "generate_report", "fix_vulnerability"],
        "requirements": ["httpx"],
        "settings": {"auto_fix": False, "severity_threshold": "medium", "scan_on_push": True},
    },
    {
        "id": "translator",
        "name": "Translator",
        "icon": "🌍",
        "description": "Multi-language translation — translate text, documents, code comments, and UI strings with context awareness",
        "status": "available",
        "tools": ["translate_text", "translate_file", "detect_language", "localize_app", "glossary_manage"],
        "requirements": ["httpx"],
        "settings": {"source_lang": "auto", "target_langs": ["en", "pt", "es"], "preserve_formatting": True},
    },
    {
        "id": "api-tester",
        "name": "API Tester",
        "icon": "🧪",
        "description": "Autonomous API testing — discover endpoints, generate test suites, run regression tests, report coverage",
        "status": "available",
        "tools": ["discover_endpoints", "generate_tests", "run_suite", "check_coverage", "fuzz_test", "export_report"],
        "requirements": ["httpx"],
        "settings": {"auto_discover": True, "fuzz_enabled": False, "timeout_per_test": 10},
    },
    {
        "id": "content-writer",
        "name": "Content Writer",
        "icon": "✍️",
        "description": "Content creation — write blog posts, social media copy, SEO articles, newsletters, and documentation",
        "status": "available",
        "tools": ["write_article", "generate_outline", "seo_optimize", "create_social_post", "proofread"],
        "requirements": [],
        "settings": {"tone": "professional", "seo_enabled": True, "max_length": 5000},
    },
    {
        "id": "file-manager",
        "name": "File Manager",
        "icon": "📁",
        "description": "File operations — organize, rename, compress, convert files and manage workspace structure",
        "status": "available",
        "tools": ["list_files", "move_file", "rename_batch", "compress", "convert_format", "cleanup"],
        "requirements": ["aiofiles"],
        "settings": {"auto_organize": False, "backup_before_delete": True},
    },
    {
        "id": "notification",
        "name": "Notification",
        "icon": "🔔",
        "description": "Multi-channel notifications — send alerts via email, Telegram, Discord, Slack, SMS, and push",
        "status": "available",
        "tools": ["send_notification", "configure_channel", "set_rule", "view_history", "manage_templates"],
        "requirements": ["httpx"],
        "settings": {"channels": ["email", "telegram"], "quiet_hours": "22:00-08:00", "batch_similar": True},
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
            if hand_id not in _hand_states:
                _hand_states[hand_id] = {"enabled": True, "runs": 0, "last_run": None, "logs": []}
            _hand_states[hand_id]["runs"] += 1
            _hand_states[hand_id]["last_run"] = time.time()
            _hand_states[hand_id].setdefault("logs", []).append({
                "run": _hand_states[hand_id]["runs"],
                "started_at": time.time(),
                "status": "running",
                "tools_used": h["tools"][:2],
            })
            return {
                "status": "running",
                "hand_id": hand_id,
                "run_number": _hand_states[hand_id]["runs"],
                "message": f"Hand '{h['name']}' started run #{_hand_states[hand_id]['runs']}",
            }
    raise HTTPException(status_code=404, detail="Hand not found")
