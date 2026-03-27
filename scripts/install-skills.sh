#!/usr/bin/env bash
# =============================================================================
# install-skills.sh - Install plugin skills to target AI coding agents
# =============================================================================
#
# This script installs a plugin's skills, commands, and subagents to various
# AI coding agents using rulesync for cross-platform compatibility.
#
# Usage:
#   ./scripts/install-skills.sh <plugin> <targets> [options]
#
# Arguments:
#   plugin      Plugin name (e.g., rd3, wt)
#   targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, augmentcode
#
# Options:
#   --features  Features to install: skills,commands,subagents (default: all)
#   --global    Install to user-level global directories (e.g., ~/.codex/skills/)
#   --dry-run   Preview changes without executing
#   --verbose   Enable verbose output
#   --help      Show this help message
#
# Examples:
#   ./scripts/install-skills.sh rd3 all
#   ./scripts/install-skills.sh rd3 codexcli
#   ./scripts/install-skills.sh rd3 codexcli --global        # Install globally to ~/.codex/skills/
#   ./scripts/install-skills.sh rd3 geminicli,opencode --verbose
#   ./scripts/install-skills.sh rd3 openclaw --features=skills,commands
#
# Environment:
#   PROJECT_ROOT    - Root directory of the project (auto-detected)
#   RULESYNC_DIR    - Path to .rulesync directory
#
# Dependencies:
#   - rulesync (npm install -g rulesync) or npx
#
# =============================================================================

set -e

# =============================================================================
# SECTION: Configuration Variables
# =============================================================================

# Determine script and project directories
# SCRIPT_DIR: Directory where this script resides
# PROJECT_ROOT: Root directory of the cc-agents project (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Rulesync directories for intermediate processing
RULESYNC_DIR="${PROJECT_ROOT}/.rulesync"
RULESYNC_SKILLS_DIR="${RULESYNC_DIR}/skills"
RULESYNC_SUBDIR="${RULESYNC_DIR}/subagents"

# Default configuration values
PLUGIN=""                                  # Plugin name (e.g., rd3, wt)
TARGETS=""                                 # Target agents (e.g., codexcli, geminicli)
FEATURES="skills,commands,subagents"       # Features to install
DRY_RUN=false                              # Preview mode flag
VERBOSE=false                              # Verbose output flag
GLOBAL=false                               # Install to user-level directories
PROJECT_DIR=""                             # Target project directory (default: current dir)

# Supported target agents (rulesync target names)
# These correspond to the target names in rulesync.jsonc
AVAILABLE_TARGETS="codexcli,geminicli,opencode,openclaw,antigravity,augmentcode"

# ANSI color codes for formatted output
# Used by print_* functions to add color to console messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color - reset to default

# =============================================================================
# SECTION: Helper Functions - Output Formatting
# =============================================================================

# Print usage information and exit
# Shows all available options, arguments, and examples
usage() {
    printf "${CYAN}install-skills.sh${NC} - Install plugin skills to AI coding agents\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") <plugin> <targets> [options]\n\n"
    printf "${GREEN}ARGUMENTS:${NC}\n"
    printf "    plugin      Plugin name (e.g., rd3, wt)\n"
    printf "    targets     Target agents: all, codexcli, geminicli, opencode, openclaw, antigravity, augmentcode\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --features      Features to install: skills,commands,subagents (default: all)\n"
    printf "    --project-dir   Target project directory (default: current directory)\n"
    printf "    --global        Install to user-level directories (e.g., ~/.codex/skills/)\n"
    printf "    --dry-run       Preview changes without executing\n"
    printf "    --verbose       Enable verbose output\n"
    printf "    --help          Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    # Install rd3 to all supported agents in current directory\n"
    printf "    $(basename "$0") rd3 all\n\n"
    printf "    # Install rd3 to Codex globally (available in all projects)\n"
    printf "    $(basename "$0") rd3 codexcli --global\n\n"
    printf "    # Install rd3 to a specific project directory\n"
    printf "    $(basename "$0") rd3 codexcli --project-dir /path/to/my-project\n\n"
    printf "    # Install to multiple agents\n"
    printf "    $(basename "$0") rd3 geminicli,opencode --verbose\n\n"
    printf "    # Install rd3 to OpenClaw\n"
    printf "    $(basename "$0") rd3 openclaw --features=skills,commands\n\n"
    printf "${GREEN}TARGETS:${NC}\n"
    printf "    codexcli       Codex CLI\n"
    printf "    geminicli      Google Gemini CLI\n"
    printf "    opencode       OpenCode CLI\n"
    printf "    openclaw       OpenClaw\n"
    printf "    antigravity    Google Antigravity CLI\n"
    printf "    augmentcode     Augment Code (Auggie)\n"
    printf "    all            All supported targets above\n"
}

