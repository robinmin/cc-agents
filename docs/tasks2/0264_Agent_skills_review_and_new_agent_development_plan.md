---
name: Agent skills review and new agent development plan
description: Agent skills review and new agent development plan
status: WIP
profile: complex
created_at: 2026-03-26T21:36:19.005Z
updated_at: 2026-03-27T00:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0264. Agent skills review and new agent development plan

### Background

#### Refined 9-Phase Workflow

Task-file-driven software development with machine-first verification (BDD) + human review gate.

| # | Phase | Specialists Involved | Output | Gate |
|---|-------|---------------------|--------|------|
| 1 | **Business & System Analysis** | analyst (request-intake skill) | Enhanced task file (Background, Requirements, Constraints) | Human approves |
| 2 | **Architecture** | `backend-architect` → `frontend-architect` (sequential) | Architecture doc | Human approves |
| 3 | **Design** | `backend-design` + `frontend-design` + `ui-ux-design` (selective per task) | Design specs | Human approves |
| 4 | **Task Decomposition** | `task-decomposition` | Subtask files with WBS | Auto-validate |
| 5 | **Implementation** | `code-implement-common` | Code + passing tests | TDD cycle |
| 6 | **Unit Testing** | `sys-testing` / `advanced-testing` | Coverage report ≥ 80% | Auto-gate |
| 7 | **Code Review** | `code-review-common` | P1 issues resolved | Human approves |
| 8 | **Functional Review** | `bdd-workflow` + `functional-review` | BDD scenario pass/fail + human quality check | Human approves |
| 9 | **Documentation** | `code-docs` | Docs updated | Auto |

**Gate philosophy**: Hybrid — phases are skipped/inserted based on task `profile` (simple / standard / complex / research) in the task file frontmatter.

---

#### Missing Skills — Detailed Analysis

| Priority | Skill | Purpose | Gap it Fills |
|----------|-------|---------|--------------|
| 1 | **`verification-chain`** | Infrastructure protocol: nodes with Maker-Checker, parallel groups, retry policies, human pause | All workflow orchestration depends on this |
| 2 | **`bdd-workflow`** | BDD scenario generation + Gherkin execution + machine verification | Functional verification without manual test authoring |
| 3 | **`functional-review`** | Phase 8 gate: verify implementation against task file using bdd-workflow | No skill reviews "did we build what was asked" |
| 4 | **`request-intake`** | Heuristic Q&A to bootstrap task file from one-liner | Entry point for the pipeline |
| 5 | **`orchestration-dev`** | Orchestrate full pipeline, read profile, skip/insert phases, delegate to verification-chain | Ties everything together |
| 6 | **`code-docs`** | Auto-generate JSDoc/TSDoc, update task file References | Documentation is manual today |

---

#### Wish List — Agents & Commands to Create

**Agents** (thin wrappers, delegate to skills):

| Agent | Delegates to | Purpose |
|-------|--------------|---------|
| `expert-request-intake.md` | `request-intake` | Bootstrap task file from one-liner |
| `expert-bdd-workflow.md` | `bdd-workflow` | Run BDD scenarios |
| `expert-functional-review.md` | `functional-review` | Verify implementation vs task file |
| `orchestrator-dev.md` | `orchestration-dev` | Orchestrate full pipeline |
| `expert-verification-chain.md` | `verification-chain` | Execute a chain manifest |

**Commands** (human-facing CLI):

| Command | Purpose |
|---------|---------|
| `/rd3:request-intake` | Bootstrap task file via guided Q&A |
| `/rd3:bdd` | Run BDD workflow on a task file |
| `/rd3:functional-review` | Run functional review on a task file |
| `/rd3:orchestration-dev` | Kick off full pipeline |
| `/rd3:cov` | Execute a chain manifest directly |

---

#### What's Already Solid

These existing skills are well-covered and don't need rework:

- `code-implement-common` — TDD + worktree implementation
- `task-decomposition` — WBS + estimation
- `code-review-common` — SECU framework, P1-P4 taxonomy
- `sys-testing` / `advanced-testing` — coverage + mutation testing
- `brainstorm` — structured ideation
- `anti-hallucination` — verification-first protocol
- `backend-architect` / `frontend-architect` — architecture design
- `backend-design` / `frontend-design` / `ui-ux-design` — design specs

---

#### Recommended Priority

```
1. verification-chain     ← infrastructure, all workflows depend on it
2. bdd-workflow           ← enables machine-first functional verification
3. functional-review      ← fills phase 8 gap
4. request-intake         ← pipeline entry point
5. orchestration-dev      ← orchestrates everything
6. code-docs              ← nice-to-have, manual docs acceptable temporarily
```

Each skill is independent except: `bdd-workflow` and `functional-review` both depend on `verification-chain`; `orchestration-dev` depends on all others.


### Requirements

