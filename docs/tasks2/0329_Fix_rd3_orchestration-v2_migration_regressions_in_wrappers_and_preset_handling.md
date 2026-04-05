---
name: Fix rd3 orchestration-v2 migration regressions in wrappers and preset handling
description: Fix rd3 orchestration-v2 migration regressions in wrappers and preset handling
status: Done
created_at: 2026-04-05T00:09:04.495Z
updated_at: 2026-04-05T00:54:59.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0329. Fix rd3 orchestration-v2 migration regressions in wrappers and preset handling

### Background

A review of the recent `rd3:orchestration-v2` migration found three concrete regressions that should be addressed in one focused follow-up task.

1. Wrapper and example commands were migrated to `rd3:orchestration-v2`, but several still pass `--profile` even though the v2 CLI only recognizes `--preset`. Because unknown flags are skipped in `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts`, those invocations silently fall back to the default pipeline instead of the intended phase/task preset. This affects `plugins/rd3/commands/dev-run.md` and any related wrappers such as `jon-snow` or phase-shortcut commands that were updated mechanically but not semantically.

2. New built-in task presets such as `simple`, `standard`, `complex`, and `research` were added under `plugins/rd3/skills/orchestration-v2/references/examples/default.yaml`, but the current run path still resolves `--preset <name>` to a standalone `${preset}.yaml` file before loading `default.yaml`. As a result, commands like `orchestrator run 0274 --preset standard --dry-run` currently fail trying to open `standard.yaml`, making the newly added presets unreachable.

3. At least one fallback example in `plugins/rd3/commands/dev-run.md` still points to the removed `plugins/rd3/skills/orchestration-dev/scripts/run.ts` entrypoint. That means non-Claude fallback usage for Codex/OpenCode/Gemini is broken even if the main skill name was renamed correctly.

This task should consolidate the migration cleanup so the command layer, CLI semantics, examples, and preset model are aligned instead of patched piecemeal.


### Requirements

- Update all migrated wrappers, docs, examples, and shortcut commands that currently pass `--profile` so they use the actual v2 CLI contract consistently
- Audit the v2 command surface and decide whether `--profile` should be removed entirely, rejected explicitly with a clear error, or supported as a compatibility alias; document and test the chosen behavior
- Fix preset resolution so built-in presets defined inside `references/examples/default.yaml` are actually runnable via `--preset <name>`
- Preserve support for file-based preset selection where intended, but disambiguate file presets versus named presets so both modes behave predictably
- Ensure `orchestrator run <task> --preset standard --dry-run` and equivalent wrapper flows resolve to the intended preset instead of failing on `${preset}.yaml` lookup
- Replace all remaining fallback paths or examples that reference `plugins/rd3/skills/orchestration-dev/scripts/run.ts` with the correct v2 entrypoint
- Update command/help text and examples in `plugins/rd3/commands/dev-run.md` and any related command or agent wrappers so operator guidance matches actual behavior
- Add or update tests covering: CLI flag parsing, preset resolution for built-in named presets, backward-compatibility behavior if any alias is kept, and wrapper/example correctness
- Verify the final behavior end-to-end with representative dry-run examples for unit-style phase presets and task-complexity presets
- Keep the migration user-facing: silent fallback to the default DAG for mistyped or deprecated flags should not remain possible unless there is an intentional compatibility policy with explicit visibility


### Q&A

