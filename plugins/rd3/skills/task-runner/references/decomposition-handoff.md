# Decomposition Handoff Contract

Required sequence when Stage 2 decides the task should split into subtasks.

## Handoff Sequence

1. Run `rd3:task-decomposition` to produce the breakdown
2. Materialize child tasks through `rd3:tasks`
3. Write the child task links into the parent `Solution` section
4. Keep the parent task non-terminal (`Todo` or `WIP`, whichever is appropriate)
5. Stop parent execution and continue implementation through the child tasks

This avoids the current false-completion problem in `rd3:tasks`.

## Child Task Creation Contract

`task-runner` must use one of these two concrete paths.

### Path A — Batch Create from JSON

1. Ask `rd3:task-decomposition` for batch-creation-compatible JSON using the `structured-output-protocol`
2. Save the JSON to a temp file
3. Run:

```bash
tasks batch-create --from-json /tmp/decomposition.json
```

### Path B — Create Tasks One by One

Use `tasks create` for each decomposed subtask with at least:

```bash
tasks create "<task name>" \
  --background "<subtask background>" \
  --requirements "<subtask requirements>" \
  --feature-id "<feature id if available>" \
  --preset "<preset if known>"
```

## Batch JSON Structure

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

`task-runner` should prefer batch creation when the decomposition output is already machine-structured.

Do not rely on `parent_wbs` in the batch payload. The current `tasks batch-create` contract does not consume that field. If parent linkage must be preserved, keep it in the parent task's decomposition record and/or add it explicitly after creation using the supported task-file workflow.

After child creation, the parent task becomes a handoff container, not an execution target.

## Parent Task Status Contract

**Upstream invariant (post-PR4):** `tasks update <WBS> decomposed` does NOT normalize to `Done`. Parent task stays in `WIP` after decomposition.

**Rules:**
- Parent task: stays in `WIP` after decomposition handoff
- Parent's `Solution` section: includes a `## Decomposition` subsection linking child WBS numbers
- Parent → `Done` transition: **manual** in v1 (operator decides when all children warrant parent closure)
- Automated enforcement of "all children done before parent done": deferred; not implemented in v1

**Parent Decomposition Section Template:**

```markdown
### Decomposition

Task split into the following child tasks on <date>:

- [0274.01](./0274.01_child_name.md) — Child task description
- [0274.02](./0274.02_child_name.md) — Child task description

Parent task remains in `WIP`; execution handed off to children.
```

## Stage Exit JSON Envelope

When `--stage plan-only` exits after decomposition, emit this JSON to stdout for CI/scheduler consumption:

```json
{
  "stage_completed": "plan-only",
  "decomposed": true,
  "child_wbs": ["0274.01", "0274.02"],
  "parent_wbs": "0274",
  "next_recommended_stage": "implement-only",
  "task_status": "WIP"
}
```

If decomposition did not occur (single-task plan):

```json
{
  "stage_completed": "plan-only",
  "decomposed": false,
  "child_wbs": [],
  "parent_wbs": "0274",
  "next_recommended_stage": "implement-only",
  "task_status": "Todo"
}
```
