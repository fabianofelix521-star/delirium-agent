"""Integrations API Route - Real external service connections with validation."""

from __future__ import annotations
import hashlib
import hmac
import time
import urllib.parse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()

# ── Required config fields per integration ──────────────
INTEGRATION_FIELDS: dict[str, list[dict]] = {
    "telegram": [
        {"key": "bot_token", "label": "Bot Token", "placeholder": "123456:ABC-DEF...", "type": "password",
         "help": "Create a bot via @BotFather on Telegram and paste the token here."},
        {"key": "chat_id", "label": "Chat ID (optional)", "placeholder": "-1001234567890", "type": "text",
         "help": "Your chat/group ID. Send /start to your bot, then use @userinfobot to find your ID."},
    ],
    "gmail": [
        {"key": "email", "label": "Gmail Address", "placeholder": "you@gmail.com", "type": "email",
         "help": "Your Gmail address."},
        {"key": "app_password", "label": "App Password", "placeholder": "xxxx xxxx xxxx xxxx", "type": "password",
         "help": "Generate at myaccount.google.com → Security → App Passwords. Requires 2FA enabled."},
    ],
    "whatsapp": [
        {"key": "phone_id", "label": "Phone Number ID", "placeholder": "1234567890", "type": "text",
         "help": "From Meta Developer Portal → WhatsApp → API Setup."},
        {"key": "access_token", "label": "Access Token", "placeholder": "EAAx...", "type": "password",
         "help": "Permanent token from Meta Developer Portal."},
    ],
    "gdrive": [
        {"key": "service_account_json", "label": "Service Account JSON", "placeholder": '{"type":"service_account",...}',
         "type": "textarea", "help": "Paste the contents of your Google Cloud service account JSON key file."},
    ],
    "notion": [
        {"key": "api_key", "label": "Internal Integration Token", "placeholder": "ntn_...", "type": "password",
         "help": "Create at notion.so/my-integrations → New Integration → Copy token."},
    ],
    "calendar": [
        {"key": "api_key", "label": "Google API Key", "placeholder": "AIza...", "type": "password",
         "help": "Create at console.cloud.google.com → Credentials → API Key. Enable Calendar API."},
        {"key": "calendar_id", "label": "Calendar ID", "placeholder": "primary", "type": "text",
         "help": "Use 'primary' for your main calendar, or paste a specific calendar ID."},
    ],
    "binance": [
        {"key": "api_key", "label": "API Key", "placeholder": "Your Binance API key", "type": "password",
         "help": "Create at binance.com → API Management."},
        {"key": "api_secret", "label": "API Secret", "placeholder": "Your Binance API secret", "type": "password",
         "help": "The secret key paired with your API key."},
    ],
    "icloud": [
        {"key": "apple_id", "label": "Apple ID", "placeholder": "you@icloud.com", "type": "email",
         "help": "Your Apple ID email."},
        {"key": "app_password", "label": "App-Specific Password", "placeholder": "xxxx-xxxx-xxxx-xxxx", "type": "password",
         "help": "Generate at appleid.apple.com → App-Specific Passwords."},
    ],
}

# ── In-memory integration store ─────────────────────────
_integrations: list[dict] = [
    {"id": "telegram", "name": "Telegram", "icon": "✈️",
     "description": "Send & receive messages via Telegram bot",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["telegram"],
     "bot_name": None, "verified_at": None},
    {"id": "gmail", "name": "Gmail", "icon": "📧",
     "description": "Send and receive emails via App Password",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["gmail"],
     "verified_at": None},
    {"id": "whatsapp", "name": "WhatsApp", "icon": "💬",
     "description": "Send messages via WhatsApp Business API",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["whatsapp"],
     "verified_at": None},
    {"id": "gdrive", "name": "Google Drive", "icon": "📁",
     "description": "List & upload files via Service Account",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["gdrive"],
     "verified_at": None},
    {"id": "notion", "name": "Notion", "icon": "📝",
     "description": "Read & write Notion pages and databases",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["notion"],
     "verified_at": None},
    {"id": "calendar", "name": "Google Calendar", "icon": "📅",
     "description": "View & manage calendar events",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["calendar"],
     "verified_at": None},
    {"id": "binance", "name": "Binance", "icon": "📈",
     "description": "Check balances & trading on Binance",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["binance"],
     "verified_at": None},
    {"id": "icloud", "name": "iCloud", "icon": "☁️",
     "description": "Apple iCloud sync (limited API)",
     "status": "disconnected", "config": {}, "fields": INTEGRATION_FIELDS["icloud"],
     "verified_at": None},
]


