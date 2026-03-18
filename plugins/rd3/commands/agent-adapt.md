---
description: Adapt a Claude Code agent for other AI coding platforms
argument-hint: "<source-file> <source-platform> [target-platform] [--output <dir>] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Adapt

Wraps **rd3:cc-agents** skill.

Convert a Claude Code agent to other platform formats.

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
| `--output` | Output directory | same as source |
| `--dry-run` | Preview without writing files | false |
| `--verbose` | Show detailed output | false |

## Examples

```bash
# Adapt Claude agent to all other platforms
/rd3:agent-adapt ./agents/my-agent.md claude all

# Adapt Claude agent to Gemini only
/rd3:agent-adapt ./agents/my-agent.md claude gemini

# Preview generated output
/rd3:agent-adapt ./agents/my-agent.md claude all --dry-run
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/adapt.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
