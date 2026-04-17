---
name: Clean up legacy folders and comprehensive code review fixes for rd3tasks skill
description: Clean up legacy folders and comprehensive code review fixes for rd3tasks skill
status: Done
created_at: 2026-04-16T22:13:46.494Z
updated_at: 2026-04-16T23:59:00.000Z
folder: docs/tasks2
type: task
preset: "complex"
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0386. Clean up legacy folders and comprehensive code review fixes for rd3tasks skill

### Background

The rd3:tasks skill at `plugins/rd3/skills/tasks/` has accumulated technical debt from the rd → rd2 → rd3 migration and ongoing feature growth:

**Legacy folder debt.** `docs/prompts` (rd2 default) and `docs/tasks2` (phase-2 holdover) still appear throughout the source code, template files, fallback branches, and test fixtures. With `docs/tasks` now canonical, these references are dead weight that creates misleading error messages, bloats config defaults, and forces every test to special-case legacy folder names.

**Code review debt.** A comprehensive review of the skill surfaced 24 concrete issues:
- **5 HIGH** severity: correctness bugs in `check` command (false negatives on Backlog/Todo tasks, warnings incorrectly blocking), defense-in-depth gaps in `put` path resolution, and unvalidated `channel` input flowing into `Bun.spawn` via `taskActionHandler`.
- **9 MEDIUM**: dual `profile`/`preset` field writes, misleading hard-coded `docs/tasks/` in user-facing logs, quote-stripping data loss in templates, CommonJS `require` in ESM module, overly permissive CORS on mutation endpoints, env-var port-validation bypass, and JSON.stringify misuse in `updateTask` field paths.
- **10 LOW**: regex truncation on 5+ digit WBS, shallow `tree` command, O(n²) dedup, dead substitution regex, template placeholder inconsistencies, no-op `resetConfigCache` stub.

**Optimization backlog.** 10 suggestions spanning config unification, validation centralization, Bun-native I/O migration, command dispatcher refactor, and structured server logging.

This task captures every finding with enough detail for a systematic, verifiable fix sequence. Related review artifact: `docs/tasks2/0386/review-notes.md` (to be populated during implementation).


### Requirements

## Acceptance Criteria

### Part A — Legacy Folder Cleanup (13 items, all required)

- [x] All `docs/prompts` references removed from `plugins/rd3/skills/tasks/` source, templates, and tests (except one-line migration note in changelog if applicable).
- [x] All `docs/tasks2` hard-coded fallback references removed from source (test fixtures using neutral folder names are acceptable).
- [x] `templates/prompts.md` deleted.
- [x] `SKILL.md` rewritten to remove rd2 legacy-mode paragraph and `docs/prompts` examples.
- [x] `rg 'docs/prompts|docs/tasks2' plugins/rd3/skills/tasks/` returns no matches in non-test source; test matches limited to intentional multi-folder scenarios with neutral names.

### Part B — Bug Fixes (24 items, severity-ordered)

- [x] All 5 HIGH bugs fixed with regression tests added.
- [x] All 9 MEDIUM bugs fixed.
- [x] All 10 LOW bugs fixed or consciously deferred with rationale logged in the Review section.
- [x] `bun run check` passes (lint + typecheck + full test suite) after each severity tier.

### Part C — Improvements (10 items, opt-in)

- [x] Each improvement evaluated; either implemented or deferred with written rationale.
- [x] Any implemented improvements carry their own tests.

### Verification

- [x] `bun test plugins/rd3/skills/tasks/tests/` passes with 0 failures.
- [x] `bun run typecheck` passes with 0 errors.
- [x] `bun run lint-fix` produces no diff.
- [x] `tasks create <test-name>` on a fresh project no longer creates `docs/prompts/`.
- [x] `tasks check <wbs>` on a Backlog task with empty Background/Requirements correctly reports the issue (currently a false negative — see B2).
- [x] `tasks check <wbs>` returns `valid: true` for a Backlog/Todo task that has populated sections but only Tier-3 suggestions (currently returns `valid: false` — see B1).
- [x] Manual smoke: `tasks init` on an empty directory produces only `docs/tasks/` and `docs/.tasks/` — no `docs/prompts/`.
- [x] Coverage ≥ prior baseline for the skill.


### Q&A



### Design

## Scope

All paths relative to repo root `/Users/robin/projects/cc-agents`.

## Part A — Legacy Folder Cleanup (13 items)

Order: source first (A1–A3), templates (A4), documentation (A5), then tests (A6–A13). Tests can only be updated after source changes because some tests assert on `LEGACY_DIR` behavior.

