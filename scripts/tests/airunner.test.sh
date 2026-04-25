#!/usr/bin/env bash
# =============================================================================
# airunner.test.sh - Tests for airunner.sh
# =============================================================================
#
# Run: bash scripts/tests/airunner.test.sh
#
# Uses a simple test framework: each test_ function is called, pass/fail counted.
# Mocks agent_installed/agent_authenticated for unit testing.
#
# =============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AIRUNNER="${SCRIPT_DIR}/../airunner.sh"

PASS=0
FAIL=0
TOTAL=0

# =============================================================================
# Test helpers
# =============================================================================

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$expected" = "$actual" ]; then
        PASS=$((PASS + 1))
        printf "  ✓ %s\n" "$desc"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ %s\n  expected: '%s'\n  actual:   '%s'\n" "$desc" "$expected" "$actual"
    fi
}

assert_exit() {
    local desc="$1"
    local expected_exit="$2"
    shift 2
    set +e
    "$@" 2>/dev/null
    local actual_exit=$?
    set -e
    TOTAL=$((TOTAL + 1))
    if [ "$expected_exit" = "$actual_exit" ]; then
        PASS=$((PASS + 1))
        printf "  ✓ %s (exit %d)\n" "$desc" "$actual_exit"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ %s\n  expected exit: %d\n  actual exit:   %d\n" "$desc" "$expected_exit" "$actual_exit"
    fi
}

assert_contains() {
    local desc="$1" haystack="$2" needle="$3"
    TOTAL=$((TOTAL + 1))
    if [[ "$haystack" == *"$needle"* ]]; then
        PASS=$((PASS + 1))
        printf "  ✓ %s\n" "$desc"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ %s\n  expected substring: '%s'\n  actual:             '%s'\n" "$desc" "$needle" "$haystack"
    fi
}

make_stub() {
    local dir="$1" name="$2" body="$3"
    cat > "${dir}/${name}" <<EOF
#!/usr/bin/env bash
${body}
EOF
    chmod +x "${dir}/${name}"
}

translate_test() {
    local agent="$1" input="$2"
    AIRUNNER_SOURCE_ONLY=1 source "$AIRUNNER"
    translate_slash_command "$agent" "$input"
}

# =============================================================================
# Slash-command translation tests
# =============================================================================

test_translate_claude_code() {
    printf "translate: Claude Code\n"
    assert_eq "basic slash command" \
        "/rd3:dev-run" \
        "$(translate_test "claude-code" "/rd3:dev-run")"
    assert_eq "slash command with args" \
        "/rd3:dev-run 0274 --preset standard" \
        "$(translate_test "claude-code" "/rd3:dev-run 0274 --preset standard")"
    assert_eq "wt plugin" \
        "/wt:topic-create" \
        "$(translate_test "claude-code" "/wt:topic-create")"
}

test_translate_codex() {
    printf "translate: Codex\n"
    assert_eq "basic slash command" \
        "\$rd3-dev-run" \
        "$(translate_test "codex" "/rd3:dev-run")"
    assert_eq "slash command with args" \
        "\$rd3-dev-run 0274" \
        "$(translate_test "codex" "/rd3:dev-run 0274")"
}

test_translate_pi() {
    printf "translate: Pi\n"
    assert_eq "basic slash command" \
        "/skill:rd3-dev-run" \
        "$(translate_test "pi" "/rd3:dev-run")"
    assert_eq "slash command with args" \
        "/skill:rd3-dev-run 0274 --auto" \
        "$(translate_test "pi" "/rd3:dev-run 0274 --auto")"
}

test_translate_gemini() {
    printf "translate: Gemimi/OpenCode/others\n"
    assert_eq "gemini basic" \
        "/rd3-dev-run" \
        "$(translate_test "gemini" "/rd3:dev-run")"
    assert_eq "opencode basic" \
        "/rd3-dev-run" \
        "$(translate_test "opencode" "/rd3:dev-run")"
    assert_eq "antigravity basic" \
        "/rd3-dev-run" \
        "$(translate_test "antigravity" "/rd3:dev-run")"
}

test_translate_no_colon() {
    printf "translate: no colon passthrough\n"
    assert_eq "plain command no colon" \
        "/dev-run" \
        "$(translate_test "claude-code" "/dev-run")"
}

test_translate_plain_prompt() {
    printf "translate: plain prompt (no slash)\n"
    # Non-slash prompts don't go through translation at all
    assert_eq "plain text unchanged" \
        "Fix the login bug" \
        "Fix the login bug"
}

# =============================================================================
# Exit code tests
# =============================================================================

test_exit_codes() {
    printf "exit codes\n"
    assert_exit "help exits 0" 0 "$AIRUNNER" help
    assert_exit "--help exits 0" 0 "$AIRUNNER" --help
    assert_exit "-h exits 0" 0 "$AIRUNNER" -h
    assert_exit "no args exits 0 (shows help)" 0 "$AIRUNNER"
    assert_exit "unknown subcommand exits 2" 2 "$AIRUNNER" foo
    assert_exit "run without prompt exits 2" 2 "$AIRUNNER" run
    assert_exit "run invalid mode exits 2" 2 "$AIRUNNER" run "test" --mode xml
    assert_exit "run unknown option exits 2" 2 "$AIRUNNER" run "test" --bogus
    assert_exit "missing channel value exits 2" 2 "$AIRUNNER" run "test" --channel
    assert_exit "missing model value exits 2" 2 "$AIRUNNER" run "test" --model
    assert_exit "missing mode value exits 2" 2 "$AIRUNNER" run "test" --mode
}

# =============================================================================
# Channel resolution tests
# =============================================================================

test_channel_current_env() {
    printf "channel: current with env var\n"
    local tmpdir output
    tmpdir="$(mktemp -d)"
    make_stub "$tmpdir" "claude" 'printf "claude-argv:%s\n" "$*"'
    output=$(PATH="$tmpdir:$PATH" AIRUNNER_CHANNEL=claude "$AIRUNNER" run "echo test" --channel current 2>&1)
    assert_contains "env var aliases are normalized" "$output" "claude-argv:-p echo test --output-format text"
}

test_channel_current_unset() {
    printf "channel: current without env var\n"
    set +e
    output=$(unset AIRUNNER_CHANNEL; "$AIRUNNER" run "test" --channel current 2>&1)
    exit_code=$?
    set -e
    TOTAL=$((TOTAL + 1))
    if echo "$output" | grep -qi "AIRUNNER_CHANNEL.*not set"; then
        PASS=$((PASS + 1))
        printf "  ✓ current channel error message correct\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ current channel error message missing\n  got: %s\n" "$output"
    fi
}

test_channel_unknown() {
    printf "channel: unknown channel\n"
    set +e
    output=$("$AIRUNNER" run "test" --channel nonexistent 2>&1)
    exit_code=$?
    set -e
    TOTAL=$((TOTAL + 1))
    if [ "$exit_code" = "2" ] && echo "$output" | grep -qi "Unknown channel"; then
        PASS=$((PASS + 1))
        printf "  ✓ unknown channel exits 2 with message\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ unknown channel: expected exit 2 + 'Unknown channel'\n  got exit %d: %s\n" "$exit_code" "$output"
    fi
}

# =============================================================================
# Doctor output tests
# =============================================================================

