"""Hands API — Autonomous agent hands (22 total), OpenFang-compatible."""

from __future__ import annotations

import asyncio
import os
import shutil
import time
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()


def _check_cmd(cmd: str) -> bool:
    """Check if a command is available on the system."""
    return shutil.which(cmd) is not None


# ── Hand Definitions ─────────────────────────────────────

HANDS: list[dict] = [
    {
        "id": "browser",
        "name": "Browser Hand",
        "icon": "🌐",
        "description": "Autonomous web browser — navigates sites, fills forms, clicks buttons, and completes multi-step web tasks with user approval for purchases",
        "category": "productivity",
        "tools": [
            "browser_navigate", "browser_click", "browser_type", "browser_screenshot",
            "browser_read_page", "browser_close", "web_search", "web_fetch",
            "memory_store", "memory_recall", "knowledge_add_entity", "knowledge_add_relation",
            "knowledge_query", "schedule_create", "schedule_list", "schedule_delete",
            "file_write", "file_read",
        ],
        "requirements": [
            {"label": "Python 3 must be installed", "check": "python3", "met": True},
            {"label": "Chromium or Google Chrome must be installed", "check": "chromium", "met": True},
        ],
        "metrics": [
            {"name": "Pages Visited", "type": "number"},
            {"name": "Tasks Completed", "type": "number"},
            {"name": "Screenshots", "type": "number"},
        ],
        "settings": {"headless": True, "timeout": 30000, "max_pages": 10},
    },
    {
        "id": "clip",
        "name": "Clip Hand",
        "icon": "🎬",
        "description": "Turns long-form video into viral short clips with captions and thumbnails",
        "category": "content",
        "tools": [
            "download_video", "extract_clip", "add_subtitles", "generate_thumbnail",
            "format_platform", "web_search", "file_write",
        ],
        "requirements": [
            {"label": "FFmpeg must be installed", "check": "ffmpeg", "met": False},
            {"label": "FFprobe must be installed (ships with FFmpeg)", "check": "ffprobe", "met": False},
            {"label": "yt-dlp must be installed", "check": "yt-dlp", "met": False},
        ],
        "metrics": [
            {"name": "Clips Created", "type": "number"},
            {"name": "Videos Processed", "type": "number"},
            {"name": "Total Duration", "type": "duration"},
            {"name": "Captions Generated", "type": "number"},
            {"name": "Platforms Published", "type": "number"},
        ],
        "settings": {"max_duration": 60, "output_format": "mp4", "subtitle_style": "modern"},
    },
    {
        "id": "collector",
        "name": "Collector Hand",
        "icon": "🔍",
        "description": "Autonomous intelligence collector — monitors any target continuously with change detection and knowledge graphs",
        "category": "data",
        "tools": [
            "add_target", "monitor", "detect_changes", "build_graph",
            "generate_report", "set_alerts", "web_search", "web_fetch",
            "memory_store", "memory_recall", "knowledge_add_entity",
            "knowledge_add_relation", "knowledge_query", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Targets Monitored", "type": "number"},
            {"name": "Changes Detected", "type": "number"},
            {"name": "Reports Generated", "type": "number"},
            {"name": "Alerts Triggered", "type": "number"},
        ],
        "settings": {"check_interval": 3600, "max_targets": 50, "alert_threshold": 0.3},
    },
    {
        "id": "lead",
        "name": "Lead Hand",
        "icon": "📊",
        "description": "Autonomous lead generation — discovers, enriches, and delivers qualified leads on a schedule",
        "category": "data",
        "tools": [
            "search_leads", "enrich_lead", "score_lead", "export_leads",
            "generate_outreach", "web_search", "web_fetch", "memory_store",
            "memory_recall", "file_write", "file_read", "schedule_create",
            "schedule_list", "schedule_delete",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Leads Found", "type": "number"},
            {"name": "Leads Qualified", "type": "number"},
            {"name": "Outreach Sent", "type": "number"},
            {"name": "Conversion Rate", "type": "percent"},
        ],
        "settings": {"max_leads_per_run": 100, "min_score": 0.6, "enrichment_depth": "full"},
    },
    {
        "id": "predictor",
        "name": "Predictor Hand",
        "icon": "🔮",
        "description": "Autonomous future predictor — collects signals, builds reasoning chains, makes calibrated predictions, and tracks accuracy",
        "category": "data",
        "tools": [
            "collect_signals", "build_chain", "predict", "track_outcome",
            "calibrate", "web_search", "web_fetch", "memory_store",
            "memory_recall", "knowledge_add_entity", "knowledge_add_relation",
            "knowledge_query", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Predictions Made", "type": "number"},
            {"name": "Accuracy Rate", "type": "percent"},
            {"name": "Signals Collected", "type": "number"},
            {"name": "Outcomes Tracked", "type": "number"},
        ],
        "settings": {"confidence_threshold": 0.6, "max_horizon_days": 365, "track_accuracy": True},
    },
    {
        "id": "researcher",
        "name": "Researcher Hand",
        "icon": "🧪",
        "description": "Autonomous deep researcher — exhaustive investigation, cross-referencing, fact-checking, and structured reports",
        "category": "productivity",
        "tools": [
            "web_search", "deep_dive", "cross_reference", "fact_check",
            "generate_report", "cite_sources", "web_fetch", "memory_store",
            "memory_recall", "knowledge_add_entity", "knowledge_add_relation",
            "knowledge_query", "file_write", "file_read", "schedule_create",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Reports Generated", "type": "number"},
            {"name": "Sources Analyzed", "type": "number"},
            {"name": "Facts Verified", "type": "number"},
            {"name": "Cross-References", "type": "number"},
        ],
        "settings": {"max_sources": 50, "depth": "exhaustive", "fact_check": True},
    },
    {
        "id": "trading",
        "name": "Trading Hand",
        "icon": "📈",
        "description": "Autonomous market intelligence and trading engine — multi-signal analysis, adversarial bull/bear reasoning, calibrated confidence scoring",
        "category": "finance",
        "tools": [
            "analyze_market", "technical_analysis", "sentiment_analysis",
            "risk_assessment", "portfolio_review", "web_search", "web_fetch",
            "memory_store", "memory_recall", "knowledge_add_entity",
            "knowledge_query", "file_write", "file_read", "schedule_create",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Signals Analyzed", "type": "number"},
            {"name": "Trade Alerts", "type": "number"},
            {"name": "Win Rate", "type": "percent"},
            {"name": "Portfolio P&L", "type": "currency"},
        ],
        "settings": {"risk_tolerance": "moderate", "max_position_size": 0.1, "alert_on_signals": True},
    },
    {
        "id": "twitter",
        "name": "Twitter Hand",
        "icon": "𝕏",
        "description": "Autonomous Twitter/X manager — content creation, scheduled posting, engagement, and analytics tracking",
        "category": "social",
        "tools": [
            "compose_tweet", "schedule_post", "reply", "search_trending",
            "analytics", "manage_threads", "web_search", "memory_store",
            "memory_recall", "file_write",
        ],
        "requirements": [
            {"label": "Twitter/X API key must be configured", "check": "env:TWITTER_API_KEY", "met": False},
        ],
        "metrics": [
            {"name": "Posts Published", "type": "number"},
            {"name": "Engagement Rate", "type": "percent"},
            {"name": "Followers Gained", "type": "number"},
            {"name": "Impressions", "type": "number"},
        ],
        "settings": {"auto_engage": False, "max_posts_per_day": 10, "content_filter": True},
    },
    {
        "id": "coder",
        "name": "Coder Hand",
        "icon": "💻",
        "description": "Autonomous code generation — scaffold projects, write/edit files, run tests, debug and push to GitHub",
        "category": "development",
        "tools": [
            "write_file", "read_file", "edit_file", "shell", "python",
            "git", "create_project", "web_search", "memory_store",
            "memory_recall", "file_read",
        ],
        "requirements": [
            {"label": "Git must be installed", "check": "git", "met": True},
            {"label": "Node.js must be installed", "check": "node", "met": True},
        ],
        "metrics": [
            {"name": "Files Created", "type": "number"},
            {"name": "Lines Written", "type": "number"},
            {"name": "Tests Passed", "type": "number"},
            {"name": "Commits Made", "type": "number"},
        ],
        "settings": {"auto_test": True, "auto_commit": False, "max_files_per_run": 50},
    },
    {
        "id": "crawler",
        "name": "Crawler Hand",
        "icon": "🕷️",
        "description": "Deep web crawler — follow links, build site maps, extract structured data across entire domains",
        "category": "data",
        "tools": [
            "crawl_domain", "follow_links", "extract_structured", "build_sitemap",
            "export_data", "web_fetch", "file_write", "file_read",
            "memory_store", "memory_recall",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Pages Crawled", "type": "number"},
            {"name": "Links Found", "type": "number"},
            {"name": "Data Extracted", "type": "size"},
            {"name": "Sitemaps Built", "type": "number"},
        ],
        "settings": {"max_depth": 5, "max_pages": 500, "respect_robots": True, "delay_ms": 200},
    },
    {
        "id": "emailer",
        "name": "Emailer Hand",
        "icon": "📧",
        "description": "Email automation — compose, send, track opens/clicks, manage outreach campaigns and follow-ups",
        "category": "communication",
        "tools": [
            "compose_email", "send_email", "track_opens", "schedule_followup",
            "manage_templates", "memory_store", "memory_recall", "file_write",
        ],
        "requirements": [
            {"label": "SMTP credentials must be configured", "check": "env:SMTP_HOST", "met": False},
        ],
        "metrics": [
            {"name": "Emails Sent", "type": "number"},
            {"name": "Open Rate", "type": "percent"},
            {"name": "Click Rate", "type": "percent"},
            {"name": "Follow-ups Sent", "type": "number"},
        ],
        "settings": {"max_emails_per_day": 50, "track_opens": True, "auto_followup": True},
    },
    {
        "id": "designer",
        "name": "Designer Hand",
        "icon": "🎨",
        "description": "UI/UX generation — create mockups, generate components, design systems, color palettes, and icons",
        "category": "creative",
        "tools": [
            "generate_ui_component", "create_palette", "design_layout",
            "generate_icon", "export_figma", "web_search", "file_write",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Components Created", "type": "number"},
            {"name": "Layouts Designed", "type": "number"},
            {"name": "Icons Generated", "type": "number"},
        ],
        "settings": {"style": "liquid-glass", "framework": "react-tailwind", "responsive": True},
    },
    {
        "id": "devops",
        "name": "DevOps Hand",
        "icon": "⚙️",
        "description": "Infrastructure automation — deploy apps, manage Docker, configure CI/CD, monitor uptime and logs",
        "category": "development",
        "tools": [
            "deploy_app", "manage_docker", "configure_ci", "monitor_uptime",
            "manage_dns", "scale_service", "shell", "file_write", "file_read",
        ],
        "requirements": [
            {"label": "Docker must be installed", "check": "docker", "met": True},
        ],
        "metrics": [
            {"name": "Deployments", "type": "number"},
            {"name": "Uptime %", "type": "percent"},
            {"name": "Incidents Resolved", "type": "number"},
        ],
        "settings": {"auto_rollback": True, "health_check_interval": 60, "alert_on_failure": True},
    },
    {
        "id": "data-analyst",
        "name": "Data Analyst Hand",
        "icon": "📉",
        "description": "Data processing pipeline — clean, transform, analyze CSVs/databases, generate visualizations and reports",
        "category": "data",
        "tools": [
            "load_data", "clean_transform", "analyze", "visualize",
            "generate_report", "export_csv", "python", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Datasets Processed", "type": "number"},
            {"name": "Reports Generated", "type": "number"},
            {"name": "Rows Analyzed", "type": "number"},
            {"name": "Visualizations", "type": "number"},
        ],
        "settings": {"max_rows": 1000000, "auto_visualize": True, "output_format": "html"},
    },
    {
        "id": "scheduler-hand",
        "name": "Scheduler Hand",
        "icon": "⏰",
        "description": "Task scheduler — run any hand or workflow on cron schedules with retry logic and notifications",
        "category": "automation",
        "tools": [
            "create_schedule", "list_schedules", "pause_schedule", "trigger_now",
            "view_history", "memory_store", "memory_recall",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Active Schedules", "type": "number"},
            {"name": "Tasks Executed", "type": "number"},
            {"name": "Success Rate", "type": "percent"},
        ],
        "settings": {"max_concurrent": 5, "retry_count": 3, "notify_on_failure": True},
    },
    {
        "id": "memory-manager",
        "name": "Memory Manager Hand",
        "icon": "🧠",
        "description": "Long-term memory — store, retrieve, and reason over knowledge graphs, conversations, and learned facts",
        "category": "intelligence",
        "tools": [
            "store_memory", "recall", "build_knowledge_graph", "semantic_search",
            "forget", "summarize_context",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Memories Stored", "type": "number"},
            {"name": "Recalls Made", "type": "number"},
            {"name": "Graph Nodes", "type": "number"},
        ],
        "settings": {"max_memories": 100000, "auto_summarize": True, "embedding_model": "all-minilm"},
    },
    {
        "id": "security",
        "name": "Security Hand",
        "icon": "🛡️",
        "description": "Security auditor — scan for vulnerabilities, check dependencies, audit code, test endpoints",
        "category": "development",
        "tools": [
            "scan_deps", "audit_code", "check_headers", "test_auth",
            "generate_report", "fix_vulnerability", "shell", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Vulnerabilities Found", "type": "number"},
            {"name": "Deps Scanned", "type": "number"},
            {"name": "Fixes Applied", "type": "number"},
        ],
        "settings": {"auto_fix": False, "severity_threshold": "medium", "scan_on_push": True},
    },
    {
        "id": "translator",
        "name": "Translator Hand",
        "icon": "🌍",
        "description": "Multi-language translation — translate text, documents, code comments, and UI strings with context awareness",
        "category": "productivity",
        "tools": [
            "translate_text", "translate_file", "detect_language",
            "localize_app", "glossary_manage", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Translations Done", "type": "number"},
            {"name": "Languages Covered", "type": "number"},
            {"name": "Words Translated", "type": "number"},
        ],
        "settings": {"source_lang": "auto", "target_langs": ["en", "pt", "es"], "preserve_formatting": True},
    },
    {
        "id": "api-tester",
        "name": "API Tester Hand",
        "icon": "🧪",
        "description": "Autonomous API testing — discover endpoints, generate test suites, run regression tests, report coverage",
        "category": "development",
        "tools": [
            "discover_endpoints", "generate_tests", "run_suite",
            "check_coverage", "fuzz_test", "export_report", "file_write",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Endpoints Tested", "type": "number"},
            {"name": "Tests Passed", "type": "number"},
            {"name": "Coverage %", "type": "percent"},
        ],
        "settings": {"auto_discover": True, "fuzz_enabled": False, "timeout_per_test": 10},
    },
    {
        "id": "content-writer",
        "name": "Content Writer Hand",
        "icon": "✍️",
        "description": "Content creation — write blog posts, social media copy, SEO articles, newsletters, and documentation",
        "category": "content",
        "tools": [
            "write_article", "generate_outline", "seo_optimize",
            "create_social_post", "proofread", "web_search", "file_write",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Articles Written", "type": "number"},
            {"name": "Words Published", "type": "number"},
            {"name": "SEO Score", "type": "number"},
        ],
        "settings": {"tone": "professional", "seo_enabled": True, "max_length": 5000},
    },
    {
        "id": "file-manager",
        "name": "File Manager Hand",
        "icon": "📁",
        "description": "File operations — organize, rename, compress, convert files and manage workspace structure",
        "category": "productivity",
        "tools": [
            "list_files", "move_file", "rename_batch", "compress",
            "convert_format", "cleanup", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Files Organized", "type": "number"},
            {"name": "Space Saved", "type": "size"},
        ],
        "settings": {"auto_organize": False, "backup_before_delete": True},
    },
    {
        "id": "notification",
        "name": "Notification Hand",
        "icon": "🔔",
        "description": "Multi-channel notifications — send alerts via email, Telegram, Discord, Slack, SMS, and push",
        "category": "communication",
        "tools": [
            "send_notification", "configure_channel", "set_rule",
            "view_history", "manage_templates",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Notifications Sent", "type": "number"},
            {"name": "Channels Active", "type": "number"},
            {"name": "Delivery Rate", "type": "percent"},
        ],
        "settings": {"channels": ["email", "telegram"], "quiet_hours": "22:00-08:00", "batch_similar": True},
    },
    # ── New Specialized Hands (site/app dev, research, biohacking) ────
    {
        "id": "pesquisa-papers",
        "name": "Pesquisa Papers Hand",
        "icon": "📚",
        "description": "Pesquisa autônoma de artigos científicos — busca no PubMed, arXiv, Google Scholar, extrai dados e gera resumos estruturados",
        "category": "research",
        "tools": [
            "web_search", "web_fetch", "extract_abstract", "summarize_paper",
            "cite_sources", "file_write", "file_read", "memory_store",
            "memory_recall",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Papers Found", "type": "number"},
            {"name": "Abstracts Extracted", "type": "number"},
            {"name": "Summaries Generated", "type": "number"},
        ],
        "settings": {"max_results": 20, "sources": ["pubmed", "arxiv", "scholar"], "language": "auto"},
    },
    {
        "id": "gerar-codigo-web",
        "name": "Gerar Código Web Hand",
        "icon": "🌐",
        "description": "Geração autônoma de código web — HTML, CSS, JS, React, Next.js, Tailwind com preview e deploy-ready",
        "category": "development",
        "tools": [
            "write_file", "read_file", "edit_file", "shell", "python",
            "web_search", "file_write", "file_read", "generate_ui_component",
            "create_project",
        ],
        "requirements": [
            {"label": "Node.js must be installed", "check": "node", "met": True},
        ],
        "metrics": [
            {"name": "Components Generated", "type": "number"},
            {"name": "Pages Created", "type": "number"},
            {"name": "Lines of Code", "type": "number"},
        ],
        "settings": {"framework": "nextjs", "styling": "tailwind", "typescript": True},
    },
    {
        "id": "debug-codigo",
        "name": "Debug Código Hand",
        "icon": "🐛",
        "description": "Debugger autônomo — analisa erros, identifica root cause, sugere e aplica fixes com explicação detalhada",
        "category": "development",
        "tools": [
            "read_file", "edit_file", "shell", "python", "web_search",
            "file_write", "file_read", "analyze", "generate_report",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Bugs Fixed", "type": "number"},
            {"name": "Root Causes Found", "type": "number"},
            {"name": "Files Analyzed", "type": "number"},
        ],
        "settings": {"auto_fix": False, "explain_fix": True, "run_tests_after": True},
    },
    {
        "id": "gerar-prototipo-app",
        "name": "Gerar Protótipo App Hand",
        "icon": "📱",
        "description": "Prototipagem rápida — gera wireframes, fluxos de navegação e código base para apps mobile e web",
        "category": "creative",
        "tools": [
            "generate_ui_component", "design_layout", "create_project",
            "write_file", "file_write", "file_read", "web_search",
            "shell",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Prototypes Created", "type": "number"},
            {"name": "Screens Designed", "type": "number"},
            {"name": "Flows Mapped", "type": "number"},
        ],
        "settings": {"platform": "web", "style": "liquid-glass", "include_navigation": True},
    },
    {
        "id": "gerar-imagem-site",
        "name": "Gerar Imagem Site Hand",
        "icon": "🖼️",
        "description": "Geração de imagens para sites e apps via MiniMax — banners, hero images, ícones, backgrounds e assets visuais",
        "category": "creative",
        "tools": [
            "generate_image", "web_search", "file_write", "file_read",
            "memory_store", "memory_recall",
        ],
        "requirements": [
            {"label": "MiniMax API key must be configured", "check": "env:MINIMAX_API_KEY", "met": False},
        ],
        "metrics": [
            {"name": "Images Generated", "type": "number"},
            {"name": "Styles Applied", "type": "number"},
            {"name": "Assets Created", "type": "number"},
        ],
        "settings": {"model": "minimax", "resolution": "1024x1024", "style": "modern"},
    },
    {
        "id": "gerar-voz-narracao",
        "name": "Gerar Voz Narração Hand",
        "icon": "🎙️",
        "description": "Text-to-speech autônomo via MiniMax — gera narrações, voiceovers, podcasts e áudio para conteúdo",
        "category": "content",
        "tools": [
            "generate_voice", "web_search", "file_write", "file_read",
            "memory_store", "memory_recall",
        ],
        "requirements": [
            {"label": "MiniMax API key must be configured", "check": "env:MINIMAX_API_KEY", "met": False},
        ],
        "metrics": [
            {"name": "Audio Generated", "type": "number"},
            {"name": "Minutes of Audio", "type": "number"},
            {"name": "Voices Used", "type": "number"},
        ],
        "settings": {"model": "minimax-tts", "voice": "narrator", "language": "pt-BR"},
    },
    {
        "id": "web-search-hand",
        "name": "Web Search Hand",
        "icon": "🔍",
        "description": "Busca web profunda e autônoma — pesquisa, filtra, cruza fontes e gera relatórios estruturados com citações",
        "category": "research",
        "tools": [
            "web_search", "web_fetch", "deep_dive", "cross_reference",
            "cite_sources", "file_write", "file_read", "memory_store",
            "memory_recall",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Searches Made", "type": "number"},
            {"name": "Sources Found", "type": "number"},
            {"name": "Reports Generated", "type": "number"},
        ],
        "settings": {"max_results": 30, "depth": "deep", "include_citations": True},
    },
    {
        "id": "seo-copy",
        "name": "SEO Copy Hand",
        "icon": "📝",
        "description": "Copywriting SEO autônomo — gera textos otimizados para buscadores, meta tags, ads copy e landing pages",
        "category": "content",
        "tools": [
            "seo_optimize", "write_article", "generate_outline",
            "web_search", "file_write", "file_read", "memory_store",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Copies Written", "type": "number"},
            {"name": "Keywords Optimized", "type": "number"},
            {"name": "SEO Score", "type": "number"},
        ],
        "settings": {"tone": "persuasive", "max_length": 3000, "target_keyword_density": 0.02},
    },
    {
        "id": "deploy-simulacao",
        "name": "Deploy Simulação Hand",
        "icon": "🚀",
        "description": "Simulação de deploy — valida configuração, testa Dockerfiles, simula CI/CD pipelines e gera checklists de deploy",
        "category": "development",
        "tools": [
            "shell", "manage_docker", "configure_ci", "deploy_app",
            "file_write", "file_read", "generate_report",
        ],
        "requirements": [
            {"label": "Docker must be installed", "check": "docker", "met": True},
        ],
        "metrics": [
            {"name": "Deploys Simulated", "type": "number"},
            {"name": "Issues Found", "type": "number"},
            {"name": "Checklists Generated", "type": "number"},
        ],
        "settings": {"target": "railway", "validate_dockerfile": True, "dry_run": True},
    },
    {
        "id": "ui-design-sugestao",
        "name": "UI Design Sugestão Hand",
        "icon": "🎯",
        "description": "Consultoria de UI/UX — analisa layouts, sugere melhorias de usabilidade, acessibilidade e design patterns",
        "category": "creative",
        "tools": [
            "generate_ui_component", "design_layout", "create_palette",
            "web_search", "file_write", "file_read", "web_fetch",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Suggestions Made", "type": "number"},
            {"name": "Layouts Reviewed", "type": "number"},
            {"name": "A11y Issues Found", "type": "number"},
        ],
        "settings": {"style": "liquid-glass", "check_accessibility": True, "responsive": True},
    },
    {
        "id": "mobile-responsivo",
        "name": "Mobile Responsivo Hand",
        "icon": "📲",
        "description": "Especialista em responsividade — converte layouts desktop para mobile, otimiza CSS e testa breakpoints",
        "category": "development",
        "tools": [
            "read_file", "edit_file", "write_file", "shell",
            "generate_ui_component", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Components Adapted", "type": "number"},
            {"name": "Breakpoints Tested", "type": "number"},
            {"name": "CSS Lines Optimized", "type": "number"},
        ],
        "settings": {"breakpoints": ["sm", "md", "lg", "xl"], "framework": "tailwind", "mobile_first": True},
    },
    {
        "id": "database-setup",
        "name": "Database Setup Hand",
        "icon": "🗄️",
        "description": "Arquiteto de banco de dados — cria schemas SQL/NoSQL, migrations, seeds, RLS policies e otimiza queries",
        "category": "data",
        "tools": [
            "shell", "python", "write_file", "file_write", "file_read",
            "web_search", "generate_report",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Tables Created", "type": "number"},
            {"name": "Migrations Generated", "type": "number"},
            {"name": "Queries Optimized", "type": "number"},
        ],
        "settings": {"db_type": "postgresql", "orm": "supabase", "enable_rls": True},
    },
    {
        "id": "api-integracao",
        "name": "API Integração Hand",
        "icon": "🔗",
        "description": "Integrador de APIs — gera código de integração, testa endpoints, trata erros e documenta conexões",
        "category": "development",
        "tools": [
            "web_search", "web_fetch", "write_file", "shell", "python",
            "file_write", "file_read", "generate_report",
        ],
        "requirements": [],
        "metrics": [
            {"name": "APIs Integrated", "type": "number"},
            {"name": "Endpoints Connected", "type": "number"},
            {"name": "Tests Passed", "type": "number"},
        ],
        "settings": {"auth_type": "bearer", "retry_on_error": True, "generate_types": True},
    },
    {
        "id": "teste-automatizado",
        "name": "Teste Automatizado Hand",
        "icon": "✅",
        "description": "Gerador de testes autônomos — cria suites Jest, Cypress, Pytest com cobertura e relatórios",
        "category": "development",
        "tools": [
            "write_file", "read_file", "shell", "python",
            "generate_tests", "run_suite", "check_coverage",
            "file_write", "file_read",
        ],
        "requirements": [
            {"label": "Node.js must be installed", "check": "node", "met": True},
        ],
        "metrics": [
            {"name": "Tests Generated", "type": "number"},
            {"name": "Tests Passed", "type": "number"},
            {"name": "Coverage %", "type": "percent"},
        ],
        "settings": {"framework": "jest", "min_coverage": 80, "include_e2e": False},
    },
    {
        "id": "otimizar-performance",
        "name": "Otimizar Performance Hand",
        "icon": "⚡",
        "description": "Otimizador de performance — analisa bundle size, lazy loading, caching, Core Web Vitals e sugere melhorias",
        "category": "development",
        "tools": [
            "read_file", "edit_file", "shell", "python", "web_search",
            "analyze", "generate_report", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Issues Found", "type": "number"},
            {"name": "Fixes Applied", "type": "number"},
            {"name": "Performance Score", "type": "number"},
        ],
        "settings": {"target_lcp": 2.5, "target_fid": 100, "target_cls": 0.1, "auto_fix": False},
    },
    {
        "id": "gerar-readme",
        "name": "Gerar README Hand",
        "icon": "📄",
        "description": "Gerador de documentação — cria README.md completo, badges, setup instructions, API docs e contributing guide",
        "category": "content",
        "tools": [
            "read_file", "write_file", "file_write", "file_read",
            "web_search", "shell",
        ],
        "requirements": [],
        "metrics": [
            {"name": "READMEs Generated", "type": "number"},
            {"name": "Sections Written", "type": "number"},
            {"name": "Badges Added", "type": "number"},
        ],
        "settings": {"include_badges": True, "include_api_docs": True, "include_screenshots": False},
    },
    {
        "id": "marketing-landing",
        "name": "Marketing Landing Hand",
        "icon": "🎪",
        "description": "Criador de landing pages — gera hero sections, CTAs, testimonials, pricing tables e copy persuasivo",
        "category": "creative",
        "tools": [
            "generate_ui_component", "write_file", "seo_optimize",
            "create_palette", "web_search", "file_write", "file_read",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Landings Created", "type": "number"},
            {"name": "CTAs Generated", "type": "number"},
            {"name": "Conversion Score", "type": "number"},
        ],
        "settings": {"style": "liquid-glass", "include_pricing": True, "include_testimonials": True},
    },
    {
        "id": "video-teaser",
        "name": "Video Teaser Hand",
        "icon": "🎬",
        "description": "Roteirista de vídeo — cria scripts para teasers, reels, shorts, storyboards e prompts para geração de vídeo",
        "category": "content",
        "tools": [
            "write_article", "generate_outline", "web_search",
            "file_write", "file_read", "memory_store",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Scripts Written", "type": "number"},
            {"name": "Storyboards Created", "type": "number"},
            {"name": "Duration (sec)", "type": "number"},
        ],
        "settings": {"format": "short", "max_duration_sec": 60, "platform": "instagram"},
    },
    {
        "id": "bio-simulacao",
        "name": "Bio Simulação Hand",
        "icon": "🧬",
        "description": "Simulador biológico — executa análises com BioPython, RDKit, simulações moleculares e modelagem bioinformática",
        "category": "research",
        "tools": [
            "python", "shell", "web_search", "web_fetch",
            "file_write", "file_read", "memory_store", "memory_recall",
            "generate_report",
        ],
        "requirements": [],
        "metrics": [
            {"name": "Simulations Run", "type": "number"},
            {"name": "Molecules Analyzed", "type": "number"},
            {"name": "Reports Generated", "type": "number"},
        ],
        "settings": {"engine": "biopython", "output_format": "html", "save_results": True},
    },
    {
        "id": "imagem-molecula",
        "name": "Imagem Molécula Hand",
        "icon": "⚗️",
        "description": "Gerador de imagens moleculares — cria visualizações de moléculas, estruturas químicas e diagramas bio via MiniMax",
        "category": "research",
        "tools": [
            "generate_image", "python", "web_search",
            "file_write", "file_read", "memory_store",
        ],
        "requirements": [
            {"label": "MiniMax API key must be configured", "check": "env:MINIMAX_API_KEY", "met": False},
        ],
        "metrics": [
            {"name": "Molecules Rendered", "type": "number"},
            {"name": "Structures Visualized", "type": "number"},
            {"name": "Images Exported", "type": "number"},
        ],
        "settings": {"model": "minimax", "resolution": "1024x1024", "style": "scientific"},
    },
]

