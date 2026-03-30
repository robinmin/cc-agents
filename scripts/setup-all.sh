#!/usr/bin/env bash
# =============================================================================
# setup-all.sh - Install cc-agents plugins globally across AI coding platforms
# =============================================================================
#
# Orchestrates installation of rd3 and wt plugins to all supported platforms.
# Claude Code uses plugin marketplace updates; all others use subcommands in
# scripts/command/ for magents, skills, subagents, and commands installation.
#
# Usage:
#   ./scripts/setup-all.sh [options]
#
# Options:
#   --targets=LIST       Platforms (default: all)
#   --agent=NAME         Agent name for magents.sh (default: team-stark-children)
#   --plugins=LIST       Plugins to install (default: rd3,wt)
#   --skip-magents       Skip magents.sh (main agent config)
#   --skip-skills        Skip skills.sh (plugin skills)
#   --skip-subagents     Skip subagents.sh (subagent definitions)
#   --skip-commands      Skip commands.sh (slash command definitions)
#   --dry-run            Preview without executing
#   --verbose            Verbose output
#   --help               Show help message
#
# Targets:
#   claude-code   Claude Code (plugin marketplace)
#   codex         Codex CLI
#   gemini-cli    Google Gemini CLI
#   antigravity   Google Antigravity CLI
#   opencode      OpenCode CLI
#   openclaw      OpenClaw
#   pi            Pi CLI
#   all           All supported platforms (default)
#
# =============================================================================

set -e

# Source shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Default values
TARGETS=""
AGENT_NAME="team-stark-children"
PLUGINS="rd3,wt"
SKIP_MAGENTS=false
SKIP_SKILLS=false
SKIP_SUBAGENTS=false
SKIP_COMMANDS=false
DRY_RUN=false
VERBOSE=false

# All supported platform names (user-facing)
ALL_PLATFORMS="claude-code,codex,gemini-cli,antigravity,opencode,openclaw,pi"

# Map user-facing names to install-scripts internal names
# Format: "user-name:agents-target:skills-target"
TARGET_MAP=(
    "codex:codexcli:codexcli"
    "gemini-cli:geminicli:geminicli"
    "antigravity:antigravity:antigravity"
    "opencode:opencode:opencode"
    "openclaw:openclaw:openclaw"
    "pi:pi:pi"
)

# =============================================================================
# Usage
# =============================================================================

usage() {
    printf "${CYAN}setup-all.sh${NC} - Install cc-agents plugins globally\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    ./scripts/setup-all.sh [options]\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --targets=LIST       Platforms (default: all)\n"
    printf "    --agent=NAME         Agent name for magents.sh (default: team-stark-children)\n"
    printf "    --plugins=LIST       Plugins to install (default: rd3,wt)\n"
    printf "    --skip-magents       Skip main agent config installation\n"
    printf "    --skip-skills        Skip plugin skills installation\n"
    printf "    --skip-subagents     Skip subagent definitions installation\n"
    printf "    --skip-commands      Skip slash command definitions installation\n"
    printf "    --dry-run            Preview without executing\n"
    printf "    --verbose            Verbose output\n"
    printf "    --help               Show this help message\n\n"
    printf "${GREEN}TARGETS:${NC}\n"
    printf "    claude-code   Claude Code (plugin marketplace update)\n"
    printf "    codex         Codex CLI (~/.codex/skills/)\n"
    printf "    gemini-cli    Google Gemini CLI (~/.gemini/skills/)\n"
    printf "    antigravity   Google Antigravity CLI (~/.gemini/antigravity/skills/)\n"
    printf "    opencode      OpenCode CLI (~/.opencode/skills/)\n"
    printf "    openclaw      OpenClaw (~/.openclaw/skills/)\n"
    printf "    pi            Pi CLI (~/.pi/agent/skills/)\n"
    printf "    all           All supported platforms (default)\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    ./scripts/setup-all.sh\n"
    printf "    ./scripts/setup-all.sh --targets=codex,pi\n"
    printf "    ./scripts/setup-all.sh --skip-magents --dry-run\n"
    printf "    ./scripts/setup-all.sh --plugins=rd3\n"
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --targets=*)       TARGETS="${1#*=}"; shift ;;
            --agent=*)         AGENT_NAME="${1#*=}"; shift ;;
            --plugins=*)       PLUGINS="${1#*=}"; shift ;;
            --skip-magents)    SKIP_MAGENTS=true; shift ;;
            --skip-skills)     SKIP_SKILLS=true; shift ;;
            --skip-subagents)  SKIP_SUBAGENTS=true; shift ;;
            --skip-commands)   SKIP_COMMANDS=true; shift ;;
            --dry-run)         DRY_RUN=true; shift ;;
            --verbose)         VERBOSE=true; shift ;;
            --help|-h)         usage; exit 0 ;;
            -*)
                print_error "Unknown option: $1"; usage; exit 1 ;;
            *)
                print_error "Unexpected argument: $1"; usage; exit 1 ;;
        esac
    done

    [ -z "$TARGETS" ] && TARGETS="all"

    # Validate targets
    local actual_targets="$TARGETS"
    [ "$TARGETS" = "all" ] && actual_targets="$ALL_PLATFORMS"

    for target in $(echo "$actual_targets" | tr ',' ' '); do
        local valid=false
        for available in $(echo "$ALL_PLATFORMS" | tr ',' ' '); do
            [ "$target" = "$available" ] && valid=true && break
        done
        if [ "$valid" = "false" ]; then
            print_error "Invalid target: $target"
            echo "   Available: $ALL_PLATFORMS"
            exit 1
        fi
    done
}

