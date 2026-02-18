---
description: Evaluate skill quality across 12 dimensions with actionable recommendations
argument-hint: <skill-folder>
---

# Evaluate Skill Quality

Thin wrapper for `rd2:skill-doctor` agent. Read-only quality assessment.

## Quick Start

```bash
/rd2:skill-evaluate plugins/rd2/skills/data-pipeline
/rd2:skill-evaluate code-review
```

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## What It Does

Delegates to `rd2:skill-doctor` for comprehensive evaluation:

- 12 dimensions: Behavioral, Behavioral Readiness, Best Practices, Code Quality, Content, Efficiency, Frontmatter, Instruction Clarity, Security, Structure, Trigger Design, Value Add
- Phase 1: Structural validation (frontmatter, SKILL.md presence, directory structure)
- Phase 2: Quality scoring with weighted totals
- Scoring with grades A-F (90-100 = A, 70-89 = B, etc.)
- Priority-ranked recommendations (Critical → High → Medium)

**Read-only** - makes no changes. Use `/rd2:skill-refine` to apply fixes.

## Implementation

```bash
# Step 1: Run programmatic validation to catch structural issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate {skill_folder}

# Step 2: Delegate to skill-doctor for qualitative assessment
Task(
    subagent_type="rd2:skill-doctor",
    prompt="Evaluate skill quality for: {skill_folder}

Follow rd2:cc-skills evaluation framework.
Generate report with scores and recommendations.",
    description="Evaluate {skill_folder} quality"
)
```

## See Also

- `/rd2:skill-refine` - Apply improvements after evaluation
- `/rd2:skill-add` - Create new skills
