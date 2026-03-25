---
description: Evaluate and fix command issues in one step
argument-hint: "<command-path> [--migrate] [--dry-run] [--platform all|claude|codex|gemini|openclaw|opencode|antigravity]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Command Refine

Wraps **rd3:cc-commands** skill.

Run evaluation internally then apply fixes in one step. **This command delegates to the rd3:cc-commands skill** — the invoking agent follows the [Refine Workflow](references/workflows.md#refine-workflow) which includes:

1. **Detect Issues** — Run evaluation to identify what needs fixing
2. **Apply Scripted Fixes** — Run `refine.ts` for deterministic fixes
3. **LLM Content Improvement** — Agent verifies fuzzy quality issues (description quality, voice consistency, circular references)
4. **Validate Result** — Confirm validation passes

## When to Use

- Fix command issues without running evaluate separately
- Apply best practice fixes automatically (description truncation, imperative conversion, platform notes)
- Use LLM agent to fix style and voice issues
- Migrate existing rd2 commands to rd3 format

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the command .md file | (required) |
| `--migrate` | Enable rd2-to-rd3 migration mode | false |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--dry-run` | Preview changes without applying | false |

## Examples

```bash
# Evaluate then apply fixes (most common)
/rd3:command-refine ./commands/review-code.md

# Migrate from rd2 format
/rd3:command-refine ./commands/old-definition.md --migrate

# Preview changes without applying
/rd3:command-refine ./commands/my-command.md --dry-run
```

## Implementation

**Claude Code delegates via Skill():**

```
Skill(skill="rd3:cc-commands", args="refine $ARGUMENTS")
```

The invoking agent:
1. Loads `plugins/rd3/skills/cc-commands/SKILL.md`
2. Reads `plugins/rd3/skills/cc-commands/references/workflows.md`
3. Follows the Refine Workflow — running scripted fixes, then performing LLM content improvement

**Direct script execution (other platforms):**
```bash
bun plugins/rd3/skills/cc-commands/scripts/refine.ts $ARGUMENTS
```

## What Gets Fixed (Scripted)

- Description truncated to 60 characters
- Second-person converted to imperative form
- Missing `argument-hint` added when `$1` or `$ARGUMENTS` detected
- Unfilled "See Also" sections with template placeholders removed
- Platform Notes section added if missing

## LLM Content Improvement (Agent Step)

The invoking agent performs these fuzzy checks:

| # | Item | Check |
|---|------|-------|
| 1 | Description quality | Imperative, under 60 chars, specific verb |
| 2 | Trigger phrases | 3+ quoted trigger phrases |
| 3 | Example blocks | 2+ `<example>` with `<commentary>` |
| 4 | Voice consistency | Imperative throughout, no second-person |
| 5 | Circular references | No `/rd3:command-*` self-references |
| 6 | argument-hint accuracy | Hint matches actual usage |
| 7 | Platform Notes | Section present with platform guidance |

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation (includes LLM content improvement)
- Other platforms: Run script directly via Bash tool (scripted fixes only)
