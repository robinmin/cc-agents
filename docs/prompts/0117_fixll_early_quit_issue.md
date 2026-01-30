---
name: Fix rd2:tasks-fixall early quit issue
description: Prevent LLM from prematurely claiming success before validation command exits with code 0
status: Done
created_at: 2026-01-30 09:58:52
updated_at: 2026-01-30 11:00:00
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0117. Fix rd2:tasks-fixall Early Quit Issue

### Background

When using `rd2:tasks-fixall` to run validation commands and fix errors, the LLM frequently exits prematurely after one or two rounds of auto-fix, claiming success when the validation command still fails.

**Root Cause Analysis:**
1. **Missing exit code verification** — Phase 6 greps for "error" text instead of checking actual exit code
2. **No explicit quit criteria** — The command lacks enforceable termination conditions
3. **Hallucination after auto-fix** — LLM sees "fewer errors" and declares victory without verification
4. **No iteration limit** — No mechanism to prevent infinite loops or force user intervention

**Evidence from code review:**
- Phase 1 captures `EXIT_CODE=${PIPESTATUS[0]}` but Phase 6 never rechecks it
- Phase 6 uses `grep -c "error"` which misses failures with non-standard output
- Completion criteria (lines 347-354) are documentation only, not enforced

### Requirements

**Acceptance Criteria:**

1. **Add `--max-retry` option** — Default 5, configurable maximum iterations
2. **Add `rd2:anti-hallucination` skill** — Include in frontmatter for verification discipline
3. **Embed explicit verification checkpoints** — Hardcoded exit-code checks that cannot be skipped
4. **Require proof of completion** — LLM must output literal `EXIT_CODE=0` before claiming success
5. **Add escalation at retry limit** — Ask user: [Continue / Escalate to super-planner / Stop]
6. **Keep self-contained design** — No agent delegation (option A), escalation is future enhancement

**Non-Negotiable Exit Condition:**
- The ONLY way to complete successfully is `EXIT_CODE=0` from the validation command
- Any other exit code means FAILURE, continue fixing

### Q&A

**Q1: When does premature exit typically occur?**
A: After auto-fix phase (Phase 3). LLM runs biome/ruff, sees cleaner output, declares victory.

**Q2: What loop behavior is expected?**
A: Loop with iteration limit (`--max-retry`, default 5). After limit, ask user to continue/escalate/stop.

**Q3: How to integrate anti-hallucination?**
A: Both approaches — add to skills frontmatter AND embed explicit verification checkpoints.

**Q4: Should we use super-planner for orchestration?**
A: No, keep self-contained (option A). Add escalation option at retry limit for future enhancement.

**Q5: How strong should verification language be?**
A: Very strong — explicit "non-negotiable" language plus proof-of-completion requirement (must show `EXIT_CODE=0`).

**Q6: What happens at retry limit?**
A: Ask with escalation option: [Continue / Escalate to super-planner / Stop]

### Design

#### 1. Updated Frontmatter

```yaml
---
description: Fix all lint, type, and test errors using deterministic single-pass workflow with sys-debugging methodology
skills:
  - rd2:sys-debugging
  - rd2:anti-hallucination    # NEW: Prevent premature completion
argument-hint: "[<validation-command>] [--max-retry=5]"
---
```

#### 2. New Arguments Table

| Argument             | Required | Default | Description                                      |
| -------------------- | -------- | ------- | ------------------------------------------------ |
| `validation-command` | No       | auto    | Command to validate (e.g., `npm test`)           |
| `--max-retry`        | No       | 5       | Maximum fix iterations before asking to continue |

#### 3. Mandatory Exit Condition Section (NEW)

```markdown
## MANDATORY EXIT CONDITION (Non-Negotiable)

**The ONLY way to complete this command successfully is:**
1. Run the validation command: `eval "$VALIDATION_CMD"`
2. Check the exit code: `echo "EXIT_CODE=$?"`
3. EXIT_CODE must equal 0

**If EXIT_CODE ≠ 0:**
- You have NOT completed the task
- You MUST continue fixing
- Do NOT write a summary report
- Do NOT claim success

**Proof of Completion Required:**
Before claiming success, you MUST show the terminal output containing:
```
EXIT_CODE=0
```
If you cannot show this literal output, you have NOT succeeded.

**Hallucination Red Flags — STOP if you think:**
- ❌ "The errors look fixed" (check exit code, not appearance)
- ❌ "Most tests pass" (partial success = failure)
- ❌ "Good enough for now" (0 is the only acceptable exit code)
- ❌ "I've done several iterations" (iteration count is irrelevant; only EXIT_CODE=0 matters)
```

#### 4. Updated Phase 6: Final Validation

```bash
# Final validation with EXIT CODE check (not grep)
eval "$VALIDATION_CMD" 2>&1 | tee "$FIXALL_LOG"
EXIT_CODE=$?
echo "EXIT_CODE=$EXIT_CODE"

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "✅ VALIDATION PASSED - EXIT_CODE=0"
else
  echo "❌ VALIDATION FAILED - EXIT_CODE=$EXIT_CODE"
  echo "You MUST continue fixing. Do NOT claim success."
fi
```

#### 5. Retry Loop Logic

```markdown
### Retry Loop

RETRY_COUNT=0
MAX_RETRY=${max_retry:-5}

while [ "$EXIT_CODE" -ne 0 ] && [ "$RETRY_COUNT" -lt "$MAX_RETRY" ]; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "--- Iteration $RETRY_COUNT of $MAX_RETRY ---"

  # Run Phase 4-5 (diagnose and fix)
  # Run Phase 6 (validate)
  # Check EXIT_CODE
done

if [ "$EXIT_CODE" -ne 0 ]; then
  # Max retries reached - ask user
  AskUserQuestion:
    - "Continue fixing (reset counter)"
    - "Escalate to super-planner"
    - "Stop and show remaining errors"
fi
```

### Plan

1. **Update frontmatter** — Add `rd2:anti-hallucination` skill, update argument-hint
2. **Update Arguments table** — Add `--max-retry` option with default 5
3. **Add MANDATORY EXIT CONDITION section** — Insert after Quick Start, before When to Use
4. **Restructure workflow** — Change from 6-phase to 7-phase with explicit retry loop
5. **Update Phase 6 (now inside loop)** — Replace grep-based check with exit-code verification
6. **Add Phase 7: Retry Loop Control** — Counter management, user prompts, escalation
7. **Update Error Handling section** — Add escalation options (Continue/Escalate/Stop)
8. **Update Completion Criteria** — Emphasize EXIT_CODE=0 and proof requirement
9. **Update Examples** — Show retry loop in action
10. **Test manually** — Verify LLM cannot exit without showing EXIT_CODE=0

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Task File | docs/prompts/0117_fixll_early_quit_issue.md | brainstorming | 2026-01-30 |
| Target File | plugins/rd2/commands/tasks-fixall.md | implementation | 2026-01-30 |

### References

- [Current tasks-fixall.md](../../plugins/rd2/commands/tasks-fixall.md)
- [rd2:anti-hallucination skill](../../plugins/rd2/skills/anti-hallucination/)
- [rd2:sys-debugging skill](../../plugins/rd2/skills/sys-debugging/)
