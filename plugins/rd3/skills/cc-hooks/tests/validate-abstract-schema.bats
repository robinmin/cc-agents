#!/usr/bin/env bats

# Tests for abstract hook schema validation via emit-common.sh

setup() {
  SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
  SOURCE="$SCRIPT_DIR/scripts/emit-common.sh"
  FIXTURES="$SCRIPT_DIR/tests/abstract_hooks"
}

# Helper: source emit-common.sh and call validate_abstract
validate() {
  bash -c "source '$SOURCE'; validate_abstract '$1'"
}

# ==============================================================================
# Valid configs
# ==============================================================================

@test "validate-abstract: accepts valid-minimal.json" {
  run validate "$FIXTURES/valid-minimal.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}

@test "validate-abstract: accepts valid-full.json" {
  run validate "$FIXTURES/valid-full.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}

@test "validate-abstract: accepts valid-all-events.json" {
  run validate "$FIXTURES/valid-all-events.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}

# ==============================================================================
# Invalid configs
# ==============================================================================

@test "validate-abstract: rejects missing version" {
  run validate "$FIXTURES/invalid-no-version.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"version"* ]]
}

@test "validate-abstract: rejects empty hooks" {
  run validate "$FIXTURES/invalid-no-hooks.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"No hooks"* ]]
}

@test "validate-abstract: accepts bad hook type (bash validation is lightweight)" {
  # The bash validate_abstract checks structure only (version, hooks exist).
  # Full type validation is done by the JSON Schema (abstract-hook.json).
  run validate "$FIXTURES/invalid-bad-type.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]] || [[ "$output" == *"Invalid type"* ]]
}

@test "validate-abstract: rejects nonexistent file" {
  run validate "/nonexistent/file.json"
  [ "$status" -eq 1 ]
  [[ "$output" == *"not found"* ]]
}

# ==============================================================================
# Canonical fixture
# ==============================================================================

@test "validate-abstract: accepts canonical-hooks.json" {
  run validate "$SCRIPT_DIR/tests/fixtures/canonical-hooks.json"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}
