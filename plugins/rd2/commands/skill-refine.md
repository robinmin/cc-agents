---
description: Refine existing skills with evaluation-first development and progressive disclosure
skills: [rd2:cc-skills, rd2:anti-hallucination]
argument-hint: <skill-folder>
---

# Refine Existing Skill

Thin wrapper for `rd2:skill-expert` agent. Improves skill quality to Grade A/B.

## Quick Start

```bash
/rd2:skill-refine plugins/rd2/skills/data-pipeline
/rd2:skill-refine code-review
```

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## What It Does

Delegates to `rd2:skill-expert` for refinement workflow:

1. **Evaluate** - Assess current quality via skill-doctor
2. **Review** - Identify low-scoring dimensions
3. **Fix** - Apply targeted improvements:
   - Content → Add workflows, examples
   - Efficiency → Move details to references/
   - Description → Strengthen trigger phrases
4. **Re-evaluate** - Continue until Grade A/B

May ask for approval before major changes.

## Implementation

```
Task(
    subagent_type="rd2:skill-expert",
    prompt="Refine skill at: {skill_folder}

Follow rd2:cc-skills refinement workflow.
Apply fixes until Grade A/B achieved.",
    description="Refine {skill_folder} skill"
)
```

## Post-Refinement

1. Restart Claude Code to load updated skill
2. Test activation keywords
3. Run `/rd2:skill-evaluate` to confirm improvement

## See Also

- `/rd2:skill-evaluate` - Assess quality first
- `/rd2:skill-add` - Create new skills
