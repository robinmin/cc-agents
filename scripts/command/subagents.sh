#!/usr/bin/env bash
# =============================================================================
# subagents.sh - Install plugin subagents to target AI coding agents
# =============================================================================
#
# This command installs subagent definitions from plugins/{plugin}/agents/*.md
# to target platforms as Skills 2.0 skill directories.
#
# Usage:
#   ./scripts/command/subagents.sh <plugin> <targets> [options]
#
# Arguments:
#   plugin      Plugin name (e.g., rd3, wt)
#   targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, pi
#
# Options:
#   --global    Install to user-level global directories
#   --dry-run   Preview changes without executing
#   --verbose   Enable verbose output
#   --help      Show this help message
#
# =============================================================================

set -e

# Source shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

PLUGIN=""
TARGETS=""
DRY_RUN=false
VERBOSE=false
GLOBAL=false

AVAILABLE_TARGETS="codexcli,geminicli,opencode,openclaw,antigravity,pi"

# =============================================================================
# Usage
# =============================================================================

usage() {
    printf "${CYAN}subagents.sh${NC} - Install plugin subagents to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd3, wt)\n"
    printf "    targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, pi\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --global    Install to user-level global directories (e.g., ~/.codex/skills/)\n"
    printf "    --dry-run   Preview changes without executing\n"
    printf "    --verbose   Enable verbose output\n"
    printf "    --help      Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    $(basename "$0") rd3 all --global\n"
    printf "    $(basename "$0") rd3 codexcli --global\n"
    printf "    $(basename "$0") wt pi --global\n"
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --dry-run)  DRY_RUN=true; shift ;;
            --verbose)  VERBOSE=true; shift ;;
            --global)   GLOBAL=true; shift ;;
            --help|-h)  usage; exit 0 ;;
            -*)
                print_error "Unknown option: $1"; usage; exit 1 ;;
            *)
                if [ -z "$PLUGIN" ]; then
                    PLUGIN="$1"
                elif [ -z "$TARGETS" ]; then
                    TARGETS="$1"
                else
                    print_error "Unknown argument: $1"; usage; exit 1
                fi
                shift ;;
        esac
    done

    if [ -z "$PLUGIN" ]; then
        print_error "Plugin name is required"; usage; exit 1
    fi
    if [ -z "$TARGETS" ]; then
        print_error "Target agents are required"; usage; exit 1
    fi
}

# =============================================================================
# Validation
# =============================================================================

validate_environment() {
    print_info "Validating environment..."

    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    if [ ! -d "$plugin_dir" ]; then
        print_error "Plugin not found: plugins/${PLUGIN}"; exit 1
    fi
    print_success "Plugin found: plugins/${PLUGIN}"

    local agents_dir="${plugin_dir}/agents"
    if [ ! -d "$agents_dir" ]; then
        print_error "No agents directory found: plugins/${PLUGIN}/agents/"; exit 1
    fi

    local agent_count
    agent_count=$(ls -1 "$agents_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
    if [ "$agent_count" -eq 0 ]; then
        print_error "No agent files found in plugins/${PLUGIN}/agents/"; exit 1
    fi
    print_success "Found ${agent_count} subagent(s)"

    validate_targets "$TARGETS" "$AVAILABLE_TARGETS" || exit 1
    echo
}

# =============================================================================
# Skill Directory Preparation
# =============================================================================

# Adapt a subagent .md file to Skills 2.0 format.
# Ensures frontmatter has a 'name' field matching the target directory name.
# Rewrites plugin:skill-name -> plugin-skill-name references.
#
# Args:
#   $1 - Source agent file path
#   $2 - Target SKILL.md file path
#   $3 - Target skill name (e.g., "rd3-agent-super-coder")
adapt_subagent_to_skill() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"
    local agent_name
    agent_name=$(basename "$source_file" .md)

    if grep -q "^---" "$source_file" 2>/dev/null; then
        # Has frontmatter - inject/replace name field
        awk -v name="$expected_name" '
            function trim(value) {
                sub(/^[[:space:]]+/, "", value)
                sub(/[[:space:]]+$/, "", value)
                return value
            }

            BEGIN { in_frontmatter = 0; name_written = 0 }

            NR == 1 && /^---[[:space:]]*$/ {
                in_frontmatter = 1
                print
                print "name: " name
                name_written = 1
                next
            }

            in_frontmatter && /^---[[:space:]]*$/ {
                print
                in_frontmatter = 0
                next
            }

            in_frontmatter {
                if ($0 ~ /^name:[[:space:]]*/) { next }
                print
                next
            }

            { print }
        ' "$source_file" > "$target_file"
    else
        # No frontmatter - create one
        local description
        description=$(head -n 5 "$source_file" | grep -v "^#" | head -n 1 | tr -d '\n')
        cat > "$target_file" <<EOF
---
name: $expected_name
description: ${description:-${agent_name} subagent for ${PLUGIN} plugin}
---

$(cat "$source_file")
EOF
    fi

    rewrite_skill_references "$target_file" "$PLUGIN"
}

