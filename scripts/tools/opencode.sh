#!/bin/bash
# OpenCode tool module for setup-all.sh

# Tool metadata
TOOL_NAME="opencode"
TOOL_DISPLAY_NAME="OpenCode"
TOOL_DESCRIPTION="OpenCode CLI for multi-model code generation"

# Default features for this tool
DEFAULT_FEATURES="rules,mcp,commands,subagents,skills"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# OpenCode Configuration
# - Supports: rules, mcp, commands, subagents, skills
# - Config location: opencode.json
# - Target name: opencode
EOF
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if opencode CLI is available
    if command -v opencode &> /dev/null; then
        echo "   ✅ opencode CLI found"
        return 0
    else
        echo "   ⚠️  opencode CLI not found (optional for config generation)"
        return 0
    fi
}

# Post-sync hook (runs after sync)
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."

    # Verify generated files exist
    if [ -f "opencode.json" ]; then
        echo "   ✅ Config generated: opencode.json"
    fi

    if [ -f "opencode.md" ] || [ -f "OPENCODE.md" ]; then
        echo "   ✅ Rules file generated"
    fi

    if [ -f "opencode.mcp.json" ]; then
        echo "   ✅ MCP config generated"
    fi

    if [ -d "opencode.skills" ] || [ -d ".opencode/skills" ]; then
        local skills_count=$(find opencode.skills .opencode/skills -name "*.md" 2>/dev/null | wc -l)
        echo "   ✅ Skills generated: $skills_count files"
    fi
}
