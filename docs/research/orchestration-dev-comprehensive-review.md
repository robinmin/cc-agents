# Comprehensive Review: rd3:orchestration-dev Ecosystem

**Date:** 2026-03-31  
**Reviewer:** Lord Robb (on behalf of Robin Min)  
**Scope:** `rd3:orchestration-dev` skill, `jon-snow` agent, worker agents (`super-coder`, `super-tester`, `super-reviewer`), dev commands (`dev-run`, `dev-plan`, `dev-unit`, `dev-review`, `dev-refine`, `dev-docs`, `dev-init`, `dev-reverse`, `dev-fixall`, `dev-gitmsg`, `dev-changelog`), supporting skills (`verification-chain`, `code-implement-common`, `sys-testing`, `code-review-common`, etc.)

---

## Executive Summary

The `rd3:orchestration-dev` ecosystem represents an ambitious and largely well-executed attempt to build a 9-phase agent orchestration pipeline with CoV-backed gates, multi-channel execution, and profile-driven routing. The architecture demonstrates significant maturity in several areas. However, there are architectural limitations, code quality concerns, and industry alignment gaps that warrant attention before the next evolution cycle.

**Overall Grade: B+ (78/100)**

| Dimension | Score | Trend |
|-----------|-------|-------|
| Architecture | A- (88) | ↑ Strong foundation |
| Code Quality | B (80) | → Solid but has rough edges |
| Test Coverage | A (92) | ↑ 248 tests, 1.38 code-to-test ratio |
| Industry Alignment | B- (72) | → Behind on parallelism, observability |
| Developer Experience | B (82) | ↑ Good CLI, weak diagnostics |
| Operational Maturity | C+ (68) | → Fragile in edge cases |

---

## Part 1: What We've Done Well

### 1.1 Solid Architectural Foundation

**The phase-gate pipeline model is well-designed.** The 9-phase decomposition (Intake → Architecture → Design → Decomposition → Implementation → Testing → Review → Functional → Docs) maps cleanly to established SDLC patterns. The profile system (`simple`/`standard`/`complex`/`research` + phase-specific profiles) provides sensible complexity-based routing without over-engineering.

**Separation of concerns is strong:**
- `runtime.ts` owns execution flow and state persistence
- `pilot.ts` owns phase delegation via CoV chains
- `contracts.ts` owns worker contracts and phase matrix
- `gates.ts` owns CoV manifest construction
- `executors.ts` owns channel routing
- `rollback.ts` owns git-based sandbox restoration
- `plan.ts` owns plan generation from profiles
- `state-paths.ts` owns filesystem layout conventions

Each module has a clear single responsibility. This is textbook clean architecture.

### 1.2 CoV-Backed Gate Architecture

The universal CoV gate system is genuinely innovative. Every phase runs through Chain-of-Verification manifests with deterministic checkers (`file-exists`, `content-match`, `compound`, `cli`) and optional human-approval nodes. This gives you:

- **Auditability:** Every gate evaluation produces persisted evidence files
- **Reproducibility:** Gate manifests are deterministic and can be re-evaluated
- **Human-in-the-loop:** Proper pause/resume for human gates
- **Auto-mode:** `--auto` flag bypasses human gates when appropriate

The Phase 6 verification profiles (e.g., `typescript-bun-biome`) with stack-specific CLI commands is a smart pattern that makes verification concrete rather than abstract.

### 1.3 Worker Contract Model

The `rd3-phase-worker-v1` contract for phases 5, 6, 7 is well-defined:

```
Inputs: task_ref, phase_context, execution_channel, phase-specific params
Outputs: status, phase, artifacts/findings, evidence_summary, next_step_recommendation
Constraints: anti-recursion rules, channel preservation, phase-locking
```

This contract model prevents the most common failure in agent systems — recursive delegation loops — through explicit anti-recursion rules. The envelope validation in `pilot.ts` (`validateWorkerEnvelope`) checks required fields and phase consistency, catching contract violations early.

### 1.4 Test Suite Quality

- **248 tests, 0 failures, 676 assertions** across 9 test files
- **1.38 code-to-test ratio** — above average for infrastructure code
- Core modules (`contracts.ts`, `executors.ts`, `gates.ts`, `model.ts`) at or near 100% line coverage
- Mock-based testing of phase runners, CoV chains, and delegation patterns
- Good test naming convention following descriptive patterns

### 1.5 Profile System Design

The profile-driven execution model is pragmatic:

| Profile | Phases | Real-World Use Case |
|---------|--------|-------------------|
| `simple` | 5, 6 | Bug fixes, single-file changes |
| `standard` | 1, 4, 5, 6, 7, 8(bdd), 9 | Normal feature work |
| `complex` | 1-9 (all) | Architecture-significant changes |
| `research` | 1-9 (all) | Investigation-heavy work |
| `unit` | 6 | Quick test runs |
| `review` | 7 | Quick code review |

The trailing-only skip constraint (`validateSkipPhasesForSequence`) is a good safety mechanism — preventing invalid combinations like "skip phase 5 but keep phase 6."

### 1.6 Git-Based Rollback

The rollback system (`rollback.ts`) provides:
- **Snapshot capture:** Before-phase file inventory
- **Finalization:** After-phase diff calculation
- **Auto-restore:** On failure with exhausted rework, automatically reverts
- **Manual undo:** `--undo` CLI for selective phase rollback
- **Downstream clearing:** Undoing a phase also clears all downstream phase state

This is a robust safety net that many agent frameworks lack entirely.

### 1.7 "Fat Skills, Thin Wrappers" Discipline

The `jon-snow` agent and the `dev-*` commands are genuinely thin wrappers — they translate user intent into `rd3:orchestration-dev` invocations without duplicating logic. The worker agents (`super-coder`, `super-tester`, `super-reviewer`) similarly delegate to canonical backbone skills without absorbing orchestration logic. This discipline prevents the dreaded "agent sprawl" problem.

---

## Part 2: What Needs Improvement

### 2.1 No Parallel Phase Execution (CRITICAL)

**Current:** Sequential phase execution only. Phase N+1 cannot start until Phase N completes.

**Why this matters:** In a `complex` profile with 9 phases, this creates unnecessary serialization. Phases 2 (Architecture) and 3 (Design) could potentially overlap. Phase 8a (BDD) and Phase 8b (Functional Review) are already conceptually parallel but executed serially.

