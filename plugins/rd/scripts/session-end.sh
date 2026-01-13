#!/usr/bin/env bash

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# SessionEnd Hook - Cleanup Script
# ═══════════════════════════════════════════════════════════════════════════
#
# This script runs when the Claude Code session ends. Use for cleanup,
# logging, and state preservation.
#
# Exit codes:
#   0 - Success
#   1 - Warning (non-critical)
#   2 - Failure
#
# Environment variables used:
#   CLAUDE_PROJECT_DIR  - Directory of the project
#   CLAUDE_PLUGIN_ROOT  - Plugin root directory
#   SESSION_START       - Timestamp when session started (from session-init.sh)
#
# ═══════════════════════════════════════════════════════════════════════════

# Read JSON from stdin (hook input)
INPUT=$(cat)

# ═══════════════════════════════════════════════════════════════════════════
# SESSION LOGGING
# ═══════════════════════════════════════════════════════════════════════════

LOG_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/logs"
LOG_FILE="$LOG_DIR/sessions.log"

# Create log directory if it doesn't exist
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  mkdir -p "$LOG_DIR" 2>/dev/null || true
fi

# Log session end timestamp
if [[ -d "$LOG_DIR" ]]; then
  SESSION_END=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${SESSION_END}] Session ended" >> "$LOG_FILE" 2>/dev/null || true

  # Log session duration if SESSION_START is available
  if [[ -n "${SESSION_START:-}" ]]; then
    # Calculate duration (best effort)
    START_EPOCH=$(date -j -f "%Y-%m-%d %H:%M:%S" "$SESSION_START" "+%s" 2>/dev/null || echo "0")
    END_EPOCH=$(date "+%s")
    if [[ "$START_EPOCH" != "0" ]]; then
      DURATION=$((END_EPOCH - START_EPOCH))
      MINUTES=$((DURATION / 60))
      SECONDS=$((DURATION % 60))
      echo "[${SESSION_END}] Session duration: ${MINUTES}m ${SECONDS}s" >> "$LOG_FILE" 2>/dev/null || true
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# CLEANUP TASKS
# ═══════════════════════════════════════════════════════════════════════════

# Clean up any temporary files created during the session
TEMP_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/tmp"
if [[ -d "$TEMP_DIR" ]]; then
  # Remove files older than 1 day
  find "$TEMP_DIR" -type f -mtime +1 -delete 2>/dev/null || true
  # Remove empty directories
  find "$TEMP_DIR" -type d -empty -delete 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# STATE PRESERVATION
# ═══════════════════════════════════════════════════════════════════════════

# Save last session info for potential recovery
STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/last-session.json"
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true

  cat > "$STATE_FILE" 2>/dev/null << EOF || true
{
  "ended_at": "$(date '+%Y-%m-%d %H:%M:%S')",
  "started_at": "${SESSION_START:-unknown}",
  "project_dir": "${CLAUDE_PROJECT_DIR:-}",
  "git_branch": "${GIT_BRANCH:-unknown}"
}
EOF
fi

# ═══════════════════════════════════════════════════════════════════════════
# SUCCESS
# ═══════════════════════════════════════════════════════════════════════════

exit 0
