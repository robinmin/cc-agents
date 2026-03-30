---
name: orchestration-dev
description: "9-phase orchestration pipeline coordinator: reads task profile, executes phases with gates, delegates to specialist skills. Capstone skill for the rd3 pipeline. Persona: Senior Workflow Architect."
license: Apache-2.0
version: 1.3.0
created_at: 2026-03-27
updated_at: 2026-03-30
platform: rd3
type: orchestration
tags: [orchestration, pipeline, phase-gates, delegation, capstone]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity,pi"
  category: orchestration
  interactions:
    - pipeline
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

Profile-driven orchestration that executes the 9-phase workflow by delegating each phase to specialist skills, managing gates, and handling rework loops. Phases 5, 6, and 7 use dedicated worker agents while all other phases stay on the direct-to-skill path.

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

## Quick Start

```bash
# Full pipeline on a task (use an ACP channel for end-to-end heavy worker execution in v1)
rd3:orchestration-dev 0266 --channel codex

# Dry run — preview what would execute
rd3:orchestration-dev 0266 --dry-run

# End-to-end with auto-approved human gates
rd3:orchestration-dev 0266 --auto --channel codex

# Override coverage target for a local unit-only run
rd3:orchestration-dev 0266 --profile unit --coverage 90

# Resume from a specific phase
rd3:orchestration-dev 0266 --start-phase 5 --channel codex

# Single phase profiles
rd3:orchestration-dev 0266 --profile unit    # Phase 6 only
rd3:orchestration-dev 0266 --profile review --channel codex  # Phase 7 only
rd3:orchestration-dev 0266 --profile docs     # Phase 9 only
```

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
9. **Supports** suffix execution via `start_phase` when resuming or intentionally entering mid-pipeline

## Input Schema

```typescript
interface OrchestrationInput {
    task_ref: string;                    // WBS number or path to task file
    profile?: Profile;                   // Override profile from frontmatter
    start_phase?: PhaseNumber;           // Start from this phase within the selected profile
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
| 5 | `rd3:super-coder` -> `rd3:code-implement-common` | task_ref, execution_channel | Implementation artifacts |
| 6 | `rd3:super-tester` -> `rd3:sys-testing` + `rd3:advanced-testing` | task_ref, coverage target, execution_channel | Test results, coverage report |
| 7 | `rd3:super-reviewer` -> `rd3:code-review-common` | task_ref, execution_channel | Review report |
| 8 | `rd3:bdd-workflow` + `rd3:functional-review` | task_ref, bdd_report, execution_channel | Verdict |
| 9 | `rd3:code-docs` | task_ref, source_paths?, target_docs?, change_summary?, execution_channel | Refreshed project docs |

**Routing policy:** `rd3:orchestration-dev` remains the only routing authority. Phase workers for 5, 6, and 7 are thin adapters over the canonical backbones and must not recurse back into orchestration. Skill selection for phases 2/3 remains context-dependent (backend vs frontend vs full-stack). See `references/delegation-map.md` for complete input/output specs.

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

### Heavy-Phase Worker Contract

Phases 5, 6, and 7 use the normalized `rd3-phase-worker-v1` contract:

- Inputs: `task_ref`, `phase_context`, `execution_channel`, plus phase-specific goals such as `coverage_threshold` or `review_depth`.
- Outputs: `status`, `phase`, artifacts or findings, `evidence_summary`, optional `failed_stage`, and `next_step_recommendation`.
- Anti-recursion: worker agents must not call `rd3:orchestration-dev`, must not change phase ownership, and must not reinterpret execution-channel semantics.

### Channel Resolution

- `execution_channel: 'current'` means execute on the current channel when the selected phase has a local pilot runner.
- Any other value should be an ACP agent name supported by `rd3:run-acp`.
- Slash command wrappers expose this as `--channel <agent|current>` and pass it into orchestration unchanged.
- `rd3:orchestration-dev` is the routing authority. It normalizes aliases, keeps direct-skill work local, runs the Phase 6 pilot locally on `current`, and uses ACP-backed execution for worker phases that do not yet have a local runner.
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

## Workflows

### Standard Development Workflow

```
Task File → Phase 1 (Intake) → Phase 4 (Decompose) → Phase 5 (Implement)
          → Phase 6 (Test) → Phase 7 (Review) → Phase 8 (BDD) → Phase 9 (Docs)
