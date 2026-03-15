---
description: Evaluate skill quality with validation and scoring
argument-hint: "<skill-path> [--scope basic|full] [--platform <name>] [--json]"
---

# Skill Evaluate

Validate and evaluate skill quality across multiple dimensions.

## When to Use

- Validating a new or modified skill
- Checking skill quality before publishing
- Running quality assessment for improvement planning

## Usage

```bash
/rd3:skill-evaluate <skill-path> [options]
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--scope <level>` | Evaluation scope: basic (validate only) or full (with scoring) | basic |
| `--platform <name>` | Target platform: all, claude, codex, openclaw, opencode, antigravity | all |
| `--json` | Output results as JSON | false |
| `--verbose, -v` | Show detailed output | false |

## Scopes

### basic (default)
- Frontmatter validation (name, description, metadata)
- Structure validation (scripts/, references/, assets/)
- Best practices check (line count, progressive disclosure)
- Platform compatibility check

### full
- All basic checks +
- Quality scoring across dimensions
- Eval report generation with recommendations

## Examples

```bash
# Basic validation
/rd3:skill-evaluate ./skills/my-skill --scope basic

# Full evaluation with all platforms
/rd3:skill-evaluate ./skills/my-skill --scope full --platform all

# Quick validation with JSON output
/rd3:skill-evaluate ./skills/my-skill --json

# Platform-specific validation
/rd3:skill-evaluate ./skills/my-skill --platform codex
```

## Workflow

This command runs validation and evaluation:

1. **Parse** SKILL.md and extract frontmatter
2. **Validate** required fields and structure
3. **Check** platform-specific compatibility
4. **Score** quality dimensions (if --scope full)
5. **Report** results with recommendations

## Output

The command outputs:
- Validation status (pass/fail)
- Error and warning count
- Quality scores (full scope only)
- Recommendations for improvement

## Exit Codes

- `0` - Validation passed
- `1` - Validation failed or errors found

## Related Commands

- `/rd3:skill-add` - Create new skill
- `/rd3:skill-refine` - Improve skill based on evaluation

## Implementation

To execute this command, the AI agent should choose the appropriate execution path based on its environment:

### For Claude Code
Use the `rd2:skill-doctor` subagent or explicitly use a task:
```python
Task(
    subagent_type="rd2:skill-doctor",
    prompt="Evaluate skill at {skill_path} with scope {scope} and platform {platform} using the scripts at ${CLAUDE_PLUGIN_ROOT:-.}/plugins/rd3/skills/cc-skills/scripts/evaluate.ts",
    description="Evaluate skill quality for {skill_path}"
)
```

### For Other Coding Agents (Codex, Antigravity, OpenCode, OpenClaw)
Explicitly use the terminal or bash execution tool to run the TypeScript script directly:
```bash
bun ./plugins/rd3/skills/cc-skills/scripts/evaluate.ts <skill-path> [--scope <level>] [--platform <name>] [--json]
```
