#!/usr/bin/env bash
# =============================================================================
# install-agents.sh - Install main agent configs to target AI coding agents
# =============================================================================
#
# This script installs a main agent's config files to various AI coding agents.
# Config files (IDENTITY.md, SOUL.md, AGENTS.md, USER.md) are concatenated
# into a single AGENTS.md at the target location. MEMORY.md is intentionally
# excluded — each coding agent maintains its own persistent memory independently. For platforms
# that don't natively support AGENTS.md, symlinks are created pointing to it.
#
# Usage:
#   ./scripts/install-agents.sh <agent-name> <targets> [options]
#
# Arguments:
#   agent-name   Agent folder name in magents/ (e.g., team-stark-children)
#   targets      Target agents: all, pi, claude, codexcli, geminicli, opencode, openclaw, antigravity
#
# Options:
#   --global       Install to user-level global directories (e.g., ~/.pi/agent/AGENTS.md)
#   --project-dir  Target project directory (default: current directory)
#   --dry-run      Preview changes without executing
#   --verbose      Enable verbose output
#   --help         Show this help message
#
# Examples:
#   ./scripts/install-agents.sh team-stark-children pi
#   ./scripts/install-agents.sh team-stark-children all
#   ./scripts/install-agents.sh team-stark-children claude --global
#   ./scripts/install-agents.sh team-stark-children codexcli,geminicli --verbose
#   ./scripts/install-agents.sh team-stark-children pi --project-dir /path/to/my-project
#
# Install Strategy:
#
#   Project-level:
#     1. Write concatenated config to <dir>/AGENTS.md
#     2. Create symlinks for platforms that need different filenames:
#        - claude:  .claude/CLAUDE.md -> AGENTS.md
#        - geminicli: GEMINI.md -> AGENTS.md
#        - opencode: .opencode/instructions.md -> ../AGENTS.md
#
#   Global (--global):
#     Direct write to each platform's expected path:
#        - pi:          ~/.pi/agent/AGENTS.md
#        - claude:      ~/.claude/CLAUDE.md
#        - codexcli:    ~/.codex/AGENTS.md
#        - geminicli:   ~/.gemini/GEMINI.md
#        - opencode:    ~/.opencode/instructions.md
#        - antigravity: ~/.antigravity/AGENTS.md
#
# Environment:
#   PROJECT_ROOT    - Root directory of the project (auto-detected)
#
# =============================================================================

set -e

# =============================================================================
# SECTION: Configuration Variables
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

AGENT_NAME=""
TARGETS=""
DRY_RUN=false
VERBOSE=false
GLOBAL=false
PROJECT_DIR=""

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
# Platforms NOT listed here natively support AGENTS.md (pi, codexcli, openclaw, antigravity).
SYMLINK_MAP=(
    "claude:.claude/CLAUDE.md:../AGENTS.md"
    "geminicli:GEMINI.md:AGENTS.md"
    "opencode:.opencode/instructions.md:../AGENTS.md"
)

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# SECTION: Helper Functions - Output Formatting
# =============================================================================

usage() {
    printf "${CYAN}install-agents.sh${NC} - Install main agent configs to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <agent-name> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    agent-name   Agent folder name in magents/ (e.g., team-stark-children)\n"
    printf "    targets      Target agents: all, pi, claude, codexcli, geminicli, opencode, openclaw, antigravity\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --global       Install to user-level directories (e.g., ~/.pi/agent/AGENTS.md)\n"
    printf "    --project-dir  Target project directory (default: current directory)\n"
    printf "    --dry-run      Preview changes without executing\n"
    printf "    --verbose      Enable verbose output\n"
    printf "    --help         Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    # Install agent config to pi in current directory\n"
    printf "    $(basename "$0") team-stark-children pi\n\n"
    printf "    # Install agent config to all supported agents globally\n"
    printf "    $(basename "$0") team-stark-children all --global\n\n"
    printf "    # Install to a specific project directory\n"
    printf "    $(basename "$0") team-stark-children claude --project-dir /path/to/my-project\n\n"
    printf "    # Install to multiple agents\n"
    printf "    $(basename "$0") team-stark-children codexcli,geminicli --verbose\n\n"
    printf "${GREEN}TARGETS:${NC}\n"
    printf "    pi             Pi (AGENTS.md native)\n"
    printf "    claude         Claude Code (symlink: .claude/CLAUDE.md -> AGENTS.md)\n"
    printf "    codexcli       Codex CLI (AGENTS.md native)\n"
    printf "    geminicli      Gemini CLI (symlink: GEMINI.md -> AGENTS.md)\n"
    printf "    opencode       OpenCode CLI (symlink: .opencode/instructions.md -> ../AGENTS.md)\n"
    printf "    openclaw       OpenClaw (AGENTS.md native)\n"
    printf "    antigravity    Antigravity CLI (AGENTS.md native)\n"
    printf "    all            All supported targets above\n"
}

