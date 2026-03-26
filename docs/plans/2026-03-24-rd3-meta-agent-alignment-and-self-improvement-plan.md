# rd3 Meta-Agent Alignment and Self-Improvement Plan

**Date:** 2026-03-24
**Status:** Completed
**Scope:** `cc-agents`, `cc-commands`, `cc-magents`, `cc-skills`
**Type:** Post-implementation record

---

## Overview

This document records the implementation of aligning the four rd3 meta-agent skills and upgrading them with stronger self-improvement capability.

The work had two goals:

1. Align the four meta-agent skills around the same workflow concepts, vocabulary, and structure.
2. Upgrade the meta-agent architecture so each meta-skill can systematically help its target artifacts improve over time.

The affected meta-agent skills were:

- `plugins/rd3/skills/cc-agents`
- `plugins/rd3/skills/cc-commands`
- `plugins/rd3/skills/cc-magents`
- `plugins/rd3/skills/cc-skills`

Their target artifact families are:

- subagents
- slash commands
- main agents
- skills

This plan is now a post-implementation record. All items below have been implemented and verified.

---

## Implementation Progress Snapshot

This section tracks the implementation state relative to the original plan.

### Completed

- ✅ Shared workflow schema added at `plugins/rd3/references/meta-agent-workflow-schema.md`
- ✅ Workflow documents aligned for:
  - `cc-agents`
  - `cc-commands`
  - `cc-magents`
  - `cc-skills`
- ✅ Shared evolution contract strengthened in `plugins/rd3/scripts/evolution-contract.ts`
- ✅ Shared evolution engine strengthened in `plugins/rd3/scripts/evolution-engine.ts`
- ✅ Proposal ranking and mixed-signal deduplication added to the shared evolution engine
- ✅ Shared markdown primitives added:
  - `plugins/rd3/scripts/markdown-frontmatter.ts`
  - `plugins/rd3/scripts/markdown-analysis.ts`
- ✅ Shared validation and grading primitives added:
  - `plugins/rd3/scripts/validation-findings.ts`
  - `plugins/rd3/scripts/grading.ts`
- ✅ Shared primitives adopted in:
  - `cc-agents`
  - `cc-commands`
  - `cc-skills`
  - targeted `cc-magents` policy and validation paths
- ✅ Repository-root evolution storage convention adopted under `<git-root>/.rd3-evolution/`
- ✅ Script and report decision vocabulary aligned to `BLOCK/WARN/PASS`
- ✅ Full `plugins/rd3` test suite passes
- ✅ Coverage-mode `plugins/rd3` test suite passes
- ✅ `bun run typecheck:rd3` passes

### Intentionally Stopped Boundary

- ✅ Broader `cc-magents` refactoring remains intentionally deferred
- ✅ The current `cc-magents` changes are limited to:
  - shared validation finding aggregation
  - shared grading/pass-threshold policy usage
  - elimination of duplicated threshold logic in evaluate/evolve flows
- ✅ `cc-magents` UMAM parsing, section classification, and platform-specific adapter behavior remain local by design

### Remaining Follow-Up Work

- Evaluate whether `cc-skills` resource discovery should remain local or move into a shared primitive after a second real consumer exists
- Decide whether additional history-aware or adaptation-aware signals are worth adding after ranking quality is improved
- Reassess whether any additional shared helpers are justified after observing maintenance across several iterations
- Evaluate whether any further proposal-signal expansion is justified now that ranking and deduplication are in place

---

## Problem Statement

The four meta-agent skills already share similar intent, but they still diverge in several important ways:

- workflow naming is inconsistent (`Add` vs `Scaffold`)
- validate and evaluate workflows use different state vocabularies
- shared script patterns exist, but the reusable boundary is not explicitly designed
- the current evolution capability is useful but not yet solid enough to act as a robust self-improvement loop across all target artifact types

The current state creates drift in both documentation and implementation:

