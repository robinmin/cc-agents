---
description: "Self-evolution analysis and proposals for main agent configs"
argument-hint: "<config-path> [--analyze|--propose|--apply <id>|--history|--rollback <ver>]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Evolve

Wraps **rd3:cc-magents** skill.

Analyze patterns and generate self-improvement proposals for main agent configs.

## When to Use

- After collecting feedback on agent behavior
- Analyzing git history for modification patterns
- Self-improvement based on interaction logs
- Periodic config health checks
- Grade improvement over time

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `config-path` | Path to config file (AGENTS.md, CLAUDE.md) | (required) |
| `--analyze` | Analyze patterns from data sources | - |
| `--propose` | Generate improvement proposals | - |
| `--apply <id>` | Apply an approved proposal | requires --confirm |
| `--history` | Show version history | - |
| `--rollback <ver>` | Rollback to version | requires --confirm |

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="evolve $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/evolve.ts $ARGUMENTS
```

## Operations

### --analyze
Scans available data sources for patterns:
- Git history (commit frequency, section modifications)
- CI results (test failures, quality trends)
- User feedback (ratings, explicit signals)
- Memory files (MEMORY.md, context accumulation)

### --propose
Generates improvement proposals based on:
- Evaluation gaps (dimensions below 75%)
- Detected patterns (successes, failures, gaps)

### --apply <id>
Applies an approved proposal. Requires `--confirm` for safety.

### --history
Shows all recorded versions with grades and changes.

### --rollback <ver>
Reverts to a previous version. Requires `--confirm`.

## CRITICAL Rule Protection

Sections containing `[CRITICAL]` markers can NEVER be auto-modified.

## Examples

```bash
# Analyze patterns without generating proposals
/rd3:magent-evolve AGENTS.md --analyze

# Generate improvement proposals
/rd3:magent-evolve AGENTS.md --propose

# Apply a specific proposal (with safety confirmation)
/rd3:magent-evolve AGENTS.md --apply p1abc1234 --confirm

# View version history
/rd3:magent-evolve AGENTS.md --history
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
