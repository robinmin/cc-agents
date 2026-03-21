---
description: "Synthesize a new main agent configuration"
argument-hint: "<template> [--platform <platform>] [--output <path>]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Magent Add

Wraps **rd3:cc-magents** skill.

Generate a new main agent configuration file from templates with automatic project detection.

## When to Use

- Starting a new project and need a main agent config
- Creating an AGENTS.md, CLAUDE.md, or other platform config
- Scaffolding a main agent for a new codebase
- Converting between template-based and custom agent configs

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `template` | Domain template (dev-agent, research-agent, content-agent, data-agent, devops-agent, general-agent) | auto-detect |
| `--platform` | Target platform format | agents-md |
| `--output` | Output file path | AGENTS.md |

## Available Templates

| Template | Purpose |
|----------|---------|
| `dev-agent` | Software development with coding standards |
| `research-agent` | Research and analysis workflows |
| `content-agent` | Content creation and documentation |
| `data-agent` | Data science and ML workflows |
| `devops-agent` | DevOps and infrastructure |
| `general-agent` | General purpose assistant |

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="add $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/synthesize.ts $ARGUMENTS
```

## Examples

```bash
# Create AGENTS.md for a Node.js project (auto-detects template)
/rd3:magent-add

# Create CLAUDE.md with dev-agent template
/rd3:magent-add dev-agent --platform claude-md --output CLAUDE.md

# Create from specific template
/rd3:magent-add data-agent --platform agents-md
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
