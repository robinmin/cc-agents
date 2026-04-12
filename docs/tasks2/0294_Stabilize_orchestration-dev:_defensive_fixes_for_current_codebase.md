---
name: Stabilize orchestration-dev defensive fixes for current codebase
description: Minimal-effort defensive fixes to keep orchestration-dev operational while v2 is built. No new features no architectural changes.
status: Done
profile: simple
created_at: 2026-03-31T19:00:34.963Z
updated_at: 2026-03-31T20:51:22.678Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0294. Stabilize orchestration-dev: defensive fixes for current codebase

### Background

The orchestration-dev skill (3,285 lines source, 248 tests passing) is the backbone of the rd3 pipeline. A comprehensive review (`docs/research/orchestration-dev-comprehensive-review.md`) identified several must-fix issues that pose data loss, corruption, or silent failure risks. These fixes are low-effort, high-impact defensive patches — no architecture changes, no new features.

This is **Track 1** of the two-track strategy. Track 2 (next-generation pipeline rebuild from scratch) runs independently and is documented in Part 9 of the review.

### Requirements

#### R1: Test `acpx-query.ts` to >90% coverage
- **File:** `scripts/libs/acpx-query.ts`
- **Current state:** 0% function coverage, 13.89% line coverage
- **Risk:** This module is the ACP execution backbone — responsible for all cross-channel agent communication. Untested critical infra is a time bomb.
- **Scope:** Write unit tests with mock `Bun.spawnSync` covering: command construction, `--format quiet` output parsing, error handling, timeout behavior, session resolution
- **Target:** >90% function coverage, >85% line coverage

#### R2: Fix state file race conditions
- **File:** `scripts/state-paths.ts`
- **Current state:** `findOrchestrationStatePath()` sorts filenames alphabetically and picks the last `.json` — not timestamp-ordered, no file locking
- **Risk:** Concurrent runs for the same task corrupt state. Two runs starting in the same millisecond produce ambiguous sort order.
- **Scope:** Add timestamp-based sorting (read `created_at` from JSON), add runtime file-lock mechanism (e.g., lockfile with PID), document concurrency limitations
- **Target:** Safe concurrent run detection with clear error if state is already locked

#### R3: Add `schema_version` to state files
- **File:** `scripts/model.ts` (OrchestrationState type), `scripts/runtime.ts` (state persistence)
- **Current state:** No schema version field. Format changes break old state files silently.
- **Scope:** Add `schema_version: 1` to all new state files, add validation on load that rejects unknown schema versions, add migration path documentation
- **Target:** Forward-compatible state files with graceful rejection of future versions

#### R4: Rollback safety check for uncommitted changes
- **File:** `scripts/rollback.ts`
- **Current state:** `restoreSnapshot()` uses `git checkout -- <files>` which can destroy unstaged changes present before the phase started
- **Risk:** Data loss if developer had uncommitted work in files that get rolled back
- **Scope:** Before rollback, check `git status --porcelain` for dirty files not in the snapshot's `modified_before` list. If found, warn and abort unless `--force` flag is present. Add `--force` flag to rollback CLI.
- **Target:** Zero data loss by default, explicit opt-in for destructive rollback

#### R5: Phase-specific timeout defaults
- **File:** `scripts/runtime.ts`, `scripts/model.ts`
- **Current state:** All phases share `DEFAULT_PHASE_TIMEOUT_MS = 3600000` (1 hour). Phase 1 (Intake) and Phase 9 (Docs) should be much faster than Phase 5 (Implementation).
- **Scope:** Add `PHASE_TIMEOUT_MS` map keyed by phase number using existing `PHASE_DURATIONS` as basis. Phase 1: 15min, Phase 2-4: 30min, Phase 5: 2h, Phase 6: 1h, Phase 7: 30min, Phase 8: 30min, Phase 9: 20min. Keep global override via `--timeout` CLI flag.
- **Target:** Appropriate timeouts per phase, no change to external API

#### R6: Fix Phase 2/3 routing — support frontend/fullstack
- **File:** `scripts/contracts.ts` (`getBasePhase()` function)
- **Current state:** `case 2: return { skill: 'rd3:backend-architect' }` and `case 3: return { skill: 'rd3:backend-design' }` — hardcoded to backend regardless of project type
- **Risk:** Frontend and fullstack projects get wrong architecture/design phases
- **Scope:** Read domain hint from task file frontmatter (`domain: frontend | backend | fullstack`). Route Phase 2 to `rd3:frontend-architect` or `rd3:backend-architect` accordingly. Route Phase 3 similarly. Default to backend if no hint (backward compatible).
- **Target:** Correct phase routing based on project domain

#### R7: Improve error messages with actionable context
- **Files:** `scripts/runtime.ts`, `scripts/executors.ts`, `scripts/pilot.ts`
- **Current state:** Generic error strings like `"Phase runner timed out after ${timeoutMs}ms"` with no phase number, no task ref, no suggested action
- **Scope:** Add structured error context to all PhaseRunnerResult.error values: phase number, phase name, task ref, suggested next action. Keep string format for compatibility but include structured fields.
- **Target:** Every error message includes: what failed, which phase, which task, and what to do next

