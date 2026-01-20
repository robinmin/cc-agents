---
description: Comprehensive security and quality assessment for Claude Code Agent Skills
skills: [cc-skills2]
argument-hint: <skill-folder>
---

# Evaluate Skill Quality

Thin wrapper for cc-skills. Read-only evaluation against best practices.

## Quick Start

```bash
# Via slash command (recommended)
/rd2:skill-evaluate data-pipeline
/rd2:skill-evaluate plugins/rd2/skills/code-review

# Direct script execution (integrated in skills.py)
python3 plugins/rd2/skills/cc-skills2/scripts/skills.py evaluate ./skills/my-skill
python3 plugins/rd2/skills/cc-skills2/scripts/skills.py evaluate ./skills/my-skill --json
```

## Arguments

| Argument         | Description                               |
|------------------|-------------------------------------------|
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## Workflow

1. **Validate** - Run `scripts/skills.py validate` for structural checks
2. **Analyze** - Check frontmatter, content, structure, security
3. **Score** - Rate each dimension (see below)
4. **Report** - Generate findings with recommendations

### Implementation

The evaluation is implemented as the `evaluate` command in `scripts/skills.py`:

```bash
# Run evaluation with detailed report
python3 scripts/skills.py evaluate <skill-path>

# Run with JSON output for programmatic use
python3 scripts/skills.py evaluate <skill-path> --json
```

## Scoring Dimensions

| Category       | Weight | Key Criteria                    |
|----------------|--------|---------------------------------|
| Frontmatter    | 10%    | Name, description, activation   |
| Content        | 25%    | Clarity, examples, workflows    |
| Security       | 20%    | Injection, paths, credentials   |
| Structure      | 15%    | Progressive disclosure          |
| Efficiency     | 10%    | Token count, uniqueness         |
| Best Practices | 10%    | Naming, anti-patterns           |
| Code Quality   | 10%    | Error handling (if scripts)     |

## Grading Scale

| Grade | Score    | Status              |
|-------|----------|---------------------|
| A     | 9.0-10.0 | Production ready    |
| B     | 7.0-8.9  | Minor fixes needed  |
| C     | 5.0-6.9  | Moderate revision   |
| D     | 3.0-4.9  | Major revision      |
| F     | 0.0-2.9  | Rewrite needed      |

## Read-Only

This command makes NO changes:
- Only reads files
- Only analyzes content
- Only generates report

Use `/rd2:skill-refine` to apply improvements.

## See Also

- `/rd2:skill-add` - Create new skills
- `/rd2:skill-refine` - Apply improvements
- `cc-skills2` - Best practices reference
