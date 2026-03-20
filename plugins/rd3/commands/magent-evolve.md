---
description: Self-evolution analysis and proposals
argument-hint: <config-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>
triggers:
  - "evolve AGENTS.md"
  - "improve config over time"
  - "self-improve agent"
  - "analyze config patterns"
  - "propose config improvements"
examples:
  - "magent-evolve AGENTS.md --analyze"
  - "magent-evolve AGENTS.md --propose"
  - "magent-evolve AGENTS.md --apply p1abc --confirm"
  - "magent-evolve AGENTS.md --history"
---

# magent-evolve

Analyze patterns and generate self-improvement proposals for main agent configs.

## When to Use

- After collecting feedback on agent behavior
- Analyzing git history for modification patterns
- Self-improvement based on interaction logs
- Periodic config health checks
- Grade improvement over time

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `config-path` | Path to config file | (required) |
| `--analyze` | Analyze patterns from data sources | - |
| `--propose` | Generate improvement proposals | - |
| `--apply <id>` | Apply an approved proposal | requires --confirm |
| `--history` | Show version history | - |
| `--rollback <ver>` | Rollback to version | requires --confirm |

## Commands

### --analyze
Scans available data sources for patterns:
- Git history (commit frequency, section modifications)
- CI results (test failures, quality trends)
- User feedback (ratings, explicit signals)
- Memory files (MEMORY.md, context accumulation)
- Interaction logs (command usage, success/failure)

### --propose
Generates improvement proposals based on:
- Evaluation gaps (dimensions below 75%)
- Detected patterns (successes, failures, gaps)
- Data source analysis

### --apply <id>
Applies an approved proposal. Requires `--confirm` for safety.

### --history
Shows all recorded versions with grades and changes.

### --rollback <ver>
Reverts to a previous version. Requires `--confirm`.

## Safety Levels

| Level | Behavior |
|-------|----------|
| L1 (default) | Suggest-only - all changes require approval |
| L2 | Semi-auto - low-risk changes auto-apply |
| L3 | Auto - fully autonomous (monitoring only) |

## CRITICAL Rule Protection

Sections containing `[CRITICAL]` markers can NEVER be auto-modified. All proposals affecting CRITICAL sections require explicit `--confirm`.

## Implementation

Delegates to evolve.ts script:

```bash
bun plugins/rd3/skills/cc-magents/scripts/evolve.ts $ARGUMENTS
```

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

# Rollback to previous version (with safety confirmation)
/rd3:magent-evolve AGENTS.md --rollback v2 --confirm
```
