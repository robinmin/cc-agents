---
description: Reliable task execution workflow without rd3:orchestration-v2
argument-hint: "<task-ref> [--preset <simple|standard|complex|research>] [--channel <current|codex|openclaw|opencode|antigravity|pi|claude-code>] [--auto] [--coverage <n>] [--dry-run]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Run

Execute a task through a **workflow-owned execution loop** instead of `rd3:orchestration-v2`.

This command is intentionally **not** a thin wrapper over the old orchestrator. It defines a smaller, more reliable workflow using stable skills plus explicit task-status rules.

## When to Use

- Run a task from refinement/planning through implementation, testing, and verification
- Keep execution reliable without DAG scheduling, resume state, or hidden routing
- Ensure the task file stays consistent even when the delegated skill does not own status changes itself

## What Changed

- No `rd3:orchestration-v2`
- No `--phases`
- No automatic `docs` step
- `--preset` is the only workflow selector
- The core engine is now an **implement ↔ test loop** with optional pre-steps and a verification exit gate

## Happy Path

1. Run preflight
2. Optionally refine
3. Optionally plan, or fork into decomposition handoff
4. Keep implementation in the current workspace by default
5. Run a bounded implement ↔ test loop
6. Run verification
7. Apply completion guards
8. Mark the task `done`

## Non-Happy Path

- If decomposition is required, stop parent execution and continue on child tasks
- If implementation isolation is explicitly requested, prepare a separate feature branch or worktree before coding
- If tests fail repeatedly, move back to `wip` and escalate to `rd3:sys-debugging`
- If verification returns `PARTIAL` or `FAIL`, keep the task non-done and remediate
- If delegated work returns without task-file updates, reconcile the task file locally before proceeding

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or task file path |
| `--preset` | No | Workflow preset: `simple`, `standard`, `complex`, `research` |
| `--channel <name>` | No | Optional execution channel override. Default: run every step in the current agent |
| `--auto` | No | Skip confirmations where the delegated skill supports it |
| `--coverage <n>` | No | Forward a coverage target to the testing phase |
| `--dry-run` | No | Print the resolved workflow and status rules without executing |

Default preset resolution:

1. Task frontmatter `preset`
2. Legacy task frontmatter `profile`
3. Fallback: `standard`

## Presets

| Preset | Refine | Plan | Implement/Test Loop | Verify | Intended Scope |
|--------|--------|------|---------------------|--------|----------------|
| `simple` | Optional | Skip by default | Required | Required | Small localized work |
| `standard` | Optional | Optional | Required | Required | Default path for most tasks |
| `complex` | Required | Required | Required | Required with `--bdd` | Larger or riskier implementation |
| `research` | Required | Required | Required | Required | Unclear domain; investigate before coding |

### Optional-Step Rules

`dev-run` is more than a flat sequence, but it stays explicit.

**Refine is required when:**
- Background / Requirements / Constraints are incomplete
- Acceptance criteria are weak
- Preset is `complex` or `research`

**Plan is required when:**
- The task spans multiple modules or boundaries
- The task likely needs decomposition
- Architecture/design choices are still open
- Preset is `complex` or `research`

**Verify is mandatory for every preset.** The workflow should not report completion before the review + traceability gate passes.

## Workflow

### Stage 0: Preflight

1. Resolve `task-ref`
2. Read task file
3. Determine preset
4. Check whether the task is executable as a single task or should fork into decomposition
5. Check whether the current workspace is acceptable for local implementation
6. Resolve execution channel:
   - default: `current`
   - delegate only if `--channel` is explicitly provided
7. Build the stage plan:
   - refine?
   - plan?
   - implement/test loop
   - verify
8. If `--dry-run`, print the resolved workflow and stop

**Preflight output must answer these questions explicitly:**
- Will `refine` run?
- Will `plan` run?
- Will the task fork into subtasks?
- Will implementation stay in the current workspace or use explicit isolation?
- Will execution stay local or delegate?

### Stage 1: Optional Refine

Use:

```text
Skill(skill="rd3:request-intake", args="--mode refine --task_ref <task-ref> [--auto]")
```

Purpose:
- tighten ambiguous requirements
- improve acceptance criteria
- ensure the task is executable before code is written

Required artifact:
- Background / Requirements / Constraints are updated enough for downstream execution

### Stage 2: Optional Plan

Planning is not a fake phase bundle anymore. It is a targeted decision step:

