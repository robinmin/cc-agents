---
description: Analyze slash definition evolution and draft proposals
argument-hint: "<command-path> --analyze|--propose|--apply <id>|--history|--rollback <ver>"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Evolve

Wraps **rd3:cc-commands** skill.

Analyze command quality over time, persist refine-backed proposals, and apply or roll back changes through saved companion snapshots.

## When to Use

- Generate proposals after evaluation drift or repeated review feedback
- Apply low-risk fixes through `refine.ts` with snapshot-backed rollback
- Inspect current evolution history

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the .md file | (required) |
| `--analyze` | Analyze longitudinal improvement signals | - |
| `--propose` | Draft governed improvement proposals | - |
| `--apply <id>` | Apply a saved proposal through deterministic refine flow | - |
| `--history` | Show applied version history | - |
| `--rollback <ver>` | Restore a previous version from history | - |
| `--confirm` | Required for apply and rollback | false |

## Examples

```bash
# Analyze current evolution signals
/rd3:command-evolve ./commands/review-code.md --analyze

# Generate persisted proposals
/rd3:command-evolve ./commands/review-code.md --propose

# Apply a proposal with confirmation
/rd3:command-evolve ./commands/review-code.md --apply p1234 --confirm
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands", args="evolve $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/evolve.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
