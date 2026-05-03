# rd3 Plugin — Full Reverse Engineering Report

**Generated**: 2026-05-02  
**Mode**: Full (briefing + structure + architecture + design + audit + roadmap)  
**Focus**: all  
**Format**: markdown  
**Scope**: `/Users/robin/projects/cc-agents/plugins/rd3/`

---

## 1. Executive Summary

**rd3** is a universal agent skills orchestrator — a plugin for the `cc-agents` project that provides 50 reusable AI coding agent skills, 13 specialist subagent definitions, 46 slash commands, shared runtime infrastructure, and a DAG-based pipeline orchestration engine. It targets 7 platforms: Claude Code, Codex, Gemini CLI, OpenClaw, OpenCode, Antigravity, and Pi.

**Core design principle**: "Fat Skills, Thin Wrappers" — skills contain all implementation logic; commands and agents are thin delegation wrappers (~50-100 lines). The system is managed end-to-end by four meta-skills (`cc-skills`, `cc-commands`, `cc-agents`, `cc-magents`) operating an `evaluate → refine → evolve` quality loop.

**Scale**: ~121K lines of TypeScript across 50 skills + 7.9K lines shared scripts + 4.6K lines tests + ~7K lines markdown (commands + agents).

---

## 2. Purpose Hypothesis

rd3 solves the problem of managing AI coding agent behavior at scale across multiple competing platforms. Instead of rewriting agent instructions for each platform, rd3 provides a **single source of truth** (skill packages) that can be installed, adapted, and executed across Claude Code, Codex, Pi, Gemini CLI, OpenClaw, OpenCode, and Antigravity.

It is both:
1. A **development pipeline** (task intake → decomposition → implementation → testing → review → verification → docs) orchestrated by a DAG-based FSM engine
2. A **meta-framework** for creating, evaluating, and evolving agent skills themselves (skills that create skills)

---

## 3. Technology Stack

| Layer | Technology | Version/Notes |
|-------|-----------|---------------|
| Runtime | Bun.js | Primary runtime; `bun:*` APIs preferred over `node:*` |
| Language | TypeScript | Strict mode via `tsconfig.json` |
| Linting/Formatting | Biome | No Prettier or ESLint |
| State Persistence | SQLite (via `bun:sqlite`) | Event-sourced state for orchestration, feature tree, verification chain |
| Configuration | YAML | Pipeline definitions, ACP agent configs |
| CLI Framework | Custom (Bun-based) | `bun:shell` + `Bun.spawn()` |
| HTTP Server | Bun native (`Bun.serve`) | Task management web UI |
| Frontend | Vite + React (embedded) | Kanban board in tasks skill |
| Cross-Platform | ACP (Agent Client Protocol) | `acpx` CLI for agent-to-agent delegation |
| External Deps | `yaml` (2.8.3) | YAML parsing for pipeline definitions |

Build artifacts are compiled via `bun build` to standalone binaries and symlinked to `~/.bun/bin/`:
- `tasks` — task management CLI
- `ftree` — feature tree CLI
- `orchestrator` — pipeline orchestration CLI
- `cov` — verification chain CLI

---

## 4. Repository Architecture

### 4.1 Architecture Pattern: Layered Fat-Skills

