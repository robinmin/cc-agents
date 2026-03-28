---
name: orchestration-dev
description: "9-phase orchestration pipeline coordinator: reads task profile, executes phases with gates, delegates to specialist skills. Capstone skill for the rd3 pipeline. Persona: Senior Workflow Architect."
license: Apache-2.0
version: 1.1.0
created_at: 2026-03-27
updated_at: 2026-03-27
platform: rd3
type: orchestration
tags: [orchestration, pipeline, phase-gates, delegation, capstone]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
  category: orchestration
  interactions:
    - orchestrator
see_also:
  - rd3:run-acp
  - rd3:request-intake
  - rd3:backend-architect
  - rd3:frontend-architect
  - rd3:backend-design
  - rd3:frontend-design
  - rd3:ui-ux-design
  - rd3:task-decomposition
  - rd3:code-implement-common
  - rd3:sys-testing
  - rd3:advanced-testing
  - rd3:code-review-common
  - rd3:bdd-workflow
  - rd3:functional-review
  - rd3:code-docs
  - rd3:dev-gitmsg
  - rd3:dev-changelog
  - rd3:dev-fixall
---

# rd3:orchestration-dev — 9-Phase Pipeline Orchestrator

Profile-driven orchestration that executes the 9-phase workflow by delegating each phase to specialist skills, managing gates, and handling rework loops.

**Key distinction:**
- **`orchestration-dev`** = pipeline orchestration (coordinates all phases)
- **`request-intake`** = Phase 1 requirements elicitation
- **`task-decomposition`** = Phase 4 task breakdown
- **`bdd-workflow`** = Phase 8a BDD execution
- **`functional-review`** = Phase 8b requirements traceability

## When to Use

**Trigger phrases:** "orchestrate pipeline", "run 9-phase workflow", "execute phases", "orchestrate task"

Load this skill when:
- Starting a new task that requires full 9-phase pipeline
- Resuming an interrupted task from a specific phase
- Executing a dry-run to preview the execution plan
- Managing phase gates and rework loops

Do not load this skill directly for single-phase work. Use the specific phase skill instead.

## Overview

The orchestration-dev skill:

1. **Reads** task frontmatter for profile (simple/standard/complex/research)
2. **Determines** which phases to execute based on profile
3. **Sequences** phases in dependency order
4. **Delegates** each phase to its specialist skill
5. **Evaluates** gate (human or auto) after each phase
6. **Handles** rework loops (max 2 iterations)
7. **Persists** results to task file between phases
8. **Routes** work to the requested execution channel

## Input Schema

```typescript
interface OrchestrationInput {
    task_ref: string;                    // WBS number or path to task file
    profile?: Profile;                   // Override profile from frontmatter
    skip_phases?: PhaseNumber[];         // Phases to skip (CLI: --skip-phases)
    dry_run?: boolean;                   // Output plan without executing
    auto?: boolean;                      // Auto-approve human gates (no pause)
    coverage?: number;                   // Override phase 6 coverage target (unit profile default: per-file 90%)
    refine?: boolean;                    // Pass mode=refine to request-intake (phase 1)
    execution_channel?: string;          // Default: 'current'; ACP agent name for cross-channel execution
}
```

## Profile System

Two profile types control phase selection:

### Task Profiles

Determine which phases run based on task complexity. Default: read from task frontmatter, fall back to `standard`.

| Profile | Phases | Description |
|---------|--------|-------------|
| `simple` | 5, 6 | Single deliverable, 1-2 files, well-understood |
| `standard` | 1, 4, 5, 6, 7, 8(bdd), 9(refs) | Moderate scope, 2-5 files |
| `complex` | 1-9 (all) | Large scope, 6+ files, full rigor |
| `research` | 1-9 (all) | Investigation-heavy work with a lighter default test gate |

### Phase Profiles

Run a specific phase or group. Used by convenience commands (`/rd3:dev-refine`, `/rd3:dev-unit`, etc.).

| Profile | Phases | Description |
|---------|--------|-------------|
| `refine` | 1 | Requirements refinement (refine mode) |
| `plan` | 2, 3, 4 | Architecture, design, decomposition |
| `unit` | 6 | Unit testing only with default target: per-file coverage >=90% and 100% pass |
| `review` | 7 | Code review only |
| `docs` | 9 | Documentation only |

## Phase Numbers

```typescript
type PhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const PHASE_NAMES: Record<PhaseNumber, string> = {
    1: 'Request Intake',
    2: 'Architecture',
    3: 'Design',
    4: 'Task Decomposition',
    5: 'Implementation',
    6: 'Unit Testing',
    7: 'Code Review',
    8: 'Functional Review',
    9: 'Documentation',
};
```