# =============================================================================
# Target Directory Resolution
# =============================================================================

# Get the target skills directory for a platform.
# Returns the global or project-level path.
#
# Args:
#   $1 - Target platform name
get_target_skills_dir() {
    local target="$1"

    if [ "$GLOBAL" = "true" ]; then
        case "$target" in
            codexcli)    echo "$HOME/.codex/skills" ;;
            geminicli)   echo "$HOME/.gemini/skills" ;;
            opencode)    echo "$HOME/.opencode/skills" ;;
            openclaw)    echo "$HOME/.openclaw/skills" ;;
            antigravity) echo "$HOME/.gemini/antigravity/skills" ;;
            pi)          echo "$HOME/.pi/agent/skills" ;;
        esac
    else
        case "$target" in
            codexcli)    echo ".codex/skills" ;;
            geminicli)   echo ".gemini/skills" ;;
            opencode)    echo ".opencode/skills" ;;
            openclaw)    echo "skills" ;;
            antigravity) echo ".gemini/antigravity/skills" ;;
            pi)          echo ".pi/agent/skills" ;;
        esac
    fi
}

# Get all target directories for a comma-separated list of platforms.
# Some platforms map to multiple directories (cross-client convention).
#
# Args:
#   $1 - Comma-separated target list
# Prints: One directory per line
get_all_target_dirs() {
    local targets="$1"
    local dirs=()

    add_unique_dir() {
        local d="$1"
        local existing
        for existing in "${dirs[@]}"; do
            [ "$existing" = "$d" ] && return 0
        done
        dirs+=("$d")
    }

    for target in $(echo "$targets" | tr ',' ' '); do
        local primary
        primary=$(get_target_skills_dir "$target")
        [ -n "$primary" ] && add_unique_dir "$primary"

        # Cross-client convention for multi-agent platforms
        case "$target" in
            geminicli|opencode|antigravity)
                if [ "$GLOBAL" = "true" ]; then
                    add_unique_dir "$HOME/.agents/skills"
                else
                    add_unique_dir ".agents/skills"
                fi
                ;;
        esac
    done

    printf '%s\n' "${dirs[@]}"
}

# =============================================================================
# Installation
# =============================================================================

install_subagents() {
    local targets="$1"
    local agents_dir="${PROJECT_ROOT}/plugins/${PLUGIN}/agents"

    print_info "Installing subagents from plugins/${PLUGIN}/agents/..."

    # Collect all target directories
    local target_dirs=()
    while IFS= read -r dir; do
        target_dirs+=("$dir")
    done < <(get_all_target_dirs "$targets")

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would install subagents to:"
        for target_dir in "${target_dirs[@]}"; do
            echo "   $target_dir"
        done

        for agent_file in "$agents_dir"/*.md; do
            [ -f "$agent_file" ] || continue
            local agent_name
            agent_name=$(basename "$agent_file" .md)
            local skill_name="${PLUGIN}-agent-${agent_name}"
            echo "   ${skill_name}/SKILL.md"
        done
        return 0
    fi

    # Process each agent file
    local installed=0
    for agent_file in "$agents_dir"/*.md; do
        [ -f "$agent_file" ] || continue

        local agent_name
        agent_name=$(basename "$agent_file" .md)
        local skill_name="${PLUGIN}-agent-${agent_name}"

        for target_dir in "${target_dirs[@]}"; do
            local dest_dir="${target_dir}/${skill_name}"
            mkdir -p "$dest_dir"
            adapt_subagent_to_skill "$agent_file" "$dest_dir/SKILL.md" "$skill_name"
            print_success "Installed: ${skill_name} -> ${target_dir}"
        done
        installed=$((installed + 1))
    done

    echo
    print_info "Installed ${installed} subagent(s) to ${#target_dirs[@]} target directory(ies)"
}

# =============================================================================
# Main
# =============================================================================

main() {
    parse_args "$@"

    local actual_targets
    actual_targets=$(expand_targets "$TARGETS" "$AVAILABLE_TARGETS")
    if [ "$TARGETS" = "all" ]; then
        print_info "Expanding 'all' to: $actual_targets"
    fi

    validate_environment
    install_subagents "$actual_targets"

    print_success "Subagent installation completed!"
}

main "$@"