class ConnectRequest(BaseModel):
    config: dict = {}


class ActionRequest(BaseModel):
    action: str
    params: dict = {}


# ── Validators: test real API credentials ───────────────

async def _validate_telegram(config: dict) -> dict:
    """Validate Telegram bot token by calling getMe."""
    token = config.get("bot_token", "").strip()
    if not token:
        raise HTTPException(400, "Bot Token is required")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"https://api.telegram.org/bot{token}/getMe")
    data = r.json()
    if not data.get("ok"):
        raise HTTPException(400, f"Invalid Telegram Bot Token: {data.get('description', 'unknown error')}")
    bot = data["result"]
    return {"bot_name": f"@{bot['username']}", "bot_id": str(bot["id"])}


async def _validate_gmail(config: dict) -> dict:
    """Validate Gmail credentials via SMTP login test."""
    import smtplib
    email = config.get("email", "").strip()
    app_pw = config.get("app_password", "").strip().replace(" ", "")
    if not email or not app_pw:
        raise HTTPException(400, "Email and App Password are required")
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as s:
            s.ehlo()
            s.starttls()
            s.login(email, app_pw)
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(400, "Gmail authentication failed. Check email and App Password.")
    except Exception as e:
        raise HTTPException(400, f"Gmail connection error: {str(e)}")
    return {"email": email}


async def _validate_whatsapp(config: dict) -> dict:
    """Validate WhatsApp Business API token."""
    phone_id = config.get("phone_id", "").strip()
    token = config.get("access_token", "").strip()
    if not phone_id or not token:
        raise HTTPException(400, "Phone Number ID and Access Token are required")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"https://graph.facebook.com/v21.0/{phone_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
    if r.status_code != 200:
        raise HTTPException(400, f"WhatsApp API error: {r.json().get('error', {}).get('message', 'Invalid credentials')}")
    return {"phone_id": phone_id, "display_name": r.json().get("verified_name", phone_id)}


async def _validate_notion(config: dict) -> dict:
    """Validate Notion integration token."""
    token = config.get("api_key", "").strip()
    if not token:
        raise HTTPException(400, "Notion API token is required")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://api.notion.com/v1/users/me",
            headers={"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28"},
        )
    if r.status_code != 200:
        raise HTTPException(400, "Invalid Notion token. Make sure it starts with ntn_ or secret_")
    user = r.json()
    return {"workspace": user.get("name", "Connected")}


async def _validate_calendar(config: dict) -> dict:
    """Validate Google Calendar API key."""
    api_key = config.get("api_key", "").strip()
    cal_id = config.get("calendar_id", "primary").strip() or "primary"
    if not api_key:
        raise HTTPException(400, "Google API Key is required")
    encoded_cal = urllib.parse.quote(cal_id, safe="")
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"https://www.googleapis.com/calendar/v3/calendars/{encoded_cal}",
            params={"key": api_key},
        )
    if r.status_code != 200:
        err = r.json().get("error", {}).get("message", "Invalid API key or Calendar ID")
        raise HTTPException(400, f"Google Calendar error: {err}")
    return {"calendar_name": r.json().get("summary", cal_id)}


async def _validate_binance(config: dict) -> dict:
    """Validate Binance API key + secret by calling account info."""
    api_key = config.get("api_key", "").strip()
    api_secret = config.get("api_secret", "").strip()
    if not api_key or not api_secret:
        raise HTTPException(400, "API Key and API Secret are required")
    ts = str(int(time.time() * 1000))
    query = f"timestamp={ts}"
    sig = hmac.new(api_secret.encode(), query.encode(), hashlib.sha256).hexdigest()
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            f"https://api.binance.com/api/v3/account?{query}&signature={sig}",
            headers={"X-MBX-APIKEY": api_key},
        )
    if r.status_code != 200:
        msg = r.json().get("msg", "Invalid API credentials")
        raise HTTPException(400, f"Binance error: {msg}")
    return {"account_type": r.json().get("accountType", "SPOT")}


async def _validate_gdrive(config: dict) -> dict:
    """Validate Google Drive service account JSON (basic structure check)."""
    import json
    raw = config.get("service_account_json", "").strip()
    if not raw:
        raise HTTPException(400, "Service Account JSON is required")
    try:
        sa = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON format")
    if sa.get("type") != "service_account":
        raise HTTPException(400, "JSON must be a service_account type key file")
    if not sa.get("client_email"):
        raise HTTPException(400, "Missing client_email in JSON")
    return {"service_email": sa["client_email"]}


async def _validate_icloud(config: dict) -> dict:
    """Basic validation for iCloud credentials."""
    apple_id = config.get("apple_id", "").strip()
    app_pw = config.get("app_password", "").strip()
    if not apple_id or not app_pw:
        raise HTTPException(400, "Apple ID and App-Specific Password are required")
    # iCloud doesn't have a simple public API to validate; accept if format looks right
    if "@" not in apple_id:
        raise HTTPException(400, "Invalid Apple ID format")
    if len(app_pw.replace("-", "").replace(" ", "")) < 12:
        raise HTTPException(400, "App-Specific Password seems too short")
    return {"apple_id": apple_id}


VALIDATORS = {
    "telegram": _validate_telegram,
    "gmail": _validate_gmail,
    "whatsapp": _validate_whatsapp,
    "gdrive": _validate_gdrive,
    "notion": _validate_notion,
    "calendar": _validate_calendar,
    "binance": _validate_binance,
    "icloud": _validate_icloud,
}


# ── Action executors: real API calls ────────────────────

async def _telegram_action(config: dict, action: str, params: dict) -> dict:
    token = config["bot_token"]
    if action == "send_message":
        chat_id = params.get("chat_id") or config.get("chat_id")
        text = params.get("text", "")
        if not chat_id:
            return {"error": "chat_id is required (set in config or pass in params)"}
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(f"https://api.telegram.org/bot{token}/sendMessage",
                                  json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})
        return r.json()
    elif action == "get_updates":
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.telegram.org/bot{token}/getUpdates",
                                 params={"limit": params.get("limit", 10), "offset": params.get("offset", -10)})
        return r.json()
    elif action == "get_me":
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.telegram.org/bot{token}/getMe")
        return r.json()
    return {"error": f"Unknown action: {action}"}


async def _gmail_action(config: dict, action: str, params: dict) -> dict:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    email_addr = config["email"]
    app_pw = config["app_password"].replace(" ", "")
    if action == "send_email":
        to = params.get("to", "")
        subject = params.get("subject", "")
        body = params.get("body", "")
        if not to:
            return {"error": "Recipient 'to' is required"}
        msg = MIMEMultipart()
        msg["From"] = email_addr
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html"))
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as s:
            s.ehlo(); s.starttls(); s.login(email_addr, app_pw)
            s.send_message(msg)
        return {"status": "sent", "to": to, "subject": subject}
    elif action == "test":
        return {"status": "ok", "email": email_addr}
    return {"error": f"Unknown action: {action}"}


