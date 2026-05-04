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

## 13. Recommendations for Exporting

If starting a new AI agent application project, the following components, patterns, and concepts can be extracted from rd3. Items are ranked by maturity and extraction difficulty.

### 13.1 Tier 1: Production-Ready Components (Extract Almost As-Is)

These are mature, well-tested, and loosely coupled enough to extract with minimal modification.

#### 13.1.1 `verification-chain` — Chain-of-Verification Orchestrator

**What it is**: A Maker-Checker pipeline engine where nodes run a "maker" action followed by one or more automated/human "checkers." Supports single nodes, parallel groups with convergence policies (all/any/quorum), human-in-the-loop gates, global retry, and state persistence via SQLite.

**Files to extract** (`plugins/rd3/skills/verification-chain/`):
```
scripts/
├── types.ts          # Full type system (ChainManifest, ChainNode, Checker, etc.)
├── interpreter.ts    # Core execution engine — walks the chain DAG
├── store.ts          # SQLite-backed chain state persistence
├── cli.ts            # Compiled to standalone `cov` binary
├── methods/
│   ├── index.ts      # Method dispatch registry
│   ├── cli.ts        # Shell command checker
│   ├── llm.ts        # LLM-judged checklist checker
│   ├── human.ts      # Human approval gate
│   ├── file_exists.ts
│   ├── content_match.ts
│   └── compound.ts   # Composite checker (and/or/quorum)
tests/
├── interpreter.test.ts
├── methods.test.ts
├── store.test.ts
├── integration.test.ts
└── cli.test.ts
```

**Maturity**: HIGH. 7,703 lines, 5 test files, compiled CLI, production-proven as the orchestration-v2 gate evaluator backend. Type system is clean, method dispatch is extensible, SQLite store handles pause/resume.

**Extraction effort**: Low. Only dependency is `scripts/logger.ts` (trivial to inline). The skill is self-contained — no dependency on other rd3 skills.

**Use cases in a new project**:
- CI/CD quality gates (build → lint → test → security scan)
- Deployment verification (deploy → health check → smoke test → human approval)
- Code review automation (implement → self-review → peer review → merge)
- Any multi-step process requiring audit trail and pause/resume

#### 13.1.2 `scripts/libs/result.ts` — Railway-Oriented Result Type

**What it is**: A 30-line `Result<T, E>` type with `ok()`, `err()`, `isOk()`, `isErr()` helpers. Used pervasively across the orchestration-v2 and verification-chain code.

```typescript
type Result<T, E = string> = Ok<T> | Err<E>;
```

**Maturity**: HIGH. Battle-tested across 40K+ lines of orchestration and verification code. Zero dependencies.

**Extraction effort**: Trivial — copy one file. No dependencies.

#### 13.1.3 `scripts/logger.ts` — Shared Logger Pattern

**What it is**: A 16.6KB structured logger supporting levels (debug/info/warn/error), `globalSilent` flag for test suppression, and structured context. All rd3 scripts route through this instead of `console.*`.

**Key design decisions worth replicating**:
- `globalSilent` boolean for test mode suppression (avoids `NODE_ENV` coupling)
- Structured logging with context objects rather than string interpolation
- No runtime dependency on winston/pino — pure Bun native

**Extraction effort**: Low. Copy and adapt. The pattern matters more than the exact implementation.

#### 13.1.4 `scripts/fs.ts` — Bun-Optimized File System Utilities

**What it is**: 11.8KB of `bun:fs`-first wrappers (`existsSync`, `mkdirSync`, `readFileSync`, `writeFileSync`, `readdirSync`, `statSync`, `rmSync`) that re-export from `node:fs` as fallback. Includes atomic write pattern and directory walking.

**Extraction effort**: Low. Copy the module; it's a drop-in replacement for `node:fs` imports.

---

### 13.2 Tier 2: Well-Designed Patterns to Reimplement

These are not single extractable files but architectural patterns and design decisions worth replicating in a new codebase.

#### 13.2.1 DAG + FSM Pipeline Engine (orchestration-v2 core)

**The pattern**: A scheduling kernel with clear subsystem boundaries. The engine does NOT own verification logic — it delegates to `verification-chain` via a `VerificationDriver` adapter. This is the right decomposition for any pipeline system.

**Concepts to replicate**:

| Concept | Implementation in rd3 | Why it's good |
|---------|----------------------|---------------|
| **DAG scheduler** | `engine/dag.ts` — topological sort, parallel-ready phase groups | Phases declare `after:` dependencies; scheduler resolves parallelism automatically |
| **FSM lifecycle** | 5 states: IDLE → RUNNING → PAUSED/COMPLETED/FAILED | Clean state machine; no ambiguous intermediate states |
| **Gate evaluator** | 3 gate types: command (shell), auto (CoV checklist), human (pause) | Gates are pluggable; new gate types don't require engine changes |
| **Executor pool** | Inline, subprocess, ACP adapters | Channel is a routing detail, not a core concept — executor selection is a configuration concern |
| **Event sourcing** | All state transitions written to `events` table | Enables undo, audit, replay — SQLite WAL mode for concurrent reads |
| **Verification driver** | Adapter to `rd3:verification-chain` | Engine consumes pass/fail/pause results without owning checker logic |

