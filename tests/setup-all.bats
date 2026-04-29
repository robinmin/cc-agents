#!/usr/bin/env bats
# =============================================================================
# setup-all.bats - Tests for scripts/setup-all.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    SETUP_ALL_SH="${PROJECT_ROOT}/scripts/setup-all.sh"
    TEST_DIR="$(mktemp -d)"
}

teardown() {
    rm -rf "$TEST_DIR"
}

# --- Help & Usage ---

@test "setup-all.sh: --help exits 0 with usage" {
    run bash "$SETUP_ALL_SH" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "setup-all.sh: -h exits 0 with usage" {
    run bash "$SETUP_ALL_SH" -h
    [ "$status" -eq 0 ]
    [[ "$output" == *"USAGE"* ]]
}

@test "setup-all.sh: unknown option exits 1" {
    run bash "$SETUP_ALL_SH" --badopt
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unknown option"* ]]
}

@test "setup-all.sh: unexpected argument exits 1" {
    run bash "$SETUP_ALL_SH" unexpectedarg
    [ "$status" -ne 0 ]
    [[ "$output" == *"Unexpected argument"* ]]
}

@test "setup-all.sh: invalid target exits 1" {
    run bash "$SETUP_ALL_SH" --targets=invalidtarget
    [ "$status" -ne 0 ]
    [[ "$output" == *"Invalid target"* ]]
}

# --- Target Validation ---

@test "setup-all.sh: valid single target accepted" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Installing to: codex"* ]]
}

@test "setup-all.sh: valid multiple targets accepted" {
    run bash "$SETUP_ALL_SH" --targets=codex,pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Installing to: codex,pi"* ]]
}

@test "setup-all.sh: all targets expands" {
    run bash "$SETUP_ALL_SH" --targets=all --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Installing to all platforms"* ]]
}

@test "setup-all.sh: default targets is all" {
    run bash "$SETUP_ALL_SH" --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Installing to all platforms"* ]]
}

# --- Dry Run ---

@test "setup-all.sh: --dry-run shows preview" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"DRY RUN"* ]]
}

@test "setup-all.sh: --dry-run with claude-code shows marketplace update" {
    run bash "$SETUP_ALL_SH" --targets=claude-code --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Claude Code"* ]]
}

@test "setup-all.sh: --dry-run with codex shows codexcli mapping" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"codexcli"* ]]
}

@test "setup-all.sh: --dry-run with gemini-cli shows geminicli mapping" {
    run bash "$SETUP_ALL_SH" --targets=gemini-cli --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"geminicli"* ]]
}

# --- Skip Flags ---

@test "setup-all.sh: --skip-magents skips magents" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-magents --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Skipping magents"* ]]
}

@test "setup-all.sh: --skip-skills skips skills" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-skills --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Skipping skills"* ]]
}

@test "setup-all.sh: --skip-subagents skips subagents" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-subagents --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Skipping subagents"* ]]
}

@test "setup-all.sh: --skip-commands skips commands" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Skipping commands"* ]]
}

@test "setup-all.sh: all skip flags combined" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-magents --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Skipping magents"* ]]
    [[ "$output" == *"Skipping skills"* ]]
    [[ "$output" == *"Skipping subagents"* ]]
    [[ "$output" == *"Skipping commands"* ]]
}

# --- Plugin Selection ---

@test "setup-all.sh: --plugins=rd3 installs only rd3" {
    run bash "$SETUP_ALL_SH" --targets=codex --plugins=rd3 --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Plugins: rd3"* ]]
}

@test "setup-all.sh: --plugins=wt installs only wt" {
    run bash "$SETUP_ALL_SH" --targets=codex --plugins=wt --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Plugins: wt"* ]]
}

@test "setup-all.sh: default plugins is rd3,wt" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Plugins: rd3,wt"* ]]
}

# --- Agent Name ---

@test "setup-all.sh: --agent sets agent name" {
    run bash "$SETUP_ALL_SH" --targets=codex --agent=team-stark-children --dry-run --skip-skills --skip-subagents --skip-commands
    [ "$status" -eq 0 ]
    [[ "$output" == *"Agent: team-stark-children"* ]]
}

@test "setup-all.sh: default agent is team-stark-children" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Agent: team-stark-children"* ]]
}

# --- Target Mapping ---

@test "setup-all.sh: maps codex to codexcli" {
    run bash "$SETUP_ALL_SH" --targets=codex --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"codexcli"* ]]
}

@test "setup-all.sh: maps gemini-cli to geminicli" {
    run bash "$SETUP_ALL_SH" --targets=gemini-cli --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"geminicli"* ]]
}

@test "setup-all.sh: maps antigravity correctly" {
    run bash "$SETUP_ALL_SH" --targets=antigravity --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"antigravity"* ]]
}

@test "setup-all.sh: maps opencode correctly" {
    run bash "$SETUP_ALL_SH" --targets=opencode --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"opencode"* ]]
}

@test "setup-all.sh: maps openclaw correctly" {
    run bash "$SETUP_ALL_SH" --targets=openclaw --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"openclaw"* ]]
}

@test "setup-all.sh: maps pi correctly" {
    run bash "$SETUP_ALL_SH" --targets=pi --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"pi"* ]]
}

@test "setup-all.sh: claude-code target separated from non-claude" {
    run bash "$SETUP_ALL_SH" --targets=claude-code,codex --skip-skills --skip-subagents --skip-commands --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Claude Code"* ]]
    [[ "$output" == *"codexcli"* ]]
}

# --- Summary ---

@test "setup-all.sh: summary shows installed platforms" {
    run bash "$SETUP_ALL_SH" --targets=codex,pi --dry-run
    [ "$status" -eq 0 ]
    [[ "$output" == *"Setup complete"* ]]
}

# --- Verbose Mode ---

@test "setup-all.sh: --verbose flag is accepted" {
    run bash "$SETUP_ALL_SH" --targets=codex --dry-run --verbose
    [ "$status" -eq 0 ]
}

# --- Real Installation (non-claude) ---

@test "setup-all.sh: real install to pi (non-claude) succeeds" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SETUP_ALL_SH" --targets=pi --skip-magents --skip-subagents --skip-commands --skip-skills
    [ "$status" -eq 0 ]
}

@test "setup-all.sh: real install to codex (non-claude) succeeds" {
    local fake_home="${TEST_DIR}/home"
    run env HOME="$fake_home" bash "$SETUP_ALL_SH" --targets=codex --skip-magents --skip-subagents --skip-commands --skip-skills
    [ "$status" -eq 0 ]
}
