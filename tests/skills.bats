#!/usr/bin/env bats
# =============================================================================
# skills.bats - Tests for scripts/command/skills.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    SKILLS_SH="${PROJECT_ROOT}/scripts/command/skills.sh"
    TEST_DIR="$(mktemp -d)"
    # Create a mock rulesync that fakes generating skills.
    # The real rulesync generates .rulesync/skills/{skill-name}/SKILL.md files.
    # Our mock creates a few dummy skill dirs so copy_to_targets has something to copy.
    MOCK_BIN="${TEST_DIR}/bin"
    mkdir -p "$MOCK_BIN"
    cat > "$MOCK_BIN/rulesync" << 'MOCK'
#!/usr/bin/env bash
# Mock rulesync for testing — creates fake skill output
workspace="$(pwd)"
skills_dir="${workspace}/.rulesync/skills"
mkdir -p "$skills_dir"
for skill in rd3-dev-run rd3-dev-plan rd3-dev-review; do
    mkdir -p "${skills_dir}/${skill}"
    cat > "${skills_dir}/${skill}/SKILL.md" << SKILLEOF
---
name: ${skill}
description: Mock skill for testing
---
# ${skill}
Mock content.
SKILLEOF
done
echo "rulesync generate completed (mock)"
exit 0
MOCK
    chmod +x "$MOCK_BIN/rulesync"
    export PATH="${MOCK_BIN}:${PATH}"
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

# --- Global Installation (verified via --dry-run target directory output) ---

@test "skills.sh: --global installs to pi skills dir" {
    run bash "$SKILLS_SH" rd3 pi --global --dry-run
    [ "$status" -eq 0 ]
    # Pi global installs to shared ~/.agents/skills/
    [[ "$output" == *".agents/skills"* ]]
}

@test "skills.sh: --global installs to codexcli skills dir" {
    run bash "$SKILLS_SH" rd3 codexcli --global --dry-run
    [ "$status" -eq 0 ]
    # CodexCLI global installs to shared ~/.agents/skills/
    [[ "$output" == *".agents/skills"* ]]
}

@test "skills.sh: --global installs to geminicli and .agents" {
    run bash "$SKILLS_SH" rd3 geminicli --global --dry-run
    [ "$status" -eq 0 ]
    # GeminiCLI global installs to shared ~/.agents/skills/
    [[ "$output" == *".agents/skills"* ]]
}

@test "skills.sh: --global installs to opencode and .agents" {
    run bash "$SKILLS_SH" rd3 opencode --global --dry-run
    [ "$status" -eq 0 ]
    # OpenCode global installs to shared ~/.agents/skills/
    [[ "$output" == *".agents/skills"* ]]
}

@test "skills.sh: --global installs to openclaw skills dir" {
    run bash "$SKILLS_SH" rd3 openclaw --global --dry-run
    [ "$status" -eq 0 ]
    # OpenClaw global installs to shared ~/.agents/skills/
    [[ "$output" == *".agents/skills"* ]]
}

@test "skills.sh: --global installs to antigravity" {
    run bash "$SKILLS_SH" rd3 antigravity --global --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *".gemini/antigravity/skills"* ]]
}

@test "skills.sh: augmentcode shows not implemented warning" {
    run bash "$SKILLS_SH" rd3 augmentcode --global --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"not implemented"* ]]
}

# --- Multiple Targets ---

@test "skills.sh: multiple targets installs to all dirs" {
    run bash "$SKILLS_SH" rd3 pi,codexcli --global --dry-run
    [ "$status" -eq 0 ]
    # Both route to shared ~/.agents/skills/ in global mode
    [[ "$output" == *".agents/skills"* ]]
}

# --- wt Plugin ---

@test "skills.sh: wt plugin installs successfully" {
    run bash "$SKILLS_SH" wt pi --global --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *".agents/skills"* ]] || [[ "$output" == *"wt"* ]]
}

# --- Verbose Mode ---

@test "skills.sh: --verbose flag is accepted" {
    run bash "$SKILLS_SH" rd3 pi --dry-run --verbose
    [ "$status" -eq 0 ]
}
