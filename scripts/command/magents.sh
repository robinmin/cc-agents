#!/usr/bin/env bash
# =============================================================================
# magents.sh - Install main agent configs to target AI coding agents
# =============================================================================
#
# This command installs a main agent's config files to various AI coding agents.
# Config files (IDENTITY.md, SOUL.md, AGENTS.md, USER.md) are concatenated
# into a single AGENTS.md at the target location. MEMORY.md is intentionally
# excluded — each coding agent maintains its own persistent memory independently.
#
# Usage:
#   ./scripts/command/magents.sh <agent-name> <targets> [options]
#
# Arguments:
#   agent-name   Agent folder name in magents/ (e.g., team-stark-children)
#   targets      Target agents: all, pi, claude, codexcli, geminicli, opencode, openclaw, antigravity
#
# Options:
#   --project       Install to project-level directory (default: global)
#   --project-dir   Target project directory (default: current directory, used with --project)
#   --dry-run       Preview changes without executing
#   --verbose       Enable verbose output
#   --help          Show this help message
#
# =============================================================================

set -e

# Source shared library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../lib/common.sh"

AGENT_NAME=""
TARGETS=""
DRY_RUN=false
VERBOSE=false
PROJECT=false
PROJECT_DIR=""
PROJECT_AGENTS_WRITTEN=false

AVAILABLE_TARGETS="pi,claude,codexcli,geminicli,opencode,openclaw,antigravity"

# File concatenation order
# Note: MEMORY.md is intentionally excluded — each coding agent maintains its own
# persistent memory independently. The source template in magents/ is reference-only.
AGENT_FILES=(
    "IDENTITY.md"
    "SOUL.md"
    "AGENTS.md"
    "USER.md"
)

# Symlink mappings for project-level installs.
# Format: "platform:link_path:target" where target is relative to link's parent dir.
SYMLINK_MAP=(
    "claude:.claude/CLAUDE.md:../AGENTS.md"
    "geminicli:.gemini/rules.md:../AGENTS.md"
    "opencode:.opencode/instructions.md:../AGENTS.md"
)

# =============================================================================
# Usage
# =============================================================================

usage() {
    printf "${CYAN}magents.sh${NC} - Install main agent configs to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <agent-name> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    agent-name   Agent folder name in magents/ (e.g., team-stark-children)\n"
    printf "    targets      Target agents: all, pi, claude, codexcli, geminicli, opencode, openclaw, antigravity\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --project       Install to project-level directory (default: global)\n"
    printf "    --project-dir   Target project directory (default: current directory, used with --project)\n"
    printf "    --dry-run       Preview changes without executing\n"
    printf "    --verbose       Enable verbose output\n"
    printf "    --help          Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    $(basename "$0") team-stark-children pi\n"
    printf "    $(basename "$0") team-stark-children all\n"
    printf "    $(basename "$0") team-stark-children claude --project\n"
    printf "    $(basename "$0") team-stark-children codexcli,geminicli --verbose\n\n"
    printf "${GREEN}TARGETS:${NC}\n"
    printf "    pi             Pi (AGENTS.md native)\n"
    printf "    claude         Claude Code (symlink: .claude/CLAUDE.md -> AGENTS.md)\n"
    printf "    codexcli       Codex CLI (AGENTS.md native)\n"
    printf "    geminicli      Gemini CLI (symlink: .gemini/rules.md -> ../AGENTS.md)\n"
    printf "    opencode       OpenCode CLI (symlink: .opencode/instructions.md -> ../AGENTS.md)\n"
    printf "    openclaw       OpenClaw (AGENTS.md native)\n"
    printf "    antigravity    Antigravity CLI (AGENTS.md native)\n"
    printf "    all            All supported targets above\n"
}

