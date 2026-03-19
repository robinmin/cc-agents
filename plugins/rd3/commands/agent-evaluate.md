---
description: Check agent quality score and identify weaknesses
argument-hint: "<agent-path> [--scope basic|full] [--profile auto|thin-wrapper|specialist]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Evaluate

Wraps **rd3:cc-agents** skill.

Score agent quality across 10 dimensions. **Evaluate only — make NO changes.**

## When to Use

- Check current score without making changes
- Compare scores before and after refinement
- Verify agent readiness for publishing

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-path` | Path to the agent .md file | (required) |
| `--scope` | Evaluation scope: basic or full | full |
| `--profile` | Weight profile: auto, thin-wrapper, specialist | auto |
| `--output` | Output format: text or json | text |
| `--verbose` | Show detailed output | false |

## Examples

```bash
# Full evaluation with auto-detected profile (most common)
/rd3:agent-evaluate ./agents/my-agent.md

# Basic structural check only
/rd3:agent-evaluate ./agents/my-agent.md --scope basic
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents", args="evaluate $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/evaluate.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
