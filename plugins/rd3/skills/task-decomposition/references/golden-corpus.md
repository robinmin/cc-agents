---
name: golden-corpus
description: "Regression corpus of real task examples with expected decomposition decisions for validation"
see_also:
  - rd3:task-decomposition
  - rubric-model
---

# Golden Corpus — Decomposition Regression Tests

Representative set of real tasks covering the full range of decomposition decisions. Use this corpus to validate that the rubric produces consistent, auditable outcomes.

## How to Use This Corpus

1. Read each case's **Task Description** and **Signal Estimates**
2. Apply the rubric from `references/rubric-model.md`
3. Compare your decision to the **Expected Decision**
4. If mismatch, investigate whether the rubric or your assessment needs correction

## Executable Contract

Every case below includes a machine-readable `yaml corpus-case` block consumed by `plugins/rd3/tests/task-decomposition-docs.test.ts`.

- Keep the prose and the YAML block aligned
- Update both when the rubric changes
- Treat test failures as policy drift, not as optional doc cleanup

---

## Case 1: Single-File Bug Fix

**Task:** Fix off-by-one error in WBS padding logic
**Description:** The WBS number formatter produces `037` instead of `0376` when the number has trailing digits that match the padding width. Fix the `padWbs()` function in `src/wbs.ts`.
**File scope:** 1 file (`src/wbs.ts`), ~5 lines changed

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 1h | 0 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | low | 0 |
| **Total** | | **0** |

```yaml corpus-case
id: case-1
expectedDecision: skip
expectedOverride: none
signals:
  effortHours: 1
  deliverables: 1
  layers: 1
  coordination: none
  risk: low
context:
  singleModule: true
  singleReviewRollbackBoundary: true
```

**Expected Decision:** `skip`
**Expected Justification:** Single-file bug fix, <2h effort, isolated module, no risk.
**Expected Action:** Fix in one task, write Plan section with investigation steps.

---

## Case 2: Two-File Feature Addition

**Task:** Add `--json` output flag to orchestrator status command
**Description:** The `orchestrator status` command currently outputs human-readable text. Add a `--json` flag that outputs structured JSON for programmatic consumption. Requires changes to the CLI parser and the status formatter.
**File scope:** 2 files (`src/cli/status.ts`, `src/formatters/status.ts`)

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 3h | 0 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | low | 0 |
| **Total** | | **0** |

```yaml corpus-case
id: case-2
expectedDecision: skip
expectedOverride: none
signals:
  effortHours: 3
  deliverables: 1
  layers: 1
  coordination: none
  risk: low
context:
  singleModule: true
  singleReviewRollbackBoundary: true
```

**Expected Decision:** `skip`
**Expected Justification:** Single deliverable (JSON output flag), 2 related files in the same module, low effort, no risk.

---

## Case 3: Multi-File Feature with New Tests

**Task:** Add events CLI command to orchestrator
**Description:** Add an `orchestrator events <task-ref>` command that displays run events from the SQLite state store. Requires CLI registration, query function, and table/text formatter. Tests needed for the query and formatting logic.
**File scope:** 4-5 files (`src/cli/events.ts`, `src/queries/events.ts`, `src/formatters/events.ts`, `tests/events.test.ts`, plus registration in `src/cli/index.ts`)

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 6h | 1 |
| D | 1 | 0 |
| L | 2 (CLI, query) | 1 |
| C | moderate | 1 |
| R | low | 0 |
| **Total** | | **3** |

```yaml corpus-case
id: case-3
expectedDecision: should decompose
expectedOverride: none
signals:
  effortHours: 6
  deliverables: 1
  layers: 2
  coordination: moderate
  risk: low
context:
  singleModule: false
  singleReviewRollbackBoundary: true
optionalSubtasks:
  - Implement events query + CLI wiring
  - Add formatter + regression tests
```

**Expected Decision:** `should decompose`
**Expected Action:** Agent may keep it as one task (all related, single deliverable) or split into "implement events query + CLI wiring" and "add formatter + regression tests". Either decision is acceptable with rationale.

---

## Case 4: Cross-Layer Feature (DB → API → CLI)

**Task:** Add phase timing analytics to pipeline runs
**Description:** Track how long each phase takes and expose via `orchestrator report --timing`. Requires: (1) schema migration to add `phase_metrics` table, (2) query functions for aggregate timing, (3) report formatter, (4) CLI flag wiring.
**File scope:** 6+ files across DB schema, query layer, formatter layer, CLI layer

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 10h | 2 |
| D | 2 (schema + report) | 1 |
| L | 3 (DB, query, CLI) | 2 |
| C | moderate | 1 |
| R | medium (schema migration) | 1 |
| **Total** | | **7** |

