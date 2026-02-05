---
name: test-cycle
description: Universal test execution, verification, and fix iteration workflow with 3-iteration limit, escalation protocol, and comprehensive verification checklists.
---

# Test Cycle

## Overview

Universal test execution, verification, and fix iteration workflow for rd2 agents. Provides a systematic approach to running tests, handling failures, and escalating when automatic fixes fail after 3 iterations.

**Key features:**
- Test execution flow with command detection
- Test result handling (pass/fail scenarios)
- Fix iteration cycle (max 3 iterations with escalation)
- Pre-execution verification checklist
- Blocker detection and documentation
- Post-execution verification

**Used by:** `super-coder`, `super-code-reviewer`, `super-architect`, any agent doing verification

## Test Execution Flow

### When to Enter Test Cycle

- After code generation completes
- After any fix iteration
- When task status transitions to Testing

### Test Execution Steps

1. **Check test infrastructure** — Verify test framework is available
2. **Run tests** — Execute test command for the codebase
3. **Capture results** — Record pass/fail counts and failure details
4. **Analyze results** — Categorize failures by type
5. **Update status** — Based on test results (via `rd2:tasks update`)

### Test Command Detection

```bash
# Python
pytest tests/ -v

# TypeScript/Node
npm test
# OR
vitest run

# Go
go test ./...

# Rust
cargo test

# Java (Maven)
mvn test

# C# (dotnet)
dotnet test
```

**Detection priority:**
1. Check package.json for `test` script
2. Check pyproject.toml/setup.py for pytest config
3. Check go.mod for Go modules
4. Check Cargo.toml for Rust projects
5. Fallback to common patterns

## Test Result Handling

### IF All Tests Pass

```
1. Update task status to Done (via rd2:tasks update WBS done)
2. Document test results in task file
3. Report completion with test coverage
4. Exit code→test→fix cycle successfully
```

**Success Report Format:**

```markdown
## ✅ Tests Passed: {Task Name}

**Test Results:**
- Total tests: {count}
- Passed: {count}
- Failed: 0
- Duration: {time}

**Coverage:** {percentage}% (if available)

**Status Updated:** Done (via rd2:tasks)
```

### IF Tests Fail

```
1. Enter Fix Iteration Cycle (max 3 iterations)
2. Update status remains Testing
3. Document test failures in task file
4. Proceed to fix iteration
```

**Failure Report Format:**

```markdown
## ❌ Tests Failed: {Task Name}

**Test Results:**
- Total tests: {count}
- Passed: {count}
- Failed: {count}

**Failure Summary:**
{failure_summary}

**Entering Fix Iteration:** 1/3
```

## Fix Iteration Cycle (Max 3)

### Iteration 1/3

1. **Analyze failure** — Parse test output, identify root cause
2. **Identify failure type:**
   - Logic error (incorrect behavior)
   - Edge case (missing handling)
   - Integration issue (component mismatch)
   - Environment issue (config, dependency)
3. **Apply fix** — Modify code to address the failure
4. **Re-run tests** — Execute tests again
5. **Check results:**
   - IF pass → Mark Done, exit cycle
   - IF fail AND iteration < 3 → Increment, repeat from start
   - IF fail AND iteration == 3 → Escalate to user

### Iteration 2/3 (if needed)

- If different failure → Analyze new issue, apply fix
- If same failure → Re-examine approach, try alternative solution
- Continue with same cycle as iteration 1

### Iteration 3/3 (final attempt)

- Last automatic fix attempt
- After failure → Mark status as "Testing" with escalation note
- Prepare escalation report

## Escalation Protocol

### When 3 Fix Iterations Are Exhausted

```
1. STOP fixing automatically
2. Update task status: Testing (escalated) via rd2:tasks update WBS testing
3. Add note to task file: "Review required after 3 fix iterations"
4. Document all 3 attempts with test output
5. Report to user with:
   - Summary of failures
   - Test output from each iteration
   - Recommendation: Manual review or expert consultation
6. Return to orchestrator for next decision
```

### Escalation Report Format

```markdown
## ⚠️ Fix Iterations Exhausted: {Task Name}

**WBS#:** {wbs_number}
**Task File:** docs/prompts/{WBS}*{name}.md

**Status**: Testing (escalated for review)
**Reason**: 3 fix iterations attempted, tests still failing

**Test Results Summary:**
- **Iteration 1:** {failure_summary}
- **Iteration 2:** {failure_summary}
- **Iteration 3:** {failure_summary}

**Test Output (Final):**
```
{paste final test output}
```

**Recommendation**: Manual expert review required

**Next Steps:**
- Review code and test logic
- Consider alternative implementation approach
- Consult domain expert if needed

**Status Update:** Via rd2:tasks (already set to Testing)
**Confidence:** LOW (automatic fixes exhausted)
```

## Pre-Execution Checklist

### Before ANY Test Execution