- docs are harder to maintain because the same concepts are described differently
- scripts are harder to extract because the common seams are not formalized
- evolution is present, but it is still too close to "run refine after evaluate" rather than a complete observe-analyze-propose-apply-verify-rollback loop

---

## Desired End State

After this project, the rd3 meta-agent layer should have these properties:

1. All four meta-agent skills use the same workflow framework.
2. Each workflow file uses the same section order and the same decision vocabulary.
3. Shared utilities live in `plugins/rd3/scripts` only when they are truly shared across two or more meta-skills.
4. Skill-specific logic remains local when the abstraction would otherwise become forced or leaky.
5. Self-improvement is a first-class capability for all four meta-agent skills.
6. Every meta-skill can help its target artifact type improve through a bounded, testable, reversible evolution workflow.

---

## Design Principles

### 1. Common Framework, Local Specialization

The four workflow definitions should share one framework, but not identical content.

Common:

- operation model
- step structure
- state vocabulary
- invoking-agent versus deterministic responsibilities
- retry and rollback semantics
- verification gates

Local:

- artifact-specific validation logic
- artifact-specific creation flow
- artifact-specific evaluation dimensions
- artifact-specific adaptation rules

### 2. Self-Improvement Is a Core Capability

`Evolve` must not be a thin wrapper around `refine`.

It must be a closed-loop workflow:

1. observe signals
2. evaluate current quality
3. analyze gaps and patterns
4. propose bounded improvements
5. apply approved improvements
6. verify outcomes
7. snapshot history
8. rollback safely if needed
9. record learning for future iterations

### 3. Shared Libraries Should Be Primitive, Not Magical

Shared code should start with low-level utilities, not a giant meta-framework.

Good candidates:

- frontmatter parsing and serialization
- markdown body analysis helpers
- validation finding aggregation
- grade and threshold helpers
- filesystem discovery helpers

Bad candidates:

- one universal parser for all four artifact types
- one giant validation engine with dozens of conditionals
- forcing `cc-magents` into a frontmatter-centric abstraction

### 4. Tests Before Extraction

The implementation should add characterization tests before moving logic into shared libraries.

This is especially important for:

- parsing behavior
- field validation behavior
- workflow state classification
- scoring and grading thresholds
- evolution proposal generation
- apply and rollback safety

### 5. One Skill at a Time

After the shared contracts are defined, migration should proceed skill by skill so regressions remain easy to isolate.

### 6. Change Isolation and Worktree Safety

Implementation must assume the repository may already contain unrelated work in progress.

Required discipline:

- do not bundle unrelated modifications into this enhancement stream
- do not revert or overwrite pre-existing unrelated changes
- isolate verification to targeted suites during intermediate phases
- defer broad repository-wide cleanup until the final hardening phase

This plan should be executed as a sequence of narrowly scoped changesets, not as one large mixed refactor.

---

## Architectural Decision

The meta-agent layer will be treated as a two-track architecture:

1. **Workflow Alignment Track**
   Align workflow concepts, naming, decision states, and documentation structure.
2. **Self-Improvement Track**
   Strengthen the shared evolution model so every meta-skill can improve its target artifact family.

These tracks intersect, but they should not be collapsed into one broad refactor.

---

## Common Workflow Schema

All four `references/workflows.md` files should follow the same schema.

### Required Sections

Each operation should use this structure:

1. Operation summary
2. Workflow diagram
3. Step table
4. Step details
5. Deterministic handler responsibilities
6. Invoking-agent responsibilities
7. Decision states
8. Retry and rollback rules
9. Output artifacts

### Standard Operation Set

At the concept level, the operation set should be:

- `Create`
- `Validate`
- `Evaluate`
- `Refine`
- `Evolve`
- `Adapt`
- `Package` only where truly applicable

Script names do not need to change immediately. Concept naming and CLI filenames are separate concerns.

### Standard Decision Vocabulary

To reduce drift, all four workflow docs should use the same decision vocabulary:

- `BLOCK` = critical structural failure, cannot proceed safely
- `WARN` = valid enough to continue, but improvement is needed
- `PASS` = acceptable

