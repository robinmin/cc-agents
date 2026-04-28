---
name: create new agent skill product-management
description: create new agent skill product-management
status: Done
created_at: 2026-04-28T06:49:49.763Z
updated_at: 2026-04-28T21:41:55.429Z
folder: docs/tasks2
type: task
impl_progress:
  planning: completed
  design: pending
  implementation: completed
  review: completed
  testing: completed
---

## 0391. create new agent skill product-management

### Background

The rd3 ecosystem already has foundational infrastructure for feature tracking and task management:

- **`rd3:feature-tree`** — hierarchical feature trees with SQLite persistence, WBS-linked status roll-up, and advisory scope modeling
- **`rd3:tasks`** — markdown task files with WBS numbering, kanban boards, and artifact management
- **`rd3:task-decomposition`** — structured methodology for breaking requirements into implementable subtasks with dependency mapping and effort estimation

**Gap:** No skill exists to orchestrate **product-level** decisions — feature prioritization, PRD generation, strategy-driven decomposition, and stakeholder-oriented output. The current infrastructure handles *execution mechanics* but not *product thinking*.

**Goal:** Create `rd3:product-management` (under `plugins/rd3/skills/product-management/`) as an orchestration skill that layers product management workflows on top of existing infrastructure. It should:

1. Maintain a project-wide feature tree via `rd3:feature-tree` (already has SQLite persistence)
2. Export the feature tree as a structured PRD document
3. Coordinate feature decomposition → task decomposition using strategy profiles (MVP, standard, mature)
4. Apply PM frameworks (RICE, MoSCoW, JTBD, Kano) for prioritization
5. Provide adaptive requirements elicitation (expertise-level-aware Q&A)

**Principle:** Leverage existing infrastructure. Only extend `rd3:feature-tree` or `rd3:task-decomposition` when the new skill's workflow requires capabilities they don't yet provide.

#### Vendor Skill Analysis

Eight vendor skills were collected for reference. Filtering results:

| Vendor Skill | Verdict | Value Extracted |
|---|---|---|
| `vendors/babysitter/library/specializations/product-management` | ✅ **Primary reference** | 12 PM roles, 15 skills, processes backlog with RICE/MoSCoW/roadmap/PRD flows |
| `vendors/antigravity-awesome-skills/skills/product-manager-toolkit` | ✅ **High value** | RICE scoring scripts, interview analyzer, PRD templates, prioritization calculator |
| `vendors/babysitter/library/methodologies/maestro/agents/product-manager` | ✅ **High value** | Adaptive interviewing, expertise-level detection, clear role boundaries (PM never writes tech specs) |
| `vendors/babysitter/library/methodologies/bmad-method/agents/product-manager` | ✅ **High value** | PRD creation through discovery, MoSCoW/RICE, MVP scope definition, JTBD framework |
| `vendors/antigravity-awesome-skills/skills/product-manager` | ✅ **Reference** | 6 knowledge domains, 30+ frameworks catalog, 32 SaaS metrics with formulas |
| `vendors/babysitter/library/methodologies/metaswarm/agents/product-manager` | ⚠️ **Partial** | Use case validation + scope alignment concepts only (narrow: design review gate approver) |
| `vendors/antigravity-awesome-skills/skills/product-design` | ❌ **Filtered out** | UI/UX design systems (Apple-style), design tokens, Figma — visual design domain, not PM |
| `vendors/babysitter/library/specializations/domains/.../production-manager-agent` | ❌ **Filtered out** | Live performance production (stage management, artist relations, venue ops) — unrelated domain |

### Requirements

**R1. Skill structure:** Create `plugins/rd3/skills/product-management/SKILL.md` following rd3-cc-skills conventions (frontmatter, When to Use, Quick Start, Workflow, references/).

**R2. Core workflows:** The skill must implement these PM workflows:
- **Feature intake:** Elicit and structure new feature ideas into the feature tree
- **Prioritization:** Apply RICE and/or MoSCoW scoring to feature tree nodes
- **PRD export:** Generate a structured PRD markdown document from the feature tree (problem → solution → success metrics → acceptance criteria → out-of-scope)
- **Strategy-driven decomposition:** Decompose features into tasks using strategy profiles:
  - `mvp` — minimal scope, fastest time-to-value, skip nice-to-haves
  - `standard` — balanced scope with proper testing and documentation
  - `mature` — full scope with edge cases, performance, accessibility, observability
