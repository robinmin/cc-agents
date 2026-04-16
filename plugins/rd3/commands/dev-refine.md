---
description: Refine task requirements via structured Q&A
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

> **Argument hints:** `<task-ref>` `[--focus <focus-mode>]` `[--auto]`

# Dev Refine

Refine task requirements by analyzing existing content for quality issues and improving them through targeted Q&A. This command is a thin wrapper that delegates directly to the `rd3:request-intake` skill with `--mode refine`.

## When to Use

- Task has vague or incomplete Requirements section
- Requirements lack acceptance criteria or testability
- Background section is too brief
- Profile needs to be assigned or validated
- Need to clarify scope boundaries or constraints

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | Yes | — | WBS number or file path |
| `--description` | No | — | Additional context to guide Q&A synthesis |
| `--focus` | No | `all` | Predefined hint bundle that expands into `request-intake` `domain_hints` (see below) |
| `--auto` | No | `false` | Skip interactive Q&A, use AI synthesis only |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

### `--focus` Values

Selects a predefined **hint bundle** that this wrapper expands into `rd3:request-intake` `domain_hints`.

These are wrapper-level convenience values, not native `request-intake` modes.

| Value | Expanded `domain_hints` bundle | When to Use |
|-------|-------------------------------|-------------|
| `all` | `purpose,scope,constraints,dependencies,acceptance_criteria,users,timeline` | Complete refinement |
| `requirements` | `purpose,scope,acceptance_criteria` | Standard refinement |
| `background` | `purpose,scope` | Brief tasks needing context |
| `constraints` | `constraints,dependencies,timeline` | Technical depth needed |
| `acceptance` | `acceptance_criteria,users` | Focus on verification |
| `quick` | `scope,acceptance_criteria` | Fast refinement |

## Delegation

This command delegates all work to the `rd3:request-intake` skill with `--mode refine`.

```
Skill(skill="rd3:request-intake", args="--mode refine --task_ref $TASK_REF --description $DESCRIPTION --domain_hints $DOMAIN_HINTS")
```

### Argument Mapping

| Command Flag | Skill Field | Notes |
|--------------|-------------|-------|
| `task-ref` | `task_ref` | WBS number or path |
| `--description` | `description` | Optional context |
| `--focus` | `domain_hints` | Expands to a predefined hint bundle before delegation |
| `--auto` | — | Skips AskUserQuestion, uses synthesis only |

## Examples

| Command | Effect |
|---------|--------|
| `/rd3:dev-refine 0274` | Full refinement (all categories) |
| `/rd3:dev-refine 0274 --focus acceptance` | Focus on acceptance criteria |
| `/rd3:dev-refine 0274 --focus quick` | Fast: scope + acceptance only |
| `/rd3:dev-refine 0274 --description "CLI tool"` | Add context hint |
| `/rd3:dev-refine 0274 --auto` | AI synthesis only (no Q&A) |
| `/rd3:dev-refine 0274 --focus quick --auto` | Quick + auto |

> `--focus` values: `all`, `requirements`, `background`, `constraints`, `acceptance`, `quick`

## Workflow

1. **Resolve task-ref** → Load task file from WBS or path
2. **Analyze** → Check content for gaps and ambiguities
3. **Question** → Generate targeted Q&A based on the expanded `domain_hints` bundle
4. **Synthesize** → Update Background, Requirements, Constraints
5. **Assign** → Auto-set preset based on scope

## Design Rationale

This command intentionally delegates to `rd3:request-intake` (not `orchestration-v2`) because:
- Refinement is a single-agent interactive workflow
- Interactive Q&A cannot be cleanly delegated to another agent via `--channel`
- `--focus` gives this wrapper a stable shorthand that expands into `request-intake` `domain_hints`

## See Also

- **rd3:request-intake**: Requirements elicitation skill (source for refine mode)
- **rd3:task-decomposition**: Task breakdown after refinement
- **rd3:dev-plan**: Planning phase that follows refinement

## Platform Notes

| Platform | Skill() | acpx | Recommended |
|----------|---------|------|-------------|
| Claude Code | ✅ | ✅ | `Skill()` |
| pi | ❌ | ✅ | `acpx <agent> exec` |
| Codex/OpenCode | ❌ | ✅ | `acpx <agent> exec` |
| OpenClaw | ❌ | ✅ | `acpx <agent> exec` |
