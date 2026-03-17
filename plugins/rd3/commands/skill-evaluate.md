---
description: Check skill quality score and identify weaknesses (no changes)
argument-hint: "<skill-path> [--scope basic|full] [--platform all|claude|codex|openclaw|opencode|antigravity] [--json]"
---

# Skill Evaluate

Check skill quality score and identify weaknesses. **This command only evaluates - makes NO changes.**

## What It Shows

- Overall quality score (0-100%)
- Dimension-by-dimension breakdown
- Specific weaknesses found
- Recommendations for improvements

## When to Use

- Check current score without making changes
- Compare scores before/after refine
- Verify skill is ready for publishing

## Examples

```bash
# Basic validation (structural checks)
/rd3:skill-evaluate ./skills/my-skill --scope basic

# Full evaluation with all dimensions
/rd3:skill-evaluate ./skills/my-skill --scope full

# JSON output for automation
/rd3:skill-evaluate ./skills/my-skill --json
```

## Output Example

```
✓ Evaluation passed (85%)

--- Dimensions ---
| Dimension | Score | Status |
|-----------|-------|--------|
| Frontmatter | 10/10 | ✓ PASS |
| Content | 12/15 | ✗ FAIL |

--- Weaknesses ---
- Missing Overview section
- Uses second-person voice
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts <skill-path> [options]
```

## See Also

- `/rd3:skill-refine` - Evaluate + apply fixes in one step
- `/rd3:skill-add` - Create new skill
