---
name: Fix cc-commands code review issues (18 issues: 6 HIGH, 7 MEDIUM, 8 LOW)
description: { { DESCRIPTION } }
status: Done
created_at: 2026-03-16 16:17:43
updated_at: 2026-03-16 17:50:44
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0219. Fix cc-commands code review issues (18 issues: 6 HIGH, 7 MEDIUM, 8 LOW)

### Background

Comprehensive code review of plugins/rd3/skills/cc-commands/ found 18 issues across 3 severity levels. All 101 existing tests pass. The codebase is pure TypeScript/Bun. Issues range from incorrect imports and regex bugs (HIGH) to code duplication (MEDIUM) to missing tests and features (LOW).

### Requirements

1. Fix all 6 HIGH severity issues (H1-H6): type import bug, whitespace collapsing, regex mismatches, false positive detection
2. Fix all 7 MEDIUM severity issues (M1-M7): deduplicate functions, fix TOML escaping, fix argument conversion, lazy adapter init
3. Fix all 8 LOW severity issues (L1-L8): create slash commands, test fixtures, missing tests, dead code, unused flags
4. All 101 existing tests must pass after each batch of fixes
5. Run full test suite after all fixes complete

### Q&A

[Clarifications added during planning phase]

### Design


## Design

No architectural design needed. All fixes are prescribed by the code review findings. The existing architecture is maintained -- only bugs, inconsistencies, and missing features are addressed.

### Solution


## Approach

Fix all 18 code review issues in 3 sequential batches ordered by severity: HIGH (bugs/correctness) first, then MEDIUM (inconsistencies), then LOW (missing features/polish). Each batch is dispatched to super-coder with explicit instructions. Tests are verified after each batch.

## Key Decisions

- **Batch execution**: 3 batches (HIGH -> MEDIUM -> LOW) rather than 18 individual tasks, since many fixes are small and interdependent
- **No decomposition needed**: Issues are well-defined with specific file locations and fix descriptions
- **Skip Pre-production**: Code review already provides the architecture analysis -- fixes are prescribed
- **Skip Post-production**: Existing 101-test suite serves as quality gate; manual review not needed for prescribed fixes

## Batch Plan

### Batch 1: HIGH severity (H1-H6) -- Bugs & Correctness
- H1: `utils.ts` - Separate type imports from value imports
- H2: `refine.ts:335` - Remove/fix whitespace collapsing regex
- H3: `refine.ts:99` - Fix migration description insertion
- H4: `refine.ts:231` - Fix argument-hint injection position
- H5: `evaluate.ts:291-296` - Filter non-prose lines in imperative detection
- H6: `claude.ts:41`, `gemini.ts:145`, `antigravity.ts:102` - Fix shell command regex

### Batch 2: MEDIUM severity (M1-M7) -- Inconsistencies
- M1: Delete duplicate `convertToImperative()` from refine.ts, import from base.ts
- M2: Delete duplicate `inferArgs()` from adapt.ts, use base.ts version
- M3: Add documentation note about basic scope percentage behavior
- M4: Add TOML escaping in gemini.ts
- M5: Fix codex.ts shell command regex and preserve command text
- M6: Fix openclaw.ts argument syntax conversion mode
- M7: Lazy-initialize adapters in adapt.ts

### Batch 3: LOW severity (L1-L8) -- Missing Features & Polish
- L1: Create slash commands for command-add, command-evaluate, command-refine, command-adapt
- L2: Create tests/fixtures/ directory with sample command files
- L3: Add tests for scaffold.ts, validate.ts, refine.ts, adapt.ts
- L4: Fix dead code in evaluate.ts:221
- L5: Implement --platform flag in scaffold.ts
- L6: Implement --from-eval option in refine.ts
- L7: Create AdapterRegistry class
- L8: Fix duplicate imports in adapters/index.ts

## Files to Modify
- `plugins/rd3/skills/cc-commands/scripts/utils.ts`
- `plugins/rd3/skills/cc-commands/scripts/evaluate.ts`
- `plugins/rd3/skills/cc-commands/scripts/refine.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapt.ts`
- `plugins/rd3/skills/cc-commands/scripts/scaffold.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/base.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/index.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/claude.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/codex.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/gemini.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/openclaw.ts`
- `plugins/rd3/skills/cc-commands/scripts/adapters/antigravity.ts`
- New: `plugins/rd3/commands/command-add.md`, `command-evaluate.md`, `command-refine.md`, `command-adapt.md`
- New: `plugins/rd3/skills/cc-commands/tests/fixtures/`

## Acceptance Criteria
- All 6 HIGH issues resolved with correct behavior
- All 7 MEDIUM issues resolved
- All 8 LOW issues resolved
- All 101 existing tests pass after each batch
- New tests added for previously untested modules

### Plan


## Execution Plan

1. **Batch 1 - HIGH severity (H1-H6)**: Dispatch super-coder to fix all 6 correctness bugs. Run tests.
2. **Batch 2 - MEDIUM severity (M1-M7)**: Dispatch super-coder to fix all 7 inconsistencies. Run tests.
3. **Batch 3 - LOW severity (L1-L8)**: Dispatch super-coder to add missing features and polish. Run tests.
4. **Final verification**: Run full test suite, update task status.

## Workflow
- Template: W4 (bugfix) with --skip-design
- Mode: --semi (checkpoint after planning)
- Pre-production: Skipped (review already done)
- Maker: super-coder (3 dispatches)
- Post-production: Skipped (test suite is quality gate)

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |

### References

[Links to docs, related tasks, external resources]
