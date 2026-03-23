---
name: sys-debugging
description: "Four-phase debugging methodology: root cause first, then fix. For investigating bugs, test failures, and unexpected behavior. Applies to all languages."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-23
updated_at: 2026-03-23
evolved: true
platform: rd3
tags: [debugging, root-cause, engineering-core, troubleshooting]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
  openclaw:
    emoji: "🛠️"
see_also:
  - rd3:tasks
---

# rd3:sys-debugging — Systematic Debugging

Structured four-phase debugging methodology for investigating bugs, test failures, and unexpected behavior. Emphasizes **root cause before fix**.

## When to Use

Apply this skill when:

- **A test is failing** and the cause is unclear
- **An error occurs** at runtime with an unexpected symptom
- **Behavior is intermittent** — passes sometimes, fails others
- **A regression appeared** — "it worked before" scenario
- **Multiple fix attempts** have failed consecutively
- **Debugging from logs or stack traces** without direct code access

**Do not use** for code review, architecture decisions, or feature implementation planning.

## Overview

The four-phase framework:

1. **Root Cause Investigation** — Trace backward from symptom to origin
2. **Pattern Analysis** — Compare working vs broken code
3. **Hypothesis & Testing** — Form and verify one hypothesis at a time
4. **Implementation** — Fix at the source, verify with tests

**Key distinction:**
- **`sys-debugging`** = HOW to investigate and trace root causes
- **`rd3:tasks`** = HOW to create and track the fix task itself

## Workflows

### Standard Debugging Workflow

Use the full sequence when the cause is unknown:

1. **Capture the symptom** — Preserve the exact failure, stack trace, and reproduction conditions
2. **Trace to origin** — Follow the call chain and data flow backward until the original trigger is found
3. **Compare patterns** — Check working vs broken implementations to isolate the meaningful difference
4. **Test one hypothesis** — Change one variable at a time and predict the expected result
5. **Fix the source** — Implement the smallest fix at the root cause
6. **Verify broadly** — Confirm the failing test passes and run the wider regression suite

### Escalation Workflow

Stop and escalate instead of continuing to patch when:

1. **Three fixes fail consecutively**
2. **Each fix exposes a new problem in a different layer**
3. **The defect points to an architectural assumption mismatch**

At that point, document findings, summarize the failed hypotheses, and move the issue into design discussion rather than continuing ad-hoc fixes.

## Quick Start

```
1. Identify the symptom (where does the error appear?)
2. Trace upward: "What called this?" — find the immediate cause
3. Keep tracing until you find where bad data originated
4. Form hypothesis: "The error occurs because X"
5. Design minimal test — change ONE variable at a time
6. Implement fix at the source, not at the symptom
```

For complete walkthroughs, see `references/EXAMPLES.md`.

## Core Principle

**NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.**

Never apply symptom-focused patches that mask underlying problems. Understand WHY something fails before attempting to fix it.

## The Four-Phase Framework

### Phase 1: Root Cause Investigation

Before touching any code:

1. **Read error messages thoroughly** — Every word matters
2. **Reproduce the issue consistently** — If you cannot reproduce it, you cannot verify a fix
3. **Examine recent changes** — What changed before this started failing?
4. **Gather diagnostic evidence** — Logs, stack traces, state dumps
5. **Trace data flow** — Follow the call chain to find where bad values originate

**Root Cause Tracing Technique:**

```
1. Observe the symptom — Where does the error manifest?
2. Find immediate cause — Which code directly produces the error?
3. Ask "What called this?" — Map the call chain upward
4. Keep tracing up — Follow invalid data backward through the stack
5. Find original trigger — Where did the problem actually start?
```

**Key principle:** Never fix problems solely where errors appear — always trace to the original trigger.

### Phase 2: Pattern Analysis

1. **Locate working examples** — Find similar code that works correctly
2. **Compare implementations completely** — Do not just skim
3. **Identify differences** — What is different between working and broken?
4. **Understand dependencies** — What does this code depend on?

### Phase 3: Hypothesis and Testing

Apply the scientific method:

1. **Formulate ONE clear hypothesis** — "The error occurs because X"
2. **Design minimal test** — Change ONE variable at a time
3. **Predict the outcome** — What should happen if hypothesis is correct?
4. **Run the test** — Execute and observe
5. **Verify results** — Did it behave as predicted?
6. **Iterate or proceed** — Refine hypothesis if wrong, implement if right

### Phase 4: Implementation

