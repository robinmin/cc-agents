#!/usr/bin/env bats
# =============================================================================
# skills.bats - Tests for scripts/command/skills.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    SKILLS_SH="${PROJECT_ROOT}/scripts/command/skills.sh"
    TEST_DIR="$(mktemp -d)"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Help & Usage ---

@test "skills.sh: --help exits 0 with usage" {
    run bash "$SKILLS_SH" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "skills.sh: -h exits 0 with usage" {
    run bash "$SKILLS_SH" -h
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "skills.sh: no arguments exits 1" {
    run bash "$SKILLS_SH"
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin name is required"* ]]
}

@test "skills.sh: missing targets exits 1" {
    run bash "$SKILLS_SH" rd3
    [ "$status" -ne 0 ]
    [[ "$output" == *"Target agents are required"* ]]
}

@test "skills.sh: unknown option exits 1" {
    run bash "$SKILLS_SH" rd3 pi --badopt
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown option: --badopt"* ]]
}

@test "skills.sh: extra argument exits 1" {
    run bash "$SKILLS_SH" rd3 pi extra
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown argument: extra"* ]]
}

@test "skills.sh: invalid target exits 1" {
    run bash "$SKILLS_SH" rd3 invalidtarget
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid target"* ]]
}

@test "skills.sh: nonexistent plugin exits 1" {
    run bash "$SKILLS_SH" nonexistent-plugin pi
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin not found"* ]]
}

# --- Feature Validation ---

@test "skills.sh: invalid feature exits 1" {
    run bash "$SKILLS_SH" rd3 pi --features=invalid
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid feature"* ]]
}

@test "skills.sh: subagents feature rejected" {
    run bash "$SKILLS_SH" rd3 pi --features=subagents
    [ "$status" -ne 0 ]
    [[ "$output" == *"not supported"* ]]
}

@test "skills.sh: --features=skills accepted" {
    run bash "$SKILLS_SH" rd3 pi --features=skills --dry-run
    [ "$status" -eq 0 ]
}

@test "skills.sh: --features=commands accepted" {
    run bash "$SKILLS_SH" rd3 pi --features=commands --dry-run
    [ "$status" -eq 0 ]
}

@test "skills.sh: --features=skills,commands accepted" {
    run bash "$SKILLS_SH" rd3 pi --features=skills,commands --dry-run
    [ "$status" -eq 0 ]
}

@test "skills.sh: --features=all expands to skills,commands" {
    run bash "$SKILLS_SH" rd3 pi --features=all --dry-run
    [ "$status" -eq 0 ]
}

# --- Dry Run ---

@test "skills.sh: --dry-run with rd3 shows preview" {
    run bash "$SKILLS_SH" rd3 pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"DRY RUN"* ]]
}

@test "skills.sh: --dry-run with all targets" {
    run bash "$SKILLS_SH" rd3 all --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Expanding 'all'"* ]]
}

# --- Global Installation ---

@test "skills.sh: --global installs to pi skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.pi/agent/skills/" ]
}

@test "skills.sh: --global installs to codexcli skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 codexcli --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.codex/skills/" ]
}

@test "skills.sh: --global installs to geminicli and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 geminicli --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.gemini/skills/" ]
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "skills.sh: --global installs to opencode and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 opencode --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.opencode/skills/" ]
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "skills.sh: --global installs to openclaw skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 openclaw --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.openclaw/skills/" ]
}

@test "skills.sh: --global installs to antigravity" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 antigravity --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.gemini/antigravity/skills/" ]
}

@test "skills.sh: augmentcode shows not implemented warning" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 augmentcode --global
    [ "$status" -eq 0 ]
    [[ "$output" == *"not implemented"* ]]
}

# --- Multiple Targets ---

@test "skills.sh: multiple targets installs to all dirs" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" rd3 pi,codexcli --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.pi/agent/skills/" ]
    [ -d "${fake_home}/.codex/skills/" ]
}

# --- wt Plugin ---

@test "skills.sh: wt plugin installs successfully" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SKILLS_SH" wt pi --global
    [ "$status" -eq 0 ]
    local skill_count
    skill_count=$(ls "${fake_home}/.pi/agent/skills/" 2>/dev/null | grep "^wt-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

# --- Verbose Mode ---

@test "skills.sh: --verbose flag is accepted" {
    run bash "$SKILLS_SH" rd3 pi --dry-run --verbose
    [ "$status" -eq 0 ]
}
