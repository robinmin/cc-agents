#!/bin/bash
# Gemini CLI tool module for setup-all.sh

# Tool metadata
TOOL_NAME="geminicli"
TOOL_DISPLAY_NAME="Gemini CLI"
TOOL_DESCRIPTION="Google Gemini CLI for code generation"

# Default features for this tool
DEFAULT_FEATURES="rules,ignore,mcp,commands,skills"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# Gemini CLI Configuration
# - Supports: rules, ignore, mcp, commands, skills
# - Config location: .gemini/settings.json
# - Target name: geminicli
EOF
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if gemini CLI is available
    if command -v gemini &> /dev/null; then
        echo "   ✅ gemini CLI found"
        return 0
    else
        echo "   ⚠️  gemini CLI not found (optional for config generation)"
        return 0
    fi
}

# Post-sync hook (runs after sync)
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."

    # Verify generated files exist
    if [ -f ".gemini/settings.json" ]; then
        echo "   ✅ Settings generated: .gemini/settings.json"
    fi

    if [ -f ".gemini/rules.md" ] || [ -f "GEMINI.md" ]; then
        echo "   ✅ Rules file generated"
    fi

    if [ -f ".gemini/mcp.json" ]; then
        echo "   ✅ MCP config generated"
    fi

    if [ -d ".gemini/skills" ]; then
        local skills_count=$(ls -1 .gemini/skills/**/*.md 2>/dev/null | wc -l)
        echo "   ✅ Skills generated: $skills_count files"
    fi
}
