---
name: Fix orchestration-v2 preset and acpx execution issues
description: Fix preset/phases gap and acpx execution stalling in orchestration-v2
status: Done
created_at: 2026-04-08T05:55:00.000Z
updated_at: 2026-04-08T15:59:53.665Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
preset: "standard"
---

## 0361. Fix orchestration-v2 preset and acpx execution issues

### Background

During task 0353 execution, several preset/profile failures were reproduced in orchestration-v2, plus a separate delegated acpx stall:

1. **Preset selection ignores task intent**: `orchestrator run 0353 --dry-run` schedules the full/default pipeline even though [`0353_Enhance_Kanban_UI.md`](/Users/robin/projects/cc-agents/docs/tasks2/0353_Enhance_Kanban_UI.md) already declares `profile: simple`
2. **Bare-WBS task refs break subtask-aware implement flow**: later WBS extraction only matches filename paths, so normalized refs like `"0353"` fall back to single-phase execution
3. **Simple preset is internally inconsistent for fresh tasks**: `implement` depends on `decompose`, and `validatePhaseSubset()` already rejects the current preset shape
4. **Task profile enums are inconsistent across task tooling**: create/update/task-file parsing do not agree on the supported profile vocabulary
5. **acpx delegated execution can still stall**: the runtime symptom is real, but the previously documented timeout and syntax root causes are not

These issues block the 9-phase pipeline from running correctly across all platforms.

### Requirements

#### Issue 1: Preset/Phases Gap

1. **Preset Selection Precedence**: `handleRun()` currently hardcodes `const preset = options.preset ?? "default"` and never consults task frontmatter or `resolveConfig().defaultPreset`
   - Root cause: preset resolution is CLI-only today
   - Fix: Define and implement explicit precedence such as `--preset` > task frontmatter `profile` > `resolveConfig().defaultPreset` > pipeline default behavior

2. **Silent Fallback on Bare WBS**: `extractWbsFromPath()` fails on normalized refs like `"0353"` → "Could not extract WBS from task path, falling back to single phase"
   - Root cause: pattern `(\d{4})_[^/]+\.md$` does not match bare 4-digit WBS inputs
   - Fix: Add explicit handling for bare WBS numbers and keep subtask-aware implement behavior when the CLI normalizes a task ref to `"0353"`

3. **Simple Preset Behavior Must Change**: simple currently resolves to phases that violate DAG prerequisites on fresh runs
   - Evidence: `PipelineRunner.run()` already calls `validatePhaseSubset()`, so more validation will not fix the failure
   - Fix: Change the preset semantics, for example by including `decompose`, or explicitly document/enforce that simple is resume-only when prerequisites are already completed

4. **Profile Round-Trip Compatibility**: task tooling does not agree on valid profile values
   - Root cause: `tasks create`/`update` only accept `simple|standard|complex|research`, while task-file parsing accepts `refine|plan|unit|review|docs`, and orchestrator presets also use `review-only|docs-only`
   - Fix: unify the enum or add explicit mapping/translation rules so profile-driven execution remains valid end-to-end

5. **Non-Issue to Exclude**: do not scope work around a `docs/.tasks/0353.md` override
   - Evidence: the reported failure reproduces without any `docs/.tasks/0353.md`, and the later bare-WBS extraction fallback is the real breakage for this path

#### Issue 2: acpx Execution Stalling

1. **Preserve Already-Implemented Timeout and Arg Ordering**
   - `execAcpxSync()` already passes `timeoutMs` to `spawnSync`
   - `AcpExecutor.buildArgs()` already emits `acpx ... pi exec ...`
   - Existing timeout/ordering coverage already lives in `acpx-query.test.ts` and `acp.test.ts`

2. **Refocus Investigation on the Actual Stall**
   - Root cause remains unknown
   - Fix scope should start from a reproducible delegated-stall case and add instrumentation/evidence around process launch, interactive blocking, permissions, or downstream agent behavior

3. **Avoid Rework on Disproven Hypotheses**
   - Do not spend this task re-implementing timeout support or rewriting acpx command syntax unless new evidence shows a regression in those existing paths

### Q&A

| # | Question | Answer |
|---|----------|--------|
| Q1 | Severity | Critical - blocks all pipeline execution |
| Q2 | Scope | Affects `orchestration-v2` run/preset logic, `tasks` profile validation/parsing, and acpx stall instrumentation |
| Q3 | Regression risk | High - preset/profile changes alter default execution behavior and task CLI compatibility |
| Q4 | Testing approach | Add targeted tests for preset precedence, bare-WBS extraction, preset compatibility, and the real acpx stall path |

### Design

#### Component Map

| File | Issue | Fix Priority |
|------|-------|--------------|
| `plugins/rd3/skills/orchestration-v2/scripts/run.ts` | Preset selection ignores task/config defaults | Critical |
| `plugins/rd3/skills/orchestration-v2/scripts/engine/runner.ts` | Bare-WBS task refs fall back out of subtask mode | High |
| `plugins/rd3/skills/orchestration-v2/scripts/utils/subtasks.ts` | Pattern doesn't match bare WBS | High |
| `docs/.workflows/pipeline.yaml` | Simple preset dependency violation | High |
| `plugins/rd3/skills/tasks/scripts/commands/create.ts` | Profile enum too narrow | High |
| `plugins/rd3/skills/tasks/scripts/commands/update.ts` | Profile enum too narrow | High |
| `plugins/rd3/skills/tasks/scripts/lib/taskFile.ts` | Parses a broader enum than create/update accept | High |
| `plugins/rd3/scripts/libs/acpx-query.ts` | Existing timeout behavior should be preserved, not re-added | Medium |
| `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts` | Stall instrumentation / evidence capture | Medium |