- **Should `--profile` remain supported?** Prefer not as the primary contract. The clean target is `--preset`, but the implementation should make a deliberate choice: either reject `--profile` with a clear migration error or support it temporarily as an explicit compatibility alias with tests and deprecation messaging.
- **Why is silent fallback the main defect?** Because operators believe they selected a constrained workflow, but the parser quietly runs the default DAG. That creates incorrect execution rather than a loud, debuggable failure.
- **What kinds of presets need to coexist?** There are at least two categories: named presets embedded in `default.yaml` such as `simple`/`standard`/`complex`/`research`, and file-backed presets selected from separate YAML files. The CLI contract needs to distinguish these paths predictably.
- **What should happen if a preset name matches both an embedded preset and a file name?** The precedence must be defined explicitly and documented. Recommended order: exact named preset in the active/default pipeline config first, explicit file path second, and implicit `<name>.yaml` lookup only if that behavior is intentionally retained.
- **What should wrappers do?** Thin wrappers and docs should mirror the true CLI surface exactly. They should not translate concepts loosely or rely on deprecated flags that the parser ignores.
- **What is the audit scope?** At minimum: `plugins/rd3/commands/dev-run.md`, `jon-snow` routing or docs that mention orchestration invocation, phase shortcut wrappers, examples under `orchestration-v2`, and any fallback Bash examples for non-Claude environments.
- **Should this task change user-facing docs only, or runtime behavior too?** Both. Documentation-only cleanup would leave the preset execution bug unresolved, and runtime-only cleanup would leave broken operator guidance behind.
- **What counts as done?** A dry-run using a wrapper/example with a constrained preset must resolve to the intended pipeline, built-in task presets must execute without looking for missing YAML files, and no docs/examples should reference the removed `orchestration-dev` runner.


### Design

#### Proposed Design

1. **Normalize the CLI contract**
   - Make `--preset` the canonical flag for orchestration-v2.
   - Decide explicitly how to handle `--profile`:
     - preferred: fail fast with a migration message that tells the operator to use `--preset`
     - acceptable temporary bridge: treat `--profile` as a compatibility alias and emit visible deprecation output
   - Do not allow unknown preset-selection flags to be silently ignored.

2. **Split preset resolution into two explicit modes**
   - **Named preset mode**: resolve preset names declared inside the loaded/default pipeline document, including entries under `default.yaml`.
   - **File preset mode**: resolve an explicitly requested pipeline file or optional file-based preset source when that behavior is desired.
   - The resolver should not assume every `--preset <name>` maps to `${name}.yaml` before checking built-in definitions.

3. **Recommended resolution order**
   - First: built-in preset names defined in the active/default pipeline config.
   - Second: explicit file path or explicitly file-qualified value.
   - Third: optional legacy implicit file lookup if the project still wants that behavior.
   - If no mode resolves, return a clear error describing what was checked.

4. **Wrapper and documentation alignment**
   - Audit all wrappers/examples that were migrated from v1/dev semantics.
   - Update command docs so examples use the same flag names and behaviors the runtime actually supports.
   - Replace all fallback paths that still reference `plugins/rd3/skills/orchestration-dev/scripts/run.ts`.

5. **Tests and verification**
   - Add parser tests for `--preset` and any intentional `--profile` compatibility behavior.
   - Add preset resolution tests proving built-in named presets from `default.yaml` work.
   - Add regression tests proving wrapper/example command strings resolve to the intended preset rather than the default DAG.
   - Add negative tests proving unknown or deprecated flags fail visibly instead of silently changing workflow scope.

#### Implementation Notes

- Keep the command layer thin: wrappers should pass through the official CLI contract rather than inventing their own terminology.
- Prefer one shared preset-resolution utility so parser, runner, and docs examples converge on the same semantics.
- Treat this as migration-hardening work, not a broad redesign of orchestration-v2.

#### Suggested Execution Order

1. Fix parser/flag semantics.
2. Fix preset resolution logic.
3. Update wrappers and docs.
4. Add regression tests.
5. Run representative dry-run verification for both phase-style and task-complexity presets.


### Solution