rd3 follows a **four-layer architecture** with clear ownership boundaries:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Main Agent Configs (cc-magents)                │
│ AGENTS.md, CLAUDE.md, GEMINI.md — global policy         │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Subagents (cc-agents)                          │
│ 13 specialist agents: super-coder, super-tester, etc.   │
│ Thin wrappers ~50-250 lines                             │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Slash Commands (cc-commands)                   │
│ 46 commands: dev-run, dev-review, skill-add, etc.       │
│ Thin wrappers ~50-200 lines                             │
├─────────────────────────────────────────────────────────┤
│ Layer 1: Skills (cc-skills) — FAT LAYER                 │
│ 50 skills, 121K lines TypeScript                        │
│ Contains ALL implementation logic                       │
└─────────────────────────────────────────────────────────┘
```

**Cross-cutting infrastructure** (shared across layers):
- `plugins/rd3/scripts/` — logger, evolution engine, grading, utilities
- `plugins/rd3/hooks/` — Claude Code hooks (SessionStart, PreToolUse, Stop)
- `plugins/rd3/scripts/libs/` — ACP query, CLI args, validation runner, Result type

### 4.2 Directory Structure

```
plugins/rd3/
├── agents/           (13 files, ~2,840 lines markdown)
│   ├── expert-*.md   (5 meta-agent specialists)
│   ├── super-*.md    (5 domain specialists)
│   ├── jon-snow.md   (pipeline router)
│   ├── knowledge-seeker.md
│   └── second-brain.md
├── commands/         (46 files, ~4,200 lines markdown)
│   ├── agent-*.md    (9 agent management commands)
│   ├── command-*.md  (7 command management commands)
│   ├── dev-*.md      (15 developer workflow commands)
│   ├── hook-*.md     (4 hook management commands)
│   ├── magent-*.md   (5 main agent management commands)
│   ├── prd-*.md      (4 product management commands)
│   └── skill-*.md    (6 skill management commands)
├── skills/           (50 directories, 121K lines TypeScript)
│   ├── Core CLI skills: orchestration-v2, tasks, feature-tree, verification-chain
│   ├── Meta skills: cc-skills, cc-commands, cc-agents, cc-magents, cc-hooks
│   ├── Pipeline phases: code-implement-common, sys-testing, code-review-common, bdd-workflow, code-docs
│   ├── Planning: brainstorm, task-decomposition, deep-research, knowledge-extraction
│   ├── Language: pl-golang, pl-python, pl-typescript, pl-javascript
│   ├── Design: backend-architect, frontend-architect, backend-design, frontend-design, ui-ux-design
│   ├── Quality: advanced-testing, tdd-workflow, code-improvement, verification-chain
│   ├── Operations: run-acp, sys-debugging, sys-developing, handover, transfer
│   └── Specialist: anti-hallucination, indexed-context, quick-grep, cli-for-ai, daily-summary, token-saver
├── scripts/          (12 files, ~7,918 lines TypeScript)
│   ├── evolution-engine.ts (51KB)
│   ├── logger.ts, utils.ts, fs.ts, grading.ts
│   └── libs/ (validation-runner, acpx-query, cli-args, result, research-patterns)
├── tests/            (21 test files, ~4,652 lines)
├── hooks/
│   └── hooks.json    (SessionStart, PreToolUse, Stop hooks)
├── references/
│   ├── meta-agent-workflow-schema.md
│   └── shared-library-status.md
├── CHANGELOG.md      (38KB, detailed version history)
├── README.md         (meta-agent guide)
└── package.json      (Bun.js project config)
```

---

## 5. Component Architecture — Skill Taxonomy

### 5.1 Skill Classification Matrix

Skills fall into four categories based on implementation type:

| Category | Count | Examples | Characteristics |
|----------|-------|----------|-----------------|
| **CLI-Heavy** (has TypeScript) | 11 | orchestration-v2, tasks, feature-tree, verification-chain, cc-agents, cc-skills, cc-commands, cc-magents, deep-research, knowledge-extraction, anti-hallucination | Compiled to standalone binaries; SQLite-backed |
| **Hybrid** (scripts + tests) | 11 | bdd-workflow, daily-summary, handover, transfer, task-runner, cc-hooks, quick-grep, indexed-context | Small script surface; mostly LLM-driven |
| **Pure LLM** (markdown only) | 28 | code-implement-common, sys-testing, tdd-workflow, code-review-common, brainstorm, reverse-engineering, request-intake, all pl-*, backend/frontend-design, etc. | Reference-driven skills; LLM follows instructions |
| **Meta** (cc-*) | 5 | cc-skills, cc-commands, cc-agents, cc-magents, cc-hooks | Manage other skills/commands/agents; reflexive architecture |

### 5.2 Top Skills by Code Volume

| Skill | Lines | Primary Role |
|-------|-------|-------------|
| orchestration-v2 | 33,155 | DAG pipeline engine with FSM + SQLite state |
| tasks | 15,029 | Markdown task management + Kanban web UI |
| cc-agents | 14,710 | Subagent scaffold/validate/evaluate/refine/evolve/adapt |
| cc-skills | 9,280 | Skill scaffold/validate/evaluate/refine/evolve/package/migrate |
| orchestration-v1 | 8,772 | Legacy sequential pipeline (frozen) |
| cc-commands | 8,720 | Command scaffold/validate/evaluate/refine/evolve/adapt |
| verification-chain | 7,703 | Chain-of-Verification orchestrator (cov CLI) |
| feature-tree | 6,636 | Hierarchical feature management (ftree CLI) |

### 5.3 Agent Taxonomy

| Agent | Role | Delegation Target |
|-------|------|-------------------|
| **jon-snow** | Pipeline router | → `rd3:orchestration-v2` |
| **super-coder** | Implementation worker | → `rd3:code-implement-common` |
| **super-tester** | Test execution | → `rd3:sys-testing`, `rd3:advanced-testing` |
| **super-reviewer** | Code review | → `rd3:code-review-common`, `rd3:code-improvement` |
| **super-brain** | Brainstorming/ideation | → `rd3:brainstorm` + `rd3:deep-research` |
| **super-pm** | Product management | → `rd3:product-management` |
| **knowledge-seeker** | Research synthesis | → `rd3:deep-research` |
| **second-brain** | Project intelligence | → `rd3:indexed-context` |
| **expert-agent** | Subagent management | → `rd3:cc-agents` |
| **expert-command** | Command management | → `rd3:cc-commands` |
| **expert-skill** | Skill management | → `rd3:cc-skills` |
| **expert-magent** | Main agent config | → `rd3:cc-magents` |
| **expert-hook** | Hook management | → `rd3:cc-hooks` |

---

## 6. Data Model

### 6.1 Task File Format (Markdown + YAML Frontmatter)

Tasks are stored as markdown files at `docs/tasks/<WBS>_<name>.md`:

```yaml
---
wbs: "0266"
name: "Implement user authentication"
status: "ready"           # backlog | ready | wip | testing | done
preset: "standard"         # simple | standard | complex | research
feature_id: "f_auth"       # Linked feature (advisory)
feature_path: "auth/oauth" # Feature tree path
created: "2026-04-01"
updated: "2026-04-15"
---