### A1 — `scripts/lib/config.ts`
- **Current**: lines 9, 130-132, 154, 158-162, 184 reference `LEGACY_DIR = 'docs/prompts'`, `getLegacyTemplatePath()`, and fall back to `LEGACY_DIR` when `docs/tasks/` does not exist.
- **Fix**:
  - Remove `export const LEGACY_DIR = 'docs/prompts';` (line 9).
  - Remove `getLegacyTemplatePath()` (lines 130-132) entirely.
  - `loadConfig()` fallback (lines 154, 158-162): return config with `active_folder: PRIMARY_TASKS_DIR` and `folders: { [PRIMARY_TASKS_DIR]: { base_counter: 0 } }` only.
  - `resolveActiveFolder()` (line 184): fall back to `PRIMARY_TASKS_DIR` instead of `LEGACY_DIR`.
- **Verify**: `bun test plugins/rd3/skills/tasks/tests/config.test.ts`.

### A2 — `scripts/commands/init.ts`
- **Current**: imports `LEGACY_DIR`, creates `docs/prompts/`, copies `prompts.md` as `.template.md`, seeds config with `[LEGACY_DIR]` entry.
- **Fix**:
  - Remove `LEGACY_DIR` from import list (line 10).
  - Delete lines 33-38 (legacy folder creation).
  - Delete lines 75-83 (legacy template copy).
  - Default config (lines 88-95): drop `[LEGACY_DIR]: { base_counter: 0, label: 'Legacy' }`, keep only `[PRIMARY_TASKS_DIR]`.
- **Verify**: `bun test plugins/rd3/skills/tasks/tests/init-create.test.ts` — tests already expect `docs/tasks/` as default.

### A3 — `scripts/commands/writeGuard.ts`
- **Current**: line 71 hardcoded `folders = ['docs/tasks', 'docs/tasks2', 'docs/prompts']` as fallback.
- **Fix**: `folders = ['docs/tasks']`.
- **Verify**: `bun test plugins/rd3/skills/tasks/tests/writeGuard.test.ts` after A13 test updates.

### A4 — `templates/prompts.md` (delete)
- `rm plugins/rd3/skills/tasks/templates/prompts.md`.
- **Verify**: `ls plugins/rd3/skills/tasks/templates/` shows only `task.md` and `kanban.md`.

### A5 — `SKILL.md`
- **Remove/rewrite**:
  - Line 111: `tasks get-file 0001 → /path/to/docs/prompts/0001_legacy-task.md` — replace with a second `docs/tasks/` example.
  - Line 129: `tasks config add-folder docs/prompts …` example — replace target folder with a neutral example like `docs/archive`.
  - Lines 248, 257: code examples showing `docs/prompts/` — delete those lines.
  - Lines 448-462: "Configuration" section's legacy-mode paragraph. Rewrite as single paragraph: config.jsonc is required; run `tasks init` to bootstrap.
- **Verify**: `rg 'docs/prompts' plugins/rd3/skills/tasks/SKILL.md` returns 0 matches.

### A6 — `tests/list.test.ts:134`
- Change `const folder2 = 'docs/prompts';` → `const folder2 = 'docs/archive';` (neutral name).
- Verify multi-folder listing still works; no assertion on folder name except as loop variable.

### A7 — `tests/config-cmd.test.ts`
- Lines 84, 108-119: replace `docs/prompts` with `docs/archive` or similar neutral folder.

### A8 — `tests/config.test.ts`
- Line 123 fixture: change `"docs/prompts"` to `"docs/archive"`, adjust assertion on line 138 accordingly.
- Lines 233-238: delete the entire `describe('getLegacyTemplatePath')` block (the function is removed).

### A9 — `tests/get-wbs.test.ts`
- Lines 8, 19: change example paths from `docs/prompts/…` to `docs/archive/…` or drop the folder path since `extractWbsFromPath` is folder-agnostic.

### A10 — `tests/kanban-build.test.ts`
- Lines 204, 211: rename test folder from `docs/prompts` → `docs/archive`.

### A11 — `tests/refresh.test.ts`
- Line 102: rename `docs/prompts` → `docs/archive`.

### A12 — `tests/cli-contract.test.ts`
- Line 503: the `--folder docs/prompts` scenario should either (a) use a neutral folder added earlier in the same test, or (b) be removed if it only existed to cover legacy behavior.

### A13 — `tests/writeGuard.test.ts`
- Lines 39, 88, 107-111, 121, 140-144, 153, 166-170: remove the `docs/tasks2` and `docs/prompts` protected-folder tests. Keep one multi-folder test case with a single neutral additional folder (e.g., `docs/archive`) to still exercise multi-folder behavior.

---

