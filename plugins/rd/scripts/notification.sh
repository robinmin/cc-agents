#!/usr/bin/env bash

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Notification Hook - React to Claude Code Notifications
# ═══════════════════════════════════════════════════════════════════════════
#
# This script runs when Claude Code sends a notification to the user.
# Use for logging, external integrations, or custom notification handling.
#
# Exit codes:
#   0 - Success
#   1 - Warning (non-critical)
#   2 - Failure
#
# Environment variables used:
#   CLAUDE_PROJECT_DIR  - Directory of the project
#   CLAUDE_PLUGIN_ROOT  - Plugin root directory
#
# Hook input (JSON via stdin):
#   - message: The notification message
#   - title: Optional notification title
#   - type: Notification type (info, warning, error, success)
#
# ═══════════════════════════════════════════════════════════════════════════

# Read JSON from stdin (hook input)
INPUT=$(cat)

# Extract notification details
MESSAGE=$(echo "$INPUT" | jq -r '.message // empty')
TITLE=$(echo "$INPUT" | jq -r '.title // empty')
TYPE=$(echo "$INPUT" | jq -r '.type // "info"')

# Early exit if no message
if [[ -z "$MESSAGE" ]]; then
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# NOTIFICATION LOGGING
# ═══════════════════════════════════════════════════════════════════════════

LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/logs"
LOG_FILE="$LOG_DIR/notifications.log"

# Create log directory if it doesn't exist
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  mkdir -p "$LOG_DIR" 2>/dev/null || true
fi

# Log notification
if [[ -d "$LOG_DIR" ]]; then
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Format log entry
  LOG_ENTRY="[${TIMESTAMP}] [${TYPE^^}]"
  if [[ -n "$TITLE" ]]; then
    LOG_ENTRY="$LOG_ENTRY $TITLE:"
  fi
  LOG_ENTRY="$LOG_ENTRY $MESSAGE"

  echo "$LOG_ENTRY" >> "$LOG_FILE" 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# OPTIONAL: SYSTEM NOTIFICATION (macOS)
# ═══════════════════════════════════════════════════════════════════════════

# Uncomment to enable native macOS notifications for errors/warnings
# This requires terminal-notifier or osascript

# if [[ "$TYPE" == "error" || "$TYPE" == "warning" ]]; then
#   if command -v terminal-notifier &>/dev/null; then
#     terminal-notifier -title "Claude Code: ${TITLE:-Notification}" \
#       -message "$MESSAGE" \
#       -sound "default" 2>/dev/null || true
#   elif command -v osascript &>/dev/null; then
#     osascript -e "display notification \"$MESSAGE\" with title \"Claude Code: ${TITLE:-Notification}\"" 2>/dev/null || true
#   fi
# fi

# ═══════════════════════════════════════════════════════════════════════════
# OPTIONAL: WEBHOOK INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════

# Uncomment and configure to send notifications to external services
# Example: Slack, Discord, or custom webhook

# WEBHOOK_URL="${CLAUDE_NOTIFICATION_WEBHOOK:-}"
# if [[ -n "$WEBHOOK_URL" && ("$TYPE" == "error" || "$TYPE" == "warning") ]]; then
#   curl -s -X POST "$WEBHOOK_URL" \
#     -H "Content-Type: application/json" \
#     -d "{\"text\": \"[$TYPE] ${TITLE:-Claude Code}: $MESSAGE\"}" \
#     2>/dev/null || true
# fi

# ═══════════════════════════════════════════════════════════════════════════
# SUCCESS
# ═══════════════════════════════════════════════════════════════════════════

exit 0
