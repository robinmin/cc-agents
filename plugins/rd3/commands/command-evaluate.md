---
description: Score slash definition quality across 10 dimensions
argument-hint: "<command-path> [--scope basic|full] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
disable-model-invocation: true
---

# Command Evaluate

Wraps **rd3:cc-commands** skill.

Score quality across 10 dimensions. **Evaluate only — make NO changes.**

## When to Use

- Check current score without making changes
- Compare scores before and after refinement
- Verify readiness for publishing

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the .md file | (required) |
| `--scope` | Evaluation scope: basic or full | basic |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--json` | Output results as JSON | false |

## Examples

```bash
# Basic structural validation (most common)
/rd3:command-evaluate ./commands/review-code.md

# Full evaluation with JSON output
/rd3:command-evaluate ./commands/review-code.md --scope full --json
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands", args="evaluate $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/evaluate.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
