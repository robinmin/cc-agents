---
description: Evaluate command quality with validation and scoring
argument-hint: "<command-path> [--scope basic|full] [--platform <name>] [--json]"
---

# Command Evaluate

Validate and evaluate slash command quality across multiple dimensions.

## When to Use

- Validating a new or modified command
- Checking command quality before publishing
- Running quality assessment for improvement planning
- Comparing command quality across platforms

## Usage

```bash
/rd3:command-evaluate <command-path> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--scope <level>` | Evaluation scope: basic or full | basic |
| `--platform <name>` | Platform: claude, codex, gemini, openclaw, opencode, antigravity, all | - |
| `--json` | Output results as JSON | false |
| `--verbose, -v` | Show detailed output | false |

## Scopes

### basic (default)
- Frontmatter validation (5-field schema)
- Description effectiveness
- Content quality
- Structure and brevity
- Delegation patterns
- Argument design

### full
- All basic checks +
- Security scan
- Naming convention
- Platform compatibility
- Operational readiness

## Examples

```bash
# Basic validation
/rd3:command-evaluate ./commands/review-code.md

# Full evaluation with JSON output
/rd3:command-evaluate ./commands/review-code.md --scope full --json

# Platform-specific check
/rd3:command-evaluate ./commands/review-code.md --platform gemini
```

## Workflow

1. **Parse** command .md and extract frontmatter
2. **Validate** 5-field schema compliance
3. **Analyze** body content quality
4. **Score** dimensions (basic: 6, full: 10)
5. **Report** results with grade and recommendations

## Exit Codes

- `0` - Evaluation passed (score >= 80%)
- `1` - Evaluation failed or errors found

## Related Commands

- `/rd3:command-add` - Create new command
- `/rd3:command-refine` - Improve command based on evaluation

## Implementation

### For Claude Code
```bash
bun ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-commands/scripts/evaluate.ts <command-path> [options]
```

### For Other Coding Agents
```bash
bun ./plugins/rd3/skills/cc-commands/scripts/evaluate.ts <command-path> [options]
```