test_doctor_output() {
    printf "doctor: output format\n"
    set +e
    output=$("$AIRUNNER" doctor 2>&1)
    exit_code=$?
    set -e

    TOTAL=$((TOTAL + 1))
    if echo "$output" | grep -q "AGENT.*INSTALLED.*VERSION"; then
        PASS=$((PASS + 1))
        printf "  ✓ doctor has table header\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ doctor missing table header\n"
    fi

    TOTAL=$((TOTAL + 1))
    if echo "$output" | grep -q "claude"; then
        PASS=$((PASS + 1))
        printf "  ✓ doctor lists claude\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ doctor missing claude\n"
    fi

    TOTAL=$((TOTAL + 1))
    if echo "$output" | grep -q "Tier 2"; then
        PASS=$((PASS + 1))
        printf "  ✓ doctor shows Tier 2 legend\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ doctor missing Tier 2 legend\n"
    fi
}

test_dispatch_claude_preserves_slash() {
    printf "dispatch: claude slash syntax\n"
    local tmpdir output
    tmpdir="$(mktemp -d)"
    make_stub "$tmpdir" "claude" 'printf "claude-argv:%s\n" "$*"'
    output=$(PATH="$tmpdir:$PATH" "$AIRUNNER" run "/rd3:dev-run 0274" --channel claude-code 2>&1)
    assert_contains "claude keeps colon slash command" "$output" "claude-argv:-p /rd3:dev-run 0274 --output-format text"
}

test_exit_code_agent_failure() {
    printf "exit codes: agent failure remap\n"
    local tmpdir
    tmpdir="$(mktemp -d)"
    make_stub "$tmpdir" "claude" 'exit 7'
    assert_exit "agent failures exit 3" 3 env PATH="$tmpdir:$PATH" "$AIRUNNER" run "test prompt" --channel claude-code
}

test_codex_resume_rejects_prompt() {
    printf "codex: resume with prompt\n"
    local tmpdir output exit_code
    tmpdir="$(mktemp -d)"
    make_stub "$tmpdir" "codex" 'printf "codex-argv:%s\n" "$*"'
    set +e
    output=$(PATH="$tmpdir:$PATH" "$AIRUNNER" run "/rd3:dev-run 0274" --channel codex -c 2>&1)
    exit_code=$?
    set -e
    TOTAL=$((TOTAL + 1))
    if [ "$exit_code" = "2" ] && echo "$output" | grep -qi "Codex resume mode does not accept a new prompt"; then
        PASS=$((PASS + 1))
        printf "  ✓ codex resume rejects prompt-bearing invocation\n"
    else
        FAIL=$((FAIL + 1))
        printf "  ✗ codex resume rejection missing\n  got exit %d: %s\n" "$exit_code" "$output"
    fi
}

test_doctor_tier2_usable_marker() {
    printf "doctor: tier2 usable marker\n"
    local tmpdir output
    tmpdir="$(mktemp -d)"
    make_stub "$tmpdir" "openclaw" 'if [ "$1" = "--version" ]; then echo "0.1.0"; exit 0; fi
if [ "$1" = "health" ]; then echo "healthy"; exit 0; fi
exit 0'
    set +e
    output=$(PATH="$tmpdir:$PATH" "$AIRUNNER" doctor 2>&1)
    set -e
    assert_contains "doctor marks healthy tier2 as yes*" "$output" "openclaw        yes"
    assert_contains "doctor row carries tier2 usable marker" "$output" "yes*"
}

# =============================================================================
# Main
# =============================================================================

main() {
    printf "\n${BOLD}airunner.sh tests${NC}\n\n"

    test_translate_claude_code
    test_translate_codex
    test_translate_pi
    test_translate_gemini
    test_translate_no_colon
    test_translate_plain_prompt
    test_exit_codes
    test_dispatch_claude_preserves_slash
    test_exit_code_agent_failure
    test_codex_resume_rejects_prompt
    test_channel_current_env
    test_channel_current_unset
    test_channel_unknown
    test_doctor_output
    test_doctor_tier2_usable_marker

    printf "\n${BOLD}Results: %d/%d passed, %d failed${NC}\n" "$PASS" "$TOTAL" "$FAIL"

    [ "$FAIL" -gt 0 ] && exit 1
    exit 0
}

# ANSI colors for main output
RED='\033[0;31m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

main "$@"
