---
description: Adapt a Claude Code agent for other AI coding platforms
argument-hint: "<source-file> <source-platform> [target-platform]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Agent Adapt

Wraps **rd3:cc-agents** skill.

Convert a Claude Code agent to other platform formats. **See [Adapt Workflow](references/workflows.md#adapt-workflow) for full step details.**

## When to Use

- Port Claude Code agents to other platforms
- Generate platform-specific agent configurations
- Test cross-platform compatibility

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `source-file` | Path to agent source .md file | (required) |
| `source-platform` | Source platform: claude, codex, gemini, openclaw, opencode | (required) |
| `target-platform` | Target platform(s), comma-separated or "all" | all |

> For advanced options (`--output`, `--dry-run`, `--verbose`), run the script directly: `bun plugins/rd3/skills/cc-agents/scripts/adapt.ts --help`

## Examples

```bash
# Adapt Claude agent to all other platforms
/rd3:agent-adapt ./agents/my-agent.md claude all

# Adapt Claude agent to Gemini only
/rd3:agent-adapt ./agents/my-agent.md claude gemini
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents", args="adapt $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/adapt.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