```

### Complex Project Workflow

```
Task File → Phase 1 (Intake) → Phase 2 (Architecture) → Phase 3 (Design)
          → Phase 4 (Decompose) → Phase 5 (Implement) → Phase 6 (Test)
          → Phase 7 (Review) → Phase 8 (BDD + Functional) → Phase 9 (Docs)
```

### Unit Testing Focus Workflow

```
Task File → Phase 6 (Unit Testing) with --coverage 90
```

### Documentation Refresh Workflow

```
Task File → Phase 9 (Documentation)
```

### Resume Interrupted Work

```bash
# Resume from phase 5
rd3:orchestration-dev 0266 --start-phase 5 --channel codex

# Auto-approve gates and continue
rd3:orchestration-dev 0266 --start-phase 5 --auto --channel codex
```

### Dry Run + Execute Cycle

```bash
# 1. Preview execution plan
rd3:orchestration-dev 0266 --dry-run

# 2. If plan looks good, execute end-to-end on an ACP channel
rd3:orchestration-dev 0266 --auto --channel codex
```

## Integration

**tasks CLI integration:**
```bash
# Full orchestration (profile from task file)
rd3:orchestration-dev 0266 --channel codex

# Override profile
rd3:orchestration-dev 0266 --profile complex --channel codex

# Phase profile (single phase on the current channel)
rd3:orchestration-dev 0266 --profile refine
rd3:orchestration-dev 0266 --profile unit

# Auto-approve human gates (end-to-end, no pauses)
rd3:orchestration-dev 0266 --auto --channel codex

# Override the default unit coverage target
rd3:orchestration-dev 0266 --coverage 90

# Dry run (preview)
rd3:orchestration-dev 0266 --dry-run

# Combined: auto + custom coverage
rd3:orchestration-dev 0266 --auto --coverage 90 --channel codex
```

**Phase integration:**
- Orchestrates all 9 phases in dependency order
- Uses tasks CLI for progress tracking
- Reads/writes task file sections between phases

## Gate Architecture

Two gate execution models coexist in v1:

### CoV-Backed Gates (Phase 6)

Phase 6 (Unit Testing) runs through `rd3:verification-chain`. The orchestration runtime builds a Chain-of-Verification manifest from the active stack profile (default: `typescript-bun-biome`) and delegates execution to the CoV interpreter. Each verification step has a real checker (cli, file-exists) that validates the step output independently. Retry, pause/resume, and evidence collection are handled by the CoV interpreter.

### Direct Gates (Phases 1-5, 7-9)

All other phases use the orchestration runtime's own gate evaluation. Auto gates check phase output artifacts (coverage thresholds, test results, generated files). Human gates pause the orchestration state and await user approval via `--auto` or interactive prompt. These phases are not yet wired through verification-chain.

### Why Two Models

The pilot CoV integration targets Phase 6 because it has the richest verification surface (typecheck, lint, test). Remaining phases will migrate to CoV-backed gates in v2, giving every phase the same retry, evidence, and checker capabilities.

## v1 Limitations

- **Sequential only:** No parallel phase execution
- **Pilot verification-chain only:** Phase 6 is the only phase currently backed by CoV; phases 1-5, 7-9 use direct gates
- **No conditional branching:** Fixed phase order per profile
- **No rollback:** Cannot undo a completed phase

**v2 enhancements planned:**
- Local current-channel worker runners for phases 5 and 7 (current-channel phase 5 and 7 runs pause for handoff in v1)
- Expand verification-chain integration across the remaining phases (7, 8, then others)
- Parallel execution where phases are independent
- Conditional branching based on phase output
- Rollback capability for failed phases

See [Gate Definitions](references/gate-definitions.md) for detailed content.

## Additional Resources

- [Phase Matrix](references/phase-matrix.md) — Profile x phase execution matrix with descriptions and dependencies
- [Gate Definitions](references/gate-definitions.md) — Auto vs human gate definitions and rework loop behavior
- [Delegation Map](references/delegation-map.md) — Phase-to-skill mapping with input/output specs
- [rd3:run-acp](../run-acp/SKILL.md) — Cross-channel execution via ACP agents
- [rd3:request-intake](../request-intake/SKILL.md) — Phase 1 requirements elicitation
- [rd3:task-decomposition](../task-decomposition/SKILL.md) — Phase 4 task breakdown
- [rd3:sys-testing](../sys-testing/SKILL.md) — Phase 6 unit testing foundation