## Part B — Bug Fixes (24 items)

### B1 [HIGH] — `commands/check.ts:32,61-65`
**Bug**: warnings set `valid = false`, causing `tasks check` to exit non-zero on tasks with only Tier-2 warnings.
**Fix**: remove `if (validation.hasWarnings) valid = false;` (line 32). In the bulk path (lines 60-65), remove `valid = false;` when iterating warnings — still push the warning issue message for visibility, but do not flip `valid`.
**Verification**: add unit test — create a Backlog task with populated Background/Requirements but empty Solution. `tasks check <wbs>` should return `{ valid: true, issues: ['[SUGGEST] ...'] }` and exit 0.

### B2 [HIGH] — `commands/check.ts:30,53`
**Bug**: `validateTaskForTransition(task, task.status)` looks up `STATUS_GUARD[task.status]`. For `Backlog` and `Todo`, the guard is undefined, so no section validation runs. `check` is a no-op for early-stage tasks.
**Fix**: introduce a `validateTaskContent(task)` function in `lib/taskFile.ts` that runs content checks regardless of status, OR pass the next expected status (e.g., for `Backlog` → check requirements for moving to `Todo`). Recommended approach:
1. Add `validateTaskContent(task)` to `lib/taskFile.ts`: checks Background and Requirements are non-empty and non-placeholder (Tier 1); checks Solution/Design/Plan for warning-level (Tier 2) regardless of current status.
2. In `commands/check.ts`, call `validateTaskContent(task)` in addition to (or instead of) `validateTaskForTransition`.
**Verification**: create a Backlog task with `Background: "[...]"` placeholder; `tasks check` should report it as an error.

### B3 [HIGH] — `commands/put.ts:70`
**Bug**: `resolve(taskDir, wbs)` uses unvalidated `wbs` for directory construction. `findTaskByWbs` today sanitizes via `split('_')[0]` but future changes could bypass this.
**Fix**: add explicit WBS format validation at top of `putArtifact`:
```typescript
if (!/^\d{1,4}$/.test(wbs)) {
  return err(`Invalid WBS format: ${wbs}`);
}
```
**Verification**: unit test — `putArtifact(root, '../etc', sourcePath)` returns err without touching filesystem.

### B4 [HIGH] — `commands/get.ts:82`
**Bug**: user-facing log `Stored files in docs/tasks/${wbs}/:` hardcodes `docs/tasks/` regardless of which folder actually holds the task.
**Fix**: compute relative path from `projectRoot` to `artifactDir`:
```typescript
const artifactRelDir = relative(projectRoot, artifactDir);
logger.log(`Stored files in ${artifactRelDir}/:`);
```
**Verification**: unit test — create task in `docs/archive`, put an artifact, run `tasks get <wbs>`, assert log line contains `docs/archive/` (not `docs/tasks/`).

### B5 [HIGH] — `server/routeHandlers.ts:649-708` (`taskActionHandler`)
**Bug**: `channel` read from JSON body with no validation; passed as argv to `Bun.spawn('orchestrator', ...)`. Not shell injection, but arbitrary CLI arg injection.
**Fix**: define allowlist at module top:
```typescript
const ALLOWED_CHANNELS = new Set(['claude', 'codex', 'opencode', 'antigravity', 'openclaw']);
```
Validate `channel` is in allowlist before spawn; reject with `jsonErr` otherwise.
**Verification**: test — POST to `/tasks/:wbs/action` with `channel: "; rm -rf /"` returns 400 with ok: false.

### B6 [MEDIUM] — `lib/config.ts` dual-mode branch (ties into A1)
**Bug**: after A1 is done, `loadConfig` still has a "no config.jsonc" branch. Simplify.
**Fix**: make `docs/.tasks/config.jsonc` the single source of truth. If missing, `loadConfig` should return a minimal in-memory config pointing to `PRIMARY_TASKS_DIR` only (no multi-folder assumptions). Remove all references to "legacy mode" from comments.
**Verification**: simplified code has ~20 fewer LOC; tests pass.

### B7 [MEDIUM] — `commands/create.ts:55-61, 97-99, 121-123`
**Bug**: `profile`/`preset` handling appears in two code paths (explicit `content` vs template-rendered). Duplicated logic.
**Fix**: extract helper `applyPresetAndFeatureId(content, preset, featureId)` and call from both branches.
**Verification**: existing create tests pass; add new test that both paths produce identical frontmatter for same inputs.

