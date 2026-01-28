#!/bin/bash
# Claude Code tool module for setup-all.sh

# Tool metadata
TOOL_NAME="claudecode"
TOOL_DISPLAY_NAME="Claude Code"
TOOL_DESCRIPTION="Claude Code CLI for AI-assisted development"

# Default features for this tool
DEFAULT_FEATURES="rules,commands,skills"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# Claude Code Configuration
# - Installation: Plugin installation via claude CLI
# - Plugin location: ~/.claude/plugins/
# - Setup: Removes cache, pulls from marketplace, reinstalls plugins
# - Requires: claude CLI installed
#
# Plugins installed:
#   - wt@cc-agents (Web browsing, document conversion)
#   - rd2@cc-agents (RD2 workflow management)
#
# Note: Does NOT use rulesync - uses direct plugin installation
EOF
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if claude CLI is available
    if command -v claude &> /dev/null; then
        echo "   ✅ claude CLI found"
        return 0
    else
        echo "   ❌ claude CLI not found"
        echo "   Install from: https://code.claude.com"
        return 1
    fi
}

# Post-sync hook (runs after sync)
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."

    # Check if plugins directory exists
    if [ -d "$HOME/.claude/plugins/cc-agents" ]; then
        echo "   ✅ Plugin directory exists: ~/.claude/plugins/cc-agents/"
    else
        echo "   ⚠️  Plugin directory not found"
    fi

    # Verify wt plugin
    if claude plugin list 2>/dev/null | grep -q "wt@cc-agents"; then
        echo "   ✅ wt@cc-agents plugin installed"
    else
        echo "   ⚠️  wt@cc-agents plugin not found"
    fi

    # Verify rd2 plugin
    if claude plugin list 2>/dev/null | grep -q "rd2@cc-agents"; then
        echo "   ✅ rd2@cc-agents plugin installed"
    else
        echo "   ⚠️  rd2@cc-agents plugin not found"
    fi
}