# =============================================================================
# Target Name Mapping
# =============================================================================

map_targets() {
    local targets="$1"
    local script_type="$2"
    local result=""

    for target in $(echo "$targets" | tr ',' ' '); do
        [ "$target" = "claude-code" ] && continue

        for entry in "${TARGET_MAP[@]}"; do
            IFS=':' read -r user_name agents_target skills_target <<< "$entry"
            if [ "$target" = "$user_name" ]; then
                if [ "$script_type" = "agents" ]; then
                    [ -n "$result" ] && result="${result},"
                    result="${result}${agents_target}"
                else
                    [ -n "$result" ] && result="${result},"
                    result="${result}${skills_target}"
                fi
                break
            fi
        done
    done

    echo "$result"
}

# =============================================================================
# Claude Code Installation
# =============================================================================

install_claude_code() {
    printf "\n${BOLD}${CYAN}── Claude Code - Plugin Marketplace Update ──${NC}\n"

    if ! command -v claude &> /dev/null; then
        print_error "claude CLI not found. Install from: https://code.claude.com"
        return 1
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would execute:"
        echo "   rm -rf ~/.claude/plugins/cache/cc-agents/"
        echo "   claude plugin marketplace update cc-agents"
        for plugin in $(echo "$PLUGINS" | tr ',' ' '); do
            echo "   claude plugin update ${plugin}@cc-agents"
        done
        return 0
    fi

    print_info "Clearing plugin cache..."
    rm -rf "$HOME/.claude/plugins/cache/cc-agents/"

    print_info "Updating cc-agents marketplace..."
    claude plugin marketplace update cc-agents

    for plugin in $(echo "$PLUGINS" | tr ',' ' '); do
        print_info "Updating ${plugin}@cc-agents..."
        claude plugin update "${plugin}@cc-agents"
    done

    print_success "Claude Code plugins updated"
}

# =============================================================================
# Non-Claude Platform Installation
# =============================================================================

run_command() {
    local cmd_name="$1"
    shift
    local cmd_path="${SCRIPT_DIR}/command/${cmd_name}.sh"

    if [ ! -f "$cmd_path" ]; then
        print_error "Command not found: ${cmd_path}"
        return 1
    fi

    print_info "Running: ${cmd_name}.sh $*"
    bash "$cmd_path" "$@"
}