```yaml corpus-case
id: case-4
expectedDecision: must decompose
expectedOverride: none
signals:
  effortHours: 10
  deliverables: 2
  layers: 3
  coordination: moderate
  risk: medium
context:
  singleModule: false
  singleReviewRollbackBoundary: false
requiredSubtasks:
  - Schema migration + query functions
  - Report formatter + CLI flag
```

**Expected Decision:** `must decompose`
**Expected Decomposition Shape:**
- Subtask A: Schema migration + query functions
- Subtask B: Report formatter + CLI flag
- Dependency: A → B
**Rationale:** Cross-layer work with schema migration risk. Natural deliverable boundary between data and presentation.

---

## Case 5: Security-Critical Change

**Task:** Add input sanitization to task-ref parameter across all CLI commands
**Description:** The `task-ref` parameter is passed to SQL queries without sanitization in several places. Audit all query functions, add parameterized queries or input validation, and add tests for injection attempts.
**File scope:** 8+ files across all query modules

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 4h | 0 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | moderate | 1 |
| R | high (SQL injection) | 2 |
| **Total** | | **3** |

```yaml corpus-case
id: case-5
expectedDecision: must decompose
expectedOverride: force-must-high-risk
signals:
  effortHours: 4
  deliverables: 1
  layers: 1
  coordination: moderate
  risk: high
context:
  singleModule: false
  singleReviewRollbackBoundary: false
requiredSubtasks:
  - Build a shared task-ref validation boundary and convert common query helpers
  - Roll remaining commands onto the hardened path and add SQL injection regression coverage
```

**Expected Decision:** `must decompose` (override: Risk = high)
**Expected Decomposition Shape:**
- Subtask A: Build a shared task-ref validation boundary and convert common query helpers
- Subtask B: Roll remaining commands onto the hardened path and add SQL injection regression coverage
- Dependency: A → B
**Rationale:** Security-critical work forces decomposition regardless of low composite score. The split is by reusable hardening boundary and rollout coverage, not by `audit -> implement -> test` phases.

---

## Case 6: Over-Decomposed Example (Anti-Pattern 0335)

**Task:** Add events CLI command to orchestrator (actual history)
**What happened:** Decomposed into 6 subtasks:
- 0336: Add EventsOptions interface to model.ts
- 0337: Add events to VALID_COMMANDS
- 0338: Implement handleEvents in run.ts
- 0339: Wire events case in switch
- 0340: Add events.test.ts
- 0341: Run bun run check

**Signal Estimates (for the actual work):**
| Signal | Value | Score |
|--------|-------|-------|
| E | 6h | 1 |
| D | 1 | 0 |
| L | 2 | 1 |
| C | none | 0 |
| R | low | 0 |
| **Total** | | **2** |

```yaml corpus-case
id: case-6
expectedDecision: skip
expectedOverride: none
signals:
  effortHours: 6
  deliverables: 1
  layers: 2
  coordination: none
  risk: low
context:
  singleModule: false
  singleReviewRollbackBoundary: true
```

**Expected Decision:** `skip`
**Expected Justification:** Single deliverable, moderate effort, no coordination needed. Implementation steps (add interface, wire switch, add test) belong in the Plan section, not as subtasks.
**Lesson:** The 6-way decomposition was implementation-step-based, not deliverable-based. Each subtask was an implementation step, not a deliverable.

---

## Case 7: Over-Decomposed Example (Anti-Pattern 0352)

**Task:** Add Antigravity adapter for ACP support
**What happened:** Decomposed into 5 phase-based subtasks:
- 0356: investigate agy CLI
- 0357: design adapter
- 0358: implement adapter
- 0359: integrate backend
- 0360: add unit tests

**Signal Estimates (for the actual work):**
| Signal | Value | Score |
|--------|-------|-------|
| E | 9h | 2 |
| D | 1 | 0 |
| L | 2 | 1 |
| C | moderate | 1 |
| R | low | 0 |
| **Total** | | **4** |

```yaml corpus-case
id: case-7
expectedDecision: should decompose
expectedOverride: none
signals:
  effortHours: 9
  deliverables: 1
  layers: 2
  coordination: moderate
  risk: low
context:
  singleModule: false
  singleReviewRollbackBoundary: true
optionalSubtasks:
  - Implement adapter core
  - Add backend selection + health checks
```

