---
description: Evaluate and fix agent issues in one step
argument-hint: "<agent-path> [--eval] [--migrate] [--best-practices] [--output <dir>] [--dry-run] [--verbose]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Refine

Wraps **rd3:cc-agents** skill.

Evaluate agent issues and apply fixes in one step. **Runs evaluation internally** then applies improvements.

## When to Use

- Fix agent issues in one step (no need to run evaluate separately)
- Apply best practice fixes automatically
- Migrate existing rd2 agents to rd3
- Verify agent is ready for publishing

## Expected Results

- Evaluation results showing score and weaknesses
- Applied fixes (deterministic and/or LLM-based)
- Migrated rd2 agents to rd3 format

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
# Evaluate + apply deterministic fixes
/rd3:agent-refine ./agents/my-agent.md --best-practices

# Evaluate first, then refine
/rd3:agent-refine ./agents/my-agent.md --eval

# Migrate rd2 agent to rd3 (includes evaluation)
/rd3:agent-refine ./agents/my-agent.md --migrate

# Preview without applying
/rd3:agent-refine ./agents/my-agent.md --dry-run
```

## Output Example

```
--- Evaluation Summary ---
Grade: B (82%)

--- Weaknesses ---
- Missing Examples section
- No DO/DON'T rules
- Uses second-person voice

--- Applied Fixes ---
✓ Added Examples section
✓ Fixed second-person voice
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/refine.ts <agent-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:agent-evaluate` - Evaluate only (no changes) - useful for checking current score
- `/rd3:agent-add` - Create new agent
- `/rd3:agent-adapt` - Cross-platform conversion