1. Use specialist planning/design skills only if needed, for example:
   - `rd3:backend-architect`
   - `rd3:frontend-architect`
   - `rd3:backend-design`
   - `rd3:frontend-design`
   - `rd3:pl-typescript`
   - `rd3:pl-python`
   - `rd3:pl-javascript`
   - `rd3:pl-golang`
2. Finish with:

```text
Skill(skill="rd3:task-decomposition", args="<task-ref>")
```

Required artifact:
- either real `Design` + `Plan` content for a single-task execution path
- or a decomposition output that can be materialized into child tasks

**Important outcome rule:**
- `rd3:task-decomposition` is analysis-only. It does **not** create child task files by itself.
- If decomposition is required, `dev-run` must create the child tasks through `rd3:tasks` before stopping parent execution.
- The parent task must **not** be transitioned with `tasks update <WBS> decomposed`, because the current `tasks` CLI normalizes `decomposed` to `Done`.
- After child tasks are created, keep the parent in a non-terminal status and record in the parent task that execution is handed off to those child tasks.

### Decomposition Handoff Contract

Required sequence when Stage 2 decides the task should split:

1. Run `rd3:task-decomposition` to produce the breakdown
2. Materialize child tasks through `rd3:tasks`
3. Write the child task links into the parent Solution section
4. Keep the parent task non-terminal (`Todo` or `WIP`, whichever is already appropriate)
5. Stop parent execution and continue implementation through the child tasks instead

This avoids the current false-completion problem in `rd3:tasks`.

#### Child Task Creation Contract

`dev-run` must use one of these two concrete paths:

**Path A — Batch create from JSON**

1. Ask `rd3:task-decomposition` for batch-creation-compatible JSON using the `structured-output-protocol`
2. Save that JSON to a temp file
3. Run:

```bash
tasks batch-create --from-json /tmp/decomposition.json
```

**Path B — Create tasks one by one**

Use `tasks create` for each decomposed subtask with at least:

```bash
tasks create "<task name>" \
  --background "<subtask background>" \
  --requirements "<subtask requirements>" \
  --feature-id "<feature id if available>" \
  --preset "<preset if known>"
```

Preferred structure for the batch JSON:

```json
[
  {
    "name": "descriptive-task-name",
    "background": "Why this subtask exists.",
    "requirements": "Measurable criteria for completion.",
    "solution": "Planned implementation approach.",
    "feature_id": "feature-id-if-available"
  }
]
```

`dev-run` should prefer batch creation when the decomposition output is already machine-structured.

Do not rely on `parent_wbs` in the batch payload. The current `tasks batch-create` contract does not consume that field. If parent linkage must be preserved, keep it in the parent task's decomposition record and/or add it explicitly after creation using the supported task-file workflow.

After child creation, the parent task becomes a handoff container, not an execution target.

### Stage 3: Implement ↔ Test Loop

This is the core of `dev-run`.

### Implementation Workspace Policy

By default, `dev-run` executes implementation in the current workspace.

`git worktree` or branch-isolation setup is optional for this command family. Do not introduce worktree creation unless the operator or an outer workflow explicitly asks for isolated execution.

Required behavior:

1. Treat the current workspace as the default implementation context
2. If explicit isolation is requested, prepare that isolated branch/worktree before implementation starts
3. If no explicit isolation is requested, pass the same task/workspace context through implementation, testing, and verification without relying on an implicit `cd`

Examples of explicit isolation requests:
- user instruction to use a worktree
- outer workflow policy that mandates isolated implementation
- delegated execution channel that owns its own workspace

Required artifact:
- the implementation, testing, and verification phases all operate against the same intended workspace context

### Pre-Implementation Guard

The current `rd3:tasks` CLI blocks `WIP` unless `Background`, `Requirements`, `Solution`, and `Plan` are present, and it warns on missing `Design`.

Therefore `dev-run` must not move a task to `wip` blindly.

Required behavior before the first `wip` transition:

1. Ensure `Solution` contains the current intended implementation approach, even if it is still provisional
2. Ensure `Plan` exists as a real execution plan for the current run
3. Ensure `Design` exists when the task would otherwise require `--force` to enter `wip`
4. Only then call `tasks update <WBS> wip`

`dev-run` should prefer honest pre-implementation backfill over `tasks update --force`.

Loop body:

1. Satisfy the pre-implementation guard, then set task status to `wip`
2. Execute implementation with the implementation skill's default review handoff disabled
3. Before moving to `testing`, ensure the task still has real `Plan` content and enough `Design` content to avoid `tasks` validation warnings
4. Set task status to `testing`
5. Execute testing
6. Write the testing evidence back into the task file before relying on it for later gates
7. If tests fail, coverage misses the target, or the task still does not satisfy requirements, return to implementation
8. Repeat until the loop exits cleanly or a blocker requires escalation

Bounded state machine:

| State | Meaning | Allowed next state |
|-------|---------|--------------------|
| `ready` | Preconditions satisfied for coding | `implementing` |
| `implementing` | Code changes in progress | `testing`, `blocked` |
| `testing` | Tests and coverage are running | `implementing`, `verifying`, `blocked` |
| `verifying` | Ready for review + traceability gate | `done`, `implementing`, `blocked` |
| `blocked` | Needs debugging or intervention | `implementing` after unblock |

Preferred skills:

```text
implement -> Skill(skill="rd3:code-implement-common", args="implement <resolved-task-file> --no-review")
test      -> Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
```

Inside the implement/test loop, `dev-run` must suppress the implementation skill's default review handoff. The dedicated verification stage remains the only required review gate for normal `dev-run` execution.

If an explicit isolated workspace is being used, `dev-run` must propagate that same workspace context into every later local step or delegated prompt. Do not assume a previous shell-level `cd` will survive across separate command or skill invocations.

Required artifacts:
- `Solution` updated from actual implementation
- `Plan` updated as part of the implementation operation bundle
- `Testing` evidence written back to the task file from the test pass

### Loop Exit Conditions

Exit the implement/test loop only when all of the following are true:

- implementation is present
- tests pass
- required coverage threshold is met or explicitly accepted as adjusted
- no unresolved blocker remains from the last test pass
- the task can transition into `Testing` without relying on `tasks update --force`

Retry / escalation rules:
- normal retry path: `implementing -> testing -> implementing`
- after repeated focused passes without convergence, move to `blocked` and use `rd3:sys-debugging`
- do not loop indefinitely

### Pre-Testing Guard

The current `rd3:tasks` CLI blocks `Testing` unless `Background`, `Requirements`, `Solution`, and `Plan` are present, and it warns on missing `Design`.

Therefore `dev-run` must not move a task to `testing` blindly.

Required behavior before the first `testing` transition:

1. Ensure `Solution` reflects the actual implementation work
2. If `plan` was skipped earlier, synthesize a minimal but real `Plan` section from the execution record
3. If no explicit design step ran, synthesize a minimal but real `Design` section when needed to avoid warning-driven `--force` usage
4. Only then call `tasks update <WBS> testing`

`dev-run` should prefer filling the missing sections honestly over using `--force`.

### Testing Evidence Ownership

`rd3:sys-testing` is a testing and coverage skill, not a task-file mutator. Therefore `dev-run` owns the responsibility for writing the `Testing` section after each meaningful test pass or failed pass that produces actionable evidence.

Minimum `Testing` structure:

```markdown
## Testing

- Command: <exact test command or skill invocation>
- Scope: <what was tested>
- Result: <pass/fail and coverage if measured>
- Evidence: <key output summary, failing case, or artifact path>
- Next action: <none if clean, otherwise the required follow-up>
```

Do not defer this writeback until the end of the run. The verification and completion gates depend on the task file containing current testing evidence.

#### Minimum Backfill Structure

When `Design` or `Plan` must be backfilled from actual execution, use concise but real content.

Minimum `Design` structure:

```markdown
## Design

- Scope: <what changed>
- Key decision: <why this approach was used>
- Boundaries affected: <files/modules/interfaces>
- Risks: <main risk or "none beyond normal regression risk">
```

Minimum `Plan` structure:

```markdown
## Plan

- [x] Review task requirements and existing code
- [x] Implement the required change set
- [x] Add or extend tests for the affected behavior
- [x] Verify with the project validation command(s)
```

Backfilled sections must be derived from the actual work performed, not generic filler.

### Lifecycle Operation Bundles

When a `rd3:tasks` lifecycle operation applies, `dev-run` should follow the full bundle instead of moving status alone.

| `dev-run` stage | `rd3:tasks` operation family | Minimum bundle expectation |
|-----------------|------------------------------|----------------------------|
| Refine | `planning` | update Q&A / requirement clarifications, then leave task ready for planning |
| Plan | `design` | update `Design`, optionally planning/Q&A, keep task queued if no implementation starts |
| Implement | `implementation` | update `Solution` + `Plan`, record artifacts if needed, then `wip` |
| Verify for completion | `review` then `testing` | update `Review`, then update `Testing` evidence before `done` |

