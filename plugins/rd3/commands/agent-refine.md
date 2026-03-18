---
description: Evaluate and fix agent issues in one step
argument-hint: "<agent-path> [--eval] [--best-practices] [--migrate] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Refine

Wraps **rd3:cc-agents** skill.

Run evaluation internally then apply fixes in one step.

## When to Use

- Fix agent issues without running evaluate separately
- Apply best practice fixes automatically
- Migrate existing rd2 agents to rd3 format

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-path` | Path to the agent .md file | (required) |
| `--eval` | Run evaluation before refinement | false |
| `--best-practices` | Auto-fix TODOs, formatting, best practices | false |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--output` | Output directory | in-place |
| `--dry-run` | Preview changes without applying | false |
| `--verbose` | Show detailed output | false |

## Examples

```bash
# Evaluate then apply deterministic fixes
/rd3:agent-refine ./agents/my-agent.md --eval --best-practices

# Migrate rd2 agent to rd3 format
/rd3:agent-refine ./agents/my-agent.md --migrate

# Preview changes without applying
/rd3:agent-refine ./agents/my-agent.md --dry-run
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/refine.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
