---
wbs: "0383"
name: Rewrite rd3:dev-verify and rd3:dev-review slash commands as standalone
status: Done
created_at: "2026-04-15"
updated_at: 2026-04-15T23:42:43.012Z
preset: standard
feature_id: ""
tags: [slash-command, rewrite, verification, review, standalone]
background: "Redesign dev-verify and dev-review as standalone commands. dev-verify is task-oriented (findsings → original task). dev-review is source-oriented (creates new findings task). Both use Sequential Compose pattern. No orchestration-v2 dependency."
requirements: "12 requirements for dev-verify, 12 for dev-review, 5 quality standards. See ## Requirements section."
solution: "4-phase: refine dev-verify, refine dev-review, cross-file consistency, validation. See ## Solution section."
design: "dev-verify = task-oriented (scope from task file, findings → original task). dev-review = source-oriented (scope from path, creates new findings task). SECU framework + P-classification shared between both."
plan: "Phase 1: refine dev-verify (SECU details, Phase 8 parsing, scope drift, task status). Phase 2: refine dev-review (WBS extraction, git diff, findings columns, task status). Phase 3: cross-file consistency. Phase 4: bun run check validation."
source:
---

### Background

#### Problem Statement

The existing slash commands `rd3:dev-verify` and `rd3:dev-review` were tightly coupled to `rd3:orchestration-v2`. The original design delegated all work through the orchestration pipeline, making them unusable without the full pipeline infrastructure.

Users needed a way to run lightweight, standalone verification and review without invoking the entire 9-phase pipeline.

### What Was Done in the Previous Session

In the previous session (2026-04-15), the following was accomplished:

1. **Analysis**: Traced the coupling depth of `rd3:dev-verification` skill — found it had only 1 line coupling to orchestration-v2 (`Skill(rd3:orchestration-v2)` for Phase 7).
2. **Brainstorming**: Evaluated 3 options (Sequential Compose, verification-chain orchestration, Inline Everything). Selected **Option A: Sequential Compose**.
3. **Drafting**: Wrote v1 drafts of both command files.
4. **Feedback loop**: Received clarification on the critical distinction between the two commands.

### Critical Design Decision: Task-Oriented vs Source-Oriented

After discussion, the following distinction was established as the core design principle:

#### `rd3:dev-verify` — **Task-Oriented**
- **Input**: Task reference only (WBS or `.md` file path)
- **Scope**: Determined by task file (`modified_files`, `source_dir`, or git diff against task commit)
- **Alignment check**: Compares implementation against task requirements
- **Output**: Findings written to **original task file** (the task IS the container)
- **Fix pass**: ❌ None — report only
- **BDD**: Optionally checks feature list / acceptance criteria from task file

#### `rd3:dev-review` — **Source-Oriented**
- **Input**: Path, task reference, or empty (defaults to `src/`)
- **Scope**: Specified path OR task scope OR entire `src/` directory
- **Alignment check**: None — pure code quality review only
- **Output**: Creates **new findings task file** if path/empty; appends to existing task if `task-ref`
- **Fix pass**: ✅ Optional via `--fix none|blockers-first|all`
- **BDD**: ❌ None (no task = no feature list)

### Skeleton Versions (v1 Drafts)

Both command files were drafted in the previous session and exist at:

- `plugins/rd3/commands/dev-verify.md` (304 lines)
- `plugins/rd3/commands/dev-review.md` (343 lines)

**These drafts contain the correct structure and intent but need refinement** — they may have incomplete SECU details, missing edge-case handling, and need polishing before being production-ready.

### Files NOT to Touch

- `plugins/rd3/skills/dev-verification/SKILL.md` — keep as-is, do NOT modify
  - This skill is still used by `rd3:orchestration-v2` internally
  - It delegates to `rd3:orchestration-v2` for Phase 7, which is intentional for the pipeline
  - The standalone commands replace the use case, not the skill
- `plugins/rd3/skills/orchestration-v2/SKILL.md` — do NOT modify
- `plugins/rd3/commands/dev-run.md` — do NOT modify

---

### Requirements

#### REQ-0383-1: `rd3:dev-verify` Rewrite

The file `plugins/rd3/commands/dev-verify.md` must satisfy:

1. **Task-oriented design**: Takes only `task-ref` as primary input (WBS or `.md` path)
2. **No orchestration-v2 dependency**: Directly composes `rd3:code-review-common` and `rd3:functional-review`
3. **Phase 7 + Phase 8**: Both phases implemented as sequential inline steps
4. **Mode flag**: `--mode full|review-only|func-only` to control which phases run
5. **BDD integration**: `--bdd` flag to check feature list / acceptance criteria from task
6. **Findings → original task file**: Uses `tasks update <WBS> --section Review --from-file` and `tasks update <WBS> --section Requirements --from-file`
7. **Requirements section update**: Each requirement gets a verdict badge (`[x]` MET, `[~]` PARTIAL, `[ ]` UNMET)
8. **No fix pass**: Report-only — never attempts to auto-fix
9. **Verdict**: PASS / PARTIAL / FAIL based on Phase 7 + Phase 8 combined
10. **Channel delegation**: `--channel` flag for cross-agent delegation via `rd3:run-acp`
11. **Auto flag**: `--auto` for CI/scripting (skip confirmations)
12. **Evidence standard**: All evidence must be `file:line` + function/class name — no vague claims

### REQ-0383-2: `rd3:dev-review` Rewrite

The file `plugins/rd3/commands/dev-review.md` must satisfy:

1. **Source-oriented design**: Three input modes — path, task-ref, or empty (defaults to `src/`)
2. **Input detection**: Correctly identifies WBS, `.md` path, directory path, file path, or empty
3. **No orchestration-v2 dependency**: Directly implements SECU analysis inline
4. **Fix pass**: `--fix none|blockers-first|all` flag
   - `blockers-first`: Fix P1 → run `bun run check` → if pass → fix P2+ → run `bun run check`
   - `all`: Fix all in one pass, stop on first failure
   - `none`: Report only (default)
5. **New task creation**: If input is path or empty, creates a NEW findings task via `tasks create`
6. **Findings → task file**: Uses `tasks update <WBS> --section Review --from-file`
7. **SECU framework**: Implements all 4 dimensions (Security, Efficiency, Correctness, Usability)
8. **P-classification**: P1/P2/P3/P4 with correct severity mapping
9. **Channel delegation**: `--channel` flag via `rd3:run-acp`
10. **Auto flag**: `--auto` to skip fix-pass confirmation
11. **Gate check**: Always runs `bun run check` after fix pass
12. **Verdict**: PASS / PARTIAL / FAIL

### REQ-0383-3: Quality Standards

1. Both files must be self-contained — an agent reading only the command file must be able to execute correctly
2. All bash code blocks must use `bun:fs`-compatible patterns (prefer `bun:*` imports for scripts, `bash` for shell)
3. No `console.*` calls — use `logger.*` from `scripts/logger.ts`
4. No `biome-ignore` suppressions (except V8 function coverage workaround)
5. Both files must pass `bun run check` (lint + typecheck + test)

### REQ-0383-4: Documentation Quality

1. Every workflow step must have concrete bash snippets or action descriptions
2. Every flag must have a table entry with default value and purpose
3. Every verdict condition must be documented in a table
4. Platform notes must specify Skill() vs acpx availability per platform
5. "Dogfood rule" must be included for both commands (circular dependency warning)

---

### Solution

#### SOL-0383-1: Implementation Approach

#### Phase 1: Refine `rd3:dev-verify`

Read the current draft at `plugins/rd3/commands/dev-verify.md`, then:

1. **Audit SECU analysis details**: Ensure Phase 7 inline path has complete Security, Efficiency, Correctness, Usability checklists with specific pattern examples (e.g., SQL injection regex, N+1 detection, hardcoded secret patterns)
2. **Polish Phase 8 workflow**: Add explicit requirement parsing logic (handle `R1.`, `1.`, `- [ ]`, `- [x]` formats)
3. **Verify findings table format**: Ensure P1→P2→P3→P4 order, all columns present, correct markdown table syntax
4. **Add scope drift detection**: Explicit step for "code not mapped to requirements" and "requirements with no implementation"
5. **Polish BDD integration**: Clarify the `--bdd` trigger logic (set OR feature list present in task)
6. **Add example invocations**: At least 4 concrete examples covering all flag combinations
7. **Add task status update section**: Explicit `tasks update <WBS> <status>` commands for PASS/PARTIAL/FAIL

#### Phase 2: Refine `rd3:dev-review`

Read the current draft at `plugins/rd3/commands/dev-review.md`, then:

1. **Audit input detection logic**: Ensure all patterns are handled (digits, `.md`, `/` suffix, `src/`, file paths, empty)
2. **Complete SECU analysis**: Ensure all 4 dimensions have specific sub-checklist items with P-priority
3. **Polish fix-pass logic**: Make the blockers-first and all strategies explicit with step numbers
4. **Add confirmation gate**: Explicit user prompt format for fix-pass (skip if `--auto`)
5. **Verify task creation flow**: Ensure WBS extraction from `tasks create` output is robust (use `tasks show <wbs> --json` if possible)
6. **Add git diff fallback**: Explicit command for deriving scope when no task file provided
7. **Add example invocations**: At least 6 examples covering path, task-ref, empty, and fix combinations
8. **Add findings table columns**: Title, Severity (SECU dimension), Location, Recommendation

