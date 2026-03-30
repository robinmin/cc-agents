#!/usr/bin/env bats
# =============================================================================
# magents.bats - Tests for scripts/command/magents.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    MAGENTS_SH="${PROJECT_ROOT}/scripts/command/magents.sh"
    TEST_DIR="$(mktemp -d)"

    # Create a fake agent config for testing
    FAKE_AGENT_DIR="${TEST_DIR}/magents/test-agent"
    mkdir -p "$FAKE_AGENT_DIR"
    echo "# Identity" > "${FAKE_AGENT_DIR}/IDENTITY.md"
    echo "# Soul" > "${FAKE_AGENT_DIR}/SOUL.md"
    echo "# Agents" > "${FAKE_AGENT_DIR}/AGENTS.md"
    echo "# User" > "${FAKE_AGENT_DIR}/USER.md"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Help & Usage ---

@test "magents.sh: --help exits 0 with usage" {
    run bash "$MAGENTS_SH" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "magents.sh: -h exits 0 with usage" {
    run bash "$MAGENTS_SH" -h
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "magents.sh: no arguments exits 1" {
    run bash "$MAGENTS_SH"
    [ "$status" -ne 0 ]
    [[ "$output" == *"Agent name is required"* ]]
}

@test "magents.sh: missing targets exits 1" {
    run bash "$MAGENTS_SH" test-agent
    [ "$status" -ne 0 ]
    [[ "$output" == *"Target agents are required"* ]]
}

@test "magents.sh: unknown option exits 1" {
    run bash "$MAGENTS_SH" test-agent pi --badopt
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown option: --badopt"* ]]
}

@test "magents.sh: extra argument exits 1" {
    run bash "$MAGENTS_SH" test-agent pi extra
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown argument: extra"* ]]
}

@test "magents.sh: invalid target exits 1" {
    run bash "$MAGENTS_SH" team-stark-children invalidtarget
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid target"* ]]
}

# --- Environment Validation ---

@test "magents.sh: nonexistent agent exits 1" {
    run bash "$MAGENTS_SH" nonexistent-agent pi
    [ "$status" -ne 0 ]
    [[ "$output" == *"Agent not found"* ]]
}

@test "magents.sh: valid agent with valid target succeeds" {
    # Override PROJECT_ROOT via env-like approach by running from correct root
    # magents.sh uses PROJECT_ROOT from common.sh, which auto-detects
    # We test with the real team-stark-children agent
    run bash "$MAGENTS_SH" team-stark-children pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Agent found"* ]]
}

@test "magents.sh: agent found shows file count" {
    run bash "$MAGENTS_SH" team-stark-children pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"config file(s)"* ]]
}

# --- Dry Run ---

@test "magents.sh: --dry-run with pi shows 'Would write'" {
    run bash "$MAGENTS_SH" team-stark-children pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Would write"* ]]
}

@test "magents.sh: --dry-run with all targets" {
    run bash "$MAGENTS_SH" team-stark-children all --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Expanding 'all' to"* ]]
}

@test "magents.sh: --dry-run with project shows 'Would write'" {
    run bash "$MAGENTS_SH" team-stark-children pi --project --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Would write"* ]]
}

@test "magents.sh: --dry-run with project and claude shows symlink info" {
    run bash "$MAGENTS_SH" team-stark-children claude --project --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Would symlink"* ]]
}

# --- Global Installation (real write, temp HOME) ---

@test "magents.sh: global install to pi writes AGENTS.md" {
    local fake_home="${TEST_DIR}/home"
    mkdir -p "${fake_home}/.pi/agent"
    # Use env to set HOME temporarily
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children pi
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.pi/agent/AGENTS.md" ]
}

@test "magents.sh: global install to codexcli writes AGENTS.md" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children codexcli
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.codex/AGENTS.md" ]
}

@test "magents.sh: global install to claude writes CLAUDE.md" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children claude
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.claude/CLAUDE.md" ]
}