# =============================================================================
# Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --project)    PROJECT=true; shift ;;
            --project-dir)
                PROJECT_DIR="$2"; shift 2 ;;
            --project-dir=*)
                PROJECT_DIR="${1#*=}"; shift ;;
            --dry-run)    DRY_RUN=true; shift ;;
            --verbose)    VERBOSE=true; shift ;;
            --help|-h)    usage; exit 0 ;;
            -*)
                print_error "Unknown option: $1"; usage; exit 1 ;;
            *)
                if [ -z "$AGENT_NAME" ]; then
                    AGENT_NAME="$1"
                elif [ -z "$TARGETS" ]; then
                    TARGETS="$1"
                else
                    print_error "Unknown argument: $1"; usage; exit 1
                fi
                shift ;;
        esac
    done

    if [ -z "$AGENT_NAME" ]; then
        print_error "Agent name is required"; usage; exit 1
    fi
    if [ -z "$TARGETS" ]; then
        print_error "Target agents are required"; usage; exit 1
    fi
}

# =============================================================================
# Environment Validation
# =============================================================================

validate_environment() {
    print_info "Validating environment..."

    local agent_dir="${PROJECT_ROOT}/magents/${AGENT_NAME}"
    if [ ! -d "$agent_dir" ]; then
        print_error "Agent not found: magents/${AGENT_NAME}"
        exit 1
    fi
    print_success "Agent found: magents/${AGENT_NAME}"

    # Count available config files
    local found_files=0
    for file in "${AGENT_FILES[@]}"; do
        if [ -f "${agent_dir}/${file}" ]; then
            found_files=$((found_files + 1))
        fi
    done

    if [ "$found_files" -eq 0 ]; then
        print_error "No config files found in magents/${AGENT_NAME}"
        exit 1
    fi
    print_success "Found ${found_files} config file(s)"

    # Validate target names
    validate_targets "$TARGETS" "$AVAILABLE_TARGETS" || exit 1

    echo
}

# =============================================================================
# Config Assembly
# =============================================================================

concatenate_agent_config() {
    local agent_dir="$1"
    local output_file="$2"

    : > "$output_file"

    local first=true
    for file in "${AGENT_FILES[@]}"; do
        local filepath="${agent_dir}/${file}"
        if [ -f "$filepath" ]; then
            if [ "$first" = "true" ]; then
                first=false
            else
                echo "" >> "$output_file"
            fi
            cat "$filepath" >> "$output_file"
            echo "" >> "$output_file"

            if [ "$VERBOSE" = "true" ]; then
                print_info "  Added: ${file}"
            fi
        fi
    done

    rewrite_skill_references "$output_file"
}

# =============================================================================
# Backup Helper
# =============================================================================

backup_if_exists() {
    local filepath="$1"

    if [ ! -e "$filepath" ]; then
        return 0
    fi

    # Skip if it's already a symlink pointing to AGENTS.md
    if [ -L "$filepath" ]; then
        local target
        target=$(readlink "$filepath" 2>/dev/null || true)
        if [[ "$target" == *"AGENTS.md" ]]; then
            if [ "$VERBOSE" = "true" ]; then
                print_info "  Skipping backup of existing symlink: ${filepath}"
            fi
            return 0
        fi
    fi

    local timestamp
    timestamp=$(date +%Y%m%d%H%M%S)
    local backup_path="${filepath}.bak.${timestamp}"

    cp "$filepath" "$backup_path"
    print_info "  Backed up: ${filepath} -> ${backup_path}"
}

write_project_agents_file_once() {
    local agent_dir="$1"
    local agents_path="$2"

    if [ "$PROJECT_AGENTS_WRITTEN" = "true" ]; then
        return 0
    fi

    if [ -f "$agents_path" ]; then
        backup_if_exists "$agents_path"
    fi

    mkdir -p "$(dirname "$agents_path")"
    concatenate_agent_config "$agent_dir" "$agents_path"
    PROJECT_AGENTS_WRITTEN=true
    print_success "Wrote: ${agents_path}"
}

# =============================================================================
# Project-Level Installation
# =============================================================================

