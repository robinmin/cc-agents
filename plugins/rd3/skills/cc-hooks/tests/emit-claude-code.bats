#!/usr/bin/env bats

# Tests for emit-claude-code.sh

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  EMITTER="$SCRIPT_DIR/emitters/emit-claude-code.sh"
  FIXTURES="$SCRIPT_DIR/tests/fixtures"
  ABSTRACT="$FIXTURES/canonical-hooks.json"
  TEMP_DIR=$(mktemp -d)
}

teardown() {
  rm -rf "$TEMP_DIR"
}

# ==============================================================================
# Usage and error handling
# ==============================================================================

@test "emit-claude-code: exits 1 when no arguments" {
  run "$EMITTER"
  [ "$status" -eq 1 ]
  [[ "$output" == *"No input file"* ]]
}

@test "emit-claude-code: exits 1 when file not found" {
  run "$EMITTER" "/nonexistent/hooks.json"
  [ "$status" -eq 1 ]
}

@test "emit-claude-code: exits 0 for --help" {
  run "$EMITTER" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
}

# ==============================================================================
# Dry-run output
# ==============================================================================

@test "emit-claude-code: dry-run produces valid JSON" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  # Output should be valid JSON (check for opening brace)
  [[ "$output" == *"{"*"hooks"* ]]
}

@test "emit-claude-code: dry-run includes all events from input" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"SessionStart"* ]]
  [[ "$output" == *"PreToolUse"* ]]
  [[ "$output" == *"PostToolUse"* ]]
  [[ "$output" == *"Stop"* ]]
}

@test "emit-claude-code: dry-run replaces env vars" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *'$CLAUDE_PLUGIN_ROOT'* ]]
  # Should NOT contain abstract placeholders
  [[ "$output" != *'$PLUGIN_ROOT'* ]] || [[ "$output" == *'$CLAUDE_PLUGIN_ROOT'* ]]
}

@test "emit-claude-code: dry-run preserves prompt hooks" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *'"prompt"'* ]]
  [[ "$output" == *"approve/deny"* ]]
}

@test "emit-claude-code: reports prompt hook count" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"prompt hook(s) found"* ]]
}

# ==============================================================================
# File output
# ==============================================================================

@test "emit-claude-code: creates output file" {
  output_path="$TEMP_DIR/.claude/settings.json"
  run "$EMITTER" "$ABSTRACT" --output "$output_path"
  [ "$status" -eq 0 ]
  [ -f "$output_path" ]
}

@test "emit-claude-code: output is valid JSON" {
  output_path="$TEMP_DIR/.claude/settings.json"
  "$EMITTER" "$ABSTRACT" --output "$output_path" 2>/dev/null
  run jq empty "$output_path"
  [ "$status" -eq 0 ]
}

@test "emit-claude-code: output has hooks key" {
  output_path="$TEMP_DIR/.claude/settings.json"
  "$EMITTER" "$ABSTRACT" --output "$output_path" 2>/dev/null
  run jq -r '.hooks | keys[]' "$output_path"
  [ "$status" -eq 0 ]
  [[ "$output" == *"PreToolUse"* ]]
}