**Expected Decision:** `should decompose`
**Expected Better Decomposition (if decomposing):**
- Subtask A: Implement adapter core
- Subtask B: Add backend selection + health checks
- Dependency: A → B
**Or:** Keep as one task since it is still one deliverable with moderate effort. The Plan section covers investigation → design → implement → integrate → test.

---

## Case 8: Large Feature Requiring Full Decomposition

**Task:** Implement the deterministic granularity engine for task-decomposition skill
**Description:** Refactor the `rd3:task-decomposition` skill to replace heuristic guidance with a deterministic rubric. Requires: (1) new rubric model document, (2) rewrite `SKILL.md`, (3) update 3+ reference files, (4) add golden corpus, (5) remove contradictions across all files.
**File scope:** 6+ files across `SKILL.md` and `references/`

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 12h | 2 |
| D | 3 (rubric, rewrite, corpus) | 2 |
| L | 1 (all in skill docs) | 0 |
| C | moderate | 1 |
| R | medium (breaking change for existing workflow) | 1 |
| **Total** | | **6** |

```yaml corpus-case
id: case-8
expectedDecision: must decompose
expectedOverride: none
signals:
  effortHours: 12
  deliverables: 3
  layers: 1
  coordination: moderate
  risk: medium
context:
  singleModule: false
  singleReviewRollbackBoundary: false
requiredSubtasks:
  - Create rubric model + executable golden corpus
  - Rewrite SKILL.md + align reference docs
```

**Expected Decision:** `must decompose`
**Expected Decomposition Shape:**
- Subtask A: Create rubric model + executable golden corpus
- Subtask B: Rewrite `SKILL.md` + align reference docs
- Dependency: A → B
**Rationale:** Multiple deliverables with cross-file coherence requirements. The regression contract should exist before the large rewrite lands.

---

## Case 9: Override Precedence Stress Test

**Task:** Harden a single shared auth helper against token forgery
**Description:** A single helper in `src/auth/tokens.ts` needs issuer and algorithm validation to block token forgery. The fix is localized to one module, but it is security-critical and requires isolated review plus regression tests.
**File scope:** 1 file/module for the core hardening change, plus tests

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 6h | 1 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | high | 2 |
| **Total** | | **3** |

```yaml corpus-case
id: case-9
expectedDecision: must decompose
expectedOverride: force-must-high-risk
signals:
  effortHours: 6
  deliverables: 1
  layers: 1
  coordination: none
  risk: high
context:
  singleModule: true
  singleReviewRollbackBoundary: true
requiredSubtasks:
  - Harden token validation boundary
  - Add forgery regression coverage and rollout checklist
```

**Expected Decision:** `must decompose`
**Expected Decomposition Shape:**
- Subtask A: Harden token validation boundary
- Subtask B: Add forgery regression coverage and rollout checklist
- Dependency: A → B
**Rationale:** This is the explicit precedence case. Force-skip would otherwise apply because the work is localized, but `force-must` wins because `R = high`.

---

## Case 10: Raw Score 5 Boundary

**Task:** Add structured validation output and remediation hints to `tasks validate`
**Description:** Extend the validation command so it can emit a structured JSON report and human-readable remediation hints for failed checks. Requires CLI flag wiring, validation result shaping, and formatter updates with regression tests.
**File scope:** 4-5 files across CLI and formatter code

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 8h | 1 |
| D | 2 (JSON contract + remediation output) | 1 |
| L | 2 (CLI, formatter) | 1 |
| C | moderate | 1 |
| R | medium (output contract change) | 1 |
| **Total** | | **5** |

```yaml corpus-case
id: case-10
expectedDecision: must decompose
expectedOverride: none
signals:
  effortHours: 8
  deliverables: 2
  layers: 2
  coordination: moderate
  risk: medium
context:
  singleModule: false
  singleReviewRollbackBoundary: false
requiredSubtasks:
  - Define validation JSON contract and result shaping
  - Add remediation formatter output and regression tests
```

**Expected Decision:** `must decompose`
**Expected Decomposition Shape:**
- Subtask A: Define validation JSON contract and result shaping
- Subtask B: Add remediation formatter output and regression tests
- Dependency: A → B
**Rationale:** This is the exact `score = 5` threshold case with no override assistance. If the rubric drifts to `6+`, this case must fail.