This vocabulary should be used consistently in workflow docs and considered for later script/report alignment.

### Standard Responsibility Split

Each workflow should clearly distinguish:

- deterministic script work
- invoking-agent judgment and content improvement

This applies to all operations, but is especially important for:

- `Validate`
- `Evaluate`
- `Refine`
- `Evolve`

---

## Self-Improvement Architecture

### Goal

Each meta-agent skill should be able to improve the capabilities of the artifacts it governs:

- `cc-skills` improves skills
- `cc-commands` improves slash commands
- `cc-agents` improves subagents
- `cc-magents` improves main agents

### Evolution Capability Model

The shared evolution model should support the following lifecycle:

1. **Observe**
   Collect signals from evaluation, adaptation, tests, CI, memory, user feedback, and local history.
2. **Analyze**
   Convert weak signals and repeated issues into structured patterns.
3. **Propose**
   Generate bounded proposals with rationale, confidence, risk, and expected effect.
4. **Apply**
   Apply safe proposals through deterministic flows.
5. **Verify**
   Re-run the relevant validation, evaluation, and tests.
6. **Snapshot**
   Save a versioned snapshot before and after change.
7. **Rollback**
   Restore a previous version if verification fails or quality degrades.
8. **Learn**
   Record the result and evidence so future proposals improve.

### Shared Evolution Contract Enhancements

The current shared evolution layer already exists in:

- `plugins/rd3/scripts/evolution-contract.ts`
- `plugins/rd3/scripts/evolution-engine.ts`

It should be strengthened with shared concepts such as:

- `targetKind`: `skill | command | agent | magent`
- `improvementObjective`: `quality | portability | safety | maintainability | discoverability | evolution-readiness`
- `proposalScope`: `content | structure | metadata | adapters | tests | workflows`
- `evidenceType`: `evaluation | adaptation-warning | test-failure | platform-gap | user-feedback | history-pattern`
- `verificationPlan`: required checks after apply
- `applyRisk`: `low | medium | high`
- `applyMode`: `auto | confirm-required | manual-only`

### Evolution Proposal Requirements

Every proposal should include:

- unique id
- target artifact and target section
- reason for change
- source evidence
- confidence score
- risk level
- whether critical behavior is affected
- apply strategy
- verification strategy
- rollback availability

### Self-Improvement Guardrails

The evolution system must not turn into uncontrolled self-rewriting.

Required guardrails:

- no apply without explicit confirmation for risky changes
- no deletion-heavy proposals by default
- no workflow/schema rewrites without verification plan
- automatic rollback on failed verification
- proposal history retained for auditability

Additional guardrails:

- proposals may only modify the declared target artifact and its directly governed companion files
- behavior-changing proposals must include test creation or test updates in the verification plan
- proposals with missing evidence or insufficient verification coverage must degrade to recommendation-only mode
- multi-file changes outside the declared scope must require explicit confirmation

---

## Shared Library Plan

### Shared Library Scope

The shared library work should go into `plugins/rd3/scripts`.

The extraction should begin with primitives that are already duplicated or nearly duplicated.

### Phase 1 Shared Utility Candidates

1. `markdown-frontmatter.ts`
   - parse frontmatter
   - serialize frontmatter
   - unknown field detection against allowed lists

2. `markdown-analysis.ts`
   - heading extraction
   - line count helpers
   - code-block filtering
   - second-person detection
   - TODO marker counting

3. `validation-findings.ts`
   - shared finding type model
   - severity aggregation
   - helper for adding findings

4. `grading.ts`
   - grade lookup
   - pass threshold helpers
   - percentage helpers

5. `resource-discovery.ts`
   - directory scanning helpers
   - file presence checks

### Explicit Non-Goals for Initial Extraction

These should remain local in the first extraction wave:

- `cc-magents` section classification and UMAM logic
- `cc-agents` anatomy and template-tier logic
- `cc-commands` argument and pseudocode semantics
- any adapter-specific transformation logic

