#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════════════
# RD2 Guard - Consolidated Hook Script
# ═══════════════════════════════════════════════════════════════════════════
#
# Multi-command hook script for rd2 plugin - supports session-init,
# session-end, validate-write, and validate-bash commands.
#
# Usage: bash rd2_guard.sh <command>
#   Commands:
#     session-init    - Initialize session (SessionStart hook)
#     session-end     - End session (SessionEnd hook)
#     validate-write  - Validate Write/Edit tools (PreToolUse hook)
#     validate-bash   - Validate Bash tool (PreToolUse hook)
#
# Exit codes:
#   0 - Success / Command allowed
#   1 - Warning (Non-critical warning, but allow operation)
#   2 - Failure / Command denied
#
# Environment variables:
#   CLAUDE_PROJECT_DIR - Directory of the project
#   CLAUDE_PLUGIN_ROOT - Plugin root directory
#   CLAUDE_ENV_FILE    - Path to environment file (session-init)
#   CLAUDE_TOOL_INPUT - JSON input to the tool (validate-* commands)
#
# ═══════════════════════════════════════════════════════════════════════════

set -eo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# SESSION-INIT COMMAND
# ═══════════════════════════════════════════════════════════════════════════

cmd_session_init() {
  # Ensure we have the env file path
  if [[ -z "${CLAUDE_ENV_FILE:-}" ]]; then
    echo "WARNING: CLAUDE_ENV_FILE not set, skipping environment setup" >&2
    exit 0
  fi

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

  # Check for commonly used tools and set availability flags
  # Compatible with bash 3.2 (macOS default)
  check_and_export_tool() {
    local var_name="$1"
    local tool_cmd="$2"
    if command -v "$tool_cmd" &>/dev/null; then
      echo "export ${var_name}=true" >> "$CLAUDE_ENV_FILE"
    else
      echo "export ${var_name}=false" >> "$CLAUDE_ENV_FILE"
    fi
  }

  check_and_export_tool "BIOME_AVAILABLE" "biome"
  check_and_export_tool "RUFF_AVAILABLE" "ruff"
  check_and_export_tool "SHFMT_AVAILABLE" "shfmt"
  check_and_export_tool "SHELLCHECK_AVAILABLE" "shellcheck"
  check_and_export_tool "GH_AVAILABLE" "gh"
  check_and_export_tool "JQ_AVAILABLE" "jq"
  check_and_export_tool "GLOW_AVAILABLE" "glow"

  # Git context
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

  # Set timestamp for session start
  echo "export SESSION_START=\"$(date '+%Y-%m-%d %H:%M:%S')\"" >> "$CLAUDE_ENV_FILE"

  exit 0
}

# ═══════════════════════════════════════════════════════════════════════════
# SESSION-END COMMAND
# ═══════════════════════════════════════════════════════════════════════════

cmd_session_end() {
  # Read JSON from stdin (hook input)
  INPUT=$(cat)

  # Session logging
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

  # Cleanup tasks
  TEMP_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/tmp"
  if [[ -d "$TEMP_DIR" ]]; then
    # Remove files older than 1 day
    find "$TEMP_DIR" -type f -mtime +1 -delete 2>/dev/null || true
    # Remove empty directories
    find "$TEMP_DIR" -type d -empty -delete 2>/dev/null || true
  fi

  # State preservation
  STATE_FILE="${CLAUDE_PROJECT_DIR:-.}/.claude/last-session.json"
  if [[ -n "${CLAUDE_PROJECT_DIR:-}" ]]; then
    mkdir -p "$(dirname "$STATE_FILE")" 2>/dev/null || true

    # Use jq to generate proper JSON (safely handles special characters)
    jq -n \
      --arg ended_at "$(date '+%Y-%m-%d %H:%M:%S')" \
      --arg started_at "${SESSION_START:-unknown}" \
      --arg project_dir "${CLAUDE_PROJECT_DIR:-}" \
      --arg git_branch "${GIT_BRANCH:-unknown}" \
      '{
        ended_at: $ended_at,
        started_at: $started_at,
        project_dir: $project_dir,
        git_branch: $git_branch
      }' > "$STATE_FILE" 2>/dev/null || true
  fi

  exit 0
}

# ═══════════════════════════════════════════════════════════════════════════
# VALIDATE-WRITE COMMAND
# ═══════════════════════════════════════════════════════════════════════════

cmd_validate_write() {
  # Read JSON from stdin
  INPUT=$(cat)
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

  # Protected paths - bash 3.2 compatible
  PROTECTED_PATHS="/etc /usr /bin /sbin"

  for protected in $PROTECTED_PATHS; do
    if [[ "$FILE_PATH" == "$protected"* ]]; then
      echo "BLOCKED: Cannot write to protected path: $protected" >&2
      exit 2
    fi
  done

  # Check home directory protected paths
  if [[ "$FILE_PATH" == "$HOME/.ssh"* ]] || [[ "$FILE_PATH" == "$HOME/.gnupg"* ]]; then
    echo "BLOCKED: Cannot write to protected path: $FILE_PATH" >&2
    exit 2
  fi

  # Warn about config file modifications
  if [[ "$FILE_PATH" == *".env"* ]] || [[ "$FILE_PATH" == *"config"* ]]; then
    echo "WARNING: Modifying configuration file" >&2
    exit 1  # Warn but allow
  fi

  exit 0
}

# ═══════════════════════════════════════════════════════════════════════════
# VALIDATE-BASH COMMAND
# ═══════════════════════════════════════════════════════════════════════════

