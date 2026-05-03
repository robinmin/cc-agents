---
name: enhance agent skill reverse-engineering
description: Redesign rd3:reverse-engineering into a depth-driven codebase analysis skill with orthogonal focus and output controls
status: Done
created_at: 2026-05-03T02:41:44.562Z
updated_at: 2026-05-03T04:02:12.031Z
folder: docs/tasks3
type: task
priority: high
estimated_hours: 16
tags: ["reverse-engineering","analysis-core","skills","hld","diagrams"]
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0403. enhance agent skill reverse-engineering

### Background

`rd3:reverse-engineering` currently exists at `plugins/rd3/skills/reverse-engineering/` and is designed as a general codebase analysis skill. Its current contract centers on two default deliverables:

1. High-Level Design (HLD) document.
2. Critical issue audit.

That is too coarse for the way the rd3 skill ecosystem has evolved. Reverse engineering is now needed at multiple depths:

- A short briefing to identify project purpose, tech stack, entry points, and major risks.
- A structural map to explain repository organization, components, dependencies, and ownership boundaries.
- An architecture pass to explain runtime topology, module relationships, deployment shape, and cross-cutting concerns.
- A design-level pass that can document data design, key flows, APIs/contracts, ER diagrams, sequence diagrams, and UML/class-style views.
- A full reverse-engineering pass that combines architecture, design, audit, and roadmap deliverables.
- A machine-readable output format that other skills can reuse without forcing a long prose HLD.

The enhanced `rd3:reverse-engineering` should become a depth-driven, layered analysis skill. It should keep three concepts separate:

1. **Mode**: how deep the reverse-engineering pass should go.
2. **Focus**: which lens to emphasize, such as security, data, flows, dependencies, or maintainability.
3. **Format**: how to encode the output, such as markdown, JSON, or both.

It may leverage `rd3:indexed-context` when a project has `.wolf/` context available, but the reverse-engineering skill must remain fully usable without OpenWolf.

### Requirements

**In Scope**

1. Perform a focused review of the existing `rd3:reverse-engineering` skill at `plugins/rd3/skills/reverse-engineering/`.
2. Redesign `rd3:reverse-engineering` as a depth-driven skill with explicit complexity modes.
3. Preserve the public skill identity and main use case: codebase reverse engineering, HLD generation, and audit.
4. Add a clear mode vs deliverable matrix so the agent can choose the right output granularity.
5. Separate mode, focus, and format:
   - `mode` controls analysis depth.
   - `focus` controls the analysis lens.
   - `format` controls output encoding.
6. Add explicit output contracts for tech stack inventory, repository map, entry point map, component map, dependency map, data model, diagrams, critical issue audit, modernization roadmap, and machine-readable summary.
7. Add evidence rules requiring file path and line references for factual claims whenever source files are available.
8. Add graceful degradation rules for incomplete, tiny, binary-heavy, generated, vendored, or monorepo codebases.
9. Define optional `rd3:indexed-context` integration:
   - If `.wolf/anatomy.md` exists, use it for initial file-map orientation before raw reads.
   - If `.wolf/cerebrum.md` or `.wolf/buglog.json` exists, use it only as supporting context, not primary evidence.
   - If `.wolf/` is absent, proceed normally without warning unless the user explicitly asked for indexed context.
10. Update `plugins/rd3/commands/dev-reverse.md` only if necessary to expose redesigned modes.
11. Add or update tests only if implementation includes scripts or deterministic parsers. If the skill remains documentation-only, verify with static checks and skill-quality review instead.

**Out of Scope**

- Implementing code changes in analyzed target projects.
- Fixing issues found by the reverse-engineering audit.
- Creating or modifying `.wolf/` indexed-context files.
- Adding OpenWolf as a hard dependency.
- Building a full diagram renderer. Mermaid output is sufficient.
- Changing unrelated skills such as `rd3:indexed-context`, `rd3:quick-grep`, or `rd3:knowledge-extraction`.

**Mode Model**

Modes must represent analysis depth only. They must not encode action verbs (`scan`), topics (`data`, `audit`, `flow`), or output formats (`json`).