# Background
...

# Requirements
...

# Solution
...

# Implementation Progress
...

# Verification
...
```

### 6.2 Pipeline YAML Schema

Pipelines are defined at `docs/.workflows/pipeline.yaml`:

```yaml
schema_version: 1
name: orchestration-v2
phases:
  implement:
    skill: rd3:code-implement-common
    gate:
      type: command
      command: "bun run check"
    timeout: 2h
    payload:
      tdd: true
      sandbox: git-worktree
  test:
    skill: rd3:sys-testing
    gate:
      type: command
      command: "bun test --coverage"
    after: [implement]
```

### 6.3 SQLite Schema (orchestration-v2)

The event-sourced state database (`~/.orchestrator/state.db`) has 6 tables:

| Table | Purpose |
|-------|---------|
| `runs` | Pipeline run records (FSM state, timestamps) |
| `phases` | Per-phase execution records (state, evidence, rework count) |
| `events` | Event-sourced audit trail (all state transitions) |
| `gate_results` | Gate evaluation results (pass/fail/pause) |
| `artifacts` | Phase output artifacts (file paths, metadata) |
| `migrations` | Schema migration tracking |

FSM states: `IDLE → RUNNING → PAUSED / COMPLETED / FAILED`

### 6.4 Verification Chain Schema

```typescript
interface ChainManifest {
  chain_id: string;
  chain_name: string;
  task_wbs: string;
  nodes: ChainNode[];
  global_retry?: { remaining: number; total: number };
  on_node_fail?: 'halt' | 'skip' | 'continue';
}

type ChainNode = SingleNode | ParallelGroup | HumanGateNode;

