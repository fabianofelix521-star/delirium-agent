#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Delirium Infinite - Auto-start installer for macOS
# Creates LaunchAgents to start backend + frontend on login
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/Delirium"

mkdir -p "$AGENT_DIR" "$LOG_DIR"

PYTHON="/usr/local/bin/python3"
NPM="/usr/local/bin/npm"

# Detect if node/npm are in a different path
if ! command -v "$NPM" &>/dev/null; then
  NPM="$(which npm 2>/dev/null || echo '/opt/homebrew/bin/npm')"
fi
if ! command -v "$PYTHON" &>/dev/null; then
  PYTHON="$(which python3 2>/dev/null || echo '/opt/homebrew/bin/python3')"
fi

echo "🚀 Installing Delirium Infinite auto-start..."
echo "   Project: $PROJECT_DIR"
echo "   Python:  $PYTHON"
echo "   NPM:     $NPM"

# ─── Backend LaunchAgent ─────────────────────────────────
cat > "$AGENT_DIR/com.delirium.backend.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.delirium.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON}</string>
        <string>-m</string>
        <string>uvicorn</string>
        <string>main:app</string>
        <string>--host</string>
        <string>0.0.0.0</string>
        <string>--port</string>
        <string>8000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}/backend</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONPATH</key>
        <string>${PROJECT_DIR}/backend</string>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/backend.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/backend-error.log</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
EOF

# ─── Frontend LaunchAgent ────────────────────────────────
cat > "$AGENT_DIR/com.delirium.frontend.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.delirium.frontend</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NPM}</string>
        <string>run</string>
        <string>dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}/frontend</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
        <key>NODE_ENV</key>
        <string>development</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/frontend.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/frontend-error.log</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
</dict>
</plist>
EOF

# ─── Load agents ─────────────────────────────────────────
launchctl unload "$AGENT_DIR/com.delirium.backend.plist" 2>/dev/null || true
launchctl unload "$AGENT_DIR/com.delirium.frontend.plist" 2>/dev/null || true
launchctl load "$AGENT_DIR/com.delirium.backend.plist"
launchctl load "$AGENT_DIR/com.delirium.frontend.plist"

echo ""
echo "✅ Auto-start installed! Delirium will start on login."
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   Logs:     $LOG_DIR/"
echo ""
echo "   To stop:  launchctl unload ~/Library/LaunchAgents/com.delirium.backend.plist"
echo "             launchctl unload ~/Library/LaunchAgents/com.delirium.frontend.plist"
echo ""
echo "   To remove: bash $SCRIPT_DIR/uninstall-autostart.sh"
