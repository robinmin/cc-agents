#!/usr/bin/env bats

# Tests for emit-pi.sh

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  EMITTER="$SCRIPT_DIR/emitters/emit-pi.sh"
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

@test "emit-pi: exits 1 when no arguments" {
  run "$EMITTER"
  [ "$status" -eq 1 ]
  [[ "$output" == *"No input file"* ]]
}

@test "emit-pi: exits 0 for --help" {
  run "$EMITTER" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
}

# ==============================================================================
# Dry-run output
# ==============================================================================

@test "emit-pi: dry-run produces valid JSON" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"{"*"hooks"* ]]
}

@test "emit-pi: dry-run includes supported events" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"SessionStart"* ]]
  [[ "$output" == *"PreToolUse"* ]]
  [[ "$output" == *"PostToolUse"* ]]
  [[ "$output" == *"Stop"* ]]
}

@test "emit-pi: dry-run strips prompt hooks" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  # Should warn about prompt hooks being unsupported
  [[ "$output" == *"prompt"*"not supported"* ]] || [[ "$output" == *"prompt"*"skipped"* ]]
  # The dry-run JSON should only contain command hooks
  # Write the output to a temp file and validate
  tmpfile=$(mktemp)
  echo "$output" > "$tmpfile"
  # The JSON part starts with { and ends with }
  json_part=$(sed -n '/^{$/,/^}$/p' "$tmpfile")
  rm -f "$tmpfile"
  # If we got JSON, verify no prompt hooks
  if [[ -n "$json_part" ]]; then
    hook_types=$(echo "$json_part" | jq -r '[.hooks | to_entries[].value[] | .hooks[] | .type] | unique | .[]' 2>/dev/null || true)
    [[ "$hook_types" == *"command"* ]]
    # Should not have prompt as a type
    [[ "$hook_types" != *"prompt"* ]]
  fi
}

@test "emit-pi: dry-run uses relative paths for PLUGIN_ROOT" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  # Should use ./ not $CLAUDE_PLUGIN_ROOT
  [[ "$output" == *'./scripts/'* ]]
}

@test "emit-pi: dry-run mentions pi-hooks installation" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"pi-hooks"* ]]
}

# ==============================================================================
# File output
# ==============================================================================

@test "emit-pi: creates output file" {
  output_path="$TEMP_DIR/.pi/settings.json"
  run "$EMITTER" "$ABSTRACT" --output "$output_path"
  [ "$status" -eq 0 ]
  [ -f "$output_path" ]
}

@test "emit-pi: output is valid JSON" {
  output_path="$TEMP_DIR/.pi/settings.json"
  "$EMITTER" "$ABSTRACT" --output "$output_path" 2>/dev/null
  run jq empty "$output_path"
  [ "$status" -eq 0 ]
}
