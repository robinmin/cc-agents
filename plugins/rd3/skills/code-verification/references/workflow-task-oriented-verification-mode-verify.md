---
name: workflow-task-oriented-verification-mode-verify
description: "Extracted section: Workflow: Task-Oriented Verification (`--mode verify`)"
see_also:
  - rd3:code-verification
---

# Workflow: Task-Oriented Verification (`--mode verify`)

### Step 1 — Load Task File and Parse Focus

```bash
TASK_REF="${TASK_REF:-$1}"
MODE="${MODE:-full}"
BDD_MODE="${BDD_MODE:-false}"
AUTO="${AUTO:-false}"
CHANNEL="${CHANNEL:-auto}"
FOCUS="${FOCUS:-all}"

# Normalize focus: split by comma, lowercase, trim
if [[ "$FOCUS" == "all" ]]; then
  FOCUS_DIMS="security efficiency correctness usability"
else
  FOCUS_DIMS=""
  IFS=',' read -ra DIMS <<< "$FOCUS"
  for dim in "${DIMS[@]}"; do
    dim=$(echo "$dim" | tr '[:upper:]' '[:lower:]' | xargs)
    case "$dim" in
      security|efficiency|correctness|usability) FOCUS_DIMS="$FOCUS_DIMS $dim" ;;
    esac
  done
  FOCUS_DIMS=$(echo "$FOCUS_DIMS" | xargs)
fi

if [[ "$TASK_REF" == *.md ]]; then
  sed -n '1,300p' "$TASK_REF"
else
  tasks show "$TASK_REF"
fi

# Extract WBS
if [[ "$TASK_REF" =~ ^[0-9]+$ ]]; then
  WBS="$TASK_REF"
elif [[ "$TASK_REF" == *.md ]]; then
  WBS=$(tasks get-wbs "$TASK_REF")
fi

echo "Focus dimensions: ${FOCUS_DIMS:-all}"
```

Extract from task:
- `modified_files`, `source_dir` from frontmatter → Phase 7 scope
- `## Requirements` section → Phase 8 input
- Feature list / acceptance criteria → BDD input

**Git diff fallback:**

```bash
if [[ -n "$WBS" ]]; then
  TASK_FILE=$(tasks get-file "$WBS" 2>/dev/null)
  if [[ -n "$TASK_FILE" ]] && [[ -f "$TASK_FILE" ]]; then
    COMMIT_HASH=$(git log -1 --format=%H -- "$TASK_FILE" 2>/dev/null)
    if [[ -n "$COMMIT_HASH" ]]; then
      MODIFIED_FILES=$(git diff --name-only "${COMMIT_HASH}~1"..HEAD -- '*.ts' '*.js' '*.tsx' '*.jsx' 2>/dev/null)
    fi
  fi
fi
```

### Step 2 — Phase 7: SECU Code Review (if `--mode-verify full` or `--mode-verify review-only`)

Run SECU analysis on `modified_files` (conditional on `--focus`):

```
IF focus includes 'security':
  Security checks (P1/P2):
    - Injection: SQLi, XSS, command injection
    - Auth/Authz: broken auth, IDOR, missing auth checks
    - Secrets: hardcoded keys, tokens, passwords
    - Data Exposure: missing validation, over-logging
    - Dependencies: known CVEs

IF focus includes 'efficiency':
  Efficiency checks (P2/P3):
    - Algorithm: O(n²) where O(n) possible
    - N+1 Queries: loop with DB calls
    - Missing caching: redundant computations
    - Blocking I/O: sync fs in hot path
    - Memory: unbounded growth

IF focus includes 'correctness':
  Correctness checks (P1/P2):
    - Logic bugs: off-by-one, wrong operator
    - Edge cases: null/undefined, empty input
    - Error handling: swallowed exceptions, empty catch
    - Concurrency: race conditions, deadlocks
    - Type safety: excessive any, unsafe casts

IF focus includes 'usability':
  Usability checks (P3/P4):
    - API Clarity: missing JSDoc, confusing signatures
    - Error messages: generic stack traces
    - Maintainability: copy-paste duplication, magic numbers
    - Testability: tight coupling, untestable code
```

For each finding: classify as P1/P2/P3/P4, collect evidence (`file:line` + recommendation).

### Step 3 — Phase 8: Requirements Traceability (if `--mode-verify full` or `--mode-verify func-only`)

#### 3a. Parse Requirements

Parse from `## Requirements` section. Supported formats:

```
R1. Requirement text                     → R1
1. Requirement text                       → R1
- [ ] Requirement text                    → R1
- [x] Requirement text                  → R1
**R1**: Requirement text                  → R1
### R1 — Requirement text                → R1
```

Feature list / acceptance criteria also count.

#### 3b. Evidence Collection

```bash
# Implementation evidence
rg -n "$KEYWORD" --type ts --type tsx 2>/dev/null | head -5

# Test coverage evidence
rg -n "$KEYWORD" tests/ --type ts 2>/dev/null | head -5

# Documentation evidence
rg -n "$KEYWORD" docs/ --type md 2>/dev/null | head -3
```

**Evidence standard**: `file:line` + function/class name.
- ✅ Good: `src/auth/login.ts:38 createUser()`
- ❌ Bad: "implemented correctly"

#### 3c. Verdict per Requirement

| Verdict | Condition |
|---------|-----------|
| **MET** | Evidence found for impl + test + docs |
| **PARTIAL** | Evidence found for at least one |
| **UNMET** | No evidence found |

#### 3d. Scope Drift Detection

```
Missing implementation → Flag as "Requirement R{n}: no implementation evidence found"
Untraced code → Flag as "Code in {file} doesn't map to any requirement"
```

### Step 4 — BDD Integration (if `--bdd` and feature list exists)

```
1. Extract feature list from task file
2. For each feature/scenario:
   → Check if .feature file exists: tests/features/{feature_name}.feature
   → If exists: read scenario results
   → Map scenario outcomes to requirement verdicts
3. Merge BDD results into Phase 8 report:
   → Passed scenario → MET
   → Failed scenario → UNMET
   → No scenario → PARTIAL
```

### Step 5 — Merge Findings

```
Phase 7 findings:  P1-P4 from SECU analysis (focused dimensions only)
Phase 8 findings:  unmet/partial requirements + scope drift

Sort order: P1 → P2 → P3 → P4 → unmet reqs → partial reqs → scope drift
```

### Step 6 — Write Findings to Original Task File

```bash
# Update Review section
tasks update "$WBS" --section Review --from-file /tmp/review_findings.md

# Update Requirements section with verdict badges
tasks update "$WBS" --section Requirements --from-file /tmp/requirements_verdict.md
```

### Step 7 — Gate Check

```bash
bun run check
```

### Step 8 — Verdict (verify mode)

| Phase 7 | Phase 8 | Verdict |
|---------|---------|---------|
| No findings | All met | **PASS** |
| P3/P4 only | ≤1 partial, no unmet | **PASS** |
| P3/P4 only | Partials beyond PASS tolerance, but no unmet | **PARTIAL** |
| No findings | Multiple partials, no unmet | **PARTIAL** |
| — | Any unmet | **FAIL** |
| P1/P2 exist | — | **FAIL** |

### Step 9 — Task Status Update

| Verdict | Status | Next Action |
|---------|--------|-------------|
| PASS | Keep current | — |
| PARTIAL | `In Progress` | `tasks update "$WBS" wip` — "Address P1/P2 findings + partial requirements" |
| FAIL | `In Progress` | `tasks update "$WBS" wip` — "Blockers + unmet requirements prevent completion" |