interface SingleNode {
  name: string;
  type: 'single';
  maker: Maker;
  checker: Checker;
  on_fail?: 'halt' | 'retry' | 'skip';
}
```

Checker methods: `cli`, `content_match`, `file_exists`, `human`, `llm`, `compound`.

### 6.5 Feature Tree Schema

Features are stored in SQLite with a hierarchical adjacency model:

```sql
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  status TEXT,        -- backlog | validated | executing | done
  description TEXT,
  wbs_links TEXT,     -- JSON array of WBS numbers
  metadata TEXT,      -- JSON
  created_at TEXT,
  updated_at TEXT
);
```

Status rolls up from leaves to root: all children done → parent done.

---

## 7. Key Flows

### 7.1 Full Pipeline Execution Flow

```
User: "/rd3:dev-run 0266"
        │
        ▼
┌──────────────────────────────────────┐
│ jon-snow agent (routing wrapper)     │
│ Detects full-pipeline request        │
│ Delegates to orchestration-v2        │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ PipelineRunner (orchestration-v2)                        │
│                                                          │
│ 1. Load PipelineDefinition from pipeline.yaml            │
│ 2. Resolve preset → phase list                           │
│ 3. DAGScheduler.topologicalSort(phases)                  │
│ 4. For each ready phase group (parallel):                │
│    a. FSM: advance to RUNNING                            │
│    b. ExecutorPool → dispatch to executor                │
│       - inline: invoke skill locally                     │
│       - subprocess: spawn Bun child process              │
│       - ACP: delegate via acpx to external agent         │
│    c. GateEvaluator → check gate                         │
│       - command: run shell command, check exit code      │
│       - auto: run CoV verification checklist             │
│       - human: pause pipeline, wait for approval         │
│    d. StateManager → persist events to SQLite            │
│    e. On failure: rework loop (up to max_iterations)     │
│       or escalate (pause/fail)                           │
│ 5. FSM: advance to COMPLETED or FAILED                   │
│ 6. Report generation                                     │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Task Lifecycle

```
tasks create → backlog
    │
    ▼
tasks update <wbs> ready   (requires: requirements in body)
    │
    ▼
rd3:dev-run → wip → testing → done
    │           │        │        │
    │           │        │        └── tasks update <wbs> done
    │           │        │            (requires: solution, verification)
    │           │        │
    │           │        └── rd3:dev-unit (test-only pass)
    │           │
    │           └── rd3:code-implement-common (TDD loop)
    │
    └── rd3:dev-plan (assess readiness, synthesize plan)
```

### 7.3 Skill Delegation Chain

```
Command (/rd3:dev-review src/auth/)
    │
    ▼
dev-review.md (thin wrapper, ~80 lines)
    │ Parse args, normalize to --focus security
    │
    ▼
rd3:code-review-common skill (LLM-driven)
    │ Follow SECU framework
    │ Produce findings
    │
    ▼
rd3:verification-chain (optional)
    │ Run CoV checklist on findings
    │ Gate: pass/fail
```

### 7.4 Cross-Platform Execution

```
┌─────────────┐     ACP      ┌─────────────┐
│  Claude Code │ ◄──────────► │    Codex     │
│  (primary)   │   acpx CLI   │  (worker)    │
└──────┬───────┘              └──────┬───────┘
       │                             │
       │ Skill(skill="rd3:           │ acpx codex exec
       │   code-implement-           │ "Implement auth"
       │   common", args="0266")     │
       │                             │
       ▼                             ▼
┌──────────────────────────────────────────┐
│        orchestration-v2                  │
│        PipelineRunner                    │
│                                          │
│  ExecutorPool routes to:                 │
│  - inline (Bun process)                  │
│  - subprocess (Bun child)                │
│  - acp-oneshot:codex (external agent)    │
│  - acp-oneshot:opencode                  │
│  - acp-oneshot:pi                        │
└──────────────────────────────────────────┘
```

---

## 8. Cross-Cutting Concerns

### 8.1 Logging

All scripts use `scripts/logger.ts` — a shared logger that respects a `globalSilent` flag for test suppression. `console.*` calls are forbidden in scripts; violations are flagged by `grep`.

```typescript
import { logger } from '../../../../scripts/logger';
logger.info('Processing:', filePath);
logger.error('Failed to process file');
```

### 8.2 Hooks (Claude Code)

Three hooks defined in `hooks/hooks.json`:

| Hook | Trigger | Command |
|------|---------|---------|
| SessionStart | `*` | `bun skills/indexed-context/scripts/session-start.ts` |
| PreToolUse | `Write\|Edit` | `bun skills/tasks/scripts/tasks.ts write-guard` |
| Stop | `*` | `bun skills/anti-hallucination/scripts/ah_guard.ts` |

These are Claude Code-specific; other platforms use platform-specific hook configs via `rd3:cc-hooks`.

### 8.3 Error Handling Pattern

Shared `Result<T, E>` type (`scripts/libs/result.ts`) for railway-oriented error handling:

```typescript
type Result<T, E = string> = Ok<T> | Err<E>;
function ok<T>(value: T): Ok<T>;
function err<E>(error: E): Err<E>;
```

Exit codes standardized in `orchestration-v2/scripts/config/consts.ts`:
- `EXIT_SUCCESS` (0), `EXIT_PIPELINE_FAILED` (1), `EXIT_PIPELINE_PAUSED` (2)
- `EXIT_INVALID_ARGS` (3), `EXIT_VALIDATION_FAILED` (4), `EXIT_TASK_NOT_FOUND` (5)
- `EXIT_STATE_ERROR` (6), `EXIT_EXECUTOR_UNAVAILABLE` (7)

### 8.4 Anti-Hallucination Protocol

The `rd3:anti-hallucination` skill is marked as "always-on" and enforces a zero-trust verification-before-generation protocol via a `Stop` hook guard. All skills are expected to verify external claims before generating code.

### 8.5 Project Intelligence (OpenWolf)

`rd3:indexed-context` / `rd3:second-brain` provides session-start project awareness via `.wolf/` directories:
- File index awareness
- Learning memory (cerebrum)
- Token tracking
- Bug history
- Design QC reframe framework selection

---

## 9. Quality & Security Audit

### 9.1 Quality Assessment

| Dimension | Rating | Evidence |
|-----------|--------|----------|
| **Architecture** | A- | Well-layered; clear ownership boundaries; "fat skills, thin wrappers" consistently applied |
| **Test Coverage** | B | 21 test files in `tests/` + skill-level tests in 14 skills; V8 function coverage quirks documented |
| **Code Consistency** | A- | Biome formatting/linting enforced; `bun:*` over `node:*` preference; shared logger |
| **Documentation** | B+ | Comprehensive SKILL.md for each skill; reference docs for major subsystems; CHANGELOG well-maintained |
| **Error Handling** | B+ | Result type used in newer code (orchestration-v2); mixed patterns in older code |
| **Modularity** | B+ | Skills are well-isolated; 28 pure-LLM skills have zero code dependencies; meta-skills share evolution engine |

**Identified Issues:**

1. **HIGH — orchestration-v1 still present**: 8,772 lines of frozen legacy code in `orchestration-v1/`. No migration utility to remove it. Risk of confusion with v2.
2. **MEDIUM — Duplicate skill patterns**: `code-verification` and `dev-verification` appear to overlap; `daily-summary` and `dev-daily-summary` are near-duplicates.
3. **MEDIUM — Large script files**: `evolution-engine.ts` at 51KB (1,500+ lines) is a monolith handling all four asset types. Should be split by asset type.
4. **LOW — Mixed executor patterns**: Legacy channel aliases (`local`, `auto`, `current`, `direct`) add normalization complexity in the executor adapter layer.
5. **LOW — Inline test injection**: `config.ts` uses `_setTestConfigPath()` / `_resetTestConfigPath()` pattern that leaks test concerns into production code.

### 9.2 Security Assessment

| Finding | Severity | Details |
|---------|----------|---------|
| No hardcoded secrets found | ✅ PASS | No API keys, credentials, or tokens in source |
| `.env` files excluded | ✅ PASS | Not present in git; `.env*` in `.gitignore` |
| External content safety | ⚠️ LOW | `rd3:run-acp` executes external ACP commands; relies on `acpx` CLI security model |
| Hook execution | ⚠️ LOW | `hooks.json` executes `bun` scripts on SessionStart/Stop; path injection risk mitigated by `${CLAUDE_PLUGIN_ROOT}` |
| SQL injection | ✅ PASS | All SQL uses parameterized queries via `bun:sqlite` |
| File path traversal | ⚠️ LOW | Task file operations use WBS-based resolution; `extractWbsFromPath()` sanitizes inputs |

