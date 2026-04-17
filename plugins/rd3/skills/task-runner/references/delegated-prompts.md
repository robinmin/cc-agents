# Delegated Prompt Contracts

Phase-specific prompt templates for when `task-runner` delegates work via `rd3:run-acp`.

## Contract Principle

Delegated prompts must stay **phase-specific** and **include the task reference**. They must not mutate status (that's owned by `task-runner`), and must produce artifacts that `task-runner` can reconcile into the local task file.

## Plan Prompt

```text
Plan task <task-ref>.
Determine whether decomposition is necessary.
If decomposition is necessary, produce batch-creation-compatible subtask JSON.
If decomposition is not necessary, provide concise Design and Plan content only.
Do not implement code.
```

**Expected artifacts returned:**
- If decomposing: batch-creation JSON (see `decomposition-handoff.md`)
- If not: `Design` section content + `Plan` section content

## Implement Prompt

```text
Implement task <task-ref>.
Read the task file first.
Use the current workspace by default unless explicit isolation has been requested for this run.
Make the required code changes.
Update the task's Solution section with the actual implementation approach.
Do not mark the task done.
```

**Expected artifacts returned:**
- Code changes in workspace
- Updated `Solution` section reflecting actual implementation

## Verify Prompt

```text
Verify task <task-ref> using rd3:code-verification semantics.
Run SECU review plus requirements traceability.
Write review findings back to the task file.
Return PASS, PARTIAL, or FAIL with concrete evidence.
```

**Expected artifacts returned:**
- Updated `Review` section
- Verdict: `PASS`, `PARTIAL`, or `FAIL`
- Requirements traceability entries

## Reconciliation Requirement

If delegated work completes without updating the local task file, `task-runner` must reconcile the missing `Solution`, `Plan`, `Review`, or `Testing` artifacts locally before continuing.

## Dogfood Rule

When editing `rd3:run-acp` or `rd3:code-verification` through this workflow, force `--channel current` to avoid circular delegation.
