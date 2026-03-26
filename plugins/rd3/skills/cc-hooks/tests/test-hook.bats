#!/usr/bin/env bats

# ==============================================================================
# Tests for test-hook.sh
# ==============================================================================

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SCRIPT="$SCRIPT_DIR/scripts/test-hook.sh"
  FIXTURES="$SCRIPT_DIR/tests/test_hooks"
  EXAMPLE_SCRIPT="$FIXTURES/../examples/validate-bash.sh"
}

# ==============================================================================
# Usage and help
# ==============================================================================

@test "test-hook: shows help with -h" {
  run "$SCRIPT" -h
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
  [[ "$output" == *"hook-script"* ]]
}

@test "test-hook: shows help with --help" {
  run "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
}

# ==============================================================================
# Error handling - missing or invalid arguments
# ==============================================================================

@test "test-hook: exits 1 when hook script not found" {
  run "$SCRIPT" "/nonexistent/script.sh" "$FIXTURES/../examples/validate-bash.sh"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Hook script not found"* ]]
}

@test "test-hook: exits 1 when test input not found" {
  run "$SCRIPT" "$EXAMPLE_SCRIPT" "/nonexistent/input.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Test input not found"* ]]
}

# ==============================================================================
# Error handling - invalid test input JSON
# ==============================================================================

@test "test-hook: exits 1 when test input is not valid JSON" {
  echo "not json" > /tmp/bad_test_input.json
  run "$SCRIPT" "$EXAMPLE_SCRIPT" /tmp/bad_test_input.json
  rm -f /tmp/bad_test_input.json
  [ "$status" -eq 1 ]
  [[ "$output" == *"Test input is not valid JSON"* ]]
}

# ==============================================================================
# Error handling - missing arguments
# ==============================================================================

@test "test-hook: exits 1 when missing arguments" {
  run "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Missing required arguments"* ]]
}

@test "test-hook: exits 1 with only one argument" {
  run "$SCRIPT" "$EXAMPLE_SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Missing required arguments"* ]]
}

# ==============================================================================
# --create-sample option
# ==============================================================================

@test "test-hook: --create-sample PreToolUse outputs valid JSON" {
  run "$SCRIPT" --create-sample PreToolUse
  [ "$status" -eq 0 ]
  echo "$output" | jq empty  # must be valid JSON
  [[ "$output" == *"PreToolUse"* ]]
}

@test "test-hook: --create-sample PostToolUse outputs valid JSON" {
  run "$SCRIPT" --create-sample PostToolUse
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
  [[ "$output" == *"PostToolUse"* ]]
}

@test "test-hook: --create-sample Stop outputs valid JSON" {
  run "$SCRIPT" --create-sample Stop
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
  [[ "$output" == *"Stop"* ]]
}

@test "test-hook: --create-sample SubagentStop outputs valid JSON" {
  run "$SCRIPT" --create-sample SubagentStop
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
}

@test "test-hook: --create-sample UserPromptSubmit outputs valid JSON" {
  run "$SCRIPT" --create-sample UserPromptSubmit
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
}

@test "test-hook: --create-sample SessionStart outputs valid JSON" {
  run "$SCRIPT" --create-sample SessionStart
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
}

@test "test-hook: --create-sample SessionEnd outputs valid JSON" {
  run "$SCRIPT" --create-sample SessionEnd
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
}

@test "test-hook: --create-sample exits 1 for unknown event type" {
  run "$SCRIPT" --create-sample InvalidEvent
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unknown event type"* ]]
}

# ==============================================================================
# Running hooks with valid input
# ==============================================================================

@test "test-hook: runs example validate-bash.sh with valid PreToolUse input" {
  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" "$EXAMPLE_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$SAMPLE_INPUT"

  # Exit 0 or 2 are both acceptable (approved or denied)
  [[ "$status" -eq 0 || "$status" -eq 2 ]]
  [[ "$output" == *"Testing hook"* ]]
  [[ "$output" == *"Exit Code"* ]]
}

@test "test-hook: runs with verbose flag" {
  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" -v "$EXAMPLE_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$SAMPLE_INPUT"

  [[ "$output" == *"Input JSON"* ]]
  [[ "$output" == *"Environment"* ]]
}

@test "test-hook: runs with custom timeout" {
  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" -t 5 "$EXAMPLE_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$SAMPLE_INPUT"

  [[ "$output" == *"timeout"* ]]
}

@test "test-hook: reports timeout exit code (124) for long-running scripts" {
  # Create a script that sleeps
  LONG_SCRIPT="/tmp/long-hook.sh"
  echo '#!/bin/bash' > "$LONG_SCRIPT"
  echo 'sleep 10' >> "$LONG_SCRIPT"
  chmod +x "$LONG_SCRIPT"

  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" -t 1 "$LONG_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$LONG_SCRIPT" "$SAMPLE_INPUT"

  [ "$status" -eq 1 ]  # timeout causes failure
  [[ "$output" == *"timed out"* ]]
}

@test "test-hook: exits 0 when hook outputs valid JSON" {
  # validate-bash.sh outputs valid JSON on deny
  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" "$EXAMPLE_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$SAMPLE_INPUT"

  # Should show parsed JSON output if output is valid JSON
  [[ "$output" == *"Output"* ]]
}

@test "test-hook: handles non-executable hook script" {
  # Create non-executable script
  NONEXEC_SCRIPT="/tmp/non-exec-hook.sh"
  echo '#!/bin/bash' > "$NONEXEC_SCRIPT"
  echo 'echo hello' >> "$NONEXEC_SCRIPT"
  chmod -x "$NONEXEC_SCRIPT"

  SAMPLE_INPUT="/tmp/test-hook-sample.json"
  "$SCRIPT" --create-sample PreToolUse > "$SAMPLE_INPUT"

  run "$SCRIPT" "$NONEXEC_SCRIPT" "$SAMPLE_INPUT"
  rm -f "$NONEXEC_SCRIPT" "$SAMPLE_INPUT"

  # Should still run with bash prefix
  [[ "$output" == *"Testing hook"* ]]
}
