---
description: "Propose longitudinal improvements for a main agent config"
argument-hint: "<config-path> [--from <platform>] [--output <path>] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Evolve

Delegate to the **rd3:cc-magents** skill.

Generate longitudinal improvement proposals for a main agent configuration. Analyze registry signals and capability gaps. Review every proposal before applying — output is **read-only** and speculative.

## When to Use

- Run periodic config health checks
- Reconcile after registry updates that may invalidate prior assumptions
- Surface grounding/evidence improvements
- Plan incremental quality improvements over time

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `<config-path>` | Path to config file (positional) | (required) |
| `--from` | Source platform hint | auto-detect |
| `--output` | Write JSON proposals to path | (none) |
| `--json` | Emit JSON to stdout | false |

Apply the shared CLI parser (`io.ts::parseCliArgs`). Note that `--analyze`, `--apply`, `--history`, and `--rollback` flags are not supported by the current implementation.

## Output Shape

Generate a JSON array of proposal objects. Each object carries:

- `kind` — proposal category (e.g. `evidence`, `registry`, `coverage`)
- `message` — human-readable proposal text

## Apply Workflow

Run `evolve` to **propose only**. Apply changes through one of these paths:

1. Review the proposal output (text or JSON)
2. Edit the config file manually OR re-run with a more specific command:
   - For platform-specific structural splits → `/rd3:magent-refine <file> --to <platform>`
   - For cross-platform conversion → `/rd3:magent-adapt <file> --to <platform>`
3. Re-evaluate to confirm improvement: `/rd3:magent-evaluate <file>`

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="evolve $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/evolve.ts $ARGUMENTS
```

## Examples

```bash
# Generate proposals for AGENTS.md
/rd3:magent-evolve AGENTS.md

# Hint source platform explicitly
/rd3:magent-evolve CLAUDE.md --from claude-code

# JSON output for tracking over time
/rd3:magent-evolve AGENTS.md --json --output evolve-proposals.json
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