print_info() { printf "${CYAN}ℹ️  $1${NC}\n"; }
print_success() { printf "${GREEN}✅ $1${NC}\n"; }
print_warning() { printf "${YELLOW}⚠️  $1${NC}\n"; }
print_error() { printf "${RED}❌ $1${NC}\n"; }

print_header() {
    printf "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${MAGENTA}║${NC}    ${CYAN}install-agents.sh${NC} - Install main agent configs        ${MAGENTA}║${NC}\n"
    printf "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n\n"
}

# =============================================================================
# SECTION: Argument Parsing
# =============================================================================

parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --global)     GLOBAL=true; shift ;;
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
# SECTION: Environment Validation
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

    # Validate target agent names
    if [ "$TARGETS" != "all" ]; then
        local targets_list
        targets_list=$(echo "$TARGETS" | tr ',' ' ')
        for target in $targets_list; do
            local valid=false
            for available in $(echo "$AVAILABLE_TARGETS" | tr ',' ' '); do
                if [ "$target" = "$available" ]; then
                    valid=true
                    break
                fi
            done
            if [ "$valid" = "false" ]; then
                print_error "Invalid target: $target"
                echo "   Available targets: $AVAILABLE_TARGETS"
                exit 1
            fi
        done
    fi

    echo
}

# =============================================================================
# SECTION: Config Assembly
# =============================================================================

# Rewrite skill references from colon format to hyphenated format.
# The colon format (plugin:skill-name) only works inside Claude Code's
# plugin system. When config is installed for other agents, the LLM needs
# hyphenated names (plugin-skill-name) to match skill directory names.
#
# Matches <word>:<lowercase-hyphenated-name> and replaces colon with hyphen.
# Uses perl word-boundary matching to avoid rewriting URLs, code blocks, etc.
#
# Args:
#   $1 - File path to rewrite
rewrite_skill_references() {
    local file="$1"
    if [ ! -f "$file" ]; then return; fi

    # Match word boundary + identifier + colon + lowercase-hyphenated name
    # e.g., rd3:anti-hallucination -> rd3-anti-hallucination
    # e.g., wt:super-coder -> wt-super-coder
    # Character class [a-z0-9-] handles identifiers with digits (rd3, cc1, etc.)
    perl -pi -e 's/\b([a-z][a-z0-9-]*):([a-z][a-z0-9-]*)/$1-$2/g' "$file"
}

# Concatenate agent config files in the defined order into a single output.
# Each source file is separated by a blank line. Missing files are skipped.
# After concatenation, skill references are rewritten from colon to hyphenated
# format for cross-platform compatibility.
#
# Args:
#   $1 - Agent source directory (e.g., magents/team-stark-children/)
#   $2 - Output file path
concatenate_agent_config() {
    local agent_dir="$1"
    local output_file="$2"

    > "$output_file"

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

    # Rewrite plugin:skill-name -> plugin-skill-name for cross-platform compat
    rewrite_skill_references "$output_file"
}

# =============================================================================
# SECTION: Backup Helper
# =============================================================================

# Backup a file with timestamp if it exists and is not already a symlink
# to AGENTS.md (i.e., don't backup our own symlinks).
#
# Args:
#   $1 - File path to backup
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

# =============================================================================
# SECTION: Project-Level Installation (Symlink Strategy)
# =============================================================================