- **Requirements elicitation:** Adaptive Q&A workflow (borrowing from maestro's expertise-level detection) for fleshing out vague feature descriptions

**R3. Infrastructure integration:**
- Use `rd3:feature-tree` (ftree CLI) for all feature tree CRUD operations — do NOT reimplement tree management
- Use `rd3:task-decomposition` patterns when breaking features into tasks
- Use `rd3:tasks` CLI for task file creation
- If any integration gap is discovered (e.g., ftree lacks a needed command), document it and propose the extension rather than building a workaround

**R4. Framework knowledge:** Embed knowledge of these PM frameworks (from vendor analysis) as reference material in `references/`:
- RICE scoring (reach × impact × confidence / effort)
- MoSCoW prioritization (must/should/could/won't)
- Jobs-to-be-Done (JTBD) for requirements elicitation
- User story mapping for feature → story decomposition
- PRD templates (standard, one-pager, feature brief)

**R5. Thin wrapper subagent:** Create `rd3:super-pm` as a thin wrapper agent (~50-100 lines) that delegates to `rd3:product-management` skill. It should:
- Route PM-related requests (prioritize, PRD, roadmap, feature intake, decomposition strategy)
- Follow cc-agents naming convention: `plugins/rd3/agents/super-pm.md`

**R6. Quality gates:**
- Run `rd3:expert-skill` to evaluate `rd3:product-management` — fix all issues found
- Run `rd3:expert-agent` to evaluate `rd3:super-pm` — fix all issues found
- Final comprehensive review of both deliverables — resolve all remaining issues

**R7. Acceptance criteria:**
- `SKILL.md` passes rd3-cc-skills validation (correct frontmatter, structure, cross-references)
- `super-pm.md` passes rd3-cc-agents evaluation (thin wrapper, proper delegation, naming)
- All PM workflows are documented with concrete step-by-step procedures
- ftree integration is verified (the skill's Quick Start actually works with ftree CLI)
- No vendor skill code is copied verbatim — only patterns and knowledge are adapted

### Constraints

- **C1.** Must use Bun.js + TypeScript for any new scripts (per cc-agents tech stack)
- **C2.** Must not break existing rd3:feature-tree, rd3:tasks, or rd3:task-decomposition functionality
- **C3.** The skill should be self-contained within `plugins/rd3/skills/product-management/` (references/ subfolder allowed)
- **C4.** The super-pm agent must be <100 lines — it's a routing wrapper, not a knowledge container
- **C5.** Vendor scripts (Python-based RICE calculators, etc.) must be ported to TypeScript or replaced with framework knowledge — do not depend on Python

### Q&A

*Auto-mode: skipped interactive Q&A. Requirements synthesized from task content and vendor analysis.*

### Design

**Architecture: Fat Skill + Thin Agent**

```
plugins/rd3/
├── skills/product-management/
│   ├── SKILL.md                    # Core skill (all PM workflow logic)
│   └── references/
│       ├── frameworks.md           # RICE, MoSCoW, JTBD, Kano, User Story Mapping
│       ├── prd-templates.md        # Standard PRD, One-Pager, Feature Brief
│       ├── elicitation.md          # Adaptive Q&A patterns (maestro-inspired)
│       └── decomposition-strategies.md  # MVP/Standard/Mature strategy profiles
└── agents/
    └── super-pm.md                 # Thin wrapper (~80 lines), routes to skill
```

**Integration model:**

```
User request
    → rd3:super-pm (agent, routing)
        → rd3:product-management (skill, workflows)
            → ftree CLI (feature tree CRUD)
            → rd3:task-decomposition (break into tasks)
            → rd3:tasks CLI (task file creation)
```

**Key design decisions:**
1. **No scripts needed** — the skill is pure markdown knowledge + workflow procedures. ftree CLI handles all deterministic operations.
2. **Strategy profiles as reference docs** — MVP/Standard/Mature decomposition strategies live in `references/decomposition-strategies.md` as decision trees, not code.
3. **PRD export is a workflow, not a script** — the skill documents how to read ftree export JSON and transform it into PRD markdown. The agent executes this.
4. **Elicitation is checklist-driven** — adaptive Q&A patterns from maestro are encoded as decision trees in `references/elicitation.md`.

### Solution

## Solution

**Subtask decomposition (6 tasks):**

| WBS | Title | Depends On | Status |
|-----|-------|------------|--------|
| 0392 | Create product-management SKILL.md scaffolding and core workflows | — | Backlog |
| 0393 | Create product-management reference documents | — | Backlog |
| 0394 | Create super-pm thin wrapper agent | — | Backlog |
| 0395 | Evaluate and fix product-management skill | 0392, 0393 | Backlog |
| 0396 | Evaluate and fix super-pm agent | 0394 | Backlog |
| 0397 | Final comprehensive review | 0395, 0396 | Backlog |

**Parallelization:** 0392 + 0393 + 0394 can run in parallel. 0395 waits for 0392+0393. 0396 waits for 0394. 0397 waits for 0395+0396.


### Plan

**Subtask 1: Create skill scaffolding + SKILL.md** (estimated: 3h)
- Scaffold `plugins/rd3/skills/product-management/` via rd3-cc-skills
- Write SKILL.md with: frontmatter, When to Use, Quick Start, 5 workflow procedures, ftree integration patterns
- Workflows: feature-intake, prioritization, prd-export, strategy-decomposition, requirements-elicitation
- Deliverable: SKILL.md passes `bun scripts/validate.ts`

**Subtask 2: Create reference documents** (estimated: 2h)
- `references/frameworks.md` — RICE formula + scoring table, MoSCoW categories, JTBD forces, Kano model, User Story Mapping steps
- `references/prd-templates.md` — Standard PRD (8 sections), One-Pager (4 sections), Feature Brief (5 sections)
- `references/elicitation.md` — Expertise-level detection, question taxonomy, adaptive depth rules
- `references/decomposition-strategies.md` — MVP/Standard/Mature profiles with scope/filter rules
- Deliverable: 4 reference files with concrete, actionable content

**Subtask 3: Create super-pm agent wrapper** (estimated: 1h)
- Scaffold `plugins/rd3/agents/super-pm.md` via rd3-cc-agents
- Content: routing table (keyword → skill invocation), delegation patterns
- Deliverable: <100 lines, passes `bun scripts/validate.ts`

**Subtask 4: Evaluate + fix skill** (estimated: 1h)
- Run `bun scripts/evaluate.ts plugins/rd3/skills/product-management/`
- Fix all issues found
- Re-evaluate until score ≥ 85%

**Subtask 5: Evaluate + fix agent** (estimated: 1h)
- Run `bun scripts/evaluate.ts plugins/rd3/agents/super-pm.md`
- Fix all issues found
- Re-evaluate until score ≥ 85%

**Subtask 6: Final review** (estimated: 1h)
- Cross-check: SKILL.md references are valid, ftree commands are correct
- Cross-check: super-pm delegation targets match skill workflows
- Verify no vendor code copied verbatim
- Verify acceptance criteria R7.1-R7.5 all met

**Dependency graph:**
```
1 (skill) ──→ 4 (eval skill) ──→ 6 (final review)
2 (refs)  ──↗                     ↑
3 (agent) ──→ 5 (eval agent) ─────┘
```
Subtasks 1+2 can run in parallel. Subtask 3 can run in parallel with 1+2. Subtasks 4+5 depend on 1+2+3. Subtask 6 depends on 4+5.

**Total estimated effort: 9h** (complex preset confirmed)

### Review

## Review

**Final State — All Deliverables Complete**

| Deliverable | Path | Score |
|---|---|---|
| SKILL.md | `plugins/rd3/skills/product-management/SKILL.md` | 100% |
| super-pm.md | `plugins/rd3/agents/super-pm.md` | 93% (A) |
| frameworks.md | `references/frameworks.md` | — |
| prd-templates.md | `references/prd-templates.md` | — |
| elicitation.md | `references/elicitation.md` | — |
| decomposition-strategies.md | `references/decomposition-strategies.md` | — |
| prd-standard.md | `templates/prd-standard.md` | — |
| prd-onepage.md | `templates/prd-onepage.md` | — |
| prd-feature-brief.md | `templates/prd-feature-brief.md` | — |

**Review iterations:**
1. Initial implementation: skill 90%, agent 85%
2. Feedback: PRD template extraction, channel alignment, Workflow 0
3. Code review: 5 issues found and fixed
4. Skill evaluate: 100% after fixes
5. Agent evaluate: 93% after fixes
6. Agent refine: 93% stable
7. Strategy optimization: added philosophy, decision rules, comparison table

**Acceptance criteria R7.1-R7.5:** All verified and passing.


### Testing

## Testing

**Validation results:**
- `bun plugins/rd3/skills/cc-skills/scripts/validate.ts plugins/rd3/skills/product-management/` → PASS
- `bun plugins/rd3/skills/cc-skills/scripts/evaluate.ts plugins/rd3/skills/product-management/ --scope full` → 90% (PASS)
- `bun plugins/rd3/skills/cc-agents/scripts/validate.ts plugins/rd3/agents/super-pm.md` → PASS
- `bun plugins/rd3/skills/cc-agents/scripts/evaluate.ts plugins/rd3/agents/super-pm.md --scope full` → 90% (A grade, PASS)

**Acceptance criteria R7.1-R7.5:** All verified and passing.

**Post-feedback re-validation:**
- Template extraction: SKILL.md references `templates/` correctly
- Channel execution: No acpx direct references, aligned with task-runner pattern
- Workflow 0: Product Initialization added to SKILL.md and super-pm.md routing table


### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- [rd3-feature-tree SKILL.md](/Users/robin/.agents/skills/rd3-feature-tree/SKILL.md)
- [rd3-task-decomposition SKILL.md](/Users/robin/.agents/skills/rd3-task-decomposition/SKILL.md)
- [rd3-cc-skills SKILL.md](/Users/robin/.agents/skills/rd3-cc-skills/SKILL.md)
- [vendors/babysitter product-management](vendors/babysitter/library/specializations/product-management/)
- [vendors/product-manager-toolkit](vendors/antigravity-awesome-skills/skills/product-manager-toolkit/)
