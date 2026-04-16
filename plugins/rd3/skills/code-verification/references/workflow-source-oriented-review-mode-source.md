---
name: workflow-source-oriented-review-mode-source
description: "Extracted section: Workflow: Source-Oriented Review (`--mode source`)"
see_also:
  - rd3:code-verification
---

# Workflow: Source-Oriented Review (`--mode source`)

**Input:** A path (directory or file). No task-reference accepted.

### Step 1 — Parse Input and Focus

```bash
INPUT="${INPUT:-}"
FIX_MODE="${FIX_MODE:-none}"
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

# Resolve path: default to src/ if empty
if [[ -z "$INPUT" ]]; then
  REVIEW_SCOPE="src/"
elif [[ -d "$INPUT" ]]; then
  REVIEW_SCOPE="$INPUT"
elif [[ -f "$INPUT" ]]; then
  REVIEW_SCOPE="$INPUT"
else
  REVIEW_SCOPE="$INPUT"
fi

echo "Review scope: $REVIEW_SCOPE"
echo "Focus dimensions: ${FOCUS_DIMS:-all}"
```

### Step 2 — Create Findings Task

A new task is always created to hold the findings.

```bash
TASK_OUTPUT=$(tasks create "Review findings: $REVIEW_SCOPE" \
  --background "Code review findings for $REVIEW_SCOPE" \
  --requirements "See Review section" \
  --preset simple 2>&1)

# Robust WBS extraction: try JSON first, then grep fallback
if echo "$TASK_OUTPUT" | grep -q '"wbs"'; then
  FINDINGS_WBS=$(echo "$TASK_OUTPUT" | grep -oP '"wbs"\s*:\s*"\K[^"]+' | head -1)
else
  FINDINGS_WBS=$(echo "$TASK_OUTPUT" | grep -oP '(?<=\[)\d{4}(?=\])' | head -1)
fi

if [[ -z "$FINDINGS_WBS" ]]; then
  logger.error "Failed to extract WBS from tasks create output"
  exit 1
fi
echo "Findings task: $FINDINGS_WBS"
```

### Step 3 — SECU Analysis (conditional on `--focus`)

For each file in `REVIEW_SCOPE`, read content and run checks **only for focused dimensions**.

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

Collect all findings, sort by P-level (P1 → P2 → P3 → P4).

### Step 4 — Write Findings to Task File

Build `/tmp/review_findings.md`:

```bash
cat > /tmp/review_findings.md << 'EOF'
## Review — {date}

**Status:** {n} findings
**Scope:** {scope}
**Focus:** {focus_dims}
**Mode:** source
**Channel:** {inline|<agent>}
**Gate:** `bun run check` → {pass|fail}

### P1 — Blockers
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P2 — Warnings
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P3 — Info
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
### P4 — Suggestions
| # | Title | Dimension | Location | Recommendation |
|---|-------|-----------|----------|----------------|
EOF
```

Append findings rows in format: `| N | <title> | <dimension> | <file:line> | <recommendation> |`

Inject into task:

```bash
tasks update "$FINDINGS_WBS" --section Review --from-file /tmp/review_findings.md
```

### Step 5 — Fix Pass (only if `--fix` is not `none`)

#### `--fix blockers-first`

```
1. Extract all P1 findings
2. For each P1:
   → Apply the specific fix recommendation
   → Run: bun run check
   → If fail: STOP, document blocker that can't be auto-fixed
3. If all P1 fixed + check passes:
   → Fix P2 in order
   → Run: bun run check
   → If fail: STOP
4. If all pass: mark findings "FIXED" in Review section
5. If any fail: note breaking fix in Review section
```

#### `--fix all`

```
1. Apply all fixes (P1→P2→P3→P4)
2. After each batch, run: bun run check
3. Stop on first failure; note breaking fix
4. On success: mark all as "FIXED"
```

### Step 6 — Gate Check

```bash
if ! bun run check; then
  echo "Gate check failed."
  exit 1
fi
```

### Step 7 — Verdict

| Condition | Verdict |
|-----------|---------|
| No findings | **PASS** |
| P3/P4 only, check passes | **PASS** |
| P1/P2 exist, all fixed, check passes | **PARTIAL** |
| Any fix fails | **FAIL** |

### Step 8 — Task Status Update

| Verdict | Status | Command |
|---------|--------|---------|
| PASS | `Done` | `tasks update "$FINDINGS_WBS" done` |
| PARTIAL | `In Progress` | `tasks update "$FINDINGS_WBS" wip` — "Address P1/P2 findings in Review section" |
| FAIL | `In Progress` | `tasks update "$FINDINGS_WBS" wip` — "Fix failures block completion" |
