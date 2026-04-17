# Task 0386 — Improvement Decisions (Part C)

| Item | Decision | Rationale |
|------|----------|-----------|
| C1 — Unify config mode | **Implemented** | Completed during Phase 1/B6. Legacy fallback branch removed. |
| C2 — Centralize validation | **Deferred** | WBS validation now exists in put.ts and open.ts. Extracting to `lib/validation.ts` is a worthwhile refactor but adds scope. Separate task recommended. |
| C3 — profile→preset migration | **Deferred** | B8 stopped dual-write on read. Existing task files with `profile:` still parse correctly. A `refresh --normalize-frontmatter` command is nice-to-have but not urgent. |
| C4 — Collapse frontmatter helpers | **Deferred** | `updateFrontmatterField` and `updatePresetFrontmatterField` serve distinct purposes. Merging with a `drop: string[]` option adds complexity without clear benefit. |
| C5 — resetConfigCache | **Deferred** | No-op stub used by 3 test files for cache reset between tests. No actual caching exists to reset. Removing would require test updates for zero functional gain. |
| C6 — check --target flag | **Deferred** | New functionality, not a bug fix. B2's `validateTaskContent` already addresses the core issue. |
| C7 — Extract path safety | **Implemented** | `lib/path.ts` with `isPathWithinRoot` already exists and is functional. |
| C8 — bun:fs migration | **Deferred** | 22 source files use `node:fs`. Migrating file-by-file is low risk but high volume. Separate incremental task recommended. |
| C9 — Split dispatcher | **Deferred** | 851 LOC in tasks.ts. Splitting into per-command `argParse` functions is a significant refactor. Separate task recommended. |
| C10 — Structured logging | **Deferred** | Server logs in plain text. JSON log mode only useful when consumed by external tools. No current consumers. |

**Summary**: 2 implemented (C1, C7), 8 deferred. All deferrals have clear rationale and can be addressed in future tasks if needed.