async def _whatsapp_action(config: dict, action: str, params: dict) -> dict:
    phone_id = config["phone_id"]
    token = config["access_token"]
    if action == "send_message":
        to = params.get("to", "")  # phone number with country code
        text = params.get("text", "")
        if not to or not text:
            return {"error": "'to' (phone number) and 'text' are required"}
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"https://graph.facebook.com/v21.0/{phone_id}/messages",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"messaging_product": "whatsapp", "to": to,
                      "type": "text", "text": {"body": text}},
            )
        return r.json()
    return {"error": f"Unknown action: {action}"}


async def _notion_action(config: dict, action: str, params: dict) -> dict:
    token = config["api_key"]
    headers = {"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}
    if action == "search":
        query = params.get("query", "")
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post("https://api.notion.com/v1/search",
                                  headers=headers, json={"query": query, "page_size": params.get("limit", 10)})
        data = r.json()
        results = []
        for item in data.get("results", []):
            title = ""
            for prop in item.get("properties", {}).values():
                if prop.get("type") == "title":
                    title = "".join(t.get("plain_text", "") for t in prop.get("title", []))
                    break
            results.append({"id": item["id"], "type": item["object"], "title": title or item["id"][:8],
                            "url": item.get("url", "")})
        return {"results": results, "total": len(results)}
    elif action == "list_databases":
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post("https://api.notion.com/v1/search",
                                  headers=headers, json={"filter": {"property": "object", "value": "database"}, "page_size": 20})
        data = r.json()
        dbs = []
        for db in data.get("results", []):
            title = "".join(t.get("plain_text", "") for t in db.get("title", []))
            dbs.append({"id": db["id"], "title": title or "Untitled", "url": db.get("url", "")})
        return {"databases": dbs}
    return {"error": f"Unknown action: {action}"}


async def _binance_action(config: dict, action: str, params: dict) -> dict:
    api_key = config["api_key"]
    api_secret = config["api_secret"]
    def _sign(query_str: str) -> str:
        return hmac.new(api_secret.encode(), query_str.encode(), hashlib.sha256).hexdigest()
    if action == "balances":
        ts = str(int(time.time() * 1000))
        qs = f"timestamp={ts}"
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"https://api.binance.com/api/v3/account?{qs}&signature={_sign(qs)}",
                                 headers={"X-MBX-APIKEY": api_key})
        if r.status_code != 200:
            return {"error": r.json().get("msg", "API error")}
        balances = [b for b in r.json().get("balances", []) if float(b["free"]) > 0 or float(b["locked"]) > 0]
        return {"balances": balances}
    elif action == "ticker":
        symbol = params.get("symbol", "BTCUSDT")
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get("https://api.binance.com/api/v3/ticker/24hr", params={"symbol": symbol})
        return r.json()
    return {"error": f"Unknown action: {action}"}


async def _calendar_action(config: dict, action: str, params: dict) -> dict:
    api_key = config["api_key"]
    cal_id = urllib.parse.quote(config.get("calendar_id", "primary") or "primary", safe="")
    if action == "list_events":
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"https://www.googleapis.com/calendar/v3/calendars/{cal_id}/events",
                params={"key": api_key, "maxResults": params.get("limit", 10),
                        "orderBy": "startTime", "singleEvents": "true",
                        "timeMin": params.get("time_min", "")},
            )
        if r.status_code != 200:
            return {"error": r.json().get("error", {}).get("message", "API error")}
        events = []
        for ev in r.json().get("items", []):
            events.append({"id": ev["id"], "summary": ev.get("summary", "No title"),
                           "start": ev.get("start", {}), "end": ev.get("end", {}),
                           "status": ev.get("status", "")})
        return {"events": events}
    return {"error": f"Unknown action: {action}"}


async def _gdrive_action(config: dict, _action: str, _params: dict) -> dict:
    return {"info": "Google Drive actions require OAuth2 flow. Service account validated.",
            "service_email": config.get("_service_email", "")}


async def _icloud_action(config: dict, _action: str, _params: dict) -> dict:
    return {"info": "iCloud has limited API. Credentials stored for future use.",
            "apple_id": config.get("apple_id", "")}