#### R1: Gap Analysis Complete
All 9 workflow phases mapped to existing rd3 skills. Gaps documented with severity and impact.

**Status:** DONE — Gap analysis completed (see Background). 5/9 phases covered, 4 gaps + 1 orchestrator identified.

#### R2: Build `request-intake` Skill (Phase 1)
- Transform one-liner or vague request into fully-populated task file (Background, Requirements, Constraints, profile)
- Inputs: `task_ref`, optional `description`, optional `domain_hints[]`
- Outputs: Updated task file sections via `tasks update`; `profile` field set (simple/standard/complex/research)
- Heuristic Q&A: 3-7 questions, hybrid taxonomy (15-20 templates, LLM selects relevant ones)
- Profile assignment based on: scope size, dependency count, domain breadth
- MUST NOT overwrite existing non-empty sections without user confirmation
- MUST NOT create task files (that is `tasks create`) or design solutions (that is Phase 2-3)
- Dependencies: `rd3:tasks` only
- Acceptance: empty Background -> 100+ chars after Q&A; empty Requirements -> 3+ testable items; profile assigned correctly for 5 archetypes
- **Complexity: M (8-12h)**

#### R3: Build `bdd-workflow` Skill (Phase 8a)
- Generate BDD scenarios (Gherkin `.feature` files) from task Requirements, execute as machine-verifiable checks
- Inputs: `task_ref`, `source_paths[]`, `mode: 'generate' | 'execute' | 'full'`, optional `feature_dir`
- Outputs: `.feature` files in Gherkin syntax; JSON execution report (pass/fail per scenario/step)
- Generate mode: 1-3 BDD scenarios per requirement (happy path + edge case minimum)
- Execute mode: LLM-interpreted Gherkin steps -> delegates to verification-chain checkers:
  - `cli` checker for command outputs
  - `file-exists` checker for file assertions
  - `content-match` checker for pattern assertions
  - `llm` checker as last-resort for semantic assertions
- v1 scope: file-system and CLI assertions ONLY. No network/database assertions.
- `.feature` files persist in `tests/features/` as living documentation
- Dependencies: `rd3:verification-chain`, `rd3:tasks`
- Acceptance: 3 requirements -> 3+ feature files with valid Gherkin; execution produces JSON report; 80%+ steps use deterministic checkers
- **Complexity: L (16-24h)**

#### R4: Build `functional-review` Skill (Phase 8b)
- Verify implementation satisfies ALL task file requirements ("did we build what was asked?")
- Inputs: `task_ref`, optional `bdd_report`, optional `source_paths[]`, `review_depth: 'quick' | 'thorough'`
- Outputs: verdict (`pass | fail | partial`); per-requirement status with evidence; blocking issues list
- Workflow: parse requirements -> map BDD results -> LLM assessment for uncovered items -> compute verdict
- Evidence must be specific: file paths, line numbers, function names — not vague
- Results written to task file Review section
- Works without BDD report (LLM-only mode) — degraded but functional
- Dependencies: `rd3:bdd-workflow` (optional), `rd3:tasks`
- Acceptance: 5 requirements with 4 met -> `partial`; all met -> `pass` with evidence; results in task Review section
- **Complexity: M (8-12h)**

#### R5: Build `code-docs` Skill (Phase 9)
- Auto-generate JSDoc/TSDoc, API reference stubs, task file References, changelog entries
- Inputs: `task_ref`, `source_paths[]`, `doc_types[]`, optional `style: 'minimal' | 'comprehensive'`
- Outputs: modified source files with JSDoc; API reference markdown; updated task References; changelog entry draft
- Skip symbols with existing adequate documentation (>50 chars JSDoc)
- Generated JSDoc MUST include `@param`, `@returns` minimum; reject generic descriptions
- Use TypeScript compiler API (not grep) for accurate symbol extraction
- Dependencies: `rd3:tasks` only
- Acceptance: 5 exported functions without JSDoc -> JSDoc added to all 5; existing JSDoc preserved; API reference has TOC
- **Complexity: S (4-8h)**

#### R6: Build `orchestration-dev` Skill (Pipeline Orchestrator)
- Orchestrate full 9-phase pipeline; read task `profile`; skip/insert phases per profile matrix; manage gates
- Inputs: `task_ref`, optional `start_phase`, optional `skip_phases[]`, optional `dry_run`
- Outputs: execution log; task `impl_progress` updated per phase; final status update
- Phase execution matrix:

| Phase | simple | standard | complex | research |
|-------|--------|----------|---------|----------|
| 1. Request Intake | skip | run | run | run |
| 2. Architecture | skip | skip | run | run |
| 3. Design | skip | selective (1) | full (all 3) | full |
| 4. Task Decomposition | skip | run | run | run |
| 5. Implementation | run | run | run | run |
| 6. Unit Testing | 60% gate | 80% gate | 80% gate | 60% gate |
| 7. Code Review | skip | run | run | run |
| 8. Functional Review | skip | bdd only | bdd + functional | bdd + functional |
| 9. Documentation | skip | task-refs only | full | full |

