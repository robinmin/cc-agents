#!/bin/bash
# Antigravity tool module for setup-all.sh

# Tool metadata
TOOL_NAME="antigravity"
TOOL_DISPLAY_NAME="Google Antigravity"
TOOL_DESCRIPTION="Google Antigravity CLI for Gemini Code Assist"

# Default features for this tool
DEFAULT_FEATURES="rules,commands,skills"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# Antigravity Configuration
# - Supports: rules, commands, skills
# - Global mode: \$HOME/.gemini/antigravity/
# - Project mode: .agent/workflows/ and .agent/rules/
# - Target name: antigravity
EOF
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if antigravity CLI is available
    if command -v agy &> /dev/null; then
        echo "   ✅ agy CLI found"
        return 0
    else
        echo "   ⚠️  agy CLI not found (optional for config generation)"
        return 0
    fi
}

# Post-sync hook (runs after sync)
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."

    # Verify generated files exist
    if [ -f ".agent/ANTIGRAVITY.md" ]; then
        echo "   ✅ Rules file generated: .agent/ANTIGRAVITY.md"
    fi

    if [ -d ".agent/workflows" ]; then
        local workflow_count=$(ls -1 .agent/workflows/*.md 2>/dev/null | wc -l)
        echo "   ✅ Workflows generated: $workflow_count files"
    fi

    if [ -d ".agent/rules" ]; then
        local rules_count=$(ls -1 .agent/rules/*.md 2>/dev/null | wc -l)
        echo "   ✅ Rules generated: $rules_count files"
    fi
}