# Print informational message in cyan
# Args:
#   $1 - Message to display
print_info() {
    printf "${CYAN}ℹ️  $1${NC}\n"
}

# Print success message in green
# Args:
#   $1 - Message to display
print_success() {
    printf "${GREEN}✅ $1${NC}\n"
}

# Print warning message in yellow
# Args:
#   $1 - Message to display
print_warning() {
    printf "${YELLOW}⚠️  $1${NC}\n"
}

# Print error message in red
# Args:
#   $1 - Message to display
print_error() {
    printf "${RED}❌ $1${NC}\n"
}

# Print script header with decorative border
# Displays when script starts execution
print_header() {
    printf "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${MAGENTA}║${NC}    ${CYAN}install-skills.sh${NC} - Install plugin skills to agents    ${MAGENTA}║${NC}\n"
    printf "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n\n"
}

# =============================================================================
# SECTION: Argument Parsing
# =============================================================================

# Parse command-line arguments
# Extracts plugin name, target agents, and optional flags from command line
# Sets global variables: PLUGIN, TARGETS, FEATURES, DRY_RUN, VERBOSE
parse_args() {
    # Loop through all command-line arguments
    while [ $# -gt 0 ]; do
        case $1 in
            # --features=skill,commands,subagents
            # Specifies which features to install (default: all)
            --features=*)
                FEATURES="${1#*=}"
                shift
                ;;
            # --dry-run
            # Preview mode: show what would be done without executing
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            # --verbose
            # Enable detailed output during execution
            --verbose)
                VERBOSE=true
                shift
                ;;
            # --global
            # Install to user-level directories (~/.codex/skills/, etc.)
            --global)
                GLOBAL=true
                shift
                ;;
            # --project-dir /path/to/project or --project-dir=/path/to/project
            # Target project directory for installation (default: current directory)
            --project-dir)
                PROJECT_DIR="$2"
                shift 2
                ;;
            --project-dir=*)
                PROJECT_DIR="${1#*=}"
                shift
                ;;
            # --help or -h
            # Display usage information and exit
            --help|-h)
                usage
                exit 0
                ;;
            # Unknown option flag
            -*)
                print_error "Unknown option: $1"
                usage
                exit 1
                ;;
            # Positional arguments
            # First: plugin name (rd3, wt)
            # Second: target agents (codexcli, geminicli, etc.)
            *)
                if [ -z "$PLUGIN" ]; then
                    PLUGIN="$1"
                elif [ -z "$TARGETS" ]; then
                    TARGETS="$1"
                else
                    print_error "Unknown argument: $1"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate required arguments are provided
    if [ -z "$PLUGIN" ]; then
        print_error "Plugin name is required"
        usage
        exit 1
    fi

    if [ -z "$TARGETS" ]; then
        print_error "Target agents are required"
        usage
        exit 1
    fi
}

# =============================================================================
# SECTION: Environment Validation
# =============================================================================