`dev-run` should prefer these bundles over isolated section/status mutations whenever possible.

### Escalation Rule

If the task bounces between implement and test without converging after multiple focused passes, stop treating it as routine execution:

- keep status at `wip`
- document the blocker in the task file
- switch to `rd3:sys-debugging` or manual intervention

### Stage 4: Verification Gate

Use:

```text
Skill(skill="rd3:code-verification", args="--mode verify --task-ref <task-ref> --mode-verify full [--bdd true for complex] [--auto] [--channel <current|normalized-channel>]")
```

Purpose:
- SECU review
- requirements traceability
- final go/no-go signal before `done`
- completion proof after the implement ↔ test loop, not before it

Required artifact:
- `Review` section updated with findings/verdict
- requirements traceability written back to the task file
- verdict: `PASS`, `PARTIAL`, or `FAIL`

## Execution Channel

`--channel` is optional.

Default behavior:
- run every workflow step in the **current agent**
- do not delegate externally unless the user explicitly asks for it through `--channel`

Supported values:

| Value | Meaning |
|-------|---------|
| `current` | Run in the current agent and workspace |
| `codex`, `openclaw`, `opencode`, `antigravity`, `pi`, `claude-code` | Delegate selected heavy phases through `rd3:run-acp` |

Rules:
- default is `current`
- keep `refine` and `test` on `current` unless there is a strong reason not to
- `plan`, `implement`, and `verify` may use the specified external channel when delegation is explicitly requested
- when editing `rd3:run-acp` or `rd3:code-verification`, force `current` to avoid circular delegation

### Channel Alias Normalization

Before calling `rd3:run-acp`, normalize slash-command aliases to ACP agent names:

| Slash command value | ACP agent |
|---------------------|-----------|
| `claude-code` | `claude` |
| `codex` | `codex` |
| `openclaw` | `openclaw` |
| `opencode` | `opencode` |
| `antigravity` | `antigravity` |
| `pi` | `pi` |

## Task Status Ownership

This command must not assume every delegated skill updates task status correctly. `dev-run` is therefore the workflow owner for status transitions.

### What the Underlying Skills Already Cover

| Skill | Documented task-file behavior |
|-------|-------------------------------|
| `rd3:request-intake` | Updates Background / Requirements / Constraints / preset |
| `rd3:task-decomposition` | Produces decomposition output, but relies on `rd3:tasks` to create real child task files |
| `rd3:code-implement-common` | Updates implementation progress, but status ownership is only implied in references |
| `rd3:sys-testing` | Assumes task is already in `testing`; does not clearly own status transitions |
| `rd3:code-verification` | Writes Review / Requirements verdicts; moves failures back to `wip`; PASS keeps current status |

### Required Status Rules for `dev-run`

| Workflow Moment | Required Status Action |
|-----------------|------------------------|
| Workflow starts on an executable task | Satisfy the pre-implementation guard first, then `tasks update <WBS> wip` |
| Refine runs | Keep current status unless task was still backlog/todo and already satisfies the `wip` guard, then move to `wip` |
| Plan decides to decompose into subtasks | Create child tasks first, keep parent non-terminal, and stop parent execution |
| Enter testing pass | Ensure `Plan` exists and `Design` is sufficient, then `tasks update <WBS> testing` |
| Test fails or further implementation is needed | Ensure the pre-implementation guard still holds, then `tasks update <WBS> wip` |
| Verification returns PARTIAL or FAIL | Ensure the pre-implementation guard still holds, then `tasks update <WBS> wip` |
| Verification returns PASS | Run completion guards first; only then `tasks update <WBS> done` |

### Status Principle

`done` must come from the workflow verdict, not from implementation alone.

That means:
- implementation completion is not enough
- passing tests are not enough
- `done` should only be set after the verification gate passes
- `done` must never be attempted until the task satisfies the current `rd3:tasks` completion requirements

### Completion Guards Before `done`

The current `rd3:tasks` CLI blocks `Done` unless `Background`, `Requirements`, `Solution`, `Design`, and `Plan` are populated.

Therefore `dev-run` must not call `tasks update <WBS> done` blindly.

Required behavior:

1. Check whether `Solution`, `Design`, and `Plan` are present enough for a valid `Done` transition
2. If `plan` was skipped earlier, synthesize minimal but real `Design` and `Plan` entries from the actual execution record before closing the task
3. Ensure the task records testing evidence in the `Testing` section before closure, even though the current `tasks` validator does not hard-block on that section
4. If those sections still cannot be populated honestly, do **not** force `Done`; leave the task in `Testing` or `WIP` and record what is missing

This keeps localized `simple` and `standard` tasks closable without lying about completed planning work.

Completion proof requires all of:
- verification verdict is `PASS`
- task satisfies `rd3:tasks` `Done` guards
- testing evidence exists in `Testing`
- no unresolved blocker remains
- delegated evidence has been written back to the local task file when delegation was used

## Direct Skill Mapping

```text
refine     -> Skill(skill="rd3:request-intake", args="--mode refine --task_ref <task-ref> [--auto]")
plan       -> targeted planning skill(s) as needed + Skill(skill="rd3:task-decomposition", args="<task-ref>")
implement  -> Skill(skill="rd3:code-implement-common", args="implement <resolved-task-file> --no-review")
test       -> Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
verify     -> Skill(skill="rd3:code-verification", args="--mode verify --task-ref <task-ref> --mode-verify full [--bdd true for complex] [--auto] [--channel <current|normalized-channel>]")
delegate   -> Skill(skill="rd3:run-acp", args="<normalized-channel> exec \"<phase-specific prompt>\"")
```

When delegation is used, both the direct ACP call and any delegated verify step should use the normalized ACP agent name, for example `claude` rather than `claude-code`.

### Delegated Prompt Contract

Delegated prompts must stay phase-specific and include the task reference.

Recommended prompt shapes:

**Plan**

```text
Plan task <task-ref>.
Determine whether decomposition is necessary.
If decomposition is necessary, produce batch-creation-compatible subtask JSON.
If decomposition is not necessary, provide concise Design and Plan content only.
Do not implement code.
```

**Implement**

```text
Implement task <task-ref>.
Read the task file first.
Use the current workspace by default unless explicit isolation has been requested for this run.
Make the required code changes.
Update the task's Solution section with the actual implementation approach.
Do not mark the task done.
```

**Verify**

```text
Verify task <task-ref> using rd3:code-verification semantics.
Run SECU review plus requirements traceability.
Write review findings back to the task file.
Return PASS, PARTIAL, or FAIL with concrete evidence.
```

These prompts are the default contract unless the caller has a task-specific reason to narrow them further.

If delegated work completes without updating the local task file, `dev-run` must reconcile the missing `Solution`, `Plan`, `Review`, or `Testing` artifacts locally before continuing.

## Examples

<example>
Run the default workflow
```bash
/rd3:dev-run 0274 --preset standard
```
</example>

<example>
Run a compact workflow for a localized change
```bash
/rd3:dev-run 0274 --preset simple
```
</example>

<example>
Run the full workflow for a larger task with delegated heavy reasoning
```bash
/rd3:dev-run 0274 --preset complex --channel codex --auto
```
</example>

<example>
Preview whether refine/plan will be included and how statuses will move
```bash
/rd3:dev-run 0274 --preset standard --dry-run
```
</example>

## Reliability Rules

- Prefer `standard` unless the task clearly fits `simple` or clearly requires `complex` / `research`
- Keep `docs` out of this workflow; use `/rd3:dev-docs` independently when needed
- Do not expose arbitrary phase selection through `--phases`
- Treat implementation and testing as a loop, not as isolated one-shot phases
- Stop parent execution when decomposition says the task should split into subtasks
- Let `dev-run` own task status transitions when the delegated skill does not

## See Also

- **/rd3:dev-refine**: Improve requirements before execution
- **/rd3:dev-unit**: Testing-focused path
- **/rd3:dev-verify**: Verification-only path
- **/rd3:dev-docs**: Documentation refresh as a separate command
- **rd3:code-implement-common**: Primary implementation skill
- **rd3:sys-testing**: Testing and coverage skill
- **rd3:code-verification**: Review + traceability skill
- **rd3:run-acp**: Explicit remote delegation wrapper

## Platform Notes

### Claude Code (primary)

Run the command directly and execute the resolved workflow with `Skill()` calls. Do not route through `rd3:orchestration-v2`.

### Other Platforms

Recreate the same workflow directly with the underlying skills or ACP prompts. The contract is:

1. optional refine
2. optional plan
3. implement ↔ test loop
4. verification gate
5. task status transitions owned by the workflow
