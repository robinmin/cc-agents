---
description: Evaluate skill quality across 7 dimensions with actionable recommendations
skills: [rd2:cc-skills, rd2:anti-hallucination]
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
- 7 dimensions: Frontmatter, Content, Security, Structure, Efficiency, Best Practices, Code Quality
- Scoring with grades A-F (90-100 = A, 70-89 = B, etc.)
- Priority-ranked recommendations (Critical → High → Medium)

**Read-only** - makes no changes. Use `/rd2:skill-refine` to apply fixes.

## Implementation

```
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
