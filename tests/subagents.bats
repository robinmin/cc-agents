#!/usr/bin/env bats
# =============================================================================
# subagents.bats - Tests for scripts/command/subagents.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    SUBAGENTS_SH="${PROJECT_ROOT}/scripts/command/subagents.sh"
    TEST_DIR="$(mktemp -d)"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Help & Usage ---

@test "subagents.sh: --help exits 0 with usage" {
    run bash "$SUBAGENTS_SH" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "subagents.sh: -h exits 0 with usage" {
    run bash "$SUBAGENTS_SH" -h
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "subagents.sh: no arguments exits 1" {
    run bash "$SUBAGENTS_SH"
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin name is required"* ]]
}

@test "subagents.sh: missing targets exits 1" {
    run bash "$SUBAGENTS_SH" rd3
    [ "$status" -ne 0 ]
    [[ "$output" == *"Target agents are required"* ]]
}

@test "subagents.sh: unknown option exits 1" {
    run bash "$SUBAGENTS_SH" rd3 pi --badopt
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown option: --badopt"* ]]
}

@test "subagents.sh: extra argument exits 1" {
    run bash "$SUBAGENTS_SH" rd3 pi extra
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown argument: extra"* ]]
}

@test "subagents.sh: invalid target exits 1" {
    run bash "$SUBAGENTS_SH" rd3 invalidtarget
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid target"* ]]
}

@test "subagents.sh: nonexistent plugin exits 1" {
    run bash "$SUBAGENTS_SH" nonexistent-plugin pi
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin not found"* ]]
}

# --- Dry Run ---

@test "subagents.sh: --dry-run with rd3 shows preview" {
    run bash "$SUBAGENTS_SH" rd3 pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"DRY RUN"* ]]
}

@test "subagents.sh: --dry-run shows agent skill names" {
    run bash "$SUBAGENTS_SH" rd3 pi --dry-run
    [ "$status" -eq 0 ]
    # Agent names like rd3-super-coder, rd3-jon-snow (no -agent- infix)
    [[ "$output" == *"rd3-super-"* ]]
}

@test "subagents.sh: --dry-run with all targets" {
    run bash "$SUBAGENTS_SH" rd3 all --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Expanding 'all'"* ]]
}

# --- Global Installation ---

@test "subagents.sh: --global installs to pi skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Check for known agent names (e.g., rd3-super-coder)
    local skill_count
    skill_count=$(ls "${fake_home}/.pi/agent/skills/" 2>/dev/null | grep "^rd3-super-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "subagents.sh: --global installs to codexcli skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 codexcli --global
    [ "$status" -eq 0 ]
    local skill_count
    skill_count=$(ls "${fake_home}/.codex/skills/" 2>/dev/null | grep "^rd3-super-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "subagents.sh: --global installs to geminicli and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 geminicli --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.gemini/skills/" ]
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "subagents.sh: --global installs to opencode and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 opencode --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.opencode/skills/" ]
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "subagents.sh: --global installs to antigravity" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 antigravity --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.gemini/antigravity/skills/" ]
}

@test "subagents.sh: --global installs to openclaw skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 openclaw --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.openclaw/skills/" ]
}

# --- SKILL.md Content ---

@test "subagents.sh: installed SKILL.md has correct name in frontmatter" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    local first_skill
    first_skill=$(ls "${fake_home}/.pi/agent/skills/" | grep "^rd3-super-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.pi/agent/skills/${first_skill}/SKILL.md"
    [ -f "$skill_file" ]
    grep -q "^name: ${first_skill}$" "$skill_file"
}

@test "subagents.sh: installed SKILL.md has rewritten skill references" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    local first_skill
    first_skill=$(ls "${fake_home}/.pi/agent/skills/" | grep "^rd3-super-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.pi/agent/skills/${first_skill}/SKILL.md"
    [ -f "$skill_file" ]
    # Content should not contain rd3:skill-name patterns
    run grep 'rd3:[a-z][a-z0-9-]*' "$skill_file"
    [ "$status" -ne 0 ]
}

# --- Multiple Targets ---

@test "subagents.sh: multiple targets installs to all" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi,codexcli --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.pi/agent/skills/" ]
    [ -d "${fake_home}/.codex/skills/" ]
}

# --- wt Plugin ---

@test "subagents.sh: wt plugin subagents install successfully" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" wt pi --global
    [ "$status" -eq 0 ]
    # wt agents are like image-generator, magent-browser, super-publisher
    local skill_count
    skill_count=$(ls "${fake_home}/.pi/agent/skills/" 2>/dev/null | grep "^wt-super-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

# --- Verbose Mode ---

@test "subagents.sh: --verbose flag is accepted" {
    run bash "$SUBAGENTS_SH" rd3 pi --dry-run --verbose
    [ "$status" -eq 0 ]
}

@test "subagents.sh: --verbose shows target directories" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global --verbose
    [ "$status" -eq 0 ]
    [[ "$output" == *"Installed:"* ]]
}
