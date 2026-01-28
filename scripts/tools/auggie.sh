#!/bin/bash
# Auggie tool module for setup-all.sh

# Tool metadata
TOOL_NAME="augmentcode"
TOOL_DISPLAY_NAME="Auggie (Augment Code)"
TOOL_DESCRIPTION="Augment Code CLI for semantic code understanding"

# Default features for this tool
# NOTE: augmentcode only supports rules and ignore (no skills/commands/subagents/mcp)
DEFAULT_FEATURES="rules,ignore"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# Auggie Configuration
# - Supports: rules, ignore (skills/commands/subagents NOT supported by rulesync)
# - Output location: .augment/rules/ for non-root rules, .augmentignore for ignore patterns
# - Target name: augmentcode (this IS the Auggie target)
# - Limitation: Root rules (root: true) are NOT generated for augmentcode
EOF
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if augment directory exists
    if [ -d ".augment" ]; then
        echo "   ✅ Augment directory found (.augment/)"
        return 0
    else
        echo "   ⚠️  Augment directory not found (will be created)"
        return 0
    fi
}

# Post-sync hook (runs after sync)
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."

    # Verify generated files exist
    if [ -d ".augment/rules" ]; then
        local rule_count=$(find .augment/rules -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
        echo "   ✅ Rules generated: $rule_count files in .augment/rules/"
    else
        echo "   ℹ️  Note: .augment/rules/ not created (no non-root rules found)"
    fi

    if [ -f ".augmentignore" ]; then
        echo "   ✅ Ignore file generated: .augmentignore"
    fi

    # Note about limitations
    echo "   ℹ️  Note: augmentcode only supports rules & ignore (not skills/commands/subagents)"
}