# Validate the execution environment before proceeding
# Checks:
#   - Plugin directory exists
#   - rulesync CLI is available
#   - Target names are valid
validate_environment() {
    print_info "Validating environment..."

    # Verify plugin directory exists
    # Path: plugins/{PLUGIN}/ (e.g., plugins/rd3/)
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"
    if [ ! -d "$plugin_dir" ]; then
        print_error "Plugin not found: plugins/${PLUGIN}"
        exit 1
    fi
    print_success "Plugin found: plugins/${PLUGIN}"

    # Check if rulesync is installed
    # Either as global CLI (rulesync) or via npx
    if ! command -v rulesync &> /dev/null && ! command -v npx &> /dev/null; then
        print_error "rulesync not found. Install with: npm install -g rulesync"
        exit 1
    fi
    print_success "rulesync available"

    # Validate target agent names
    # Skip if "all" is specified (will be expanded later)
    if [ "$TARGETS" != "all" ]; then
        local targets_list=$(echo "$TARGETS" | tr ',' ' ')
        for target in $targets_list; do
            local valid=false
            # Check against available targets
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
# SECTION: Resource Mapping
# =============================================================================

# Map plugin resources to rulesync directory structure
# This is the core transformation step that converts plugin format to rulesync format:
#   - commands/*.md -> .rulesync/skills/{PLUGIN}-cmd-*/
#   - skills/*/SKILL.md -> .rulesync/skills/{PLUGIN}-*/
#   - agents/*.md or subagents/*.md -> .rulesync/subagents/
#
# Each resource type is processed based on FEATURES setting
map_resources() {
    local plugin_dir="${PROJECT_ROOT}/plugins/${PLUGIN}"

    print_info "Mapping plugin resources to rulesync format..."

    # Clean rulesync directories to remove stale artifacts from previous runs
    # (e.g., non-prefixed skill dirs from older install formats)
    rm -rf "${RULESYNC_SKILLS_DIR:?}"/*
    rm -rf "${RULESYNC_SUBDIR:?}"/*

    # Create rulesync directories
    mkdir -p "$RULESYNC_SKILLS_DIR"
    mkdir -p "$RULESYNC_SUBDIR"

    # Process commands directory
    # Commands (*.md files in commands/) are converted to skills
    # This allows slash commands to be used as skills in other agents
    if [[ "$FEATURES" == *"commands"* ]] || [ "$FEATURES" = "all" ]; then
        local commands_dir="${plugin_dir}/commands"
        if [ -d "$commands_dir" ]; then
            print_info "Processing commands..."
            for cmd_file in "$commands_dir"/*.md; do
                if [ -f "$cmd_file" ]; then
                    local cmd_name=$(basename "$cmd_file" .md)
                    local target_skill_dir="${RULESYNC_SKILLS_DIR}/${PLUGIN}-cmd-${cmd_name}"

                    # Create skill directory
                    mkdir -p "$target_skill_dir"

                    # Transform command to skill format
                    # Adds required 'name' field matching directory name and
                    # rewrites rd3:skill-name references for installed targets
                    adapt_command_to_skill "$cmd_file" "$target_skill_dir/SKILL.md" "${PLUGIN}-cmd-${cmd_name}"

                    print_success "Mapped command: $cmd_name -> ${PLUGIN}-cmd-${cmd_name}"
                fi
            done
        fi
    fi

    # Process skills directory
    # Skills (*/SKILL.md directories in skills/) are copied as-is
    # Includes supporting directories: scripts, references, templates, assets
    if [[ "$FEATURES" == *"skills"* ]] || [ "$FEATURES" = "all" ]; then
        local skills_dir="${plugin_dir}/skills"
        if [ -d "$skills_dir" ]; then
            print_info "Processing skills..."
            for skill_dir in "$skills_dir"/*/; do
                if [ -d "$skill_dir" ]; then
                    local skill_name=$(basename "$skill_dir")
                    local skill_file="${skill_dir}SKILL.md"

                    if [ -f "$skill_file" ]; then
                        local target_skill_dir="${RULESYNC_SKILLS_DIR}/${PLUGIN}-${skill_name}"

                        # Create skill directory
                        mkdir -p "$target_skill_dir"

                        # Copy main skill file, rewriting name field and
                        # rd3:skill-name references for installed targets
                        rewrite_skill_for_install "$skill_file" "$target_skill_dir/SKILL.md" "${PLUGIN}-${skill_name}"

                        # Copy supporting directories if they exist
                        for subdir in scripts references templates assets; do
                            if [ -d "${skill_dir}${subdir}" ]; then
                                cp -r "${skill_dir}${subdir}" "$target_skill_dir/"
                                # Rewrite rd3:skill-name -> rd3-skill-name in
                                # all supporting files so LLMs can resolve refs
                                find "$target_skill_dir/$subdir" -type f -exec perl -pi -e 's/\b(rd3):([a-z][-a-z]*)/$1-$2/g' {} + 2>/dev/null || true
                            fi
                        done

                        print_success "Mapped skill: $skill_name"
                    fi
                fi
            done
        fi
    fi

    # Process subagents / agents directory
    # rd3 uses agents/, older plugins may use subagents/
    if [[ "$FEATURES" == *"subagents"* ]] || [ "$FEATURES" = "all" ]; then
        local subagents_dir=""
        if [ -d "${plugin_dir}/agents" ]; then
            subagents_dir="${plugin_dir}/agents"
        elif [ -d "${plugin_dir}/subagents" ]; then
            subagents_dir="${plugin_dir}/subagents"
        fi

        if [ -n "$subagents_dir" ] && [ -d "$subagents_dir" ]; then
            print_info "Processing subagents..."
            for agent_file in "$subagents_dir"/*.md; do
                if [ -f "$agent_file" ]; then
                    local agent_name=$(basename "$agent_file" .md)
                    cp "$agent_file" "${RULESYNC_SUBDIR}/${PLUGIN}-${agent_name}.md"
                    print_success "Mapped subagent: $agent_name"
                fi
            done
        fi
    fi

    echo
}

# Rewrite the 'name' field in SKILL.md to match the target directory name
# and rewrite rd3:skill-name -> rd3-skill-name references in content.
#
# Pi and other agents discover skills by directory name, so the 'name' field
# in frontmatter must match. Additionally, the rd3: colon format only works
# inside Claude Code's own plugin system; installed skills need hyphenated
# names so LLMs can resolve them as directory references.
#
# Args:
#   $1 - Source skill file path
#   $2 - Target skill file path
#   $3 - Expected skill name (must match directory name)
rewrite_skill_for_install() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"

    cp "$source_file" "$target_file"

    # Rewrite name field to match directory name
    sed -i '' "s/^name:.*/name: ${expected_name}/" "$target_file"

    # Rewrite rd3:skill-name -> rd3-skill-name references
    rewrite_skill_references "$target_file"
}

