---
name: Refactor rd3 cc-magents into capability-aware main agent customization engine
description: Refactor rd3 cc-magents into capability-aware main agent customization engine
status: Done
created_at: 2026-04-30T21:45:07.562Z
updated_at: 2026-04-30T22:12:53.867Z
folder: docs/tasks3
type: task
priority: high
estimated_hours: 24
tags: ["magents","refactor","main-agent","platforms"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0401. Refactor rd3 cc-magents into capability-aware main agent customization engine

### Background

The verified research doc docs/main_agents.md shows that main-agent customization differs materially across Codex, Claude Code, Gemini CLI, OpenCode, Cursor, Copilot, Windsurf, Cline, Zed, Amp, Aider, OpenClaw, and provisional Antigravity/Pi support. The current plugins/rd3/skills/cc-magents implementation advertises broad support but still behaves too much like a filename/regex/keyword-based markdown converter. Keep the skill name and public operation surface, but replace internals with a capability-aware model.


### Requirements

# Requirements

- [x] Use `docs/main_agents.md` as the source material.
  - **Verdict:** MET
  - **Evidence:** `scripts/capabilities.ts`, `references/platform-compatibility.md`, `references/workflows.md`.
- [x] Replace regex/filename-driven behavior with a capability-aware model.
  - **Verdict:** MET
  - **Evidence:** `scripts/capabilities.ts`, `scripts/types.ts`, `scripts/parser.ts`, `scripts/generator.ts`, `scripts/adapt.ts`.
- [x] Support structured workspace semantics: documents, rules, personas, memories, permissions, bindings, evidence, and loss reports.
  - **Verdict:** MET
  - **Evidence:** `MainAgentWorkspace`, `GeneratedWorkspace`, and `AdaptationReport` in `scripts/types.ts`; parser/generator/adapt tests.
- [x] Preserve public operations: add/synthesize, validate, evaluate, refine, evolve, adapt.
  - **Verdict:** MET
  - **Evidence:** `scripts/synthesize.ts`, `scripts/validate.ts`, `scripts/evaluate.ts`, `scripts/refine.ts`, `scripts/evolve.ts`, `scripts/adapt.ts`, `SKILL.md`.
- [x] Add tests for platform parsing/generation, multi-file output, config output, loss reporting, and round-trip preservation.
  - **Verdict:** MET
  - **Evidence:** `tests/capabilities.test.ts`, `tests/parser.test.ts`, `tests/generator.test.ts`, `tests/cli-io-coverage.test.ts`, `tests/evaluate-validate-refine.test.ts`, `tests/synthesize-evolve.test.ts`.
- [x] Ensure command compatibility for wrappers and legacy aliases.
  - **Verdict:** MET
  - **Evidence:** `--platform` alias handling, `--to all` support, JSON `--output` reports, and alias normalization covered by `tests/cli-io-coverage.test.ts`.
- [x] `bun run check` must pass.
  - **Verdict:** MET
  - **Evidence:** Final verification run passed with 4840 tests passing, 0 failing, overall coverage 99.11% functions / 98.08% lines.


### Q&A



### Design

# Design

## Target Shape

The replacement `cc-magents` skill should be capability-aware. It keeps the public skill name and operations but replaces the old section-only implementation with a workspace model that understands:

- platform-native files and locations
- discovery and precedence
- imports and modularity
- rule activation/scoping
- multi-file output
- permission and safety policy mappings
- source confidence and verification dates
- lossy adaptation reports

## New Core Modules

- `scripts/types.ts`: shared model types and operation result contracts.
- `scripts/capabilities.ts`: platform capability registry sourced from `docs/main_agents.md`.
- `scripts/parser.ts`: markdown/frontmatter/config parsing into `MainAgentWorkspace`.
- `scripts/generator.ts`: platform-native file generation from `MainAgentWorkspace`.
- `scripts/adapt.ts`: CLI and library entrypoint for adaptation and loss reporting.
- `scripts/validate.ts`: capability-aware structural validation.
- `scripts/evaluate.ts`: quality scoring across coverage, scoping, safety, portability, evidence, and maintainability.
- `scripts/refine.ts`: native recommendations and optional markdown improvements.
- `scripts/synthesize.ts`: create new workspaces from templates.
- `scripts/evolve.ts`: propose registry/doc/test improvements from reports.

## Compatibility Strategy

Existing command names remain available. Internals may be fully replaced. Adapters should not depend on legacy golden output shape. Public outputs should be JSON-capable and human-readable by default.



### Solution

# Solution

## Context

`docs/main_agents.md` has been verified and rewritten on 2026-04-30. It should be treated as the source research material for this refactor.

The current `plugins/rd3/skills/cc-magents` implementation advertises broad platform support but still behaves too much like a filename/regex/keyword conversion tool. The refactor should keep the external skill name and command surface, but replace the internal model, adapters, references, and tests with a capability-aware main-agent customization engine.

## Problem Statement

Main-agent customization is not just "convert one markdown file into another." Platforms differ across:

- native file locations and names
- discovery behavior
- precedence behavior
- global/project/directory/path scoping
- import and modularity mechanisms
- native rule activation modes
- multi-file identity/user/memory structures
- permissions and safety policy support
- known limits
- verification confidence and source freshness

The refactored skill must model these as first-class capabilities and make platform loss/gap reporting explicit.

## Recommended Architecture

Replace the current section-only UMAM with a workspace-level model:

```typescript
interface MainAgentWorkspace {
  documents: InstructionDocument[];
  rules: AgentRule[];
  personas: PersonaProfile[];
  memories: MemoryPolicy[];
  permissions: PermissionPolicy[];
  platformBindings: PlatformBinding[];
  sourceEvidence: SourceEvidence[];
}
```

Suggested supporting types:

- `InstructionDocument`: path, platform, scope, raw markdown, parsed sections, metadata/frontmatter.
- `AgentRule`: content, activation (`always`, `glob`, `manual`, `model_decision`, `agent_requested`, `jit_subtree`), globs/paths, precedence, source document.
- `PersonaProfile`: identity, tone, role, boundaries, public metadata.
- `MemoryPolicy`: durable memory files, daily memory, load/update rules, privacy boundaries.
- `PermissionPolicy`: filesystem, shell, network, destructive action, approval rules, platform-native permission mapping where available.
- `PlatformBinding`: native files, discovery, precedence, modularity, scoping, limits, supported operations.
- `AdaptationReport`: generated files, warnings, lossy mappings, dropped features, provisional claims.

## Platform Capabilities to Encode

Use `docs/main_agents.md` as the current truth source. At minimum encode:

- Codex / AGENTS.md: directory-scoped `AGENTS.md`, nested precedence, no verified import support.
- Claude Code: `CLAUDE.md`, recursive cwd-upward discovery, subtree JIT loading, `@path` imports up to 5 hops.
- Gemini CLI: `GEMINI.md`, configurable `context.fileName`, hierarchical/JIT context, `@file` imports.
- OpenCode: `AGENTS.md`, `CLAUDE.md` fallback, `opencode.json` `instructions`, primary/subagent config, permissions.
- Cursor: `.cursor/rules/*.mdc`, rule types, root `AGENTS.md`, legacy `.cursorrules`.
- GitHub Copilot / VS Code: `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md` with `applyTo`, `AGENTS.md`.
- Windsurf: `.windsurf/rules/*.md`, trigger modes, `AGENTS.md`, global/system rules, character limits.
- Cline: `.clinerules/*.md`, conditional `paths`, supported compatibility files, recursive `AGENTS.md` behavior.
- Zed: `.rules` plus compatibility file priority list.
- Amp: hierarchical `AGENTS.md` including user/system files.
- Aider: `.aider.conf.yml` and `read:` convention files.
- OpenClaw: multi-file workspace (`SOUL.md`, `IDENTITY.md`, `USER.md`, `AGENTS.md`, `MEMORY.md`, plus optional operational files).
- Antigravity and Pi: provisional until official docs or product tests verify semantics.

## Implementation Plan

1. Create a platform capability registry.
   - Each platform declares native files, discovery, precedence, modularity, scoping, limits, feature confidence, and source URLs.
   - Avoid hardcoded assumptions in adapters.

2. Replace keyword detection with structured parsers.
   - Markdown section parser must preserve unknown sections.
   - Add frontmatter parsing for `.mdc`, Windsurf, Cline, Copilot path instructions, and OpenCode markdown agents.
   - Add config parsing/generation for `opencode.json`, `.gemini/settings.json`, and `.aider.conf.yml` where needed.

3. Redesign adapters around capabilities.
   - `parse(source) -> MainAgentWorkspace`
   - `generate(workspace, targetPlatform) -> GeneratedWorkspace`
   - `adapt(sourcePlatform, targetPlatform) -> GeneratedWorkspace + AdaptationReport`
   - Multi-file outputs must be first-class, not special cases.

4. Add loss and confidence reporting.
   - Every conversion should report mapped, approximated, dropped, and unsupported features.
   - Provisional platforms must be labeled with Low/Medium confidence and source notes.

5. Preserve the external skill interface.
   - Keep skill name `cc-magents`.
   - Keep existing operations: add, validate, evaluate, refine, evolve, adapt.
   - Keep command wrappers and external dependency shape unless absolutely necessary.
   - Internals may be replaced wholesale.

6. Update evaluation/refinement.
   - Evaluate capability coverage, rule scoping, safety policy, verification/source freshness, portability, and maintainability.
   - Refinement should propose platform-native splits (for example Cursor `.mdc` rules or Copilot path-specific instructions), not just insert markdown headings.

7. Update references and docs.
   - Replace stale platform compatibility claims with the verified matrix from `docs/main_agents.md`.
   - Add examples for common source-to-target workflows: AGENTS -> Claude, AGENTS -> Gemini, AGENTS -> Cursor, AGENTS -> Copilot, OpenClaw multi-file, OpenCode agents.

8. Rebuild tests.
   - Golden tests for each supported platform.
   - Round-trip tests preserving unknown sections.
   - Loss-report tests for unsupported features.
   - Multi-file generation tests.
   - Config file generation tests.
   - Validation tests for provisional/unverified platforms.

## Acceptance Criteria

- `docs/main_agents.md` is treated as the verified source material for platform behavior.
- `cc-magents` no longer depends on filename-only or regex-only platform inference for core behavior.
- Platform capabilities are encoded in a registry with source URLs and verification date.
- Adapters can produce multi-file outputs for OpenClaw, OpenCode, Cursor, Copilot, Windsurf, Cline, Gemini, Aider, and standard AGENTS/Claude/Codex targets.
- `adapt` emits a structured loss report.
- `evaluate` scores platform-native quality, not just generic markdown completeness.
- `refine` can recommend native splits and scoped rules.
- Existing public operations remain available.
- Tests cover all Tier 1/Tier 2 platforms and at least representative Tier 3/basic platforms.
- `bun run check` passes.

## Risks

- Some platform documentation is moving quickly; source freshness must be part of the model.
- Antigravity and Pi should not receive hardcoded behavior until official docs or reproducible product tests exist.
- Full replacement may invalidate old golden outputs; preserve command-level compatibility, not old internals.

## Research Sources

See `docs/main_agents.md` source notes. All high-confidence sources were verified on 2026-04-30.



### Plan

# Plan

1. Backfill task Design/Plan and move task to WIP.
2. Create fresh `plugins/rd3/skills/cc-magents` structure.
3. Implement capability registry and workspace model.
4. Implement parser/generator/adapt/validate/evaluate/refine/synthesize/evolve scripts.
5. Add templates, references, metadata, and SKILL.md.
6. Add focused tests for registry, parsing, generation, adaptation loss reports, validation, evaluation, refinement, synthesis, and CLI behavior.
7. Run targeted tests, typecheck, lint, and full check where feasible.
8. Update task Review/Testing and move task according to verification outcome.



### Review

# Review -- 2026-04-30

**Status:** PASS after fixes.

**Scope:** `docs/main_agents.md`, `plugins/rd3/skills/cc-magents`, and task `0401`.

**Mode:** `rd3-dev-verify 0401 --auto --fix all`.

## Findings

### P1 -- Blockers

None.

### P2 -- Warnings

1. `magent-adapt --to all --output <dir>` could overwrite colliding target filenames such as `AGENTS.md`.
   - **Status:** Fixed.
   - **Fix:** Each target platform now writes into `<output>/<targetPlatform>/...` through `writeGeneratedWorkspaceDirectory()`.
   - **Evidence:** `scripts/adapt.ts`, `scripts/io.ts`, `tests/cli-io-coverage.test.ts`.

2. Documented synthesis templates were incomplete after the refactor.
   - **Status:** Fixed.
   - **Fix:** Added `research-agent`, `content-agent`, `data-agent`, and `devops-agent` templates and regression coverage.
   - **Evidence:** `templates/research-agent.md`, `templates/content-agent.md`, `templates/data-agent.md`, `templates/devops-agent.md`, `tests/cli-io-coverage.test.ts`.

### P3 -- Info

None.

### P4 -- Suggestions

- Later iterations can deepen native platform fidelity for Cursor `.mdc` metadata, OpenCode permission schemas, Copilot path instruction splitting, and product-tested Antigravity behavior.

## Verification

- `bun test plugins/rd3/skills/cc-magents/tests --reporter=dots` passed.
- `bun run typecheck` passed.
- `bunx biome lint plugins/rd3/skills/cc-magents` passed.
- `bun run check` passed.

Final full-suite result: 4840 tests passed, 0 failed, overall coverage 99.11% functions / 98.08% lines.

## Verdict

PASS. All task requirements are met after the verification fixes.


### Testing

# Testing

- `bun test plugins/rd3/skills/cc-magents/tests --reporter=dots` passed.
- `bun test plugins/rd3/tests/workflow-docs.test.ts --reporter=dots` passed.
- `bun run typecheck` passed.
- `bunx biome lint plugins/rd3/skills/cc-magents` passed.
- `bun run check` passed after final compatibility audit.

Final full-suite result: 4840 tests passed, 0 failed, overall coverage 99.11% functions / 98.07% lines.

Additional compatibility coverage added after audit:

- `magent-add` style `--platform <platform>` is accepted as an alias for target platform.
- `magent-adapt --to all` generates all supported target outputs.
- `--output` writes JSON reports for validate/evaluate/refine/evolve flows.
- Legacy platform aliases such as `claude-md`, `gemini-md`, `cursorrules`, and `vscode-instructions` are normalized.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


