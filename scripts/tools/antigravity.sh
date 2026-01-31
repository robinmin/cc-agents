#!/bin/bash
# Antigravity tool module for setup-all.sh
#
# This module handles copying and renaming Claude Code plugin files
# for Antigravity CLI integration.
#
# File naming conventions for Antigravity:
# - Workflows (subagents/commands): [plugin]_[name].md
# - Skills: [plugin]_[name]/

# Tool metadata
TOOL_NAME="antigravity"
TOOL_DISPLAY_NAME="Google Antigravity"
TOOL_DESCRIPTION="Google Antigravity CLI for Gemini Code Assist"

# Default features for this tool
DEFAULT_FEATURES="rules,commands,skills"

# Antigravity directories
ANTIGRAVITY_HOME="${HOME}/.gemini/antigravity"
ANTIGRAVITY_GLOBAL_WORKFLOWS="${ANTIGRAVITY_HOME}/global_workflows"
ANTIGRAVITY_SKILLS="${ANTIGRAVITY_HOME}/skills"
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE_WORKFLOWS="${WORKSPACE_ROOT}/.agent/workflows"

# Plugins to sync
PLUGINS="rd2 wt"

# Tool-specific configuration
get_tool_config() {
    cat <<EOF
# Antigravity Configuration
# - Supports: rules, commands, skills
# - Global Workflows: ~/.gemini/antigravity/global_workflows/
# - Global Skills: ~/.gemini/antigravity/skills/
# - Workspace Workflows: .agent/workflows/
# - Target name: antigravity
EOF
}

# Create directory if it doesn't exist
ensure_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        echo "   📁 Created: $dir"
    fi
}

# Copy and rename subagents to global workflows
copy_subagents() {
    local plugin="$1"
    local source_dir="${WORKSPACE_ROOT}/plugins/${plugin}/agents"
    local count=0

    if [ ! -d "$source_dir" ]; then
        return 0
    fi

    echo "   📋 Copying ${plugin} subagents..."

    for file in "${source_dir}"/*.md; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file" .md)
            local new_name="${plugin}_${basename}.md"
            cp "$file" "${ANTIGRAVITY_GLOBAL_WORKFLOWS}/${new_name}"
            count=$((count + 1))
        fi
    done

    echo "   ✅ Copied $count subagents"
}

# Copy and rename commands to global workflows
copy_commands() {
    local plugin="$1"
    local source_dir="${WORKSPACE_ROOT}/plugins/${plugin}/commands"
    local count=0

    if [ ! -d "$source_dir" ]; then
        return 0
    fi

    echo "   📋 Copying ${plugin} commands..."

    for file in "${source_dir}"/*.md; do
        if [ -f "$file" ]; then
            local basename=$(basename "$file" .md)
            local new_name="${plugin}_${basename}.md"
            cp "$file" "${ANTIGRAVITY_GLOBAL_WORKFLOWS}/${new_name}"
            count=$((count + 1))
        fi
    done

    echo "   ✅ Copied $count commands"
}

# Copy and rename skills to global skills and workspace workflows
copy_skills() {
    local plugin="$1"
    local source_dir="${WORKSPACE_ROOT}/plugins/${plugin}/skills"
    local global_count=0
    local workspace_count=0

    if [ ! -d "$source_dir" ]; then
        return 0
    fi

    echo "   📋 Copying ${plugin} skills..."

    # Copy to global skills directory
    for skill_dir in "${source_dir}"/*; do
        if [ -d "$skill_dir" ]; then
            local basename=$(basename "$skill_dir")
            local new_name="${plugin}_${basename}"

            # Copy to global skills
            cp -r "$skill_dir" "${ANTIGRAVITY_SKILLS}/${new_name}"
            global_count=$((global_count + 1))

            # Copy to workspace workflows
            cp -r "$skill_dir" "${WORKSPACE_WORKFLOWS}/${new_name}"
            workspace_count=$((workspace_count + 1))
        fi
    done

    echo "   ✅ Copied $global_count skills to global, $workspace_count to workspace"
}

# Pre-sync hook (runs before sync)
pre_sync() {
    echo "🔧 Pre-sync checks for $TOOL_DISPLAY_NAME..."

    # Check if antigravity CLI is available
    if command -v agy &> /dev/null; then
        echo "   ✅ agy CLI found"
    else
        echo "   ⚠️  agy CLI not found (optional for config generation)"
    fi

    # Ensure Antigravity directories exist
    ensure_dir "$ANTIGRAVITY_GLOBAL_WORKFLOWS"
    ensure_dir "$ANTIGRAVITY_SKILLS"
    ensure_dir "$WORKSPACE_WORKFLOWS"
}

# Post-sync hook (runs after sync) - This is where the actual work happens
post_sync() {
    echo "🔧 Post-sync actions for $TOOL_DISPLAY_NAME..."
    echo
    echo "📦 Copying plugin files to Antigravity directories..."
    echo

    # Process each plugin
    for plugin in $PLUGINS; do
        echo "🔌 Processing plugin: $plugin"
        copy_subagents "$plugin"
        copy_commands "$plugin"
        copy_skills "$plugin"
        echo
    done

    # Summary
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📊 Summary:"
    echo "   Global Workflows: $(ls -1 ${ANTIGRAVITY_GLOBAL_WORKFLOWS}/*.md 2>/dev/null | wc -l | tr -d ' ') files"
    echo "   Global Skills: $(ls -1 ${ANTIGRAVITY_SKILLS} 2>/dev/null | wc -l | tr -d ' ') directories"
    echo "   Workspace Workflows: $(ls -1 ${WORKSPACE_WORKFLOWS} 2>/dev/null | wc -l | tr -d ' ') directories"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
    echo "✅ Antigravity sync complete!"
    echo
    echo "📁 Locations:"
    echo "   Global Workflows: ${ANTIGRAVITY_GLOBAL_WORKFLOWS}"
    echo "   Global Skills: ${ANTIGRAVITY_SKILLS}"
    echo "   Workspace Workflows: ${WORKSPACE_WORKFLOWS}"
}
