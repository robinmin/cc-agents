#!/usr/bin/env bats

# Tests for emit-gemini.sh

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  EMITTER="$SCRIPT_DIR/emitters/emit-gemini.sh"
  FIXTURES="$SCRIPT_DIR/tests/fixtures"
  ABSTRACT="$FIXTURES/canonical-hooks.json"
  TEMP_DIR=$(mktemp -d)
}

teardown() {
  rm -rf "$TEMP_DIR"
}

@test "emit-gemini: exits 1 when no arguments" {
  run "$EMITTER"
  [ "$status" -eq 1 ]
}

@test "emit-gemini: dry-run produces valid JSON" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"{"*"hooks"* ]]
}

@test "emit-gemini: dry-run uses gemini event names" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"BeforeTool"* ]]
  [[ "$output" == *"AfterTool"* ]]
  [[ "$output" == *"AfterAgent"* ]]
}

@test "emit-gemini: dry-run warns about unsupported SessionStart" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"SessionStart"*"not supported"* ]]
}

@test "emit-gemini: dry-run strips prompt hooks" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"prompt"*"not supported"* ]]
}

@test "emit-gemini: dry-run mentions stdin/stdout protocol" {
  run "$EMITTER" "$ABSTRACT" --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"stdin"* ]]
}

@test "emit-gemini: creates output file" {
  output_path="$TEMP_DIR/.gemini/settings.json"
  run "$EMITTER" "$ABSTRACT" --output "$output_path"
  [ "$status" -eq 0 ]
  [ -f "$output_path" ]
}