install_project_level() {
    local target="$1"
    local agent_dir="$2"
    local base_dir="$3"
    local agents_path="${base_dir}/AGENTS.md"

    local needs_symlink=false
    local link_path=""
    local link_target=""

    for entry in "${SYMLINK_MAP[@]}"; do
        IFS=':' read -r platform lpath ltarget <<< "$entry"
        if [ "$platform" = "$target" ]; then
            needs_symlink=true
            link_path="${base_dir}/${lpath}"
            link_target="$ltarget"
            break
        fi
    done

    if [ "$needs_symlink" = "true" ]; then
        if [ "$DRY_RUN" = "true" ]; then
            print_info "Would write: ${agents_path}"
            print_info "Would symlink: ${link_path} -> ${link_target}"
            return 0
        fi

        write_project_agents_file_once "$agent_dir" "$agents_path"

        if [ -L "$link_path" ]; then
            rm "$link_path"
        else
            backup_if_exists "$link_path"
            rm -f "$link_path" 2>/dev/null || true
        fi

        mkdir -p "$(dirname "$link_path")"
        ln -s "$link_target" "$link_path"
        print_success "${target}: ${link_path} -> ${link_target}"
    else
        if [ "$DRY_RUN" = "true" ]; then
            print_info "Would write: ${agents_path}"
            return 0
        fi

        write_project_agents_file_once "$agent_dir" "$agents_path"
        print_success "${target}: ${agents_path}"
    fi
}

# =============================================================================
# Global Installation
# =============================================================================

get_global_path() {
    local target="$1"
    case "$target" in
        pi)          echo "$HOME/.pi/agent/AGENTS.md" ;;
        claude)      echo "$HOME/.claude/CLAUDE.md" ;;
        codexcli)    echo "$HOME/.codex/AGENTS.md" ;;
        geminicli)   echo "$HOME/.gemini/rules.md" ;;
        opencode)    echo "$HOME/.opencode/instructions.md" ;;
        antigravity) echo "$HOME/.gemini/antigravity/AGENTS.md" ;;
        openclaw)    return 1 ;;
        *)           return 1 ;;
    esac
}

install_global() {
    local target="$1"
    local agent_dir="$2"

    local output_path
    if ! output_path=$(get_global_path "$target"); then
        print_warning "${target} does not support global installation, skipping"
        return 0
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_info "Would write: ${output_path}"
        return 0
    fi

    backup_if_exists "$output_path"
    mkdir -p "$(dirname "$output_path")"
    concatenate_agent_config "$agent_dir" "$output_path"
    print_success "${target}: ${output_path}"
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

    local agent_dir="${PROJECT_ROOT}/magents/${AGENT_NAME}"

    if [ "$PROJECT" = "true" ]; then
        print_info "Installing ${AGENT_NAME} to project level (AGENTS.md + symlinks)..."
        print_info "Target directory: $(cd "${PROJECT_DIR:-.}" && pwd)"
    else
        print_info "Installing ${AGENT_NAME} globally (direct write)..."
    fi
    echo

    local targets_list
    targets_list=$(echo "$actual_targets" | tr ',' ' ')
    for target in $targets_list; do
        if [ "$PROJECT" = "true" ]; then
            install_project_level "$target" "$agent_dir" "${PROJECT_DIR:-.}"
        else
            install_global "$target" "$agent_dir"
        fi
    done

    echo
    print_success "Installation completed successfully!"
    echo
    if [ "$PROJECT" = "true" ]; then
        print_info "Installed ${AGENT_NAME} to project level: ${actual_targets}"
        print_info "Target directory: $(cd "${PROJECT_DIR:-.}" && pwd)"
        print_info "AGENTS.md is the canonical file; symlinks created for non-native platforms"
    else
        print_info "Installed ${AGENT_NAME} globally to: ${actual_targets}"
        for target in $targets_list; do
            local output_path
            if output_path=$(get_global_path "$target"); then
                print_info "  ${target}: ${output_path}"
            fi
        done
    fi
    print_info "Files assembled: ${AGENT_FILES[*]} (MEMORY.md excluded — agent-local)"
}

main "$@"
