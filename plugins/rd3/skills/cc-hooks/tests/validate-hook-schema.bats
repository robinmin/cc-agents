#!/usr/bin/env bats

# ==============================================================================
# Tests for validate-hook-schema.sh
# ==============================================================================

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SCRIPT="$SCRIPT_DIR/scripts/validate-hook-schema.sh"
  FIXTURES="$SCRIPT_DIR/tests/test_hooks"
}

# ==============================================================================
# Usage and error handling
# ==============================================================================

@test "validate-hook-schema: exits 1 when no arguments" {
  run "$SCRIPT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Usage"* ]]
}

@test "validate-hook-schema: exits 1 when file not found" {
  run "$SCRIPT" "/nonexistent/hooks.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"File not found"* ]]
}

# ==============================================================================
# JSON validation
# ==============================================================================

@test "validate-hook-schema: exits 0 for valid JSON" {
  run "$SCRIPT" "$FIXTURES/valid-minimal.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"✅ Valid JSON"* ]]
}

@test "validate-hook-schema: exits 1 for invalid JSON" {
  run "$SCRIPT" "$FIXTURES/invalid-json.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Invalid JSON"* ]]
}

# ==============================================================================
# Valid hooks.json cases
# ==============================================================================

@test "validate-hook-schema: exits 0 for valid-minimal.json" {
  run "$SCRIPT" "$FIXTURES/valid-minimal.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"✅ All checks passed"* ]]
}

@test "validate-hook-schema: exits 0 for valid-full.json" {
  run "$SCRIPT" "$FIXTURES/valid-full.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"✅ All checks passed"* ]]
}

# ==============================================================================
# Missing required fields
# ==============================================================================

@test "validate-hook-schema: exits 1 when matcher missing" {
  run "$SCRIPT" "$FIXTURES/invalid-no-matcher.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Missing 'matcher'"* ]]
}

@test "validate-hook-schema: exits 1 when type missing" {
  run "$SCRIPT" "$FIXTURES/invalid-no-type.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Missing 'type'"* ]]
}

@test "validate-hook-schema: exits 1 when type is invalid" {
  run "$SCRIPT" "$FIXTURES/invalid-bad-type.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Invalid type"* ]]
}

@test "validate-hook-schema: exits 1 when command hook missing command field" {
  run "$SCRIPT" "$FIXTURES/invalid-command-no-field.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Command hooks must have 'command'"* ]]
}

@test "validate-hook-schema: exits 1 when prompt hook missing prompt field" {
  run "$SCRIPT" "$FIXTURES/invalid-prompt-no-field.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Prompt hooks must have 'prompt'"* ]]
}

# ==============================================================================
# Timeout validation
# ==============================================================================

@test "validate-hook-schema: exits 1 when timeout is not a number" {
  run "$SCRIPT" "$FIXTURES/invalid-timeout-not-number.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"Timeout must be a number"* ]]
}

@test "validate-hook-schema: warns when timeout > 600" {
  run "$SCRIPT" "$FIXTURES/invalid-timeout-high.json"
  [ "$status" -eq 0 ]  # warnings don't fail
  [[ "$output" == *"Timeout 999 seconds is very high"* ]]
}

@test "validate-hook-schema: warns when timeout < 5" {
  run "$SCRIPT" "$FIXTURES/invalid-timeout-low.json"
  [ "$status" -eq 0 ]  # warnings don't fail
  [[ "$output" == *"Timeout 2 seconds is very low"* ]]
}

# ==============================================================================
# Hardcoded path detection
# ==============================================================================

@test "validate-hook-schema: warns about hardcoded absolute path" {
  run "$SCRIPT" "$FIXTURES/invalid-command-hardcoded-path.json"
  [ "$status" -eq 0 ]  # warnings don't fail
  [[ "$output" == *"Hardcoded absolute path"* ]]
}

# ==============================================================================
# Prompt hooks on unsupported events
# ==============================================================================

@test "validate-hook-schema: warns about prompt hook on SessionEnd" {
  run "$SCRIPT" "$FIXTURES/invalid-prompt-on-unsupported-event.json"
  [ "$status" -eq 0 ]  # warnings don't fail
  [[ "$output" == *"Prompt hooks may not be fully supported"* ]]
}

# ==============================================================================
# Unknown event types
# ==============================================================================

@test "validate-hook-schema: warns about unknown event type" {
  run "$SCRIPT" "$FIXTURES/invalid-unknown-event.json"
  [ "$status" -eq 0 ]  # unknown event is a warning, not error
  [[ "$output" == *"Unknown event type"* ]]
}