- Human gates: AskUserQuestion with approve/reject/rework/skip (interactive); pause+command (CI)
- Rework loop: max 2 iterations before escalating to user
- v1: simple sequential delegation (no verification-chain); v2: chain manifest integration
- Dependencies: ALL phase skills
- Acceptance: simple profile -> runs only Phase 5,6 (60%); standard -> full pipeline in order; dry_run shows plan without execution; start_phase resumes correctly
- **Complexity: L (20-30h)**

#### R7: Build `orchestrator-dev` Agent + `/rd3:orchestration-dev` Command
- Thin agent wrapper (~50 lines) delegating to `orchestration-dev` skill
- Agent lists all phase skills in `skills:` frontmatter array
- Command is thin YAML frontmatter wrapper around agent
- Dependencies: `orchestration-dev` skill
- **Complexity: XS (3h total)**

#### R8: Prerequisite — Add `profile` Field to `rd3:tasks` Schema
- Support `profile: simple | standard | complex | research` in task frontmatter
- `tasks create` and `tasks update` must accept and validate profile field
- Dependencies: none (existing tasks skill)
- **Complexity: XS (2h)**

#### R9 (Nice-to-have): Additional Agents and Commands
- `expert-request-intake` agent + `/rd3:request-intake` command
- `expert-bdd-workflow` agent + `/rd3:bdd` command
- `expert-functional-review` agent + `/rd3:functional-review` command
- Each is ~30 lines thin wrapper; create when needed
- Defer `expert-verification-chain` + `/rd3:cov` to v2

### Constraints

1. All skills follow "Fat Skills, Thin Wrappers" pattern — skills contain all logic
2. Skills MUST NOT reference their associated agents or commands (circular reference rule)
3. All scripts use Bun.js + TypeScript + Biome; use `logger.*` not `console.*`
4. `bdd-workflow` v1 scope excludes network/database assertions (file-system + CLI only)
5. `orchestration-dev` v1 uses simple sequential delegation, NOT verification-chain (clean, debuggable)
6. No skill rework needed for existing Phase 2-7 skills — they are solid as-is

### Q&A

**Q1: Should request-intake questions be from a fixed taxonomy or LLM-generated?**
A: Hybrid — 15-20 question templates, LLM selects 3-7 most relevant based on input.

**Q2: How does bdd-workflow execute Gherkin steps without traditional step definitions?**
A: LLM-interpreted execution with delegation to verification-chain's deterministic checkers. LLM checker used only as last resort for semantic assertions.

**Q3: Should .feature files persist or be ephemeral?**
A: Persist in `tests/features/` as living documentation.

**Q4: How does orchestration-dev handle rework loops?**
A: Max 2 rework iterations before escalating to user for manual intervention.

**Q5: Does orchestration-dev need verification-chain in v1?**
A: No. v1 is simple sequential delegation. verification-chain integration is v2 enhancement for complex DAGs.

### Design

#### Dependency Graph
```
                    rd3:tasks (prerequisite: add profile field)
                        |
         +--------------+--------------+
         |              |              |
   request-intake   code-docs    bdd-workflow
         |                          |
         |                   functional-review
         |                          |
         +---------+----------------+
                   |
            orchestration-dev
                   |
         orchestrator-dev (agent)
                   |
         /rd3:orchestration-dev (command)
```

#### Sprint Plan
- **Sprint 1 (Weeks 1-2):** R8 (tasks profile field) + R2 (request-intake) + R5 (code-docs) — independent, immediately useful
- **Sprint 2 (Weeks 3-4):** R3 (bdd-workflow) + R4 (functional-review) — Phase 8 operational
- **Sprint 3 (Weeks 5-6):** R6 (orchestration-dev) + R7 (agent + command) — full pipeline E2E

#### Risks
| Risk | Severity | Mitigation |
|------|----------|------------|
| bdd-workflow execution non-determinism | HIGH | 80%+ steps use deterministic checkers; LLM checker as fallback only |
| orchestration-dev integration complexity | MEDIUM | v1 simple sequential; SKILL.md-driven (not TypeScript script) |
| Profile heuristics may skip needed phases | MEDIUM | Allow manual override; always show plan and confirm before running |
| Scope creep on request-intake | LOW | Hard cap: max 7 questions, max 3 Q&A rounds |
| code-docs quality | LOW | Quality check rejects generic descriptions |

### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Skill | plugins/rd3/skills/verification-chain/ | rd2:super-brain | 2026-03-26 |

### References

- Task 0265: verification-chain skill (completed)
- Existing rd3 skills: 29 skills in `plugins/rd3/skills/`
- rd2:task-workflow (13-step legacy, deprecated — reference only for orchestration-dev)