## Execution Flow

### Dry-Run Mode

```typescript
async function dryRun(input: OrchestrationInput): Promise<ExecutionPlan> {
    // Read task profile
    const task = readTaskFile(input.task_ref);
    const profile = input.profile || task.frontmatter.profile || 'standard';

    // Generate execution plan
    const plan = createExecutionPlan(input.task_ref, {
        profile,
        skipPhases: input.skip_phases,
        auto: input.auto,
        dryRun: true,
        refine: input.refine,
        executionChannel: input.execution_channel,
    });

    // Output plan without side effects
    return plan;
}
```

### Full Execution Mode

```typescript
async function execute(input: OrchestrationInput): Promise<ExecutionResult> {
    const task = readTaskFile(input.task_ref);
    const profile = input.profile || task.frontmatter.profile || 'standard';

    // Build execution queue
    const queue = buildExecutionQueue(profile, input);

    const results: PhaseResult[] = [];

    for (const phase of queue) {
        // Log phase start
        updateImplProgress(task.wbs, phase, 'in_progress');

        // Execute phase
        const phaseResult = await executePhase(phase, task);
        results.push(phaseResult);

        // Evaluate gate
        const gateResult = evaluateGate(phase, phaseResult);

        if (gateResult.status === 'rejected') {
            // Rework loop (max 2)
            const reworkResult = await handleRework(phase, task, gateResult);
            if (reworkResult.escalate) {
                return { status: 'failed', failed_phase: phase.number };
            }
        }

        // Update progress
        updateImplProgress(task.wbs, phase, 'completed');
    }

    return { status: 'completed', results };
}
```

## Phase Delegation

### Phase -> Skill Mapping

| Phase | Primary Skill(s) | Inputs | Outputs |
|-------|------------------|--------|---------|
| 1 | `rd3:request-intake` | task_ref, description, domain_hints, mode, execution_channel | Background, Requirements, Constraints, profile |
| 2 | `rd3:backend-architect` OR `rd3:frontend-architect` | task_ref, requirements, execution_channel | Architecture doc |
| 3 | `rd3:backend-design` OR `rd3:frontend-design` OR `rd3:ui-ux-design` | task_ref, architecture, execution_channel | Design specs |
| 4 | `rd3:task-decomposition` | task_ref, execution_channel | Subtasks WBS list |
| 5 | `rd3:code-implement-common` | task_ref, execution_channel | Implementation artifacts |
| 6 | `rd3:sys-testing` + `rd3:advanced-testing` | task_ref, coverage target, execution_channel | Test results, coverage report |
| 7 | `rd3:code-review-common` | task_ref, execution_channel | Review report |
| 8 | `rd3:bdd-workflow` + `rd3:functional-review` | task_ref, bdd_report, execution_channel | Verdict |
| 9 | `rd3:code-docs` | task_ref, source_paths?, target_docs?, change_summary?, execution_channel | Refreshed project docs |

**All 15 specialist skills**: request-intake, backend-architect, frontend-architect, backend-design, frontend-design, ui-ux-design, task-decomposition, code-implement-common, sys-testing, advanced-testing, code-review-common, bdd-workflow, functional-review, code-docs, orchestration-dev. Skill selection for phases 2/3 is context-dependent (backend vs frontend vs full-stack). See `references/delegation-map.md` for complete input/output specs.

### Delegation Pattern

```typescript
async function executePhase(phase: Phase, task: TaskFile): Promise<PhaseResult> {
    const skill = getSkillForPhase(phase.number);
    const executionChannel = input.execution_channel ?? 'current';
    const phaseInput = {
        ...buildPhaseInput(phase, task),
        execution_channel: executionChannel,
    };

    const result =
        executionChannel === 'current'
            ? await delegateToSkill(skill, phaseInput)
            : await delegateViaRunAcp(executionChannel, skill, phaseInput);

    return {
        phase: phase.number,
        output: result,
        artifacts: extractArtifacts(result),
    };
}
```

### Channel Resolution

- `execution_channel: 'current'` means execute on the current channel.
- Any other value should be an ACP agent name supported by `rd3:run-acp`.
- Slash command wrappers expose this as `--channel <agent|current>` and map it into `execution_channel`.

## Gate Definitions

### Gate Types

