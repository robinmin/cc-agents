---
description: "Suggest capability-aware improvements for an agent config"
argument-hint: "<config-path> [--from <platform>] [--to <platform>] [--output <path>] [--json]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Magent Refine

Delegate to the **rd3:cc-magents** skill.

Generate capability-aware improvement suggestions for a main agent configuration. Apply the suggestions manually — `refine` is **read-only** and never modifies the source file.

## When to Use

- Surface quality gaps after evaluation
- Get platform-specific suggestions when porting (pass `--to`)
- Find safety, scope, evidence, or modularity improvements
- Preview modularity/split opportunities before running adapt

## Arguments

| Argument | Description | Default |
|---------|-------------|---------|
| `<config-path>` | Path to config file (positional) | (required) |
| `--from` | Source platform hint | auto-detect |
| `--to` | Target platform — enables platform-specific suggestions (modularity, multi-file split) | (none) |
| `--output` | Write JSON suggestions to path | (none) |
| `--json` | Emit JSON to stdout | false |

## Suggestion Kinds

Generate an array of `RefineSuggestion` objects. Each carries a `kind`:

| Kind | Meaning | Trigger |
|------|---------|---------|
| `safety` | Add explicit approval boundaries for destructive actions, shell, secrets | No `permissions:` declared |
| `scope` | Split broad instructions into path-scoped rules | No glob-scoped rules and platform supports globs |
| `evidence` | Attach platform source URLs and verification dates | No source evidence in workspace |
| `modularity` | Use config-listed instruction files instead of one big markdown | Target platform supports `config_instructions` |
| `split` | Generate native multi-file output | Target platform supports `multi_file` |

## Output Shape

Generate a JSON array of `RefineSuggestion` objects. Each object carries:

- `kind` — one of `safety`, `scope`, `evidence`, `modularity`, `split`
- `message` — human-readable suggestion text
- `targetPlatform` — present only when `--to` was supplied (kinds `modularity` and `split`)

## Important: No Auto-Apply

Apply suggestions manually — this command **does not modify the source file**. Run `refine` to emit suggestions only, then edit based on `kind`:

- `kind: safety` — escalate to user before adding (touches approval policy)
- `kind: scope`, `evidence`, `modularity`, `split` — apply via editor or follow up with `adapt` for cross-platform splits

## Implementation

Delegates to **rd3:cc-magents** skill:

```
Skill(skill="rd3:cc-magents", args="refine $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-magents/scripts/refine.ts $ARGUMENTS
```

## Examples

```bash
# Generic suggestions (no platform target)
/rd3:magent-refine AGENTS.md

# Platform-specific suggestions for Claude Code (surfaces modularity hints)
/rd3:magent-refine AGENTS.md --to claude-code

# JSON for automation
/rd3:magent-refine CLAUDE.md --json --output suggestions.json
```

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation; `$ARGUMENTS` is Claude-specific syntax
- Other platforms: Run script directly via Bash tool with literal arguments (no `$ARGUMENTS` substitution)
