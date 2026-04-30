---
name: workflow
description: "Extracted section: Workflow"
see_also:
  - rd3:task-runner
---

# Workflow

The workflow executes as a sequence of stages. Each stage delegates to a stable skill or runs a deterministic script; status transitions are owned by `task-runner`, not delegated.

```
Stage 0:    Preflight (always)
Stage 0.5:  Pre-flight Verify  ← when --preflight-verify or --verify
Stage 1:    Optional Refine
Stage 2:    Optional Plan + Decomposition
            └─ EXIT POINT for --stage plan-only
Stage 3:    Implement ↔ Test Loop (bounded)
            └─ SKIPPED upstream for --stage implement-only
Stage 4:    Verification Gate
Stage 5:    Post-flight Verify  ← default-on; opt out with --no-postflight-verify
Final:      Mandatory subset gate (always) → tasks update <WBS> done (guarded)
```

### Stage 0: Preflight

1. Resolve `task-ref`
2. Read task file
3. Determine preset
4. Check if task is single or should fork into decomposition
5. Check if current workspace is acceptable for local implementation
6. Resolve execution channel (default: `current`; delegate only if `--channel` provided)
7. Build stage plan (refine? plan? implement/test? verify? pre/post-flight?)
8. If `--dry-run`: invoke `scripts/dry-run-output.ts` with resolved state and exit

**Preflight must answer:**
- Will `refine` run?
- Will `plan` run?
- Will the task fork into subtasks?
- Will implementation stay local or use explicit isolation?
- Will execution stay local or delegate?

### Stage 0.5: Pre-flight Verify (Optional)

Active when `--preflight-verify` or `--verify` is set.

Purpose: ensure the task file is structurally runnable before execution starts. This is a **lightweight structural gate**, not full SECU review — use the dedicated verification skill for that.

**LLM-mediated — no script.** Stage 0.5 is executed by the agent (LLM), not by a deterministic script. The contract below defines what triggers which path.

| Condition | Path |
|-----------|------|
| `tasks check <WBS>` exits 0 | Proceed to Stage 1 |
| Missing Background / Requirements / acceptance criteria | Attempt auto-backfill using guards helper (see `references/status-transitions.md`) |
| `complex` or `research` preset with weak sections | Route to `rd3:request-intake --mode refine` (auto-backfill not sufficient) |
| Validation still fails after backfill/refine + `--auto` | Halt with actionable error listing failed checks |
| Validation still fails after backfill/refine, no `--auto` | Prompt user with remediation options |

See `references/status-transitions.md` for guard details and backfill templates.

### Stage 1: Optional Refine

```text
Skill(skill="rd3:request-intake", args="--mode refine --task_ref <task-ref> [--auto]")
```

Purpose: tighten ambiguous requirements, improve acceptance criteria, ensure task is executable.

### Stage 2: Optional Plan + Decomposition

1. Use specialist planning/design skills as needed (e.g., `rd3:backend-architect`, `rd3:frontend-architect`, `rd3:pl-typescript`)
2. Finish with:

```text
Skill(skill="rd3:task-decomposition", args="<task-ref>")
```

**Note:** When `rd3:task-decomposition` emits a structured decomposition output, use the `structured-output-protocol` invocation pattern — pass the decomposition JSON directly to the child-creation step rather than re-parsing the human-readable summary. See `rd3:task-decomposition` SKILL.md for the structured output contract.

**`rd3:task-decomposition` is analysis-only.** It does NOT create child task files. If decomposition is required, `task-runner` must create children through `rd3:tasks` before stopping parent execution.

See `references/decomposition-handoff.md` for full handoff contract, batch JSON paths, and parent-status rules.

**Exit point for `--stage plan-only`:** After Stage 2, emit stage exit JSON envelope and stop. Parent task remains non-terminal.

### Stage 3: Implement ↔ Test Loop

With `--stage implement-only`, Stages 1-2 are skipped and execution enters this loop directly. Design and Plan sections must already be present in the task file.

**Loop body:**

1. Apply pre-implementation guard (see `references/status-transitions.md`), then `tasks update <WBS> wip`
2. Execute implementation with default review handoff disabled:

```text
Skill(skill="rd3:code-implement-common", args="implement <resolved-task-file> --no-review")
```

3. Before testing: ensure `Plan` + `Design` sufficient
4. `tasks update <WBS> testing`
5. Execute testing:

```text
Skill(skill="rd3:sys-testing", args="<task-ref> [--coverage <n>]")
```

6. Write testing evidence back to task file (see `references/status-transitions.md` Minimum Testing Structure)
7. If tests fail, coverage misses, or requirements not met → back to step 1
**Pre-testing guard:** Before `tasks update <WBS> testing`, run `tasks check <WBS>`. If it returns non-zero, backfill missing sections (see `references/status-transitions.md` Minimum Structures) before retrying the transition. Do not use `--force` as a substitute for honest backfill.

8. **Loop exit:** all of below true:
   - implementation present
   - tests pass
   - coverage met or explicitly accepted
   - no unresolved blocker
   - task can transition to `Testing` without `--force`

See `references/delegated-prompts.md` for the full prompt contract for each delegated stage.

**Iteration cap:** `--max-loop-iterations <n>` (default `3`). On exhaustion:
- keep status `wip`
- document blocker in task file
- switch to `rd3:sys-debugging` with `blocked` state

### Stage 4: Verification Gate

```text
Skill(skill="rd3:code-verification", args="--mode verify --task-ref <task-ref> --mode-verify full [--bdd] [--auto] [--force] [--channel <current|normalized-channel>]")
```

**Note:** `--force` is passed through when the task-runner itself is invoked with `--force`, allowing re-verification of tasks that have already transitioned to `Done`.

Purpose: SECU review + requirements traceability + go/no-go signal before `done`.

**Artifacts required:** `Review` section updated, traceability written, verdict `PASS`/`PARTIAL`/`FAIL`.

### Stage 5: Post-flight Verify (Default-on)

Active by default. Skip with `--no-postflight-verify`. The mandatory subset (Final stage) still runs even when this stage is skipped.

1. Invoke `scripts/postflight-check.ts <WBS> [--coverage <n>] [--start-commit <sha>] [--delegation-used] [--preset <preset>]`
   - Pass `--coverage` when `--coverage <n>` was supplied to `task-runner`
   - Pass `--delegation-used` when any stage ran via `--channel` other than `current`
2. Parse verdict JSON from stdout
3. If `verdict === "PASS"` (exit code 0): proceed to `done`
4. If `verdict === "BLOCKED"` (exit code 1):
   - write `## Completion Blockers` section to task file listing each entry from `blockers[]`
   - keep task in `Testing`
   - do NOT transition to `Done`
   - exit non-zero if `--auto`
5. If the script errors (exit code 2):
   - treat as script failure, not verdict
   - keep task in `Testing`
   - surface stderr to user and halt

See `references/postflight-checks.md` for the seven-check catalog and `PostflightVerdict` schema.

### Final: Transition to `done`

1. **Run mandatory pre-`done` checks (always, regardless of flags):**

   ```text
   bun plugins/rd3/skills/task-runner/scripts/postflight-check.ts <WBS> --mandatory-only [--start-commit <sha>] [--preset <preset>]
   ```

   This runs the always-on subset of `postflight-check.ts` (3 cheap checks):
   - **task-sections-populated** — `tasks check <WBS>` ok
   - **verification-verdict-pass** — `## Review` contains `PASS` (not `PARTIAL`/`FAIL`)
   - **code-changes-exist** — `git diff <start-commit>..HEAD` non-empty (skipped for `research` preset)

   Exit code 0 = PASS, 1 = BLOCKED. On BLOCKED:
   - Write a `## Completion Blockers` section to the task file (same template as Stage 5)
   - Keep task in `Testing`; do NOT transition to `Done`
   - Surface verdict JSON to operator

2. Apply completion guards (see `references/status-transitions.md`), then `tasks update <WBS> done`.

**`done` requires ALL of:**
- verification verdict is `PASS`
- task satisfies `rd3:tasks` `Done` guards
- testing evidence exists in `Testing`
- no unresolved blocker
- delegated evidence reconciled locally
- mandatory pre-`done` subset passed (always-on)
- post-flight full audit passed (if `--postflight-verify` enabled)
