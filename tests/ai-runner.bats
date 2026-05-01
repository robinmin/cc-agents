#!/usr/bin/env bats
# =============================================================================
# airunner.bats - Tests for scripts/airunner.sh
# =============================================================================

setup() {
    PROJECT_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/.." && pwd)"
    AIRUNNER="${PROJECT_ROOT}/scripts/airunner.sh"
    TEST_DIR="$(mktemp -d)"
}

teardown() {
    rm -rf "$TEST_DIR"
}

make_stub() {
    local dir="$1" name="$2" body="$3"
    cat > "${dir}/${name}" <<EOF
#!/usr/bin/env bash
${body}
EOF
    chmod +x "${dir}/${name}"
}

source_airunner() {
    AIRUNNER_SOURCE_ONLY=1 source "$AIRUNNER"
}

# =============================================================================
# Slash-command translation
# =============================================================================

@test "translate: claude-code preserves colon syntax" {
    source_airunner
    run translate_slash_command "claude-code" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/rd3:dev-run" ]
}

@test "translate: claude-code slash command with args" {
    source_airunner
    run translate_slash_command "claude-code" "/rd3:dev-run 0274 --preset standard"
    [ "$status" -eq 0 ]
    [ "$output" = "/rd3:dev-run 0274 --preset standard" ]
}

@test "translate: claude-code wt plugin" {
    source_airunner
    run translate_slash_command "claude-code" "/wt:topic-create"
    [ "$status" -eq 0 ]
    [ "$output" = "/wt:topic-create" ]
}

@test "translate: codex basic slash command" {
    source_airunner
    run translate_slash_command "codex" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "\$rd3-dev-run" ]
}

@test "translate: codex slash command with args" {
    source_airunner
    run translate_slash_command "codex" "/rd3:dev-run 0274"
    [ "$status" -eq 0 ]
    [ "$output" = "\$rd3-dev-run 0274" ]
}

@test "translate: pi basic slash command" {
    source_airunner
    run translate_slash_command "pi" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/skill:rd3-dev-run" ]
}

@test "translate: pi slash command with args" {
    source_airunner
    run translate_slash_command "pi" "/rd3:dev-run 0274 --auto"
    [ "$status" -eq 0 ]
    [ "$output" = "/skill:rd3-dev-run 0274 --auto" ]
}

@test "translate: gemini converts to hyphen format" {
    source_airunner
    run translate_slash_command "gemini" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/rd3-dev-run" ]
}

@test "translate: opencode converts to hyphen format" {
    source_airunner
    run translate_slash_command "opencode" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/rd3-dev-run" ]
}

@test "translate: antigravity converts to hyphen format" {
    source_airunner
    run translate_slash_command "antigravity" "/rd3:dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/rd3-dev-run" ]
}

@test "translate: no colon passthrough" {
    source_airunner
    run translate_slash_command "claude-code" "/dev-run"
    [ "$status" -eq 0 ]
    [ "$output" = "/dev-run" ]
}

@test "translate: plain prompt (no slash) unchanged" {
    source_airunner
    run translate_slash_command "codex" "Fix the login bug"
    [ "$status" -eq 0 ]
    [ "$output" = "Fix the login bug" ]
}

# =============================================================================
# Exit codes
# =============================================================================

@test "help exits 0" {
    run bash "$AIRUNNER" help
    [ "$status" -eq 0 ]
}

@test "--help exits 0" {
    run bash "$AIRUNNER" --help
    [ "$status" -eq 0 ]
}

@test "-h exits 0" {
    run bash "$AIRUNNER" -h
    [ "$status" -eq 0 ]
}

@test "no args exits 0 (shows help)" {
    run bash "$AIRUNNER"
    [ "$status" -eq 0 ]
}

@test "unknown subcommand exits 2" {
    run bash "$AIRUNNER" foo
    [ "$status" -eq 2 ]
}

@test "run without prompt exits 2" {
    run bash "$AIRUNNER" run
    [ "$status" -eq 2 ]
}

@test "run invalid mode exits 2" {
    run bash "$AIRUNNER" run "test" --mode xml
    [ "$status" -eq 2 ]
}

@test "run unknown option exits 2" {
    run bash "$AIRUNNER" run "test" --bogus
    [ "$status" -eq 2 ]
}

@test "missing channel value exits 2" {
    run bash "$AIRUNNER" run "test" --channel
    [ "$status" -eq 2 ]
}

@test "missing model value exits 2" {
    run bash "$AIRUNNER" run "test" --model
    [ "$status" -eq 2 ]
}