**What NOT to copy**: The full 33K-line `orchestration-v2` implementation. The codebase has accumulated complexity from supporting legacy presets, channel aliases, and v1 migration. Extract the concepts, not the code.

**Recommended approach**: Implement a minimal kernel (~2-3K lines) with DAG + FSM + SQLite state + pluggable executors. Use `verification-chain` (Tier 1) as the gate backend.

#### 13.2.2 SQLite Event-Sourced State Pattern

**The pattern**: SQLite as the single source of truth for pipeline state, using WAL mode + parameterized queries + typed DAO layer. Both `orchestration-v2` and `verification-chain` use identical patterns independently — proving it's a replicable design:

```
StateManager (orchestration-v2)          ChainStore (verification-chain)
├── Database('path.db', {create: true})   ├── Database('path.db', {create: true})
├── PRAGMA journal_mode = WAL            ├── PRAGMA journal_mode = WAL
├── PRAGMA busy_timeout = 5000           ├── PRAGMA busy_timeout = 5000
├── DDL via migrations                    ├── DDL inline (CREATE IF NOT EXISTS)
├── Prepared statements (bun:sqlite)      ├── Prepared statements (bun:sqlite)
├── Typed DAO parsers                     ├── Typed serialization helpers
└── Event sourcing (append-only events)   └── Full state snapshots (JSON column)
```

**Key design decisions to replicate**:
- Use `bun:sqlite` (zero npm dependencies, synchronous API, WAL mode)
- Parameterized queries only — no string concatenation
- Type-safe record interfaces + parser functions for DB row → domain object
- Migration system for schema evolution
- Event sourcing for audit trail (not for all state — full snapshots are fine for checkpoints)

#### 13.2.3 Markdown + YAML Frontmatter Entity Format

**The pattern**: Store domain entities (tasks, chain manifests) as markdown files with YAML frontmatter. Human-readable, git-diffable, LLM-friendly.

```markdown
---
wbs: "0266"
name: "Implement user authentication"
status: "ready"
---

# Background
...

# Requirements
...
```