# Rewrite rd3:skill-name -> rd3-skill-name in a file.
# The colon format (rd3:sys-debugging) only works inside Claude Code's plugin
# system. When skills are installed as directories for other agents, the LLM
# needs hyphenated names (rd3-sys-debugging) to match directory names.
#
# Uses a perl one-liner for reliable word-boundary matching since the colon
# pattern rd3: could appear in URLs, code blocks, or other contexts that
# should NOT be rewritten.
#
# Args:
#   $1 - File path to rewrite
rewrite_skill_references() {
    local file="$1"
    if [ ! -f "$file" ]; then return; fi

    # Match rd3: followed by a lowercase letter and hyphens (skill name pattern)
    # Replace the colon with a hyphen
    perl -pi -e 's/\b(rd3[a-z0-9-]*):([a-z][a-z0-9-]*)/$1-$2/g' "$file"
}

# Adapt command file to conform to Skills 2.0 format
# The Skills 2.0 standard requires a 'name' field in the YAML frontmatter.
# This function ensures commands have the required metadata matching the
# directory name, and rewrites rd3:skill-name references for installed targets.
#
# Input:  plugins/rd3/commands/skill-add.md (may lack 'name' field)
# Output: .rulesync/skills/rd3-cmd-skill-add/SKILL.md (with 'name' field)
#
# Args:
#   $1 - Source command file path
#   $2 - Target skill file path
#   $3 - Expected skill name (must match directory name)
adapt_command_to_skill() {
    local source_file="$1"
    local target_file="$2"
    local expected_name="$3"
    local cmd_name=$(basename "$source_file" .md)

    # Check if frontmatter already has 'name' field
    # If yes, copy and rewrite the name + references
    if grep -q "^name:" "$source_file" 2>/dev/null; then
        cp "$source_file" "$target_file"
        # Rewrite name field to match directory name
        sed -i '' "s/^name:.*/name: ${expected_name}/" "$target_file"
        # Rewrite rd3:skill-name -> rd3-skill-name references
        rewrite_skill_references "$target_file"
        return
    fi

    # Add 'name' field to frontmatter
    # Different handling based on whether frontmatter exists:
    if grep -q "^---" "$source_file" 2>/dev/null; then
        # Has frontmatter (--- markers) but no name field
        # Use awk to insert 'name' after the opening ---
        awk -v name="$expected_name" 'NR==1 && /^---/ {print; print "name: " name; next} /^---/ {print; next} {print}' "$source_file" > "$target_file"
    else
        # No frontmatter at all
        # Create complete frontmatter with required fields
        local description=$(head -n 5 "$source_file" | grep -v "^#" | head -n 1 | tr -d '\n')
        cat > "$target_file" <<EOF
---
name: $expected_name
description: ${description:-${cmd_name} command for ${PLUGIN} plugin}
disable-model-invocation: true
---

$(cat "$source_file")
EOF
    fi

    # Rewrite rd3:skill-name -> rd3-skill-name references
    rewrite_skill_references "$target_file"
}

