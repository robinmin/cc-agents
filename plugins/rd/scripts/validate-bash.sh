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
#   CLAUDE_TOOL_INPUT - JSON input to the tool (from stdin)
#
# ═══════════════════════════════════════════════════════════════════════════

# Read JSON from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Early exit if no command
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# DENY PATTERNS - Block these immediately (high risk)
# ═══════════════════════════════════════════════════════════════════════════

DENY_PATTERNS=(
  # Destructive file operations
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \$HOME"
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
  if [[ "$COMMAND" =~ $pattern ]]; then
    echo "BLOCKED: Dangerous command pattern detected: $pattern" >&2
    exit 2
  fi
done

# ═══════════════════════════════════════════════════════════════════════════
# ASK PATTERNS - Warn but allow (require attention)
# ═══════════════════════════════════════════════════════════════════════════

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
  # Pipe to shell from internet
  "curl.*|.*sh"
  "curl.*|.*bash"
  "wget.*|.*sh"
  "wget.*|.*bash"
  "curl.*-s.*|.*sh"
  "wget.*-O-.*|.*sh"
)

for pattern in "${ASK_PATTERNS[@]}"; do
  if [[ "$COMMAND" == *"$pattern"* ]]; then
    echo "WARNING: Write operation detected: $pattern" >&2
    # Exit 1 = warn but allow
    exit 1
  fi
done

# ═══════════════════════════════════════════════════════════════════════════
# ADDITIONAL SAFETY CHECKS
# ═══════════════════════════════════════════════════════════════════════════

# Check for production database destructive operations
if [[ "$COMMAND" == *"prod"* ]] && [[ "$COMMAND" == *"DROP"* || "$COMMAND" == *"DELETE"* || "$COMMAND" == *"TRUNCATE"* ]]; then
  echo "BLOCKED: Production database destructive operation" >&2
  exit 2
fi

# Check for environment variable exposure
if [[ "$COMMAND" == *"printenv"* ]] || [[ "$COMMAND" == *"env"* && "$COMMAND" == *">"* ]]; then
  echo "WARNING: Environment variable exposure" >&2
  exit 1
fi

# Check for private key access
if [[ "$COMMAND" == *".ssh/id_"* ]] || [[ "$COMMAND" == *".gnupg/"* ]]; then
  echo "BLOCKED: Access to private keys" >&2
  exit 2
fi

# Command is allowed
exit 0