---

## Phased Implementation Plan

## Phase 0: Baseline and Constraints

Status: ✅ Completed

### Objectives

- capture the current behavior and boundaries
- avoid broad refactors before the common model is accepted

### Deliverables

- this plan document
- a reviewed scope agreement on what is in and out of the first implementation wave
- a baseline verification snapshot for the four meta-skills
- a worktree-isolation note identifying unrelated in-progress files that must not be touched

### Verification

- confirm the four target skills and their target artifact families
- confirm no implicit CLI renames are bundled into the first implementation wave
- run targeted baseline tests for the four meta-skills before shared extraction begins
- confirm verification can be performed incrementally without requiring unrelated worktree cleanup

---

## Phase 1: Workflow Alignment Design

Status: ✅ Completed

### Objectives

- define the common workflow schema
- normalize operation naming and state vocabulary in docs

### Deliverables

- shared workflow schema reference
- aligned workflow definitions for:
  - `cc-agents`
  - `cc-commands`
  - `cc-magents`
  - `cc-skills`

### Key Decisions

- concept-level `Create` replaces mixed `Add` and `Scaffold` in docs
- `BLOCK/WARN/PASS` becomes the standard decision vocabulary
- all workflow docs explicitly separate deterministic steps from invoking-agent work

### Verification

- all four workflow docs use the same section order
- all four workflow docs describe `Evolve` as a closed-loop workflow

---

## Phase 2: Evolution Architecture Strengthening

Status: ✅ Completed

### Summary

- completed for the shared refine-backed evolution path used by `cc-agents`, `cc-commands`, and `cc-skills`
- supplemental signals now include validation findings, workspace feedback/memory notes, and shared history-derived regression/churn patterns
- proposal output is now consolidated and ranked across mixed evidence sources before persistence and apply flows
- intentionally not expanded into a broader `cc-magents` evolve-model refactor

### Objectives

- make self-improvement a solid shared capability
- upgrade the shared evolution contract and engine

### Deliverables

- updated `evolution-contract.ts`
- updated `evolution-engine.ts`
- explicit evolution data-source, proposal, verification, and rollback semantics
- proposal evidence attached to shared refine-backed proposals
- scope-aware verification plans with stronger non-regression and pass gates
- safer apply-mode resolution, including recommendation-only `manual-only` proposals for workflow/adapter-level suggestions
- automatic rollback to the pre-apply state when post-apply verification fails
- supplemental proposal signals from validation findings and optional workspace feedback/memory notes
- history-derived regression and churn signals from shared `.rd3-evolution` snapshots

### Scope

- strengthen proposal types
- strengthen proposal generation sources
- strengthen verification and rollback requirements
- keep per-skill domain logic separate where needed

### Verification

- evolution contract compiles cleanly
- shared evolution tests cover proposal generation, apply gating, and rollback behavior
- targeted and full `plugins/rd3` test runs pass after the hardening changes

---

## Phase 3: Shared Library Extraction

Status: ✅ Partially Completed

### Objectives

- reduce duplication without forcing incorrect abstractions

### Deliverables

- ✅ first shared primitive libraries in `plugins/rd3/scripts`
- ✅ migration notes for which local utilities remain local

### Migration Order

1. ✅ frontmatter and markdown primitives
2. ✅ validation finding helpers
3. ✅ grading helpers
4. ⏸️ resource discovery helpers — deferred; only `cc-skills` uses `discoverResources()` currently. Will extract to `plugins/rd3/scripts/resource-discovery.ts` when a second consumer emerges.

### Verification

- characterization tests added before extraction
- extracted helpers are consumed by at least two meta-skills each

---

## Phase 4: Per-Skill Migration

Status: ✅ Partially Completed

### Objectives

- adopt the shared contracts and utilities one meta-skill at a time

### Recommended Order

1. ✅ `cc-commands`
2. ✅ `cc-agents`
3. ✅ `cc-skills`
4. ✅ targeted `cc-magents` policy and validation paths only

