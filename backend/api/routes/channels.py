"""Channels API — 40 communication channel integrations matching OpenFang."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Channel Definitions ──────────────────────────────────

CHANNELS: list[dict] = [
    # ── Messaging ──
    {"id": "telegram", "name": "Telegram", "icon": "✈️", "category": "messaging",
     "description": "Bot API — send/receive messages, groups, channels",
     "status": "available", "docs": "https://core.telegram.org/bots/api",
     "fields": [{"key": "bot_token", "label": "Bot Token", "type": "password"}]},
    {"id": "discord", "name": "Discord", "icon": "🎮", "category": "messaging",
     "description": "Bot integration — servers, channels, slash commands",
     "status": "available", "docs": "https://discord.com/developers/docs",
     "fields": [{"key": "bot_token", "label": "Bot Token", "type": "password"}]},
    {"id": "slack", "name": "Slack", "icon": "💼", "category": "messaging",
     "description": "Workspace messaging — channels, DMs, app mentions",
     "status": "available", "docs": "https://api.slack.com/",
     "fields": [{"key": "bot_token", "label": "Bot OAuth Token", "type": "password"},
                {"key": "signing_secret", "label": "Signing Secret", "type": "password"}]},
    {"id": "whatsapp", "name": "WhatsApp", "icon": "💬", "category": "messaging",
     "description": "Business API — automated messaging at scale",
     "status": "available", "docs": "https://developers.facebook.com/docs/whatsapp",
     "fields": [{"key": "phone_id", "label": "Phone Number ID", "type": "text"},
                {"key": "access_token", "label": "Access Token", "type": "password"}]},
    {"id": "signal", "name": "Signal", "icon": "🔒", "category": "messaging",
     "description": "End-to-end encrypted messaging via Signal CLI",
     "status": "available", "docs": "https://github.com/AsamK/signal-cli",
     "fields": [{"key": "phone_number", "label": "Phone Number", "type": "text"}]},
    {"id": "matrix", "name": "Matrix", "icon": "🟩", "category": "messaging",
     "description": "Decentralized messaging — Element, Synapse",
     "status": "available", "docs": "https://spec.matrix.org/",
     "fields": [{"key": "homeserver", "label": "Homeserver URL", "type": "text"},
                {"key": "access_token", "label": "Access Token", "type": "password"}]},
    {"id": "email", "name": "Email (SMTP)", "icon": "📧", "category": "messaging",
     "description": "Send/receive emails via SMTP/IMAP",
     "status": "available", "docs": "",
     "fields": [{"key": "smtp_host", "label": "SMTP Host", "type": "text"},
                {"key": "smtp_user", "label": "Username", "type": "text"},
                {"key": "smtp_pass", "label": "Password", "type": "password"}]},
    {"id": "line", "name": "LINE", "icon": "🟢", "category": "messaging",
     "description": "LINE Messaging API — popular in Japan/Asia",
     "status": "available", "docs": "https://developers.line.biz/en/docs/messaging-api/",
     "fields": [{"key": "channel_token", "label": "Channel Access Token", "type": "password"},
                {"key": "channel_secret", "label": "Channel Secret", "type": "password"}]},
    {"id": "viber", "name": "Viber", "icon": "💜", "category": "messaging",
     "description": "Viber Bot API — messaging and broadcasting",
     "status": "available", "docs": "https://developers.viber.com/docs/api/rest-bot-api/",
     "fields": [{"key": "auth_token", "label": "Auth Token", "type": "password"}]},
    {"id": "messenger", "name": "Messenger", "icon": "💙", "category": "messaging",
     "description": "Facebook Messenger Platform — chatbots",
     "status": "available", "docs": "https://developers.facebook.com/docs/messenger-platform",
     "fields": [{"key": "page_token", "label": "Page Access Token", "type": "password"},
                {"key": "verify_token", "label": "Verify Token", "type": "text"}]},
    {"id": "threema", "name": "Threema", "icon": "🟨", "category": "messaging",
     "description": "Swiss encrypted messaging — Gateway API",
     "status": "available", "docs": "https://gateway.threema.ch/en/developer/api",
     "fields": [{"key": "api_id", "label": "API Identity", "type": "text"},
                {"key": "api_secret", "label": "API Secret", "type": "password"}]},
    {"id": "keybase", "name": "Keybase", "icon": "🔑", "category": "messaging",
     "description": "Encrypted team messaging — Keybase Bot API",
     "status": "available", "docs": "https://keybase.io/docs/bots",
     "fields": [{"key": "username", "label": "Bot Username", "type": "text"},
                {"key": "paperkey", "label": "Paper Key", "type": "password"}]},

    # ── Social ──
    {"id": "reddit", "name": "Reddit", "icon": "🔴", "category": "social",
     "description": "Monitor subreddits, reply to threads, manage posts",
     "status": "available", "docs": "https://www.reddit.com/dev/api/",
     "fields": [{"key": "client_id", "label": "Client ID", "type": "text"},
                {"key": "client_secret", "label": "Client Secret", "type": "password"},
                {"key": "username", "label": "Username", "type": "text"},
                {"key": "password", "label": "Password", "type": "password"}]},
    {"id": "mastodon", "name": "Mastodon", "icon": "🐘", "category": "social",
     "description": "Fediverse microblogging — ActivityPub compatible",
     "status": "available", "docs": "https://docs.joinmastodon.org/api/",
     "fields": [{"key": "instance_url", "label": "Instance URL", "type": "text"},
                {"key": "access_token", "label": "Access Token", "type": "password"}]},
    {"id": "bluesky", "name": "Bluesky", "icon": "🦋", "category": "social",
     "description": "AT Protocol — decentralized social network",
     "status": "available", "docs": "https://docs.bsky.app/",
     "fields": [{"key": "handle", "label": "Handle", "type": "text"},
                {"key": "app_password", "label": "App Password", "type": "password"}]},
    {"id": "linkedin", "name": "LinkedIn", "icon": "🔗", "category": "social",
     "description": "Professional network — posts, messaging, company pages",
     "status": "available", "docs": "https://learn.microsoft.com/en-us/linkedin/",
     "fields": [{"key": "access_token", "label": "OAuth Access Token", "type": "password"}]},
    {"id": "nostr", "name": "Nostr", "icon": "🟣", "category": "social",
     "description": "Decentralized social protocol — censorship-resistant",
     "status": "available", "docs": "https://github.com/nostr-protocol/nostr",
     "fields": [{"key": "nsec", "label": "Private Key (nsec)", "type": "password"},
                {"key": "relays", "label": "Relay URLs (comma-separated)", "type": "text"}]},

    # ── Enterprise ──
    {"id": "teams", "name": "Microsoft Teams", "icon": "🟦", "category": "enterprise",
     "description": "Teams Bot Framework — channels, 1:1, adaptive cards",
     "status": "available", "docs": "https://learn.microsoft.com/en-us/microsoftteams/platform/bots/",
     "fields": [{"key": "app_id", "label": "App ID", "type": "text"},
                {"key": "app_password", "label": "App Password", "type": "password"}]},
    {"id": "mattermost", "name": "Mattermost", "icon": "🔵", "category": "enterprise",
     "description": "Self-hosted Slack alternative — Bot accounts",
     "status": "available", "docs": "https://api.mattermost.com/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "bot_token", "label": "Bot Access Token", "type": "password"}]},
    {"id": "google_chat", "name": "Google Chat", "icon": "🟩", "category": "enterprise",
     "description": "Google Workspace chat — Spaces, DMs, cards",
     "status": "available", "docs": "https://developers.google.com/chat",
     "fields": [{"key": "service_account_json", "label": "Service Account JSON", "type": "textarea"}]},
    {"id": "webex", "name": "Webex", "icon": "🟧", "category": "enterprise",
     "description": "Cisco Webex Teams — messaging and meetings",
     "status": "available", "docs": "https://developer.webex.com/",
     "fields": [{"key": "bot_token", "label": "Bot Access Token", "type": "password"}]},
    {"id": "feishu", "name": "Feishu / Lark", "icon": "🐦", "category": "enterprise",
     "description": "ByteDance enterprise suite — China/global",
     "status": "available", "docs": "https://open.feishu.cn/",
     "fields": [{"key": "app_id", "label": "App ID", "type": "text"},
                {"key": "app_secret", "label": "App Secret", "type": "password"}]},
    {"id": "dingtalk", "name": "DingTalk", "icon": "🔔", "category": "enterprise",
     "description": "Alibaba workplace messaging — webhooks, mini apps",
     "status": "available", "docs": "https://open.dingtalk.com/",
     "fields": [{"key": "access_token", "label": "Webhook Access Token", "type": "password"},
                {"key": "secret", "label": "Secret (optional)", "type": "password"}]},
    {"id": "pumble", "name": "Pumble", "icon": "🫧", "category": "enterprise",
     "description": "Free Slack alternative — team messaging",
     "status": "available", "docs": "https://pumble.com/",
     "fields": [{"key": "webhook_url", "label": "Webhook URL", "type": "text"}]},
    {"id": "flock", "name": "Flock", "icon": "🐤", "category": "enterprise",
     "description": "Team collaboration and messaging",
     "status": "available", "docs": "https://docs.flock.com/",
     "fields": [{"key": "bot_token", "label": "Bot Token", "type": "password"}]},
    {"id": "twist", "name": "Twist", "icon": "🌀", "category": "enterprise",
     "description": "Thread-first team communication by Doist",
     "status": "available", "docs": "https://developer.twist.com/",
     "fields": [{"key": "oauth_token", "label": "OAuth Token", "type": "password"}]},
    {"id": "zulip", "name": "Zulip", "icon": "💧", "category": "enterprise",
     "description": "Open-source threaded team chat",
     "status": "available", "docs": "https://zulip.com/api/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "email", "label": "Bot Email", "type": "email"},
                {"key": "api_key", "label": "API Key", "type": "password"}]},

    # ── Developer ──
    {"id": "irc", "name": "IRC", "icon": "📡", "category": "developer",
     "description": "Internet Relay Chat — classic protocol",
     "status": "available", "docs": "",
     "fields": [{"key": "server", "label": "Server", "type": "text"},
                {"key": "nickname", "label": "Nickname", "type": "text"},
                {"key": "channel", "label": "Channel", "type": "text"}]},
    {"id": "xmpp", "name": "XMPP / Jabber", "icon": "📨", "category": "developer",
     "description": "Extensible Messaging and Presence Protocol",
     "status": "available", "docs": "https://xmpp.org/",
     "fields": [{"key": "jid", "label": "JID", "type": "text"},
                {"key": "password", "label": "Password", "type": "password"}]},
    {"id": "gitter", "name": "Gitter", "icon": "💬", "category": "developer",
     "description": "Developer chat rooms — Matrix-powered",
     "status": "available", "docs": "https://developer.gitter.im/docs/",
     "fields": [{"key": "access_token", "label": "Access Token", "type": "password"}]},
    {"id": "discourse", "name": "Discourse", "icon": "💬", "category": "developer",
     "description": "Community forum platform — webhooks & API",
     "status": "available", "docs": "https://docs.discourse.org/",
     "fields": [{"key": "base_url", "label": "Forum URL", "type": "text"},
                {"key": "api_key", "label": "API Key", "type": "password"},
                {"key": "api_username", "label": "API Username", "type": "text"}]},
    {"id": "revolt", "name": "Revolt", "icon": "🔴", "category": "developer",
     "description": "Open-source Discord alternative",
     "status": "available", "docs": "https://developers.revolt.chat/",
     "fields": [{"key": "bot_token", "label": "Bot Token", "type": "password"}]},
    {"id": "guilded", "name": "Guilded", "icon": "🟡", "category": "developer",
     "description": "Gaming community platform — bots & webhooks",
     "status": "available", "docs": "https://www.guilded.gg/docs/api/",
     "fields": [{"key": "bot_token", "label": "Bot Token", "type": "password"}]},
    {"id": "nextcloud_talk", "name": "Nextcloud Talk", "icon": "☁️", "category": "developer",
     "description": "Self-hosted video & messaging",
     "status": "available", "docs": "https://nextcloud-talk.readthedocs.io/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "username", "label": "Username", "type": "text"},
                {"key": "password", "label": "Password", "type": "password"}]},
    {"id": "rocketchat", "name": "Rocket.Chat", "icon": "🚀", "category": "developer",
     "description": "Open-source team communication",
     "status": "available", "docs": "https://developer.rocket.chat/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "user_id", "label": "User ID", "type": "text"},
                {"key": "auth_token", "label": "Auth Token", "type": "password"}]},
    {"id": "twitch", "name": "Twitch", "icon": "🟣", "category": "developer",
     "description": "Live streaming chat — IRC-based bot",
     "status": "available", "docs": "https://dev.twitch.tv/docs/irc/",
     "fields": [{"key": "oauth_token", "label": "OAuth Token", "type": "password"},
                {"key": "channel", "label": "Channel", "type": "text"}]},

    # ── Notifications ──
    {"id": "ntfy", "name": "ntfy", "icon": "🔔", "category": "notifications",
     "description": "Simple push notifications via HTTP",
     "status": "available", "docs": "https://ntfy.sh/docs/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "topic", "label": "Topic", "type": "text"}]},
    {"id": "gotify", "name": "Gotify", "icon": "📣", "category": "notifications",
     "description": "Self-hosted push notification server",
     "status": "available", "docs": "https://gotify.net/docs/",
     "fields": [{"key": "server_url", "label": "Server URL", "type": "text"},
                {"key": "app_token", "label": "App Token", "type": "password"}]},
    {"id": "webhook", "name": "Webhook", "icon": "🔗", "category": "notifications",
     "description": "Generic HTTP webhook — POST JSON to any URL",
     "status": "available", "docs": "",
     "fields": [{"key": "url", "label": "Webhook URL", "type": "text"},
                {"key": "secret", "label": "Secret (optional)", "type": "password"}]},
    {"id": "mumble", "name": "Mumble", "icon": "🎙️", "category": "notifications",
     "description": "Open-source voice chat — low latency",
     "status": "available", "docs": "https://wiki.mumble.info/",
     "fields": [{"key": "server", "label": "Server", "type": "text"},
                {"key": "port", "label": "Port", "type": "text"},
                {"key": "username", "label": "Username", "type": "text"}]},
]

# ── In-memory config store ──────────────────────────────
_channel_configs: dict[str, dict] = {}


class ChannelConfigRequest(BaseModel):
    config: dict


@router.get("")
@router.get("/")
async def list_channels():
    """List all 40 available channels."""
    channels = []
    for ch in CHANNELS:
        channels.append({
            **ch,
            "connected": ch["id"] in _channel_configs,
        })
    categories = {}
    for ch in channels:
        cat = ch["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(ch)
    return {
        "channels": channels,
        "total": len(channels),
        "categories": categories,
        "connected_count": len(_channel_configs),
    }


@router.get("/{channel_id}")
async def get_channel(channel_id: str):
    """Get a specific channel's details."""
    for ch in CHANNELS:
        if ch["id"] == channel_id:
            return {**ch, "connected": channel_id in _channel_configs}
    raise HTTPException(status_code=404, detail="Channel not found")


@router.post("/{channel_id}/connect")
async def connect_channel(channel_id: str, req: ChannelConfigRequest):
    """Connect/configure a channel."""
    found = None
    for ch in CHANNELS:
        if ch["id"] == channel_id:
            found = ch
            break
    if not found:
        raise HTTPException(status_code=404, detail="Channel not found")
    _channel_configs[channel_id] = req.config
    return {"status": "connected", "channel_id": channel_id}


@router.delete("/{channel_id}/disconnect")
async def disconnect_channel(channel_id: str):
    """Disconnect a channel."""
    if channel_id in _channel_configs:
        del _channel_configs[channel_id]
    return {"status": "disconnected", "channel_id": channel_id}
