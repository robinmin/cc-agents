---
name: ftree Phase 1 Core Operations — init add link ls templates
description: ftree Phase 1 Core Operations — init add link ls templates
status: Canceled
created_at: 2026-04-10T05:28:21.908Z
updated_at: 2026-04-12T05:31:18.610Z
folder: docs/tasks2
type: task
dependencies: ["0370"]
preset: "standard"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0371. ftree Phase 1: Core Operations — init, add, link, ls, templates

### Background

Phase 1 of ftree skill (task 0369). This is the minimum viable skill — after this phase, agents can build feature trees and link WBS. Implements the two core atomic operations (add leaf node, link node to WBS IDs) plus init with template support and ls for verification. Builds the full foundation: types, state machine, DAO layer, db connection factory, CLI entry point, tree rendering, and 3 built-in project templates (web-app, cli-tool, api-service). Depends on Phase 0 (0370) completing first — Result type must be in shared libs.


### Requirements

From task 0369 — R1 (Database Layer), R2 (State Machine), R3 (Core Operations P0), R6 (Project Templates), R7 (Output Format), R11 (Shared Library Reuse). Create: scripts/types.ts, scripts/lib/state-machine.ts, scripts/dao/sql.ts, scripts/dao/parsers.ts, scripts/db.ts, scripts/ftree.ts (CLI entry with parseCli()), scripts/commands/init.ts (with --template), scripts/commands/add.ts, scripts/commands/link.ts, scripts/utils.ts (tree rendering + roll-up), scripts/commands/ls.ts, templates/web-app.json, templates/cli-tool.json, templates/api-service.json. Write tests: tests/db.test.ts, tests/core-ops.test.ts, tests/state-machine.test.ts. Register ftree bin in plugins/rd3/package.json. bun run check must pass.


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
