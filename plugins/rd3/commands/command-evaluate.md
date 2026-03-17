---
description: Evaluate command quality with validation and scoring
argument-hint: "<command-path> [--scope basic|full] [--platform all|claude|codex|gemini|openclaw|opencode|antigravity] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Command Evaluate

Wraps **rd3:cc-commands** skill.

Check command quality score and identify weaknesses. **This command only evaluates - makes NO changes.**

## When to Use

- Validate a new or modified command
- Check command quality before publishing
- Compare quality across platforms

## Expected Results

- Quality score (0-100%)
- Dimension-by-dimension breakdown with pass/fail status
- List of weaknesses found
- Recommendations for improvements

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `command-path` | Path to the command .md file | (required) |
| `--scope` | Evaluation scope: basic or full | basic |
| `--platform` | Target platform: all, claude, codex, gemini, openclaw, opencode, antigravity | all |
| `--json` | Output results as JSON | false |

## Examples

```bash
# Basic validation
/rd3:command-evaluate ./commands/review-code.md

# Full evaluation with JSON output
/rd3:command-evaluate ./commands/review-code.md --scope full --json

# Platform-specific check
/rd3:command-evaluate ./commands/review-code.md --platform gemini
```

## Output Example

```
Evaluation passed (85%)

--- Dimensions ---
| Dimension | Score | Status |
|-----------|-------|--------|
| Frontmatter | 18/18 | ✓ PASS |
| Content Quality | 12/15 | ✗ FAIL |

--- Weaknesses ---
- Missing Platform Notes section
- Uses second-person voice
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-commands/scripts/evaluate.ts <command-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:command-add` - Create new command
- `/rd3:command-refine` - Evaluate + apply fixes in one step