#### Phase 3: Cross-File Consistency Check

1. Verify both files use the same SECU analysis checklist (copy the definitive version to both)
2. Verify both files use the same P-classification table
3. Verify verdict logic is consistent between both
4. Verify `allowed-tools` matches the tools actually needed
5. Verify `argument-hint` matches actual argument syntax
6. Verify channel resolution tables are consistent

#### Phase 4: Validation

1. Run `bun run check` to ensure no lint/type errors
2. Run `bun test` to ensure tests pass
3. Read both files as if you are a different agent — does everything make sense without additional context?

### SOL-0383-2: Key Implementation Details

#### SECU Analysis Checklist (must appear in both files, consistently)

```
Security  (P1/P2 priority)
  - Injection:     SQLi (`' OR 1=1`, template injection), XSS (`innerHTML`, `dangerouslySetInnerHTML`), command injection
  - Auth/authz:   broken auth, IDOR, missing authorization checks
  - Secrets:      hardcoded API keys, tokens, passwords, private keys
  - Data exposure: missing PII validation, over-logging, missing rate limiting
  - Dependencies: known CVEs in node_modules or bun.lockb

Efficiency  (P2/P3 priority)
  - Algorithm:    O(n²) where O(n) possible, recursive without memoization
  - N+1 queries: loop inside loop with DB calls
  - Missing caching: redundant computations, repeated API calls
  - Blocking I/O: sync fs in hot path, blocking network calls
  - Memory:       unbounded array growth, missing cleanup

Correctness  (P1/P2 priority)
  - Logic bugs:  off-by-one, wrong operator, inverted condition
  - Edge cases: null/undefined, empty input, zero division, overflow
  - Error handling: swallowed exceptions, missing catch, empty catch blocks
  - Concurrency: race conditions, shared mutable state, deadlocks
  - Type safety: excessive `any`, missing null checks, unsafe casts

Usability  (P3/P4 priority)
  - API clarity: confusing signatures, missing JSDoc, inconsistent naming
  - Error messages: generic stack traces, no user-facing messages
  - Maintainability: copy-paste duplication, magic numbers, missing constants
  - Testability: tight coupling, hardcoded deps, untestable code
```

#### P-Classification Reference

| Level | Label | Criteria | Auto-fix? |
|-------|-------|----------|-----------|
| P1 | Blocker | Security vuln, data loss risk, blocking bug | Yes, if mechanical |
| P2 | Warning | Performance issue, significant bug | Yes, if mechanical |
| P3 | Info | Code smell, test gap, maintainability | Manual review |
| P4 | Suggestion | Stylistic improvement, minor optimization | Optional |

#### Task File Update Patterns

**dev-verify — Update Review section of ORIGINAL task:**

```bash
tasks update "$WBS" --section Review --from-file /tmp/review_findings.md
```

**dev-verify — Update Requirements section of ORIGINAL task:**

```bash
# Requirements get verdict badges appended
tasks update "$WBS" --section Requirements --from-file /tmp/requirements_verdict.md
```

**dev-review — Create NEW findings task (path or empty input):**

```bash
# Extract WBS from tasks create output
FINDINGS_WBS=$(tasks create "Review findings: $SCOPE" \
  --background "Code review findings for $SCOPE" \
  --requirements "See Review section" \
  2>/dev/null | grep -oP '(?<=\[)\d{4}(?=\])')

