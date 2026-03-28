# Gate Definitions

This document defines the gates between phases and how they are evaluated.

## Gate Overview

| Gate | Type | Location | Pass Criteria | Fail Action |
|------|------|----------|---------------|-------------|
| Solution Gate | Auto | Before Phase 5 | Solution section populated | Block Phase 5 |
| Design Gate | Human | After Phase 3 | Design approved | Rework/Escalate |
| Test Gate | Auto | After Phase 6 | Coverage >= threshold | Rework/Block |
| Review Gate | Human | After Phase 7 | Review approved | Rework/Escalate |
| Functional Gate | Auto/Human | After Phase 8 | Verdict pass/partial | Rework/Escalate |
| Doc Gate | Auto | After Phase 9 | Docs generated | Rework |

## Gate Type Definitions

### Auto Gates
Auto gates are evaluated by checking output characteristics:
- Presence of expected artifacts
- Metric thresholds (coverage, error count)
- Validation results

### Human Gates
Human gates pause execution and ask for user input:
- Approve: Proceed to next phase
- Reject: Request rework with feedback
- Skip: Skip this phase (with reason)

## Solution Gate

**Location:** Before Phase 5 (Implementation)

**Type:** Auto

**Pass Criteria:**
```typescript
function checkSolutionGate(task: TaskFile): boolean {
    return (
        task.solution.length > 0 &&
        !task.solution.includes('[Solution added by specialists]')
    );
}
```

**Fail Action:** Block Phase 5 execution until Solution is populated

**Why:** Solution gate ensures Phase 5 has clear direction

## Design Gate

**Location:** After Phase 3 (Design)

**Type:** Human

**Pass Criteria:**
- Design document exists
- Major design decisions are documented
- No blocking concerns from reviewer

**Human Approval Prompt:**
```
Phase 3 (Design) completed.

Design summary:
- Components defined: {list}
- API contracts specified: {count}
- Data models: {list}

Approve, reject, or request rework?
```

**Fail Action:** Rework loop (max 2 iterations), then escalate

## Test Gate

**Location:** After Phase 6 (Unit Testing)

**Type:** Auto

**Pass Criteria:**
```typescript
function checkTestGate(task: TaskFile, profile: Profile, coverageOverride?: number): boolean {
    const threshold = coverageOverride ?? (profile === 'unit' ? 90 : PROJECT_COVERAGE_THRESHOLD);
    const hasFailures = task.test_results.some((result) => result.status === 'failed');
    const perFileCoverage = task.coverage?.per_file ?? {};

    if (hasFailures) return false;
    if (profile === 'unit') {
        return Object.values(perFileCoverage).every((value) => value >= threshold);
    }

    return task.coverage?.lines >= threshold;
}
```

**Coverage Threshold:** Project-level constant for task profiles. The `unit` phase profile defaults to per-file coverage >=90%. Override via `--coverage` flag.

**Fail Action:** Rework loop (max 2 iterations), then escalate

**Why:** Coverage thresholds plus 100% passing tests ensure the suite is both broad enough and currently healthy

## Review Gate

**Location:** After Phase 7 (Code Review)

**Type:** Human

**Pass Criteria:**
- No blocking issues (errors)
- Major issues addressed
- Code quality meets standards

**Human Approval Prompt:**
```
Phase 7 (Code Review) completed.

Review summary:
- Issues found: {count}
- Errors: {count}
- Warnings: {count}
- Suggestions: {count}

Blocking issues: {list or "None"}

Approve, reject, or request rework?
```

**Fail Action:** Rework loop (max 2 iterations), then escalate

## Functional Gate

**Location:** After Phase 8 (Functional Review)

**Type:** Auto (verdict) + Human (final approval for fail)

**Pass Criteria:**
```typescript
function checkFunctionalGate(result: FunctionalReviewResult): boolean {
    return result.verdict === 'pass' || result.verdict === 'partial';
}
```

**Verdict Definitions:**
- **pass:** All requirements met
- **partial:** Some requirements partial, no unmet
- **fail:** Any requirement unmet

**For 'partial' verdict:**
- Require human approval to proceed
- Document known limitations

**For 'fail' verdict:**
- Rework loop (max 2 iterations)
- Escalate to user for decision

**Human Approval Prompt (for partial):**
```
Phase 8 (Functional Review) completed.

Review verdict: PARTIAL

Requirements summary:
- Met: {count}
- Partial: {count}
- Unmet: {count}

Partial requirements:
{list with reasons}

Proceed with known limitations, or rework?
```

## Doc Gate

**Location:** After Phase 9 (Documentation)

**Type:** Auto

**Pass Criteria:**
```typescript
function checkDocGate(task: TaskFile): boolean {
    return task.artifacts.docs.length > 0;
}
```

**Fail Action:** Rework loop (max 2 iterations)

## Rework Loop

```typescript
interface ReworkLoop {
    max_iterations: 2;
    feedback: string;
}

function handleRework(phase: Phase, feedback: string): ReworkResult {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
        // Re-execute phase with feedback
        const result = reExecutePhase(phase, feedback);
        
        // Re-evaluate gate
        const gateResult = evaluateGate(phase, result);
        
        if (gateResult.status === 'approved') {
            return { success: true, iterations: i + 1 };
        }
    }
    
    // Max iterations exceeded
    return { success: false, escalate: true };
}
```

## Escalation

When rework loop fails or gate cannot be passed:

```typescript
async function escalate(phase: Phase, reason: string): Promise<void> {
    await askUserQuestion({
        type: 'choice',
        prompt: `ESCALATION: Phase ${phase.number} cannot pass gate.\n\nReason: ${reason}\n\nOptions:`,
        choices: [
            'Force approve (accept risks)',
            'Abort pipeline',
            'Skip phase and continue',
        ],
    });
}
```

## Gate Evaluation Flow

```
Phase N executes
    |
    v
Check gate type
    |
    +-- Auto gate --> Evaluate criteria --> Pass? --> Yes --> Next phase
    |                                                       |
    |                                                       No --> Rework loop
    |
    +-- Human gate --> Ask user --> Approve? --> Yes --> Next phase
                                     |
                                     No --> Rework loop
```

## Gate Audit Trail

Each gate evaluation is logged:
```typescript
interface GateLog {
    phase: PhaseNumber;
    gate_type: 'auto' | 'human';
    timestamp: string;
    result: 'passed' | 'failed' | 'skipped' | 'rework';
    details: object;
    iterations?: number;
}
```
