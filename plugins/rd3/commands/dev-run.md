---
description: Profile-driven task execution through the 9-phase pipeline
argument-hint: "<task-ref> [--profile <profile>] [--auto] [--coverage <n>] [--dry-run] [--refine] [--skip-phases <n,n>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
disable-model-invocation: true
---

# Dev Run

Execute the 9-phase pipeline for a task, driven by profile. Delegates to **rd3:orchestration-dev** skill.

## When to Use

- Starting a new task end-to-end
- Running specific phases via phase profiles
- Previewing execution plan without side effects

## Profiles

### Task Profiles

| Profile | Phases | Description |
|---------|--------|-------------|
| `simple` | 5, 6 | Single deliverable, 1-2 files |
| `standard` | 1, 4, 5, 6, 7, 8(bdd), 9(refs) | Moderate scope, 2-5 files |
| `complex` | 1-9 (all) | Large scope, 6+ files, full rigor |

Default: read from task frontmatter, fall back to `standard`.

### Phase Profiles

| Profile | Phases | Shortcut Command |
|---------|--------|-----------------|
| `refine` | 1 | `/dev-refine` |
| `plan` | 2, 3, 4 | `/dev-plan` |
| `unit` | 6 | `/dev-unit` |
| `review` | 7 | `/dev-review` |
| `docs` | 9 | `/dev-docs` |

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--profile` | No | Override profile (default: from task frontmatter) |
| `--auto` | No | Auto-approve human gates (no pauses) |
| `--coverage <n>` | No | Override project coverage threshold for phase 6 |
| `--dry-run` | No | Preview execution plan without executing |
| `--refine` | No | Run phase 1 in refine mode |
| `--skip-phases <n,n>` | No | Skip specific phases (advanced) |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path | `docs/tasks2/0274_*.md` |

## Workflow

Delegates to **rd3:orchestration-dev** skill:

```
# Default (profile from task file)
Skill(skill="rd3:orchestration-dev", args="{task-ref} --auto")

# Override profile
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile complex --auto")

# Phase profile
Skill(skill="rd3:orchestration-dev", args="{task-ref} --profile unit --auto")

# Dry run
Skill(skill="rd3:orchestration-dev", args="{task-ref} --dry-run")

# Refine mode + custom coverage
Skill(skill="rd3:orchestration-dev", args="{task-ref} --refine --coverage 90 --auto")
```

### Phase Details

| Phase | Skill | Gate |
|-------|-------|------|
| 1. Request Intake | `rd3:request-intake` | Auto |
| 2. Architecture | `rd3:backend-architect` / `rd3:frontend-architect` | Auto |
| 3. Design | `rd3:backend-design` / `rd3:frontend-design` | Human |
| 4. Task Decomposition | `rd3:task-decomposition` | Auto |
| 5. Implementation | `rd3:code-implement-common` | Auto |
| 6. Unit Testing | `rd3:sys-testing` + `rd3:advanced-testing` | Auto |
| 7. Code Review | `rd3:code-review-common` | Human |
| 8. Functional Review | `rd3:bdd-workflow` + `rd3:functional-review` | Auto/Human |
| 9. Documentation | `rd3:code-docs` | Auto |

## Examples

```bash
# Full pipeline (profile from task file)
/dev-run 0274

# Simple task (impl + test only)
/dev-run 0274 --profile simple

# Complex task (all 9 phases)
/dev-run 0274 --profile complex

# Phase profile: just unit testing
/dev-run 0274 --profile unit

# Refine mode + custom coverage
/dev-run 0274 --refine --coverage 90 --auto

# Preview without executing
/dev-run 0274 --dry-run

# End-to-end, no pauses
/dev-run 0274 --auto
```

## See Also

- **rd3:orchestration-dev**: Full 9-phase pipeline orchestrator skill
- **/dev-refine**: Refine requirements (shortcut for `--profile refine`)
- **/dev-plan**: Architecture + design + decomposition (shortcut for `--profile plan`)
- **/dev-unit**: Unit testing only (shortcut for `--profile unit`)
- **/dev-review**: Code review only (shortcut for `--profile review`)
- **/dev-docs**: Documentation only (shortcut for `--profile docs`)