@test "magents.sh: global install to geminicli writes rules.md" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children geminicli
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.gemini/rules.md" ]
}

@test "magents.sh: global install to opencode writes instructions.md" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children opencode
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.opencode/instructions.md" ]
}

@test "magents.sh: global install to antigravity writes AGENTS.md" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children antigravity
    [ "$status" -eq 0 ]
    [ -f "${fake_home}/.gemini/antigravity/AGENTS.md" ]
}

@test "magents.sh: global install to openclaw skips (not supported)" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children openclaw
    [ "$status" -eq 0 ]
    [[ "$output" == *"does not support global installation"* ]]
}

# --- Concatenation ---

@test "magents.sh: output contains content from all agent files" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children pi
    [ "$status" -eq 0 ]
    # The concatenated file should contain the actual agent config content
    local content
    content=$(cat "${fake_home}/.pi/agent/AGENTS.md")
    [ -n "$content" ]
}

@test "magents.sh: backup created when file already exists" {
    local fake_home="${TEST_DIR}/home"
    mkdir -p "${fake_home}/.pi/agent"
    echo "old content" > "${fake_home}/.pi/agent/AGENTS.md"
    run env HOME="$fake_home" bash "$MAGENTS_SH" team-stark-children pi
    [ "$status" -eq 0 ]
    # Old file backed up
    local backup_count
    backup_count=$(ls "${fake_home}/.pi/agent/AGENTS.md.bak."* 2>/dev/null | wc -l | tr -d ' ')
    [ "$backup_count" -ge 1 ]
}

# --- Project-Level Installation ---

@test "magents.sh: --project with pi writes AGENTS.md to project dir" {
    run bash "$MAGENTS_SH" team-stark-children pi --project --project-dir "$TEST_DIR"
    [ "$status" -eq 0 ]
    [ -f "${TEST_DIR}/AGENTS.md" ]
}

@test "magents.sh: --project with claude creates symlink" {
    run bash "$MAGENTS_SH" team-stark-children claude --project --project-dir "$TEST_DIR"
    [ "$status" -eq 0 ]
    [ -f "${TEST_DIR}/AGENTS.md" ]
    [ -L "${TEST_DIR}/.claude/CLAUDE.md" ]
}

@test "magents.sh: --project with geminicli creates symlink" {
    run bash "$MAGENTS_SH" team-stark-children geminicli --project --project-dir "$TEST_DIR"
    [ "$status" -eq 0 ]
    [ -f "${TEST_DIR}/AGENTS.md" ]
    [ -L "${TEST_DIR}/.gemini/rules.md" ]
}

@test "magents.sh: --project with opencode creates symlink" {
    run bash "$MAGENTS_SH" team-stark-children opencode --project --project-dir "$TEST_DIR"
    [ "$status" -eq 0 ]
    [ -f "${TEST_DIR}/AGENTS.md" ]
    [ -L "${TEST_DIR}/.opencode/instructions.md" ]
}

@test "magents.sh: --project writes AGENTS.md once for multiple symlink targets" {
    run bash "$MAGENTS_SH" team-stark-children claude,geminicli --project --project-dir "$TEST_DIR"
    [ "$status" -eq 0 ]
    [ -f "${TEST_DIR}/AGENTS.md" ]
    [ -L "${TEST_DIR}/.claude/CLAUDE.md" ]
    [ -L "${TEST_DIR}/.gemini/rules.md" ]
}

@test "magents.sh: --project --verbose shows added files" {
    run bash "$MAGENTS_SH" team-stark-children pi --project --project-dir "$TEST_DIR" --verbose
    [ "$status" -eq 0 ]
    [[ "$output" == *"Added:"* ]]
}

# --- Verbose Mode ---

@test "magents.sh: --verbose flag is accepted" {
    run bash "$MAGENTS_SH" team-stark-children pi --dry-run --verbose
    [ "$status" -eq 0 ]
}
