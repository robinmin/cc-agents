---
description: Analyze agent evolution signals and draft proposals
argument-hint: "<agent-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Agent Evolve

Wraps **rd3:cc-agents** skill.

Analyze agent quality over time, persist refine-backed proposals, apply deterministic proposals, and rollback via saved version history. **See [Evolve Workflow](references/workflows.md#evolve-workflow) for full step details.**

## When to Use

- Generate proposals after evaluation drift or repeated review feedback
- Apply low-risk fixes through `refine.ts` with backup and rollback support
- Track applied changes over time

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-path` | Path to the agent .md file | (required) |
| `--analyze` | Analyze longitudinal improvement signals | - |
| `--propose` | Draft governed improvement proposals | - |
| `--apply <id>` | Apply a saved proposal through deterministic refine flow | - |
| `--history` | Show applied version history | - |
| `--rollback <ver>` | Restore a previous version from history | - |
| `--confirm` | Required by future destructive operations | false |

## Examples

```bash
# Analyze current evolution signals
/rd3:agent-evolve ./agents/my-agent.md --analyze

# Generate persisted proposals
/rd3:agent-evolve ./agents/my-agent.md --propose

# Apply a proposal with confirmation
/rd3:agent-evolve ./agents/my-agent.md --apply p1234 --confirm
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents", args="evolve $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/evolve.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
