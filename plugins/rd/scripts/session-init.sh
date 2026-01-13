#!/usr/bin/env bash

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# SessionStart Hook - Initialization Script
# ═══════════════════════════════════════════════════════════════════════════
#
# This script initializes the Claude Code session with environment variables
# and helpful aliases.
#
# Exit codes:
#   0 - Success
#   1 - Warning (non-critical)
#   2 - Failure
#
# Environment variables used:
#   CLAUDE_PROJECT_DIR  - Directory of the project
#   CLAUDE_ENV_FILE     - Path to the environment file (for exports)
#
# ═══════════════════════════════════════════════════════════════════════════

# Ensure we have the env file path
if [[ -z "${CLAUDE_ENV_FILE:-}" ]]; then
  echo "WARNING: CLAUDE_ENV_FILE not set, skipping environment setup" >&2
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# PROJECT ENVIRONMENT
# ═══════════════════════════════════════════════════════════════════════════

# Export project root
if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
  echo "export PROJECT_ROOT=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
fi

# Load project-specific .env if exists (safely - skip secrets)
if [[ -f "${CLAUDE_PROJECT_DIR:-.}/.env" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue

    # Skip lines containing sensitive patterns
    if [[ "$line" =~ (SECRET|PASSWORD|TOKEN|KEY|CREDENTIAL|PRIVATE) ]]; then
      continue
    fi

    # Export safe variables
    echo "export $line" >> "$CLAUDE_ENV_FILE"
  done < "${CLAUDE_PROJECT_DIR:-.}/.env"
fi

# ═══════════════════════════════════════════════════════════════════════════
# TOOL AVAILABILITY
# ═══════════════════════════════════════════════════════════════════════════

# Check for commonly used tools and set availability flags
declare -A TOOLS=(
  ["BIOME_AVAILABLE"]="biome"
  ["RUFF_AVAILABLE"]="ruff"
  ["SHFMT_AVAILABLE"]="shfmt"
  ["SHELLCHECK_AVAILABLE"]="shellcheck"
  ["GH_AVAILABLE"]="gh"
  ["JQ_AVAILABLE"]="jq"
  ["GLOW_AVAILABLE"]="glow"
)

for var in "${!TOOLS[@]}"; do
  tool="${TOOLS[$var]}"
  if command -v "$tool" &>/dev/null; then
    echo "export ${var}=true" >> "$CLAUDE_ENV_FILE"
  else
    echo "export ${var}=false" >> "$CLAUDE_ENV_FILE"
  fi
done

# # ═══════════════════════════════════════════════════════════════════════════
# # TASK MANAGEMENT SETUP
# # ═══════════════════════════════════════════════════════════════════════════

# # Check if tasks tool is available
# if command -v tasks &>/dev/null; then
#   echo "export TASKS_AVAILABLE=true" >> "$CLAUDE_ENV_FILE"
# else
#   # Check for local tasks script
#   TASKS_SCRIPT="${CLAUDE_PROJECT_DIR:-}/plugins/rd/scripts/tasks.sh"
#   if [[ -f "$TASKS_SCRIPT" ]]; then
#     echo "export TASKS_AVAILABLE=true" >> "$CLAUDE_ENV_FILE"
#     echo "export TASKS_SCRIPT=\"$TASKS_SCRIPT\"" >> "$CLAUDE_ENV_FILE"
#   else
#     echo "export TASKS_AVAILABLE=false" >> "$CLAUDE_ENV_FILE"
#   fi
# fi

# # Check for docs/prompts directory (task management location)
# if [[ -d "${CLAUDE_PROJECT_DIR:-}/docs/prompts" ]]; then
#   echo "export PROMPTS_DIR=\"${CLAUDE_PROJECT_DIR}/docs/prompts\"" >> "$CLAUDE_ENV_FILE"
# fi

# ═══════════════════════════════════════════════════════════════════════════
# GIT CONTEXT
# ═══════════════════════════════════════════════════════════════════════════

if [[ -d "${CLAUDE_PROJECT_DIR:-}/.git" ]]; then
  # Get current branch
  CURRENT_BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null || echo "")
  if [[ -n "$CURRENT_BRANCH" ]]; then
    echo "export GIT_BRANCH=\"$CURRENT_BRANCH\"" >> "$CLAUDE_ENV_FILE"
  fi

  # Get default branch
  DEFAULT_BRANCH=$(git -C "${CLAUDE_PROJECT_DIR:-.}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
  echo "export GIT_DEFAULT_BRANCH=\"$DEFAULT_BRANCH\"" >> "$CLAUDE_ENV_FILE"
fi

# ═══════════════════════════════════════════════════════════════════════════
# SESSION HELPERS
# ═══════════════════════════════════════════════════════════════════════════

# Set timestamp for session start
echo "export SESSION_START=\"$(date '+%Y-%m-%d %H:%M:%S')\"" >> "$CLAUDE_ENV_FILE"

exit 0
