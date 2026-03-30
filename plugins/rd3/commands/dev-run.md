---
description: Profile-driven task execution through the 9-phase pipeline
argument-hint: "<task-ref> [--profile <profile>] [--auto] [--coverage <n>] [--dry-run] [--refine] [--skip-phases <n,n>] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
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
| `research` | 1-9 (all) | Investigation-heavy work with a lighter default test gate |

Default: read from task frontmatter, fall back to `standard`.

### Phase Profiles

| Profile | Phases | Shortcut Command |
|---------|--------|-----------------|
| `refine` | 1 | Run phase 1 refine |
| `plan` | 2, 3, 4 | Run phases 2–4 plan |
| `unit` | 6 | Run phase 6 unit test |
| `review` | 7 | Run phase 7 code review |
| `docs` | 9 | Run phase 9 docs |

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or file path |
| `--auto` | No | Auto-approve human gates (no pauses) |
| `--profile` | No | Override profile (default: from task frontmatter) |
| `--coverage <n>` | No | Override project coverage threshold for phase 6 |
| `--dry-run` | No | Preview execution plan without executing |
| `--refine` | No | Run phase 1 in refine mode |
| `--skip-phases <n,n>` | No | Skip trailing phases only (advanced) |
| `--channel <name>` | No | Execution channel: `current`, `claude-code`, `codex`, `openclaw`, `opencode`, `antigravity`, `pi`. Default: `current` |

## Workflow

Forward `--channel` (default: `current`) to **rd3:orchestration-dev**. In the current pilot, `current` executes direct-skill phases locally and runs Phase 6 locally, but heavy worker phases 5 and 7 still require an ACP channel for end-to-end execution. Use `--channel codex` / `opencode` / another ACP agent for a full pipeline run without worker handoff pauses.

```
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --profile complex")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --profile unit")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --auto")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --dry-run")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --refine --coverage 90 --auto")
Skill(skill="rd3:orchestration-dev", args="$ARGUMENTS --channel opencode")
```

## Examples

<example>
Run the full pipeline using the profile from the task frontmatter
```bash
/rd3:dev-run 0274 --channel codex
```
</example>

<example>
Run a simple task (implementation + testing only)
```bash
/rd3:dev-run 0274 --profile simple --channel codex
```
</example>

<example>
Run a complex task through all 9 phases
```bash
/rd3:dev-run 0274 --profile complex --channel codex
```
</example>

<example>
Run a research task (all phases, 60% test gate)
```bash
/rd3:dev-run 0274 --profile research --channel codex
```
</example>

<example>
Run refine mode with custom coverage and auto-approved human gates
```bash
/rd3:dev-run 0274 --refine --coverage 90 --auto
```
</example>

<example>
Preview the execution plan without running anything
```bash
/rd3:dev-run 0274 --dry-run
```
</example>

## See Also

- **rd3:orchestration-dev**: Full 9-phase pipeline orchestrator skill
- **rd3:run-acp**: ACP executor used by orchestration for delegated remote work
- Phase shortcut commands: use `--profile <phase-name>` with this command to run individual phases


## Platform Notes

### Claude Code (primary)
Native `Skill()` and `!`cmd`` support. Pass arguments directly: `/rd3:dev-run 0274 --profile complex`.

### Other Platforms
`Skill()`, `Task()`, `$ARGUMENTS`, `!`cmd$``, and slash command syntax (`/rd3:dev-run`) are Claude Code–only. On Codex, OpenClaw, OpenCode, Antigravity, or Gemini CLI: invoke the orchestration skill directly via Bash:
```bash
bun plugins/rd3/skills/orchestration-dev/scripts/run.ts <task-ref> --profile <name> [options]
```
See **rd3:orchestration-dev** for available arguments.
