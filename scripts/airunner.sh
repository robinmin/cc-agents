#!/usr/bin/env bash
# =============================================================================
# airunner.sh - Lightweight wrapper for AI coding agents
# =============================================================================
#
# Unifies prompt/slash-command execution across coding agents.
# Supports: Claude Code, Codex, Gemini CLI, Pi, OpenCode (Tier 1)
#            Antigravity, OpenClaw (Tier 2 - TUI only)
#
# Usage:
#   scripts/airunner.sh run [prompt] [--channel <auto|current|...>] [options]
#   scripts/airunner.sh doctor
#   scripts/airunner.sh help
#
# =============================================================================

set -eo pipefail

VERSION="1.0.0"

# Tier 1 agents: priority order for auto-detection
TIER1_AGENTS="pi codex gemini claude opencode"

# Tier 2 agents: TUI only or gateway required
TIER2_AGENTS="antigravity openclaw"

# Display order
ALL_AGENTS="claude codex gemini pi opencode antigravity openclaw"

# =============================================================================
# ANSI Colors
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# =============================================================================
# Output Helpers
# =============================================================================

info()    { printf "${CYAN}ℹ️  %s${NC}\n" "$1" >&2; }
success() { printf "${GREEN}✅ %s${NC}\n" "$1" >&2; }
warn()    { printf "${YELLOW}⚠️  %s${NC}\n" "$1" >&2; }
error()   { printf "${RED}❌ %s${NC}\n" "$1" >&2; }

require_option_value() {
    local option="$1"
    local value="${2:-}"

    if [ -z "$value" ] || [[ "$value" == -* ]]; then
        error "Option requires a value: $option"
        exit 2
    fi
}

probe_output_matches() {
    local positive_pattern="$1"
    local negative_pattern="$2"
    shift 2

    local output=""
    if ! output=$("$@" 2>&1); then
        return 1
    fi

    if [ -n "$negative_pattern" ] && printf "%s\n" "$output" | grep -Eqi "$negative_pattern"; then
        return 1
    fi

    printf "%s\n" "$output" | grep -Eqi "$positive_pattern"
}

# =============================================================================
# Agent Command Mapping
# =============================================================================

agent_cmd() {
    case "$1" in
        claude)      echo "claude" ;;
        codex)       echo "codex" ;;
        gemini)      echo "gemini" ;;
        pi)          echo "pi" ;;
        opencode)    echo "opencode" ;;
        antigravity) echo "agy" ;;
        openclaw)    echo "openclaw" ;;
        *)           echo "" ;;
    esac
}

# =============================================================================
# Agent Detection
# =============================================================================

agent_installed() {
    local cmd
    cmd=$(agent_cmd "$1")
    [ -n "$cmd" ] && command -v "$cmd" &>/dev/null
}

agent_version() {
    local agent="$1"
    local cmd
    cmd=$(agent_cmd "$agent")
    local ver=""

    case "$agent" in
        claude|codex|gemini|pi|opencode|antigravity|openclaw)
            if ver=$("$cmd" --version 2>/dev/null); then
                ver="${ver%%$'\n'*}"
            else
                ver=""
            fi
            ;;
    esac

    echo "${ver:--}"
}

