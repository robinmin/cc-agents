# rd3 Skill Migration Report: `brainstorm`

**Date:** 2026-03-25
**Goal:** Port the brainstorm skill into rd3 for ideation and improve based on industry best practices and SOTA techniques
**Mode:** `--apply` executed
**Status:** ✅ Complete

---

## 1. Current Inventory

### Source: rd2 brainstorm Skill

| File | Purpose | Status |
|------|---------|--------|
| `plugins/rd2/skills/brainstorm/SKILL.md` | Main skill (~400 lines) | ✅ Migrated |
| `plugins/rd2/skills/brainstorm/references/workflows.md` | 4-phase detailed workflow | ✅ Migrated |
| `plugins/rd2/skills/brainstorm/references/tool-selection.md` | Tool selection guide | ⏭️ Skipped (reference rd3 instead) |
| `plugins/rd2/skills/brainstorm/examples/brainstorm-output.md` | Example output (Python/FastAPI) | ✅ Converted to TypeScript |

### Source: rd2 super-brain Agent

| File | Purpose | Status |
|------|---------|--------|
| `plugins/rd2/agents/super-brain.md` | Thin wrapper agent | ⏭️ Skipped (agent layer) |

### Target: rd3 brainstorm Skill

**Status:** ✅ CREATED NEW

### Related rd3 Skills

| Skill | Overlap | Relationship |
|-------|---------|-------------|
| `rd3:task-decomposition` | Phase 4 (Task Creation) | Delegates to for structured task output |
| `rd3:knowledge-extraction` | Phase 2 (Research) | Delegates to for verification & synthesis |
| `rd3:anti-hallucination` | All phases | Delegates to for verification protocol |
| `rd3:tasks` | Phase 4 (Task Creation) | Delegates to for file operations |

---

## 2. Overlap Analysis

### Functional Overlap with rd3 Skills

| rd2 Phase | rd3 Equivalent | Overlap Decision |
|-----------|----------------|------------------|
| Input Processing | N/A | Pure brainstorm — kept |
| Research & Ideation | `rd3:knowledge-extraction` | **Delegated**, not duplicated |
| Structured Output | N/A | Pure brainstorm — kept |
| Task Creation | `rd3:task-decomposition` + `rd3:tasks` | **Delegated**, not duplicated |

### Key Finding

**The rd2 brainstorm skill conflated three concerns:**
1. **Ideation** (unique to brainstorm) — generating solution options with trade-offs
2. **Research** (duplicate of `rd3:knowledge-extraction`) — verification and synthesis
3. **Task creation** (duplicate of `rd3:task-decomposition` + `rd3:tasks`) — structured output

**Redesign applied:** Extracted ideation as the unique value. Delegated research to `rd3:knowledge-extraction` and task creation to `rd3:task-decomposition` + `rd3:tasks`.

---

## 3. Target Taxonomy

| Attribute | Value |
|-----------|-------|
| rd3 Category | `workflow-core` |
| Purpose | Structured ideation workflow: parse input → research via delegation → generate approaches with trade-offs |
| In scope | Input parsing, context extraction, ambiguity clarification, solution generation, trade-off analysis, confidence scoring |
| Out of scope | Direct research (delegated), task file ops (delegated), task decomposition logic (delegated) |
| Goal fit | ✅ Exact match with SOTA improvements |

### Target Boundaries

**In scope:**
- Input type detection (file path vs issue description)
- Context extraction from task files (YAML frontmatter parsing)
- Ambiguity detection and clarification prompts
- Solution generation with trade-off analysis
- Confidence scoring with source attribution
- Delegation to research skills (anti-hallucination, knowledge-extraction)
- Delegation to task creation (task-decomposition, tasks)

**Out of scope:**
- Direct research implementation (delegated to knowledge-extraction)
- Task file operations (delegated to tasks)
- Task decomposition logic (delegated to task-decomposition)
- Agent/command coupling (pure skill principle)

---

## 4. Tech Stack Simplification

| Component | Source | Action |
|-----------|--------|--------|
| Python scripts | None | N/A |
| Python tests | None | N/A |
| Python examples in markdown | `examples/brainstorm-output.md` | **Converted to TypeScript** (FastAPI → Bun/Hono) |

**Rationale:** The example showed authentication implementation using FastAPI (Python). Converted to TypeScript with a Bun-compatible example (Hono.js).

---

## 5. Target Skill Decision

**Mode:** CREATE NEW rd3 skill

**Justification:**
- `plugins/rd3/skills/brainstorm/` did not exist
- The ideation workflow is distinct from task-decomposition (which assumes requirements are clear)
- A new skill enables proper delegation architecture

---

## 6. Source-to-Target Mapping

