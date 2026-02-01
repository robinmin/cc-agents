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
#   - wt (Web browsing, document conversion, technical content)
#   - rd2 (RD2 workflow management, tasks, skills, agents)
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

    # Check if marketplace exists
    if [ -d "$HOME/.claude/plugins/marketplaces/cc-agents" ]; then
        echo "   ✅ Marketplace directory exists: ~/.claude/plugins/marketplaces/cc-agents/"
    else
        echo "   ⚠️  Marketplace directory not found"
    fi

    # Verify wt plugin
    if claude plugin list 2>/dev/null | grep -qw "wt"; then
        echo "   ✅ wt plugin installed"
    else
        echo "   ⚠️  wt plugin not found"
    fi

    # Verify rd2 plugin
    if claude plugin list 2>/dev/null | grep -qw "rd2"; then
        echo "   ✅ rd2 plugin installed"
    else
        echo "   ⚠️  rd2 plugin not found"
    fi
}
