#!/usr/bin/env bats

# ==============================================================================
# Tests for hook-linter.sh
# ==============================================================================

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SCRIPT="$SCRIPT_DIR/scripts/hook-linter.sh"
  FIXTURES="$SCRIPT_DIR/tests/test_hooks"
}

# ==============================================================================
# Usage
# ==============================================================================

@test "hook-linter: exits 1 when no arguments" {
  run "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Usage"* ]]
}

# ==============================================================================
# Non-existent file
# ==============================================================================

@test "hook-linter: exits 1 when file not found" {
  run "$SCRIPT" "/nonexistent/script.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"File not found"* ]]
}

# ==============================================================================
# Good hook script - passes all checks
# ==============================================================================

@test "hook-linter: exits 0 for validate-bash.sh (good script)" {
  run "$SCRIPT" "$FIXTURES/../examples/validate-bash.sh"
  [ "$status" -eq 0 ]
  [[ "$output" == *"No issues found"* ]] || [[ "$output" == *"warning"* ]]
}

@test "hook-linter: exits 0 for validate-write.sh (good script)" {
  run "$SCRIPT" "$FIXTURES/../examples/validate-write.sh"
  [ "$status" -eq 0 ]
}

@test "hook-linter: exits 0 for load-context.sh (good script)" {
  run "$SCRIPT" "$FIXTURES/../examples/load-context.sh"
  [ "$status" -eq 0 ]
}

# ==============================================================================
# Script with missing shebang
# ==============================================================================

@test "hook-linter: detects missing shebang" {
  echo 'set -euo pipefail' > /tmp/no-shebang.sh
  run "$SCRIPT" /tmp/no-shebang.sh
  rm -f /tmp/no-shebang.sh
  [ "$status" -eq 1 ]
  [[ "$output" == *"Missing shebang"* ]]
}

# ==============================================================================
# Script with missing set -euo pipefail
# ==============================================================================

@test "hook-linter: warns about missing set -euo pipefail" {
  echo '#!/bin/bash' > /tmp/no-pipefail.sh
  echo 'echo hello' >> /tmp/no-pipefail.sh
  run "$SCRIPT" /tmp/no-pipefail.sh
  rm -f /tmp/no-pipefail.sh
  [[ "$output" == *"Missing 'set -euo pipefail'"* ]]
}

# ==============================================================================
# Script not reading stdin
# ==============================================================================

@test "hook-linter: warns about not reading stdin" {
  echo '#!/bin/bash' > /tmp/no-stdin.sh
  echo 'set -euo pipefail' >> /tmp/no-stdin.sh
  echo 'echo hello' >> /tmp/no-stdin.sh
  run "$SCRIPT" /tmp/no-stdin.sh
  rm -f /tmp/no-stdin.sh
  [[ "$output" == *"Doesn't appear to read input"* ]]
}

# ==============================================================================
# Script with hardcoded paths
# ==============================================================================

@test "hook-linter: warns about hardcoded absolute paths" {
  echo '#!/bin/bash' > /tmp/hardcoded-path.sh
  echo 'set -euo pipefail' >> /tmp/hardcoded-path.sh
  echo 'cat /usr/share/data.txt' >> /tmp/hardcoded-path.sh
  run "$SCRIPT" /tmp/hardcoded-path.sh
  rm -f /tmp/hardcoded-path.sh
  [[ "$output" == *"Hardcoded absolute paths"* ]]
}

# ==============================================================================
# Script with exit codes
# ==============================================================================

@test "hook-linter: warns about missing exit codes" {
  echo '#!/bin/bash' > /tmp/no-exit.sh
  echo 'set -euo pipefail' >> /tmp/no-exit.sh
  echo 'cat' >> /tmp/no-exit.sh
  run "$SCRIPT" /tmp/no-exit.sh
  rm -f /tmp/no-exit.sh
  [[ "$output" == *"No explicit exit codes"* ]]
}

# ==============================================================================
# Script with long-running commands
# ==============================================================================

@test "hook-linter: warns about long-running commands" {
  echo '#!/bin/bash' > /tmp/long-running.sh
  echo 'set -euo pipefail' >> /tmp/long-running.sh
  echo 'sleep 999' >> /tmp/long-running.sh
  run "$SCRIPT" /tmp/long-running.sh
  rm -f /tmp/long-running.sh
  [[ "$output" == *"Potentially long-running code"* ]]
}