| Source | Current Purpose | Overlap | Target rd3 Skill | Goal Fit | Action | Priority | Notes |
|--------|----------------|---------|------------------|----------|--------|----------|-------|
| `brainstorm/SKILL.md` | 4-phase workflow | Partial | `brainstorm/SKILL.md` | High | **rewrite** | P0 | Refactored from 4 phases to 3, delegate research & tasks |
| `brainstorm/references/workflows.md` | Detailed workflow | Partial | `brainstorm/references/workflows.md` | High | **rewrite** | P0 | Updated for 3-phase, delegate Phase 2 & 4 |
| `brainstorm/references/tool-selection.md` | Research tool guidance | Duplicate | rd3:knowledge-extraction | N/A | **skip** | - | Reference instead |
| `brainstorm/examples/brainstorm-output.md` | Example output | Low | `brainstorm/examples/ideation-example.md` | High | **convert** | P1 | Converted Python FastAPI → TypeScript Hono |

---

## 7. Dependency Closure

### Required Dependencies

| Dependency | Status | Action |
|------------|--------|--------|
| `rd3:anti-hallucination` | EXISTS | Referenced |
| `rd3:knowledge-extraction` | EXISTS | Referenced, delegate research |
| `rd3:task-decomposition` | EXISTS | Referenced, delegate task creation |
| `rd3:tasks` | EXISTS | Referenced, delegate file operations |

### No Missing Dependencies

All required rd3 skills exist. No dependency gaps identified.

---

## 8. Migration Batches

### Batch 1: Core Skill (P0) — COMPLETE

**Target:** `plugins/rd3/skills/brainstorm/SKILL.md`

**Changes applied:**
- Reduced from 4 phases to 3 phases (Input → Ideation → Output)
- Removed direct research implementation (delegate to knowledge-extraction)
- Removed direct task creation (delegate to task-decomposition)
- Added proper see_also references to rd3 skills
- Removed rd2-specific references
- Added TypeScript example in trigger phrases
- Updated frontmatter for rd3 conventions

### Batch 2: References (P0) — COMPLETE

**Target:** `plugins/rd3/skills/brainstorm/references/workflows.md`

**Changes applied:**
- Updated workflow to 3 phases
- Removed Phase 2 research details (delegate to knowledge-extraction)
- Removed Phase 4 task creation details (delegate to task-decomposition)
- Added reference pointers to rd3 skills
- Updated output template

### Batch 3: Examples (P1) — COMPLETE

**Target:** `plugins/rd3/skills/brainstorm/examples/ideation-example.md`

**Changes applied:**
- Converted Python/FastAPI example → TypeScript/Hono example
- Used Bun/Hono instead of python-jose
- Kept same structure (Overview, Approaches, Recommendations, Next Steps)
- Updated to TypeScript syntax

---

## 9. Per-Skill Migration Checklist

### rd3:brainstorm SKILL.md

- [x] Create `plugins/rd3/skills/brainstorm/` directory
- [x] Create SKILL.md with rd3 frontmatter
- [x] 3-phase workflow: Input → Ideation → Output
- [x] Reference rd3:anti-hallucination for verification
- [x] Reference rd3:knowledge-extraction for research
- [x] Reference rd3:task-decomposition for task creation
- [x] Reference rd3:tasks for file operations
- [x] Remove all rd2: references
- [x] Add TypeScript trigger examples
- [x] Update confidence scoring to rd3 format
- [x] Add see_also frontmatter field

### rd3:brainstorm references/workflows.md

- [x] Create references directory
- [x] Create workflows.md with 3-phase guidance
- [x] Add delegation pointers
- [x] Update templates

### rd3:brainstorm examples/ideation-example.md

- [x] Create examples directory
- [x] Convert Python example to TypeScript
- [x] Use Bun-compatible code (Hono)

---

## 10. Expert Review Gate

**Required:** Invoke `rd3:expert-skill` after migration

```
Agent(subagent_type="rd3:expert-skill", prompt="Evaluate plugins/rd3/skills/brainstorm at full scope and report issues")
```

---

## 11. Open Decisions

| Decision | Options | Recommended | Rationale |
|----------|---------|-------------|-----------|
| Python example conversion | Convert to TS / Keep as reference | **Converted to TypeScript** | rd3 is Bun/TS native |
| 3 vs 4 phases | 3 (delegate research+tasks) / 4 (keep internal) | **3 phases** | Aligns with "Fat Skills, Thin Wrappers" - delegate heavy lifting |
| File path input handling | Keep / Simplify | **Kept** | Useful for context-aware ideation from task files |

---

## SOTA Improvements Applied

Based on the goal "improve based on industry best practices and SOTA techniques":

1. **Chain-of-Thought prompting** — Added explicit reasoning traces in ideation
2. **RAG-grounded synthesis** — Delegate to knowledge-extraction which uses SOTA patterns
3. **Confidence scoring with evidence** — Updated to include reasoning
4. **Trade-off matrices** — Enhanced for multi-criteria decision analysis
5. **Delegation architecture** — Fat skill, thin wrappers per rd3 conventions
6. **Anti-hallucination integration** — First-class via rd3:anti-hallucination reference
