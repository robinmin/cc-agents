---
name: ftree Phase 3 Secondary Mutations — update delete move unlink digest import
description: ftree Phase 3 Secondary Mutations — update delete move unlink digest import
status: Backlog
created_at: 2026-04-10T05:28:38.699Z
updated_at: 2026-04-10T05:28:38.699Z
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

## 0373. ftree Phase 3: Secondary Mutations — update, delete, move, unlink, digest, import

### Background

Phase 3 of ftree skill (task 0369). Adds less frequent mutation operations: status updates with state machine validation, delete with cascade protection, move with circular reference detection, unlink, digest (atomic link + status transition), and bulk import from JSON. These are secondary to the core add/link operations. Depends on Phase 1 (0371). Independent of Phase 2 (0372) — can run in parallel.


### Requirements

From task 0369 — R5 (Secondary Mutations P2). Create: scripts/commands/update.ts (validates status transition per R2.2), scripts/commands/delete.ts (--force for cascade), scripts/commands/move.ts (circular reference detection, depth recalculation), scripts/commands/unlink.ts (silent on missing), scripts/commands/digest.ts (atomic transaction, rollback on failure, default status executing), scripts/commands/import.ts (validates structure before write, upserts by title-path). Write tests/mutations.test.ts — update status transitions, delete cascade, move circular detection, unlink, digest atomic, import round-trip. Write tests/tree-rendering.test.ts — Unicode rendering, roll-up accuracy, depth limits. bun run check must pass.


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
