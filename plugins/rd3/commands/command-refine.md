---
description: Refine and improve a slash command based on best practices
argument-hint: "<command-path> [--migrate] [--dry-run] [--from-eval <results.json>]"
---

# Command Refine

Improve slash commands by fixing frontmatter, converting writing style, and adding missing sections.

## When to Use

- Fixing issues found during evaluation
- Migrating commands from rd2 to rd3 format
- Converting second-person to imperative form
- Adding missing argument-hint or Platform Notes

## Usage

```bash
/rd3:command-refine <command-path> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--migrate` | Enable rd2-to-rd3 migration mode | false |
| `--dry-run` | Show changes without writing | false |
| `--from-eval <path>` | Use evaluation results to guide refinement | - |
| `--verbose, -v` | Show detailed output | false |

## Refinement Actions

- Remove invalid frontmatter fields (rd2-specific)
- Fix description length (truncate with warning)
- Convert second-person to imperative form
- Add missing argument-hint from body analysis
- Add Platform Notes section
- Add disable-model-invocation field

## Examples

```bash
# Basic refinement
/rd3:command-refine ./commands/review-code.md

# Dry run to preview changes
/rd3:command-refine ./commands/review-code.md --dry-run

# Migrate from rd2 format
/rd3:command-refine ./commands/old-command.md --migrate

# Refine based on evaluation results
/rd3:command-refine ./commands/review-code.md --from-eval eval-results.json
```

## Workflow

1. **Read** command file
2. **Analyze** frontmatter and body
3. **Apply** refinement rules
4. **Write** updated file (unless --dry-run)
5. **Report** changes made

## Related Commands

- `/rd3:command-add` - Create new command
- `/rd3:command-evaluate` - Evaluate command quality

## Implementation

### For Claude Code
```bash
bun ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-commands/scripts/refine.ts <command-path> [options]
```

### For Other Coding Agents
```bash
bun ./plugins/rd3/skills/cc-commands/scripts/refine.ts <command-path> [options]
```
