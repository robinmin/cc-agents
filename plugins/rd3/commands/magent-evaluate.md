---
description: "Evaluate main agent config quality"
argument-hint: "<config-path> [--profile <standard|minimal|advanced>] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Evaluate

Wraps **rd3:cc-magents** skill.

Evaluate the quality of a main agent configuration across 5 MECE dimensions.

## When to Use

- After creating or modifying a config
- Before sharing a config publicly
- Comparing config quality over time
- As part of config review workflow
- Benchmarking configs against each other

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `config-path` | Path to config file (AGENTS.md, CLAUDE.md) | (required) |
| `--profile` | Weight profile | standard |
| `--json` | Output results as JSON | false |
| `--output` | Write results to file | stdout |

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="evaluate $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/evaluate.ts $ARGUMENTS
```

## Quality Dimensions

| Dimension | Weight | Measures |
|-----------|--------|----------|
| **Coverage** | 25% | Core sections and concerns are present and substantive |
| **Operability** | 25% | Decision trees, executable examples, output contracts |
| **Grounding** | 20% | Evidence, verification steps, uncertainty handling |
| **Safety** | 20% | CRITICAL rules, approvals, destructive action warnings |
| **Maintainability** | 10% | Memory, feedback, steering, version tracking |

## Weight Profiles

| Profile | Best For |
|---------|----------|
| `standard` | Balanced evaluation (default) |
| `minimal` | Simple configs prioritizing coverage/safety |
| `advanced` | Self-evolving configs prioritizing maintainability/grounding |

## Grade Thresholds

| Grade | Score | Pass? |
|-------|-------|-------|
| A | >= 90% | Yes |
| B | >= 80% | Yes |
| C | >= 70% | No (warning) |
| D | >= 60% | No |
| F | < 60% | No |

## Examples

```bash
# Evaluate AGENTS.md with standard profile
/rd3:magent-evaluate AGENTS.md

# Evaluate with minimal profile (for simple configs)
/rd3:magent-evaluate CLAUDE.md --profile minimal

# JSON output for CI integration
/rd3:magent-evaluate AGENTS.md --json --output evaluation.json
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
