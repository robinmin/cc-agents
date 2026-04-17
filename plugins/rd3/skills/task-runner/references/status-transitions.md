# Status Transitions and Guards

Task status ownership rules for `task-runner`, including pre-transition guards and backfill templates.

## Ownership Principle

`task-runner` is the **workflow owner** for status transitions. It must not assume every delegated skill updates task status correctly.

## State Machine

| State | Meaning | Allowed Next State |
|-------|---------|--------------------|
| `ready` | Preconditions satisfied for coding | `implementing` |
| `implementing` | Code changes in progress | `testing`, `blocked` |
| `testing` | Tests and coverage running | `implementing`, `verifying`, `blocked` |
| `verifying` | Ready for review + traceability gate | `done`, `implementing`, `blocked` |
| `blocked` | Needs debugging or intervention | `implementing` after unblock |

## Status Rules Table

| Workflow Moment | Required Status Action |
|-----------------|------------------------|
| Workflow starts on executable task | Apply pre-implementation guard, then `tasks update <WBS> wip` |
| Refine runs | Keep current status unless task was backlog/todo and guard satisfied, then → `wip` |
| Plan decides to decompose | Create child tasks first, keep parent non-terminal, stop parent execution |
| Enter testing pass | Ensure `Plan` + `Design` sufficient, then `tasks update <WBS> testing` |
| Test fails or further implementation needed | Ensure pre-impl guard holds, then → `wip` |
| Verification returns `PARTIAL` or `FAIL` | Ensure pre-impl guard holds, then → `wip` |
| Verification returns `PASS` | Run completion guards, then → `done` |

## Principle

**`done` comes from the workflow verdict, not from implementation alone.**

- implementation completion is not enough
- passing tests are not enough
- `done` requires: verification `PASS` + post-flight gate (if enabled) + `rd3:tasks` completion requirements satisfied

## Guards Helper Pattern

All three transition points (pre-wip, pre-test, pre-done) use a single conceptual helper:

```text
applyGuards(target_status: "wip" | "testing" | "done"):
  required = sections_required_for(target_status)
  missing = check_task_sections(task_file, required)
  for section in missing:
    backfill(section, using="actual execution record")
  if still_missing:
    if --auto: halt with actionable error
    else: prompt user
```

**Required sections by target status:**

| Target | Required Sections |
|--------|-------------------|
| `wip` | `Solution`, `Plan` (provisional OK); `Design` warned if missing |
| `testing` | `Background`, `Requirements`, `Solution`, `Plan`; `Design` warned if missing |
| `done` | All of above + `Design`, `Plan` fully populated; `Testing` evidence present |

**`task-runner` should prefer honest backfill over `tasks update --force`.**

## Pre-Implementation Guard

Before the first `wip` transition:

1. Ensure `Solution` contains the current intended implementation approach (provisional OK)
2. Ensure `Plan` exists as a real execution plan for the current run
3. Ensure `Design` exists when the task would otherwise require `--force` to enter `wip`
4. Only then call `tasks update <WBS> wip`

## Pre-Testing Guard

Before the first `testing` transition:

1. Ensure `Solution` reflects actual implementation work
2. If `plan` was skipped earlier, synthesize minimal but real `Plan` section from execution record
3. If no explicit design step ran, synthesize minimal but real `Design` section when needed
4. Only then call `tasks update <WBS> testing`

## Completion Guards (Before `done`)

The current `rd3:tasks` CLI blocks `Done` unless `Background`, `Requirements`, `Solution`, `Design`, `Plan` are populated.

Before `done`:

1. Check `Solution`, `Design`, `Plan` present enough for valid `Done` transition
2. If `plan` was skipped, synthesize minimal but real `Design` and `Plan` from actual execution record
3. Ensure `Testing` section contains testing evidence
4. If sections can't be populated honestly, do **not** force `Done`; leave task in `Testing` or `WIP` and record what is missing

**Completion proof requires ALL of:**
- verification verdict is `PASS`
- task satisfies `rd3:tasks` `Done` guards
- testing evidence exists in `Testing`
- no unresolved blocker remains
- delegated evidence written back to local task file when delegation was used
- post-flight gate passed (if `--postflight-verify` or `--verify` enabled)

## Backfill Templates

### Minimum `Design` Structure

```markdown
## Design

- Scope: <what changed>
- Key decision: <why this approach was used>
- Boundaries affected: <files/modules/interfaces>
- Risks: <main risk or "none beyond normal regression risk">
```

### Minimum `Plan` Structure

```markdown
## Plan

- [x] Review task requirements and existing code
- [x] Implement the required change set
- [x] Add or extend tests for the affected behavior
- [x] Verify with the project validation command(s)
```

### Minimum `Testing` Structure

```markdown
## Testing

- Command: <exact test command or skill invocation>
- Scope: <what was tested>
- Result: <pass/fail and coverage if measured>
- Evidence: <key output summary, failing case, or artifact path>
- Next action: <none if clean, otherwise the required follow-up>
```

Backfilled sections must be derived from actual work performed, not generic filler.

## Lifecycle Operation Bundles

When a `rd3:tasks` lifecycle operation applies, follow the full bundle instead of moving status alone.

| `task-runner` stage | `rd3:tasks` operation family | Minimum bundle expectation |
|---------------------|------------------------------|----------------------------|
| Refine | `planning` | Update Q&A / requirement clarifications, leave task ready for planning |
| Plan | `design` | Update `Design`, optionally planning/Q&A, keep task queued if no implementation starts |
| Implement | `implementation` | Update `Solution` + `Plan`, record artifacts if needed, then `wip` |
| Verify for completion | `review` then `testing` | Update `Review`, then update `Testing` evidence before `done` |

## Escalation Rule

If the task bounces between implement and test without converging after `--max-loop-iterations` focused passes:

- keep status at `wip`
- document the blocker in the task file
- switch to `rd3:sys-debugging` or manual intervention
- set `blocked` state explicitly
