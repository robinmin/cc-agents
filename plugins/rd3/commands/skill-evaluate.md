---
description: Check skill quality score and identify weaknesses (no changes)
argument-hint: "<skill-path> [--scope basic|full] [--platform all|claude|codex|openclaw|opencode|antigravity] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Skill Evaluate

Wraps **rd3:cc-skills** skill.

Check skill quality score and identify weaknesses. **This command only evaluates - makes NO changes.**

## When to Use

- Check current score without making changes
- Compare scores before/after refine
- Verify skill is ready for publishing

## Expected Results

- Quality score (0-100%)
- Dimension-by-dimension breakdown with pass/fail status
- List of weaknesses found
- Recommendations for improvements

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `skill-path` | Path to the skill directory | (required) |
| `--scope` | Evaluation scope: basic or full | basic |
| `--platform` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--json` | Output results as JSON | false |

## Examples

```bash
# Basic validation (structural checks)
/rd3:skill-evaluate ./skills/my-skill --scope basic

# Full evaluation with all dimensions
/rd3:skill-evaluate ./skills/my-skill --scope full

# JSON output for automation
/rd3:skill-evaluate ./skills/my-skill --json
```

## Implementation

Delegates to **rd3:cc-skills** skill:

```
Skill(skill="rd3:cc-skills")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts <skill-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool
