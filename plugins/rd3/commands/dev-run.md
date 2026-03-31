---
description: Profile-driven task execution through the 9-phase pipeline
argument-hint: "<task-ref> [--profile <profile>] [--auto] [--coverage <n>] [--dry-run] [--refine] [--skip-phases <n,n>] [--channel <current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Skill"]
---

# Dev Run

Execute the 9-phase pipeline for a task, driven by profile. Delegates to **rd3:orchestration-dev** skill.

## When to Use

- Running end-to-end task execution through the 9-phase pipeline
- Executing any combination of phases via profiles
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

Forward `--channel` (default: `current`) to **rd3:orchestration-dev**. All 9 phases are executable. Phases 5-7 use worker-agent envelopes; Phase 6 runs through verification-chain. Phases 1-4 and 8-9 execute as direct-skill phases on the `current` channel. Review runs pause at the Phase 7 human gate unless `--auto` is set. Worker phases (5, 7) require `ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT` or `ACPX_AGENT` for local prompt execution.

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
Run a simple task (implementation + testing)
```bash
/rd3:dev-run 0274 --profile simple
```
</example>

<example>
Run unit testing only
```bash
/rd3:dev-run 0274 --profile unit
```
</example>

<example>
Run review-only on the current channel and auto-approve the review gate
```bash
/rd3:dev-run 0274 --profile review --auto
```
</example>

<example>
Preview a complex profile plan without executing
```bash
/rd3:dev-run 0274 --profile complex --dry-run
```
</example>

<example>
Preview a refine profile plan
```bash
/rd3:dev-run 0274 --profile refine --dry-run
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