# ── In-memory state ──────────────────────────────────────
_hand_states: dict[str, dict] = {}


class HandConfigRequest(BaseModel):
    settings: dict | None = None
    enabled: bool = True


@router.get("")
@router.get("/")
async def list_hands():
    """List all autonomous hands with live requirement checks."""
    hands = []
    for h in HANDS:
        state = _hand_states.get(h["id"], {})
        # Check requirements dynamically
        reqs = []
        all_met = True
        for req in h.get("requirements", []):
            check = req.get("check", "")
            if check.startswith("env:"):
                import os
                met = bool(os.environ.get(check[4:]))
            else:
                met = _check_cmd(check) if check else True
            reqs.append({**req, "met": met})
            if not met:
                all_met = False
        status = "ready" if all_met else "setup_needed"
        if state.get("enabled"):
            status = "active"
        hands.append({
            **h,
            "requirements": reqs,
            "status": status,
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


class HandRunRequest(BaseModel):
    task: str = ""


def _build_hand_system_prompt(hand: dict) -> str:
    """Build a system prompt tailored to a specific hand."""
    tools_list = ", ".join(hand["tools"])
    return f"""You are the **{hand['name']}** ({hand['icon']}) — a Hand (ferramenta real) do **Delirium Infinite**, o agente bio-cientista louco autônomo.

## Identidade
Você faz parte do sistema Delirium Infinite — um agente autônomo com Hands (ferramentas reais) para criar sites, apps, pesquisa científica e biohacking. Cada Hand é um módulo especializado que executa tarefas reais.

## Sua Missão
{hand['description']}

## Tools Disponíveis
{tools_list}

Quando precisar usar uma tool, responda com JSON:
```json
{{"tool": "nome_da_tool", "param": "valor"}}
```

## Regras de Execução
1. **Raciocínio passo a passo** — pense antes de agir, explique cada step
2. **Máximo 8 steps por thread** — se precisar de mais, resuma e continue em novo bloco
3. **Anti-lock reasoning** — se travar em loop, pare, resuma o que tentou e mude de abordagem
4. **1-2 tools por chamada** — use no máximo 2 tools por resposta para manter controle
5. **Sempre termine com resumo**: "Tools usadas: X | Próximo passo: Y"
6. **Priorize ação real** — execute tarefas de verdade, não apenas explique
7. **Match language** — responda no idioma do usuário (português se falar português)
8. **Se a tool não existir, crie** — use shell/python para criar a ferramenta necessária
9. **Para sites/apps** — priorize código funcional e deploy-ready
10. **Para pesquisa/bio** — use fontes reais (PubMed, arXiv) e dados verificáveis
"""


@router.post("/{hand_id}/run")
async def run_hand(hand_id: str, req: HandRunRequest | None = None):
    """Trigger a run of an autonomous hand with optional task."""
    import json
    from agent.core import agent

    found = None
    for h in HANDS:
        if h["id"] == hand_id:
            found = h
            break
    if not found:
        raise HTTPException(status_code=404, detail="Hand not found")

    if hand_id not in _hand_states:
        _hand_states[hand_id] = {"enabled": True, "runs": 0, "last_run": None, "logs": []}
    _hand_states[hand_id]["enabled"] = True
    _hand_states[hand_id]["runs"] += 1
    _hand_states[hand_id]["last_run"] = time.time()
    run_number = _hand_states[hand_id]["runs"]

    task = (req.task if req and req.task else "").strip()
    if not task:
        task = f"Run your autonomous capabilities. {found['description']}"

    conversation_id = f"hand-{hand_id}-{uuid.uuid4().hex[:8]}"
    system_prompt = _build_hand_system_prompt(found)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'start', 'hand_id': hand_id, 'run': run_number})}\n\n"
        try:
            full_response = ""
            async for token in agent.stream_chat(
                message=task,
                conversation_id=conversation_id,
                system_prompt=system_prompt,
            ):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            _hand_states[hand_id].setdefault("logs", []).append({
                "run": run_number,
                "started_at": _hand_states[hand_id]["last_run"],
                "completed_at": time.time(),
                "status": "completed",
                "task": task,
                "response_length": len(full_response),
            })
            yield f"data: {json.dumps({'type': 'done', 'hand_id': hand_id})}\n\n"
        except Exception as e:
            _hand_states[hand_id].setdefault("logs", []).append({
                "run": run_number,
                "started_at": _hand_states[hand_id]["last_run"],
                "completed_at": time.time(),
                "status": "error",
                "error": str(e),
            })
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{hand_id}/logs")
async def get_hand_logs(hand_id: str):
    """Get run logs for a hand."""
    state = _hand_states.get(hand_id, {})
    return {"hand_id": hand_id, "logs": state.get("logs", []), "total_runs": state.get("runs", 0)}