**Industry comparison:** LangGraph, CrewAI, and AutoGen all support DAG-based parallel execution. Devin and OpenHands execute multiple tool calls concurrently. Even basic CI/CD systems (GitHub Actions, GitLab CI) parallelize independent jobs.

**Recommendation:** Introduce a DAG execution model where phases declare dependencies rather than assume sequential ordering. Start with parallel 8a/8b execution as a pilot, then generalize.

### 2.2 Fragile Direct-Skill Execution Model (HIGH)

**Problem:** Phases 1-4 and 8-9 execute via "direct-skill" mode, which generates prompt text and executes it through `acpx --format quiet <agent> exec <prompt>`. This is fundamentally fragile because:

1. **Prompt-injection surface:** The entire phase execution depends on string-interpolated prompts that the LLM must parse and obey. If the LLM doesn't follow the prompt structure, the phase fails silently or produces garbage.

2. **No structured input/output contract enforcement:** Direct-skill phases don't use the `rd3-phase-worker-v1` contract. The output parsing in `parseDirectSkillOutput` just tries `JSON.parse` and falls back to `{ output: trimmed }` — essentially accepting anything.

3. **Channel pinning fragility:** Direct-skill phases are pinned to `current`, but the `current` channel requires `ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT` or `ACPX_AGENT` to be set. Missing env vars produce cryptic errors rather than clear setup instructions.

**Evidence in code:**
```typescript
// direct-skill-runner.ts:132-143
function parseDirectSkillOutput(stdout?: string): Record<string, unknown> | undefined {
    const trimmed = stdout?.trim();
    if (!trimmed) return undefined;
    try {
        const parsed = JSON.parse(trimmed);
        // ... accepts anything parseable as object
    } catch {
        return { output: trimmed }; // fallback: accept any text
    }
}
```

**Recommendation:** Extend the `rd3-phase-worker-v1` contract to cover all phases, not just 5-7. Use structured output schemas (e.g., JSON Schema validation) instead of `JSON.parse` with fallback.

### 2.3 Verification Chain Interpreter Coupling (HIGH)

**Problem:** `pilot.ts` directly imports from `verification-chain/scripts/interpreter.ts`:

```typescript
import { resumeChain, runChain } from '../../verification-chain/scripts/interpreter';
import type { DelegateRunner, ChainManifest, ChainState, CheckerConfig } from '../../verification-chain/scripts/types';
```

This creates a tight coupling between the orchestration skill and the verification-chain skill's internal implementation. If the verification-chain API changes, orchestration breaks.

The verification-chain interpreter also has low test coverage (50.42% lines) — a risky dependency.

**Recommendation:** Introduce an adapter interface in orchestration-dev that abstracts the verification-chain dependency. This also enables swapping verification backends in the future.

### 2.4 No Observability or Telemetry (MEDIUM-HIGH)

**Problem:** There's no structured logging of phase execution metrics, no timing telemetry, no success/failure rate tracking, and no dashboard or summary report generation.

The only "observability" is the JSON state file written to `docs/.workflow-runs/`. To understand what happened in a pipeline run, you need to manually read the state JSON.

**Industry comparison:** Devin tracks every step with screenshots and tool call logs. LangSmith/LangFuse provide full LLM observability. OpenTelemetry is becoming standard for AI agent tracing.

