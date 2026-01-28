#!/usr/bin/env bash
# setup-all.sh - Main orchestrator for syncing rd2 plugins to vibe coding tools
#
# This script uses rulesync to sync rd2 plugins to multiple AI coding tools.
# Each tool has a module in scripts/tools/ that defines its configuration.
#
# Usage:
#   ./scripts/setup-all.sh                          # Sync all tools
#   ./scripts/setup-all.sh --tools=antigravity,gemini-cli
#   ./scripts/setup-all.sh --features=rules,commands
#   ./scripts/setup-all.sh --dry-run
#   ./scripts/setup-all.sh --verbose

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/lib"
TOOLS_DIR="${SCRIPT_DIR}/tools"

# Source shared libraries
source "${LIB_DIR}/validation.sh"
source "${LIB_DIR}/rulesync-wrapper.sh"

# Default values
TOOLS="*"
FEATURES="*"
DRY_RUN=false
VERBOSE=false

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Available tools (for validation)
AVAILABLE_TOOLS="claude antigravity gemini-cli auggie opencode"

# Print usage
usage() {
    printf "${CYAN}setup-all.sh${NC} - Sync rd2 plugins to vibe coding tools\n\n"
    printf "${GREEN}USAGE:${NC}\n"
    printf "    $(basename "$0") [OPTIONS]\n\n"
    printf "${GREEN}OPTIONS:${NC}\n"
    printf "    --tools=LIST        Comma-separated list of tools to sync\n"
    printf "                        Available: claude, antigravity, gemini-cli, auggie, opencode\n"
    printf "                        Default: all tools\n\n"
    printf "    --features=LIST     Comma-separated list of features to sync\n"
    printf "                        Available: rules, ignore, mcp, commands, subagents, skills\n"
    printf "                        Default: all features\n\n"
    printf "    --dry-run           Preview changes without executing\n\n"
    printf "    --verbose           Enable verbose output\n\n"
    printf "    --help              Show this help message\n\n"
    printf "${GREEN}EXAMPLES:${NC}\n"
    printf "    # Sync all tools\n"
    printf "    $(basename "$0")\n\n"
    printf "    # Sync specific tools\n"
    printf "    $(basename "$0") --tools=antigravity,gemini-cli\n\n"
    printf "    # Sync specific features\n"
    printf "    $(basename "$0") --features=rules,commands\n\n"
    printf "    # Preview changes\n"
    printf "    $(basename "$0") --dry-run\n\n"
    printf "    # Verbose output\n"
    printf "    $(basename "$0") --verbose\n\n"
    printf "${GREEN}TOOLS:${NC}\n"
    printf "    claude          Claude Code CLI (direct plugin install)\n"
    printf "    antigravity     Google Antigravity CLI\n"
    printf "    gemini-cli      Google Gemini CLI\n"
    printf "    auggie          Augment Code CLI\n"
    printf "    opencode        OpenCode CLI\n\n"
    printf "${GREEN}FEATURES:${NC}\n"
    printf "    rules           Project rules and guidelines\n"
    printf "    ignore          Ignore patterns (.gitignore style)\n"
    printf "    mcp             MCP server configurations\n"
    printf "    commands        Slash commands\n"
    printf "    subagents       Subagent definitions\n"
    printf "    skills          Agent skills\n\n"
}

# Parse command-line arguments
parse_args() {
    while [ $# -gt 0 ]; do
        case $1 in
            --tools=*)
                TOOLS="${1#*=}"
                shift
                ;;
            --features=*)
                FEATURES="${1#*=}"
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --help|-h)
                usage
                exit 0
                ;;
            *)
                printf "${RED}Error: Unknown option: $1${NC}\n"
                usage
                exit 1
                ;;
        esac
    done
}

# Print header
print_header() {
    printf "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${MAGENTA}║${NC}    ${CYAN}setup-all.sh${NC} - Sync cc-agents plugins to vibe tools     ${MAGENTA}║${NC}\n"
    printf "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}\n\n"
}

