#!/usr/bin/env bats

# Tests for emit-hooks.sh (unified entry point)

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  EMITTER="$SCRIPT_DIR/scripts/emit-hooks.sh"
  FIXTURES="$SCRIPT_DIR/tests/fixtures"
  ABSTRACT="$FIXTURES/canonical-hooks.json"
  TEMP_DIR=$(mktemp -d)
  cd "$TEMP_DIR"
}

teardown() {
  rm -rf "$TEMP_DIR"
}

# ==============================================================================
# Usage and error handling
# ==============================================================================

@test "emit-unified: exits 1 when no config found" {
  run "$EMITTER"
  [ "$status" -eq 1 ]
  [[ "$output" == *"No config file"* ]]
}

@test "emit-unified: exits 0 for --help" {
  run "$EMITTER" --help
  [ "$status" -eq 0 ]
  [[ "$output" == *"Usage"* ]]
}

@test "emit-unified: exits 1 when no platforms specified" {
  run "$EMITTER" --config "$ABSTRACT"
  [ "$status" -eq 1 ]
  [[ "$output" == *"No platforms"* ]]
}

# ==============================================================================
# Dry-run mode
# ==============================================================================

@test "emit-unified: dry-run with --all succeeds" {
  run "$EMITTER" --config "$ABSTRACT" --all --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"All platforms emitted successfully"* ]]
}

@test "emit-unified: dry-run with single platform" {
  run "$EMITTER" --config "$ABSTRACT" --platform pi --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"pi done"* ]]
}

@test "emit-unified: dry-run with multiple platforms" {
  run "$EMITTER" --config "$ABSTRACT" --platform claude-code,pi --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"claude-code done"* ]]
  [[ "$output" == *"pi done"* ]]
}

@test "emit-unified: shows config file in summary" {
  run "$EMITTER" --config "$ABSTRACT" --platform pi --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"Config:"* ]]
}

@test "emit-unified: shows platform list in summary" {
  run "$EMITTER" --config "$ABSTRACT" --platform pi --dry-run
  [ "$status" -eq 0 ]
  [[ "$output" == *"Platforms: pi"* ]]
}