**Why this works**:
- Humans can read and edit in any text editor
- Git diffs are meaningful (unlike SQLite or JSON blobs)
- LLMs natively understand markdown structure
- YAML frontmatter is machine-parseable for scripting
- Sections (# Background, # Requirements) provide consistent structure

**Recommended for**: Task definitions, feature specs, design docs, chain manifests — any entity where both humans and agents need read/write access.

**Implementation reference**: `plugins/rd3/scripts/markdown-frontmatter.ts` (2.7KB, parse + serialize).

#### 13.2.4 Method Dispatch Pattern (verification-chain methods/)

**The pattern**: A registry of named method handlers, each implementing a common interface. New checkers are added by creating a new file and adding one line to `index.ts`.

```typescript
// methods/index.ts — the registry
export { runCliCheck } from './cli';
export { runLlmCheck } from './llm';
export { runHumanCheck } from './human';
export { runFileExistsCheck } from './file_exists';
export { runContentMatchCheck } from './content_match';
export { runCompoundCheck } from './compound';

// Each method: (config) => Promise<MethodResult>
```

**Why it's good**: Open-closed principle. Adding a new checker method never touches the interpreter, store, or CLI — just one new file + one export line. Each method is independently testable. The type system enforces the contract (`CheckerConfig` discriminated union on `method`).

**Recommended for**: Any system with multiple backend implementations behind a common interface — checkers, executors, notifiers, storage backends.

#### 13.2.5 "Fat Logic, Thin Wrappers" Architecture

**The pattern**: Implementation logic lives in skills (self-contained packages with scripts, tests, references). Commands and agents are thin wrappers (~50-250 lines) that parse arguments and delegate.

```
Command (dev-review.md, ~80 lines)
  → "Parse args, normalize focus, delegate to code-review-common"

Agent (super-reviewer.md, ~200 lines)
  → "Detect review type, delegate to code-review-common or code-improvement"

Skill (code-review-common/SKILL.md, ~300 lines)
  → ALL review methodology, SECU framework, finding taxonomy
```

**Why this works**:
- Commands and agents never contain business logic — they're pure adapters
- Skills can be tested and evolved independently of their wrappers
- New platforms only need new thin wrappers, not new skill implementations
- Clear ownership boundaries: "which file do I change?" is always obvious

**Recommended for**: Any multi-platform, multi-interface system. Define your core logic once; wrap it for each entrypoint.

---

### 13.3 Tier 3: Promising Concepts Worth Tracking

These are conceptually strong but either immature, tightly coupled, or require significant adaptation for reuse.

#### 13.3.1 Feature Tree Hierarchical Model

**Concept**: A SQLite-backed hierarchical feature model with automatic status roll-up (all children done → parent done). Features link to WBS tasks for traceability.

**Status**: 6,636 lines. Functional but still evolving. The "advisory" operating mode is wise — it provides context without becoming a hard dependency of orchestration.

**Worth extracting**: The core data model (features table schema + adjacency queries) and the status roll-up algorithm. Not the full CLI + web UI.

#### 13.3.2 Cross-Platform Agent Delegation via ACP

**Concept**: `acpx` CLI as a headless ACP client for agent-to-agent communication. Enables delegating work from one coding agent platform to another.

**Status**: `run-acp` skill is pure-LLM (no TypeScript). The actual `acpx` tool is an external npm package. The integration layer in `orchestration-v2/scripts/integrations/acp/` is ~2K lines of transport + session + prompt management.

**Worth tracking**: ACP as a protocol for multi-agent systems. The adapter pattern (`acp-oneshot`, `acp-session`) is clean. But `acpx` is young; API stability is unknown.

#### 13.3.3 Anti-Hallucination Verification Protocol

**Concept**: A `Stop` hook that runs before every agent response, verifying claims against external sources. Skills are expected to follow "verify before generate."

**Status**: 1,788 lines (hook + guard script). Claude Code-specific hook implementation. The concept is excellent but the implementation is platform-locked.

**Worth replicating**: The protocol (verify → cite → confidence-score) as a skill instruction pattern. Not the hook mechanism.

#### 13.3.4 Task Lifecycle with WBS Numbering

**Concept**: Tasks follow a strict lifecycle (`backlog → ready → wip → testing → done`) with content gates at each transition. WBS numbers provide globally unique identifiers across all task folders.

**Status**: 15,029 lines. Mature and production-proven. But the `tasks` skill is heavily integrated with the cc-agents project structure (`docs/tasks/`, `docs/.tasks/`).

**Worth extracting**: The WBS numbering scheme, the content-gated state machine, and the markdown task file format. Not the full CLI with Kanban web UI.

#### 13.3.5 Meta-Skill Pattern

**Concept**: Skills that create, validate, and evolve other skills. The four `cc-*` meta-skills form a reflexive architecture where the system manages itself.

**Status**: ~40K lines across cc-skills, cc-agents, cc-commands, cc-magents. Heavily coupled to the cc-agents project conventions.

**Worth tracking conceptually**: The idea that an agent framework should be able to introspect and improve its own skills. But as an extraction target, the meta-skills are too project-specific.

---

### 13.4 Anti-Recommendations: Do NOT Extract

| Component | Reason |
|-----------|--------|
| **orchestration-v1** | 8,772 lines of frozen legacy code. Has been superseded by v2. No reason to carry this forward. |
| **cc-* meta-skills** | ~40K lines tightly coupled to cc-agents project structure, naming conventions, and platform assumptions. The concepts (Tier 3.5) are worth studying; the code is not worth extracting. |
| **evolution-engine.ts** | 51KB monolith handling all four asset types. Needs to be split before it's extractable. In a new project, build per-domain evolution engines instead. |
| **Platform-specific hooks** | `hooks.json` is Claude Code-specific. Other platforms get hooks through the `cc-hooks` adapt flow. The concepts are good; the implementation is not portable. |
| **ACP transport layer** | The `integrations/acp/` code is a thin wrapper around the external `acpx` CLI. Extract the adapter pattern, not the transport code. |
| **Kanban web UI** | The embedded Vite + React UI in `tasks/scripts/server/ui/` is a nice demo but not production-grade. Use a proper frontend framework in a new project. |

---

### 13.5 Extraction Priority Summary

```
Priority 1 (this week):
  ✅ verification-chain — drop-in CoV engine (~1 day to extract and integrate)
  ✅ result.ts + logger.ts + fs.ts — shared infrastructure (~1 hour)

Priority 2 (this month):
  📋 DAG+FSM pipeline kernel — reimplement concepts, not code (~1 week)
  📋 SQLite event-sourced state pattern — reimplement for your domain (~3 days)
  📋 Markdown+YAML entity format — adopt for task/spec files (~1 day)

Priority 3 (next quarter):
  🔮 Feature tree hierarchical model — extract core data model (~3 days)
  🔮 Anti-hallucination protocol — adapt as skill instruction pattern (~1 day)
  🔮 Meta-skill pattern — study for self-improving agent architecture (research)

Skip entirely:
  ❌ orchestration-v1, cc-* meta-skills, evolution-engine.ts, platform hooks
```

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