| Mode | Complexity | Purpose | Required Outputs | Optional Outputs |
|---|---:|---|---|---|
| `briefing` | 1 | Fast executive reconnaissance for "what is this repo?" | purpose hypothesis, tech stack, repo archetype, entry points, key manifests, top 3 risks/unknowns | dependency highlights |
| `structure` | 2 | Static repository and component map | repository tree summary, module/component table, ownership/boundary notes, dependency map, entry point map | simple component diagram |
| `architecture` | 3 | Runtime and system architecture documentation | architecture pattern, system context diagram, runtime topology, major flows, cross-cutting concerns, integration map | deployment view, sequence diagrams for main flows |
| `design` | 4 | Detailed design reconstruction for implementation understanding | architecture summary, data model, API/command/interface contracts, domain model, important sequence diagrams, ER diagram when data evidence exists | class/UML-style diagram, failure modes |
| `full` | 5 | Comprehensive reverse-engineering package | all `design` outputs plus quality/security audit, modernization roadmap, open questions, evidence index, machine-readable summary | per-module deep dives |

**Focus Model**

Focus is an optional lens layered on top of mode. It changes emphasis, not depth.

| Focus | Effect |
|---|---|
| `all` | Balanced coverage for the selected mode. Default. |
| `stack` | Emphasize language, framework, package manager, runtime, and build/deploy tooling. |
| `dependencies` | Emphasize internal and external dependency graph, integration points, and coupling. |
| `data` | Emphasize persistence, schemas, models, repositories, migrations, and ER diagram evidence. |
| `flows` | Emphasize request, command, job, or business process traces and sequence diagrams. |
| `api` | Emphasize HTTP routes, RPC surfaces, CLI commands, events, and public contracts. |
| `security` | Emphasize auth, authorization, secrets, validation, injection risk, and exposure boundaries. |
| `quality` | Emphasize maintainability, complexity, dead code, duplication, testability, and refactoring seams. |
| `performance` | Emphasize hot paths, blocking I/O, caching, query patterns, and scalability risks. |

**Format Model**

Format is independent from mode and focus.

| Format | Purpose |
|---|---|
| `markdown` | Human-readable default. |
| `json` | Machine-readable summary for downstream skills or automation. |
| `both` | Markdown report plus JSON summary block or output file. |

**Selection Defaults**

- Default mode: `architecture` for broad "analyze/generate HLD" requests.
- "What stack is this?" / "quick overview" -> `mode=briefing focus=stack`.
- "Explain this repo structure" -> `mode=structure focus=all`.
- "Create architecture docs / HLD" -> `mode=architecture focus=all`.
- "Create ER diagram / data model" -> `mode=design focus=data`.
- "Explain login/payment/import flow" -> `mode=design focus=flows`.
- "Audit this codebase" -> `mode=architecture focus=security|quality` unless user asks for comprehensive audit, then `mode=full`.
- "Reverse engineer everything" -> `mode=full focus=all`.
- "Return JSON" changes `format`, not `mode`.
- If a requested diagram lacks evidence, output a short "insufficient evidence" note instead of inventing structure.

**Acceptance Criteria**

- [ ] AC1: `SKILL.md` documents the supported depth modes and their required/optional outputs.
- [ ] AC2: `SKILL.md` contains a mode selection algorithm, including defaults and ambiguity handling.
- [ ] AC3: `SKILL.md` keeps mode, focus, and format orthogonal; `json`, `scan`, `data`, `flow`, and `audit` are not depth modes.
- [ ] AC4: Evidence rules require `file/path:line` citations for stack, entry point, component, data model, flow, and audit claims when source files are available.
- [ ] AC5: Diagram rules specify valid Mermaid output for architecture, ER, sequence, and class/UML-style diagrams, with fallback behavior when evidence is insufficient.
- [ ] AC6: `rd3:indexed-context` integration is optional and explicitly gated by `.wolf/` availability.
- [ ] AC7: `dev-reverse.md` exposes or documents mode selection if the public command interface needs to change.
- [ ] AC8: Any reference to non-existent scripts, files, or platform capabilities is removed or corrected.
- [ ] AC9: The redesigned skill follows fat-skill/thin-wrapper rules and does not reference associated commands from the skill body in a circular way.
- [ ] AC10: Verification passes:
  - If scripts/tests are added: `bun run check`.
  - If documentation-only: static review of changed markdown plus `rg` checks for broken script references and forbidden `console.*` in any new scripts.

