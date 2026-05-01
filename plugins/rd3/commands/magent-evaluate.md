---
description: "Score a main agent config across 6 quality dimensions"
argument-hint: "<config-path> [--from <platform>] [--output <path>] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Evaluate

Delegate to the **rd3:cc-magents** skill.

Evaluate a main agent configuration across 6 capability-aware dimensions. Apply weighted aggregation to produce a 0–100 score and an A–F grade. Generate findings that drive follow-up `refine` invocations.

## When to Use

- Score quality after creating or modifying a config
- Audit a config before sharing it publicly
- Compare config quality before and after refinement
- Gate a config-review workflow on a numeric score

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `<config-path>` | Path to config file (positional, e.g. `AGENTS.md`, `CLAUDE.md`) | (required) |
| `--from` | Source platform hint | auto-detect |
| `--output` | Write JSON result to path | (none) |
| `--json` | Emit JSON to stdout | false |

## Quality Dimensions

| Dimension | Weight | Measures |
|-----------|--------|----------|
| **coverage** | 22% | Section breadth and presence of key topics (rules, tools, output) |
| **scoping** | 14% | Path-scoped rules where the platform supports globs |
| **safety** | 18% | Approval boundaries, destructive-action handling, secret guidance |
| **portability** | 16% | `agents-md` compatibility, imports, cross-platform readiness |
| **evidence** | 14% | Source URLs and verification dates with high-confidence platforms |
| **maintainability** | 16% | Modular structure and registry/import usage |

Apply these weights exactly. Generate a `0–100` score with a letter grade.

## Output Shape

Read the result as a JSON object containing four fields:

- `score` — integer 0–100
- `grade` — letter A through F
- `dimensions` — object mapping each dimension name to its 0–100 score
- `findings` — array of strings (validation issues + capability signals)

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="evaluate $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/evaluate.ts $ARGUMENTS
```

## Examples

```bash
# Evaluate AGENTS.md
/rd3:magent-evaluate AGENTS.md

# Evaluate CLAUDE.md with explicit source platform
/rd3:magent-evaluate CLAUDE.md --from claude-code

# JSON output for CI integration
/rd3:magent-evaluate AGENTS.md --json --output evaluation.json
```

## Next Steps

Apply the findings to drive `refine`:

```bash
# Get capability-aware suggestions targeting a specific platform
/rd3:magent-refine AGENTS.md --to claude-code
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