ACTION_EXECUTORS = {
    "telegram": _telegram_action,
    "gmail": _gmail_action,
    "whatsapp": _whatsapp_action,
    "notion": _notion_action,
    "binance": _binance_action,
    "calendar": _calendar_action,
    "gdrive": _gdrive_action,
    "icloud": _icloud_action,
}


# ── Routes ──────────────────────────────────────────────

@router.get("")
@router.get("/")
async def list_integrations() -> list[dict]:
    """List all integrations with their config field definitions."""
    safe = []
    for i in _integrations:
        item = {**i, "config": {k: ("***" if k in ("bot_token", "app_password", "access_token", "api_key", "api_secret", "service_account_json") else v)
                                 for k, v in i["config"].items()}}
        safe.append(item)
    return safe


@router.get("/{integration_id}")
async def get_integration(integration_id: str) -> dict:
    for i in _integrations:
        if i["id"] == integration_id:
            return i
    raise HTTPException(404, "Integration not found")


@router.get("/{integration_id}/fields")
async def get_integration_fields(integration_id: str) -> list[dict]:
    """Get required config fields for an integration."""
    fields = INTEGRATION_FIELDS.get(integration_id)
    if fields is None:
        raise HTTPException(404, "Integration not found")
    return fields


@router.post("/{integration_id}/connect")
async def connect_integration(integration_id: str, request: ConnectRequest) -> dict:
    """Connect an integration by validating real API credentials."""
    integ = None
    for i in _integrations:
        if i["id"] == integration_id:
            integ = i
            break
    if not integ:
        raise HTTPException(404, "Integration not found")

    validator = VALIDATORS.get(integration_id)
    if not validator:
        raise HTTPException(400, f"No validator for {integration_id}")

    # Validate credentials against real API
    extra = await validator(request.config)

    # Store config and mark connected
    integ["config"] = {**request.config}
    integ["status"] = "connected"
    integ["verified_at"] = time.time()
    if integration_id == "telegram" and extra.get("bot_name"):
        integ["bot_name"] = extra["bot_name"]

    return {"id": integration_id, "status": "connected", "details": extra}


@router.post("/{integration_id}/disconnect")
async def disconnect_integration(integration_id: str) -> dict:
    for i in _integrations:
        if i["id"] == integration_id:
            i["status"] = "disconnected"
            i["config"] = {}
            i["verified_at"] = None
            return {"id": integration_id, "status": "disconnected"}
    raise HTTPException(404, "Integration not found")


@router.post("/{integration_id}/action")
async def execute_action(integration_id: str, request: ActionRequest) -> dict:
    """Execute a real action on a connected integration."""
    integ = None
    for i in _integrations:
        if i["id"] == integration_id:
            integ = i
            break
    if not integ:
        raise HTTPException(404, "Integration not found")
    if integ["status"] != "connected":
        raise HTTPException(400, f"{integ['name']} is not connected. Please connect first.")

    executor = ACTION_EXECUTORS.get(integration_id)
    if not executor:
        raise HTTPException(400, f"No action executor for {integration_id}")

    try:
        result = await executor(integ["config"], request.action, request.params)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Action failed: {str(e)}")
    return result


@router.post("/{integration_id}/test")
async def test_integration(integration_id: str) -> dict:
    """Test if a connected integration is still working."""
    integ = None
    for i in _integrations:
        if i["id"] == integration_id:
            integ = i
            break
    if not integ:
        raise HTTPException(404, "Integration not found")
    if integ["status"] != "connected":
        raise HTTPException(400, "Not connected")

    validator = VALIDATORS.get(integration_id)
    if not validator:
        return {"status": "ok", "message": "No validator available"}

    try:
        extra = await validator(integ["config"])
        return {"status": "ok", "details": extra}
    except HTTPException as e:
        integ["status"] = "error"
        return {"status": "error", "message": e.detail}