**Dependencies**

| Dependency | Type | Status |
|---|---|---|
| `plugins/rd3/skills/reverse-engineering/SKILL.md` | Source artifact | Available |
| `plugins/rd3/commands/dev-reverse.md` | Command wrapper | Available |
| `rd3:indexed-context` | Optional context provider | Available |
| `rd3:quick-grep` | Supporting search pattern | Available |
| Mermaid syntax | Output format | Required for diagrams |

### Constraints

- Preserve the installed skill name: `rd3:reverse-engineering`.
- Do not introduce mandatory external dependencies.
- Do not require OpenWolf or `.wolf/` to exist.
- Do not claim diagram certainty without source evidence.
- Keep the command wrapper thin if modified.
- Use project standards: Bun.js + TypeScript + Biome for any new scripts; `logger.*`, no `console.*`.
- Do not modify `.github/workflows/`, Dockerfiles, `.env*`, or unrelated infrastructure.
- Avoid implementation drift into target-project fixing; this skill analyzes and documents only.

### Q&A

_No open Q&A. Requirement refined from the initial task plus review of current `reverse-engineering` and `indexed-context` skill contracts._

### Design

**Recommended Design: Orthogonal Reverse Engineering Controls**

The redesigned skill should separate reusable analysis phases from three user-facing controls:

1. **Mode**: analysis depth (`briefing`, `structure`, `architecture`, `design`, `full`).
2. **Focus**: analysis lens (`stack`, `dependencies`, `data`, `flows`, `api`, `security`, `quality`, `performance`, `all`).
3. **Format**: output encoding (`markdown`, `json`, `both`).

This is cleaner than the previous matrix because it avoids mixing verbs, domains, and serialization formats into one enum.

Analysis phases:

1. **Orient**: Identify project root, manifests, language/frameworks, package manager, infra files, and `.wolf/` availability.
2. **Index**: Build a bounded file map using `.wolf/anatomy.md` if available, otherwise `rg --files`/Glob.
3. **Classify**: Determine app archetype: CLI, library, frontend, backend API, fullstack, monorepo, infra repo, plugin framework, or mixed.
4. **Trace**: Locate entry points, routes/commands/jobs, service boundaries, data access, and important flows.
5. **Synthesize**: Generate depth-specific deliverables with evidence and confidence labels.
6. **Audit**: For security/quality/performance focus, or `full` mode, identify security, correctness, performance, maintainability, and architecture risks.

Mode chooses how far through the analysis ladder the skill proceeds. Focus controls what receives extra attention. Format controls whether the final output is prose, machine-readable JSON, or both.

**Output Contract**

Each output section should declare:

- **Evidence level**: high, medium, low.
- **Evidence source**: `file/path:line`, manifest, generated index, or user-provided context.
- **Confidence note**: required when inferred rather than directly observed.

**Diagram Policy**

Use Mermaid only:

- Architecture/context: `graph TD` or `flowchart LR`
- Runtime/business flow: `sequenceDiagram`
- Data model: `erDiagram`
- Class/module relationships: `classDiagram` when source language structure supports it; otherwise component graph

If the codebase does not expose enough data for a diagram, the skill should say so and emit the smallest truthful diagram rather than hallucinating missing services/entities.

**Indexed Context Integration**

`rd3:indexed-context` should be a fast path, not a dependency:

1. Check for `.wolf/anatomy.md`.
2. If present, use it to prioritize reads and reduce token usage.
3. Treat `.wolf/cerebrum.md` and `.wolf/buglog.json` as secondary context.
4. Verify important claims against source files before citing them in final deliverables.

**Command Interface Recommendation**

Update `dev-reverse.md` only if needed. Suggested public syntax:

```bash
/rd3:dev-reverse [path] [--mode briefing|structure|architecture|design|full] [--focus all|stack|dependencies|data|flows|api|security|quality|performance] [--format markdown|json|both] [--output <file>]
```

Backward compatibility:

- Existing `--focus security|architecture|all` should remain accepted.
- Map old `--focus security` to `--mode architecture --focus security`.
- Map old `--focus architecture` to `--mode architecture --focus all`.
- Map old `--focus all` to `--mode architecture --focus all` to preserve current default weight, unless the user explicitly asks for comprehensive/full output.
- Treat `--format json` as output encoding only.

