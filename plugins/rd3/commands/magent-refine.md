---
description: "Refine and improve main agent config files"
argument-hint: "<config-path> [--dry-run] [--apply] [--output <path>]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Magent Refine

Wraps **rd3:cc-magents** skill.

Auto-fix structural issues and suggest quality improvements for main agent configs.

## When to Use

- After evaluation reveals quality issues
- Cleaning up templates with empty sections
- Applying best practices automatically
- Removing forbidden phrases (AI-speak)
- Adding missing required sections

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `config-path` | Path to config file (AGENTS.md, CLAUDE.md) | (required) |
| `--dry-run` | Preview changes without applying | true |
| `--apply` | Actually apply fixes | false |
| `--output` | Output path for refined config | in-place |

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="refine $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/refine.ts $ARGUMENTS
```

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
- Improve operability signals

## CRITICAL Section Protection

Sections containing `[CRITICAL]` markers are NEVER modified, even with `--apply`. This ensures safety rules remain intact.

## Examples

```bash
# Preview changes without applying
/rd3:magent-refine AGENTS.md --dry-run

# Apply fixes to the config
/rd3:magent-refine CLAUDE.md --apply

# Save refined version to new file
/rd3:magent-refine AGENTS.md --output refined-AGENTS.md
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