---

## Case 11: Force Must by Effort Override

**Task:** Split the orchestration phase prompt builder into a reusable typed core
**Description:** A single prompt-builder module has grown too large to maintain. Refactor it into a typed core with compatibility wrappers while preserving current behavior and snapshots. The work stays localized but is estimated at more than 16 hours because the module is dense and highly coupled.
**File scope:** 1-2 closely related files in one module, plus tests

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 20h | 3 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | low | 0 |
| **Total** | | **3** |

```yaml corpus-case
id: case-11
expectedDecision: must decompose
expectedOverride: force-must-effort
signals:
  effortHours: 20
  deliverables: 1
  layers: 1
  coordination: none
  risk: low
context:
  singleModule: true
  singleReviewRollbackBoundary: true
requiredSubtasks:
  - Extract typed prompt-builder core with compatibility wrapper
  - Migrate remaining prompt families and refresh parity coverage
```

**Expected Decision:** `must decompose`
**Expected Decomposition Shape:**
- Subtask A: Extract typed prompt-builder core with compatibility wrapper
- Subtask B: Migrate remaining prompt families and refresh parity coverage
- Dependency: A → B
**Rationale:** This case isolates the `E > 16` override. The raw score is only 3, but the effort override still forces decomposition.

---

## Case 12: Localized Force-Skip Override

**Task:** Refine task-ref normalization inside one shared parser module
**Description:** Tighten normalization and validation rules in a single shared parser module so malformed task refs are rejected earlier. The work is localized to one module and one review boundary, but the parser is shared so the change carries medium risk and requires careful regression tests.
**File scope:** 1 module plus tests

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 10h | 2 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | medium | 1 |
| **Total** | | **3** |

```yaml corpus-case
id: case-12
expectedDecision: skip
expectedOverride: force-skip
signals:
  effortHours: 10
  deliverables: 1
  layers: 1
  coordination: none
  risk: medium
context:
  singleModule: true
  singleReviewRollbackBoundary: true
```

**Expected Decision:** `skip`
**Expected Justification:** One module, one deliverable, one rollback boundary, and zero coordination keep this localized enough to stay as a single task even though the raw score lands in the 3-4 band.
**Rationale:** This is the explicit localized `force-skip` case. If the skip override breaks, this case must fail.

---

## Case 13: Shared Module With Split Review Boundary

**Task:** Tighten a shared parser with staged approval and rollback checks
**Description:** Refine validation inside one shared parser module used by both the CLI and background automation. The code change stays in one module, but rollout requires an approval gate before enabling the stricter parser for automation and a separate rollback checkpoint if downstream task imports regress.
**File scope:** 1 module plus tests

**Signal Estimates:**
| Signal | Value | Score |
|--------|-------|-------|
| E | 10h | 2 |
| D | 1 | 0 |
| L | 1 | 0 |
| C | none | 0 |
| R | medium | 1 |
| **Total** | | **3** |

```yaml corpus-case
id: case-13
expectedDecision: should decompose
expectedOverride: none
signals:
  effortHours: 10
  deliverables: 1
  layers: 1
  coordination: none
  risk: medium
context:
  singleModule: true
  singleReviewRollbackBoundary: false
optionalSubtasks:
  - Harden shared parser boundary for stricter imports
  - Stage automation enablement + rollback verification
```

**Expected Decision:** `should decompose`
**Expected Justification:** The raw score is still 3, but `force-skip` must not apply because the work crosses more than one review/rollback boundary even though the code lives in a single module.
**Rationale:** This is the negative override case. If the executable rubric ignores the review/rollback-boundary predicate, this case will incorrectly collapse to `skip`.

---

## Validation Rules

When using this corpus for regression testing:

1. **Score consistency** — Different agents applying the rubric should get the same decision for each case
2. **Override correctness** — Cases 5 and 9 verify that `force-must-high-risk` wins over any skip-friendly context, case 11 verifies `force-must-effort`, case 12 verifies localized `force-skip`, and case 13 verifies that split review/rollback boundaries block `force-skip`
3. **Anti-pattern detection** — Cases 6 and 7 must be detected as over-decomposed examples
4. **Threshold correctness** — Case 10 verifies the raw `score = 5` boundary for `must decompose`
5. **Justification presence** — Every `skip` and `should decompose` case must have written rationale
6. **Decomposition shape** — When decomposition is required, subtasks must be deliverable-based, not phase-based