# Then write full content
tasks update "$FINDINGS_WBS" --section Review --from-file /tmp/review_full.md
```

**dev-review — Append to EXISTING task (task-ref input):**

```bash
tasks update "$WBS" --section Review --from-file /tmp/review_findings.md
```

#### Verdict Logic Reference

**dev-verify verdict matrix:**

| Phase 7 | Phase 8 | Verdict |
|---------|---------|---------|
| No findings | All met | PASS |
| P3/P4 only | ≤1 partial, no unmet | PASS |
| P1/P2 exist | Any | PARTIAL |
| — | Any unmet | FAIL |
| P1/P2 exist | — | FAIL |

**dev-review verdict matrix:**

| Findings | Fix pass result | Verdict |
|----------|----------------|---------|
| None | N/A | PASS |
| P3/P4 only | All fixed, check passes | PASS |
| P1/P2 exist | All fixed, check passes | PARTIAL |
| Any | Any fix fails | FAIL |

### SOL-0383-3: Out of Scope

1. **BDD workflow generation**: Full feature file generation from task requirements is out of scope. Only check existing `.feature` files or feature list text in task.
2. **`rd3:dev-verification` skill**: Do NOT modify `plugins/rd3/skills/dev-verification/SKILL.md`. It remains coupled to orchestration-v2 intentionally.
3. **`rd3:orchestration-v2`**: Do NOT modify `plugins/rd3/skills/orchestration-v2/SKILL.md`.
4. **`rd3:tasks` skill enhancement**: Adding BDD feature list generation to task creation is out of scope.
5. **New skill files**: Do NOT create new `.md` files in `plugins/rd3/skills/`. Work only on the command files.

---

### Design

dev-verify = task-oriented (scope from task file, findings → original task, no fix pass, BDD optional).

dev-review = source-oriented (scope from path, creates new findings task, optional fix pass).

Both share: SECU framework (Security/Efficiency/Correctness/Usability), P-classification (P1-P4), verdict matrices, platform notes.

### Plan

Phase 1: Refine dev-verify (SECU details, Phase 8 parsing, scope drift, task status commands).

Phase 2: Refine dev-review (WBS extraction, git diff fallback, findings columns, task status).

Phase 3: Cross-file consistency check.

Phase 4: bun run check validation.

### Verification Criteria

#### VC-0383-1: Functional Verification

- [x] `rd3:dev-verify 0383` can be loaded and parsed by an agent without errors
- [x] All 5 arguments (`task-ref`, `--mode`, `--bdd`, `--auto`, `--channel`) are documented
- [x] Phase 7 SECU analysis is complete (all 4 dimensions with sub-items + P-classification table)
- [x] Phase 8 requirements traceability has explicit parsing logic (3a-3d steps)
- [x] Findings write to original task file (not a new task)
- [x] No fix pass exists anywhere in the file
- [x] BDD integration step is present and gated on `--bdd` flag
- [x] PASS/PARTIAL/FAIL verdict matrix is documented

### VC-0383-2: Functional Verification

- [x] `rd3:dev-review` can be loaded and parsed by an agent without errors
- [x] All 4 input modes are documented (digits, `.md`, path, empty)
- [x] Fix pass has three strategies: `none`, `blockers-first`, `all`
- [x] New task creation flow is explicit with robust WBS extraction (JSON + grep fallback)
- [x] Existing task append flow is explicit
- [x] Gate check (`bun run check`) is documented
- [x] At least 6 concrete examples are provided

### VC-0383-3: Quality Verification

- [x] `bun run check` passes on both files
- [x] Both files use consistent SECU checklist (dev-review = canonical, dev-verify references it)
- [x] Both files use consistent P-classification table
- [x] `allowed-tools` in frontmatter is accurate
- [x] `argument-hint` matches actual argument syntax
- [x] No `console.*` calls exist
- [x] No `biome-ignore` suppressions exist
- [x] Platform notes table is complete for both files

---

### Implementation Log

#### 2026-04-15 — v1 Drafts Created

- Drafted v1 of both command files
- Established task-vs-source orientation distinction
- Both drafts exist at `plugins/rd3/commands/dev-verify.md` and `plugins/rd3/commands/dev-review.md`
- Skeleton structure and intent are correct; refinement needed

### 2026-04-15 — Implementation Complete

#### Phase 1: Refine `rd3:dev-verify`
- Added complete SECU checklist with concrete pattern examples (SQLi, XSS, hardcoded secrets, N+1, etc.)
- Added P-classification reference table (P1-P4 with criteria and auto-fix guidance)
- Added explicit Phase 8 requirement parsing (3a-3d steps with bash grep examples)
- Added scope drift detection with bash commands
- Merged findings into single Review section (no duplicate sections)
- Added explicit `tasks update` commands to task status table
- Evidence standard made explicit in both Phase 7 and Phase 8

#### Phase 2: Refine `rd3:dev-review`
- Fixed findings table columns: changed `Severity` to `Dimension` (SECU category)
- Added robust WBS extraction from `tasks create` (JSON-first, grep fallback)
- Added explicit git diff fallback with full bash commands
- Added P-classification reference table (matching dev-verify)
- Fixed verdict table: "P1/P2 exist, check passes" → "P1/P2 exist, all fixed, check passes" → PARTIAL
- Added explicit `tasks update` commands to task status update table

#### Phase 3: Cross-File Consistency
- Both files use identical SECU checklist (dev-review = canonical, dev-verify references it)
- Both files use identical P-classification table
- Both verdict matrices are consistent
- No `console.*` calls in either file
- No `biome-ignore` suppressions in either file
- `argument-hint` matches actual argument syntax in both files

#### Phase 4: Validation
- `bun run check` passes: lint ✅, typecheck ✅, tests ✅ (98.15% line coverage)

**Final line counts:**
- `dev-verify.md`: 400 lines (was 304, +96 lines)
- `dev-review.md`: 392 lines (was 343, +49 lines)