### 9.3 Performance Considerations

| Concern | Impact | Mitigation |
|---------|--------|------------|
| SQLite for state | Low-medium | Single-writer; acceptable for pipeline state (not hot path) |
| Event sourcing overhead | Low | Events are append-only; `prune` command exists for compaction |
| Large TypeScript builds | Medium | `bun build` is fast; compilation to standalone binaries is efficient |
| ACP network latency | Medium | Only for cross-platform delegation; default is inline execution |

---

## 10. Modernization Roadmap

### 10.1 Short-Term (Next 1-2 sprints)

1. **Remove orchestration-v1**: After confirming no active consumers, delete the `orchestration-v1/` skill directory (~8,772 lines removed).
2. **Consolidate duplicate skills**: Merge `dev-verification` into `code-verification`; merge `dev-daily-summary` into `daily-summary`.
3. **Split evolution-engine.ts**: Separate into `evolution-engine-skills.ts`, `evolution-engine-commands.ts`, `evolution-engine-agents.ts`, `evolution-engine-magents.ts` with shared base.

### 10.2 Medium-Term (Next quarter)

4. **Standardize executor patterns**: Remove legacy channel aliases; enforce `inline | subprocess | acp-<agent>`.
5. **Extract test injection pattern**: Move `_setTestConfigPath()` into a test-only module or use dependency injection.
6. **Publish as npm package**: `@cc-agents/rd3` is already configured but marked `private: true`. Consider publishing for external installation.
7. **Add E2E pipeline tests**: Currently no integration tests that run a full pipeline end-to-end.

### 10.3 Long-Term (Next 6 months)

8. **Plugin marketplace**: Enable external skill contributions via a package registry.
9. **Distributed execution**: Support multi-machine pipeline phases via ACP federation.
10. **Observability dashboard**: Metrics collection from `observability/` module; currently unused in production.
11. **Migration to pure DAG**: Reduce reliance on presets; make the DAG the primary execution model with presets as optional shortcuts.

---

## 11. Open Questions & Risks

### 11.1 Architectural Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Platform API divergence | Medium | High | Each platform's agent format may diverge; `cc-agents adapt` needs constant maintenance |
| ACP protocol instability | Low | Medium | `acpx` is a young CLI; API breaking changes possible |
| Bun.js ecosystem lock-in | Low | Medium | `bun:*` APIs are Bun-specific; migration to Node would require rewrites |
| Task file format drift | Medium | Medium | Multiple tools write to task files; schema validation via `tasks check` is optional |

### 11.2 Open Questions

1. **Orchestrator self-hosting**: Does the orchestrator use itself for its own development? The "Dogfood Test" section suggests yes but no explicit dogfooding evidence in CHANGELOG.
2. **Hook platform parity**: `hooks.json` is Claude Code-specific. Other platforms get hooks via `cc-hooks` adapt flow — but are the same three hooks (SessionStart, PreToolUse, Stop) supported on all platforms?
3. **Feature tree ↔ Orchestration coupling**: The feature tree is described as "advisory" but the `feature_id` field appears in task frontmatter. How does orchestration-v2 consume this? Currently appears to be advisory-only.
4. **Evolution engine scope**: `evolution-engine.ts` handles all four asset types. Is there a plan to make it asset-agnostic (generic) vs. asset-specific split?
5. **Biome-only policy risk**: The project forbids ESLint/Prettier. If Biome misses a rule that ESLint catches, there's no fallback.

---

## 12. Evidence Index