# Print section header
print_section() {
    printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    printf "${BLUE}  $1${NC}\n"
    printf "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Print info message
print_info() {
    printf "${CYAN}ℹ️  $1${NC}\n"
}

# Print success message
print_success() {
    printf "${GREEN}✅ $1${NC}\n"
}

# Print warning message
print_warning() {
    printf "${YELLOW}⚠️  $1${NC}\n"
}

# Print error message
print_error() {
    printf "${RED}❌ $1${NC}\n"
}

# Validate tool name
validate_tool_name() {
    local tool="$1"
    for available in $AVAILABLE_TOOLS; do
        if [ "$tool" = "$available" ]; then
            return 0
        fi
    done
    return 1
}

# Get rulesync target name from tool name (case statement for bash 3.x compatibility)
get_rulesync_target() {
    local tool="$1"
    case "$tool" in
        claude)
            echo "claudecode"
            ;;
        antigravity)
            echo "antigravity"
            ;;
        gemini-cli)
            echo "geminicli"
            ;;
        auggie)
            echo "augmentcode"
            ;;
        opencode)
            echo "opencode"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Validate environment
validate_environment() {
    print_section "Validating Environment"

    # Determine if we need rulesync (only if syncing non-claude tools)
    local needs_rulesync=false
    if [ "$TOOLS" = "*" ]; then
        needs_rulesync=true
    else
        local tools_list=$(echo "$TOOLS" | sed 's/,/ /g')
        for tool in $tools_list; do
            tool=$(echo "$tool" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') # trim whitespace
            if [ "$tool" != "claude" ]; then
                needs_rulesync=true
                break
            fi
        done
    fi

    # Check if rulesync is available (only if needed)
    if [ "$needs_rulesync" = "true" ]; then
        if ! check_rulesync; then
            print_error "rulesync CLI not found"
            echo "   Install with: npm install -g rulesync"
            echo "   Or use: npx rulesync"
            exit 1
        fi
        print_success "rulesync CLI found"

        # Check if .rulesync directory exists
        if ! check_rulesync_dir; then
            print_warning ".rulesync directory not found"
            print_info "Initializing rulesync..."
            init_rulesync "$DRY_RUN"
        fi
    else
        print_info "Skipping rulesync checks (only Claude Code selected)"
    fi

    # Validate tool names if not wildcard
    if [ "$TOOLS" != "*" ]; then
        # Convert comma-separated to space-separated for validation
        local tools_list=$(echo "$TOOLS" | sed 's/,/ /g')
        for tool in $tools_list; do
            tool=$(echo "$tool" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') # trim whitespace
            if ! validate_tool_name "$tool"; then
                print_error "Invalid tool: $tool"
                echo "   Available tools: $AVAILABLE_TOOLS"
                exit 1
            fi
        done
        print_success "Tools validated: $TOOLS"
    else
        print_info "Syncing all available tools"
    fi

    # Validate feature names if not wildcard (only for tools that use rulesync)
    if [ "$FEATURES" != "*" ]; then
        if [ "$needs_rulesync" = "true" ]; then
            if ! validate_features "$FEATURES"; then
                exit 1
            fi
            print_success "Features validated: $FEATURES"
        else
            print_info "Features ignored (Claude Code does not use rulesync)"
        fi
    else
        if [ "$needs_rulesync" = "true" ]; then
            print_info "Syncing all available features"
        fi
    fi

    echo
}

# Load tool module
load_tool_module() {
    local tool="$1"
    local module_file="${TOOLS_DIR}/${tool}.sh"

    if [ ! -f "$module_file" ]; then
        print_error "Tool module not found: $module_file"
        return 1
    fi

    source "$module_file"
    return 0
}

# Sync single tool
sync_tool() {
    local tool="$1"
    local target=$(get_rulesync_target "$tool")
    local tool_features="$FEATURES"

    if [ -z "$target" ]; then
        print_error "Unknown tool: $tool"
        return 1
    fi

    echo
    print_section "Syncing: $TOOL_DISPLAY_NAME"

    # Get tool config info
    get_tool_config

    # Run pre-sync hook
    if declare -f pre_sync > /dev/null 2>&1; then
        pre_sync
    fi

    # Special handling for Claude Code (direct plugin install, no rulesync)
    if [ "$tool" = "claude" ]; then
        echo
        print_info "Claude Code uses direct plugin installation (not rulesync)"

        if [ "$DRY_RUN" = "true" ]; then
            print_warning "Dry run mode - would execute:"
            echo "   rm -rf ~/.claude/plugins/cache/cc-agents"
            echo "   git -C ~/.claude/plugins/marketplaces/cc-agents/ pull -a"
            echo "   claude plugin uninstall wt@cc-agents rd2@cc-agents"
            echo "   claude plugin install wt@cc-agents rd2@cc-agents"
        else
            print_info "Removing cache and updating marketplace..."
            rm -rf ~/.claude/plugins/cache/cc-agents
            if [ -d ~/.claude/plugins/marketplaces/cc-agents ]; then
                git -C ~/.claude/plugins/marketplaces/cc-agents/ pull -a
            fi

            print_info "Reinstalling plugins..."
            claude plugin uninstall wt@cc-agents rd2@cc-agents 2>/dev/null || true
            claude plugin install wt@cc-agents rd2@cc-agents
        fi
    else
        # Determine features for this tool
        if [ "$tool_features" = "*" ]; then
            tool_features="$DEFAULT_FEATURES"
        fi

        # Build rulesync targets and features
        local rulesync_targets="$target"
        local rulesync_features="$tool_features"

        # Run rulesync
        echo
        if ! run_rulesync "$rulesync_targets" "$rulesync_features" "$DRY_RUN" "$VERBOSE"; then
            print_error "Failed to sync $TOOL_DISPLAY_NAME"
            return 1
        fi
    fi

    echo

    # Run post-sync hook
    if declare -f post_sync > /dev/null 2>&1; then
        post_sync
    fi

    print_success "$TOOL_DISPLAY_NAME synced successfully"
}

# Main execution
main() {
    parse_args "$@"
    print_header

    # Validate environment
    validate_environment

    # Determine which tools to sync and normalize to space-separated
    if [ "$TOOLS" = "*" ]; then
        tools_to_sync="$AVAILABLE_TOOLS"
    else
        # Convert comma-separated to space-separated
        tools_to_sync=$(echo "$TOOLS" | sed 's/,/ /g')
    fi

    # Sync each tool
    success_count=0
    failed_tools=""

    for tool in $tools_to_sync; do
        tool=$(echo "$tool" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//') # trim whitespace
        if load_tool_module "$tool"; then
            if sync_tool "$tool"; then
                success_count=$((success_count + 1))
            else
                if [ -n "$failed_tools" ]; then
                    failed_tools="$failed_tools, $tool"
                else
                    failed_tools="$tool"
                fi
            fi
        else
            if [ -n "$failed_tools" ]; then
                failed_tools="$failed_tools, $tool"
            else
                failed_tools="$tool"
            fi
        fi
    done

    # Count total tools
    local total_tools=0
    for tool in $tools_to_sync; do
        total_tools=$((total_tools + 1))
    done

    # Print summary
    echo
    print_section "Summary"

    if [ $success_count -eq $total_tools ]; then
        print_success "All tools synced successfully! ($success_count/$total_tools)"
        echo
        if [ "$DRY_RUN" = "true" ]; then
            print_info "This was a dry run. No actual changes were made."
            print_info "Run without --dry-run to apply changes."
        else
            print_info "You can now use your vibe coding tools with the synced plugins."
        fi
        return 0
    else
        print_warning "Some tools failed to sync"
        echo
        echo "Successful: $success_count/$total_tools"
        if [ -n "$failed_tools" ]; then
            echo "Failed: $failed_tools"
        fi
        return 1
    fi
}

# Run main function
main "$@"
