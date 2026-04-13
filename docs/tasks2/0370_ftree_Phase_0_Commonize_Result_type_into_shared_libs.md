---
name: ftree Phase 0 Commonize Result type into shared libs
description: ftree Phase 0 Commonize Result type into shared libs
status: Done
created_at: 2026-04-10T05:28:12.542Z
updated_at: 2026-04-12T05:28:12.542Z
folder: docs/tasks2
type: task
preset: "standard"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0370. ftree Phase 0: Commonize Result type into shared libs

### Background

Phase 0 of ftree skill (task 0369). The Result type (Ok<T>/Err<E>) originally lived in `plugins/rd3/skills/tasks/scripts/lib/result.ts` but was imported cross-skill by orchestration-v1. Moved to `plugins/rd3/scripts/libs/result.ts` as a first-class shared utility.

**Note on starter template:** The feature-tree skill now inherits from `@gobing-ai/typescript-bun-starter`, which defines its own Result type at `packages/core/src/types/result.ts` using the shape `{ ok: true; data: T } | { ok: false; error: E }`. This is intentionally different from the rd3 shared Result (`{ ok: true; value: T } | { ok: false; error: E }`) because the starter template is designed as a standalone monorepo. The two Result types are independent — the feature-tree uses its own, while rd3 plugins continue using the shared one.


### Requirements

R11.2 from task 0369. Copy result.ts to `plugins/rd3/scripts/libs/result.ts`. Update all imports in tasks skill and orchestration-v1 to use the shared location. Delete the old file at `tasks/scripts/lib/result.ts`. Verify `bun run check` passes. Zero regressions.

The feature-tree starter template has its own `Result<T, E>` at `plugins/rd3/skills/feature-tree/scripts/packages/core/src/types/result.ts` — this is correct and independent.


### Q&A

**Q: Why does feature-tree have a different Result type?**
A: The starter template ships its own `{ ok: true; data: T }` Result type. Keeping it separate maintains starter template independence — it can be extracted or upgraded without affecting rd3 shared libs. The rd3 shared Result uses `{ ok: true; value: T }` which is the convention across all other rd3 plugins.


### Design

1. Move rd3's shared `Result` to `plugins/rd3/scripts/libs/result.ts` (shape: `{ ok: true; value: T }`)
2. Feature-tree uses its own `Result` at `packages/core/src/types/result.ts` (shape: `{ ok: true; data: T }`)
3. Both coexist without conflict — feature-tree is a standalone workspace monorepo


### Solution

Copied `result.ts` to `plugins/rd3/scripts/libs/result.ts`. Updated 21 import statements across 20 files (11 commands, 2 lib files, 1 server, 1 orchestration-v1, 5 tests, 1 tasks.ts). Deleted original file at `plugins/rd3/skills/tasks/scripts/lib/result.ts`. All paths verified.

### Plan

1. Copy `result.ts` → `plugins/rd3/scripts/libs/result.ts`
2. Update imports: commands, scripts, tests, orchestration-v1 to use shared path
3. Delete old file
4. Verify `bun run check` passes

### Review

All 4225 tests pass. Lint clean. Typecheck clean. Coverage on result.ts: 100% lines, 100% funcs.

### Testing

`bun run check` — lint + typecheck + 4225 tests, 0 failures.

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
- rd3 shared Result: `plugins/rd3/scripts/libs/result.ts`
- Feature-tree Result: `plugins/rd3/skills/feature-tree/scripts/packages/core/src/types/result.ts`