### Solution

**Selected Approach: Documentation-first skill redesign, with orthogonal CLI controls**

The implementation should start by rewriting `plugins/rd3/skills/reverse-engineering/SKILL.md` into a precise depth-driven workflow. This skill currently appears documentation-only; the command wrapper references a non-Claude script path (`plugins/rd3/skills/reverse-engineering/scripts/analyze.ts`) that does not exist in the current tree. That mismatch must be corrected as part of the task.

**Brainstormed Options**

| Option | Description | Pros | Cons | Recommendation |
|---|---|---|---|---|
| A. Orthogonal depth/focus/format redesign | Rewrite `SKILL.md` and wrapper docs; no scripts | Clear mental model, keeps CLI extensible, low risk | Less deterministic testing | Recommended first step |
| B. Add deterministic analyzer script | Add Bun script that scans manifests and emits JSON | Testable, reusable by other skills | Larger scope, risks shallow parser pretending to be full analysis | Defer unless needed |
| C. Split into multiple skills | Separate scan, architecture, audit, diagrams | Strong boundaries | Over-fragments user workflow, more routing overhead | Not recommended |

Proceed with Option A unless implementation discovers existing scripts or test infrastructure that should be extended.

**Files to Review/Modify**

| File | Action | Purpose |
|---|---|---|
| `plugins/rd3/skills/reverse-engineering/SKILL.md` | Modify | Main redesigned skill contract |
| `plugins/rd3/commands/dev-reverse.md` | Modify if needed | Add `--mode` docs and remove/correct non-existent script reference |
| `plugins/rd3/skills/reverse-engineering/agents/openai.yaml` | Review/modify if needed | Keep agent metadata aligned with new modes |

**Risk Notes**

- The current command wrapper mentions a direct script path that does not exist. Leaving it in place after redesign would create a broken platform note.
- Adding too many modes without selection rules would make the skill harder to use. Mode defaults and examples are required.
- `full` mode can become token-expensive. The skill must include bounded-reading guidance and staged output.
- Reintroducing topic modes later (`data`, `audit`, `flow`) would regress the model. These belong under `focus`.

### Plan

- [x] 1. Review existing reverse-engineering artifacts
  - [x] Read `plugins/rd3/skills/reverse-engineering/SKILL.md`
  - [x] Read `plugins/rd3/commands/dev-reverse.md`
  - [x] Read `plugins/rd3/skills/reverse-engineering/agents/openai.yaml`
  - [x] Search for referenced scripts/files and verify whether they exist
- [x] 2. Redesign `SKILL.md`
  - [x] Add depth-mode matrix and mode selection algorithm
  - [x] Add separate focus matrix
  - [x] Add separate format matrix
  - [x] Add layered workflow phases
  - [x] Add deliverable-specific output contracts
  - [x] Add diagram rules and Mermaid examples
  - [x] Add evidence/confidence rules
  - [x] Add monorepo, minimal repo, generated/vendor code, and binary-heavy edge cases
  - [x] Add optional `.wolf/` / `rd3:indexed-context` integration behavior
- [x] 3. Update command wrapper if required
  - [x] Add `--mode` argument documentation
  - [x] Add `--format` argument documentation if output encoding is exposed
  - [x] Preserve existing `--focus` behavior through compatibility mapping
  - [x] Remove or correct non-existent direct script instructions
  - [x] Keep wrapper thin
- [x] 4. Align metadata
  - [x] Update `updated_at`, tags, and platform notes
  - [x] Review `agents/openai.yaml` for stale description or mode mismatch
- [x] 5. Verify
  - [x] Run `rg "scripts/analyze.ts|console\\." plugins/rd3/skills/reverse-engineering plugins/rd3/commands/dev-reverse.md`
  - [x] Run markdown/static review of changed files
  - [x] Run `bun run check` if any scripts, tests, or TypeScript files are added
  - [x] Update this task's Review and Testing sections with evidence

#### Acceptance Criteria

