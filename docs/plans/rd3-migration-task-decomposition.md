# rd3 Migration Report: task-decomposition

**Date**: 2026-03-23
**From**: `rd2:task-decomposition`
**To**: `rd3:task-decomposition` (new)
**Goal**: Enhance task decomposition for rd3 and define a clean boundary versus business analysis and system analysis
**Mode**: Applied (`--apply` executed)

---

## 1. Current Inventory

### Source: rd2:task-decomposition

| Property | Value |
|----------|-------|
| Location | `plugins/rd2/skills/task-decomposition/` |
| Type | Knowledge-only (no scripts) |
| Files | SKILL.md + 5 reference files |
| Total lines | 2,865 |
| Python scripts | None |
| Python tests | None |
| Python examples in markdown | Yes — integration examples (SKILL.md lines 624-697) |
| Python-specific teaching | No |

**Files:**

| File | Lines | Purpose |
|------|-------|---------|
| `SKILL.md` | 741 | Main skill definition, persona, workflow, structured output protocol |
| `references/patterns.md` | 284 | Decomposition patterns (layer, feature, phase, risk-based) |
| `references/estimation.md` | 493 | Estimation techniques (PERT, T-shirt, time-boxing, historical) |
| `references/domain-breakdowns.md` | 392 | Domain-specific breakdowns (auth, API, DB, frontend, CI/CD) |
| `references/examples.md` | 534 | Real-world decomposition examples |
| `references/task-template.md` | 421 | Task file structure guidance |

### Target: rd3:task-decomposition

**Does not exist.** `plugins/rd3/skills/task-decomposition/` is a new target to create.

### Related rd3 skills

| Skill | Relevance |
|-------|-----------|
| `rd3:tasks` | Manages task records and lifecycle. Explicitly says: "NOT for: requirement decomposition or scope analysis." Clean boundary. |
| `rd3:cc-skills` | Meta-skill for authoring skills. No overlap. |
| `rd3:cc-magents` | References `task-decomposition` in Cline adapter feature list. |

### Back-references found in source (to remove)

| Reference | Count | Category |
|-----------|-------|----------|
| `rd2:super-planner` | 4 | Agent wrapper |
| `rd2:super-architect` | 4 | Agent wrapper |
| `rd2:super-brain` | 4 | Agent wrapper |
| `rd2:super-coder` | 4 | Agent wrapper |
| `rd2:super-designer` | 4 | Agent wrapper |
| `rd2:super-code-reviewer` | 4 | Agent wrapper |
| `rd2:tasks` | 15+ | Sibling skill (update to `rd3:tasks`) |
| `rd2:tdd-workflow` | 1 | Related skill (not yet in rd3) |
| `rd2:task-decomposition` | 5+ | Self-reference (update prefix) |

### Python examples to convert

The SKILL.md contains 6 Python code blocks (lines 624-697) showing agent integration patterns like:

```python
Skill(skill="rd2:task-decomposition", args=f"requirement: {user_request}")
```

These are **not** Python-specific teaching — they are generic integration examples that should be converted to platform-neutral pseudocode or TypeScript-style calls.

---

## 2. Overlap Analysis

### Overlap with rd3:tasks

**No overlap.** rd3:tasks explicitly excludes decomposition:

> "The rd3:tasks skill manages task records and lifecycle state. It does not perform requirement decomposition, business analysis, or system analysis."

The boundary is clean:
- `task-decomposition` = WHAT to decompose, HOW to decompose, structured output
- `tasks` = File operations (create, update, delete, WBS, validation)

### Overlap with rd2:task-workflow

`rd2:task-workflow` is a 13-step implementation workflow. It is **obsolete** and will not be migrated. No content from `task-workflow` belongs in `task-decomposition`.

### Overlap with rd2:workflow-orchestration

`rd2:workflow-orchestration` handles agent coordination. It is **out of scope** for skill migration. No overlap with decomposition.

### Overlap with rd2:brainstorm

`rd2:brainstorm` converts brainstorming output to tasks. Minor conceptual adjacency but different scope:
- `brainstorm` = ideation and idea exploration
- `task-decomposition` = structured breakdown of already-understood requirements

No merge needed.

### Purity assessment

The rd2 source has **heavy coupling** to agent wrappers. Sections that must be cleaned:

1. **"Integration with agents" block** (lines 17-22): Lists 6 specific rd2 agent names — remove entirely
2. **"Related Skills" section** (lines 576-585): Lists 8 rd2-specific references — replace with generic rd3 pointers
3. **"Integration with rd2:tasks" section** (lines 587-612): Update to `rd3:tasks`
4. **"Integration with Agents" section** (lines 618-697): 6 Python code blocks showing agent-specific integration — remove or replace with generic platform-neutral patterns

---

## 3. Target Taxonomy