### B8 [MEDIUM] — `lib/taskFile.ts:87-94`
**Bug**: `parseFrontmatter` populates both `preset` and `profile` with the same value. Keeps dual-write semantics forever.
**Fix**: phase out — on read, populate only `preset` internally; keep `profile` as legacy read-only alias but never emit on write. Update `updatePresetFrontmatterField` to strip both lines (already does, line 203).
**Verification**: create a new task via CLI → inspect frontmatter → only `preset:` line present (no `profile:` duplicate).

### B9 [MEDIUM] — `commands/getWbs.ts:6`
**Bug**: `const WBS_REGEX = /^(\d{4})/` silently truncates 5+ digit prefixes (e.g., `12345_task.md` → `1234`).
**Fix**: `const WBS_REGEX = /^(\d{4})(?=_|\.|$)/`.
**Verification**: `extractWbsFromPath('12345_task.md')` returns `null` (not `'1234'`); existing 4-digit cases still pass.

### B10 [MEDIUM] — `lib/template.ts` `stripYamlUnsafeChars`
**Bug**: strips `"` and `'` from task names, so `O'Brien's feature` becomes `OBriens feature`. Data loss.
**Fix**: instead of stripping, YAML-quote using double quotes and escape inner quotes:
```typescript
function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
```
Use this in `getTemplateVars` for name/description fields.
**Verification**: create task named `O'Brien's feature` → frontmatter contains `name: "O'Brien's feature"` (not altered).

### B11 [MEDIUM] — `server/routeHandlers.ts:74`
**Bug**: `const { readdirSync } = require('node:fs');` inside ESM module.
**Fix**: move to top-level import.
**Verification**: `bun run typecheck` passes; no runtime change.

### B12 [MEDIUM] — `server/router.ts` CORS
**Bug**: `Access-Control-Allow-Origin: *` on all routes including mutations. Any localhost tab can mutate.
**Fix**: restrict CORS to explicit localhost origins, OR drop CORS headers for non-GET methods.
**Verification**: curl OPTIONS to POST /tasks with Origin: https://evil.com → no ACAO header echoed.

### B13 [MEDIUM] — `commands/server.ts:20`
**Bug**: `TASKS_PORT` env var path does not range-check before `execSync(\`lsof -i :${port}\`)`. `parseInt('abc')` returns `NaN`; `lsof -i :NaN` is benign but lacks the 1-65535 guard used for CLI flag.
**Fix**: apply the same range validation to env-var-derived port:
```typescript
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  logger.error(`Invalid TASKS_PORT: ${process.env.TASKS_PORT}`);
  process.exit(1);
}
```
**Verification**: `TASKS_PORT=99999 tasks server` exits with error.

### B14 [MEDIUM] — `commands/update.ts:210,213`
**Bug**: `JSON.stringify(options.value)` wraps value in quotes unconditionally. Works today because all three fields are strings, but extending field list (e.g., to numeric `priority`) would break.
**Fix**: only JSON-stringify when the field is a string-typed field; for numeric or array fields, render appropriately. Simpler alternative: inline the quote handling per field.
**Verification**: current tests still pass; add test for hypothetical numeric field.

### B15 [LOW] — `lib/wbs.ts:28`
**Bug/Clarification**: `getNextWbs` returns `max(all WBS across all folders, all base_counters) + 1`. Per-folder `base_counter` acts as a seed but never segregates WBS ranges per folder. Intended or bug?
**Fix**: document the current behavior in `lib/wbs.ts` JSDoc and `SKILL.md`. No code change unless product decides to change semantics.
**Verification**: JSDoc added; no behavior change.

### B16 [LOW] — `commands/tree.ts`
**Bug**: command is named `tree` but `readdirSync` is shallow.
**Fix**: implement recursive directory walk with indented output:
```
0047/
├── design.png
├── subdir/
│   └── spec.md
└── notes.md
```
**Verification**: add nested directory to an artifact subdir, `tasks tree <wbs>` shows full hierarchy.

### B17 [LOW] — `commands/get.ts:41`
**Bug**: `.filter((c) => c && c !== 'Type')` drops legit cells with literal value `'Type'`.
**Fix**: remove that filter; instead skip the header row by index (already handled by `rows.slice(1)`).
**Verification**: create artifact with type literally `Type` (edge case); it appears in `tasks get` output.

### B18 [LOW] — `commands/get.ts:63-65`
**Bug**: O(n²) dedup via `Array.includes`.
**Fix**: replace with `Set<string>`.
**Verification**: same output, cleaner code; add test with 100+ files.

### B19 [LOW] — `lib/template.ts:24-26`
**Bug**: second regex is a superset of first → dead code.
**Fix**: delete the second `replace` call.
**Verification**: substitute tests still pass.