**Recommendation:** 
1. Add phase-level timing metrics (started_at, completed_at already exist but aren't aggregated)
2. Generate a human-readable summary report after each pipeline run
3. Track cumulative success/failure rates per profile
4. Consider OpenTelemetry-compatible span emission

### 2.5 State File Design Limitations (MEDIUM)

**Problem:** The orchestration state is a single JSON file per run (`docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>.json`). This design has several issues:

1. **No concurrent run support:** Two runs for the same task will share a directory. `findOrchestrationStatePath` picks the last `.json` file sorted alphabetically — not necessarily the latest by timestamp.

2. **State file bloat:** As phases execute, the state file accumulates evidence payloads, rollback snapshots, and results. For complex profiles, this can become very large.

3. **No state schema versioning:** There's no `schema_version` field. If the state format changes, old state files become unloadable without migration.

4. **Human gate resume semantics:** Resuming a paused human gate treats it as approval. There's no reject/request-changes option, despite the CoV `human` checker supporting those choices.

**Recommendation:**
1. Add `schema_version: 1` to state files
2. Separate evidence artifacts from the main state file
3. Support multiple concurrent runs with proper run isolation
4. Implement proper human gate resume with explicit approve/reject/request-changes

### 2.6 Executor Architecture Gaps (MEDIUM)

**Problem:** The `LocalCommandExecutor` and `AcpExecutor` both use `Bun.spawnSync` / `execSync` — synchronous, blocking process execution. For a system that should eventually support parallel phase execution, synchronous executors are a blocking constraint.

Additionally, the `AcpExecutor` assumes a specific `acpx` CLI interface that may not be stable across versions. The `acpx-query.ts` dependency has only 13.89% test coverage.

**Recommendation:**
1. Migrate to async execution (`Bun.spawn` or `child_process.spawn`)
2. Add proper timeout handling at the process level (current timeout is only via `Promise.race`)
3. Write integration tests for `acpx-query.ts`

### 2.7 Weak Error Messages and Diagnostics (MEDIUM)

**Problem:** Error messages in the codebase are often unhelpful for debugging:

```typescript
// runtime.ts — generic timeout error
return { status: 'failed', error: `Phase runner timed out after ${timeoutMs}ms: ${label}` };

// executors.ts — vague error
error: 'Local command executor requires request.command or request.prompt'

// plan.ts — no context about what failed
throw new Error(`Invalid profile: ${value}`);
```

There's no structured error taxonomy. The same `PhaseRunnerResult.error` field holds timeout errors, contract violations, and LLM failures with no differentiation.

**Recommendation:**
1. Introduce an error code taxonomy (TIMEOUT, CONTRACT_VIOLATION, CHANNEL_UNAVAILABLE, PHASE_FAILED, etc.)
2. Include actionable next steps in error messages
3. Add a diagnostic report command that summarizes the current pipeline state

### 2.8 Missing Configurable Timeout per Phase Type (LOW-MEDIUM)

**Problem:** All phases share the same default timeout (1 hour). Phase 1 (Intake) and Phase 9 (Docs) should be much faster than Phase 5 (Implementation) or Phase 6 (Testing). The `PHASE_DURATIONS` map exists for estimation but isn't used for timeout configuration.

```typescript
export const DEFAULT_PHASE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour — same for all phases
```

**Recommendation:** Use `PHASE_DURATIONS` as the basis for per-phase timeout defaults. Implementation (Phase 5) should have a longer timeout than Intake (Phase 1).

### 2.9 Phase 2/3 Routing Is Static (LOW-MEDIUM)

**Problem:** Phase 2 and Phase 3 skill routing is hardcoded to `rd3:backend-architect` / `rd3:backend-design` in `contracts.ts`:

```typescript
case 2:
    return attachExecutionPolicy({
        skill: 'rd3:backend-architect', // always backend
        ...
    });
case 3:
    return attachExecutionPolicy({
        skill: 'rd3:backend-design', // always backend
        ...
    });
```

The SKILL.md says selection is "context-dependent (backend vs frontend vs full-stack)" but the code always picks backend. The frontend variants exist in the delegation map but aren't wired into `getBasePhase()`.

**Recommendation:** Add domain hints or auto-detection from the task file to route phases 2/3 to the correct architect/design skill.

---

## Part 3: What We Must Avoid or Fix

### 3.1 AVOID: Adding More Profiles Without Simplification

**Risk:** There are already 9 profiles (4 task + 5 phase). Adding more (e.g., `hotfix`, `migration`, `security-review`) without simplifying the existing matrix will make the system harder to reason about and test.

**Recommendation:** Before adding profiles, consider a composable profile system where profiles are defined as phase-sets + parameter overrides rather than hardcoded entries in `PHASE_MATRIX`.

### 3.2 AVOID: Growing pilot.ts Into a God File

**Risk:** `pilot.ts` is already 532 lines and handles:
- CoV manifest construction
- Delegate runner creation
- Worker envelope parsing and validation
- Direct-skill phase detection
- Phase result extraction from chain state
- Evidence file writing

It's the single most complex file in the system and continues to grow. This is a god-file antipattern.

**Recommendation:** Split `pilot.ts` into:
- `pilot.ts` — Orchestration of the CoV chain execution (main entry point)
- `worker-envelope.ts` — Worker envelope parsing, validation, and contract enforcement
- `delegate-runner.ts` — Delegate runner construction and channel routing
- `evidence-writer.ts` — Gate evidence file persistence

### 3.3 FIX: The `acpx-query.ts` Dependency Is Untested

**Risk:** `acpx-query.ts` has **13.89% line coverage** and **0% function coverage**. This module is responsible for executing ACP commands — the core of cross-channel execution. A bug here would silently break all remote agent execution.

**Recommendation:** Write comprehensive tests for `acpx-query.ts` with mock process execution. This is a priority-1 testing gap.

### 3.4 FIX: Rollback Can Lose Unstaged Work

**Risk:** The rollback system (`restoreSnapshot`) uses `git checkout -- <files>` to restore tracked files. If a developer has unstaged changes in those files that were present BEFORE the phase started, they could be lost. The `modified_before` field tracks this, but the restore logic only restores files that were clean before the phase — not files that were modified before AND during.

**Recommendation:** Before any rollback, stash or warn about uncommitted changes. Add a `--force` flag for destructive rollbacks and a safety check by default.

### 3.5 FIX: `findOrchestrationStatePath` Race Condition

**Risk:** `findOrchestrationStatePath` sorts filenames alphabetically and picks the last one:

```typescript
const runCandidates = readdirSync(runDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
return join(runDir, runCandidates[runCandidates.length - 1]);
```

Run IDs are `${Date.now().toString(36)}-${random}`. If two runs start within the same millisecond, alphabetical sort doesn't guarantee recency. And if a new run starts while one is being read, the new state file could be picked up.

**Recommendation:** Use timestamp-based sorting (read the `created_at` field from the JSON) or use a lock file to prevent concurrent access.

### 3.6 AVOID: Expanding the Type System Without Bounds

**Risk:** The type system in `model.ts` is already complex with multiple union types (`Profile = TaskProfile | PhaseProfile`, `PhaseNumber = 1|2|3|4|5|6|7|8|9`, `PhaseGate = 'auto' | 'human' | 'auto/human'`). Adding more union members without restructuring will make TypeScript inference and exhaustiveness checking fragile.

**Recommendation:** Consider using discriminated unions with a `_type` discriminant field for future extensibility.

### 3.7 AVOID: Over-Engineering the Gate System

**Risk:** The gate system in `gates.ts` currently has 9 gate profiles, each with steps and checkers. The `buildPhaseChecker` function has a switch statement with phase-specific logic. Adding more gate complexity (e.g., conditional gates, dynamic gate profiles, gate composition) without a clear use case will make the system harder to debug.

**Recommendation:** Keep gates simple and deterministic. The current model is good — resist the urge to add gate-level conditional branching.

---

## Part 4: Architecture-Level Analysis

### 4.1 The "Two-Mode" Split Is a Design Smell

The system has a fundamental architectural split:

| Mode | Phases | Execution | Output Contract | Channel |
|------|--------|-----------|----------------|---------|
| Direct-skill | 1-4, 8-9 | Prompt → LLM | Unstructured (text fallback) | `current` only |
| Worker-agent | 5-7 | Prompt → acpx → agent | Structured JSON envelope | Any channel |

This split creates an inconsistency: the system treats phases 1-4 and 8-9 as second-class citizens. They can't run on remote channels, don't have structured output contracts, and use a fundamentally different execution model.

**Root cause:** The worker-agent model was designed for "heavy" phases (implementation, testing, review) where structured output matters. The direct-skill model was designed for "light" phases (intake, architecture, design) where prompt-based delegation was considered sufficient.

**Impact:** This limits the system's ability to run full pipelines on remote channels and creates a maintenance burden from maintaining two execution paths.

**Recommendation:** Unify the execution model. Extend the `rd3-phase-worker-v1` contract to all 9 phases. Direct-skill phases become workers that happen to be lightweight. This eliminates the mode split while preserving the weight distinction.

### 4.2 State Machine Gaps

The orchestration state machine has these states: `pending → running → (paused | completed | failed)`.

Missing transitions:
- **`running → running` (phase transition):** No explicit "phase completed, starting next" state. The state file goes through `running` for the entire pipeline, with only `current_phase` changing.
- **`paused → running` (resume):** Works, but only via `--resume`. No programmatic API for resume.
- **`failed → running` (retry from failure):** Not supported. A failed pipeline must be restarted from scratch (or from a specific phase with `--start-phase`).

**Recommendation:** Consider a more granular state model that tracks both pipeline-level and phase-level states independently. Add explicit retry-from-failure support.

### 4.3 Dependency Inversion Principle Violation

The orchestration skill directly depends on concrete implementations:
- `verification-chain/scripts/interpreter` (concrete interpreter)
- `tasks/scripts/lib/taskFile` (concrete task file parser)
- `tasks/scripts/lib/wbs` (concrete WBS resolver)
- `tasks/scripts/lib/config` (concrete config loader)

These should be abstracted behind interfaces to enable:
- Testing with mock implementations
- Swapping backends (e.g., different verification systems)
- Reducing the blast radius of changes in dependent skills

### 4.4 Missing: Pipeline Composition and Reusability

The current system supports one pipeline shape (the 9-phase model). There's no way to:
- Define custom pipeline shapes for specific project types
- Compose pipelines from reusable phase groups
- Share phase configurations across projects
- Define project-specific gate policies

**Recommendation:** Consider a pipeline definition format (YAML or JSON) that can be extended per-project:

```yaml
pipeline:
  phases:
    - { number: 1, skill: rd3:request-intake, gate: auto }
    - { number: 5, skill: rd3:code-implement-common, gate: auto }
    - { number: 6, skill: rd3:sys-testing, gate: auto, coverage: 95 }
  profiles:
    quick: [5, 6]
    full: [1, 2, 3, 4, 5, 6, 7, 8, 9]
```

This would externalize the hardcoded `PHASE_MATRIX` and `getBasePhase()` logic.

---

## Part 5: Industry Alignment Assessment

### 5.1 Harness Engineering

**Our state:** We have a partial harness — the orchestration layer constrains agent behavior through profiles, contracts, and gates. But we lack:

- **Guardrails/boundaries:** No sandboxing of agent actions beyond git-based rollback
- **Tool restrictions:** Workers can access any tool they're configured with, no phase-specific tool restrictions
- **Budget/resource limits:** No token budget, no API call limits, no compute limits per phase

**Industry SOTA (2025-2026):**
- **Claude Code** uses tool-use guardrails and permission systems
- **Devin** runs in a full sandbox VM with restricted network access
- **OpenHands** uses action/observation pairs with bounded execution
- **SWE-Agent** uses a restricted bash environment with allowlisted commands
- **LangGraph** supports checkpoint-based state management with human-in-the-loop

**Gap analysis:** We're behind on sandboxing and resource budgeting. Our CoV system is ahead of most frameworks in terms of verification rigor.

### 5.2 Phase-Gate vs Continuous Verification

**Our state:** Phase-gate model with CoV checks at each boundary. Verification happens at gate time, not continuously during execution.

**Industry trend:** Moving toward continuous verification during execution:
- **Test-driven development** as continuous verification during implementation
- **Lint-on-save / typecheck-on-save** patterns from IDEs
- **GitHub Actions** running checks on every push, not just at PR time
- **LangSmith** traces every LLM call for quality monitoring

**Gap analysis:** Our phase-gate model is appropriate for the pipeline orchestration level but should be complemented with continuous verification within phases (especially Phase 5 and Phase 6).

### 5.3 Cross-Agent Coordination

**Our state:** ACP-based cross-channel execution with `acpx` CLI. Worker phases can execute on remote agents. Direct-skill phases are pinned to `current`.

**Industry SOTA:**
- **CrewAI** uses role-based agent assignment with sequential/hierarchical process
- **AutoGen** uses conversation-based agent coordination
- **LangGraph** uses graph-based state machines with conditional edges
- **Anthropic MCP (Model Context Protocol)** for standardized agent-to-agent communication

**Gap analysis:** Our ACP model is pragmatic but limited. The `acpx` CLI is a custom solution that doesn't integrate with emerging standards like MCP. Consider MCP adoption for long-term industry alignment.

### 5.4 Industry Convergence Themes (SOTA 2026)

Based on the comprehensive SOTA research (see `agent-orchestration-sota-2026.md`), five trends are converging across the industry:

| Trend | Industry Direction | Our Position | Gap |
|-------|-------------------|--------------|-----|
| SKILL.md as standard format | 30+ platforms support it | ✅ Already adopted | None |
| Verification as first-class concern | CoV Maker-Checker pattern emerging as standard | ✅ Industry-leading CoV implementation | None |
| State persistence as table stakes | LangGraph checkpoints, Temporal event sourcing | ✅ Three-tier persistence | Schema versioning gap |
| Profile-driven routing | Complexity-based workflow adaptation | ✅ Dual-profile system | Adaptive profiling missing |
| Cross-agent delegation via protocol | ACP/MCP standardization | ⚠️ Custom acpx CLI | MCP alignment needed |

### 5.5 Anti-Pattern Coverage Assessment

The SOTA research identified 10 common agent orchestration anti-patterns. Here's our coverage:

| Anti-Pattern | Mitigated? | Our Mechanism |
|-------------|:-----------|---------------|
| Trust Vacuum (no verification between phases) | ✅ | CoV-backed gates on all 9 phases |
| Flat Prompt (cramming everything into one prompt) | ✅ | Progressive disclosure via `references/` dirs |
| Black Box Pipeline (no observability) | ⚠️ Partial | State persistence exists but no summary/report |
| All-or-Nothing Execution (no resume) | ✅ | Phase-granularity state with `--resume` |
| Unbounded Rework Loop | ✅ | Bounded `max_iterations` with escalation |
| Recursive Delegation | ✅ | Anti-recursion contract in worker agents |
| One-Size Pipeline | ✅ | Dual-profile system (task + phase profiles) |
| Stateless Sandbox (no rollback) | ✅ | Git-based snapshots with auto-restore |
| Railroading Prompt | ✅ | Flexible prompts, description-as-trigger matching |
| Hallucinated Completion | ✅ | Deterministic file-exists + content-match checkers |

**Score: 8/10 fully mitigated, 2/10 partially mitigated.** The Black Box anti-pattern is the biggest remaining gap — we persist state but don't surface it effectively.

---

## Part 6: Recommendations — Prioritized Action Plan

### Tier 1: Critical (Do Next Sprint)

| # | Action | Effort | Impact | Rationale |
|---|--------|--------|--------|-----------|
| 1 | Test `acpx-query.ts` to >90% coverage | S | H | 0% coverage on critical infra |
| 2 | Fix state file race conditions | S | H | Concurrent run corruption risk |
| 3 | Add structured error taxonomy | M | H | Debugging is currently guesswork |
| 4 | Add pipeline run summary report | M | H | No way to understand run results |

### Tier 2: High Priority (Do This Quarter)

| # | Action | Effort | Impact | Rationale |
|---|--------|--------|--------|-----------|
| 5 | Split `pilot.ts` into 4 modules | M | M | Prevent god-file syndrome |
| 6 | Extend worker contract to all phases | L | H | Eliminate the two-mode split |
| 7 | Add phase-specific timeouts | S | M | 1-hour timeout for Phase 1 is wasteful |
| 8 | Fix Phase 2/3 routing to support frontend/fullstack | M | M | Currently hardcoded to backend |
| 9 | Add state schema versioning | S | M | Forward compatibility |
| 10 | Add rollback safety checks for unstaged changes | S | M | Data loss risk |

### Tier 3: Strategic (Plan for Next Quarter)

| # | Action | Effort | Impact | Rationale |
|---|--------|--------|--------|-----------|
| 11 | Implement parallel phase execution (DAG model) | XL | H | Industry alignment, performance |
| 12 | Add observability/telemetry layer | L | H | Operational visibility |
| 13 | Consider MCP integration for cross-agent coordination | L | M | Industry standard alignment |
| 14 | Externalize pipeline definitions (YAML/JSON config) | L | M | Project-specific customization |
| 15 | Add human gate resume with explicit approve/reject | M | M | Current approval-only is limiting |
| 16 | Investigate sandboxing for worker phases | XL | H | Safety and resource control |

---

## Appendix A: File Inventory

### Core Implementation (3,285 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `runtime.ts` | 632 | Main execution loop, state management |
| `pilot.ts` | 532 | Phase delegation via CoV chains |
| `contracts.ts` | 356 | Phase matrix, worker contracts |
| `gates.ts` | 274 | CoV manifest construction |
| `rollback.ts` | 285 | Git-based sandbox restoration |
| `direct-skill-runner.ts` | 242 | Direct-skill phase execution |
| `executors.ts` | 244 | Channel routing (local + ACP) |
| `init.ts` | 239 | Project readiness validation |
| `model.ts` | 198 | Type definitions, arg parsing |
| `plan.ts` | 196 | Plan generation from profiles |
| `state-paths.ts` | 49 | Filesystem layout helpers |
| `verification-profiles.ts` | 33 | Verification profile loading |
| `run.ts` | 5 | CLI entry point |

### Tests (4,552 lines)

| File | Lines | Target |
|------|-------|--------|
| `pilot.test.ts` | 1,183 | pilot.ts |
| `runtime.test.ts` | 1,066 | runtime.ts |
| `plan.test.ts` | 539 | plan.ts |
| `rollback.test.ts` | 394 | rollback.ts |
| `init.test.ts` | 496 | init.ts |
| `executors.test.ts` | 253 | executors.ts |
| `gates.test.ts` | 239 | gates.ts |
| `direct-skill-runner.test.ts` | 196 | direct-skill-runner.ts |
| `state-paths.test.ts` | 186 | state-paths.ts |

### Agent Definitions (4 files)

| Agent | Lines | Role |
|-------|-------|------|
| `jon-snow.md` | ~180 | Thin routing wrapper |
| `super-coder.md` | ~140 | Phase 5 worker |
| `super-tester.md` | ~160 | Phase 6 worker |
| `super-reviewer.md` | ~120 | Phase 7 worker |

### Command Definitions (11 dev commands)

| Command | Role |
|---------|------|
| `dev-run.md` | Main pipeline execution |
| `dev-plan.md` | Phases 2-4 |
| `dev-refine.md` | Phase 1 refine |
| `dev-unit.md` | Phase 6 only |
| `dev-review.md` | Phase 7 only |
| `dev-docs.md` | Phase 9 only |
| `dev-init.md` | Project readiness check |
| `dev-reverse.md` | Codebase reverse engineering |
| `dev-fixall.md` | Fix all lint/type/test errors |
| `dev-gitmsg.md` | Generate commit message |
| `dev-changelog.md` | Generate changelog |

## Appendix B: Dependency Graph

```
orchestration-dev
├── verification-chain (interpreter, types)
│   ├── methods/cli.ts
│   ├── methods/file_exists.ts
│   ├── methods/content_match.ts
│   ├── methods/compound.ts
│   ├── methods/human.ts
│   └── methods/llm.ts
├── tasks (config, wbs, taskFile, result, init)
├── scripts/logger.ts (shared)
└── scripts/libs/acpx-query.ts (ACP execution)

Agents:
├── jon-snow → orchestration-dev (delegates everything)
├── super-coder → code-implement-common (Phase 5)
├── super-tester → sys-testing + advanced-testing (Phase 6)
└── super-reviewer → code-review-common (Phase 7)

Commands (all → orchestration-dev):
├── dev-run (all profiles)
├── dev-plan (profile=plan)
├── dev-refine (profile=refine)
├── dev-unit (profile=unit)
├── dev-review (profile=review)
├── dev-docs (profile=docs)
├── dev-init (standalone)
├── dev-reverse (standalone skill)
├── dev-fixall (standalone skill)
├── dev-gitmsg (standalone skill)
└── dev-changelog (standalone skill)
```

## Part 7: Industry Convergence & Open Problems

### 7.1 What the Industry Is Converging On (2026)

Based on the SOTA research brief (`docs/research/agent-orchestration-sota-2026.md`):

1. **SKILL.md won the format war.** 30+ platforms now support the same skill format. Our harness approach is well-aligned.
2. **Verification as first-class concern.** Every serious orchestration system now includes gates between phases. Our CoV system is ahead of most.
3. **State persistence is table stakes.** LangGraph checkpointing, Temporal event sourcing, our three-tier persistence — all converge on durable state.
4. **Cross-agent delegation is the frontier.** ACP/MCP standards are emerging. Our 14-backend `acpx` approach is early but needs standards alignment.

### 7.2 Open Problems We Should Track

| Problem | Our Status | Industry Status |
|---------|-----------|----------------|
| Parallel phase execution | Sequential only | LangGraph, Dify have DAGs |
| Adaptive rework | Fixed `max_iterations` | No one has solved this yet |
| Cross-agent state sharing | ACP delegates but doesn't share state | Unsolved industry-wide |
| Semantic verification | Content-match only (regex) | LLM judges add non-determinism |
| Cost-aware profiling | No token/cost tracking | No one has this yet |

### 7.3 Feature Comparison vs Key Systems

| Feature | cc-agents rd3 | Claude Code | Devin | LangGraph | CrewAI |
|---------|:---:|:---:|:---:|:---:|:---:|
| Multi-phase pipeline | ✅ | ❌ | ✅ | ✅ | ✅ |
| Deterministic verification | ✅ | ❌ | ✅ | ✅ | ❌ |
| Human-in-the-loop | ✅ | ✅ | ✅ | ✅ | ❌ |
| State persistence + resume | ✅ | ❌ | Partial | ✅ | ❌ |
| Git-based rollback | ✅ | ❌ | Sandbox | ❌ | ❌ |
| Automatic profiling | ✅ | ❌ | Partial | ❌ | ❌ |
| Cross-agent delegation | ✅ (14 backends) | ❌ | ❌ | ✅ | ✅ |
| Bounded rework | ✅ | ❌ | ❌ | ✅ | ❌ |

**Our position:** Strongest in verification, state management, and profiling. Weakest in parallelism and observability.

---

## Part 8: Architecture Decisions — Next-Generation Pipeline

*Date: 2026-03-31 — Session discussion between Robin and Lord Robb*

This section documents the architectural decisions for the next-generation orchestration pipeline. These decisions emerged from reviewing the current system's strengths and limitations against industry SOTA, and represent the target architecture for the rebuild.

### 8.1 Seven Pillars of the New Architecture

| # | Pillar | Current State | Target State |
|---|--------|--------------|-------------|
| 1 | Parallel Execution | Sequential for-loop only | DAG-based concurrent phase execution |
| 2 | Executor Abstraction | Synchronous `Bun.spawnSync`, tight `acpx` coupling | Async executor interface with capabilities discovery |
| 3 | CoV Driver | Direct import of verification-chain interpreter | Adapter pattern with swappable verification backends |
| 4 | Observability & Telemetry | JSON state files, no metrics | Structured logging, phase timing, success/failure tracking |
| 5 | State Storage | Single JSON file per run, race conditions | SQLite via `bun:sqlite`, WAL mode, queryable |
| 6 | CLI-first + Single Config | Hardcoded `PHASE_MATRIX`, profiles in TypeScript | YAML pipeline definition, externalized configuration |
| 7 | FSM Pipeline Composition | Fixed for-loop in `runtime.ts` | Finite State Machine with transition hooks and composition |

### 8.2 Dependency Graph

```
                    ┌──────────────────────┐
                    │ 6. CLI-first + Config │◄── foundation
                    └──────┬───────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
   ┌──────────────┐  ┌──────────┐  ┌─────────────────┐
   │ 5. SQLite    │  │ 2. Exec  │  │ 7. FSM Pipeline │
   │   State      │  │  Abstr.  │  │   Composition   │
   └──────┬───────┘  └────┬─────┘  └────────┬────────┘
          │               │                 │
          ▼               ▼                 ▼
   ┌──────────────┐  ┌──────────┐  ┌─────────────────┐
   │ 4. Observab. │  │ 3. CoV   │  │ 1. Parallel     │
   │   & Telemetry│  │  Driver  │  │   Execution     │
   └──────────────┘  └──────────┘  └─────────────────┘
```

Build order: 6 → 5, 2, 7 (parallel) → 4, 3, 1 (consumers)

### 8.3 CLI-first + Single Configuration File

**Problem:** `PHASE_MATRIX`, `getBasePhase()`, gate profiles, and coverage thresholds are hardcoded in TypeScript. No way to customize per-project without editing source.

**Target:** Externalized YAML pipeline definition.

```yaml
# .rd3/pipeline.yaml — project-level pipeline definition
schema_version: 1
stack: typescript-bun-biome

phases:
  intake:
    skill: rd3:request-intake
    gate: auto
    timeout: 30m
    payload:
      depth: standard

  implement:
    skill: rd3:code-implement-common
    gate: auto
    timeout: 2h
    payload:
      tdd: true
      sandbox: git-worktree

  test:
    skill: rd3:sys-testing
    gate: auto
    timeout: 1h
    payload:
      coverage_threshold: 80
      test_command: "bun test"
      coverage_command: "bun test --coverage"
      include_patterns: ["src/**/*.ts"]
      exclude_patterns: ["**/*.test.ts"]
      fail_on_missing_tests: true

  review:
    skill: rd3:code-review-common
    gate: human
    payload:
      depth: thorough
      focus_areas: [security, performance]
      severity_threshold: warning

  security-scan:
    skill: rd3:code-review-common    # reuse same skill, different payload!
    gate: auto
    after: implement
    payload:
      depth: quick
      focus_areas: [security]
      check_patterns:
        - "SQL injection patterns"
        - "Hardcoded secrets"

profiles:
  simple: [implement, test]
  standard: [intake, implement, test, review]
  complex: [intake, arch, design, decompose, implement, test, review, verify, docs]

hooks:
  before-phase: []
  after-phase: []
  on-failure: []
  on-rework: []
```

**CLI interface:**
```bash
rd3 pipeline run 0266                        # auto-detect profile from task
rd3 pipeline run 0266 --profile complex      # override profile
rd3 pipeline run 0266 --resume               # resume paused run
rd3 pipeline run 0266 --start-phase test     # start from specific phase
rd3 pipeline list                             # show available pipelines
rd3 pipeline validate                         # validate pipeline.yaml
rd3 pipeline status 0266                      # show current run status
rd3 pipeline report 0266                      # generate run summary
```

### 8.4 The `payload` Field — Parameterized Skills

**Key design decision:** Every phase definition includes a `payload` field that passes arbitrary structured data to the delegated skill and gate verifier. This eliminates the need to create separate ad-hoc skills for every variation.

**One skill, many configurations.** The pipeline definition owns the variance, not the skill.

```yaml
phases:
  # Same skill — different payloads → different behaviors
  performance-review:
    skill: rd3:code-review-common
    gate: auto
    payload:
      focus_areas: [performance]
      depth: quick

  security-review:
    skill: rd3:code-review-common
    gate: auto
    payload:
      focus_areas: [security]
      depth: thorough
      check_patterns: ["SQL injection", "hardcoded secrets"]

  accessibility-review:
    skill: rd3:code-review-common
    gate: auto
    payload:
      focus_areas: [accessibility]
      wcag_level: AA
      depth: thorough
```

**Two payload levels:**

```yaml
phases:
  deploy-staging:
    skill: rd3:deploy
    gate:
      type: auto
      checks:
        - method: cli
          payload:                              # gate-check-level payload
            command: "curl -sf {{env.STAGING_URL}}/health"
            expected_status: 200
        - method: content-match
          payload:
            file: "deploy/manifest.json"
            pattern: '"version":\s*"{{task.version}}"'
    payload:                                    # skill-level payload
      target: staging
      strategy: blue-green
      health_check_url: "{{env.STAGING_URL}}/health"
      rollback_on_failure: true
```

**Separation of concerns:**

| Layer | Owns |
|-------|------|
| Pipeline YAML | What to run, in what order, with what parameters |
| Skill | How to execute a parameterized task |
| FSM Engine | When to transition, what hooks to fire |
| Gate Verifier | Whether the output is acceptable |

**Type system:**
```typescript
interface PhaseDefinition {
    name: string;
    skill: string;
    gate: GateConfig;
    after?: string[];          // DAG edges
    payload?: Record<string, unknown>;  // arbitrary data for skill
    timeout?: DurationString;
}

interface PhaseContext {
    phase: PhaseNumber;
    task_ref: string;
    profile: Profile;
    payload: Record<string, unknown>;  // resolved from pipeline.yaml
}
```

### 8.5 SQLite State Storage

**Problem:** JSON state files have race conditions, no queryability, no concurrent access, grow unbounded.

**Target:** `bun:sqlite` — built-in, zero deps, synchronous (fast for local state), WAL mode for concurrent reads.

```sql
CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    task_ref TEXT NOT NULL,
    profile TEXT NOT NULL,
    status TEXT NOT NULL,  -- pending|running|paused|completed|failed
    config JSON,           -- the resolved pipeline.yaml for this run
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE phases (
    run_id TEXT NOT NULL REFERENCES runs(id),
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,
    status TEXT NOT NULL,   -- pending|running|paused|completed|failed|skipped
    skill TEXT NOT NULL,
    payload JSON,           -- the payload passed to this phase
    started_at DATETIME,
    completed_at DATETIME,
    evidence JSON,
    error TEXT,
    PRIMARY KEY (run_id, phase_number)
);

CREATE TABLE gate_evidence (
    run_id TEXT NOT NULL REFERENCES runs(id),
    phase INTEGER NOT NULL,
    step TEXT NOT NULL,
    checker_method TEXT NOT NULL,
    passed INTEGER NOT NULL,
    evidence JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase, step)
);

CREATE TABLE rollback_snapshots (
    run_id TEXT NOT NULL REFERENCES runs(id),
    phase INTEGER NOT NULL,
    git_head TEXT,
    files_before JSON,
    files_after JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase)
);

-- Observability queries become trivial:
SELECT phase_name, AVG(strftime('%s', completed_at) - strftime('%s', started_at)) as avg_seconds
FROM phases WHERE status = 'completed' GROUP BY phase_name;

SELECT status, COUNT(*) FROM runs GROUP BY status;
```

### 8.6 Executor Abstraction

**Problem:** `LocalCommandExecutor` and `AcpExecutor` are synchronous, tightly coupled to `acpx` CLI.

**Target:** Async executor interface.

```typescript
interface AsyncExecutor {
    execute(req: ExecutionRequest): Promise<ExecutionResult>;
    capabilities(): ExecutorCapabilities;
    healthCheck(): Promise<boolean>;
}

interface ExecutorCapabilities {
    parallel: boolean;
    streaming: boolean;
    timeout: boolean;
    channels: string[];  // e.g., ['current', 'claude', 'codex']
}

interface ExecutionRequest {
    skill: string;
    prompt: string;
    payload: Record<string, unknown>;
    channel: string;
    timeout?: number;
}

interface ExecutionResult {
    success: boolean;
    stdout?: string;
    stderr?: string;
    exitCode: number;
    duration_ms: number;
    structured?: Record<string, unknown>;
}
```

Implementations: `LocalBunExecutor`, `AcpExecutor`, `MockExecutor` (for testing).

### 8.7 FSM Pipeline Engine

**Problem:** Fixed for-loop in `runtime.ts` with hardcoded phase progression.

**Target:** Finite State Machine with transition hooks.

```
┌─────────┐  start   ┌─────────┐  phase_complete  ┌──────────┐
│ IDLE    │─────────►│ RUNNING │─────────────────►│ NEXT     │
└─────────┘          └────┬────┘                  └────┬─────┘
                           │                            │
                      fail │  rework_available      all_done │
                           ▼                            ▼
                    ┌──────────┐                 ┌───────────┐
                    │ RETRY    │                 │ COMPLETED │
                    │(rework)  │                 └───────────┘
                    └──────────┘
                           │
                      fail │  exhausted
                           ▼
                    ┌──────────┐     resume     ┌──────────┐
                    │ FAILED   │◄───────────────│ PAUSED   │
                    └──────────┘                 │(human)   │
                                                 └──────────┘
```

**Transition hooks:**

```typescript
type TransitionHook = (
    context: FSMContext,
    transition: Transition
) => void | Promise<void>;

interface FSMConfig {
    states: StateDefinition[];
    transitions: TransitionDefinition[];
    hooks: {
        'before-phase'?: TransitionHook[];
        'after-phase'?: TransitionHook[];
        'on-failure'?: TransitionHook[];
        'on-rework'?: TransitionHook[];
        'on-pause'?: TransitionHook[];
        'on-resume'?: TransitionHook[];
    };
}
```

**Pipeline composition** — import and extend:

```yaml
# .rd3/base-pipeline.yaml — shared base
phases:
  intake: { skill: rd3:request-intake, gate: auto }
  implement: { skill: rd3:code-implement-common, gate: auto }
  test: { skill: rd3:sys-testing, gate: auto }

# .rd3/pipeline.yaml — project overrides
extends: .rd3/base-pipeline.yaml
phases:
  security-scan:
    skill: rd3:code-review-common
    gate: auto
    after: implement
    payload:
      focus_areas: [security]
```

### 8.8 CoV Driver Enhancement

**Problem:** `pilot.ts` imports `verification-chain/scripts/interpreter` directly — tight coupling.

**Target:** Adapter pattern.

```typescript
interface VerificationDriver {
    runChain(manifest: ChainManifest): Promise<ChainState>;
    resumeChain(stateDir: string): Promise<ChainState>;
}

// Default implementation wraps existing verification-chain
// Future implementations could use different verification backends
```

### 8.9 Parallel Execution

**Problem:** All phases run sequentially.

**Target:** DAG-based parallel execution, starting with parallel 8a/8b as proof-of-concept.

```yaml
phases:
  verify-bdd:
    skill: rd3:bdd-workflow
    gate: auto
    after: [test, review]        # runs after BOTH complete
    payload: { depth: standard }

  verify-functional:
    skill: rd3:functional-review
    gate: auto
    after: [test, review]        # same dependency — runs in parallel with bdd
    payload: { depth: standard }

  docs:
    skill: rd3:code-docs
    gate: auto
    after: [verify-bdd, verify-functional]  # waits for both
```

The `after` field defines DAG edges. Phases with satisfied dependencies run concurrently.

### 8.10 Observability & Telemetry

**Problem:** No metrics, no timing, no dashboards. State is opaque JSON.

**Target:** Structured logging + SQLite metrics + CLI reporting.

```bash
rd3 pipeline status 0266
# ┌────────────┬──────────┬─────────┬───────────┐
# │ Phase      │ Status   │ Duration│ Coverage  │
# ├────────────┼──────────┼─────────┼───────────┤
# │ intake     │ ✅ done  │ 2m 34s  │ —         │
# │ implement  │ ✅ done  │ 18m 12s │ —         │
# │ test       │ ✅ done  │ 8m 45s  │ 84.2%     │
# │ review     │ 🟡 paused│ —       │ —         │
# └────────────┴──────────┴─────────┴───────────┘

rd3 pipeline report 0266 --format json
# Full structured report with evidence, timing, and recommendations
```

---

## Part 9: Two-Track Execution Strategy

*Date: 2026-03-31 — Strategic decision by Robin*

### Track 1: Stabilize Current Codebase

**Goal:** Minimal effort fixes to keep the current `orchestration-dev` operational while the new infrastructure is built.

**Scope:** Must-fix items only. Low effort. No new features.

| # | Fix | Effort | Rationale |
|---|-----|--------|----------|
| 1 | Test `acpx-query.ts` to >90% coverage | S (0.5d) | 0% coverage on critical infra — time bomb |
| 2 | Fix state file race conditions | S (0.5d) | Concurrent run corruption risk |
| 3 | Add `schema_version` to state files | S (0.5d) | Forward compatibility for migration |
| 4 | Add rollback safety check for uncommitted changes | S (0.5d) | Data loss risk |
| 5 | Phase-specific timeout defaults | S (0.5d) | Phase 1 doesn't need 1 hour |
| 6 | Fix Phase 2/3 routing — support frontend/fullstack | S (0.5d) | Currently hardcoded to backend |
| 7 | Improve error messages with actionable context | S (1d) | Debugging is currently guesswork |

**Estimated total:** 4-5 days. Zero architectural changes. Pure defensive fixes.

**What we explicitly DON'T do in Track 1:**
- No new profiles
- No new phases
- No executor refactor
- No SQLite migration
- No FSM rewrite
- No parallel execution
- No observability layer

### Track 2: Build Next-Generation Pipeline from Scratch

**Goal:** Based on the current codebase experience and this review document, build a new orchestration engine that implements all 7 pillars (§8.1) without the constraints of backward compatibility with the current `runtime.ts` for-loop.

**Guiding principles:**
1. **Pipeline YAML is the source of truth** — no hardcoded phase matrices
2. **Payload parameterizes skills** — one skill, many configurations
3. **FSM replaces the for-loop** — states, transitions, hooks
4. **SQLite replaces JSON files** — queryable, concurrent, observable
5. **Async executors replace synchronous spawns** — enables parallelism
6. **Verification driver is pluggable** — not coupled to one implementation
7. **CLI-first design** — every feature accessible without an agent wrapper

**Build phases:**

| Phase | Deliverable | Depends On | Effort |
|-------|------------|------------|--------|
| A | Pipeline YAML schema + parser + validator | — | M (3-5d) |
| B | SQLite schema + state manager | A | M (3-4d) |
| C | Async executor interface + implementations | A | M (3-5d) |
| D | FSM engine core (states, transitions, hooks) | B | L (5-8d) |
| E | CoV driver adapter | C | M (3-4d) |
| F | DAG scheduler (parallel execution) | D, C | L (5-7d) |
| G | Observability layer (metrics, reports) | B | M (3-4d) |
| H | CLI interface | D | M (3-4d) |
| I | Migration guide (current → new) | All | S (1-2d) |

**Estimated total:** 5-8 weeks. Can be developed in parallel with Track 1.

**Migration strategy:** The new pipeline engine coexists with the current `orchestration-dev`. A feature flag or separate skill (`rd3:orchestration-v2`) allows switching without breaking existing workflows. Once the new engine is validated, the old one is deprecated.

---

*End of Review. Generated by Lord Robb 🐉 — 2026-03-31*