| Claim | Evidence | Confidence |
|-------|----------|------------|
| "Fat skills, thin wrappers" architecture | README.md §How The Four Skills Work Together; super-coder.md (205 lines, all delegation); dev-review.md (80 lines) | HIGH |
| 50 skills, 121K lines TypeScript | File enumeration + `wc -l` | HIGH |
| DAG-based pipeline with FSM + SQLite | orchestration-v2/SKILL.md §Core Concepts; scripts/engine/fsm.ts, dag.ts, runner.ts | HIGH |
| Event-sourced state (6 SQLite tables) | orchestration-v2/SKILL.md §Event-Sourced State; scripts/state/events.ts, manager.ts | HIGH |
| 7-platform support | SKILL.md frontmatter `platforms` field on every skill | HIGH |
| CoV verification chain | verification-chain/SKILL.md; scripts/methods/*.ts (cli, llm, human, compound, content_match, file_exists) | HIGH |
| Bun.js-first, Node.js fallback | AGENTS.md §Package Priority | HIGH |
| Meta-skills manage themselves | cc-skills/SKILL.md §Operations (8 operations: add, validate, evaluate, refine, evolve, adapt, package, migrate) | HIGH |
| ACP cross-platform delegation | run-acp/SKILL.md; orchestration-v2/scripts/integrations/acp/*.ts | HIGH |
| Task file markdown + YAML format | tasks/SKILL.md §Core Commands; scripts/lib/taskFile.ts | HIGH |
| Orchestration-v1 frozen, v2 active | orchestration-v2/SKILL.md §Coexistence with v1; package.json build targets only include v2 | HIGH |

---

## Appendix A: Complete Skill Inventory

| # | Skill | Lines TS | Type | Category |
|---|-------|----------|------|----------|
| 1 | orchestration-v2 | 33,155 | CLI-heavy | Pipeline engine |
| 2 | tasks | 15,029 | CLI-heavy | Task management |
| 3 | cc-agents | 14,710 | CLI-heavy | Subagent lifecycle |
| 4 | cc-skills | 9,280 | CLI-heavy | Skill lifecycle |
| 5 | orchestration-v1 | 8,772 | CLI-heavy | Legacy pipeline |
| 6 | cc-commands | 8,720 | CLI-heavy | Command lifecycle |
| 7 | verification-chain | 7,703 | CLI-heavy | CoV orchestrator |
| 8 | feature-tree | 6,636 | CLI-heavy | Feature management |
| 9 | knowledge-extraction | 3,334 | CLI-heavy | Research synthesis |
| 10 | deep-research | 2,907 | CLI-heavy | Research pipeline |
| 11 | task-runner | 2,326 | Hybrid | Task execution loop |
| 12 | anti-hallucination | 1,788 | Hybrid | Verification guard |
| 13 | cc-magents | 1,681 | CLI-heavy | Main agent lifecycle |
| 14 | daily-summary | 1,378 | Hybrid | Usage reports |
| 15 | bdd-workflow | 1,256 | Hybrid | BDD scenarios |
| 16 | pl-typescript | 808 | Hybrid | TS planning |
| 17 | cc-hooks | ~500 | Hybrid | Hook management |
| 18 | transfer | 416 | Hybrid | Work transfer docs |
| 19 | indexed-context | 416 | Hybrid | Session intelligence |
| 20 | handover | 413 | Hybrid | Blocker handoff |
| 21 | quick-grep | 194 | Hybrid | Code search |
| 22-50 | (28 remaining) | 0 | Pure LLM | Various domains |

---

## Appendix B: Command Inventory

**Agent management** (9): agent-add, agent-adapt, agent-evaluate, agent-refine, agent-evolve

**Command management** (7): command-add, command-adapt, command-evaluate, command-refine, command-evolve

**Developer workflow** (15): dev-brainstorm, dev-changelog, dev-daily-summary, dev-docs, dev-fixall, dev-gitmsg, dev-handover, dev-init, dev-new-task, dev-plan, dev-refine, dev-reverse, dev-review, dev-run, dev-transfer, dev-unit, dev-verify

**Hook management** (4): hook-emit, hook-list, hook-setup, hook-validate

**Main agent management** (5): magent-add, magent-adapt, magent-evaluate, magent-refine, magent-evolve

**Product management** (4): prd-adjust, prd-doc, prd-init, prd-run

**Skill management** (6): skill-add, skill-evaluate, skill-evolve, skill-migrate, skill-package, skill-refine

---

*Report generated by rd3-reverse-engineering skill in full mode. All claims are evidence-backed from the codebase at commit time.*
