#!/usr/bin/env bats

# ==============================================================================
# Tests for hook-list.sh
# ==============================================================================

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SCRIPT="$SCRIPT_DIR/scripts/hook-list.sh"
  FIXTURES="$SCRIPT_DIR/tests/test_configs"
}

# ==============================================================================
# Usage and error handling
# ==============================================================================

@test "hook-list: exits 0 for --help" {
  run "$SCRIPT" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
}

@test "hook-list: exits 1 for unknown option" {
  run "$SCRIPT" --badopt
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unknown option"* ]]
}

@test "hook-list: exits 1 for unexpected argument" {
  run "$SCRIPT" extra-arg
  [ "$status" -eq 1 ]
  [[ "$output" == *"Unexpected argument"* ]]
}

# ==============================================================================
# Table output
# ==============================================================================

@test "hook-list: shows header in table mode" {
  run "$SCRIPT" --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Active Hooks"* ]]
  [[ "$output" == *"PLATFORM"* ]]
  [[ "$output" == *"EVENT"* ]]
}

@test "hook-list: shows hook rows in table mode" {
  run "$SCRIPT" --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"PreToolUse"* ]]
  [[ "$output" == *"Stop"* ]]
  [[ "$output" == *"command"* ]]
}

@test "hook-list: shows total count" {
  run "$SCRIPT" --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"hook(s)"* ]]
  [[ "$output" == *"platform(s)"* ]]
}

@test "hook-list: shows matcher values" {
  run "$SCRIPT" --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"Write|Edit"* ]]
  [[ "$output" == *"*"* ]]
}

@test "hook-list: shows command values" {
  run "$SCRIPT" --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"validate-write"* ]]
}

# ==============================================================================
# JSON output
# ==============================================================================

@test "hook-list: --json produces valid JSON" {
  run "$SCRIPT" --json --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  # Validate JSON structure
  echo "$output" | jq empty
}

@test "hook-list: --json includes hooks array" {
  run "$SCRIPT" --json --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  count=$(echo "$output" | jq '.count')
  [ "$count" -ge 1 ]
}

@test "hook-list: --json includes hook fields" {
  run "$SCRIPT" --json --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  # Check first hook has all required fields
  echo "$output" | jq -e '.hooks[0].platform' > /dev/null
  echo "$output" | jq -e '.hooks[0].event' > /dev/null
  echo "$output" | jq -e '.hooks[0].matcher' > /dev/null
  echo "$output" | jq -e '.hooks[0].type' > /dev/null
  echo "$output" | jq -e '.hooks[0].command' > /dev/null
}

@test "hook-list: --json for custom config shows 'custom' platform" {
  run "$SCRIPT" --json --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  platform=$(echo "$output" | jq -r '.hooks[0].platform')
  [ "$platform" = "custom" ]
}

# ==============================================================================
# Platform filter
# ==============================================================================

@test "hook-list: --platform filters output" {
  run "$SCRIPT" --platform pi --config "$FIXTURES/pi.json"
  [ "$status" -eq 0 ]
  # Should show pi hooks from config
  [[ "$output" == *"session started"* ]] || [[ "$output" == *"pre-tool"* ]] || [[ "$output" == *"No hooks found"* ]]
}

@test "hook-list: --platform with no matching hooks shows message" {
  run "$SCRIPT" --platform codex --config "$FIXTURES/claude-code.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"No hooks found"* ]] || [[ "$output" == *"hook(s)"* ]]
}

# ==============================================================================
# Edge cases
# ==============================================================================

@test "hook-list: handles empty hooks config" {
  run "$SCRIPT" --config "$FIXTURES/empty.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"No hooks found"* ]] || [[ "$output" == *"0 hook(s)"* ]]
}

@test "hook-list: handles invalid JSON gracefully" {
  run "$SCRIPT" --config "$FIXTURES/invalid.json"
  [ "$status" -eq 0 ]
  # Should not crash — may show "No hooks found" or warning
  [[ "$output" == *"No hooks found"* ]] || [[ "$output" == *"hook(s)"* ]] || [[ "$output" == *"Invalid"* ]]
}

@test "hook-list: handles nonexistent config file" {
  run "$SCRIPT" --config "/nonexistent/hooks.json"
  [ "$status" -eq 0 ]
  # Should not crash — just won't find anything
  [[ "$output" == *"No hooks found"* ]] || [[ "$output" == *"0 hook(s)"* ]]
}

@test "hook-list: --json with empty config returns valid JSON" {
  run "$SCRIPT" --json --config "$FIXTURES/empty.json"
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
  count=$(echo "$output" | jq '.count')
  [ "$count" -eq 0 ]
}

@test "hook-list: --json with invalid config returns valid JSON" {
  run "$SCRIPT" --json --config "$FIXTURES/invalid.json"
  [ "$status" -eq 0 ]
  echo "$output" | jq empty
}

# ==============================================================================
# Multi-hook config
# ==============================================================================

@test "hook-list: abstract config shows correct event count" {
  run "$SCRIPT" --json --config "$FIXTURES/abstract.json"
  [ "$status" -eq 0 ]
  count=$(echo "$output" | jq '.count')
  [ "$count" -eq 2 ]
}

@test "hook-list: abstract config shows PreToolUse and PostToolUse" {
  run "$SCRIPT" --json --config "$FIXTURES/abstract.json"
  [ "$status" -eq 0 ]
  events=$(echo "$output" | jq -r '.hooks[].event' | sort -u | tr '\n' ',')
  [[ "$events" == *"PreToolUse"* ]]
  [[ "$events" == *"PostToolUse"* ]]
}

@test "hook-list: abstract config preserves matcher" {
  run "$SCRIPT" --json --config "$FIXTURES/abstract.json"
  [ "$status" -eq 0 ]
  matcher=$(echo "$output" | jq -r '.hooks[0].matcher')
  [ "$matcher" = "Bash" ]
}
