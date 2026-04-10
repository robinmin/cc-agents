---
description: Preset-driven task execution through the 9-phase pipeline
argument-hint: "<task-ref> [--preset <name>] [--phases <csv>] [--channel <name>] [--auto] [--dry-run]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Run

Execute the 9-phase pipeline for a task, driven by profile. Delegates to **rd3:orchestration-v2** skill.

## When to Use

- Running end-to-end task execution through the 9-phase pipeline
- Executing any combination of phases via profiles
- Previewing execution plan without side effects

## Profiles

### Task Profiles

| Profile | Phases | Description |
|---------|--------|-------------|
| `simple` | 5, 6 | Single deliverable, 1-2 files |
| `standard` | 1, 4, 5, 6, 7, 8(bdd), 8(func), 9(refs) | Moderate scope, 2-5 files |
| `complex` | 1-9 (all) | Large scope, 6+ files, full rigor |
| `research` | 1-9 (all) | Investigation-heavy work with a lighter default test gate |

Read the default profile from task frontmatter; fall back to `standard`.

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
| `--preset` | No | Override profile (default: from task frontmatter) |
| `--phases <a,b>` | No | Run a specific DAG-valid subset of named phases |
| `--coverage <n>` | No | Override project coverage threshold for phase 6 |
| `--dry-run` | No | Preview execution plan without executing |
| `--channel <name>` | No | Execution target: `pi` (default ACP channel), `inline` (in-process, same as legacy `local`), `subprocess` (explicit Bun subprocess, same as legacy `direct`), `auto` (orchestrator default routing), or an explicit external channel such as `codex`, `openclaw`, `opencode`. Legacy aliases `local`/`current` → `inline`, `direct` → `subprocess` |

## Workflow

Run **rd3:orchestration-v2** with the requested task reference, profile, and overrides. Route `--channel` through the orchestrator as-is; `pi` is the default ACP channel, `inline` is the in-process executor (canonical name for legacy `local`), `subprocess` is the explicit Bun-subprocess transport (canonical name for legacy `direct`), and external ACP channels remain opt-in. `auto` means "use the orchestrator default routing policy". Legacy aliases `local`/`current` normalize to `inline`; `direct` normalizes to `subprocess`. Pause review runs at the Phase 7 human gate unless `--auto` is set.

```
Skill(skill="rd3:orchestration-v2", args="$ARGUMENTS")
Skill(skill="rd3:orchestration-v2", args="$ARGUMENTS --preset <name>")
Skill(skill="rd3:orchestration-v2", args="$ARGUMENTS --auto|--dry-run|--channel <name>")
```

## Examples

<example>
Run a simple task (implementation + testing)
```bash
/rd3:dev-run 0274 --preset simple
```
</example>

<example>
Run review-only on the auto-routed channel and auto-approve the review gate
```bash
/rd3:dev-run 0274 --preset review --auto
```
</example>

<example>
Preview a complex profile plan without executing
```bash
/rd3:dev-run 0274 --preset complex --dry-run
```
</example>

<example>
Run only the review and verification subset in DAG order
```bash
/rd3:dev-run 0274 --phases review,verify-bdd,verify-func,docs
```
</example>
## See Also

- **rd3:orchestration-v2**: Full 9-phase pipeline orchestrator skill
- **rd3:run-acp**: ACP executor used by orchestration for delegated remote work
- Phase shortcut commands: use `--preset <phase-name>` with this command to run individual phases
## Platform Notes

### Claude Code (primary)
Run the command directly with native `Skill()` and `!`cmd`` support: `/rd3:dev-run 0274 --preset complex`.

### Other Platforms
Run the orchestration skill directly via Bash on Codex, OpenClaw, OpenCode, Antigravity, or Gemini CLI because `Skill()`, `Task()`, `$ARGUMENTS`, `!`cmd$``, and slash command syntax (`/rd3:dev-run`) are Claude Code-only:
```bash
orchestrator run <task-ref> --preset <name> [options]
```
Read **rd3:orchestration-v2** for the full argument set.
