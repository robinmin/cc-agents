---
name: fix task profile persistence for orchestration
description: fix task profile persistence for orchestration
status: Done
created_at: 2026-03-28T18:20:21.265Z
updated_at: 2026-03-28T20:08:57.734Z
folder: docs/tasks2
type: task
priority: "high"
estimated_hours: 3
tags: ["tasks","profile","request-intake","orchestration"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0278. fix task profile persistence for orchestration

### Background

Task 0275 identified that profile-driven orchestration is not reliable because the shared task substrate does not consistently parse or update frontmatter profile values. Request-intake and orchestration both depend on that field behaving like real frontmatter, not like a markdown section.


### Requirements

Update the shared tasks substrate so profile is parsed from frontmatter and can be updated through a frontmatter-aware write path. Remove or replace any documented workflow that tries to update profile via section writes. Ensure request-intake and orchestration consume the shared implementation rather than ad hoc parsing. Add tests covering read, write, and backward-compatible behavior for tasks without a profile field.


### Q&A



### Design

Fixed the shared task substrate so `profile` behaves like real frontmatter. `taskFile.ts` now parses and updates profile values in frontmatter, and the tasks CLI supports `tasks update <WBS> --field profile --value <profile>` for orchestration-safe writes.



### Solution

Extend task frontmatter parsing and task update capabilities to support profile explicitly. Then update request-intake and orchestration references to use the corrected persistence path and add tests around undefined-profile fallback.


### Plan

1. Extended task-file parsing to read optional `profile` frontmatter.
2. Added frontmatter-aware profile writes in the task library and CLI.
3. Updated request-intake/orchestration references to use the shared frontmatter path.



### Review

Reviewed against the original task-substrate gap: profile reads and writes now flow through the shared tasks implementation instead of ad hoc parsing or section writes.



### Testing

Validated with `bun run typecheck` and `bun test plugins/rd3/skills/tasks/tests/taskFile.test.ts plugins/rd3/skills/tasks/tests/cli-contract.test.ts`.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