agent_authenticated() {
    local agent="$1"

    case "$agent" in
        claude)
            probe_output_matches \
                'authenticated|logged[[:space:]_-]*in|"loggedIn"[[:space:]]*:[[:space:]]*true' \
                'not[[:space:]_-]*authenticated|not[[:space:]_-]*logged[[:space:]_-]*in|logged[[:space:]_-]*out|unauthenticated|"loggedIn"[[:space:]]*:[[:space:]]*false' \
                claude auth status ;;
        codex)
            local output=""
            if output=$(codex login status 2>&1); then
                if printf "%s\n" "$output" | grep -Eqi 'not[[:space:]_-]*authenticated|not[[:space:]_-]*logged[[:space:]_-]*in|logged[[:space:]_-]*out|unauthenticated'; then
                    return 1
                fi
                if printf "%s\n" "$output" | grep -Eqi 'logged[[:space:]_-]*in|authenticated'; then
                    return 0
                fi
            fi
            [ -f "${HOME}/.codex/auth.json" ] || [ -f "${HOME}/.codex/auth" ] ;;
        gemini)
            [ -f "${HOME}/.gemini/settings.json" ] && grep -qi "auth\|token\|key" "${HOME}/.gemini/settings.json" 2>/dev/null ;;
        pi)
            [ -n "${GOOGLE_API_KEY:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ] || \
                pi --list-models &>/dev/null ;;
        opencode)
            probe_output_matches \
                'configured|available' \
                'not[[:space:]_-]*configured|no[[:space:]_-]+providers?[[:space:]_-]+available|unavailable' \
                opencode providers ;;
        antigravity)
            false ;;
        openclaw)
            probe_output_matches \
                '(^|[^[:alpha:]])ok([^[:alpha:]]|$)|healthy' \
                'not[[:space:]_-]*healthy|unhealthy|not[[:space:]_-]*ok' \
                openclaw health ;;
    esac
}

is_tier2() {
    case "$1" in
        antigravity|openclaw) return 0 ;;
        *) return 1 ;;
    esac
}

agent_usable() {
    local agent="$1"
    ! is_tier2 "$agent" && agent_installed "$agent" && agent_authenticated "$agent"
}

tier2_usable() {
    local agent="$1"
    is_tier2 "$agent" && agent_installed "$agent" && agent_authenticated "$agent"
}

# =============================================================================
# Slash-Command Translation
# =============================================================================

translate_slash_command() {
    local agent="$1"
    local input="$2"
    local plugin_name=""
    local cmd_name=""
    local args=""

    case "$agent" in
        claude|claude-code)
            echo "$input"
            return
            ;;
    esac

    # Only translate actual slash commands in /plugin:command [args] form.
    if [[ ! "$input" =~ ^/([[:alnum:]_.-]+):([[:alnum:]_.-]+)([[:space:]].*)?$ ]]; then
        echo "$input"
        return
    fi

    plugin_name="${BASH_REMATCH[1]}"
    cmd_name="${BASH_REMATCH[2]}"
    args="${BASH_REMATCH[3]}"

    case "$agent" in
        codex)
            echo "\$${plugin_name}-${cmd_name}${args}" ;;
        pi)
            echo "/skill:${plugin_name}-${cmd_name}${args}" ;;
        *)
            echo "/${plugin_name}-${cmd_name}${args}" ;;
    esac
}

# =============================================================================
# Agent Dispatch
# =============================================================================