# Install to a single target at project level.
# Strategy: write AGENTS.md once, then create symlinks for non-native platforms.
#
# Args:
#   $1 - Target agent name
#   $2 - Agent source directory
#   $3 - Base directory for installation
install_project_level() {
    local target="$1"
    local agent_dir="$2"
    local base_dir="$3"

    # Check if this target needs a symlink
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
        # Symlink platform: ensure AGENTS.md is written, then create symlink
        local agents_path="${base_dir}/AGENTS.md"

        if [ "$DRY_RUN" = "true" ]; then
            print_info "Would write: ${agents_path}"
            print_info "Would symlink: ${link_path} -> ${link_target}"
            return 0
        fi

        # Write AGENTS.md if not already written by another target
        if [ ! -f "$agents_path" ]; then
            mkdir -p "$(dirname "$agents_path")"
            concatenate_agent_config "$agent_dir" "$agents_path"
            print_success "Wrote: ${agents_path}"
        else
            if [ "$VERBOSE" = "true" ]; then
                print_info "AGENTS.md already exists, skipping write"
            fi
        fi

        # Remove existing symlink or backup existing file
        if [ -L "$link_path" ]; then
            rm "$link_path"
        else
            backup_if_exists "$link_path"
            rm -f "$link_path" 2>/dev/null || true
        fi

        # Create symlink
        mkdir -p "$(dirname "$link_path")"
        ln -s "$link_target" "$link_path"
        print_success "${target}: ${link_path} -> ${link_target}"
    else
        # Native AGENTS.md platform
        local agents_path="${base_dir}/AGENTS.md"

        if [ "$DRY_RUN" = "true" ]; then
            print_info "Would write: ${agents_path}"
            return 0
        fi

        if [ -f "$agents_path" ]; then
            if [ "$VERBOSE" = "true" ]; then
                print_info "AGENTS.md already exists, skipping write"
            fi
        else
            mkdir -p "$(dirname "$agents_path")"
            concatenate_agent_config "$agent_dir" "$agents_path"
            print_success "${target}: ${agents_path}"
        fi
    fi
}

# =============================================================================
# SECTION: Global Installation (Direct Write Strategy)
# =============================================================================

# Get the global config path for a target agent.
#
# Args:
#   $1 - Target agent name
# Prints:
#   Full path to the config file (or empty string if unsupported)
get_global_path() {
    local target="$1"
    case "$target" in
        pi)          echo "$HOME/.pi/agent/AGENTS.md" ;;
        claude)      echo "$HOME/.claude/CLAUDE.md" ;;
        codexcli)    echo "$HOME/.codex/AGENTS.md" ;;
        geminicli)   echo "$HOME/.gemini/GEMINI.md" ;;
        opencode)    echo "$HOME/.opencode/instructions.md" ;;
        antigravity) echo "$HOME/.antigravity/AGENTS.md" ;;
        openclaw)
            print_warning "OpenClaw does not support global installation, skipping"
            echo ""
            ;;
    esac
}

# Install to a single target at global level.
# Strategy: write directly to each platform's expected path.
#
# Args:
#   $1 - Target agent name
#   $2 - Agent source directory
install_global() {
    local target="$1"
    local agent_dir="$2"

    local output_path
    output_path=$(get_global_path "$target")

    if [ -z "$output_path" ]; then
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
# SECTION: Main Entry Point
# =============================================================================

main() {
    parse_args "$@"

    print_header

    # Expand "all" to actual target list
    local actual_targets="$TARGETS"
    if [ "$TARGETS" = "all" ]; then
        actual_targets="$AVAILABLE_TARGETS"
        print_info "Expanding 'all' to: $actual_targets"
    fi

    validate_environment

    local agent_dir="${PROJECT_ROOT}/magents/${AGENT_NAME}"

    if [ "$GLOBAL" = "true" ]; then
        print_info "Installing ${AGENT_NAME} globally (direct write)..."
    else
        print_info "Installing ${AGENT_NAME} to project level (AGENTS.md + symlinks)..."
    fi
    echo

    local targets_list
    targets_list=$(echo "$actual_targets" | tr ',' ' ')
    for target in $targets_list; do
        if [ "$GLOBAL" = "true" ]; then
            install_global "$target" "$agent_dir"
        else
            install_project_level "$target" "$agent_dir" "${PROJECT_DIR:-.}"
        fi
    done

    echo
    print_success "Installation completed successfully!"
    echo
    if [ "$GLOBAL" = "true" ]; then
        print_info "Installed ${AGENT_NAME} globally to: ${actual_targets}"
    else
        print_info "Installed ${AGENT_NAME} to project level: ${actual_targets}"
        print_info "AGENTS.md is the canonical file; symlinks created for non-native platforms"
    fi
    print_info "Files assembled: ${AGENT_FILES[*]} (MEMORY.md excluded — agent-local)"
}

main "$@"