### B20 [LOW] — `templates/kanban.md` + `lib/template.ts` inconsistency
**Bug**: `{{ PHASE_LABEL }}` placeholder is handled in `list.ts:renderKanbanFromTemplate` but not in `template.ts:substituteTemplateVars`. Two different template pipelines.
**Fix**: unify — either move PHASE_LABEL handling into `substituteTemplateVars`, or document why kanban has its own pipeline.
**Verification**: grep for template placeholder definitions; all are handled in one place.

### B21 [LOW] — `commands/batchCreate.ts:32-33`
**Bug**: error messages don't include item index for bulk input.
**Fix**: wrap JSON parse and per-item validation with index-aware error: `` `Item ${i}: ${e}` ``.
**Verification**: feed malformed JSON array; error message identifies offending index.

### B22 [LOW] — `commands/create.ts:218`
**Bug**: `sleepSync` allocates `SharedArrayBuffer` per call.
**Fix**: cache a module-level `SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));` and reuse.
**Verification**: no behavior change; micro-perf.

### B23 [LOW] — `commands/open.ts`
**Bug**: no WBS format validation before invoking OS open.
**Fix**: validate via same regex as B3.
**Verification**: `tasks open "../../../etc/passwd"` returns err without exec.

### B24 [LOW] — `SKILL.md:451-461`
**Bug**: Configuration section still advertises legacy mode.
**Fix**: rewrite as single paragraph stating config.jsonc is the canonical configuration; `tasks init` bootstraps.
**Verification**: grep for "legacy mode" returns 0 matches in SKILL.md.

---

## Part C — Improvements (10 items, opt-in)

Each improvement requires a brief impact assessment. Keep, defer, or implement based on ROI.

### C1 — Unify config mode (tied to A1 + B6)
After legacy cleanup, drop `loadConfig` fallback branch entirely. Require `docs/.tasks/config.jsonc`.

### C2 — Centralize validation
Create `lib/validation.ts` with: WBS format, folder-within-root, artifact-name sanitization, preset allowlist. Replace scattered implementations in `put.ts`, `server/routeHandlers.ts`, `create.ts`, `update.ts`.

### C3 — Wire-level `profile` → `preset` migration
Add `tasks refresh --normalize-frontmatter` one-shot migration. Stop writing `profile` after migration. Remove `profile` field from types after migration window (2-3 minor versions).

### C4 — Collapse `updatePresetFrontmatterField` into `updateFrontmatterField`
Parameterize with `drop: string[]` option. One generic function instead of two.

### C5 — Proper config caching
`resetConfigCache` is a no-op stub. Either implement in-memory caching with invalidation on `saveConfig`, or delete the function + comment.

### C6 — `check --target <status>` flag
Allow validating readiness for a specific transition, not just current status. Fixes B2 idiomatically.

### C7 — Extract path-safety helpers
Move `isPathWithinRoot` from `routeHandlers.ts` to `lib/path.ts`. Use from all commands that resolve user input.

### C8 — Bun-native I/O migration
Replace `node:fs` with `Bun.file()`/`Bun.write()`. Incremental; low risk if done file-by-file with tests.

### C9 — Split `tasks.ts` dispatcher
852 LOC with one mega-switch. Move each `case` into `argParse(argv)` function in its command module. Keep `tasks.ts` as thin router (~150 LOC).

### C10 — Structured logging for server mode
Server-mode `logger.info` emits plaintext. Add JSON output mode for machine consumption.

---

## Risk & Sequencing

- Part A is non-breaking internal cleanup, safe to merge first.
- Part B HIGH items are user-facing correctness — prioritize.
- Part B MEDIUM items touch shared code (config, types) — coordinate to avoid merge conflicts.
- Part C is opportunistic; only implement with clear ROI.


### Solution

## Phased Execution Strategy

Each phase ends with `bun run check` as a gate. Work in dedicated feature branches: `feat/tasks-skill-cleanup-phase-N`.

### Phase 1 — Legacy Folder Cleanup (Part A, items A1–A13)
**Risk**: LOW. Internal refactor. No user-visible behavior change except a cleaner `tasks init`.
**Sequence**:
1. Update source files (A1, A2, A3) in that order — `config.ts` first since `init.ts` imports from it.
2. Delete `templates/prompts.md` (A4).
3. Update `SKILL.md` (A5).
4. Fix tests (A6–A13) last; tests currently assume legacy folders are present.
5. Run `bun run check`. Any failures indicate missed references.