**Regression 1 — `--profile` vs `--preset`:**
- `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts`: Kept `--profile` as an explicit compatibility alias for `--preset`, but changed the parser contract so unknown flags are collected and later rejected instead of being silently skipped.
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts` `handleRun()`: Kept the visible deprecation warning for `--profile`, and now fails with `EXIT_INVALID_ARGS` when a mistyped preset-selection flag or unknown preset is provided.
- Wrapper and documentation updates remain in place across `plugins/rd3/commands/dev-run.md`, `dev-unit.md`, `dev-plan.md`, `dev-review.md`, `dev-refine.md`, `dev-docs.md`, `dev-verify.md`, and `plugins/rd3/agents/jon-snow.md` so the canonical examples all use `--preset`.

**Regression 2 — Preset resolution (built-in presets unreachable):**
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts` `resolvePipelineFile()`: Reworked resolution into explicit modes so both preset categories behave predictably.
  - Explicit `--file` and project-local `docs/.workflows/pipeline.yaml` keep named-preset semantics within that pipeline.
  - Standalone bundled files like `security-first.yaml`, `review.yaml`, and `docs.yaml` are selected first when the preset name matches a real file.
  - Built-in task presets such as `simple`, `standard`, `complex`, and `research` fall back to `references/examples/default.yaml` only if that preset is actually declared there.
  - Unknown preset names now fail loudly instead of drifting into the default DAG.

**Regression 3 — Stale entrypoint reference:**
- `plugins/rd3/commands/dev-run.md` fallback Bash example was corrected twice: first to the v2 entrypoint, then to the full usable invocation with the required `run` subcommand: `bun plugins/rd3/skills/orchestration-v2/scripts/run.ts run <task-ref> --preset <name> [options]`.

**Tests:**
- `plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts`: Updated parser/validation tests to assert unknown flags are recorded and rejected, while keeping `--profile` compatibility coverage.
- `plugins/rd3/skills/orchestration-v2/tests/commands.test.ts`: Added broader parser validation coverage for unknown option rejection.
- `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts`: Added/updated dry-run regressions for built-in presets (`standard`, `simple`, `complex`), standalone file-backed presets (`security-first`, `review`), `--profile` deprecation messaging, unknown flag rejection, and unknown preset rejection.

**Verification:**
- Focused orchestration-v2 verification passed:
  - `bun test plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts plugins/rd3/skills/orchestration-v2/tests/commands.test.ts plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts plugins/rd3/skills/orchestration-v2/tests/cli.test.ts`
  - Result: `199 pass, 0 fail`
- `bun run typecheck` passed.
- `biome format` / `biome lint` were run on the touched files with no further fixes required.
- Audit confirms no remaining `orchestration-dev/scripts/run.ts` references in the orchestration migration surface, and the surviving `--profile` handling in orchestration-v2 is now an intentional, tested compatibility alias rather than an accidentally ignored flag.

### Plan



### Review

- Addressed all three external review findings:
  - standalone preset files were restored and tested
  - silent success for mistyped flags was removed
  - the non-Claude fallback example now includes the required `run` subcommand


### Testing

- `bun test plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts plugins/rd3/skills/orchestration-v2/tests/commands.test.ts plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts plugins/rd3/skills/orchestration-v2/tests/cli.test.ts`
- `bun run typecheck`
- Note: running only the focused suite still exits non-zero under Bun’s repo-wide coverage threshold, even when all targeted tests pass. Functional verification for this task was taken from the passing test results plus typecheck.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Code | `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/skills/orchestration-v2/scripts/run.ts` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-run.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-unit.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-plan.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-review.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-refine.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-docs.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/commands/dev-verify.md` | rd3-super-coder | 2026-04-05 |
| Code | `plugins/rd3/agents/jon-snow.md` | rd3-super-coder | 2026-04-05 |
| Tests | `plugins/rd3/skills/orchestration-v2/tests/cli-commands.test.ts` | rd3-super-tester | 2026-04-05 |
| Tests | `plugins/rd3/skills/orchestration-v2/tests/commands.test.ts` | rd3-super-tester | 2026-04-05 |
| Tests | `plugins/rd3/skills/orchestration-v2/tests/run-cli-integration.test.ts` | rd3-super-tester | 2026-04-05 |


### References

