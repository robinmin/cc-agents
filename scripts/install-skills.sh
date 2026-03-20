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
#   --dry-run   Preview changes without executing
#   --verbose   Enable verbose output
#   --help      Show this help message
#
# Examples:
#   ./scripts/install-skills.sh rd3 all
#   ./scripts/install-skills.sh rd3 codexcli
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
    printf "    --features  Features to install: skills,commands,subagents (default: all)\n"
    printf "    --dry-run   Preview changes without executing\n"
    printf "    --verbose   Enable verbose output\n"
    printf "    --help      Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    # Install rd3 to all supported agents\n"
    printf "    $(basename "$0") rd3 all\n\n"
    printf "    # Install rd3 to Codex only\n"
    printf "    $(basename "$0") rd3 codexcli\n\n"
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

    # Create rulesync directories if they don't exist
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
                    # Adds required 'name' field to frontmatter if missing
                    adapt_command_to_skill "$cmd_file" "$target_skill_dir/SKILL.md"

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

                        # Copy main skill file
                        cp "$skill_file" "$target_skill_dir/SKILL.md"

                        # Copy supporting directories if they exist
                        for subdir in scripts references templates assets; do
                            if [ -d "${skill_dir}${subdir}" ]; then
                                cp -r "${skill_dir}${subdir}" "$target_skill_dir/"
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

# Adapt command file to conform to Skills 2.0 format
# The Skills 2.0 standard requires a 'name' field in the YAML frontmatter.
# This function ensures commands have the required metadata.
#
# Input:  plugins/rd3/commands/skill-add.md (may lack 'name' field)
# Output: .rulesync/skills/rd3-cmd-skill-add/SKILL.md (with 'name' field)
#
# Args:
#   $1 - Source command file path
#   $2 - Target skill file path
adapt_command_to_skill() {
    local source_file="$1"
    local target_file="$2"
    local cmd_name=$(basename "$source_file" .md)
    local skill_name="${PLUGIN}-${cmd_name}"

    # Read the command file content
    local content=$(cat "$source_file")

    # Check if frontmatter already has 'name' field
    # If yes, just copy as-is (already valid)
    if grep -q "^name:" "$source_file" 2>/dev/null; then
        cp "$source_file" "$target_file"
        return
    fi

    # Add 'name' field to frontmatter
    # Different handling based on whether frontmatter exists:
    if grep -q "^---" "$source_file" 2>/dev/null; then
        # Has frontmatter (--- markers) but no name field
        # Use awk to insert 'name' after the opening ---
        awk -v name="$skill_name" 'NR==1 && /^---/ {print; print "name: " name; next} /^---/ {print; next} {print}' "$source_file" > "$target_file"
    else
        # No frontmatter at all
        # Create complete frontmatter with required fields
        local description=$(head -n 5 "$source_file" | grep -v "^#" | head -n 1 | tr -d '\n')
        cat > "$target_file" <<EOF
---
name: $skill_name
description: ${description:-${cmd_name} command for ${PLUGIN} plugin}
disable-model-invocation: true
---

$content
EOF
    fi
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
        echo "   $rulesync_cmd generate --targets $rulesync_targets --features $features_str"
        return 0
    fi

    # Execute rulesync with appropriate verbosity
    if [ "$VERBOSE" = "true" ]; then
        $rulesync_cmd generate --targets "$rulesync_targets" --features "$features_str" --verbose
    else
        $rulesync_cmd generate --targets "$rulesync_targets" --features "$features_str"
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
#   codexcli     -> .codex/skills/
#   geminicli    -> .gemini/skills/, .agents/skills/
#   opencode     -> .opencode/skills/, .agents/skills/
#   openclaw     -> skills/
#   antigravity  -> .agents/skills/
#
# The .agents/skills/ directory is a cross-client convention
# that allows skills to be shared across multiple agents.
#
# Args:
#   $1 - Target agents (comma-separated)
copy_to_targets() {
    local targets="$1"

    print_info "Copying generated files to agent-specific paths..."

    # Array to hold target directories
    local target_dirs=()

    # Codex: Uses .codex/skills/ directory
    if [[ "$targets" == *"codexcli"* ]] || [[ "$targets" == *"codex"* ]]; then
        mkdir -p ".codex/skills"
        target_dirs+=(".codex/skills")
        print_info "Codex skills directory: .codex/skills"
    fi

    # Gemini CLI: Uses .gemini/skills/ and .agents/skills/
    # .agents/skills/ provides cross-client compatibility
    if [[ "$targets" == *"geminicli"* ]]; then
        mkdir -p ".gemini/skills"
        target_dirs+=(".gemini/skills")
        print_info "Gemini CLI skills directory: .gemini/skills"
        mkdir -p ".agents/skills"
        target_dirs+=(".agents/skills")
        print_info "Cross-client skills directory: .agents/skills"
    fi

    # OpenCode: Uses .opencode/skills/ and .agents/skills/
    if [[ "$targets" == *"opencode"* ]]; then
        mkdir -p ".opencode/skills"
        target_dirs+=(".opencode/skills")
        print_info "OpenCode skills directory: .opencode/skills"
        mkdir -p ".agents/skills"
        target_dirs+=(".agents/skills")
        print_info "Cross-client skills directory: .agents/skills"
    fi

    # OpenClaw: Uses workspace-level skills/ directory
    if [[ "$targets" == *"openclaw"* ]]; then
        mkdir -p "skills"
        target_dirs+=("skills")
        print_info "OpenClaw skills directory: skills"
    fi

    # Antigravity: Uses .agents/skills/ only
    if [[ "$targets" == *"antigravity"* ]]; then
        mkdir -p ".agents/skills"
        target_dirs+=(".agents/skills")
        print_info "Antigravity skills directory: .agents/skills"
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
        for agent_file in "$RULESYNC_SUBDIR"/*.md; do
            if [ -f "$agent_file" ]; then
                local agent_name=$(basename "$agent_file")

                if [ -d ".claude/subagents" ]; then
                    cp "$agent_file" ".claude/subagents/${agent_name}"
                    print_success "Copied subagent: $agent_name -> .claude/subagents"
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
    print_info "Installed ${PLUGIN} to: $actual_targets"
    print_info "Features: $FEATURES"
}

# Execute main function with all arguments
main "$@"