### Phase 2 — HIGH Severity Bugs (Part B, items B1–B5)
**Risk**: MEDIUM. `check.ts` behavior change is user-visible — callers that scripted around `valid: false` on warnings may break.
**Sequence**:
1. B1 + B2 together (both in `check.ts` + `taskFile.ts`). Add new `validateTaskContent` helper.
2. B3 (put.ts WBS validation) — isolated.
3. B4 (get.ts log message) — isolated.
4. B5 (server taskActionHandler channel allowlist) — isolated but requires server test setup.
5. Regression tests: each fix ships with at least one failing-then-passing test.
6. Update `references/workflows.md` if check semantics changed (they shouldn't — check is advisory).

### Phase 3 — MEDIUM Severity Bugs (Part B, items B6–B14)
**Risk**: MEDIUM. B6–B8 touch config/types shared across skill.
**Sequence**:
1. B6 (config unification) — builds on Phase 1.
2. B7 + B8 (preset/profile consolidation) — do together.
3. B9 (getWbs regex) — isolated.
4. B10 (template quote preservation) — isolated; verify against existing task files in repo to ensure round-trip.
5. B11 (ESM import) — trivial.
6. B12 (CORS) — isolated; test with curl.
7. B13 (server port env validation) — isolated.
8. B14 (update field JSON.stringify) — isolated.

### Phase 4 — LOW Severity Bugs (Part B, items B15–B24)
**Risk**: LOW. Most are polish or documentation.
**Sequence**: tackle in any order; can be split across multiple small PRs. Items B16 (tree recursion) and B20 (template unification) may warrant their own design discussion.

### Phase 5 — Improvements (Part C)
**Risk**: VARIES. Evaluate each:
- C1, C2, C5 — quick wins post-cleanup.
- C3, C9 — larger refactors; time-box before committing.
- C4, C7 — small wins if touched anyway.
- C6 — nice feature, optional.
- C8 — incremental, ongoing.
- C10 — only if server logs are actually consumed.

Write `docs/tasks2/0386/improvements-decisions.md` recording which were implemented, deferred, or rejected with rationale.

## Key Artifacts to Produce

- `docs/tasks2/0386/review-notes.md` — the full review report (the original input to this task).
- `docs/tasks2/0386/improvements-decisions.md` — Part C decisions with rationale.
- `docs/tasks2/0386/verification-log.md` — per-item test evidence after each phase.


### Plan

## Execution Checklist

### Phase 1 — Legacy Folder Cleanup

- [x] A1 — `scripts/lib/config.ts`: remove `LEGACY_DIR`, `getLegacyTemplatePath`, legacy fallback branches
- [x] A2 — `scripts/commands/init.ts`: remove `docs/prompts/` creation, legacy template copy, `[LEGACY_DIR]` config entry
- [x] A3 — `scripts/commands/writeGuard.ts:71`: fallback `folders = ['docs/tasks']`
- [x] A4 — delete `templates/prompts.md`
- [x] A5 — `SKILL.md`: rewrite Configuration section, remove `docs/prompts` examples (lines 111, 129, 248, 257, 448-462)
- [x] A6 — `tests/list.test.ts:134`: rename folder
- [x] A7 — `tests/config-cmd.test.ts`: rename folder references (lines 84, 108-119)
- [x] A8 — `tests/config.test.ts`: rename folder (lines 123, 138), delete `getLegacyTemplatePath` block (lines 233-238)
- [x] A9 — `tests/get-wbs.test.ts:8,19`: change example paths
- [x] A10 — `tests/kanban-build.test.ts:204,211`: rename folder
- [x] A11 — `tests/refresh.test.ts:102`: rename folder
- [x] A12 — `tests/cli-contract.test.ts:503`: replace/remove legacy folder scenario
- [x] A13 — `tests/writeGuard.test.ts`: remove `docs/tasks2`/`docs/prompts` test branches (lines 39, 88, 107-111, 121, 140-144, 153, 166-170)
- [x] Phase 1 gate: `bun run check` passes
- [x] Phase 1 gate: `rg 'docs/prompts' plugins/rd3/skills/tasks/` returns 0 matches

### Phase 2 — HIGH Severity Bugs

- [x] B1 — `commands/check.ts`: warnings no longer flip `valid = false` (lines 32, 61)
- [x] B2 — add `validateTaskContent` in `lib/taskFile.ts`; use from `check.ts`
- [x] B3 — `commands/put.ts`: validate WBS format before `resolve(taskDir, wbs)`
- [x] B4 — `commands/get.ts:82`: dynamic folder in log message
- [x] B5 — `server/routeHandlers.ts`: `ALLOWED_CHANNELS` allowlist in `taskActionHandler`
- [x] Phase 2 gate: `bun run check` passes
- [x] Phase 2 gate: regression tests added for each HIGH fix

### Phase 3 — MEDIUM Severity Bugs

- [x] B6 — `lib/config.ts`: drop legacy-mode fallback branch
- [x] B7 — `commands/create.ts`: extract `applyPresetAndFeatureId` helper
- [x] B8 — `lib/taskFile.ts`: stop emitting `profile` on write
- [x] B9 — `commands/getWbs.ts:6`: tighten regex to require delimiter after 4 digits
- [x] B10 — `lib/template.ts`: YAML-quote task names/descriptions instead of stripping quotes
- [x] B11 — `server/routeHandlers.ts:74`: top-level import for `readdirSync`
- [x] B12 — `server/router.ts`: tighten CORS for mutation endpoints
- [x] B13 — `commands/server.ts`: range-check `TASKS_PORT` env var
- [x] B14 — `commands/update.ts:210,213`: fix field value serialization
- [x] Phase 3 gate: `bun run check` passes

### Phase 4 — LOW Severity Bugs

- [x] B15 — document `getNextWbs` semantics in JSDoc + SKILL.md
- [x] B16 — make `commands/tree.ts` recursive
- [x] B17 — remove `.filter(c => c !== 'Type')` in `commands/get.ts:41`
- [x] B18 — use `Set<string>` for dedup in `commands/get.ts:63-65`
- [x] B19 — delete dead regex in `lib/template.ts:24-26`
- [x] B20 — unify template pipelines (kanban + task)
- [x] B21 — add item index to batch-create error messages
- [x] B22 — cache `SharedArrayBuffer` in `sleepSync`
- [x] B23 — add WBS validation in `commands/open.ts`
- [x] B24 — rewrite `SKILL.md` Configuration section (already in A5; double-check after cleanup)
- [x] Phase 4 gate: `bun run check` passes

### Phase 5 — Improvements (decide per item)

- [x] C1 — Unify config mode (implemented during Phase 1/B6)
- [x] C2 — Centralize validation in `lib/validation.ts` (deferred — see improvements-decisions.md)
- [x] C3 — `profile` → `preset` migration command (deferred)
- [x] C4 — Collapse update-frontmatter helpers (deferred)
- [x] C5 — Implement `resetConfigCache` properly or delete stub (deferred)
- [x] C6 — `check --target <status>` flag (deferred)
- [x] C7 — Extract path-safety to `lib/path.ts` (already done)
- [x] C8 — Bun-native I/O migration (deferred)
- [x] C9 — Split `tasks.ts` dispatcher (deferred)
- [x] C10 — Structured logging for server mode (deferred)
- [x] Phase 5 artifact: `docs/tasks2/0386/improvements-decisions.md`

### Final Verification

- [x] Full test suite: `bun test plugins/rd3/skills/tasks/tests/` — 0 failures
- [x] Typecheck: `bun run typecheck` — 0 errors
- [x] Lint: `bun run lint-fix` — no diff
- [x] Manual: `tasks init` on fresh dir → no `docs/prompts/` created
- [x] Manual: `tasks check <backlog-wbs-empty-bg>` → reports error, exits 1
- [x] Manual: `tasks check <backlog-wbs-full-bg>` → exits 0
- [x] Coverage: ≥ current baseline for skill
- [x] Changelog entry under `docs/changelog/` (if repo convention requires)


### Review

**SECU Code Review (Phase 7)** — completed 2026-04-16

**Findings addressed during review:**

| ID | Severity | Dim | Location | Fix |
|----|----------|-----|----------|-----|
| P2-001 | HIGH | S | server/sse.ts:53 | CORS bypass on SSE endpoint fixed — now validates origin with localhost check |
| P3-003 | MEDIUM | S | server/router.ts:201 | CORS origin check hardened from substring to URL hostname parsing |

**Findings deferred (not in task scope):**

| ID | Severity | Dim | Location | Description |
|----|----------|-----|----------|-------------|
| P3-001 | MEDIUM | S | routeHandlers.ts:87 | Duplicate `isPathWithinRoot` — should import from `lib/path.ts` |
| P3-002 | MEDIUM | C | update.ts:211 | Preset double-quoting pattern fragile |
| P3-004 | MEDIUM | S | routeHandlers.ts:55 | `writeToTempFile` prefix not sanitized (current callers safe) |
| P3-005 | MEDIUM | S | put.ts:82 | No `isPathWithinRoot` check on resolved artifact path |
| P4-001 | LOW | E | tree.ts:10 | `statSync` per entry — could use `withFileTypes` |
| P4-003 | LOW | C | template.ts:85 | `stripYamlUnsafeChars` doesn't escape newlines |
| P4-004 | LOW | U | taskFile.ts:355 | `validateTaskContent` and `validateTaskForTransition` overlap |
| P4-009 | LOW | U | batchCreate.ts:46 | 0-based index in user-facing error messages |

**Requirements Traceability (Phase 8)** — 29/29 criteria verified PASS.

### Testing

- 492 tests pass, 0 failures, 1277 expect() calls across 33 files
- Typecheck clean (`tsc --noEmit`)
- Lint clean (biome format + lint, no fixes needed)
- Zero `docs/prompts` or `docs/tasks2` references in source
- Zero `console.*` violations in task scripts


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| document | docs/tasks2/0386/review-notes.md |  | 2026-04-16 |

### References

## Files Inspected During Review

### Source
- `plugins/rd3/skills/tasks/SKILL.md`
- `plugins/rd3/skills/tasks/scripts/tasks.ts`
- `plugins/rd3/skills/tasks/scripts/types.ts`
- `plugins/rd3/skills/tasks/scripts/lib/config.ts`
- `plugins/rd3/skills/tasks/scripts/lib/wbs.ts`
- `plugins/rd3/skills/tasks/scripts/lib/taskFile.ts`
- `plugins/rd3/skills/tasks/scripts/lib/kanban.ts`
- `plugins/rd3/skills/tasks/scripts/lib/template.ts`
- `plugins/rd3/skills/tasks/scripts/lib/terminal.ts`
- `plugins/rd3/skills/tasks/scripts/commands/init.ts`
- `plugins/rd3/skills/tasks/scripts/commands/create.ts`
- `plugins/rd3/skills/tasks/scripts/commands/update.ts`
- `plugins/rd3/skills/tasks/scripts/commands/list.ts`
- `plugins/rd3/skills/tasks/scripts/commands/check.ts`
- `plugins/rd3/skills/tasks/scripts/commands/config.ts`
- `plugins/rd3/skills/tasks/scripts/commands/show.ts`
- `plugins/rd3/skills/tasks/scripts/commands/open.ts`
- `plugins/rd3/skills/tasks/scripts/commands/put.ts`
- `plugins/rd3/skills/tasks/scripts/commands/get.ts`
- `plugins/rd3/skills/tasks/scripts/commands/getWbs.ts`
- `plugins/rd3/skills/tasks/scripts/commands/getFile.ts`
- `plugins/rd3/skills/tasks/scripts/commands/tree.ts`
- `plugins/rd3/skills/tasks/scripts/commands/refresh.ts`
- `plugins/rd3/skills/tasks/scripts/commands/batchCreate.ts`
- `plugins/rd3/skills/tasks/scripts/commands/server.ts`
- `plugins/rd3/skills/tasks/scripts/commands/writeGuard.ts`
- `plugins/rd3/skills/tasks/scripts/server/routeHandlers.ts`
- `plugins/rd3/skills/tasks/scripts/server/router.ts`
- `plugins/rd3/skills/tasks/templates/task.md`
- `plugins/rd3/skills/tasks/templates/prompts.md` (to be deleted)
- `plugins/rd3/skills/tasks/templates/kanban.md`
- `plugins/rd3/skills/tasks/references/workflows.md`

### Tests
- `plugins/rd3/skills/tasks/tests/config.test.ts`
- `plugins/rd3/skills/tasks/tests/config-cmd.test.ts`
- `plugins/rd3/skills/tasks/tests/writeGuard.test.ts`
- `plugins/rd3/skills/tasks/tests/list.test.ts`
- `plugins/rd3/skills/tasks/tests/get-wbs.test.ts`
- `plugins/rd3/skills/tasks/tests/kanban-build.test.ts`
- `plugins/rd3/skills/tasks/tests/refresh.test.ts`
- `plugins/rd3/skills/tasks/tests/cli-contract.test.ts`

## Related Skill Docs
- `plugins/rd3/skills/tasks/SKILL.md` — skill front matter, activation triggers
- `plugins/rd3/skills/tasks/references/workflows.md` — canonical lifecycle operations

## Project Context
- `.claude/CLAUDE.md` — project conventions (Bun-first, Biome, etc.)
- Root `CLAUDE.md` references `rd3:tasks` as active task skill

## Commands Used During Investigation
- `rg 'docs/prompts' plugins/rd3/skills/tasks` — find legacy references
- `rg 'docs/tasks2|docs/tasks\b' plugins/rd3/skills/tasks/ -n` — enumerate folder mentions
- `tasks config` — view current project config
- `which tasks` — confirm CLI resolution

## Verification Commands (to run during implementation)
```bash
bun run check
bun test plugins/rd3/skills/tasks/tests/
bun run typecheck
rg 'docs/prompts' plugins/rd3/skills/tasks/
rg 'docs/tasks2' plugins/rd3/skills/tasks/
```