### Q&A

**Q: Why not fix the pilot.ts god-file problem?**
A: That's an architectural refactor, not a defensive fix. It belongs in Track 2.

**Q: Why not add the pipeline run summary report?**
A: Observability features belong in Track 2 where SQLite makes reporting trivial.

**Q: What about the direct-skill vs worker-agent execution split?**
A: Unifying the execution model is a core goal of Track 2's FSM engine. Not a Track 1 concern.

**Q: Should we bump the test count target?**
A: R1 alone should add 20-30 new tests. No additional test targets beyond R1.

### Design

Track 1 is intentionally scoped to avoid design decisions. All 7 items are narrow patches with clear before/after states. No new abstractions, no new modules, no new dependencies.

Key constraint: **all changes must be backward-compatible.** Existing state files, CLI invocations, and agent contracts must continue to work unchanged.

### Solution

**Completed items (all 7):**

| R# | Status | What Changed |
|----|--------|-------------|
| R1 | ✅ Pre-existing | `acpx-query.ts` already at 100% coverage (16 tests) |
| R2 | ✅ Done | `state-paths.ts` — timestamp-based sorting, `createRunLock`/`releaseRunLock`/`isRunLocked` functions |
| R3 | ✅ Done | `runtime.ts` — `CURRENT_SCHEMA_VERSION = 1`, `schema_version` in state, load validation |
| R4 | ✅ Done | `rollback.ts` — `checkDirtyFiles()`, `force` parameter, safety check before restore |
| R5 | ✅ Done | `model.ts` — `PHASE_TIMEOUT_MS` map; `runtime.ts` — per-phase timeout selection |
| R6 | ✅ Done | `contracts.ts` — `resolveDomain()`, domain-aware Phase 2/3 routing |
| R7 | ✅ Done | `runtime.ts` — `formatPhaseError()` helper, timeout/prerequisite/rework error formatting |

**Verification:** `bun run check` — 2308 pass, 0 fail, lint clean, typecheck clean.

### Plan

**Execution order (by dependency and risk):**

| Step | Requirement | Effort | Depends On | Risk Level |
|------|------------|--------|------------|------------|
| 1 | R1: Test acpx-query.ts | 0.5d | None | Low |
| 2 | R3: Schema version in state | 0.5d | None | Low |
| 3 | R2: Fix state file races | 0.5d | R3 | Low |
| 4 | R5: Phase-specific timeouts | 0.5d | None | Low |
| 5 | R4: Rollback safety check | 0.5d | None | Medium (touching rollback logic) |
| 6 | R6: Phase 2/3 routing fix | 0.5d | None | Low |
| 7 | R7: Error message improvement | 1d | None | Low |

**Total estimate:** 4-5 days

**Verification gate:** After all items complete, run `bun run check` (lint + typecheck + test). All 248+ existing tests must pass plus all new tests from R1.

### Review

Review criteria for each requirement:

| R# | Verify |
|----|--------|
| R1 | `bun test` shows >90% function coverage for `acpx-query.ts`. All edge cases covered. |
| R2 | Two concurrent runs for same task — second one gets clear error, not silent corruption. |
| R3 | Old state files (no schema_version) load fine. New state files have `schema_version: 1`. |
| R4 | Rollback with dirty files warns and aborts. `--force` proceeds. Clean rollback unchanged. |
| R5 | Phase 1 times out at 15min, Phase 5 at 2h. `--timeout 300000` still overrides globally. |
| R6 | Task with `domain: frontend` routes Phase 2 to `rd3:frontend-architect`. No domain → backend. |
| R7 | Error messages include phase number, task ref, and suggested action. No bare strings. |

### Testing

| R# | Test Scope | Target |
|----|-----------|--------|
| R1 | Full `acpx-query.ts` unit tests | >90% func, >85% lines |
| R2 | `state-paths.ts` tests for timestamp sorting + lock mechanism | New tests added |
| R3 | `model.ts` / `runtime.ts` tests for schema version validation | New tests added |
| R4 | `rollback.ts` tests for dirty file detection + `--force` flag | New tests added |
| R5 | `runtime.ts` tests for per-phase timeout selection | Extend existing tests |
| R6 | `contracts.ts` tests for domain-based routing | New tests added |
| R7 | `runtime.ts` / `executors.ts` / `pilot.ts` error format tests | Extend existing tests |

All tests must pass: `bun run check` (lint + typecheck + test suite).

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `docs/research/orchestration-dev-comprehensive-review.md` — Full review (Parts 1-9)
- `docs/research/agent-orchestration-sota-2026.md` — Industry SOTA research
- `plugins/rd3/skills/orchestration-dev/SKILL.md` — Current skill specification
- `plugins/rd3/skills/orchestration-dev/scripts/` — All source files
- `plugins/rd3/scripts/libs/acpx-query.ts` — Critical untested module (R1 target)