1. **Create failing test case** — Captures the bug behavior
2. **Implement single fix** — Address root cause, not symptoms
3. **Verify test passes** — Confirms fix works
4. **Run full test suite** — Ensure no regressions
5. **If fix fails, STOP** — Re-evaluate hypothesis

**Critical rule:** If THREE or more fixes fail consecutively, STOP. This signals architectural problems requiring discussion, not more patches.

## Red Flags — Process Violations

Stop immediately if you catch yourself thinking:

- "Quick fix for now, investigate later"
- "One more fix attempt" (after multiple failures)
- "This should work" (without understanding why)
- "Let me just try..." (without hypothesis)
- "It works on my machine" (without investigating difference)

## Warning Signs of Deeper Problems

**Consecutive fixes revealing new problems in different areas** indicates architectural issues:

- Stop patching
- Document what you have found
- Discuss with team before proceeding
- Consider if the design needs rethinking

## Common Debugging Scenarios

### Test Failures

```
1. Read the FULL error message and stack trace
2. Identify which assertion failed and why
3. Check test setup — is the test environment correct?
4. Check test data — are mocks/fixtures correct?
5. Trace to the source of unexpected value
```

### Runtime Errors

```
1. Capture the full stack trace
2. Identify the line that throws
3. Check what values are undefined/null
4. Trace backward to find where bad value originated
5. Add validation at the source
```

### "It worked before"

```
1. Use git bisect to find the breaking commit
2. Compare the change with previous working version
3. Identify what assumption changed
4. Fix at the source of the assumption violation
```

### Intermittent Failures

```
1. Look for race conditions
2. Check for shared mutable state
3. Examine async operation ordering
4. Look for timing dependencies
5. Add deterministic waits or proper synchronization
```

## Debugging Checklist

Before claiming a bug is fixed:

- [ ] Root cause identified and documented
- [ ] Hypothesis formed and tested
- [ ] Fix addresses root cause, not symptoms
- [ ] Failing test created that reproduces bug
- [ ] Test now passes with fix
- [ ] Full test suite passes
- [ ] No "quick fix" rationalization used
- [ ] Fix is minimal and focused

## Success Metrics

Systematic debugging achieves ~95% first-time fix rate vs ~40% with ad-hoc approaches.

Signs you are doing it right:
- Fixes do not create new bugs
- You can explain WHY the bug occurred
- Similar bugs do not recur
- Code is better after the fix, not just "working"

## Language-Specific Debugging Tools

| Language | Debugger | Key Commands |
|----------|---------|-------------|
| **Python** | `pdb` / `ipdb` | `python -m pdb script.py`, `breakpoint()` |
| **TypeScript/Node** | Chrome DevTools | `node --inspect-brk`, `debugger` statement |
| **Go** | `delve` | `dlv debug ./cmd/app`, `dlv test` |
| **Rust** | `rust-gdb` / `lldb` | `rust-gdb target/debug/app` |

**Quick diagnostics:**

```bash
# Python: verbose test with full traceback
pytest -v --tb=long -x tests/

# Node: detect hanging handles
npx jest --detectOpenHandles --runInBand

# Go: race condition detection
go test -race ./...

# Git: find breaking commit
git bisect start && git bisect bad HEAD && git bisect good <tag>
```

## Integration with rd3:tasks

The debugging workflow and task management are complementary:

```
1. Use sys-debugging to identify the root cause
2. Use rd3:tasks to create a task for the fix
3. Use sys-debugging Phase 4 (create failing test, implement fix)
4. Use rd3:tasks to track the fix to completion
```

**See also:** `references/EXAMPLES.md` for complete walkthroughs demonstrating all four phases across Python, TypeScript, and Go.

## Additional Resources

| Resource | Description |
|----------|-------------|
| `references/EXAMPLES.md` | Step-by-step walkthroughs for Python, TypeScript, and Go debugging scenarios |
| `references/techniques.md` | Deep-dive on tracing, profiling, logging strategies, and hypothesis testing |
| `references/common-patterns.md` | Recognizable bug patterns with root causes and detection methods |
| `rd3:tasks` | Task management for tracking fix implementation |

## Platform Notes

### Cross-Platform Usage

This skill is knowledge-only. The shell commands in examples are diagnostic references, not required wrapper syntax, and should be adapted to the toolchain available in the current repo.

### Permissions and Environment

The example commands assume normal local developer access to project files, test runners, language debuggers, and `git`. They should not require elevated filesystem or network permissions, but some tools shown in examples may be unavailable unless the language runtime or debugger is installed locally.
