---
name: ftree Phase 4 Polish + Skill Integration
description: ftree Phase 4 Polish + Skill Integration
status: Done
created_at: 2026-04-10T05:28:46.368Z
updated_at: 2026-04-12T05:31:33.588Z
folder: docs/tasks2
type: task
dependencies: ["0372","0373"]
preset: "standard"
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0374. ftree Phase 4: Polish + Skill Integration

### Background

Phase 4 of ftree skill (task 0369). Final polish: update SKILL.md with implemented commands, agent workflow documentation (PM → architect → engineer → orchestrator), per-role usage examples. Verify coverage >= 90% functions and lines. Final `bun run check` pass. Depends on Phases 2 (0372) and 3 (0373) both completing.

**Architecture:** The skill uses `@gobing-ai/typescript-bun-starter` with clipanion CLI, Drizzle ORM, and logtape logger. SKILL.md must be updated to reflect the actual CLI commands (no daemon/server mode).

### Requirements Mapping

| Requirement | Target Path | Notes |
|---|---|---|
| **R9: Skill Integration** | | |
| R9.1 Update SKILL.md | `plugins/rd3/skills/feature-tree/SKILL.md` | Remove `ftree serve` / daemon references. Document all CLI commands with clipanion syntax. Add per-role examples. |
| R9.2 Register ftree bin | `plugins/rd3/package.json` | The `ftree` bin script exists but points to non-existent `scripts/ftree.ts` — needs to point to `apps/cli/src/index.ts` or a wrapper |
| R9.3 Zero `console.*` | All `apps/cli/src/commands/*.ts` | Use `this.context.stdout/stderr.write()` (clipanion) or `logger.*` (logtape). No bare `console.*`. |
| R9.4 Biome lint + format clean | `plugins/rd3/skills/feature-tree/scripts/` | `biome check .` must pass |
| R9.5 `bun run check` passes | Global | lint + typecheck + test |
| R9.6 Agent workflow docs in SKILL.md | SKILL.md | Per-role examples: PM (init + add), architect (add --parent + context), engineer (link + check-done), orchestrator (export + status) |

### SKILL.md Updates Required

The current SKILL.md at `plugins/rd3/skills/feature-tree/SKILL.md` references:
- `ftree serve` (daemon) — **REMOVE** (CLI-only, no daemon)
- `ftree tree <id>` — **RENAME** to `ftree context <id>`
- `ftree digest --feature-id --wbs-ids` — **UPDATE** to `ftree digest <id> --wbs <ids> --status <status>`
- References to `daemon.ts`, `api.md` — **REMOVE**

Replace with:
- CLI commands: init, add, link, ls, context, wbs, check-done, export, update, delete, move, unlink, digest, import
- Per-role agent workflow with concrete examples
- DB path resolution: `--db` flag → `FTREE_DB` env → `docs/.ftree/db.sqlite`

### Bin Registration Fix

`plugins/rd3/package.json` has:
```json
"ftree": "bun ./skills/feature-tree/scripts/ftree.ts"
```
This file doesn't exist. Should point to:
```json
"ftree": "bun ./skills/feature-tree/scripts/apps/cli/src/index.ts"
```

### Plan

- [x] 4.1 Update SKILL.md — remove daemon references, document all 14 CLI commands, add per-role agent workflow
- [x] 4.2 Fix ftree bin registration in `plugins/rd3/package.json` (already correct)
- [x] 4.3 Verify no `console.*` in scripts — only `logger.*` and clipanion context (confirmed clean)
- [x] 4.4 Verify coverage >= 90% functions, >= 90% lines (99.67% / 99.40%)
- [x] 4.5 Final `bun run check` pass (4429 tests, 0 failures)
- [x] 4.6 Barrel export verified — DoneCheckResult exported, mutation methods on FeatureService (already exported)

### Review

SKILL.md fully rewritten 2026-04-13.

**Changes:**
- Removed all daemon/server references (`ftree serve`, `daemon.ts`, `api.md`)
- Removed `ftree tree` — replaced with `ftree context` (actual implementation)
- Documented all 14 CLI commands with usage examples
- Added complete state machine reference with transition map
- Added per-role agent workflow: PM, Architect, Engineer, Orchestrator
- Added exit code reference table
- Added gotchas section with real constraints
- Added project structure showing actual file layout
- Version bumped from 1.0 to 2.0

### Testing

- Coverage: 99.67% functions, 99.40% lines (176 tests, 0 failures)
- No `console.*` calls in any source files
- `bun run check` passes globally (4429 tests, 0 failures)
- Bin registration verified: `bun ./skills/feature-tree/scripts/apps/cli/src/index.ts`



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| docs | `plugins/rd3/skills/feature-tree/SKILL.md` — fully rewritten v2.0 | pi | 2026-04-13 |
| verify | Bin registration confirmed correct | pi | 2026-04-13 |
| verify | No console.* calls in source files | pi | 2026-04-13 |
| verify | Coverage 99.67% / 99.40% (176 tests) | pi | 2026-04-13 |
| check | `bun run check` passes globally (4429 tests, 0 failures) | pi | 2026-04-13 |

### References
- [task 0369](docs/tasks2/0369_Implement_feature-tree_ftree_skill.md)
- SKILL.md: `plugins/rd3/skills/feature-tree/SKILL.md`
- rd3 package.json: `plugins/rd3/package.json`
- CLI entry: `plugins/rd3/skills/feature-tree/scripts/apps/cli/src/index.ts`
