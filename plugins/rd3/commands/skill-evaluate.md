---
description: Check skill quality score and identify weaknesses
argument-hint: "<skill-path> [--scope basic|full] [--platform all|claude|codex|openclaw|opencode|antigravity]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Evaluate

Wraps **rd3:cc-skills** skill.

Score skill quality across 10 dimensions and surface advisory checks for ADK interaction metadata. **Evaluate only — make NO changes.**

## When to Use

- Check current score without making changes
- Compare scores before and after refinement
- Verify skill readiness for publishing
- Check whether `metadata.interactions` matches the skill's documented runtime behavior

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--scope` | Evaluation scope: basic or full | full |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--json` | Output results as JSON | false |

## Examples

```bash
# Basic structural validation (most common)
/rd3:skill-evaluate ./skills/my-skill

# Full evaluation with all dimensions
/rd3:skill-evaluate ./skills/my-skill --scope full

# JSON output for automation
/rd3:skill-evaluate ./skills/my-skill --json

# Check interaction metadata after adding ADK patterns
/rd3:skill-evaluate ./skills/my-skill --scope full
```

## Implementation

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills", args="evaluate $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts $ARGUMENTS
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