dispatch_agent() {
    local agent="$1"
    local prompt="$2"
    local continue="${3:-false}"
    local model="${4:-}"
    local mode="${5:-text}"

    # Translate slash commands if prompt starts with /
    if [[ "$prompt" == /* ]]; then
        prompt=$(translate_slash_command "$agent" "$prompt")
    fi

    case "$agent" in
        claude)
            set -- -p "$prompt"
            [ "$continue" = "true" ] && set -- "$@" --continue
            [ -n "$model" ] && set -- "$@" --model "$model"
            set -- "$@" --output-format "$mode"
            claude "$@"
            ;;
        codex)
            if [ "$continue" = "true" ]; then
                if [ -n "$prompt" ]; then
                    error "Codex resume mode does not accept a new prompt; omit the prompt or drop -c"
                    return 2
                fi
                set -- exec resume --last
            else
                set -- exec "$prompt"
            fi
            [ -n "$model" ] && set -- "$@" -m "$model"
            [ "$mode" = "json" ] && set -- "$@" --json
            codex "$@"
            ;;
        gemini)
            set -- -p "$prompt"
            [ "$continue" = "true" ] && set -- "$@" -r latest
            [ -n "$model" ] && set -- "$@" -m "$model"
            set -- "$@" -o "$mode"
            gemini "$@"
            ;;
        pi)
            set -- -p "$prompt"
            [ "$continue" = "true" ] && set -- "$@" -c
            [ -n "$model" ] && set -- "$@" --model "$model"
            set -- "$@" --mode "$mode"
            pi "$@"
            ;;
        opencode)
            set -- run "$prompt"
            [ "$continue" = "true" ] && set -- "$@" -c
            [ -n "$model" ] && set -- "$@" -m "$model"
            [ "$mode" = "json" ] && set -- "$@" --format json
            opencode "$@"
            ;;
        antigravity)
            warn "Antigravity has no headless mode — launching TUI"
            agy chat "$prompt"
            ;;
        openclaw)
            warn "OpenClaw may require gateway configuration — launching with --local"
            openclaw agent --local -m "$prompt"
            ;;
    esac
}

# =============================================================================
# Channel Resolution
# =============================================================================

normalize_alias() {
    case "$1" in
        claude-code) echo "claude" ;;
        agy)         echo "antigravity" ;;
        *)          echo "$1" ;;
    esac
}

resolve_channel() {
    local channel
    channel=$(normalize_alias "$1")

    case "$channel" in
        auto)
            local agent
            for agent in $TIER1_AGENTS; do
                if agent_usable "$agent"; then
                    echo "$agent"
                    return 0
                fi
            done
            error "No usable Tier-1 agent found"
            exit 1
            ;;
        current)
            if [ -z "${AIRUNNER_CHANNEL:-}" ]; then
                error "AIRUNNER_CHANNEL env var is not set"
                exit 2
            fi
            channel=$(normalize_alias "$AIRUNNER_CHANNEL")
            case "$channel" in
                claude|codex|gemini|pi|opencode|antigravity|openclaw)
                    echo "$channel"
                    ;;
                *)
                    error "Invalid AIRUNNER_CHANNEL: ${AIRUNNER_CHANNEL}"
                    exit 2
                    ;;
            esac
            ;;
        claude|claude-code|codex|gemini|pi|opencode|agy|antigravity|openclaw)
            echo "$channel"
            ;;
        *)
            error "Unknown channel: $channel"
            exit 2
            ;;
    esac
}

# =============================================================================
# Subcommand: run
# =============================================================================

cmd_run() {
    local prompt=""
    local channel="auto"
    local continue=false
    local model=""
    local mode="text"

    while [ $# -gt 0 ]; do
        case "$1" in
            --channel)
                require_option_value "$1" "${2:-}"
                channel="$2"
                shift 2
                ;;
            -c)         continue=true; shift ;;
            --model)
                require_option_value "$1" "${2:-}"
                model="$2"
                shift 2
                ;;
            --mode)
                require_option_value "$1" "${2:-}"
                mode="$2"
                shift 2
                ;;
            -*)
                error "Unknown option: $1"
                exit 2
                ;;
            *)
                if [ -z "$prompt" ]; then
                    prompt="$1"; shift
                else
                    error "Unexpected argument: $1"
                    exit 2
                fi
                ;;
        esac
    done

    if [ "$mode" != "text" ] && [ "$mode" != "json" ]; then
        error "Invalid mode: $mode (must be text or json)"
        exit 2
    fi

    local resolved
    resolved=$(resolve_channel "$channel")

    if [ -z "$prompt" ] && ! { [ "$continue" = "true" ] && [ "$resolved" = "codex" ]; }; then
        error "Prompt is required"
        exit 2
    fi

    # Tier 2 warning
    if is_tier2 "$resolved"; then
        warn "$resolved is a Tier-2 agent (TUI/gateway only)"
    fi

    # Verify agent is installed
    if ! agent_installed "$resolved"; then
        error "Agent not installed: $resolved ($(agent_cmd "$resolved"))"
        exit 1
    fi

    local agent_exit=0
    if dispatch_agent "$resolved" "$prompt" "$continue" "$model" "$mode"; then
        :
    else
        agent_exit=$?
        if [ "$agent_exit" -eq 2 ]; then
            exit 2
        fi
        error "Agent execution failed: $resolved (exit $agent_exit)"
        exit 3
    fi
}

# =============================================================================
# Subcommand: doctor
# =============================================================================

cmd_doctor() {
    local has_usable_tier1=false

    printf "${BOLD}%-15s %-12s %-15s %-15s %-8s${NC}\n" "AGENT" "INSTALLED" "VERSION" "AUTHENTICATED" "USABLE"
    printf "%-15s %-12s %-15s %-15s %-8s\n" "-----" "---------" "-------" "-------------" "------"

    local agent
    for agent in $ALL_AGENTS; do
        local installed="no"
        local version="-"
        local auth="-"
        local usable="no"

        if agent_installed "$agent"; then
            installed="yes"
            version=$(agent_version "$agent")

            if agent_authenticated "$agent"; then
                auth="yes"
            else
                auth="no"
            fi

            if tier2_usable "$agent"; then
                usable="yes*"
            elif is_tier2 "$agent"; then
                usable="no*"
            elif agent_usable "$agent"; then
                usable="yes"
                has_usable_tier1=true
            fi
        fi

        printf "%-15s %-12s %-15s %-15s %-8s\n" "$agent" "$installed" "$version" "$auth" "$usable"
    done

    echo ""
    echo "* = Tier 2 (TUI only or gateway required)"

    if [ "$has_usable_tier1" = "true" ]; then
        exit 0
    else
        error "No usable Tier-1 agent found"
        exit 1
    fi
}

# =============================================================================
# Subcommand: help
# =============================================================================

cmd_help() {
    printf "%b\n" "\
${BOLD}airunner.sh${NC} v${VERSION} - Lightweight wrapper for AI coding agents

${BOLD}USAGE${NC}
    $(basename "$0") <command> [options]

${BOLD}COMMANDS${NC}
    run       Execute a prompt or slash command via a coding agent
    doctor    Health-check all installed agents
    help      Show this help message

${BOLD}RUN OPTIONS${NC}
    [prompt]                        Prompt or slash command to execute
    --channel <channel>             Agent channel (default: auto)
        auto                        First usable Tier-1 agent (priority: pi > codex > gemini > claude > opencode)
        current                     Read from \$AIRUNNER_CHANNEL env var
        claude|codex|gemini|pi|opencode|antigravity|openclaw
    -c                              Continue previous session (Codex resume accepts no new prompt)
    --model <model>                 Model to use (pass-through to agent)
    --mode <text|json>              Output format (normalized per agent)

${BOLD}EXAMPLES${NC}
    $(basename "$0") run \"Fix the login bug\"
    $(basename "$0") run \"/rd3:dev-run 0274\" --channel codex
    $(basename "$0") run \"Refactor auth module\" --model claude-sonnet-4-6 --mode json
    $(basename "$0") run --channel codex -c
    $(basename "$0") doctor

${BOLD}EXIT CODES${NC}
    0   Success
    1   No usable Tier-1 agent found
    2   Invalid arguments
    3   Agent execution failed

${BOLD}SLASH-COMMAND TRANSLATION${NC}
    Input format (Claude Code standard): /[plugin]:[command] [args]
    Codex:       \$[plugin]-[command] [args]
    Pi:          /skill:[plugin]-[command] [args]
    All others:  /[plugin]-[command] [args]
"
}

# =============================================================================
# Main
# =============================================================================

main() {
    local subcommand="${1:-help}"
    shift || true

    case "$subcommand" in
        run)    cmd_run "$@" ;;
        doctor) cmd_doctor ;;
        help|--help|-h)
                cmd_help ;;
        *)
            error "Unknown subcommand: $subcommand"
            echo "Run '$(basename "$0") help' for usage." >&2
            exit 2
            ;;
    esac
}

if [ "${AIRUNNER_SOURCE_ONLY:-0}" != "1" ]; then
    main "$@"
fi