# =============================================================================
# SECTION: Rulesync Execution
# =============================================================================

# Run rulesync to generate agent-specific configuration files
# Rulesync reads from .rulesync/ and generates platform-specific files
#
# What it does:
#   1. Reads skills from .rulesync/skills/
#   2. Reads commands from .rulesync/commands/
#   3. Generates files in each target agent's format
#
# Args:
#   $1 - Target agents (comma-separated or 'all')
run_rulesync() {
    local targets="$1"
    local rulesync_targets="$targets"
    local rulesync_args=()
    local rulesync_workdir="$PROJECT_ROOT"
    local cleanup_workdir=false

    # OpenClaw install is handled by direct copy because this workflow does
    # not currently use a rulesync OpenClaw target.
    rulesync_targets=$(echo "$rulesync_targets" | sed 's/\(^\|,\)openclaw\(,\|$\)/\1/g' | sed 's/,,*/,/g' | sed 's/^,//; s/,$//')

    if [ -z "$rulesync_targets" ]; then
        print_info "Skipping rulesync: selected targets are handled by direct copy"
        echo
        return 0
    fi

    print_info "Running rulesync for targets: $rulesync_targets"

    # Determine rulesync command
    # Try global installation first, fall back to npx
    local rulesync_cmd="rulesync"
    if ! command -v rulesync &> /dev/null; then
        rulesync_cmd="npx --yes rulesync"
    fi

    # Build features string based on FEATURES setting
    # Must match what was mapped in map_resources()
    local features_str="skills"
    if [[ "$FEATURES" == *"commands"* ]] || [ "$FEATURES" = "all" ]; then
        features_str="${features_str},commands"
    fi
    if [[ "$FEATURES" == *"subagents"* ]] || [ "$FEATURES" = "all" ]; then
        features_str="${features_str},subagents"
    fi

    # Dry-run mode: just show what would be executed
    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would execute:"
        if [ "$GLOBAL" = "true" ]; then
            echo "   (cd <temp-rulesync-workdir> && $rulesync_cmd generate --targets $rulesync_targets --features $features_str)"
            echo "   Copy to global directories: $HOME/.codex/skills/, etc."
        else
            echo "   $rulesync_cmd generate --targets $rulesync_targets --features $features_str"
        fi
        return 0
    fi

    # Execute rulesync with appropriate verbosity
    if [ "$VERBOSE" = "true" ]; then
        rulesync_args+=(--verbose)
    fi

    if [ "$GLOBAL" = "true" ]; then
        # rulesync v6 resolves source baseDirs to $HOME in --global mode, so it
        # can no longer see this repo's .rulesync directory. Run generation in a
        # temporary workspace instead to validate against the local rulesync
        # source tree without polluting the current repo with .codex/.gemini/etc.
        rulesync_workdir=$(mktemp -d "${TMPDIR:-/tmp}/install-skills-rulesync.XXXXXX")
        cleanup_workdir=true

        if [ -f "${PROJECT_ROOT}/rulesync.jsonc" ]; then
            cp "${PROJECT_ROOT}/rulesync.jsonc" "${rulesync_workdir}/rulesync.jsonc"
        fi
        cp -R "$RULESYNC_DIR" "${rulesync_workdir}/.rulesync"

        if [ "$VERBOSE" = "true" ]; then
            print_info "Using temporary rulesync workspace: $rulesync_workdir"
        fi
    fi

    local command="$rulesync_cmd generate --targets \"$rulesync_targets\" --features \"$features_str\""
    for arg in "${rulesync_args[@]}"; do
        command="${command} ${arg}"
    done

    (cd "$rulesync_workdir" && eval "$command")
    local status=$?

    if [ "$cleanup_workdir" = "true" ]; then
        rm -rf "$rulesync_workdir"
    fi

    if [ $status -ne 0 ]; then
        return $status
    fi

    print_success "rulesync completed"
    echo
}

