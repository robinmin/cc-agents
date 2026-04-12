---
name: ftree Phase 2 Read-Only Queries — context wbs check-done export
description: ftree Phase 2 Read-Only Queries — context wbs check-done export
status: Canceled
created_at: 2026-04-10T05:28:28.682Z
updated_at: 2026-04-12T05:31:23.580Z
folder: docs/tasks2
type: task
dependencies: ["0371"]
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0372. ftree Phase 2: Read-Only Queries — context, wbs, check-done, export

### Background

Phase 2 of ftree skill (task 0369). Adds read-only query commands on top of the tree built by core ops in Phase 1. These commands do not mutate data — they provide agent-optimized views (context brief/full), WBS link listing, done eligibility checks, and JSON export. Depends on Phase 1 (0371).


### Requirements

From task 0369 — R4 (Read-Only Queries P1). Create: scripts/commands/context.ts (--format brief|full, always JSON), scripts/commands/wbs.ts (list linked WBS IDs one per line), scripts/commands/check-done.ts (exit 0 if eligible, exit 1 with reasons to STDERR), scripts/commands/export.ts (JSON to STDOUT or --output file). Write tests/queries.test.ts — context brief/full output, wbs listing, check-done with various child states, export round-trip. bun run check must pass.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
