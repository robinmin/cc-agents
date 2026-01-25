---
description: Skill quality evaluator. Use PROACTIVELY for skill validation, quality assessment, scoring skill structure, or identifying improvements needed before production deployment.
skills: [rd2:cc-skills, rd2:anti-hallucination]
argument-hint: <skill-folder>
---

# Evaluate Skill Quality

Thin wrapper command for `rd2:skill-doctor` agent. Comprehensive quality assessment across 7 dimensions with actionable improvement recommendations.

## Quick Start

```bash
# Via slash command (recommended)
/rd2:skill-evaluate data-pipeline
/rd2:skill-evaluate plugins/rd2/skills/code-review
```

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<skill-folder>` | Path to skill (relative, absolute, or name) |

## Workflow

This command follows the comprehensive review process:

1. **Locate and Read** - Find SKILL.md and supporting files
2. **Validate Structure** - Check frontmatter, required fields
3. **Evaluate Description** (Most Critical) - Trigger phrases, third person, specificity
4. **Assess Content Quality** - Word count, writing style, organization
5. **Check Progressive Disclosure** - Proper separation of SKILL.md, references/, examples/
6. **Review Supporting Files** - Quality of references/, examples/, scripts/
7. **Identify Issues** - Categorize by severity (critical/major/minor)
8. **Generate Report** - Specific fixes with before/after examples

## Scoring Dimensions

| Category       | Weight | Key Criteria                           |
| -------------- | ------ | -------------------------------------- |
| Frontmatter    | 10%    | Name format, description clarity       |
| Content        | 25%    | Conciseness, examples, workflows       |
| Security       | 20%    | Command injection, path traversal      |
| Structure      | 15%    | Progressive disclosure, organization   |
| Efficiency     | 10%    | Token count, file sizes                |
| Best Practices | 10%    | Naming conventions, guidance           |
| Code Quality   | 10%    | Error handling (if scripts present)    |

## Grading Scale

| Grade | Score  | Status                    |
| ----- | ------ | ------------------------- |
| A     | 90-100 | Production ready          |
| B     | 70-89  | Minor polish recommended  |
| C     | 50-69  | Needs improvement         |
| D     | 30-49  | Major revision needed     |
| F     | <30    | Complete rewrite required |

## Output Format

The evaluation provides a comprehensive report:

```markdown
# Skill Quality Evaluation: {skill-name}

**Quality:** [Excellent/Good/Fair/Needs Work]
**Readiness:** [Production/Minor Fixes/Major Revision]
**Overall Score:** {X}/100 ({Grade})

## Scores
| Category       | Score  | Notes   |
| Frontmatter    | X/100  | {notes} |
| Content        | X/100  | {notes} |
| Security       | X/100  | {notes} |
| Structure      | X/100  | {notes} |
| Efficiency     | X/100  | {notes} |
| Best Practices | X/100  | {notes} |
| Code Quality   | X/100  | {notes} |
| **Overall**    | **X.X/100** |         |

## Recommendations

### Critical (Fix Immediately)
1. **[Issue]**: [Current] -> [Fix]

### High Priority
1. **[Issue]**: [Current] -> [Fix]

### Medium Priority
1. **[Issue]**: [Improvement]
```

## Read-Only

This command makes NO changes:
- Only reads files
- Only analyzes content
- Only generates report

Use `/rd2:skill-refine` to apply improvements.

## See Also

- `rd2:skill-doctor` - Agent that handles quality evaluation
- `/rd2:skill-add` - Create new skills
- `/rd2:skill-refine` - Apply improvements
- `rd2:cc-skills` - Best practices reference with validation checklist