@test "missing mode value exits 2" {
    run bash "$AIRUNNER" run "test" --mode
    [ "$status" -eq 2 ]
}

# =============================================================================
# Channel resolution
# =============================================================================

@test "channel: current with env var resolves correctly" {
    make_stub "$TEST_DIR" "claude" 'printf "claude-argv:%s\n" "$*"'
    run env PATH="$TEST_DIR:$PATH" AIRUNNER_CHANNEL=claude bash "$AIRUNNER" run "echo test" --channel current
    [ "$status" -eq 0 ]
    [[ "$output" == *"claude-argv:-p echo test --output-format text"* ]]
}

@test "channel: current without env var exits 2" {
    run env -u AIRUNNER_CHANNEL bash "$AIRUNNER" run "test" --channel current
    [ "$status" -eq 2 ]
    [[ "$output" == *"AIRUNNER_CHANNEL"* ]]
}

@test "channel: unknown channel exits 2" {
    run bash "$AIRUNNER" run "test" --channel nonexistent
    [ "$status" -eq 2 ]
    [[ "$output" == *"Unknown channel"* ]]
}

# =============================================================================
# Doctor output
# =============================================================================

@test "doctor: has table header" {
    run bash "$AIRUNNER" doctor
    [[ "$output" == *"AGENT"* ]] && [[ "$output" == *"INSTALLED"* ]] && [[ "$output" == *"VERSION"* ]]
}

@test "doctor: lists claude agent" {
    run bash "$AIRUNNER" doctor
    [[ "$output" == *"claude"* ]]
}

@test "doctor: shows Tier 2 legend" {
    run bash "$AIRUNNER" doctor
    [[ "$output" == *"Tier 2"* ]]
}

# =============================================================================
# Dispatch & agent interaction
# =============================================================================

@test "dispatch: claude preserves slash command syntax" {
    make_stub "$TEST_DIR" "claude" 'printf "claude-argv:%s\n" "$*"'
    run env PATH="$TEST_DIR:$PATH" bash "$AIRUNNER" run "/rd3:dev-run 0274" --channel claude-code
    [ "$status" -eq 0 ]
    [[ "$output" == *"claude-argv:-p /rd3:dev-run 0274 --output-format text"* ]]
}

@test "exit code: agent failure remapped to 3" {
    make_stub "$TEST_DIR" "claude" 'exit 7'
    run env PATH="$TEST_DIR:$PATH" bash "$AIRUNNER" run "test prompt" --channel claude-code
    [ "$status" -eq 3 ]
}

@test "codex: resume with prompt exits 2" {
    make_stub "$TEST_DIR" "codex" 'printf "codex-argv:%s\n" "$*"'
    run env PATH="$TEST_DIR:$PATH" bash "$AIRUNNER" run "/rd3:dev-run 0274" --channel codex -c
    [ "$status" -eq 2 ]
    [[ "$output" == *"Codex resume mode does not accept a new prompt"* ]]
}

@test "doctor: tier2 healthy agent shows yes* marker" {
    make_stub "$TEST_DIR" "openclaw" 'if [ "$1" = "--version" ]; then echo "0.1.0"; exit 0; fi
if [ "$1" = "health" ]; then echo "healthy"; exit 0; fi
exit 0'
    run env PATH="$TEST_DIR:$PATH" bash "$AIRUNNER" doctor
    [[ "$output" == *"openclaw"*"yes"*"yes*"* ]]
}

@test "auth: codex explicit negative status wins over stale auth file" {
    local home
    home="$(mktemp -d)"
    mkdir -p "${home}/.codex"
    touch "${home}/.codex/auth.json"
    make_stub "$TEST_DIR" "codex" 'if [ "$1 $2" = "login status" ]; then echo "Not authenticated"; exit 0; fi
exit 0'
    run env PATH="$TEST_DIR:/usr/bin:/bin" HOME="$home" bash -c 'AIRUNNER_SOURCE_ONLY=1 source "$1"; if agent_authenticated codex; then echo yes; else echo no; fi' _ "$AIRUNNER"
    [ "$output" = "no" ]
}

@test "doctor: version failure does not crash" {
    make_stub "$TEST_DIR" "claude" 'if [ "$1" = "--version" ]; then exit 42; fi
if [ "$1 $2" = "auth status" ]; then echo "Authenticated"; exit 0; fi
exit 0'
    run env PATH="$TEST_DIR:/usr/bin:/bin" bash "$AIRUNNER" doctor
    [ "$status" -eq 0 ]
    [[ "$output" == *"claude"*"yes"*"-"*"yes"*"yes"* ]]
}
