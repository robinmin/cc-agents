# rd3:tasks Workflow Operations

Canonical lifecycle operations for task files. These workflows define the expected bundle of
`tasks` commands so section content, `impl_progress`, and frontmatter `status` stay aligned.

## Rule

When one of the lifecycle operations below applies, do not update only a section or only a phase.
Run the full command bundle for that operation.

Low-level primitives such as:

- `tasks update <wbs> --section ...`
- `tasks update <wbs> --phase ...`
- `tasks update <wbs> <status>`

are building blocks, not the preferred lifecycle interface.

## Operation Summary

| Operation | Purpose | Sections to Update | Phase Target | Status Target |
|-----------|---------|--------------------|--------------|---------------|
| `create` | Create a new task with usable context | `Background`, `Requirements` | all `pending` | `Backlog` |
| `planning` | Record clarifications and scope decisions | `Q&A` | `planning: completed` | `Todo` |
| `design` | Record the intended technical or UX approach | `Design` | `design: completed` | `Todo` |
| `implementation` | Record implementation approach and active work | `Solution`, `Plan`, `Artifacts` | `implementation: completed` | `WIP` |
| `review` | Record review findings and follow-up assessment | `Review` | `review: completed` | `Testing` |
| `testing` | Record verification evidence and completion | `Testing`, `Artifacts`, `References` | `testing: completed` | `Done` |

## 1. Create

Use when creating a new task.

Expected outcome:

- `Background` is populated
- `Requirements` is populated
- `status` remains `Backlog`
- all `impl_progress` phases remain `pending`

Command:

```bash
tasks create "Implement feature X" \
  --background "Context and motivation" \
  --requirements $'- Requirement 1\n- Requirement 2'
```

Do not immediately move a newly created task to `WIP`.

## 2. Planning

Use when clarifications have been gathered and the task is ready to leave backlog.

Expected outcome:

- `Q&A` is updated
- `planning` becomes `completed`
- `status` becomes `Todo`

Commands:

```bash
tasks update 0047 --section Q&A --from-file /tmp/qa.md
tasks update 0047 --phase planning --phase-status completed
tasks update 0047 todo
```

## 3. Design

Use when the intended approach is documented and the task remains queued for implementation.

Expected outcome:

- `Design` is updated
- `design` becomes `completed`
- `status` remains `Todo`

Commands:

```bash
tasks update 0047 --section Design --from-file /tmp/design.md
tasks update 0047 --phase design --phase-status completed
tasks update 0047 todo
```

## 4. Implementation

Use when the solution and execution plan are documented and active implementation work is underway
or has just completed.

Expected outcome:

- `Solution` is updated
- `Plan` is updated
- implementation artifacts are stored or recorded as needed
- `implementation` becomes `completed`
- `status` becomes `WIP`

Commands:

```bash
tasks update 0047 --section Solution --from-file /tmp/solution.md
tasks update 0047 --section Plan --from-file /tmp/plan.md
tasks put 0047 /tmp/implementation-notes.txt --name implementation-notes.txt
tasks update 0047 --phase implementation --phase-status completed
tasks update 0047 wip
```

If implementation has started but the solution and plan are not yet documented, document them first.

## 5. Review

Use when implementation is ready for structured review and review findings need to be captured.

Expected outcome:

- `Review` is updated
- `review` becomes `completed`
- `status` becomes `Testing`

Commands:

```bash
tasks update 0047 --section Review --from-file /tmp/review.md
tasks update 0047 --phase review --phase-status completed
tasks update 0047 testing
```

Review findings should capture:

- confirmed issues or regressions
- residual risks
- approval or follow-up requirements

## 6. Testing

Use when verification is complete and the task can be closed.

Expected outcome:

- `Testing` is updated
- verification artifacts are stored if needed
- `References` is updated if external evidence or related docs were used
- `testing` becomes `completed`
- `status` becomes `Done`

Commands:

```bash
tasks update 0047 --section Testing --from-file /tmp/testing.md
tasks put 0047 /tmp/test-output.txt --name test-output.txt
tasks update 0047 --section References --from-file /tmp/references.md
tasks update 0047 --phase testing --phase-status completed
tasks update 0047 done
```

Testing notes should capture:

- commands executed
- pass/fail result
- known gaps if verification was partial

## Notes

- `Todo` is the holding state for tasks that are clarified and designed but not yet being actively
  implemented.
- `WIP` is the active implementation state.
- `Testing` is the review-and-verification state.
- `Done` is reserved for tasks with recorded testing evidence.
- `Blocked` is orthogonal to these operations. Use it when work cannot continue, but do not treat it
  as a replacement for any lifecycle operation above.
