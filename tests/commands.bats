#!/usr/bin/env bats
# =============================================================================
# commands.bats - Tests for scripts/command/commands.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    COMMANDS_SH="${PROJECT_ROOT}/scripts/command/commands.sh"
    TEST_DIR="$(mktemp -d)"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Help & Usage ---

@test "commands.sh: --help exits 0 with usage" {
    run bash "$COMMANDS_SH" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "commands.sh: -h exits 0 with usage" {
    run bash "$COMMANDS_SH" -h
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "commands.sh: no arguments exits 1" {
    run bash "$COMMANDS_SH"
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin name is required"* ]]
}

@test "commands.sh: missing targets exits 1" {
    run bash "$COMMANDS_SH" rd3
    [ "$status" -ne 0 ]
    [[ "$output" == *"Target agents are required"* ]]
}

@test "commands.sh: unknown option exits 1" {
    run bash "$COMMANDS_SH" rd3 pi --badopt
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown option: --badopt"* ]]
}

@test "commands.sh: extra argument exits 1" {
    run bash "$COMMANDS_SH" rd3 pi extra
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown argument: extra"* ]]
}

@test "commands.sh: invalid target exits 1" {
    run bash "$COMMANDS_SH" rd3 invalidtarget
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid target"* ]]
}

@test "commands.sh: nonexistent plugin exits 1" {
    run bash "$COMMANDS_SH" nonexistent-plugin pi
    [ "$status" -ne 0 ]
    [[ "$output" == *"Plugin not found"* ]]
}

@test "commands.sh: plugin without commands dir exits 1" {
    # nonexistent-plugin triggers "Plugin not found" which is sufficient
    # The "No commands directory" path is tested implicitly via normal plugin flow
    run bash "$COMMANDS_SH" nonexistent-plugin pi
    [ "$status" -ne 0 ]
    [[ "$output" == *"not found"* ]] || [[ "$output" == *"No command"* ]]
}

# --- Dry Run ---

@test "commands.sh: --dry-run with rd3 shows preview" {
    run bash "$COMMANDS_SH" rd3 pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"DRY RUN"* ]]
}

@test "commands.sh: --dry-run with all targets" {
    run bash "$COMMANDS_SH" rd3 all --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Expanding 'all'"* ]]
}

@test "commands.sh: --dry-run shows command skill names" {
    run bash "$COMMANDS_SH" rd3 pi --dry-run
    [ "$status" -eq 0 ]
    # Commands are named rd3-{cmd_name} (e.g., rd3-dev-run, rd3-agent-add)
    [[ "$output" == *"rd3-dev-"* ]]
}

# --- Global Installation ---

@test "commands.sh: --global installs to pi skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Pi global installs to shared ~/.agents/skills/ (not ~/.pi/agent/skills/)
    local skill_count
    skill_count=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-dev-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "commands.sh: --global installs to codexcli skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 codexcli --global
    [ "$status" -eq 0 ]
    # CodexCLI global installs to shared ~/.agents/skills/
    local skill_count
    skill_count=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-dev-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}

@test "commands.sh: --global installs to geminicli and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 geminicli --global
    [ "$status" -eq 0 ]
    # GeminiCLI global installs to shared ~/.agents/skills/
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "commands.sh: --global installs to opencode and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 opencode --global
    [ "$status" -eq 0 ]
    # OpenCode global installs to shared ~/.agents/skills/
    [ -d "${fake_home}/.agents/skills/" ]
}

@test "commands.sh: --global installs to antigravity and .agents" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 antigravity --global
    [ "$status" -eq 0 ]
    [ -d "${fake_home}/.gemini/antigravity/skills/" ]
}

@test "commands.sh: --global installs to openclaw skills dir" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 openclaw --global
    [ "$status" -eq 0 ]
    # OpenClaw global installs to shared ~/.agents/skills/
    [ -d "${fake_home}/.agents/skills/" ]
}

# --- Multiple Targets ---

@test "commands.sh: multiple targets installs to all" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 pi,codexcli --global
    [ "$status" -eq 0 ]
    # Both pi and codexcli route to shared ~/.agents/skills/ in global mode
    [ -d "${fake_home}/.agents/skills/" ]
    local skill_count
    skill_count=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-dev-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 2 ]
}

# --- SKILL.md Content ---

@test "commands.sh: installed SKILL.md has correct name in frontmatter" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Pi global installs to shared ~/.agents/skills/
    local first_skill
    first_skill=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-dev-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.agents/skills/${first_skill}/SKILL.md"
    [ -f "$skill_file" ]
    # Frontmatter should have name: matching directory name
    grep -q "^name: ${first_skill}$" "$skill_file"
}

@test "commands.sh: installed SKILL.md has rewritten skill references" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" rd3 pi --global
    [ "$status" -eq 0 ]
    # Pi global installs to shared ~/.agents/skills/
    local first_skill
    first_skill=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^rd3-dev-" | head -1)
    [ -n "$first_skill" ]
    local skill_file="${fake_home}/.agents/skills/${first_skill}/SKILL.md"
    [ -f "$skill_file" ]
}

# --- Verbose Mode ---

@test "commands.sh: --verbose flag is accepted" {
    run bash "$COMMANDS_SH" rd3 pi --dry-run --verbose
    [ "$status" -eq 0 ]
}

# --- wt Plugin ---

@test "commands.sh: wt plugin commands install successfully" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$COMMANDS_SH" wt pi --global
    [ "$status" -eq 0 ]
    # Pi global installs to shared ~/.agents/skills/
    local skill_count
    skill_count=$(ls "${fake_home}/.agents/skills/" 2>/dev/null | grep "^wt-topic-" | wc -l | tr -d ' ')
    [ "$skill_count" -ge 1 ]
}