| Gate | Type | Trigger | Resolution |
|------|------|---------|------------|
| Solution Gate | Auto | Solution section populated | Pass/Fail |
| Design Gate | Human | Design section reviewed | Approve/Reject/Rework |
| Test Gate | Auto | Coverage target met and 100% tests pass | Pass/Fail |
| Review Gate | Human | Code review completed | Approve/Reject |
| Functional Gate | Auto/Human | BDD + functional review | Pass/Partial/Fail |
| Documentation Gate | Auto | Docs generated | Pass/Fail |

### Auto Gates

```typescript
const AUTO_GATES: Record<PhaseNumber, GateChecker> = {
    5: (result) => result.artifacts.length > 0,
    6: (result) =>
        result.failed_tests === 0 &&
        Object.values(result.coverage.per_file ?? {}).every((value) => value >= getCoverageThreshold(profile, input.coverage)),
    7: (result) => result.issues.filter(i => i.severity === 'error').length === 0,
    8: (result) => result.verdict !== 'fail',
    9: (result) => result.artifacts.length > 0,
};

function getCoverageThreshold(profile: Profile, override?: number): number {
    if (override !== undefined) return override; // --coverage flag wins
    if (profile === 'unit') return 90;          // /dev-unit stricter default
    return PROFILE_DEFAULT_COVERAGE_THRESHOLD;  // 60% for simple/research, 80% otherwise
}
```

### Human Gates

For phases with human gates (Design, Review):

**Normal mode** — pauses for human approval:
```typescript
const humanGateResult = await askUserQuestion({
    type: 'approval',
    prompt: `Phase ${phase.number} (${phase.name}) completed. Review output and approve or request rework.`,
    choices: ['approve', 'reject', 'rework'],
});
```

**Auto mode** (`--auto` flag) — auto-approves all human gates without pausing:
```typescript
if (input.auto) {
    // Auto-approve: log and continue without pausing
    logger.info(`Phase ${phase.number} (${phase.name}): auto-approved (human gate bypassed)`);
    gateResult = { status: 'approved' };
} else {
    // Normal: pause for human review
    gateResult = await askUserQuestion({ ... });
}
```

When `--auto` is set, human gates (Design Gate, Review Gate, Functional Gate) are auto-approved. This enables end-to-end execution for commands like `dev-run` that need continuous flow.

**Skip phase safety:** `--skip-phases` is intentionally limited to trailing phases only. Skipping an interior phase would leave later phases without the inputs they require.

## Rework Loop

```typescript
async function handleRework(
    phase: Phase,
    task: TaskFile,
    gateResult: GateResult
): Promise<ReworkResult> {
    let iterations = 0;
    const MAX_ITERATIONS = 2;

    while (iterations < MAX_ITERATIONS) {
        iterations++;

        // Gather rework feedback
        const feedback = gateResult.rejection_reason;

        // Re-execute phase with feedback
        const result = await executePhaseWithFeedback(phase, task, feedback);

        // Re-evaluate gate
        const newGateResult = evaluateGate(phase, result);

        if (newGateResult.status === 'approved') {
            return { escalate: false, iterations };
        }
    }

    // Max iterations exceeded
    return { escalate: true, iterations, reason: 'Max rework iterations exceeded' };
}
```

## Execution Plan

See `references/phase-matrix.md` for the complete profile x phase matrix.
See `references/gate-definitions.md` for auto vs human gate definitions.
See `references/delegation-map.md` for phase -> skill mapping.

## Integration

**tasks CLI integration:**
```bash
# Full orchestration (profile from task file)
rd3:orchestration-dev 0266

# Override profile
rd3:orchestration-dev 0266 --profile complex

# Phase profile (single phase)
rd3:orchestration-dev 0266 --profile refine
rd3:orchestration-dev 0266 --profile unit

# Auto-approve human gates (end-to-end, no pauses)
rd3:orchestration-dev 0266 --auto

# Override the default unit coverage target
rd3:orchestration-dev 0266 --coverage 90

# Dry run (preview)
rd3:orchestration-dev 0266 --dry-run

# Combined: auto + custom coverage
rd3:orchestration-dev 0266 --auto --coverage 90
```

**Phase integration:**
- Orchestrates all 9 phases in dependency order
- Uses tasks CLI for progress tracking
- Reads/writes task file sections between phases

## v1 Limitations

- **Sequential only:** No parallel phase execution
- **No verification-chain:** Gates use simple checks, not CoV
- **No conditional branching:** Fixed phase order per profile
- **No rollback:** Cannot undo a completed phase

**v2 enhancements planned:**
- Parallel execution where phases are independent
- verification-chain integration for complex gates
- Conditional branching based on phase output
- Rollback capability for failed phases
