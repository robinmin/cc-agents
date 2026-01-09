---
name: add antigraty install tool
description: <prompt description>
status: Done
created_at: 2026-01-09 09:53:06
updated_at: 2026-01-09 10:24:12
---

## 0003. feat(antigravity): add antigraty install tool

### Background
According to the official document of antigravity workflow which I added in the section References, it looks like we can convert current claude code plugin into the equvilent things, workflow, in google antigravity.

### Requirements / Objectives
I need to develop a tool to automaticly install/update all plugins defined in current codebase to google antigravuty.

Here comes my draft version:

```bash
#!/bin/bash
# Tool: Claude Code to Antigravity Workflow Converter
# Target: Projects using .claude/commands and .claude/skills

PROJECT_ROOT=$(pwd)
ANTIGRAVITY_DIR="$PROJECT_ROOT/.antigravity"
WORKFLOW_DIR="$ANTIGRAVITY_DIR/workflows"

echo "🚀 Starting migration to Antigravity Workflow..."

# 1. Initialize Antigravity structure
mkdir -p "$WORKFLOW_DIR"
mkdir -p "$ANTIGRAVITY_DIR/agents"

# 2. Convert Slash Commands to Antigravity Tools
if [ -d ".claude/commands" ]; then
    echo "📦 Migrating Slash Commands..."
    for cmd in .claude/commands/*.md; do
        cmd_name=$(basename "$cmd" .md)
        # Wrap slash command in Antigravity tool metadata
        cat <<EOF > "$WORKFLOW_DIR/${cmd_name}_tool.md"
---
name: ${cmd_name}
type: tool
description: "Migrated from Claude Code /$cmd_name command"
autonomous: true
---
$(cat "$cmd")
EOF
    done
fi

# 3. Convert Agent Skills (progressive disclosure format)
if [ -d ".claude/skills" ]; then
    echo "🧠 Migrating Agent Skills..."
    cp -r .claude/skills/* "$WORKFLOW_DIR/"
    # Antigravity requires a 'manifest.json' or specific front-matter in SKILL.md
    find "$WORKFLOW_DIR" -name "SKILL.md" -exec sed -i 's/description:/antigravity_discovery:/g' {} +
fi

# 4. Generate the Master Agent instructions
cat <<EOF > "$ANTIGRAVITY_DIR/agents/manager.md"
# Antigravity Manager Agent
Role: Orchestrate tasks using migrated Claude skills.
Discovery: Scan local ./workflows directory for capability matches.
Policy: Execute terminal commands automatically if "autonomous: true" is set.
EOF

echo "✅ Migration complete. Open Antigravity and run: 'instantiate based on .antigravity/agents/manager.md'"

```

You need to find out official website to find out the most latest spec about antigravity workflow, enhance and optimize it.

This script tools will be used each time I finish to upgrade any place of these plugins.

Meanwhile, with this tool's support, we can officialy declare that our plugins officialy support both claude code and google antigravity. That means, you need to totaly rewrite the @README.md. It's also a oppotunity to you to fix some existing issue or out-of-date stuffs(for example, I found that it looks like claude code no longer supports '/plugin install rd@cc-agents/' now).

### Solutions / Goals

### References
- [Rules](https://antigravity.google/docs/rules-workflows)
