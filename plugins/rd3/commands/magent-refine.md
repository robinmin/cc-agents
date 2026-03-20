---
description: Refine and improve existing configs
argument-hint: <config-path> [--dry-run] [--apply] [--output <path>]
triggers:
  - "improve AGENTS.md"
  - "refine config"
  - "fix config issues"
  - "enhance CLAUDE.md"
  - "clean up agent config"
examples:
  - "magent-refine AGENTS.md --dry-run"
  - "magent-refine CLAUDE.md --apply"
  - "magent-refine AGENTS.md --output refined.md"
---

# magent-refine

Auto-fix structural issues and suggest quality improvements for main agent configs.

## When to Use

- After evaluation reveals quality issues
- Cleaning up templates with empty sections
- Applying best practices automatically
- Removing forbidden phrases (AI-speak)
- Adding missing required sections

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `config-path` | Path to config file | (required) |
| `--dry-run` | Preview changes without applying | true |
| `--apply` | Actually apply fixes | false |
| `--output` | Output path (for dry-run with custom output) | in-place |

## Validation (Automatic)

Validation runs automatically first. Structural issues are reported but refinement continues regardless.

## Refinement Actions

### Structural Fixes (auto-fix)
- Remove empty sections
- Fix duplicate headings

### Quality Improvements (requires approval)
- Add missing required sections (identity, rules, tools)
- Merge duplicate sections
- Expand minimal content sections

### Best Practice Fixes (auto-fix)
- Remove forbidden AI phrases ("great question", "I'm sorry")
- Add decision trees to tools sections

## CRITICAL Section Protection

Sections containing `[CRITICAL]` markers are NEVER modified, even with `--apply`. This ensures safety rules remain intact.

## Implementation

Delegates to refine.ts script:

```bash
bun plugins/rd3/skills/cc-magents/scripts/refine.ts $ARGUMENTS
```

## Examples

```bash
# Preview changes without applying
/rd3:magent-refine AGENTS.md --dry-run

# Apply fixes to the config
/rd3:magent-refine CLAUDE.md --apply

# Save refined version to new file
/rd3:magent-refine AGENTS.md --output refined-AGENTS.md
```
