---
description: Evaluate and fix slash definition issues in one step
argument-hint: "<command-path> [description] [--migrate] [--dry-run] [--from-eval <path>]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Refine

Wraps **rd3:cc-commands** skill.

Run evaluation internally then apply fixes in one step.

## When to Use

- Fix issues without running evaluate separately
- Migrate rd2 definitions to rd3 format
- Convert second-person to imperative form

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the .md file | (required) |
| `description` | Optional free-text goal to guide refinement | (none) |
| `--migrate` | Enable rd2-to-rd3 migration mode | false |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--dry-run` | Preview changes without applying | false |
| `--from-eval` | Use evaluation results to guide refinement | (none) |

## Examples

```bash
# Evaluate then apply fixes (most common)
/rd3:command-refine ./commands/review-code.md

# Refine with a goal description
/rd3:command-refine ./commands/review-code.md "Code review with severity-driven fix workflow"

# Migrate from rd2 format
/rd3:command-refine ./commands/old-definition.md --migrate
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-commands** skill:

```
Skill(skill="rd3:cc-commands", args="refine $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/refine.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
