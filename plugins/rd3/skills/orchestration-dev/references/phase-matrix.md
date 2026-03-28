# Phase Execution Matrix

This document defines which phases execute for each profile.

## Profile Types

### Task Profiles

Determine phase selection based on task complexity.

| Profile | Scope | Files | Dependencies |
|---------|-------|-------|--------------|
| **simple** | Single deliverable | 1-2 | 0-1 |
| **standard** | Moderate scope | 2-5 | 2-3 |
| **complex** | Large scope | 6+ | 4+ |
| **research** | Investigation-heavy scope | 2-6 | 2-4 |

### Phase Profiles

Run a specific phase or phase group. Used by convenience commands.

| Profile | Phases | Description |
|---------|--------|-------------|
| **refine** | 1 | Requirements refinement (refine mode) |
| **plan** | 2, 3, 4 | Architecture, design, decomposition |
| **unit** | 6 | Unit testing only |
| **review** | 7 | Code review only |
| **docs** | 9 | Documentation only |

## Phase Execution Matrix

| Phase | Name | simple | standard | complex | research | refine | plan | unit | review | docs |
|-------|------|--------|----------|---------|----------|--------|------|------|--------|------|
| 1 | Request Intake | **skip** | **run** | **run** | **run** | **run** | skip | skip | skip | skip |
| 2 | Architecture | **skip** | skip | **run** | **run** | skip | **run** | skip | skip | skip |
| 3 | Design | **skip** | skip | **run** | **run** | skip | **run** | skip | skip | skip |
| 4 | Task Decomposition | **skip** | **run** | **run** | **run** | skip | **run** | skip | skip | skip |
| 5 | Implementation | **run** | **run** | **run** | **run** | skip | skip | skip | skip | skip |
| 6 | Unit Testing | **run** (60%) | **run** (80%) | **run** (80%) | **run** (60%) | skip | skip | **run** | skip | skip |
| 7 | Code Review | **skip** | **run** | **run** | **run** | skip | skip | skip | **run** | skip |
| 8 | Functional Review | **skip** | bdd only | bdd+functional | bdd+functional | skip | skip | skip | skip | skip |
| 9 | Documentation | **skip** | **run** | **run** | **run** | skip | skip | skip | skip | **run** |

### Legend

- **skip**: Phase is not executed
- **run**: Phase is executed with default settings
- **bdd only**: Only BDD workflow executes (no LLM functional review)
- **bdd+functional**: Both BDD workflow and functional review execute

## Phase Descriptions

### Phase 1: Request Intake
**Skill:** `rd3:request-intake`

Enriches vague requests into structured task files with Background, Requirements, Constraints, and profile assignment.

**Entry criteria:** Task file with name/description only
**Exit criteria:** Background (100+ chars), Requirements (numbered), Constraints, Profile assigned

### Phase 2: Architecture
**Skill:** `rd3:backend-architect` or `rd3:frontend-architect`

Designs system architecture based on requirements.

**Entry criteria:** Requirements defined
**Exit criteria:** Architecture document with component diagram, API contracts

### Phase 3: Design
**Skills:** `rd3:backend-design`, `rd3:frontend-design`, `rd3:ui-ux-design`

Creates detailed design specifications.

**Entry criteria:** Architecture defined
**Exit criteria:** Design specs with data models, API schemas, UI wireframes

### Phase 4: Task Decomposition
**Skill:** `rd3:task-decomposition`

Breaks task into implementable subtasks.

**Entry criteria:** Requirements defined
**Exit criteria:** Subtask WBS list with dependencies

### Phase 5: Implementation
**Skill:** `rd3:code-implement-common`

Implements the solution.

**Entry criteria:** Design defined (or Requirements for simple)
**Exit criteria:** Implementation artifacts in place

### Phase 6: Unit Testing
**Skills:** `rd3:sys-testing`, `rd3:advanced-testing`

Runs tests and verifies coverage against the profile-sensitive default threshold.

**Entry criteria:** Implementation complete
**Exit criteria:** Coverage >= profile threshold, all tests pass

### Phase 7: Code Review
**Skill:** `rd3:code-review-common`

Reviews code quality.

**Entry criteria:** Implementation complete
**Exit criteria:** Review approved with no blocking issues

### Phase 8: Functional Review
**Skills:** `rd3:bdd-workflow`, `rd3:functional-review`

Verifies implementation against requirements.

**Entry criteria:** Implementation and tests complete
**Exit criteria:** Functional verdict (pass/partial/fail)

**For standard profile:** BDD only (skip LLM functional review)

### Phase 9: Documentation
**Skill:** `rd3:code-docs`

Refreshes canonical project documentation.
Any diagram added during Phase 9 must use Mermaid in fenced markdown blocks.

**Entry criteria:** Implementation complete
**Exit criteria:** Relevant canonical docs refreshed and stale statements reconciled

Canonical docs:
- `docs/01_ARCHITECTURE_SPEC.md`
- `docs/02_DEVELOPER_SPEC.md`
- `docs/03_USER_MANUAL.md`
- `docs/99_EXPERIENCE.md`

## Phase Dependencies

```
1 (Intake) [standard, complex, research]
  ├─> 2 (Architecture) [complex, research]
  │     └─> 3 (Design)
  │           └─> 4 (Decomposition) [standard, complex, research]
  │                 └─> 5 (Implementation) [all profiles]
  │                       ├─> 6 (Testing) [all profiles]
  │                       │     └─> 7 (Code Review) [standard, complex, research]
  │                       │           └─> 8 (Functional Review) [standard, complex, research]
  │                       │                 └─> 9 (Documentation) [standard, complex, research]
  │
  └─> 4 (Decomposition) [standard, complex, research — when phases 2-3 skipped]
        └─> 5 (Implementation) [all profiles]
              └─> 6 (Testing) [all profiles]
```

## Skip Phase Constraint

The planner only accepts **trailing** skipped phases. Skipping an interior phase would invalidate downstream inputs, so combinations like "skip phase 5 but keep phase 6" are rejected.

## Skip Phase Rationale

### Why simple skips phases 1-4, 7, 9
- **Phase 1 (Intake):** Already well-formed simple tasks
- **Phase 2 (Architecture):** Overkill for single-file changes
- **Phase 3 (Design):** Not needed
- **Phase 4 (Decomposition):** Already a single task
- **Phase 7 (Code Review):** Can be done during implementation
- **Phase 9 (Docs):** Minimal changes don't need docs

> **Quality Note:** The `simple` profile has no review gate. If the task touches shared code or has security implications, consider using `standard` instead.

### Why standard skips phases 2 and 3
- **Phase 2 (Architecture):** Architecture overhead not justified for moderate scope
- **Phase 3 (Design):** Design concerns are handled inline during Phase 4 decomposition

> **Design Note:** The `standard` profile jumps from Requirements (Phase 1) directly to Decomposition (Phase 4), then Implementation (Phase 5). If the task involves API design, schema changes, or multi-component integration, consider using `complex` to get explicit architecture and design phases.