install_non_claude() {
    local mapped_targets="$1"

    [ -z "$mapped_targets" ] && { print_info "No non-Claude targets selected"; return 0; }

    # 1. Main agent config (magents)
    if [ "$SKIP_MAGENTS" = "false" ]; then
        printf "\n${BOLD}${CYAN}── Main Agent Config (magents) ──${NC}\n"

        local agent_args=("$AGENT_NAME" "$mapped_targets")
        [ "$DRY_RUN" = "true" ] && agent_args+=(--dry-run)
        [ "$VERBOSE" = "true" ] && agent_args+=(--verbose)

        run_command magents "${agent_args[@]}"
    else
        print_info "Skipping magents (--skip-magents)"
    fi

    # 2. Plugin skills
    if [ "$SKIP_SKILLS" = "false" ]; then
        for plugin in $(echo "$PLUGINS" | tr ',' ' '); do
            printf "\n${BOLD}${CYAN}── Plugin: ${plugin} Skills ──${NC}\n"

            local skills_args=("$plugin" "$mapped_targets" "--global")
            [ "$DRY_RUN" = "true" ] && skills_args+=(--dry-run)
            [ "$VERBOSE" = "true" ] && skills_args+=(--verbose)

            run_command skills "${skills_args[@]}"
        done
    else
        print_info "Skipping skills (--skip-skills)"
    fi

    # 3. Plugin subagents
    if [ "$SKIP_SUBAGENTS" = "false" ]; then
        for plugin in $(echo "$PLUGINS" | tr ',' ' '); do
            local agents_dir="${PROJECT_ROOT}/plugins/${plugin}/agents"
            if [ -d "$agents_dir" ] && ls "$agents_dir"/*.md &>/dev/null; then
                printf "\n${BOLD}${CYAN}── Plugin: ${plugin} Subagents ──${NC}\n"

                local subagent_args=("$plugin" "$mapped_targets" "--global")
                [ "$DRY_RUN" = "true" ] && subagent_args+=(--dry-run)
                [ "$VERBOSE" = "true" ] && subagent_args+=(--verbose)

                run_command subagents "${subagent_args[@]}"
            fi
        done
    else
        print_info "Skipping subagents (--skip-subagents)"
    fi

    # 4. Plugin commands
    if [ "$SKIP_COMMANDS" = "false" ]; then
        for plugin in $(echo "$PLUGINS" | tr ',' ' '); do
            local cmds_dir="${PROJECT_ROOT}/plugins/${plugin}/commands"
            if [ -d "$cmds_dir" ] && ls "$cmds_dir"/*.md &>/dev/null; then
                printf "\n${BOLD}${CYAN}── Plugin: ${plugin} Commands ──${NC}\n"

                local cmd_args=("$plugin" "$mapped_targets" "--global")
                [ "$DRY_RUN" = "true" ] && cmd_args+=(--dry-run)
                [ "$VERBOSE" = "true" ] && cmd_args+=(--verbose)

                run_command commands "${cmd_args[@]}"
            fi
        done
    else
        print_info "Skipping commands (--skip-commands)"
    fi
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    printf "\n${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${MAGENTA}║${NC}  ${BOLD}cc-agents setup-all${NC} - Global plugin installation         ${MAGENTA}║${NC}\n"
    printf "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n\n"

    # Expand "all"
    local expanded_targets="$TARGETS"
    if [ "$TARGETS" = "all" ]; then
        expanded_targets="$ALL_PLATFORMS"
        print_info "Installing to all platforms: $expanded_targets"
    else
        print_info "Installing to: $expanded_targets"
    fi
    print_info "Agent: $AGENT_NAME"
    print_info "Plugins: $PLUGINS"
    echo

    # Separate Claude Code from other targets
    local has_claude=false
    local non_claude_targets=""
    for target in $(echo "$expanded_targets" | tr ',' ' '); do
        if [ "$target" = "claude-code" ]; then
            has_claude=true
        else
            [ -n "$non_claude_targets" ] && non_claude_targets="${non_claude_targets},"
            non_claude_targets="${non_claude_targets}${target}"
        fi
    done

    local mapped_targets
    mapped_targets=$(map_targets "$expanded_targets" "skills")

    # Execute installations
    if [ "$has_claude" = "true" ]; then
        install_claude_code
    fi

    if [ -n "$non_claude_targets" ]; then
        install_non_claude "$mapped_targets"
    fi

    # Summary
    echo
    print_success "Setup complete!"
    echo
    print_info "Summary:"
    if [ "$has_claude" = "true" ]; then
        echo "   Claude Code:   rd3@cc-agents, wt@cc-agents (plugin marketplace)"
    fi
    if [ -n "$non_claude_targets" ]; then
        for target in $(echo "$non_claude_targets" | tr ',' ' '); do
            local target_display=""
            case "$target" in
                codex)       target_display="~/.codex/skills/" ;;
                gemini-cli)  target_display="~/.gemini/skills/" ;;
                antigravity) target_display="~/.gemini/antigravity/skills/" ;;
                opencode)    target_display="~/.opencode/skills/" ;;
                openclaw)    target_display="~/.openclaw/skills/" ;;
                pi)          target_display="~/.pi/agent/skills/" ;;
            esac
            echo "   ${target}: ${target_display}"
        done
    fi
}

main "$@"
