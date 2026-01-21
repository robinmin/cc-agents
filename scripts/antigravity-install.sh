#!/bin/bash
# Tool: Claude Code to Antigravity Workflow/Rules Converter
# Target: Projects using Google Antigravity/Gemini Code Assist

# Default paths (Local)
PROJECT_ROOT=$(pwd)
AGENT_DIR="$PROJECT_ROOT/.agent"
GLOBAL_MODE=false

# Check for flags
if [[ "$1" == "--global" ]]; then
    GLOBAL_MODE=true
    AGENT_DIR="$HOME/.gemini/antigravity"
    WORKFLOW_DIR="$AGENT_DIR/global_workflows"
    RULES_DIR="$AGENT_DIR/global_rules"
    echo "🌍 Installing in GLOBAL mode..."
else
    WORKFLOW_DIR="$AGENT_DIR/workflows"
    RULES_DIR="$AGENT_DIR/rules"
    echo "🚀 Installing in LOCAL mode (.agent/)..."
fi

# 1. Initialize Antigravity structure
mkdir -p "$WORKFLOW_DIR"
mkdir -p "$RULES_DIR"

# 2. Convert Slash Commands to Antigravity Workflows
echo "📦 Migrating Slash Commands to Workflows..."
for plugin_dir in plugins/*; do
    if [ -d "$plugin_dir/commands" ]; then
        plugin_name=$(basename "$plugin_dir")
        for cmd in "$plugin_dir"/commands/*.md; do
            cmd_name=$(basename "$cmd" .md)
            # Remove numeric prefix from command name for cleaner workflow name if exists
            clean_name=$(echo "$cmd_name" | sed 's/^[0-9]*-//')
            target_file="$WORKFLOW_DIR/${plugin_name}_${clean_name}.md"

            echo "  - Converting $cmd_name ($plugin_name) -> ${plugin_name}_${clean_name}"

            # Extract description from frontmatter if possible, otherwise use a default
            description=$(grep "description:" "$cmd" | head -n 1 | sed 's/description: //')
            if [ -z "$description" ]; then
                description="Migrated from Claude Code $plugin_name:$cmd_name command"
            fi

            cat <<EOF > "$target_file"
---
name: ${plugin_name}_${clean_name}
description: "$description"
---
$(sed '1,/---/d;1,/---/d' "$cmd")
EOF
        done
    fi
done

# 3. Convert Agent Skills to Antigravity Rules
echo "🧠 Migrating Agent Skills to Rules..."
for plugin_dir in plugins/*; do
    if [ -d "$plugin_dir/skills" ]; then
        plugin_name=$(basename "$plugin_dir")
        for skill_dir in "$plugin_dir"/skills/*; do
            if [ -f "$skill_dir/SKILL.md" ]; then
                skill_name=$(basename "$skill_dir")
                target_file="$RULES_DIR/${plugin_name}_${skill_name}.md"

                echo "  - Converting $skill_name ($plugin_name) -> ${plugin_name}_${skill_name}"

                # Read SKILL.md and replace description: with antigravity_discovery:
                cat <<EOF > "$target_file"
$(sed 's/description:/antigravity_discovery:/' "$skill_dir/SKILL.md")
EOF

                # Copy related files (docs, templates, etc.) to a subdirectory in rules to maintain context
                mkdir -p "$RULES_DIR/${plugin_name}_${skill_name}_context"
                cp -r "$skill_dir/"* "$RULES_DIR/${plugin_name}_${skill_name}_context/"
                rm "$RULES_DIR/${plugin_name}_${skill_name}_context/SKILL.md"
            fi
        done
    fi
done

# 4. Generate the Master Agent/Manager Rule
echo "🛠 Generating Antigravity Manager Rule..."
cat <<EOF > "$RULES_DIR/manager.md"
---
name: manager
description: Orchestrate tasks using migrated Claude skills and workflows.
alwaysOn: true
---
# Antigravity Manager Agent
Role: Orchestrate tasks using migrated Claude skills.
Discovery: Scan local $(if $GLOBAL_MODE; then echo "global"; else echo ".agent"; fi) directories for capability matches.
Policy: Execute terminal commands automatically if steps require it.
EOF

echo "✅ Migration complete."
echo "   - Workflows: $WORKFLOW_DIR"
echo "   - Rules: $RULES_DIR"
echo ""
echo "Open Antigravity and you can now use the migrated workflows via slash commands (e.g., /rd_dev-apply)."
