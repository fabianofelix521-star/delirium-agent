#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Delirium Infinite - Auto-start installer for macOS
# Creates a LaunchAgent to start Docker Compose on login
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_DIR="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/Delirium"
PLIST_NAME="com.delirium.docker.plist"

mkdir -p "$AGENT_DIR" "$LOG_DIR"

# Make startup script executable
chmod +x "$SCRIPT_DIR/start-docker.sh"

echo "🚀 Installing Delirium Infinite auto-start (Docker)..."
echo "   Project: $PROJECT_DIR"
echo "   Script:  $SCRIPT_DIR/start-docker.sh"

# ─── Remove old agents (pre-Docker) ─────────────────────
for old in com.delirium.backend.plist com.delirium.frontend.plist; do
  if [ -f "$AGENT_DIR/$old" ]; then
    launchctl unload "$AGENT_DIR/$old" 2>/dev/null || true
    rm -f "$AGENT_DIR/$old"
    echo "   Removed old agent: $old"
  fi
done

# ─── Docker Compose LaunchAgent ──────────────────────────
cat > "$AGENT_DIR/$PLIST_NAME" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.delirium.docker</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${SCRIPT_DIR}/start-docker.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/startup.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/startup-error.log</string>
    <key>ThrottleInterval</key>
    <integer>30</integer>
</dict>
</plist>
EOF

# ─── Load agent ──────────────────────────────────────────
launchctl unload "$AGENT_DIR/$PLIST_NAME" 2>/dev/null || true
launchctl load "$AGENT_DIR/$PLIST_NAME"

echo ""
echo "✅ Auto-start installed! On login, Delirium will:"
echo "   1. Open Docker Desktop (if not running)"
echo "   2. Wait for Docker daemon to be ready"
echo "   3. Run 'docker compose up -d'"
echo ""
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:3000"
echo "   Logs:     $LOG_DIR/startup.log"
echo "   Logs:     $LOG_DIR/"
echo ""
echo "   To stop:  launchctl unload ~/Library/LaunchAgents/com.delirium.backend.plist"
echo "             launchctl unload ~/Library/LaunchAgents/com.delirium.frontend.plist"
echo ""
echo "   To remove: bash $SCRIPT_DIR/uninstall-autostart.sh"
