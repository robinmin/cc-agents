# State of the Art: Agent Orchestration Patterns (2026)

**Date:** 2026-03-31  
**Scope:** Harness engineering, orchestration patterns, chain-of-verification, state management, profile-driven execution, anti-patterns  
**Method:** Analysis of industry frameworks and production systems, cross-referenced with the cc-agents rd3 implementation  

---

## Executive Summary

Agent orchestration in 2026 has matured from single-turn prompting into a discipline with formal verification pipelines, persistent state machines, and multi-channel delegation. The field converges around six core concerns:

1. **Harness Engineering** — Structured skill packaging, progressive disclosure, and context management
2. **Orchestration Patterns** — Pipeline, DAG, and event-driven topologies for multi-phase workflows
3. **Chain-of-Verification (CoV)** — Maker-Checker protocols with deterministic and LLM-backed checkers
4. **State Management & Rollback** — Durable state persistence, resume semantics, and git-based restoration
5. **Profile-Driven Execution** — Complexity-based routing, phase selection, and coverage thresholds
6. **Anti-Patterns** — Failure modes that recur across frameworks and how to avoid them

This brief synthesizes the current state of the art across industry systems and grounds the analysis in the cc-agents rd3 platform's production implementations as concrete reference examples.

---

## Table of Contents

