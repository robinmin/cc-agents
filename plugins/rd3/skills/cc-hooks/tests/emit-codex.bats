#!/usr/bin/env bats

# Tests for emit-codex.sh

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  EMITTER="$SCRIPT_DIR/emitters/emit-codex.sh"
  FIXTURES="$SCRIPT_DIR/tests/fixtures"
  ABSTRACT="$FIXTURES/canonical-hooks.json"
  TEMP_DIR=$(mktemp -d)
}

teardown() {
  rm -rf "$TEMP_DIR"
}

@test "emit-codex: exits 1 when no arguments" {
  run "$EMITTER"
  [ "$status" -eq 1 ]
}

@test "emit-codex: dry-run produces valid JSON" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"{"*"hooks"* ]]
}

@test "emit-codex: dry-run uses codex event names" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"session_start"* ]]
  [[ "$output" == *"pre_tool_use"* ]]
  [[ "$output" == *"post_tool_use"* ]]
}

@test "emit-codex: dry-run warns about unsupported Stop event" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"Stop"*"not supported"* ]]
}

@test "emit-codex: dry-run strips prompt hooks" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"prompt"*"not supported"* ]]
}

@test "emit-codex: creates output file" {
  output_path="$TEMP_DIR/codex.json"
  run "$EMITTER" "$ABSTRACT" --output "$output_path"
  [ "$status" -eq 0 ]
  [ -f "$output_path" ]
}
