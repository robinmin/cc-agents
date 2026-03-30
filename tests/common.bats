#!/usr/bin/env bats
# =============================================================================
# common.bats - Tests for scripts/lib/common.sh
# =============================================================================

setup() {
    TEST_DIR="$(mktemp -d)"
    # Reset the double-source guard so each test gets a clean state
    unset _CC_AGENTS_COMMON_SOURCED 2>/dev/null || true
    SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    COMMON_SH="${SCRIPT_DIR}/scripts/lib/common.sh"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Sourcing & Double-Source Guard ---

@test "common.sh: sources successfully" {
    source "$COMMON_SH"
    [ -n "$_CC_AGENTS_COMMON_SOURCED" ]
}

@test "common.sh: double-source is idempotent" {
    source "$COMMON_SH"
    source "$COMMON_SH"
    [ "$_CC_AGENTS_COMMON_SOURCED" = "1" ]
}

# --- ANSI Color Constants ---

@test "common.sh: defines ANSI color constants" {
    source "$COMMON_SH"
    [ -n "$RED" ]
    [ -n "$GREEN" ]
    [ -n "$YELLOW" ]
    [ -n "$MAGENTA" ]
    [ -n "$CYAN" ]
    [ -n "$BOLD" ]
    [ -n "$NC" ]
}

# --- Print Helpers ---

@test "common.sh: print_info outputs with info marker" {
    source "$COMMON_SH"
    run print_info "test message"
    [ "$status" -eq 0 ]
    [[ "$output" == *"test message"* ]]
}

@test "common.sh: print_success outputs with success marker" {
    source "$COMMON_SH"
    run print_success "done"
    [ "$status" -eq 0 ]
    [[ "$output" == *"done"* ]]
}

@test "common.sh: print_warning outputs with warning marker" {
    source "$COMMON_SH"
    run print_warning "caution"
    [ "$status" -eq 0 ]
    [[ "$output" == *"caution"* ]]
}

@test "common.sh: print_error outputs with error marker" {
    source "$COMMON_SH"
    run print_error "fail"
    [ "$status" -eq 0 ]
    [[ "$output" == *"fail"* ]]
}

# --- Directory Detection ---

@test "common.sh: detect_dirs sets PROJECT_ROOT from SCRIPT_DIR" {
    source "$COMMON_SH"
    SCRIPT_DIR="${SCRIPT_DIR}/scripts/lib"
    detect_dirs
    [ -n "$PROJECT_ROOT" ]
    [ -f "${PROJECT_ROOT}/package.json" ]
}

@test "common.sh: PROJECT_ROOT auto-detected from scripts/*.sh depth" {
    SCRIPT_DIR="${SCRIPT_DIR}/scripts"
    source "$COMMON_SH"
    [ -f "${PROJECT_ROOT}/package.json" ]
}

@test "common.sh: PROJECT_ROOT auto-detected from scripts/command/*.sh depth" {
    SCRIPT_DIR="${SCRIPT_DIR}/scripts/command"
    source "$COMMON_SH"
    [ -f "${PROJECT_ROOT}/package.json" ]
}

# --- rewrite_skill_references ---

@test "rewrite_skill_references: no file silently returns" {
    source "$COMMON_SH"
    rewrite_skill_references "/nonexistent/file.md"
    [ $? -eq 0 ]
}

@test "rewrite_skill_references: rewrites plugin:skill with prefix" {
    source "$COMMON_SH"
    local test_file="${TEST_DIR}/test.md"
    echo "Use rd3:super-coder for this task" > "$test_file"
    rewrite_skill_references "$test_file" "rd3"
    run cat "$test_file"
    [[ "$output" == *"rd3-super-coder"* ]]
    [[ "$output" != *"rd3:super-coder"* ]]
}

@test "rewrite_skill_references: only rewrites matching prefix" {
    source "$COMMON_SH"
    local test_file="${TEST_DIR}/test.md"
    echo "Use rd3:super-coder and wt:super-publisher" > "$test_file"
    rewrite_skill_references "$test_file" "rd3"
    run cat "$test_file"
    [[ "$output" == *"rd3-super-coder"* ]]
    [[ "$output" == *"wt:super-publisher"* ]]
}

@test "rewrite_skill_references: without prefix rewrites all colons" {
    source "$COMMON_SH"
    local test_file="${TEST_DIR}/test.md"
    echo "Use rd3:super-coder and wt:super-publisher" > "$test_file"
    rewrite_skill_references "$test_file"
    run cat "$test_file"
    [[ "$output" == *"rd3-super-coder"* ]]
    [[ "$output" == *"wt-super-publisher"* ]]
}

@test "rewrite_skill_references: handles multiple references per line" {
    source "$COMMON_SH"
    local test_file="${TEST_DIR}/test.md"
    echo "Use rd3:super-coder then rd3:super-tester" > "$test_file"
    rewrite_skill_references "$test_file" "rd3"
    run cat "$test_file"
    [[ "$output" == *"rd3-super-coder"* ]]
    [[ "$output" == *"rd3-super-tester"* ]]
}

@test "rewrite_skill_references: does not rewrite URLs (http: https:)" {
    source "$COMMON_SH"
    local test_file="${TEST_DIR}/test.md"
    echo "See https://example.com and http://test.com" > "$test_file"
    rewrite_skill_references "$test_file"
    run cat "$test_file"
    [[ "$output" == *"https://example.com"* ]]
    [[ "$output" == *"http://test.com"* ]]
}

# --- validate_targets ---

@test "validate_targets: 'all' is always valid" {
    source "$COMMON_SH"
    run validate_targets "all" "codexcli,geminicli"
    [ "$status" -eq 0 ]
}

@test "validate_targets: single valid target" {
    source "$COMMON_SH"
    run validate_targets "codexcli" "codexcli,geminicli,opencode"
    [ "$status" -eq 0 ]
}

@test "validate_targets: multiple valid targets" {
    source "$COMMON_SH"
    run validate_targets "codexcli,geminicli" "codexcli,geminicli,opencode"
    [ "$status" -eq 0 ]
}

@test "validate_targets: invalid target returns 1" {
    source "$COMMON_SH"
    run validate_targets "invalid" "codexcli,geminicli"
    [ "$status" -eq 1 ]
    [[ "$output" == *"Invalid target: invalid"* ]]
}

@test "validate_targets: mix of valid and invalid returns 1" {
    source "$COMMON_SH"
    run validate_targets "codexcli,badtarget" "codexcli,geminicli"
    [ "$status" -eq 1 ]
    [[ "$output" == *"Invalid target: badtarget"* ]]
}

# --- expand_targets ---

@test "expand_targets: 'all' expands to available list" {
    source "$COMMON_SH"
    local result
    result=$(expand_targets "all" "codexcli,geminicli,opencode")
    [ "$result" = "codexcli,geminicli,opencode" ]
}

@test "expand_targets: specific targets pass through" {
    source "$COMMON_SH"
    local result
    result=$(expand_targets "codexcli,geminicli" "codexcli,geminicli,opencode")
    [ "$result" = "codexcli,geminicli" ]
}

# --- feature_enabled ---

@test "feature_enabled: returns 0 for enabled feature" {
    source "$COMMON_SH"
    feature_enabled "skills" "skills,commands"
    [ $? -eq 0 ]
}

@test "feature_enabled: returns 1 for disabled feature" {
    source "$COMMON_SH"
    run feature_enabled "subagents" "skills,commands"
    [ "$status" -eq 1 ]
}

@test "feature_enabled: handles single feature" {
    source "$COMMON_SH"
    feature_enabled "skills" "skills"
    [ $? -eq 0 ]
}

@test "feature_enabled: handles feature at start of list" {
    source "$COMMON_SH"
    feature_enabled "skills" "skills,commands,subagents"
    [ $? -eq 0 ]
}

@test "feature_enabled: handles feature at end of list" {
    source "$COMMON_SH"
    feature_enabled "subagents" "skills,commands,subagents"
    [ $? -eq 0 ]
}