# ==============================================================================
# Script with error messages not going to stderr
# ==============================================================================

@test "hook-linter: warns about error messages not to stderr" {
  echo '#!/bin/bash' > /tmp/no-stderr.sh
  echo 'set -euo pipefail' >> /tmp/no-stderr.sh
  echo 'echo "Error: something went wrong"' >> /tmp/no-stderr.sh
  run "$SCRIPT" /tmp/no-stderr.sh
  rm -f /tmp/no-stderr.sh
  [[ "$output" == *"Error messages should be written to stderr"* ]]
}

# ==============================================================================
# Script with unquoted variables
# ==============================================================================

@test "hook-linter: warns about unquoted variables" {
  echo '#!/bin/bash' > /tmp/unquoted.sh
  echo 'set -euo pipefail' >> /tmp/unquoted.sh
  echo 'input=$(cat)' >> /tmp/unquoted.sh
  echo 'echo $input' >> /tmp/unquoted.sh'  # unquoted
  run "$SCRIPT" /tmp/unquoted.sh
  rm -f /tmp/unquoted.sh
  [[ "$output" == *"Potentially unquoted variables"* ]]
}

# ==============================================================================
# Good script with shebang, pipefail, stdin, and proper exit codes
# ==============================================================================

@test "hook-linter: passes a well-formed hook script" {
  cat > /tmp/good-hook.sh << 'EOFSCRIPT'
#!/bin/bash
set -euo pipefail

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name')

if [[ ! "$tool_name" =~ ^[a-zA-Z0-9_]+$ ]]; then
  echo '{"decision": "deny", "reason": "Invalid tool name"}' >&2
  exit 2
fi

exit 0
EOFSCRIPT
  chmod +x /tmp/good-hook.sh
  run "$SCRIPT" /tmp/good-hook.sh
  rm -f /tmp/good-hook.sh
  [ "$status" -eq 0 ]
  [[ "$output" == *"No issues found"* ]]
}

# ==============================================================================
# Multiple scripts
# ==============================================================================

@test "hook-linter: handles multiple scripts" {
  run "$SCRIPT" "$FIXTURES/../examples/validate-bash.sh" "$FIXTURES/../examples/validate-write.sh"
  # Either all pass or some warnings
  [[ "$status" -eq 0 ]]
  [[ "$output" == *"All scripts passed"* ]]
}

# ==============================================================================
# Non-executable scripts
# ==============================================================================

@test "hook-linter: warns but continues for non-executable scripts" {
  echo '#!/bin/bash' > /tmp/non-exec-lint.sh
  echo 'set -euo pipefail' >> /tmp/non-exec-lint.sh
  chmod -x /tmp/non-exec-lint.sh
  run "$SCRIPT" /tmp/non-exec-lint.sh
  rm -f /tmp/non-exec-lint.sh
  [[ "$output" == *"Not executable"* ]]
}

# ==============================================================================
# PreToolUse/Stop hook JSON output
# ==============================================================================

@test "hook-linter: suggests JSON output for PreToolUse hooks" {
  echo '#!/bin/bash' > /tmp/no-json-output.sh
  echo 'set -euo pipefail' >> /tmp/no-json-output.sh
  echo 'cat' >> /tmp/no-json-output.sh
  echo '# PreToolUse hook' >> /tmp/no-json-output.sh
  run "$SCRIPT" /tmp/no-json-output.sh
  rm -f /tmp/no-json-output.sh
  [[ "$output" == *"PreToolUse/Stop hooks should output decision JSON"* ]]
}

# ==============================================================================
# Uses CLAUDE_PLUGIN_ROOT
# ==============================================================================

@test "hook-linter: does not warn when using CLAUDE_PLUGIN_ROOT" {
  echo '#!/bin/bash' > /tmp/uses-root.sh
  echo 'set -euo pipefail' >> /tmp/uses-root.sh
  echo 'input=$(cat)' >> /tmp/uses-root.sh
  printf '%s\n' 'cd "$CLAUDE_PLUGIN_ROOT"' >> /tmp/uses-root.sh
  run "$SCRIPT" /tmp/uses-root.sh
  rm -f /tmp/uses-root.sh
  [[ ! "$output" == *"Tip: Use"*CLAUDE_PLUGIN_ROOT"* ]]  # Should NOT have the tip
}
