---
description: Evaluate command quality across 6 dimensions
argument-hint: <command-file>
allowed-tools: Read, Grep, Glob
---

# Evaluate Command Quality

Invoke `rd2:command-doctor` agent for comprehensive quality assessment.

## Quick Start

```bash
/rd2:command-evaluate .claude/commands/my-command.md
/rd2:command-evaluate plugins/rd2/commands/review-code
```

## Arguments

| Argument         | Description              |
| ---------------- | ---------------------- |
| `<command-file>` | Path to command file   |

## Validation

1. Verify file exists
2. Ensure .md extension
3. Parse frontmatter (YAML)

## Scoring Dimensions

| Category       | Weight | Focus                        |
| -------------- | ------ | ---------------------------- |
| Frontmatter    | 20%    | Valid YAML, required fields  |
| Description    | 25%    | Clear, under 60 chars        |
| Content        | 25%    | Imperative form              |
| Structure      | 15%    | Progressive disclosure       |
| Validation     | 10%    | Input checks                |
| Best Practices | 5%     | Naming conventions          |

## Grading Scale

| Grade | Score  | Status                    |
| ----- | ------ | ------------------------- |
| A     | 90-100 | Production ready          |
| B     | 80-89  | Minor polish recommended  |
| C     | 70-79  | Needs improvement        |
| D     | 60-69  | Major revision needed     |
| F     | <60    | Complete rewrite required |

## Output Format

Generate report with scores and recommendations.

## Implementation

Execute Task to invoke command-doctor agent:

```
Task(
    subagent_type="command-doctor",
    prompt="""Evaluate command: {command_file}

Assess across 6 dimensions:
- Frontmatter (20%): YAML syntax, required fields
- Description (25%): Clarity, length, specificity
- Content (25%): Imperative form
- Structure (15%): Organization
- Validation (10%): Input checks
- Best Practices (5%): Naming

Report scores and recommendations.""",
    description="Evaluate {command_file} quality"
)
```

## Read-Only

This command makes NO changes. Use `/rd2:command-refine` to apply improvements.
