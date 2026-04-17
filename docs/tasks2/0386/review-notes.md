# rd3:tasks Code Review — Summary

Date: 2026-04-16
Scope: `plugins/rd3/skills/tasks/`

## Findings Summary

| Severity | Count | Area |
|----------|-------|------|
| CRITICAL (Part A cleanup) | 13 | Legacy folder references |
| HIGH (Part B) | 5 | Correctness + security |
| MEDIUM (Part B) | 9 | Consistency + hardening |
| LOW (Part B) | 10 | Polish |
| Improvements (Part C) | 10 | Opt-in optimization |
| **TOTAL** | **47** | |

## Part A — Legacy Folder Cleanup (13 items)

Files referencing `docs/prompts` and `docs/tasks2` that must be cleaned:

### Source code
- A1: `scripts/lib/config.ts` — `LEGACY_DIR`, `getLegacyTemplatePath`, legacy fallback branches
- A2: `scripts/commands/init.ts` — legacy folder creation, template copy, config seed
- A3: `scripts/commands/writeGuard.ts:71` — fallback folder list

### Templates
- A4: `templates/prompts.md` — delete

### Documentation
- A5: `SKILL.md` — lines 111, 129, 248, 257, 448-462

### Tests
- A6: `tests/list.test.ts:134`
- A7: `tests/config-cmd.test.ts` (multiple lines)
- A8: `tests/config.test.ts` (multiple lines, delete `getLegacyTemplatePath` block)
- A9: `tests/get-wbs.test.ts:8,19`
- A10: `tests/kanban-build.test.ts:204,211`
- A11: `tests/refresh.test.ts:102`
- A12: `tests/cli-contract.test.ts:503`
- A13: `tests/writeGuard.test.ts` (multiple lines)

## Part B — Bugs (24 items)

### HIGH (5)

| ID | File:Line | Issue |
|----|-----------|-------|
| B1 | `commands/check.ts:32,61-65` | Warnings set `valid=false`, breaking advisory semantics |
| B2 | `commands/check.ts:30,53` | `validateTaskForTransition(task, task.status)` is no-op for Backlog/Todo — `STATUS_GUARD` has no entry for those |
| B3 | `commands/put.ts:70` | `resolve(taskDir, wbs)` uses unvalidated `wbs` |
| B4 | `commands/get.ts:82` | Hard-coded `docs/tasks/` in user log ignoring actual folder |
| B5 | `server/routeHandlers.ts:684` | `channel` from request body flows unvalidated into `Bun.spawn` args |

### MEDIUM (9)

| ID | File:Line | Issue |
|----|-----------|-------|
| B6 | `lib/config.ts` | Dual-mode branch becomes dead code after A1 |
| B7 | `commands/create.ts:55-61,97-99,121-123` | Preset/profile handling duplicated across two paths |
| B8 | `lib/taskFile.ts:87-94` | Writes both `preset` and `profile` to disk |
| B9 | `commands/getWbs.ts:6` | Regex truncates 5+ digit WBS |
| B10 | `lib/template.ts` `stripYamlUnsafeChars` | Strips quotes — data loss on names with apostrophes |
| B11 | `server/routeHandlers.ts:74` | Dynamic `require('node:fs')` in ESM module |
| B12 | `server/router.ts` | `Access-Control-Allow-Origin: *` on mutations |
| B13 | `commands/server.ts:20` | `TASKS_PORT` env var bypasses range validation |
| B14 | `commands/update.ts:210,213` | `JSON.stringify` misuse for non-string field values |

### LOW (10)

| ID | File:Line | Issue |
|----|-----------|-------|
| B15 | `lib/wbs.ts:28` | Per-folder `base_counter` semantics undocumented |
| B16 | `commands/tree.ts` | Non-recursive despite name |
| B17 | `commands/get.ts:41` | `.filter(c => c !== 'Type')` drops valid cells |
| B18 | `commands/get.ts:63-65` | O(n²) dedup |
| B19 | `lib/template.ts:24-26` | Dead duplicate substitution regex |
| B20 | `templates/kanban.md` | Template pipelines inconsistent between list and substituteTemplateVars |
| B21 | `commands/batchCreate.ts:32-33` | Error messages lack item index |
| B22 | `commands/create.ts:218` | `sleepSync` re-allocates SharedArrayBuffer |
| B23 | `commands/open.ts` | No WBS format validation |
| B24 | `SKILL.md:451-461` | Documents legacy mode |

## Part C — Improvements (10)

| ID | Description |
|----|-------------|
| C1 | Unify config mode (post-cleanup) |
| C2 | Centralize validation to `lib/validation.ts` |
| C3 | Wire-level `profile` → `preset` migration |
| C4 | Collapse `updatePresetFrontmatterField` into `updateFrontmatterField` |
| C5 | Proper config caching (fix `resetConfigCache` no-op stub) |
| C6 | `check --target <status>` flag |
| C7 | Extract path-safety to `lib/path.ts` |
| C8 | Bun-native I/O migration |
| C9 | Split `tasks.ts` 852-LOC dispatcher |
| C10 | Structured logging for server mode |

## Cross-Cutting Notes

- `check.ts` vs `validateTaskForTransition` mismatch (B1 + B2) is the most user-impactful issue.
- `profile`/`preset` dual-write (B7, B8, C3) should be resolved as one cohesive migration, not piecemeal.
- Parts A + B6 are tightly coupled — cleanup first enables simpler config logic.