1. [Harness Engineering](#1-harness-engineering)
2. [Orchestration Patterns](#2-orchestration-patterns)
3. [Chain-of-Verification (CoV)](#3-chain-of-verification-cov)
4. [State Management & Rollback](#4-state-management--rollback)
5. [Profile-Driven Execution](#5-profile-driven-execution)
6. [Anti-Patterns](#6-anti-patterns)
7. [Comparative Landscape](#7-comparative-landscape)
8. [Convergence Themes & Predictions](#8-convergence-themes--predictions)
9. [References](#9-references)

---

## 1. Harness Engineering

### 1.1 Definition

A **harness** is the execution environment and skill packaging system that determines how agents discover, load, and apply capabilities at runtime. The harness is the difference between an agent that "knows things" and an agent that "has tools."

### 1.2 Industry Context

The SKILL.md specification has become the de facto standard across 30+ agent platforms (Claude Code, Gemini CLI, Cursor, Codex, OpenCode, KiloCode, etc.). The format solves the packaging problem — how to bundle instructions, references, assets, scripts, and hooks into a discoverable unit.

**Anthropic's internal findings** (from "Lessons from Building Claude Code") identify 9 skill categories in active use: Library & API Reference, Product Verification, Data Fetching & Analysis, Business Process Automation, Code Scaffolding, Code Quality & Review, CI/CD & Deployment, Runbooks, and Infrastructure Operations. Their key insight: skills are folders, not files. The file system itself is a form of progressive disclosure.

**Google's ADK documentation** (via Google Cloud Tech) identifies 5 compositional design patterns: Tool Wrapper, Generator, Reviewer, Inversion, and Pipeline. These patterns are not mutually exclusive — a Pipeline skill can include a Reviewer step, and a Generator can begin with Inversion.

### 1.3 cc-agents Implementation

The rd3 plugin implements 35+ skills and 9 agents using the "Fat Skills, Thin Wrappers" architecture pattern (documented in `docs/rd2-architecture.md`):

- **Fat Skills** contain all complex logic, tool interactions, and decision-making
- **Thin Wrappers** (agents/commands) parse input, select skills, and present results
- **Progressive Disclosure**: Skills load context on demand — `references/` directories hold detailed specs loaded only when relevant

**Concrete Example — Skill Structure:**
```
plugins/rd3/skills/orchestration-dev/
├── SKILL.md                    # Skill manifest with frontmatter
├── scripts/
│   ├── runtime.ts              # Pipeline execution engine
│   ├── rollback.ts             # Git-based state restoration
│   ├── gates.ts                # CoV-backed phase gate evaluator
│   ├── state-paths.ts          # State file resolution
│   └── model.ts                # Type definitions
└── references/
    ├── phase-matrix.md         # Profile × Phase execution rules
    ├── gate-definitions.md     # Gate specifications
    └── delegation-map.md       # Phase-to-skill mapping
```

### 1.4 SOTA Principles

| Principle | Description | Industry Adopters |
|-----------|-------------|-------------------|
| **Progressive Disclosure** | Load context only when needed; point to files, don't inline | Claude Code, Gemini CLI |
| **Description-as-Trigger** | The `description` field is scanned for relevance matching, not human summaries | Claude Code SKILL.md spec |
| **Gotchas Section** | Highest-signal content capturing common failure modes from production use | Anthropic internal skills |
| **Anti-Railroading** | Provide information and flexibility rather than rigid step-by-step constraints | Anthropic, Google ADK |
| **Config-as-Setup** | Store setup state in `config.json`; prompt only when missing | Claude Code plugins |
| **Fat Skills / Thin Wrappers** | Skills hold logic; agents coordinate and delegate | cc-agents rd2/rd3 |

### 1.5 Key Insight

The harness problem is largely solved at the format level (SKILL.md won). The remaining frontier is **content design** — how to structure the logic inside the skill, not how to package it. The 5 ADK patterns (Tool Wrapper, Generator, Reviewer, Inversion, Pipeline) provide a vocabulary for this design work.

---

## 2. Orchestration Patterns

### 2.1 Definition

**Orchestration** is the top-level coordination of multiple agent capabilities into a coherent workflow. It determines phase ordering, delegation targets, failure handling, and feedback propagation.

### 2.2 Pattern Taxonomy

#### Pattern A: Sequential Pipeline

The simplest and most common pattern. Phases execute in strict order with entry/exit criteria.

```
Intake → Architecture → Design → Decomposition → Implementation → Testing → Review → Verification → Docs
```

**Used by:** Devin, SWE-Agent, cc-agents rd3, most CI/CD agent systems

**Strengths:** Simple to reason about, easy to checkpoint, natural fit for software development lifecycle  
**Weaknesses:** No parallelism, slow for independent workstreams

#### Pattern B: DAG (Directed Acyclic Graph)

Phases form a dependency graph. Independent phases can execute concurrently.

```
       ┌─> Backend Impl ─> Backend Tests ─┐
Intake ─┤                                    ├─> Integration Review
       └─> Frontend Impl ─> Frontend Tests ─┘
```

**Used by:** LangGraph, Dify, Temporal-based agent systems, CrewAI (with process="hierarchical")

**Strengths:** Parallelism for independent work, optimal resource utilization  
**Weaknesses:** Complex state management, harder to debug, merge conflicts

#### Pattern C: Event-Driven / Actor Model

Agents subscribe to event streams and react autonomously. No central coordinator.

```
[Code Change Event] → Reviewer Agent → [Review Event] → Fix Agent → [Fix Event] → ...
```

**Used by:** AutoGen (multi-agent conversations), OpenHands event stream architecture

**Strengths:** Highly flexible, emergent behavior, loosely coupled  
**Weaknesses:** Unpredictable, hard to verify correctness, potential infinite loops

#### Pattern D: Hierarchical Delegation

A top-level orchestrator delegates to specialist sub-agents, which may further delegate.

```
Orchestrator → super-coder → coder-claude / coder-gemini
            → super-reviewer → code-review-claude / code-review-gemini
            → super-architect → backend-architect / frontend-architect
```

**Used by:** cc-agents rd2/rd3, CrewAI (hierarchical process), Devin (internal delegation)

**Strengths:** Separation of concerns, specialist expertise, scalable  
**Weaknesses:** Latency from delegation chains, coordination overhead

### 2.3 cc-agents Implementation: 9-Phase Sequential Pipeline with Hierarchical Delegation

The rd3 `orchestration-dev` skill implements a **9-phase sequential pipeline** with hierarchical delegation:

```
Phase 1 (Intake) → Phase 2 (Architecture) → Phase 3 (Design) → Phase 4 (Decomposition)
→ Phase 5 (Implementation) → Phase 6 (Testing) → Phase 7 (Review)
→ Phase 8 (Functional Review) → Phase 9 (Documentation)
```

**Key design decisions:**

1. **Phase routing authority is centralized**: `rd3:orchestration-dev` is the single routing authority. Worker agents for phases 5-7 are thin adapters that must not recurse back into orchestration (anti-recursion constraint).

2. **Channel resolution**: Phases 1-4 and 8-9 are pinned to the `current` channel (local execution). Phases 5-7 can delegate to ACP agents via `rd3:run-acp` for cross-channel execution across 14+ agent backends.

3. **Delegation contract**: Heavy phases (5, 6, 7) use the `rd3-phase-worker-v1` contract with standardized inputs (`task_ref`, `phase_context`, `execution_channel`) and outputs (`status`, `phase`, `artifacts`, `evidence_summary`, `next_step_recommendation`).

**Phase-to-Skill Delegation Map:**

| Phase | Skill | Channel |
|-------|-------|---------|
| 1 | `rd3:request-intake` | current |
| 2 | `rd3:backend-architect` or `rd3:frontend-architect` | current |
| 3 | `rd3:backend-design` or `rd3:frontend-design` or `rd3:ui-ux-design` | current |
| 4 | `rd3:task-decomposition` | current |
| 5 | `rd3:super-coder` → `rd3:code-implement-common` | ACP-configurable |
| 6 | `rd3:super-tester` → `rd3:sys-testing` + `rd3:advanced-testing` | ACP-configurable |
| 7 | `rd3:super-reviewer` → `rd3:code-review-common` | ACP-configurable |
| 8 | `rd3:bdd-workflow` + `rd3:functional-review` | current |
| 9 | `rd3:code-docs` | current |

### 2.4 Cross-Channel Execution via ACP

The `rd3:run-acp` skill provides agent-to-agent communication through the `acpx` CLI, implementing the Agent Client Protocol (ACP). This enables the orchestrator to delegate heavy phases to specialized agent backends:

- **14+ backends**: Claude, Codex, Gemini, Cursor, Copilot, Droid, OpenCode, KiloCode, Kimi, Kiro, Pi, Qwen, iFlow, and custom adapters
- **Persistent sessions**: Multi-turn conversations scoped by `(agentCommand, cwd, sessionName)`
- **Prompt queueing**: Active prompt becomes queue owner; other invocations submit via IPC
- **Structured output**: `text`, `json` (NDJSON event stream), `quiet` modes for automation
- **Permission modes**: `approve-all`, `approve-reads`, `deny-all` for CI/CD integration

### 2.5 Comparison with Industry

| System | Pattern | Phases | Parallelism | Human-in-Loop |
|--------|---------|--------|-------------|---------------|
| **cc-agents rd3** | Sequential + Hierarchical | 9 | Sequential (planned: parallel) | Yes (CoV human gates) |
| **Devin** | Sequential Pipeline | ~5 | Limited | Screenshot-based |
| **OpenHands** | Event-Driven Actor | Open-ended | Yes (event stream) | No |
| **SWE-Agent** | Sequential Pipeline | ~4 | No | No |
| **CrewAI** | Sequential / Hierarchical | User-defined | Yes (hierarchical) | Optional |
| **LangGraph** | DAG | User-defined | Yes (graph edges) | Yes (interrupt nodes) |
| **AutoGPT** | Autonomous Loop | Self-directed | Limited | No |
| **Dify** | DAG Workflow | User-defined | Yes (DAG nodes) | Yes (human nodes) |

---

## 3. Chain-of-Verification (CoV)

### 3.1 Definition

**Chain-of-Verification (CoV)** is a Maker-Checker pattern where each step in a workflow produces output (maker) and then validates that output against predefined criteria (checker). The chain is a directed sequence of these nodes with state persistence and failure policies.

CoV addresses the core trust problem in AI agent systems: **how do you know the agent's output is correct?**

### 3.2 The Verification Problem

LLM-based agents produce probabilistic output. Without verification:

- **Hallucination**: Agent claims it did something it didn't
- **Partial completion**: Agent completes 80% and silently skips the rest
- **Specification drift**: Output gradually diverges from requirements across phases
- **Cascade failure**: An error in Phase 2 propagates through Phases 3-9

### 3.3 Verification Approaches in the Industry

| Approach | Mechanism | Used By |
|----------|-----------|---------|
| **Deterministic checks** | File existence, content patterns, exit codes | cc-agents CoV, SWE-Agent, CI pipelines |
| **LLM-as-judge** | Separate LLM evaluates output against checklist | cc-agents CoV (llm checker), LangGraph validators |
| **Execution verification** | Run the code and check results | Devin (sandbox), OpenHands (execution) |
| **Human-in-the-loop** | Pause for human approval at critical junctures | cc-agents CoV (human checker), LangGraph interrupts, Dify |
| **Adversarial review** | Fresh subagent critiques output until findings degrade | Anthropic "adversarial-review" skill |
| **BDD verification** | Run behavioral scenarios against requirements | cc-agents `bdd-workflow` |
| **Snapshot comparison** | Compare before/after states | cc-agents rollback, test golden files |

### 3.4 cc-agents Implementation: Universal CoV System

The rd3 platform implements CoV at two levels:

#### Level 1: Verification Chain Library (`rd3:verification-chain`)

A general-purpose Maker-Checker orchestrator supporting:

**Node Types:**
- **Single nodes**: Sequential maker → checker flow
- **Parallel group nodes**: Multiple makers run concurrently, single checker validates convergence

**Checker Methods (6 types):**

| Method | Use Case | Evidence Produced |
|--------|----------|-------------------|
| `cli` | Run a command, pass if exit code matches | stdout, exit code |
| `file-exists` | Verify file paths exist | List of found paths |
| `content-match` | Regex verification of file contents | Match found (bool) |
| `llm` | LLM evaluates checklist items | Per-item pass/fail with reasons |
| `human` | Pause for human approval | Human response (approve/reject/request_changes) |
| `compound` | AND/OR/quorum of sub-checks | Per-sub-check results |

**Convergence Modes (for parallel groups):**

| Mode | Pass When |
|------|-----------|
| `all` | Every child maker passes |
| `any` | At least one child passes |
| `quorum` | `quorum_count` or ceil(N/2) pass |
| `best-effort` | More than zero pass |

**Failure Policies:**
- `halt` (default): Stop chain immediately
- `skip`: Mark node skipped, continue
- `continue`: Mark node failed, continue

**State Persistence:**
```
<stateDir>/cov/<chain_id>-<task_wbs>-cov-state.json
```

State is saved after every node transition, enabling resume from any paused or interrupted point.

#### Level 2: Universal Phase Gates (`gates.ts`)

Every phase in the 9-phase pipeline runs through a CoV-backed gate manifest. The gate architecture generalizes the Phase 6 verification pattern to all 9 phases:

**Gate structure per phase:**
1. **Deterministic validation**: `file-exists` + `content-match` checks against persisted phase evidence
2. **Phase-specific checks**: Additional content verification (e.g., Phase 1 checks for `profile` assignment, `Background`, `Requirements`, `Constraints` sections in the task file)
3. **Optional human approval**: CoV human-checker node (omitted with `--auto` flag)

**Example — Phase 1 Gate (Request Intake):**
```typescript
// Checks: evidence file exists, has phase=1, status=completed,
// task file has profile, Background (100+ chars), Requirements, Constraints
checks.push(contentMatch(taskPath, buildTaskSectionPattern('Background', 100)));
checks.push(contentMatch(taskPath, buildTaskSectionPattern('Requirements', 10)));
checks.push(contentMatch(taskPath, buildTaskSectionPattern('Constraints', 10)));
```

**Example — Phase 5 Gate (Implementation):**
```typescript
// Checks: evidence has has_structured_output=true, artifacts list,
// and next_step_recommendation
checks.push(contentMatch(evidencePath, `"has_structured_output"\\s*:\\s*true`));
checks.push(contentMatch(evidencePath, `"artifacts"\\s*:`));
checks.push(contentMatch(evidencePath, `"next_step_recommendation"\\s*:`));
```

### 3.5 Compound Checkers: The Power of Composition

The `compound` checker method enables arbitrarily complex verification logic:

- **AND**: All sub-checks must pass (e.g., file exists AND content matches AND lint passes)
- **OR**: At least one sub-check passes (e.g., test suite A OR test suite B passes)
- **Quorum**: N or ceil(N/2) sub-checks pass (e.g., 2 of 3 reviewers approve)

Sub-checks run concurrently, and compound checkers can be nested — an AND of ORs, an OR of ANDs, etc.

### 3.6 Comparison with Industry Verification

| System | Verification Method | Deterministic | LLM-Judge | Human Gate | Stateful |
|--------|---------------------|:---:|:---:|:---:|:---:|
| **cc-agents CoV** | Maker-Checker chain | ✅ | ✅ | ✅ | ✅ |
| **SWE-Agent** | Execution-based | ✅ | ❌ | ❌ | ❌ |
| **Devin** | Sandbox execution + screenshot | ✅ | ❌ | ✅ (visual) | ❌ |
| **LangGraph** | Node validators + interrupts | ✅ | ✅ | ✅ | ✅ |
| **Dify** | Node-level checks | ✅ | ✅ | ✅ | ✅ |
| **CrewAI** | Task callbacks | Limited | ❌ | ❌ | ❌ |

The cc-agents CoV system is notable for combining all four verification modes (deterministic, LLM-judge, human, compound) in a unified, stateful chain with resume capability.

---

## 4. State Management & Rollback

### 4.1 Definition

**State management** is the system for persisting workflow execution state across phases, enabling resume, rollback, and observability. **Rollback** is the ability to reverse the effects of a failed phase to restore the workspace to a known-good state.

### 4.2 Why This Matters

Agent workflows are:
- **Long-running**: A complex pipeline can take 30+ minutes across 9 phases
- **Destructive**: Implementation phases modify files, potentially breaking working code
- **Expensive**: Re-running from scratch wastes compute and token budgets
- **Interruptible**: Network failures, human pauses, and timeouts are routine

Without state management, every interruption means starting over. Without rollback, a failed implementation phase leaves the codebase in a broken state.

### 4.3 Industry Approaches

| System | State Persistence | Resume | Rollback | Cost |
|--------|-------------------|--------|----------|------|
| **cc-agents rd3** | JSON state files + git snapshots | ✅ (from any phase) | ✅ (git-based) | Low |
| **LangGraph** | Checkpoint system | ✅ | ✅ (state rewinding) | Medium |
| **Temporal** | Event sourcing | ✅ | ✅ (workflow replay) | High |
| **Dify** | Conversation state DB | ✅ | Limited | Medium |
| **Devin** | Session snapshots | Partial | Sandbox reset | Medium |
| **AutoGPT** | JSON memory files | Partial | ❌ | Low |
| **OpenHands** | Event stream replay | ✅ | ❌ | Low |
| **SWE-Agent** | Trajectory logs | ❌ | ❌ | Low |

### 4.4 cc-agents Implementation

#### State Persistence

Orchestration state is persisted as JSON at a well-known path:

```
docs/.workflow-runs/rd3-orchestration-dev/<wbs>/<run-id>.json
```

The state object tracks:

```typescript
interface OrchestrationState {
    task_ref: string;
    profile: Profile;                        // simple | standard | complex | research
    execution_channel: string;                // 'current' or ACP agent name
    coverage_threshold: number;               // e.g., 60, 80, 90
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    current_phase?: PhaseNumber;              // 1-9
    auto_approve_human_gates: boolean;
    rework_config: ReworkConfig;
    phases: PhaseExecutionRecord[];           // Per-phase status, evidence, snapshots
}
```

**State is saved after every phase transition** — before execution, after completion, on failure, on pause. This ensures crash recovery at the phase granularity.

#### Resume Semantics

Resume supports two modes:
1. **`--resume`**: Loads the saved state and continues from the paused phase (validates profile and phase-set compatibility)
2. **`--start-phase N`**: Fresh execution from phase N onward (no prior state required)

Resume compatibility is validated:
```typescript
// State profile must match plan profile
// State phase set must match plan phase set
// Only paused orchestrations can be resumed
```

#### Git-Based Rollback

The rollback system (`rollback.ts`) provides two operations:

**1. Auto-Restore on Failure:**
When a phase fails after exhausting rework iterations, the runtime automatically:
1. Captures a pre-phase snapshot (tracked files, untracked files, modified files, HEAD commit)
2. On failure, removes newly created files and restores modified tracked files via `git checkout`
3. Records the restoration in phase evidence

**2. CLI Manual Undo:**
```bash
rd3:orchestration-dev 0266 --undo 5        # Undo phase 5
rd3:orchestration-dev 0266 --undo 5 --dry-run  # Preview what would be restored
```

Undo behavior:
- Removes files created during the phase
- Restores modified tracked files to their pre-phase state
- Clears the undone phase and all downstream phases (trailing state invalidation)
- Persists the updated state file

**Rollback Snapshot Structure:**
```typescript
interface RollbackSnapshot {
    phase: PhaseNumber;
    files_before: string[];          // All files before phase
    files_after: string[];           // All files after phase
    tracked_before: string[];        // Git-tracked before
    untracked_before: string[];      // Untracked before
    modified_before: string[];       // Dirty files before
    git_head_before: string;         // HEAD commit SHA
    created_at: string;
}
```

#### CoV Checkpoint & Gate Evidence

In addition to orchestration state, the system persists:
- **CoV checkpoints**: `<run-id>/cov/` — chain state for each verification chain
- **Gate evidence**: `<run-id>/gates/phase-N-step.json` — normalized evidence for each phase step

This three-tier persistence (orchestration state + CoV checkpoints + gate evidence) provides complete auditability and enables forensic analysis of any pipeline run.

### 4.5 Key Insight

The most sophisticated systems (LangGraph, cc-agents rd3, Temporal) all converge on **event-sourced state with snapshot-based rollback**. The difference is granularity: Temporal replays every event, LangGraph checkpoints at node boundaries, cc-agents snapshots at phase boundaries with git-based file restoration.

---

## 5. Profile-Driven Execution

### 5.1 Definition

**Profile-driven execution** is the practice of routing work through different workflow configurations based on task complexity, scope, and risk. Rather than a one-size-fits-all pipeline, the system adapts its rigor to match the task's needs.

### 5.2 Why This Matters

Running a full 9-phase pipeline with human gates for a one-line typo fix is wasteful. Skipping architecture review for a multi-component API redesign is dangerous. Profile-driven execution is the **Goldilocks problem** of agent orchestration.

### 5.3 Industry Approaches

Most agent systems take one of three approaches:

| Approach | Description | Examples |
|----------|-------------|----------|
| **Fixed pipeline** | One workflow for everything | SWE-Agent, AutoGPT |
| **Manual configuration** | User specifies which phases to run | LangGraph (graph definition), Dify (workflow builder) |
| **Automatic profiling** | System determines complexity and selects appropriate phases | cc-agents rd3, Devin (partial) |

### 5.4 cc-agents Implementation: Dual-Profile System

The rd3 platform implements a sophisticated **dual-profile system** with task profiles and phase profiles:

#### Task Profiles (Complexity-Based Routing)

| Profile | Scope | Files | Phases | Description |
|---------|-------|-------|--------|-------------|
| `simple` | Single deliverable | 1-2 | 5, 6 | Just implement and test |
| `standard` | Moderate scope | 2-5 | 1, 4, 5, 6, 7, 8(bdd), 9 | Requirements → implementation → review → docs |
| `complex` | Large scope | 6+ | 1-9 (all) | Full rigor with architecture and design |
| `research` | Investigation | 2-6 | 1-9 (all) | Full pipeline with lighter test gates |

#### Phase Profiles (Targeted Execution)

| Profile | Phases | Use Case |
|---------|--------|----------|
| `refine` | 1 | Requirements refinement |
| `plan` | 2, 3, 4 | Architecture + design + decomposition |
| `unit` | 6 | Testing only (per-file coverage ≥90%) |
| `review` | 7 | Code review only |
| `docs` | 9 | Documentation refresh |

#### Phase Execution Matrix

```
Phase              simple  standard  complex  research
1 Request Intake   skip    run       run      run
2 Architecture     skip    skip      run      run
3 Design           skip    skip      run      run
4 Decomposition    skip    run       run      run
5 Implementation   run     run       run      run
6 Unit Testing     run(60%)run(80%)  run(80%) run(60%)
7 Code Review      skip    run       run      run
8 Functional Rev.  skip    bdd       bdd+func bdd+func
9 Documentation    skip    run       run      run
```

#### Coverage Thresholds by Profile

| Profile | Default Coverage | Rationale |
|---------|-----------------|-----------|
| `simple` | 60% | Single-file changes, low risk |
| `standard` | 80% | Moderate scope, reasonable rigor |
| `complex` | 80% | Large scope, covered by broader review |
| `unit` (phase profile) | Per-file 90% | Targeted testing, maximum rigor |

#### Skip Phase Constraints

The system enforces a **trailing skip constraint**: you can only skip phases at the end of the pipeline. Skipping an interior phase is rejected because it invalidates downstream inputs:

```
✅ simple: skip 1,2,3,4,7,8,9 (trailing)
❌ Invalid: skip 5 but keep 6 (interior — phase 6 depends on phase 5 output)
```

### 5.5 Comparison with Industry

| System | Profiling | Granularity | Automatic | Override |
|--------|-----------|-------------|-----------|----------|
| **cc-agents rd3** | Dual (task + phase) | Per-phase | ✅ (from task frontmatter) | ✅ (CLI flags) |
| **Devin** | Implicit (task size) | Per-step | ✅ | ❌ |
| **CrewAI** | Per-crew config | Per-agent | ❌ (manual) | ✅ |
| **LangGraph** | Graph definition | Per-node | ❌ (manual) | ✅ |
| **Dify** | Workflow builder | Per-node | ❌ (manual) | ✅ |
| **OpenHands** | Single mode | N/A | N/A | ❌ |

The cc-agents approach is notable for **automatic complexity detection** from task frontmatter combined with **fine-grained override** via CLI flags. The dual-profile system (task profiles for complexity routing, phase profiles for targeted operations) is unique in the current landscape.

---

## 6. Anti-Patterns

### 6.1 Definition

**Anti-patterns** are recurring failure modes in agent orchestration that appear across frameworks and organizations. Recognizing these patterns is more valuable than following prescriptive best practices because anti-patterns are context-independent.

### 6.2 Taxonomy of Anti-Patterns

#### Anti-Pattern 1: The Trust Vacuum

**Problem**: No verification between phases. Each phase assumes the previous phase's output is correct.

**Symptom**: Subtle bugs that compound across phases, with no way to identify which phase introduced the error.

**Example**: An agent generates code in Phase 5, tests pass in Phase 6 (testing the wrong behavior), review approves in Phase 7 (reviewing the code, not the requirements match), and the final deliverable doesn't meet the original spec.

**Solution**: CoV-backed gates between every phase with deterministic + LLM verification. The cc-agents approach: every phase outputs evidence that is validated by the subsequent gate.

#### Anti-Pattern 2: The Flat Prompt

**Problem**: Cramming all instructions into a single prompt or system message.

**Symptom**: Agent ignores half the instructions, follows them inconsistently, or exceeds context limits.

**Example**: A 5000-word system prompt that tries to cover coding style, review criteria, deployment procedures, and debugging runbooks all at once.

**Solution**: Progressive disclosure through skills. Load context on demand. The cc-agents approach: `references/` directories with lazy loading. Anthropic's insight: "Stop trying to cram complex and fragile instructions into a single system prompt."

#### Anti-Pattern 3: The Black Box Pipeline

**Problem**: No observability into what the pipeline did, why it failed, or what it produced.

**Symptom**: "The build failed" with no indication of which phase, what was attempted, or what the error was.

**Example**: An agent runs for 20 minutes and returns "failed" with no intermediate state, no artifacts, no evidence.

**Solution**: Three-tier persistence (orchestration state + CoV checkpoints + gate evidence). The cc-agents approach: every phase transition persists full state, every gate records evidence, every check produces structured output.

#### Anti-Pattern 4: The All-or-Nothing Execution

**Problem**: Every run starts from scratch. No resume capability.

**Symptom**: A 9-phase pipeline fails at Phase 7, and the entire 25 minutes of work is lost.

**Example**: Most early agent systems (AutoGPT, initial SWE-Agent) had no checkpoint mechanism.

**Solution**: Phase-granularity state persistence with resume. The cc-agents approach: save state after every transition, validate resume compatibility, continue from any paused phase.

#### Anti-Pattern 5: The Unbounded Rework Loop

**Problem**: Rework loops with no termination guarantee.

**Symptom**: Agent gets stuck in a fix-test-fail cycle indefinitely.

**Example**: An agent makes a change, tests fail, it "fixes" the fix, tests fail differently, it "fixes" again, ad infinitum.

**Solution**: Bounded rework with escalation. The cc-agents approach:
```typescript
const PUBLIC_CLI_REWORK_CONFIG = {
    max_iterations: 2,           // Hard ceiling
    feedback_injection: true,    // Feed error back as context
    escalation_state: 'paused',  // Escalate to human, not silent failure
};
```

#### Anti-Pattern 6: The Recursive Delegation

**Problem**: A delegated agent re-invokes the orchestrator, creating infinite recursion.

**Symptom**: Stack overflow, runaway token consumption, circular task assignment.

**Example**: A worker agent decides the implementation is "too complex" and delegates back to the orchestrator to "re-plan."

**Solution**: Anti-recursion contracts. The cc-agents approach: worker agents for phases 5-7 must not call `rd3:orchestration-dev`, must not change phase ownership, and must not reinterpret execution-channel semantics.

#### Anti-Pattern 7: The One-Size Pipeline

**Problem**: Using the same workflow complexity for every task regardless of scope.

**Symptom**: 30-minute pipeline for a typo fix, or skipping architecture review for a multi-service redesign.

**Example**: Running a full requirements elicitation, architecture, design, decomposition, implementation, testing, review, functional review, and documentation cycle for a single CSS color change.

**Solution**: Profile-driven execution with automatic complexity detection. The cc-agents approach: task profiles (simple/standard/complex/research) with per-phase coverage thresholds.

#### Anti-Pattern 8: The Stateless Sandbox

**Problem**: No rollback capability when a phase modifies the workspace destructively.

**Symptom**: Failed implementation phase leaves broken code, requiring manual git surgery.

**Example**: Agent writes incorrect code during Phase 5, tests fail in Phase 6, and the developer must manually identify and revert the changes.

**Solution**: Git-based snapshots with auto-restore. The cc-agents approach: capture pre-phase snapshots, auto-restore on exhausted rework, manual `--undo` for targeted rollback.

#### Anti-Pattern 9: The Railroading Prompt

**Problem**: Over-constrained instructions that prevent the agent from adapting to the actual situation.

**Symptom**: Agent follows instructions to the letter even when they're clearly wrong for the current context.

**Example**: A skill that mandates "always use TypeScript" even for a Python project.

**Solution**: Provide information, not rigid constraints. Anthropic's guidance: "Give Claude the information it needs, but give it the flexibility to adapt to the situation."

#### Anti-Pattern 10: The Hallucinated Completion

**Problem**: Agent claims it completed a task that it did not actually complete.

**Symptom**: Phase reports "completed" but files don't exist, tests don't pass, or requirements aren't met.

**Example**: Agent says "I've updated all 5 files" but only modified 3.

**Solution**: Deterministic file-exists and content-match checkers. The cc-agents approach: every phase gate validates physical artifacts exist and contain expected content patterns before marking the phase as complete.

### 6.3 Anti-Pattern Severity Matrix

| Anti-Pattern | Frequency | Impact | Mitigation Cost |
|-------------|-----------|--------|-----------------|
| Trust Vacuum | Very High | Critical | Medium (CoV system) |
| Flat Prompt | High | High | Low (progressive disclosure) |
| Black Box | High | High | Medium (state persistence) |
| All-or-Nothing | Medium | High | Medium (resume system) |
| Unbounded Rework | Medium | High | Low (iteration caps) |
| Recursive Delegation | Low | Critical | Low (anti-recursion contract) |
| One-Size Pipeline | Very High | Medium | Medium (profile system) |
| Stateless Sandbox | High | Medium | Medium (git snapshots) |
| Railroading | Medium | Medium | Low (flexible prompts) |
| Hallucinated Completion | Very High | Critical | Medium (deterministic checks) |

---

## 7. Comparative Landscape

### 7.1 Industry Systems Overview

#### Claude Code (Anthropic)
- **Approach**: Skill-based extensibility with hooks
- **Strengths**: Largest skill ecosystem, progressive disclosure, on-demand hooks
- **Limitations**: No built-in multi-phase orchestration, no state persistence across sessions
- **Relevance**: Skill design patterns, harness engineering best practices

#### Devin (Cognition)
- **Approach**: Full autonomous software engineer with sandboxed execution
- **Strengths**: End-to-end autonomy, browser-based verification, screenshot-based human review
- **Limitations**: Black box internally, limited customization, expensive
- **Relevance**: Autonomous execution model, sandbox-based verification

#### OpenHands (formerly OpenDevin)
- **Approach**: Event-stream architecture with pluggable agents
- **Strengths**: Flexible agent architecture, event replay, open source
- **Limitations**: No phase gates, limited verification, no rollback
- **Relevance**: Event-driven architecture patterns

#### SWE-Agent (Princeton)
- **Approach**: Minimal agent with tight bash/git integration
- **Strengths**: Extremely lean, fast iteration, strong benchmark performance
- **Limitations**: No multi-phase workflow, no verification beyond test execution
- **Relevance**: Interface design between agent and environment

#### AutoGPT
- **Approach**: Autonomous goal-directed agent with memory
- **Strengths**: Self-directed planning, persistent memory
- **Limitations**: Unbounded execution, frequent goal drift, no verification
- **Relevance**: Cautionary example for autonomous loops without guardrails

#### CrewAI
- **Approach**: Multi-agent orchestration with role-based crews
- **Strengths**: Natural role definition, sequential/hierarchical processes
- **Limitations**: Limited verification, no state persistence, manual profiling
- **Relevance**: Role-based agent coordination patterns

#### LangGraph (LangChain)
- **Approach**: Graph-based workflow with stateful nodes
- **Strengths**: DAG execution, checkpointing, interrupt/resume, flexible verification
- **Limitations**: Requires manual graph construction, no automatic profiling
- **Relevance**: State management, checkpointing, interrupt patterns

#### Dify
- **Approach**: Visual workflow builder with LLM nodes
- **Strengths**: Visual DAG builder, built-in human nodes, tool integration
- **Limitations**: Less programmatic control, limited verification depth
- **Relevance**: Visual orchestration, human-in-the-loop UX

#### Cursor / Windsurf
- **Approach**: IDE-integrated agentic coding
- **Strengths**: Rich context from IDE, inline verification, fast iteration
- **Limitations**: Single-session, no multi-phase orchestration, no cross-agent delegation
- **Relevance**: Context engineering, IDE integration patterns

### 7.2 Feature Comparison Matrix

| Feature | cc-agents rd3 | Claude Code | Devin | LangGraph | CrewAI | Dify |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|
| Multi-phase pipeline | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Deterministic verification | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| LLM-as-judge | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Human-in-the-loop | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| State persistence | ✅ | ❌ | Partial | ✅ | ❌ | ✅ |
| Resume from pause | ✅ | ❌ | ❌ | ✅ | ❌ | Partial |
| Git-based rollback | ✅ | ❌ | Sandbox | ❌ | ❌ | ❌ |
| Automatic profiling | ✅ | ❌ | Partial | ❌ | ❌ | ❌ |
| Cross-agent delegation | ✅ (14+ backends) | ❌ | ❌ | ✅ | ✅ | ❌ |
| Bounded rework loops | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |

---

## 8. Convergence Themes & Predictions

### 8.1 What the Industry Is Converging On

1. **SKILL.md as standard**: 30+ platforms now support the same skill format. The format war is over.

2. **Verification as first-class concern**: Every serious orchestration system now includes some form of gate/validation between phases. The CoV Maker-Checker pattern is becoming the standard approach.

3. **State persistence is table stakes**: The days of stateless agent pipelines are ending. LangGraph's checkpointing, cc-agents' three-tier persistence, and Temporal's event sourcing all point to durable state as a baseline requirement.

4. **Profile-driven routing**: One-size-fits-all pipelines are being replaced by complexity-based routing. The cc-agents dual-profile system and Devin's implicit sizing represent early examples of what will become standard.

5. **Cross-agent delegation**: The Agent Client Protocol (ACP) and similar standards are enabling multi-agent systems where an orchestrator delegates to specialized backends (Claude for reasoning, Codex for implementation, Gemini for review).

### 8.2 Open Problems

1. **Parallel phase execution**: Most systems (including cc-agents rd3) are still sequential. DAG-based parallel execution with merge conflict resolution remains unsolved.

2. **Adaptive rework**: Current rework loops are fixed-iteration. Systems that dynamically adjust rework strategy based on error patterns don't exist yet.

3. **Cross-agent state sharing**: ACP enables delegation but not shared state. Delegated agents work in isolation without access to the orchestrator's full context.

4. **Verification completeness**: Deterministic checkers verify that artifacts exist and contain patterns, but not that they're semantically correct. LLM judges help but add non-determinism.

5. **Cost-aware profiling**: Current profile systems don't factor in token costs or execution time. A task that's "simple" by file count but requires expensive reasoning gets no special treatment.

### 8.3 Predictions for 2026-2027

1. **ACP will become the HTTP of agent communication**: Just as HTTP standardized web communication, ACP (or a successor protocol) will standardize agent-to-agent delegation across all platforms.

2. **Verification chains will become composable and shareable**: Teams will publish verification chains as reusable artifacts, similar to how CI/CD templates are shared today.

3. **Adaptive pipelines will emerge**: Systems that modify their own phase structure based on runtime feedback (not just which phases to include, but what checks to run within them).

4. **Rollback will become semantic**: Beyond git-based file restoration, systems will understand the semantic effects of a phase (database migrations, API deployments) and reverse them.

5. **The harness will become invisible**: As skill standards stabilize and progressive disclosure becomes ubiquitous, developers will think in terms of capabilities, not skill files.

---

## 9. References

### Project Internal References

1. `plugins/rd3/skills/orchestration-dev/SKILL.md` — 9-phase pipeline orchestrator specification
2. `plugins/rd3/skills/verification-chain/SKILL.md` — Chain-of-Verification system specification
3. `plugins/rd3/skills/run-acp/SKILL.md` — ACP cross-channel execution skill
4. `plugins/rd3/skills/orchestration-dev/scripts/gates.ts` — Universal CoV-backed gate evaluator
5. `plugins/rd3/skills/orchestration-dev/scripts/runtime.ts` — Pipeline execution engine with rework and state
6. `plugins/rd3/skills/orchestration-dev/scripts/rollback.ts` — Git-based rollback system
7. `plugins/rd3/skills/orchestration-dev/references/phase-matrix.md` — Profile × Phase execution matrix
8. `docs/rd2-architecture.md` — RD2 architecture with fat-skills/thin-wrappers pattern
9. `docs/reasearch/5_Agent_Skill_design_patterns_every_ADK_developer_should_know.md` — 5 ADK design patterns
10. `docs/reasearch/Lessons_from_Building_Claude_Code_How_We_Use_Skills.md` — Anthropic internal skill lessons

### Industry References

11. Anthropic, "Lessons from Building Claude Code: How We Use Skills" (2026)
12. Google Cloud Tech / Saboo & Lavinigam, "5 Agent Skill Design Patterns Every ADK Developer Should Know" (2026)
13. SKILL.md Specification — cross-platform skill manifest format (2025-2026)
14. Agent Client Protocol (ACP) — agent-to-agent communication standard (2026)
15. LangGraph Documentation — stateful graph-based agent orchestration (2025-2026)
16. CrewAI Documentation — role-based multi-agent orchestration (2025-2026)
17. Dify Documentation — visual workflow builder for LLM applications (2025-2026)
18. SWE-Agent (Yang et al., Princeton) — autonomous software engineering agent (2024-2026)
19. OpenHands (Wang et al.) — event-stream agent architecture (2024-2026)
20. Devin (Cognition Labs) — autonomous AI software engineer (2024-2026)

---

*This document was synthesized on 2026-03-31. Industry observations reflect publicly available information as of that date. Internal cc-agents implementation details reference the rd3 plugin at current HEAD.*