- [x] AC1: Depth-mode matrix exists and covers `briefing`, `structure`, `architecture`, `design`, and `full`.
- [x] AC2: `focus` is documented separately and covers at least `all`, `stack`, `dependencies`, `data`, `flows`, `api`, `security`, `quality`, and `performance`.
- [x] AC3: `format` is documented separately and covers at least `markdown`, `json`, and `both`.
- [x] AC4: Mode selection defaults are documented and unambiguous.
- [x] AC5: Deliverable contracts specify required evidence and fallback behavior.
- [x] AC6: Diagram output rules cover architecture, ER, sequence, and class/module diagrams.
- [x] AC7: Optional indexed-context integration is documented without making OpenWolf mandatory.
- [x] AC8: Existing `dev-reverse` usage remains backward compatible.
- [x] AC9: No changed documentation references non-existent implementation scripts.
- [x] AC10: Verification evidence is recorded in Review/Testing before Done.

### Review

**rd3-dev-verify — 2026-05-03T04:12:00-07:00**

Verdict: PASS.

Mode: full verification, `--auto --fix all`. Task was already `Done`, so this was treated as an explicit re-verification pass.

Phase 7 SECU findings:

| # | Severity | Dimension | Location | Finding | Recommendation |
|---|---|---|---|---|---|
| - | - | - | - | No P1/P2/P3/P4 findings in changed docs/metadata. | No fix required. |

Phase 8 traceability:

| AC | Verdict | Evidence |
|---|---|---|
| AC1: Depth-mode matrix covers `briefing`, `structure`, `architecture`, `design`, `full` | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Control Model / Mode table |
| AC2: Focus documented separately | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Focus table |
| AC3: Format documented separately | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Format table |
| AC4: Mode selection defaults unambiguous | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Mode Selection Algorithm |
| AC5: Deliverable contracts include evidence/fallback behavior | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Output Contracts, Evidence Rules, Edge Cases |
| AC6: Diagram rules cover architecture, ER, sequence, class/module diagrams | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Diagram Rules |
| AC7: Optional indexed-context integration documented | MET | `plugins/rd3/skills/reverse-engineering/SKILL.md` Indexed Context Integration |
| AC8: Existing `dev-reverse` usage remains backward compatible | MET | `plugins/rd3/commands/dev-reverse.md` Backward Compatibility |
| AC9: No changed docs reference missing implementation scripts | MET | `rg "scripts/analyze.ts|console\\." plugins/rd3/skills/reverse-engineering plugins/rd3/commands/dev-reverse.md` returned no matches |
| AC10: Verification evidence recorded | MET | Testing section includes static checks and full `bun run check` evidence |

Gate:

- `tasks check 0403`: PASS.
- `git diff --check`: PASS.
- `bun run check`: PASS, 4267 tests passed, 0 failed.

Auto-fix result: no fixes required.


### Testing

**Testing — 2026-05-03T04:12:00-07:00**

Date: 2026-05-03T04:12:00-07:00

- `rg "scripts/analyze.ts|console\\." plugins/rd3/skills/reverse-engineering plugins/rd3/commands/dev-reverse.md`
  - Result: PASS, no matches.
- `rg "dev-reverse|rd3:dev-reverse|/rd3:dev-reverse" plugins/rd3/skills/reverse-engineering/SKILL.md`
  - Result: PASS, no circular command reference in the skill body.
- `tasks check 0403`
  - Result: PASS.
- `git diff --check`
  - Result: PASS.
- `bun run check`
  - Result: PASS.
  - Evidence: lint passed, typecheck passed, 4267 tests passed, 0 failed.


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Task refinement | `docs/tasks3/0403_enhance_agent_skill_reverse-engineering.md` | Lord Robb | 2026-05-03 |
| Skill redesign | `plugins/rd3/skills/reverse-engineering/SKILL.md` | Lord Robb | 2026-05-03 |
| Command wrapper | `plugins/rd3/commands/dev-reverse.md` | Lord Robb | 2026-05-03 |
| Agent metadata | `plugins/rd3/skills/reverse-engineering/agents/openai.yaml` | Lord Robb | 2026-05-03 |

### References

- `plugins/rd3/skills/reverse-engineering/SKILL.md`
- `plugins/rd3/commands/dev-reverse.md`
- `plugins/rd3/skills/indexed-context/SKILL.md`
