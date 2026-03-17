---
description: Refine and improve a slash command based on best practices
argument-hint: "<command-path> [--migrate] [--platform all|claude|codex|gemini|openclaw|opencode|antigravity] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Refine

Wraps **rd3:cc-commands** skill.

Evaluate command issues and apply fixes in one step. **Runs evaluation internally** then applies improvements.

## When to Use

- Fix issues found during evaluation
- Migrate commands from rd2 to rd3 format
- Convert second-person to imperative form
- Add missing argument-hint or Platform Notes

## Expected Results

- Evaluation results showing score and weaknesses
- Applied fixes (frontmatter, style, structure)
- Migrated rd2 commands to rd3 format
- Generated platform companion files

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the command .md file | (required) |
| `--migrate` | Enable rd2-to-rd3 migration mode | false |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--dry-run` | Preview changes without applying | false |
| `--from-eval` | Use evaluation results to guide refinement | (none) |

## Examples

```bash
# Basic refinement
/rd3:command-refine ./commands/review-code.md

# Dry run to preview changes
/rd3:command-refine ./commands/review-code.md --dry-run

# Migrate from rd2 format
/rd3:command-refine ./commands/old-command.md --migrate
```

## Output Example

```
Evaluation passed (85%)
--- Weaknesses ---
- Missing Platform Notes section
- Uses second-person voice
--- Applied Fixes ---
✓ Added Platform Notes section
✓ Fixed second-person voice
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/refine.ts <command-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:command-add` - Create new command
- `/rd3:command-evaluate` - Evaluate only (no changes)
