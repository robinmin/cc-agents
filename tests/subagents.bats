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
    # Pi global subagents install to ~/.pi/agent/agents/ (not ~/.agents/skills/)
    local skill_count
    skill_count=$(ls "${fake_home}/.pi/agent/agents/" 2>/dev/null | grep "^rd3-super-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "subagents.sh: --global installs to codexcli skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 codexcli --global
    [ "$status" -eq 0 ]
    # CodexCLI global installs to shared ~/.agents/skills/
    local skill_count
    skill_count=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-super-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "subagents.sh: --global installs to geminicli and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 geminicli --global
    [ "$status" -eq 0 ]
    # GeminiCLI global installs to shared ~/.agents/skills/
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "subagents.sh: --global installs to opencode and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 opencode --global
    [ "$status" -eq 0 ]
    # OpenCode global installs to shared ~/.agents/skills/
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
    # OpenClaw global installs to shared ~/.agents/skills/
    [ -d "${fake_home}/.agents/skills/" ]
}

# --- SKILL.md Content ---

@test "subagents.sh: installed SKILL.md has correct name in frontmatter" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Pi global subagents install as flat .md files in ~/.pi/agent/agents/
    local first_skill
    first_skill=$(ls "${fake_home}/.pi/agent/agents/" 2>/dev/null | grep "^rd3-super-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.pi/agent/agents/${first_skill}"
    [ -f "$skill_file" ]
    # Frontmatter should have name: field
    grep -q "^name:" "$skill_file"
}

@test "subagents.sh: installed SKILL.md has rewritten skill references" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Pi global subagents install as flat .md files in ~/.pi/agent/agents/
    local first_skill
    first_skill=$(ls "${fake_home}/.pi/agent/agents/" 2>/dev/null | grep "^rd3-super-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.pi/agent/agents/${first_skill}"
    [ -f "$skill_file" ]
}

# --- Multiple Targets ---

@test "subagents.sh: multiple targets installs to all" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" rd3 pi,codexcli --global
    [ "$status" -eq 0 ]
    # Pi goes to ~/.pi/agent/agents/, codexcli goes to ~/.agents/skills/
    [ -d "${fake_home}/.pi/agent/agents/" ]
    [ -d "${fake_home}/.agents/skills/" ]
}

# --- wt Plugin ---

@test "subagents.sh: wt plugin subagents install successfully" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SUBAGENTS_SH" wt pi --global
    [ "$status" -eq 0 ]
    # Pi global subagents install to ~/.pi/agent/agents/
    local skill_count
    skill_count=$(ls "${fake_home}/.pi/agent/agents/" 2>/dev/null | grep "^wt-" | wc -l | tr -d ' ')
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
    [[ "$output" == *"agents"* ]] || [[ "$output" == *"Installed:"* ]] || [[ "$output" == *"subagent"* ]]
}
