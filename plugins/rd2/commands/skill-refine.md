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

1. **Validate** - Run programmatic validation to catch structural issues
2. **Evaluate** - Assess current quality via skill-doctor
3. **Review** - Identify low-scoring dimensions
4. **Fix** - Apply targeted improvements:
   - Frontmatter → Remove invalid fields (agent:, context:, user-invocable:, skills:, etc.)
   - Content → Add workflows, examples
   - Efficiency → Move details to references/
   - Description → Strengthen trigger phrases
5. **Re-validate** - Run validation script again to verify fixes
6. **Re-evaluate** - Continue until Grade A/B

May ask for approval before major changes.

## Implementation

```bash
# Step 1: Run programmatic validation to identify issues
python3 ${CLAUDE_PLUGIN_ROOT}/skills/cc-skills/scripts/skills.py evaluate {skill_folder}

# Step 2: Delegate to skill-expert for refinement
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
