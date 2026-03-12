#!/bin/bash
# Uninstall Delirium auto-start
AGENT_DIR="$HOME/Library/LaunchAgents"
launchctl unload "$AGENT_DIR/com.delirium.backend.plist" 2>/dev/null
launchctl unload "$AGENT_DIR/com.delirium.frontend.plist" 2>/dev/null
rm -f "$AGENT_DIR/com.delirium.backend.plist" "$AGENT_DIR/com.delirium.frontend.plist"
echo "✅ Auto-start removed."
