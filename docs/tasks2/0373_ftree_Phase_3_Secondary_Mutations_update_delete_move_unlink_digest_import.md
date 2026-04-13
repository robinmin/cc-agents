---
name: ftree Phase 3 Secondary Mutations — update delete move unlink digest import
description: ftree Phase 3 Secondary Mutations — update delete move unlink digest import
status: Done
created_at: 2026-04-10T05:28:38.699Z
updated_at: 2026-04-12T05:31:27.904Z
folder: docs/tasks2
type: task
dependencies: ["0371"]
preset: "standard"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0373. ftree Phase 3: Secondary Mutations — update, delete, move, unlink, digest, import

### Background

Phase 3 of ftree skill (task 0369). Adds less frequent mutation operations: status updates with state machine validation, delete with cascade protection, move with circular reference detection, unlink, digest (atomic link + status transition), and bulk import from JSON. These are secondary to the core add/link operations. Depends on Phase 1 (0371). Independent of Phase 2 (0372) — can run in parallel.

**Architecture:** Built on the `@gobing-ai/typescript-bun-starter` monorepo. Each command is a clipanion class in `apps/cli/src/commands/`. Mutation logic goes in `FeatureService` at `packages/core/src/services/feature-service.ts`.

### Requirements Mapping (Original → Starter Template Paths)

| Requirement | Original Path | Target Path (starter template) |
|---|---|---|
| **R5: Secondary Mutations (P2)** | | |
| R5.1 `ftree update <id>` | `scripts/commands/update.ts` | `apps/cli/src/commands/feature-update.ts` — uses `validateTransition()` from state-machine |
| R5.2 `ftree delete <id> [--force]` | `scripts/commands/delete.ts` | `apps/cli/src/commands/feature-delete.ts` — uses `FEATURE_SQL.hasChildren`, `FEATURE_SQL.hasWbsLinks` |
| R5.3 `ftree move <id> --parent` | `scripts/commands/move.ts` | `apps/cli/src/commands/feature-move.ts` — circular detection via CTE + depth recalculation |
| R5.4 `ftree unlink <id> --wbs` | `scripts/commands/unlink.ts` | `apps/cli/src/commands/feature-unlink.ts` |
| R5.5 `ftree digest <id> --wbs --status` | `scripts/commands/digest.ts` | `apps/cli/src/commands/feature-digest.ts` — atomic transaction via raw SQL |
| R5.6 `ftree import <file>` | `scripts/commands/import.ts` | `apps/cli/src/commands/feature-import.ts` — reuses `TemplateNode` type + `seedFromTemplate()` pattern |
| R8.5 Mutation tests | `tests/mutations.test.ts` | `packages/core/tests/services/feature-service-mutations.test.ts` |
| R8.6 Tree rendering tests | `tests/tree-rendering.test.ts` | Already covered by `packages/core/tests/lib/tree-utils.test.ts` (Phase 1) |

### Service Layer Additions

Add methods to `FeatureService`:
- `update(id, fields)` — validates status transition, updates fields
- `delete(id, force?)` — checks children/links, cascade or reject
- `move(id, newParentId)` — circular detection, depth recalc for subtree
- `unlinkWbs(featureId, wbsIds)` — delete specific WBS links
- `digest(featureId, wbsIds, targetStatus?)` — atomic: link WBS + transition status (default: executing)
- `importTree(nodes, parentId?)` — validate + bulk insert, reuse TemplateNode parsing

Raw SQL additions in `packages/core/src/lib/dao/sql.ts`:
- `UPDATE features SET ... WHERE id = ?`
- `DELETE FROM features WHERE id = ?`
- `DELETE FROM feature_wbs_links WHERE feature_id = ? AND wbs_id = ?`
- Circular detection CTE

### Plan

- [x] 3.1 Add mutation SQL to `packages/core/src/lib/dao/sql.ts`
- [x] 3.2 Add update/delete/move/unlink/digest/import methods to `FeatureService`
- [x] 3.3 Create `apps/cli/src/commands/feature-update.ts`
- [x] 3.4 Create `apps/cli/src/commands/feature-delete.ts`
- [x] 3.5 Create `apps/cli/src/commands/feature-move.ts`
- [x] 3.6 Create `apps/cli/src/commands/feature-unlink.ts`
- [x] 3.7 Create `apps/cli/src/commands/feature-digest.ts`
- [x] 3.8 Create `apps/cli/src/commands/feature-import.ts`
- [x] 3.9 Register commands in `apps/cli/src/index.ts`
- [x] 3.10 Write mutation tests (41 tests in feature-service-mutations.test.ts)
- [x] 3.11 Verify `bun run check` passes (4429 tests, 0 failures)

### Review

Code review completed 2026-04-13. All new files reviewed.

**Findings:**
- 6 new CLI commands follow existing clipanion pattern
- 6 new service methods leverage existing infrastructure (state machine, recursive CTEs)
- State machine validation enforced correctly in `update` and `digest`
- Circular reference detection uses ancestor CTE — solid approach
- Delete uses CASCADE FK + explicit WBS link cleanup for force mode
- Depth recalculation done in TypeScript for moved subtrees
- `importTree` reuses `seedFromTemplate` pattern — minimal code duplication

### Testing

- 41 new tests in `packages/core/tests/services/feature-service-mutations.test.ts`
- update: 6 tests (title, status, metadata, all fields, invalid transition, not found)
- remove: 6 tests (leaf, with children no force, with children force, with links, force with links, not found)
- move: 5 tests (new parent, to root, circular, not found, target not found)
- unlinkWbs: 3 tests (removes links, missing links, remaining intact)
- digest: 4 tests (atomic link+transition, invalid transition, default status, not found)
- importTree: 8 tests (basic, nested, under parent, depth calc, empty, count, status default)
- Coverage: 99.67% functions, 99.40% lines



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| impl | `packages/core/src/lib/dao/sql.ts` — mutation SQL constants | pi | 2026-04-13 |
| impl | `packages/core/src/services/feature-service.ts` — update, remove, move, unlinkWbs, digest, importTree | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-update.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-delete.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-move.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-unlink.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-digest.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-import.ts` | pi | 2026-04-13 |
| test | `packages/core/tests/services/feature-service-mutations.test.ts` — 41 tests | pi | 2026-04-13 |
| check | `bun run check` passes globally (4429 tests, 0 failures) | pi | 2026-04-13 |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
- [task 0371](docs/tasks2/0371_ftree_Phase_1_Core_Operations_init_add_link_ls_templates.md)
- Existing command pattern: `apps/cli/src/commands/feature-add.ts`
- State machine: `packages/core/src/lib/state-machine.ts`
- SQL constants: `packages/core/src/lib/dao/sql.ts`
- FeatureService: `packages/core/src/services/feature-service.ts`