cmd_validate_bash() {
  # Read JSON from stdin
  INPUT=$(cat)
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

  # Early exit if no command
  if [[ -z "$COMMAND" ]]; then
    exit 0
  fi

  # ═══════════════════════════════════════════════════════════════════════
  # DENY PATTERNS - Block these immediately (high risk)
  # ═══════════════════════════════════════════════════════════════════════

  DENY_PATTERNS=(
    # Destructive file operations
    "rm -rf /"
    "rm -rf ~"
    "rm -rf $HOME"
    "rm -rf /*"
    # Disk operations
    "mkfs"
    "fdisk"
    "parted"
    "diskutil erase"
    "diskutil partition"
    "dd if=/dev/zero"
    "dd if=/dev/random"
    "> /dev/sd"
    "> /dev/nvme"
    "> /dev/disk"
    # Fork bomb
    ":(){:|:&};:"
    # Sudo escalation
    "sudo rm"
    "sudo dd"
    "sudo su"
    "sudo -i"
    "sudo bash"
    # System control
    "shutdown"
    "reboot"
    "halt"
    "poweroff"
    "init 0"
    "init 6"
    # Process control (dangerous patterns)
    "kill -9 -1"
    "killall -9"
    "pkill -9 -"
    # Secure delete
    "shred"
    "wipe"
    "srm"
    # Git destructive operations
    "git reset --hard"
    "git clean -fd"
    "git push --force"
    "git push -f"
    "git filter-branch"
    "git reflog expire"
    # GitHub CLI destructive
    "gh repo delete"
    "gh release delete"
    # Permission changes on system paths
    "chmod -R 777 /"
    "chmod -R 000 /"
    "chown -R"
  )

  for pattern in "${DENY_PATTERNS[@]}"; do
    # Use glob matching for substring search (bash 3.2 compatible)
    case "$COMMAND" in
      *"$pattern"*)
        echo "BLOCKED: Dangerous command pattern detected: $pattern" >&2
        exit 2
        ;;
    esac
  done

  # ═══════════════════════════════════════════════════════════════════════
  # ASK PATTERNS - Warn but allow (require attention)
  # ═══════════════════════════════════════════════════════════════════════

  ASK_PATTERNS=(
    # Git write operations
    "git add"
    "git commit"
    "git push"
    "git pull"
    "git fetch"
    "git merge"
    "git rebase"
    "git checkout"
    "git switch"
    "git branch -d"
    "git branch -D"
    "git branch -m"
    "git tag -a"
    "git tag -d"
    "git stash"
    "git cherry-pick"
    "git revert"
    "git reset --soft"
    "git reset --mixed"
    "git restore"
    "git clone"
    "git init"
    "git remote add"
    "git remote remove"
    "git submodule"
    "git worktree"
    # GitHub CLI write operations
    "gh issue create"
    "gh issue edit"
    "gh issue close"
    "gh issue comment"
    "gh pr create"
    "gh pr edit"
    "gh pr merge"
    "gh pr close"
    "gh pr comment"
    "gh pr review"
    "gh pr checkout"
    "gh release create"
    "gh release edit"
    "gh repo create"
    "gh repo fork"
    "gh repo clone"
    "gh run rerun"
    "gh run cancel"
    "gh workflow run"
    # Publishing operations
    "npm publish"
    "pip upload"
    "docker push"
    # Pipe to shell from internet - these are checked separately below
    "curl"
    "wget"
  )

  for pattern in "${ASK_PATTERNS[@]}"; do
    # For curl/wget, check for pipe-to-shell pattern
    # For others, check for simple substring match
    if [[ "$pattern" == "curl" ]] || [[ "$pattern" == "wget" ]]; then
      case "$COMMAND" in
        *"${pattern}| sh"*|*"${pattern}| bash"*)
          echo "WARNING: Pipe to shell from internet detected: $pattern" >&2
          exit 1
          ;;
      esac
    else
      case "$COMMAND" in
        *"$pattern"*)
          echo "WARNING: Write operation detected: $pattern" >&2
          exit 1
          ;;
      esac
    fi
  done

  # ═══════════════════════════════════════════════════════════════════════
  # ADDITIONAL SAFETY CHECKS
  # ═══════════════════════════════════════════════════════════════════════

  # Check for production database destructive operations
  case "$COMMAND" in
    *"prod"*DROP*|*"prod"*DELETE*|*"prod"*TRUNCATE*)
      echo "BLOCKED: Production database destructive operation" >&2
      exit 2
      ;;
  esac

  # Check for environment variable exposure
  # Use grep for this specific check since case patterns don't handle '>' well
  if [[ "$COMMAND" == *"printenv"* ]] || [[ "$COMMAND" == *"env"* ]]; then
    case "$COMMAND" in
      *'>'*)
        echo "WARNING: Environment variable exposure" >&2
        exit 1
        ;;
    esac
  fi

  # Check for private key access
  case "$COMMAND" in
    *".ssh/id_"*|*".gnupg/"*)
      echo "BLOCKED: Access to private keys" >&2
      exit 2
      ;;
  esac

  # Command is allowed
  exit 0
}

# ═══════════════════════════════════════════════════════════════════════════
# COMMAND DISPATCH
# ═══════════════════════════════════════════════════════════════════════════

COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  session-init)
    cmd_session_init "$@"
    ;;
  session-end)
    cmd_session_end "$@"
    ;;
  validate-write)
    cmd_validate_write "$@"
    ;;
  validate-bash)
    cmd_validate_bash "$@"
    ;;
  *)
    echo "ERROR: Unknown command: $COMMAND" >&2
    echo "Usage: $0 {session-init|session-end|validate-write|validate-bash}" >&2
    exit 2
    ;;
esac

