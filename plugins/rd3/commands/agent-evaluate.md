---
description: Check agent quality score and identify weaknesses
argument-hint: "<agent-path> [--scope basic|full] [--json] [--verbose]"
allowed-tools: ["Read", "Write", "Glob", "Bash"]
---

# Agent Evaluate

Wraps **rd3:cc-agents** skill.

Check agent quality score and identify weaknesses. **This command only evaluates - makes NO changes.**

## When to Use

- Check current score without making changes
- Compare scores before/after refine
- Verify agent is ready for publishing
- Grade an agent's quality

## Expected Results

- Quality score (0-100%)
- Dimension-by-dimension breakdown with pass/fail status
- List of weaknesses found
- Recommendations for improvements

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-path` | Path to the agent .md file | (required) |
| `--scope` | Evaluation scope: basic or full | full |
| `--json` | Output results as JSON | false |
| `--verbose` | Show detailed output | false |

## Examples

```bash
# Full evaluation (all 10 dimensions)
/rd3:agent-evaluate ./agents/my-agent.md

# Basic validation (structural checks only)
/rd3:agent-evaluate ./agents/my-agent.md --scope basic

# JSON output for automation
/rd3:agent-evaluate ./agents/my-agent.md --json
```

## Output Example

```
--- Evaluation Summary ---
Grade: B (85%)

--- Dimensions ---
| Dimension | Score | Status |
|-----------|-------|--------|
| Frontmatter Quality | 9/10 | ✓ |
| Description Effectiveness | 14/15 | ✓ |

--- Weaknesses ---
- Missing Examples section
- No DO/DON'T rules
```

## Implementation

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/evaluate.ts <agent-path> [options]
```

## Platform Notes

- Claude Code: Use `Skill()` for skill delegation
- Other platforms: Run script directly via Bash tool

## See Also

- `/rd3:agent-refine` - Evaluate + apply fixes in one step
- `/rd3:agent-add` - Create new agent
