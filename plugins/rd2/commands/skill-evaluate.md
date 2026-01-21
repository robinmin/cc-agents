---
description: Comprehensive security and quality assessment for Claude Code Agent Skills
skills: [rd2:cc-skills, rd2:anti-hallucination]
argument-hint: <skill-folder>
---

# Evaluate Skill Quality

Thin wrapper for `rd2:cc-skills` skill. Read-only evaluation against best practices.

## Quick Start

```bash
# Via slash command (recommended)
/rd2:skill-evaluate data-pipeline
/rd2:skill-evaluate plugins/rd2/skills/code-review
```

See `rd2:cc-skills` skill for direct script usage details.

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## Workflow

1. **Validate** - Structural checks (see `rd2:cc-skills` for script details)
2. **Analyze** - Check frontmatter, content, structure, security
3. **Score** - Rate each dimension (see below)
4. **Report** - Generate findings with recommendations

## Scoring Dimensions

| Category       | Weight | Key Criteria                  |
| -------------- | ------ | ----------------------------- |
| Frontmatter    | 10%    | Name, description, activation |
| Content        | 25%    | Clarity, examples, workflows  |
| Security       | 20%    | Injection, paths, credentials |
| Structure      | 15%    | Progressive disclosure        |
| Efficiency     | 10%    | Token count, uniqueness       |
| Best Practices | 10%    | Naming, anti-patterns         |
| Code Quality   | 10%    | Error handling (if scripts)   |

## Grading Scale

| Grade | Score      | Status             |
| ----- | ---------- | ------------------ |
| A     | 90.0-100.0 | Production ready   |
| B     | 70.0-89.9  | Minor fixes needed |
| C     | 50.0-69.9  | Moderate revision  |
| D     | 30.0-49.9  | Major revision     |
| F     | 0.0-29.9   | Rewrite needed     |

## Read-Only

This command makes NO changes:

- Only reads files
- Only analyzes content
- Only generates report

Use `/rd2:skill-refine` to apply improvements.

## See Also

- `/rd2:skill-add` - Create new skills
- `/rd2:skill-refine` - Apply improvements
- `rd2:cc-skills` - Best practices reference