#### Proposed Fixes

1. **Preset Selection** (Critical):
   ```
   // In run.ts
   // Resolve preset from CLI first, then task frontmatter, then config
   const preset = options.preset
     ?? taskFrontmatter.profile
     ?? resolveConfig(projectRoot).defaultPreset
     ?? "default";
   ```

2. **WBS Extraction** (High Priority):
   ```
   // In subtasks.ts
   // Handle both "0353" and "docs/tasks2/0353_foo.md"
   if (/^\d{4}$/.test(input)) return input;
   const match = input.match(/(?:^|\/)(\d{4})_[^/]+\.md$/);
   ```

3. **Simple Preset Semantics** (High Priority):
   ```
   // In pipeline.yaml (or preset resolution layer)
   // Make "simple" runnable on a fresh task, or explicitly mark it resume-only
   // Validation already exists; behavior must change
   ```

4. **Profile Enum Harmonization** (High Priority):
   ```
   // In tasks create/update/taskFile
   // Use one canonical profile vocabulary or a clear mapping table
   // so frontmatter, task CLI, and orchestrator presets round-trip cleanly
   ```

5. **acpx Stall Investigation** (Medium Priority):
   ```
   // In acp.ts / acpx-query.ts
   // Preserve timeout + argument ordering
   // Add diagnostics around the actual stall path instead of re-adding existing features
   ```

### Solution

Implemented and verified the non-ACP fixes originally scoped in this task:

1. **Preset selection precedence**
   - `orchestrator run` now resolves preset in the intended order:
     - explicit CLI `--preset`
     - task frontmatter `preset`
     - legacy task frontmatter `profile`
     - project `defaultPreset`

2. **Bare-WBS extraction**
   - subtask-aware execution now handles normalized refs like `"0353"` directly instead of falling back out of subtask mode

3. **Simple preset behavior**
   - the `simple` preset was changed so it is runnable on a fresh task and satisfies DAG prerequisites

4. **Preset/profile round-trip compatibility**
   - task parser, CLI, HTTP API, and orchestrator now accept both `preset` and legacy `profile`
   - canonical task-file writes normalize to `preset`

5. **Disproven non-issue excluded**
   - no work was done around a nonexistent `docs/.tasks/0353.md` override path

ACP/acpx runtime instrumentation was improved, but the broader orchestration/ACP architecture work has been intentionally split out into follow-up task `0362`.


### Plan

| # | Step | Component | Effort |
|---|------|-----------|--------|
| 1 | Implement preset selection precedence from CLI/task/config | run.ts | 2h |
| 2 | Fix bare-WBS extraction for subtask-aware implement flow | subtasks.ts / runner.ts | 1h |
| 3 | Change simple preset behavior to satisfy DAG requirements | pipeline.yaml / runner tests | 1h |
| 4 | Harmonize profile enum handling across task tooling | create.ts / update.ts / taskFile.ts | 2h |
| 5 | Add regression tests for preset/profile round-trip | tests/ | 2h |
| 6 | Reproduce delegated acpx stall and add targeted diagnostics | acp.ts / acpx-query.ts | 2h |
| 7 | Verify dry-run, preset, and delegated execution flows | E2E | 1h |

### Review

Non-ACP findings from this task are closed.

Remaining ACP-related work is no longer a patch-level bug fix. The root issue is architectural coupling between orchestration core, ACP transport, and ACP session policy. That refactor/design work has been moved to task `0362`, where the target direction is to:

- decouple orchestration core from ACP transport details
- make stateless execution the default model
- isolate sessioned ACP as an explicit opt-in capability
- introduce transport/routing boundaries before further ACP optimization


### Testing

Verified with regression coverage and full repo validation.

Evidence:

- targeted orchestration tests cover:
  - task frontmatter preset precedence
  - legacy `profile` compatibility
  - simple preset dry-run behavior
  - bare-WBS extraction
- targeted tasks tests cover:
  - valid preset vocabulary
  - invalid preset rejection
  - canonical `preset` writes with legacy `profile` compatibility
- ACP diagnostics and timeout/order-preservation tests were added separately
- full verification passed:
  - `bun run check`

Follow-up verification for ACP/orchestration architectural separation will happen under task `0362`.

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Bug Report | This task | rd3 | 2026-04-08 |
| Follow-up Task | `docs/tasks2/0362_Decouple_ACP_transport_from_orchestration-v2_core.md` | codex | 2026-04-08 |

### References

- Task 0353: Enhance Kanban UI
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts`
- `plugins/rd3/skills/orchestration-v2/scripts/utils/subtasks.ts`
- `plugins/rd3/skills/tasks/scripts/commands/create.ts`
- `plugins/rd3/skills/tasks/scripts/commands/update.ts`
- `plugins/rd3/skills/tasks/scripts/lib/taskFile.ts`
- `docs/.workflows/pipeline.yaml`
- `plugins/rd3/skills/orchestration-v2/scripts/executors/acp.ts`
- `plugins/rd3/scripts/libs/acpx-query.ts`
- Follow-up architecture task: `0362`