```
[ ] 1. Task File Verification
[ ]     Task file exists and is readable
[ ]     Frontmatter parses correctly (YAML valid)
[ ]     Status field present (Backlog/Todo/WIP/Testing/Done)
[ ]     impl_progress section present (if tracking phases)
[ ]     Dependencies field parses correctly

[ ] 2. Dependency Verification
[ ]     All prerequisite dependencies satisfied
[ ]     Required files/artifacts exist in codebase
[ ]     No circular dependency issues
[ ]     External dependencies are available/accessible

[ ] 3. Test Infrastructure Check
[ ]     Test framework installed (pytest, vitest, go test, cargo test)
[ ]     Test files exist or can be generated
[ ]     Test dependencies installed
[ ]     Test command is executable

[ ] 4. Artifact Validation
[ ]     Required source files exist
[ ]     Build configuration is valid
[ ]     Environment variables are configured
[ ]     No missing referenced paths

[ ] 5. Status Update
[ ]     Run: tasks update WBS testing (before test execution)
[ ]     Update TodoWrite: status: "in_progress"
[ ]     Confirm both systems synchronized

[ ] 6. Tool/Skill Verification
[ ]     Required coder/agent skills are available
[ ]     Fallback options identified
[ ]     rd2:anti-hallucination ready (if external APIs)

[ ] 7. Confidence Assessment
[ ]     Requirements clarity: HIGH/MEDIUM/LOW
[ ]     Test infrastructure: CONFIRMED/MISSING
[ ]     Overall confidence: ___ %
```

## Blocker Detection

### Blocker Types

| Blocker Type | Indicators | Resolution |
|--------------|------------|------------|
| **Missing Task File** | File not found at expected path | Verify WBS#, check file exists |
| **Malformed Frontmatter** | YAML parse error, missing status | Fix frontmatter format |
| **Unsatisfied Dependencies** | Dependent tasks incomplete | Wait for dependencies or adjust order |
| **Missing Artifacts** | Referenced files don't exist | Create missing artifacts or adjust paths |
| **No Test Framework** | Test command fails, framework not installed | Install test framework or document blocker |
| **Tool Unavailable** | Selected skill not accessible | Use fallback tool or notify user |
| **External API Unverified** | Using API without verification | Run verification first or mark LOW confidence |
| **Test Infrastructure Issues** | Config errors, missing dependencies | Fix configuration or document blocker |

### Blocker Documentation Format

```markdown
## ⚠️ Execution Blocked: {Task Name}

**WBS#:** {wbs_number}
**Task File:** docs/prompts/{WBS}*{name}.md

**Blocker Type:** {Missing Task File / Malformed Frontmatter / Unsatisfied Dependencies / Missing Artifacts / No Test Framework / Tool Unavailable / External API Unverified / Test Infrastructure Issues}

**Reason:** {detailed explanation of what's blocking execution}

**Affected Phase:** {Phase number or name}

**Resolution Steps:**

1. {step_1 - specific action}
2. {step_2 - specific action}
3. {step_3 - specific action}

**Status Update:**
- tasks CLI: `tasks update {WBS} blocked`
- TodoWrite: status: "pending" + blocker note

**Confidence:** HIGH (blocker verified and documented)

**Recovery:**
- After resolution: Re-run `--task {WBS}` or `--resume`
- Alternative: {fallback_option}
```

## Post-Execution Verification

### After Code Generation Completes

```
[ ] 1. Write succeeded (no write errors)
[ ] 2. Files created/modified as expected
[ ] 3. Code compiles/builds without errors
[ ] 4. Tests run (if test infrastructure available)
[ ] 5. Test results captured (pass/fail counts)
[ ] 6. Status updated (WIP → Testing or Done) via rd2:tasks
[ ] 7. Verification write confirmed (re-read file)
```

### Exit Conditions

- **Success:** All checkpoints pass → Continue to test phase
- **Partial Success:** Code generated, tests pending → Enter test phase
- **Blocked:** Document blocker, pause for resolution
- **Failure:** Critical error → Report to user, suggest recovery

## Special Cases

### No Tests Available

- Document reason: "No test infrastructure configured"
- Mark task as Done with caveat: "Code not tested"
- Add note to task file for future testing

### Non-Code Tasks

- Skip test phase for documentation, research, design tasks
- Mark directly to Done after completion

### Test Infrastructure Issues

- Document blocker type: Configuration
- Add resolution steps: Install/configure test framework
- Mark task status with blocker note

## Delegation to rd2:tasks

### Status Updates During Test Cycle

```bash
# Before running tests
tasks update WBS testing

# After tests pass
tasks update WBS done

# After tests fail (enter fix cycle)
# Status remains "testing"

# After escalation (3 failures)
# Status remains "testing" with escalation note
```

### What rd2:tasks Handles

- Task status updates (`tasks update WBS status`)
- Kanban board synchronization (`tasks refresh`)
- TodoWrite sync (automatic via hooks)

### What This Skill Handles

- Test execution flow and command detection
- Fix iteration cycle logic
- Escalation protocol
- Verification checklists
- Blocker detection and documentation

## Quick Reference

### Test Cycle Flow

```
Code Generation Complete
        ↓
   Pre-Execution Checklist
        ↓
   Run Tests
        ↓
    ┌───┴───┐
    ↓       ↓
  Pass    Fail
    ↓       ↓
  Done   Fix Iteration 1/3
           ↓
        ┌──┴──┐
        ↓     ↓
      Pass  Fail
        ↓     ↓
       Done  Iteration 2/3
              ↓
           ┌──┴──┐
           ↓     ↓
         Pass  Fail
           ↓     ↓
          Done  Escalate
```

### Fix Iteration Limit

```
Iteration 1 → Attempt fix
Iteration 2 → Alternative approach
Iteration 3 → Final attempt
After 3 → Escalate to user
```

### Status Updates (via rd2:tasks)

```bash
# Before tests
tasks update WBS testing

# Tests pass
tasks update WBS done

# Tests fail (enter fix cycle)
# Status remains "testing"

# Escalation (3 failures)
# Status remains "testing" with note
```

## References

- `rd2:tasks` skill - Task status management
- `rd2:tdd-workflow` skill - TDD methodology
- `rd2:anti-hallucination` skill - API verification
