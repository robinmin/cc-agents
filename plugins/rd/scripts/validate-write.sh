#!/usr/bin/env bash

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# PreToolUse Hook - Permission-based Command Validator
# ═══════════════════════════════════════════════════════════════════════════
#
# This script validates Bash tool invocations against a permission system
# before execution. It's designed to be fast and deterministic.
#
# Exit codes:
#   0 - Command allowed
#   1 - Command warning (Non-critical warning)
#   2 - Command denied (returns JSON with continue: false)
#
# Environment variables used:
#   CLAUDE_TOOL_NAME  - Name of the tool being invoked
#   CLAUDE_TOOL_INPUT - JSON input to the tool
#
# ═══════════════════════════════════════════════════════════════════════════

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROTECTED_PATHS=(
  "/etc"
  "/usr"
  "/bin"
  "/sbin"
  "$HOME/.ssh"
  "$HOME/.gnupg"
)
for protected in "${PROTECTED_PATHS[@]}"; do
  if [[ "$FILE_PATH" == "$protected"* ]]; then
    echo "BLOCKED: Cannot write to protected path: $protected" >&2
    exit 2
  fi
done
# Warn about config file modifications
if [[ "$FILE_PATH" == *".env"* ]] || [[ "$FILE_PATH" == *"config"* ]]; then
  echo "WARNING: Modifying configuration file" >&2
  exit 1  # Warn but allow
fi
exit 0