# =============================================================================
# SECTION: File Distribution
# =============================================================================

# Copy generated files to agent-specific directories
# Maps target agents to their expected skills locations:
#
# Project-level (default):
#   codexcli     -> .codex/skills/
#   geminicli    -> .gemini/skills/, .agents/skills/
#   opencode     -> .opencode/skills/, .agents/skills/
#   openclaw     -> skills/
#   antigravity  -> .agents/skills/
#
# Global-level (--global):
#   codexcli     -> ~/.codex/skills/
#   geminicli    -> ~/.gemini/skills/, ~/.agents/skills/
#   opencode     -> ~/.opencode/skills/, ~/.agents/skills/
#   antigravity  -> ~/.agents/skills/
#
# The .agents/skills/ directory is a cross-client convention
# that allows skills to be shared across multiple agents.
#
# Args:
#   $1 - Target agents (comma-separated)
copy_to_targets() {
    local targets="$1"

    if [ "$GLOBAL" = "true" ]; then
        print_info "Copying generated files to user-level global paths..."
    else
        print_info "Copying generated files to project-level paths..."
    fi

    # Array to hold target directories
    local target_dirs=()

    # Helper to get the base path based on GLOBAL flag and PROJECT_DIR
    # Args: $1 - project path (e.g., ".codex/skills")
    #       $2 - global path (e.g., "$HOME/.codex/skills")
    # Uses PROJECT_DIR if set, otherwise current directory
    get_path() {
        if [ "$GLOBAL" = "true" ]; then
            echo "$2"
        else
            if [ -n "$PROJECT_DIR" ]; then
                echo "${PROJECT_DIR}/$1"
            else
                echo "$1"
            fi
        fi
    }

    # Codex: Uses .codex/skills/ directory
    if [[ "$targets" == *"codexcli"* ]] || [[ "$targets" == *"codex"* ]]; then
        local codex_path=$(get_path ".codex/skills" "$HOME/.codex/skills")
        mkdir -p "$codex_path"
        target_dirs+=("$codex_path")
        print_info "Codex skills directory: $codex_path"
    fi

    # Gemini CLI: Uses .gemini/skills/ and .agents/skills/
    # .agents/skills/ provides cross-client compatibility
    if [[ "$targets" == *"geminicli"* ]]; then
        local gemini_path=$(get_path ".gemini/skills" "$HOME/.gemini/skills")
        local agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        mkdir -p "$gemini_path"
        target_dirs+=("$gemini_path")
        print_info "Gemini CLI skills directory: $gemini_path"
        mkdir -p "$agents_path"
        target_dirs+=("$agents_path")
        print_info "Cross-client skills directory: $agents_path"
    fi

    # OpenCode: Uses .opencode/skills/ and .agents/skills/
    if [[ "$targets" == *"opencode"* ]]; then
        local opencode_path=$(get_path ".opencode/skills" "$HOME/.opencode/skills")
        local agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        mkdir -p "$opencode_path"
        target_dirs+=("$opencode_path")
        print_info "OpenCode skills directory: $opencode_path"
        mkdir -p "$agents_path"
        target_dirs+=("$agents_path")
        print_info "Cross-client skills directory: $agents_path"
    fi

    # OpenClaw: Uses workspace-level skills/ directory (project-only, no global)
    if [[ "$targets" == *"openclaw"* ]]; then
        if [ "$GLOBAL" = "true" ]; then
            print_warning "OpenClaw does not support global installation, skipping"
        else
            local openclaw_path="skills"
            if [ -n "$PROJECT_DIR" ]; then
                openclaw_path="${PROJECT_DIR}/skills"
            fi
            mkdir -p "$openclaw_path"
            target_dirs+=("$openclaw_path")
            print_info "OpenClaw skills directory: $openclaw_path"
        fi
    fi

    # Antigravity: Uses .agents/skills/ only
    if [[ "$targets" == *"antigravity"* ]]; then
        local agents_path=$(get_path ".agents/skills" "$HOME/.agents/skills")
        mkdir -p "$agents_path"
        target_dirs+=("$agents_path")
        print_info "Antigravity skills directory: $agents_path"
    fi

    # Augment Code: Not yet implemented
    if [[ "$targets" == *"augmentcode"* ]]; then
        print_warning "Augment Code installation not implemented yet"
    fi

    if [ "$DRY_RUN" = "true" ]; then
        print_warning "DRY RUN - Would copy generated skills to:"
        for target_dir in "${target_dirs[@]}"; do
            echo "   $target_dir"
        done
        if [[ "$FEATURES" == *"subagents"* ]] && [[ "$targets" == *"openclaw"* ]]; then
            print_warning "OpenClaw subagent installation is not handled by install-skills.sh; use rd3:cc-agents adapt/install flows"
        fi
        echo
        return 0
    fi

    # Copy all skills from rulesync to each target directory
    # Iterates through all mapped skills and copies to all target dirs
    if [ -d "$RULESYNC_SKILLS_DIR" ]; then
        for skill_dir in "$RULESYNC_SKILLS_DIR"/*/; do
            if [ -d "$skill_dir" ]; then
                local skill_name=$(basename "$skill_dir")

                for target_dir in "${target_dirs[@]}"; do
                    local dest_dir="${target_dir}/${skill_name}"
                    mkdir -p "$dest_dir"

                    # Copy all files from skill directory
                    cp -r "$skill_dir"* "$dest_dir/" 2>/dev/null || true

                    print_success "Copied: $skill_name -> $target_dir"
                done
            fi
        done
    fi

    # Copy subagents if requested
    # Currently copies to .claude/subagents/ if it exists
    if [ -d "$RULESYNC_SUBDIR" ] && [[ "$FEATURES" == *"subagents"* ]]; then
        # Determine target subagents directory based on PROJECT_DIR
        local subagents_target_dir=".claude/subagents"
        if [ -n "$PROJECT_DIR" ]; then
            subagents_target_dir="${PROJECT_DIR}/.claude/subagents"
        fi

        for agent_file in "$RULESYNC_SUBDIR"/*.md; do
            if [ -f "$agent_file" ]; then
                local agent_name=$(basename "$agent_file")

                if [ -d "$subagents_target_dir" ]; then
                    cp "$agent_file" "${subagents_target_dir}/${agent_name}"
                    print_success "Copied subagent: $agent_name -> $subagents_target_dir"
                fi
            fi
        done

        if [[ "$targets" == *"openclaw"* ]]; then
            print_warning "OpenClaw subagent installation is not handled by install-skills.sh; use rd3:cc-agents adapt/install flows"
        fi
    fi

    echo
}

# =============================================================================
# SECTION: Main Entry Point
# =============================================================================

# Main execution function
# Orchestrates the entire installation workflow:
#   1. Parse command-line arguments
#   2. Display header
#   3. Validate environment
#   4. Map plugin resources to rulesync format
#   5. Run rulesync for target agents
#   6. Copy files to agent-specific directories
#
# Args:
#   @ - All command-line arguments passed to script
main() {
    # Step 1: Parse arguments
    parse_args "$@"

    # Step 2: Display header
    print_header

    # Step 3: Expand "all" to actual target list
    local actual_targets="$TARGETS"
    if [ "$TARGETS" = "all" ]; then
        actual_targets="$AVAILABLE_TARGETS"
        print_info "Expanding 'all' to: $actual_targets"
    fi

    # Step 4: Validate environment
    validate_environment

    # Step 5: Map resources to rulesync format
    map_resources

    # Step 6: Run rulesync
    run_rulesync "$actual_targets"

    # Step 7: Copy to target directories
    copy_to_targets "$actual_targets"

    # Step 8: Display completion message
    print_success "Installation completed successfully!"
    echo
    if [ "$GLOBAL" = "true" ]; then
        print_info "Installed ${PLUGIN} globally to: $actual_targets"
        print_info "Features: $FEATURES"
        print_info "Location: ~/.codex/skills/, ~/.gemini/skills/, etc."
    else
        print_info "Installed ${PLUGIN} to project-level: $actual_targets"
        print_info "Features: $FEATURES"
    fi
}

# Execute main function with all arguments
main "$@"