### Category placement

`task-decomposition` belongs in **`workflow-core`**:

| Category | Purpose |
|----------|---------|
| `workflow-core` | Task decomposition and tool selection only |

It is a **planning primitive** — used before execution starts. Not part of engineering-core (which covers execution-stage work like debugging, TDD, test cycles).

### Target skill definition

**Target purpose:** Provide structured methodology for breaking down complex requirements into actionable, implementable tasks with explicit boundaries, dependency mapping, and structured output for batch creation.

**Target boundaries:**

| Concern | In-scope | Out-of-scope |
|---------|----------|-------------|
| **Task decomposition** | Transform understood, scoped work into actionable tasks; identify dependencies, granularity, sequencing, verification; output structured JSON | - |
| **Business analysis** | Record assumptions and open questions surfaced during decomposition | Problem framing, stakeholder goals, success criteria definition, requirement clarification |
| **System analysis** | Acknowledge architectural constraints that affect task structure | Technical architecture design, system boundary definition, component interaction design, integration reasoning |
| **Task lifecycle** | Generate structured output compatible with `rd3:tasks` batch-create | File creation, WBS assignment, status management, kanban operations |
| **Estimation** | Provide estimation techniques and heuristics | Project-level scheduling, resource allocation, budget planning |

### Boundary rationale

**Why task decomposition is separate from business analysis:**
- Business analysis determines WHAT the problem is and WHY it matters
- Task decomposition determines HOW to break understood work into implementable pieces
- Conflating them makes the skill too broad and blurs the handoff point

**Why task decomposition is separate from system analysis:**
- System analysis designs the technical architecture and component interactions
- Task decomposition takes architectural decisions as input and structures the work
- Conflating them makes the skill responsible for both design and planning

**Why task decomposition is separate from rd3:tasks:**
- rd3:tasks is a CLI/file-operations skill — it manages task records
- task-decomposition is a knowledge/planning skill — it produces structured breakdowns
- This separation is already established and validated in rd3:tasks

### How the goal changes scope

The goal asks to "define a clean boundary versus business analysis and system analysis." This means:

1. Add an explicit **Boundary Definition** section to SKILL.md
2. Add guidance on what to do when decomposition surfaces business or system analysis questions (answer: record them, don't try to answer them)
3. Remove any content that bleeds into business analysis or system design territory
4. Clarify the handoff model: business/system analysis outputs feed INTO task decomposition

---

## 4. Tech Stack Simplification

### Scripts

No scripts to port. The skill is knowledge-only.

### Tests

No tests to port.

### Markdown examples to convert

| Location | Content | Action |
|----------|---------|--------|
| SKILL.md lines 624-632 | Python `Skill()` call for super-planner integration | Remove (agent-coupled) |
| SKILL.md lines 636-643 | Python `Skill()` call for super-architect integration | Remove (agent-coupled) |
| SKILL.md lines 649-657 | Python `Skill()` call for super-brain integration | Remove (agent-coupled) |
| SKILL.md lines 663-671 | Python `Skill()` call for super-coder integration | Remove (agent-coupled) |
| SKILL.md lines 677-684 | Python `Skill()` call for super-designer integration | Remove (agent-coupled) |
| SKILL.md lines 688-697 | Python `Skill()` call for super-code-reviewer integration | Remove (agent-coupled) |

**Decision:** All 6 Python code blocks are agent-wrapper integration examples. They are:
- Not Python-specific teaching
- Tightly coupled to rd2 agent names
- Not reusable as-is in rd3

**Action:** Remove all 6 blocks. Replace with one generic, platform-neutral integration example showing how any agent can use the skill's structured output.

### Examples that remain Python

None. No Python-specific teaching material exists in this skill.

---

## 5. Target Skill Decision

### Decision: Create new rd3 skill

| Factor | Assessment |
|--------|------------|
| **Existence** | `plugins/rd3/skills/task-decomposition/` does NOT exist |
| **Justification** | Clean planning skill with validated boundary vs rd3:tasks. rd3:tasks already defers to it. |
| **Goal fit** | Yes — the goal explicitly asks to enhance this skill and define boundaries |
| **Overlap risk** | None — no existing rd3 skill covers decomposition methodology |

### Why a new skill is warranted

1. rd3:tasks explicitly says decomposition is out of its scope
2. The `cc-magents` Cline adapter already references `task-decomposition` as a feature
3. Decomposition is a planning primitive needed by any planner agent
4. No existing rd3 skill covers this territory

### Why reusing an existing skill is NOT correct

- `rd3:tasks` is file operations, not planning methodology
- `rd3:cc-skills` is meta-skill authoring
- No other rd3 skill fits

---

## 6. Source-to-Target Mapping

| Source Skill | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------------|-----------------|---------|------------------|----------|--------|----------|-------|
| `rd2:task-decomposition` | Decomposition patterns, heuristics, structured output for batch task creation | None with existing rd3 | `rd3:task-decomposition` | Direct | `rewrite` | high | Knowledge-only; no scripts to port. Heavy agent-coupling to strip. Boundary definitions to add per goal. |

### Mapping details

**Why `rewrite` and not `keep`:**
- The core methodology is sound and should be preserved
- But the skill needs structural changes:
  - Strip all 6 agent-wrapper integration sections
  - Add explicit boundary definitions (business analysis, system analysis, task decomposition)
  - Update all `rd2:` references to `rd3:` equivalents
  - Convert Python integration examples to platform-neutral format
  - Remove `task-template.md` reference content that duplicates `rd3:tasks` knowledge
  - Modernize frontmatter for rd3 conventions (add `license`, `version`, `platform`, `tags`, `metadata`)

**Knowledge-only:** Yes — no scripts, no tests to port

**Python scripts to port:** None

**Python markdown examples to port:** Remove 6 agent-coupled Python blocks; no conversion needed since they are being removed rather than translated

**Tests to rewrite:** None

**Platform companions needed:** No — knowledge-only skills are platform-agnostic by nature

**Wrapper references to remove:** Yes — 24+ references to 6 rd2 agents and rd2-prefixed skills

**Goal contribution:** Direct — the source IS the skill being enhanced

---

## 7. Dependency Closure

### Missing rd3 skills referenced

| Referenced Skill | Status in rd3 | Impact |
|-----------------|---------------|--------|
| `rd3:tasks` | Exists | No blocker. Update references from `rd2:tasks` to `rd3:tasks`. |
| `rd3:tdd-workflow` | Does NOT exist | Minor. Listed as "Related Skill" only. Not a hard dependency. Migration planned in Wave 1. |

### Foundational for planner agents

`task-decomposition` is foundational for any planner/orchestrator agent. It provides the decomposition methodology that planner agents delegate to.

**No blockers:** This skill can be created independently. It has no hard dependencies on other missing rd3 skills.

### Foundational for maker/checker agents

Not directly foundational for makers/checkers. They consume task files (via `rd3:tasks`), not decomposition methodology.

### Pre-requisites for vendor wrappers

None. This is a pure planning skill, not a vendor-variant.

---

## 8. Migration Batches

### Batch for this invocation

**Batch 1a: workflow-core — task-decomposition**

| Property | Value |
|----------|-------|
| Target skill | `rd3:task-decomposition` |
| Source skills | `rd2:task-decomposition` |
| Category | `workflow-core` |
| Batch order | First (no prerequisites) |
| Blockers | None |
| Acceptance criteria | See below |

**Acceptance criteria:**

1. `plugins/rd3/skills/task-decomposition/SKILL.md` exists with rd3 frontmatter
2. Reference files ported: `patterns.md`, `estimation.md`, `domain-breakdowns.md`, `examples.md`
3. `task-template.md` dropped or significantly reduced (duplicates `rd3:tasks` knowledge)
4. Explicit boundary section defines task decomposition vs business analysis vs system analysis
5. All `rd2:` references removed or updated to `rd3:` equivalents
6. All agent-wrapper integration sections removed
7. Python integration examples removed
8. Generic platform-neutral integration example added
9. Frontmatter includes `license`, `version`, `platform`, `tags`, `metadata`
10. `expert-skill` evaluation passes or residual issues documented

### No prerequisite batches needed

This is a standalone planning skill with no hard dependencies on other missing rd3 skills.

---

## 9. Per-Skill Migration Checklist

### rd2:task-decomposition → rd3:task-decomposition

- [x] Create `plugins/rd3/skills/task-decomposition/` directory
- [x] Create `SKILL.md` with rd3-standard frontmatter
- [x] Rewrite persona section (remove rd2 agent references)
- [x] Preserve core methodology sections:
  - [x] Core Principles (granularity, dependencies, single responsibility, testable outcomes)
  - [x] Verification Protocol
  - [x] Structured Output Protocol (JSON for batch creation)
  - [x] Decomposition Heuristics
  - [x] Analysis Process
  - [x] Best Practices
- [x] Add new **Boundary Definition** section:
  - [x] Define task decomposition scope
  - [x] Define business analysis scope (out-of-scope)
  - [x] Define system analysis scope (out-of-scope)
  - [x] Document handoff model
- [x] Port reference files:
  - [x] `references/patterns.md` — ported with frontmatter added
  - [x] `references/estimation.md` — ported with frontmatter added
  - [x] `references/domain-breakdowns.md` — ported with frontmatter added
  - [x] `references/examples.md` — ported with Python→TypeScript conversion, frontmatter added
  - [x] `references/task-template.md` — dropped (duplicates rd3:tasks)
- [x] Remove agent-wrapper sections:
  - [x] "Integration with agents" block — removed
  - [x] "Related Skills" — replaced with rd3:tasks pointer
  - [x] "Integration with Agents" section — removed 6 Python blocks
- [x] Update all `rd2:` references:
  - [x] `rd2:tasks` → `rd3:tasks`
  - [x] `rd2:task-decomposition` → `rd3:task-decomposition`
  - [x] `rd2:tdd-workflow` → removed (not yet in rd3)
- [x] Generalized Validation-Aware Decomposition → "Content Quality Thresholds"
- [x] Added platform-neutral integration example (TypeScript/JSON)
- [x] Updated `see_also` to point to `rd3:tasks` only
- [x] Added Reference Gathering section (condensed from dropped task-template.md)
- [x] `expert-skill` evaluation passed (Grade B, 80/100)

---

## 10. Verification (Phase 10)

**Status:** ✅ PASSED

| Check | Result |
|-------|--------|
| Directory structure | ✅ Valid — `SKILL.md` + `references/` with 4 files |
| No stale `rd2:` references | ✅ 0 occurrences across all files |
| No agent/wrapper coupling | ✅ 0 occurrences of super-planner/coder/architect/designer/reviewer |
| Reference file count | ✅ 4 files ported: patterns.md, estimation.md, domain-breakdowns.md, examples.md |
| Frontmatter on reference files | ✅ All 4 reference files now have frontmatter |
| `task-template.md` | ✅ Dropped — duplicates rd3:tasks knowledge |

---

## 11. Expert Review Gate (Phase 11)

**Status:** ✅ PASSED with refinements

**Evaluation:** `rd3:expert-skill` graded the skill **B (80/100)** — passes threshold (70).

| Dimension | Score |
|-----------|-------|
| Frontmatter completeness | 7 — description was too long (~300 chars) |
| Trigger coverage | 5 — triggers crammed in frontmatter |
| Boundary definition | 9 — excellent IN-SCOPE/OUT-OF-SCOPE + handoff model |
| Content structure | 8 — strong hierarchy, tables, checklists |
| Reference material | 7 — substantial content, missing frontmatter |
| Cross-references | 6 — only one see_also, no inter-file links |
| Purity | 10 — no agent/wrapper coupling |
| Platform metadata | 10 — full platform list |
| Content thresholds | 9 — min 50 chars enforced |
| Structured output | 9 — comprehensive JSON schema |

**Refinements applied:**
1. ✅ Shortened frontmatter description from ~300 to ~140 chars
2. ✅ Added frontmatter to all 4 reference files with name, description, see_also
3. ✅ Added cross-reference links between reference files (patterns ↔ estimation, examples ↔ patterns/estimation/domain-breakdowns)

**Residual minor issues (accepted):**
- Content density could be improved (table-heavy sections, limited prose)
- `interactions` metadata could mention "generator" pattern (currently only declares "knowledge-only")
- No additional cross-references between reference files

These are minor and do not block the migration.

---

## 12. Open Decisions (Resolved)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | **Keep or drop `task-template.md`?** | Dropped — essential reference-gathering guidance condensed into SKILL.md "Reference Gathering" section |
| 2 | **Keep or generalize Validation-Aware Decomposition?** | Generalized to "Content Quality Thresholds" with min 50 chars for Background/Requirements |
| 3 | **How to handle `rd3:tdd-workflow` reference?** | Removed — rd3:tdd-workflow not yet created, keeping skill pure |
| 4 | **Multi-folder task organization section** | Removed — CLI details belong in rd3:tasks |

---

## Summary

✅ **Migration COMPLETE**

- **Knowledge-only** skill — no scripts or tests to port
- **No overlap** with existing rd3 skills (clean boundary with rd3:tasks)
- **No blockers** — created independently
- **Purity achieved** — all agent-wrapper coupling stripped (Rule 9 enforced)
- **Boundary definitions** — explicit IN-SCOPE/OUT-OF-SCOPE for business analysis and system analysis
- **Expert review** — Grade B (80/100), all major issues resolved

**Deliverables:**
- `plugins/rd3/skills/task-decomposition/SKILL.md` — 528 lines, rd3 frontmatter, pure skill content
- `plugins/rd3/skills/task-decomposition/references/patterns.md` — 284 lines, layer/feature/phase/risk patterns
- `plugins/rd3/skills/task-decomposition/references/estimation.md` — 493 lines, PERT/T-shirt/time-boxing/historical/expert techniques
- `plugins/rd3/skills/task-decomposition/references/domain-breakdowns.md` — 392 lines, auth/API/DB/frontend/CI/CD breakdowns
- `plugins/rd3/skills/task-decomposition/references/examples.md` — 542 lines, 3 real-world examples with TypeScript
