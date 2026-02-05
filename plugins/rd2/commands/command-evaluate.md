---
description: Evaluate command quality across 6 dimensions
skills: [rd2:cc-commands, rd2:anti-hallucination]
argument-hint: <command-file>
---

# Evaluate Command Quality

Thin wrapper command for `rd2:command-doctor` agent. Comprehensive quality assessment across 6 dimensions with actionable improvement recommendations.

## Quick Start

```bash
# Via slash command (recommended)
/rd2:command-evaluate .claude/commands/my-command.md
/rd2:command-evaluate plugins/rd2/commands/review-code
```

## Arguments

| Argument         | Description                                 |
| ---------------- | ------------------------------------------- |
| `<command-file>` | Path to command file (relative or absolute) |

## Validation

Verify command file before evaluation:

1. **Check file exists**: Verify command file path is valid
2. **Validate file type**: Ensure .md extension
3. **Parse frontmatter**: Check YAML syntax is valid

If validation fails:

- Show clear error message with file path
- Suggest checking file path and extension
- Indicate YAML syntax errors with line numbers

## Workflow

This command follows the comprehensive review process:

1. **Read Command** - Parse frontmatter and body content
2. **Validate Frontmatter** - Check YAML syntax, required fields
3. **Evaluate Description** (Most Critical) - Clarity, length, specificity
4. **Assess Content Quality** - Imperative form, clear instructions
5. **Check Structure** - Organization, progressive disclosure
6. **Review Validation** - Input checks, error handling
7. **Check Best Practices** - Naming conventions, documentation
8. **Generate Report** - Specific fixes with before/after examples

## Scoring Dimensions

| Category       | Weight | Key Criteria                              |
| -------------- | ------ | ----------------------------------------- |
| Frontmatter    | 20%    | Valid YAML, required fields, proper usage |
| Description    | 25%    | Clear, concise, specific trigger phrases  |
| Content        | 25%    | Imperative form, clear instructions       |
| Structure      | 15%    | Progressive disclosure, organization      |
| Validation     | 10%    | Input checks, error handling              |
| Best Practices | 5%     | Naming conventions, documentation         |

## Grading Scale

| Grade | Score  | Status                    |
| ----- | ------ | ------------------------- |
| A     | 90-100 | Production ready          |
| B     | 80-89  | Minor polish recommended  |
| C     | 70-79  | Needs improvement         |
| D     | 60-69  | Major revision needed     |
| F     | <60    | Complete rewrite required |

## Output Format

Generate comprehensive report with:

```markdown
# Command Quality Evaluation: {command-name}

**Quality:** [Excellent/Good/Fair/Needs Work]
**Readiness:** [Production/Minor Fixes/Major Revision]
**Overall Score:** {X}/100 ({Grade})

## Scores

| Category       | Score      | Notes   |
| -------------- | ---------- | ------- |
| Frontmatter    | X/20       | {notes} |
| Description    | X/25       | {notes} |
| Content        | X/25       | {notes} |
| Structure      | X/15       | {notes} |
| Validation     | X/10       | {notes} |
| Best Practices | X/5        | {notes} |
| **Overall**    | **X.X/20** |         |

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

Use `/rd2:command-refine` to apply improvements.

## Implementation

This command delegates to the **rd2:command-doctor** agent for quality evaluation:

```
Task(
    subagent_type="rd2:command-doctor",
    prompt="""Evaluate the command quality for: {command_file}

Perform comprehensive assessment across 6 dimensions:
1. Frontmatter (20%) - YAML syntax, required fields
2. Description (25%) - Clarity, length, specificity
3. Content (25%) - Imperative form, instructions
4. Structure (15%) - Organization, progressive disclosure
5. Validation (10%) - Input checks, error handling
6. Best Practices (5%) - Naming conventions, documentation

Generate detailed report with:
- Overall score (0-100) and grade (A-F)
- Dimension-specific scores with notes
- Critical, high, and medium priority recommendations
- Specific fixes with before/after examples
   """,
    description="Evaluate {command_file} quality"
)
```

## See Also

- `rd2:command-doctor` - Agent that handles quality evaluation
- `/rd2:command-add` - Create new commands
- `/rd2:command-refine` - Apply improvements
- `rd2:cc-commands` - Best practices reference
