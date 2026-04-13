---
name: ftree Phase 2 Read-Only Queries — context wbs check-done export
description: ftree Phase 2 Read-Only Queries — context wbs check-done export
status: Done
created_at: 2026-04-10T05:28:28.682Z
updated_at: 2026-04-12T05:31:23.580Z
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

## 0372. ftree Phase 2: Read-Only Queries — context, wbs, check-done, export

### Background

Phase 2 of ftree skill (task 0369). Adds read-only query commands on top of the tree built by core ops in Phase 1. These commands do not mutate data — they provide agent-optimized views (context brief/full), WBS link listing, done eligibility checks, and JSON export. Depends on Phase 1 (0371).

**Architecture:** Built on the `@gobing-ai/typescript-bun-starter` monorepo. Each new command is a clipanion class in `apps/cli/src/commands/`, calling `FeatureService` from `packages/core/`. The `ContextView` type already exists at `packages/core/src/types/feature.ts`.

### Requirements Mapping (Original → Starter Template Paths)

| Requirement | Original Path | Target Path (starter template) |
|---|---|---|
| **R4: Read-Only Queries (P1)** | | |
| R4.1 `ftree context <id>` | `scripts/commands/context.ts` | `apps/cli/src/commands/feature-context.ts` — clipanion Command class |
| R4.2 `ftree wbs <id>` | `scripts/commands/wbs.ts` | `apps/cli/src/commands/feature-wbs.ts` |
| R4.3 `ftree check-done <id>` | `scripts/commands/check-done.ts` | `apps/cli/src/commands/feature-check-done.ts` |
| R4.4 `ftree export` | `scripts/commands/export.ts` | `apps/cli/src/commands/feature-export.ts` |
| R8.4 Query tests | `tests/queries.test.ts` | `packages/core/tests/commands/queries.test.ts` or `packages/core/tests/services/feature-service-queries.test.ts` |

### Implementation Pattern

Each command follows the pattern established by existing commands (feature-init, feature-add, feature-link, feature-list):

```typescript
// apps/cli/src/commands/feature-context.ts
import { createDbAdapter, FeatureService, initSchema } from '@ftree/core';
import { Command, Option } from 'clipanion';

export class FeatureContextCommand extends Command {
    static paths = [['context']];
    featureId = Option.String({ name: 'feature-id', required: true });
    format = Option.String('--format', { required: false });  // brief|full
    // ...
    async execute() {
        const adapter = await createDbAdapter({ driver: 'bun-sqlite', url: resolve(dbPath) });
        try { /* ... */ return 0; } finally { adapter.close(); }
    }
}
```

Register in `apps/cli/src/index.ts`.

### Service Layer Additions

Add methods to `FeatureService` in `packages/core/src/services/feature-service.ts`:
- `getContext(id, format)` — build ContextView with node, parent, children, linked WBS
- `checkDone(id)` — verify all children done, return reasons if not
- `exportSubtree(rootId?)` — JSON export of subtree

Leverage existing methods: `getSubtree()`, `getChildren()`, `getWbsIds()`, `buildWbsMap()`.

### Plan

- [x] 2.1 Add context/wbs/check-done/export methods to `FeatureService`
- [x] 2.2 Create `apps/cli/src/commands/feature-context.ts`
- [x] 2.3 Create `apps/cli/src/commands/feature-wbs.ts`
- [x] 2.4 Create `apps/cli/src/commands/feature-check-done.ts`
- [x] 2.5 Create `apps/cli/src/commands/feature-export.ts`
- [x] 2.6 Register commands in `apps/cli/src/index.ts`
- [x] 2.7 Write tests for query operations (17 tests in feature-service-queries.test.ts)
- [x] 2.8 Verify `bun run check` passes (4388 tests, 0 failures)

### Review

Code review completed 2026-04-13. All new files reviewed.

**Findings:**
- 4 new CLI commands follow existing clipanion pattern consistently
- 3 new service methods (getContext, checkDone, exportTree) leverage existing methods well
- DoneCheckResult type added to types/feature.ts and exported from barrel
- Clean separation: service layer does logic, CLI handles I/O
- Exit codes consistent: 0 success, 1 validation/not-found, 2 internal

### Testing

- 17 new tests in `packages/core/tests/services/feature-service-queries.test.ts`
- getContext: 5 tests (not-found, root without parent, child with parent, with children, with WBS)
- checkDone: 5 tests (not-found, leaf eligible, all-done eligible, non-done children, blocked children)
- exportTree: 7 tests (empty tree, full tree, subtree, not-found root, WBS links, metadata)
- Coverage: 99.52% functions, 99.26% lines



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| impl | `packages/core/src/services/feature-service.ts` — getContext, checkDone, exportTree | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-context.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-wbs.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-check-done.ts` | pi | 2026-04-13 |
| impl | `apps/cli/src/commands/feature-export.ts` | pi | 2026-04-13 |
| type | `packages/core/src/types/feature.ts` — DoneCheckResult | pi | 2026-04-13 |
| test | `packages/core/tests/services/feature-service-queries.test.ts` — 17 tests | pi | 2026-04-13 |
| check | `bun run check` passes globally (4388 tests, 0 failures) | pi | 2026-04-13 |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
- [task 0371](docs/tasks2/0371_ftree_Phase_1_Core_Operations_init_add_link_ls_templates.md)
- Existing command pattern: `apps/cli/src/commands/feature-list.ts`
- ContextView type: `packages/core/src/types/feature.ts`
- FeatureService: `packages/core/src/services/feature-service.ts`