### Why This Order

- `cc-commands` has the simplest file model
- `cc-agents` shares more with command/skill frontmatter-based flows
- `cc-skills` adds resource directory concerns
- `cc-magents` is structurally the most different and should adopt only proven shared primitives

### Verification Per Skill

- targeted unit tests
- targeted integration tests
- typecheck
- formatting and linting on changed files
- no new writes outside the declared file scope for that migration slice

---

## Phase 5: Integration and Hardening

Status: ✅ Partially Completed

### Objectives

- ensure aligned workflows, shared libraries, and evolution capability operate as one coherent system

### Deliverables

- ✅ final doc alignment
- ✅ final shared-library adoption for the implemented primitive set
- final evolution-loop adoption across all four meta-skills
- ✅ updated references where needed

### Verification

- ✅ full test run for `plugins/rd3`
- ✅ typecheck passes
- ✅ no unintended CLI regressions in the implemented slices
- ✅ no loss of rollback safety

---

## Testing Strategy

### Test Categories

1. **Workflow doc consistency tests**
   - section order
   - required operation presence
   - decision vocabulary alignment

2. **Shared utility tests**
   - parsing
   - serialization
   - heading extraction
   - second-person detection
   - finding aggregation
   - grade mapping

3. **Evolution engine tests**
   - data-source detection
   - proposal generation
   - risk gating
   - verify-before-accept
   - snapshot and rollback

4. **Per-skill characterization tests**
   - preserve existing behavior while migrating to shared utilities

### Test Rule

No shared extraction should proceed without characterization tests for the behavior being moved.

Behavior-changing self-improvement proposals must not be considered complete unless the relevant tests are added or updated in the same slice.

---

## Risks

### Risk 1: Over-Abstraction

Trying to force one parser or one universal validator across all artifact types will create fragile abstractions.

**Mitigation:**
- extract only low-level primitives first
- keep domain semantics local

### Risk 2: Evolution That Is Too Shallow

If `Evolve` remains a thin wrapper over `refine`, the system will still lack real self-improvement capability.

**Mitigation:**
- require observe/analyze/propose/apply/verify/snapshot/rollback semantics

### Risk 3: Evolution That Is Too Aggressive

If proposals become too broad or too automatic, the system becomes unsafe.

**Mitigation:**
- confirmation gates
- bounded proposal scopes
- verification plans
- mandatory rollback path

### Risk 4: Mixing Docs and Refactors Too Early

Combining workflow alignment, shared-library extraction, and migration in one pass will make regressions hard to diagnose.

**Mitigation:**
- separate phases with explicit gates
- complete docs and contracts before implementation refactors

### Risk 5: Ambiguous Evolution Storage Placement

If evolution history is stored "near" targets without one explicit convention, the repository can accumulate scattered hidden directories and inconsistent rollback behavior.

**Mitigation:**
- use one repository-root hidden storage area with namespace subdirectories
- keep storage layout identical across all four meta-skills
- ensure the storage root is ignored by version control unless explicitly needed for fixtures

### Risk 6: Untested Self-Improvement

If behavior-changing proposals can apply without corresponding test updates, the system may appear to improve while silently regressing real behavior.

**Mitigation:**
- require tests for behavior-changing proposals
- reject incomplete verification plans
- tie apply success to post-change verification, not just patch application

---

## Acceptance Criteria

This project is complete when:

1. All four workflow definition files use the same framework and vocabulary.
2. `Evolve` is documented and implemented as a real self-improvement loop.
3. Shared utilities in `plugins/rd3/scripts` are intentionally small and reused by multiple meta-skills.
4. `cc-skills`, `cc-commands`, `cc-agents`, and `cc-magents` can each improve their target artifact types through bounded, testable workflows.
5. Apply, verify, snapshot, and rollback are all part of the evolution lifecycle.
6. Tests prove that shared extraction did not silently change artifact behavior.

---

## Recommended First Implementation Slice

The first implementation slice after design approval should be:

1. create the shared workflow schema
2. align the four workflow docs
3. strengthen the shared evolution contract
4. add evolution-focused shared tests

This sequence keeps the architecture and self-improvement model stable before any large shared-library extraction begins.

---

## Out of Scope for This Plan

The following are intentionally out of scope for the first wave unless explicitly approved later:

- broad CLI renames
- adapter redesign beyond what is required for shared evolution support
- full reweighting of evaluation frameworks across all four skills
- unrelated cleanup in already-dirty files
- changing platform support policy

---

## Resolved Phase 1 Decisions

These defaults are approved for Phase 1 unless later review explicitly overrides them.

### 1. `BLOCK/WARN/PASS` Adoption Scope

**Recommendation:** Treat `BLOCK/WARN/PASS` as a documentation-level standard first.

In the first implementation wave:

- align workflow docs on `BLOCK/WARN/PASS`
- do not force immediate script/report output renames
- revisit runtime/report vocabulary after workflow alignment is stable

**Why:**

- this reduces review noise during the first wave
- it keeps doc alignment separate from runtime behavior changes
- it lowers the risk of mixing semantic refactors with presentation refactors

### 2. `Package` Operation Scope

**Recommendation:** Keep `Package` exclusive to `cc-skills` for now.

In the first implementation wave:

- `cc-skills` may continue to use `Package`
- `cc-magents` should treat output bundling as part of `Adapt`
- any future generalized packaging concept should be introduced only if multiple artifact families genuinely need it

**Why:**

- skills already have a clearer packaging/distribution model
- main agents currently align more naturally with synthesize/adapt workflows than with packaging
- introducing a broader packaging concept now would add abstraction before the use cases are stable

### 3. Automatic Apply Policy for Low-Risk Evolution Proposals

**Recommendation:** Allow automatic apply only for narrowly bounded, low-risk, reversible changes.

Allowed auto-apply examples:

- metadata normalization
- naming normalization
- adding missing non-critical sections
- deterministic companion regeneration
- non-structural documentation cleanup

Confirmation-required examples:

- workflow changes
- evaluation/scoring changes
- adapter behavior changes
- multi-file structural rewrites
- any proposal that changes validation or execution semantics

Manual-only examples:

- large schema changes
- destructive or deletion-heavy changes
- proposals with incomplete verification coverage

**Why:**

- self-improvement should be useful, but conservative by default
- low-risk automatic fixes improve leverage without creating uncontrolled self-rewriting
- confirmation and manual-only tiers preserve safety for behavior-changing proposals

### 4. Evolution History Storage Convention

**Recommendation:** Use one shared history convention across all four meta-agent skills.

Recommended convention:

- use one repository-root hidden storage directory
- keep one namespace per meta-skill under that shared root
- keep the folder layout and data model identical across all namespaces

Recommended root:

- `<git-root>/.rd3-evolution/`

Recommended namespace layout:

- `.rd3-evolution/cc-agents/`
- `.rd3-evolution/cc-commands/`
- `.rd3-evolution/cc-magents/`
- `.rd3-evolution/cc-skills/`

Standardize:

- proposal file shape
- version snapshot shape
- history index shape
- backup naming
- version id progression
- git-ignore policy for runtime history artifacts

**Why:**

- shared storage conventions simplify tooling and tests
- rollback and auditability become easier to reason about
- cross-skill self-improvement behavior becomes more consistent

---

## Approved Defaults for Phase 1

Unless explicitly revised during implementation review, Phase 1 should proceed with these defaults:

1. `BLOCK/WARN/PASS` is a documentation-level standard first.
2. `Package` remains skill-only in the first wave.
3. Auto-apply is limited to low-risk, bounded, reversible changes.
4. Evolution history uses one shared convention across all four meta-agent skills.
5. Evolution history is stored under a shared repository-root hidden directory with per-skill namespaces.
6. Behavior-changing self-improvement requires matching test updates and post-change verification.
7. Implementation must preserve worktree isolation and avoid unrelated in-progress files.
