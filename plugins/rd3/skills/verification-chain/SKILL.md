---
name: verification-chain
description: Orchestrate Chain-of-Verification (CoV) protocols with Maker-Checker node patterns, parallel groups, convergence modes, and human-in-the-loop pause/resume. Use for implementing verification workflows, automated checking pipelines, or human-gate approval chains.
license: Apache-2.0
metadata:
  author: cc-agents
  version: "1.1.0"
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity,pi"
  interactions:
    - generator
    - reviewer
    - pipeline
  severity_levels:
    - error
    - warning
    - info
  pipeline_steps:
    - scaffold
    - validate
    - evaluate
    - refine
---

# verification-chain: Chain-of-Verification Orchestrator

Orchestrate Chain-of-Verification (CoV) protocols — a Maker-Checker pattern where each chain node runs a maker action then verifies its output with one or more automated or human checkers.

## When to Use

- Implementing multi-step verification workflows (build → test → review → deploy)
- Adding automated quality gates to CI/CD or orchestration pipelines
- Creating Maker-Checker approval chains with human-in-the-loop gates
- Verifying code quality, security, or compliance via LLM-judged checklists
- Running parallel verification groups with convergence policies (all/any/quorum)
- Resuming interrupted verification chains from persisted state

## Quick Start

```typescript
import { runChain } from './interpreter';
import type { ChainManifest } from './types';

const manifest: ChainManifest = {
  chain_id: "build-verify",
  chain_name: "Build and Verify",
  task_wbs: "TASK-001",
  nodes: [{
    name: "check-build",
    type: "single",
    maker: { command: "bun run build" },
    checker: { method: "cli", config: { command: "test -d dist", exit_codes: [0] } },
  }],
};

const state = await runChain({ manifest, stateDir: "./project" });
// state.status → 'completed' | 'failed' | 'paused'
```

## Overview

A **chain** is a directed sequence of **nodes**. Each node has a **maker** (produces output) and a **checker** (verifies output). Chains support:

- **Single nodes**: sequential maker → checker flow
- **Parallel groups**: multiple makers run concurrently, then a single checker verifies convergence
- **Human gates**: pause chain and wait for human approval/rejection/request_changes
- **Global retry**: re-run failed nodes while preserving successful intermediate results
- **State persistence**: resume interrupted chains from `<stateDir>/cov/<chain_id>-<task_wbs>-cov-state.json`

## Chain Manifest Schema

```typescript
interface ChainManifest {
  chain_id: string;           // unique chain identifier
  chain_name: string;         // human-readable name
  task_wbs: string;           // task work breakdown structure ID
  global_retry?: {            // optional global retry policy
    remaining: number;
    total: number;
  };
  on_node_fail?: 'halt' | 'skip' | 'continue';  // default 'halt'
  global_timeout?: number;    // seconds, default unlimited
  nodes: ChainNode[];
}
```

## Node Types

### Single Node

```typescript
interface SingleNode {
  name: string;
  type: 'single';
  maker: Maker;
  checker: Checker;
}
```

Runs maker, then checker. On checker `fail`, applies `on_fail` policy.

### Parallel Group Node

```typescript
interface ParallelGroupNode {
  name: string;
  type: 'parallel-group';
  convergence: 'all' | 'any' | 'quorum' | 'best-effort';
  quorum_count?: number;     // required if convergence is 'quorum'
  children: ParallelChildNode[];
  checker: Checker;          // runs after convergence
}
```

Runs all child makers concurrently. Waits for convergence before running checker.

## Maker Definition

```typescript
interface Maker {
  delegate_to?: string;      // skill name to delegate to
  task_ref?: string;         // path to task file
  args?: Record<string, unknown>;
  execution_channel?: string;
  cwd?: string;
  command?: string;           // raw shell command
  timeout?: number;           // seconds, default 3600
}
```

At least one of `delegate_to`, `task_ref`, or `command` must be set.

## Checker Methods

| Method | Config Type | Use Case |
|--------|-------------|----------|
| `cli` | `CliCheckerConfig` | Run a command, pass if exit code matches |
| `file-exists` | `FileExistsCheckerConfig` | Verify file paths exist |
| `content-match` | `ContentMatchCheckerConfig` | Verify/hunt content in a file (regex) |
| `llm` | `LlmCheckerConfig` | LLM judges checklist items pass/fail |
| `human` | `HumanCheckerConfig` | Pause and wait for human approval |
| `compound` | `CompoundCheckerConfig` | AND/OR/quorum of sub-checks |

### CliCheckerConfig

```typescript
interface CliCheckerConfig {
  command: string;
  exit_codes?: number[];   // default [0]
  timeout?: number;        // seconds
}
```

### FileExistsCheckerConfig

```typescript
interface FileExistsCheckerConfig {
  paths: string[];         // all must exist for pass
}
```

### ContentMatchCheckerConfig

```typescript
interface ContentMatchCheckerConfig {
  file: string;             // file path (relative to chain cwd)
  pattern: string;          // regex pattern
  must_exist: boolean;     // true=pattern found, false=pattern absent
}
```

### LlmCheckerConfig

```typescript
interface LlmCheckerConfig {
  checklist: string[];      // all items must PASS for overall pass
  prompt_template?: string; // optional custom prompt (default provided)
}
```

Reads `LLM_CLI_COMMAND` env var — auto-detects `pi` binary path if not set.

### HumanCheckerConfig

```typescript
interface HumanCheckerConfig {
  prompt: string;
  choices?: string[];       // default ["approve", "reject", "request_changes"]
}
```

Always returns `paused`. Stores human's response in `evidence.human_response`.

### CompoundCheckerConfig

```typescript
interface CompoundCheckerConfig {
  operator: 'and' | 'or' | 'quorum';
  quorum_count?: number;    // required for 'quorum'
  checks: Checker[];        // sub-checks run concurrently
}
```

- `and`: all must pass
- `or`: at least one must pass
- `quorum`: `quorum_count` or ceil(N/2) must pass

## Convergence Modes (Parallel Groups)

| Mode | Pass When |
|------|-----------|
| `all` | All child makers pass |
| `any` | At least one passes |
| `quorum` | `quorum_count` or ceil(N/2) pass |
| `best-effort` | More than zero pass |

## On-Failure Policies

Applies when a checker returns `fail`:

| Policy | Behavior |
|--------|----------|
| `halt` (default) | Stop chain immediately, mark failed |
| `skip` | Mark node skipped, continue to next |
| `continue` | Mark node failed, continue to next |

## Checker Definition

```typescript
interface Checker {
  method: CheckerMethod;
  config: CheckerConfig;
  retry?: number;           // node-level retries, default 0
  on_fail?: OnFailPolicy;   // default 'halt'
}
```

## Method Result Types

```typescript
type MethodResult = {
  result: 'pass' | 'fail' | 'paused';
  evidence: CheckerEvidence;
  error?: string;           // required when result is 'fail' or 'paused'
};
```

## Usage

### CLI-first Contract

```bash
bun run scripts/cli.ts run <manifest.json>
bun run scripts/cli.ts resume <chain-id> [--task <task_wbs>] [--response approve|reject]
bun run scripts/cli.ts show <chain-id> [--task <task_wbs>]
bun run scripts/cli.ts inspect <chain-id> [--task <task_wbs>]   # alias of show
bun run scripts/cli.ts list [--task <task_wbs>]
bun run scripts/cli.ts results [--task <task_wbs>]              # alias of list
bun run scripts/cli.ts help [command]                            # show help
bun run scripts/cli.ts <command> --help                         # command-specific help
```

All CLI commands return a single JSON payload on stdout for machine consumption.
Use environment variables to control the runtime namespace:

- `COV_STATE_DIR` — base runtime directory for compatibility JSON snapshots
- `COV_STORE_PATH` — SQLite database path, absolute or relative to `COV_STATE_DIR`
- `COV_STORE_TABLE` — SQLite table namespace; creates `<base>`, `<base>_nodes`, `<base>_evidence`, and `<base>_checkpoints`

```typescript
import { runChain, resumeChain } from './interpreter';
import type { ChainManifest } from './types';

// Load manifest from JSON
const manifest: ChainManifest = JSON.parse(readFileSync('chain.json', 'utf-8'));

// Run the chain
const finalState = await runChain({
  manifest,
  stateDir: '/path/to/project',
  onNodeStart: (node) => logger.log(`Starting: ${node.name}`),
  onNodeComplete: (node, state) => logger.log(`Finished: ${node.name} → ${state.status}`),
  onChainPause: (state) => logger.log(`Paused at: ${state.paused_node}`),
  onChainComplete: (state) => logger.success(`Chain done: ${state.status}`),
  onChainFail: (state, reason) => logger.error(`Failed: ${reason}`),
});

// Resume a paused chain with human response
const resumedState = await resumeChain({
  manifest,
  stateDir: '/path/to/project',
  humanResponse: 'approve',  // human's choice
});
```

## State Persistence

The authoritative runtime state is stored in SQLite. Each save updates:

- chain header/state rows
- node execution rows
- checker evidence rows
- pause/resume checkpoint rows

Compatibility JSON snapshots are still written to `<stateDir>/cov/<chain_id>-<task_wbs>-cov-state.json` so existing tooling can inspect state directly and older callers can recover from transitional runs.

## CheckerEvidence Fields

```typescript
interface CheckerEvidence {
  method: CheckerMethod;
  result: 'pass' | 'fail' | 'paused';
  timestamp: string;
  cli_output?: string;
  cli_exit_code?: number;
  llm_results?: Array<{ item: string; passed: boolean; reason?: string }>;
  human_response?: string;
  file_paths_found?: string[];
  content_match_found?: boolean;
  compound_results?: Array<{ sub_check: string; result: 'pass' | 'fail' | 'paused' }>;
  error?: string;
}
```

## Workflows

### Run → Verify → Resume

1. **Define manifest** — create a `ChainManifest` with nodes, checkers, and failure policies
2. **Run chain** — call `runChain()` which executes nodes sequentially, running maker then checker for each
3. **Handle pause** — if a human gate is hit, the chain pauses and persists state to disk
4. **Resume chain** — call `resumeChain()` with the human's response to continue from the paused node
5. **Check result** — final state contains `status` (`completed`/`failed`/`paused`) and per-node evidence

### Parallel Group Flow

1. All child makers in a parallel group run concurrently
2. Wait for convergence based on mode (`all`, `any`, `quorum`, `best-effort`)
3. Run the group's checker against converged results
4. Apply `on_fail` policy if checker fails

## Files

| File | Purpose |
|------|---------|
| `types.ts` | All TypeScript interfaces |
| `interpreter.ts` | Chain orchestrator (runChain, resumeChain) |
| `methods/cli.ts` | CLI checker |
| `methods/file_exists.ts` | File existence checker |
| `methods/content_match.ts` | Content match checker |
| `methods/llm.ts` | LLM judge checker |
| `methods/human.ts` | Human gate checker |
| `methods/compound.ts` | Compound AND/OR/quorum checker |
| `tests/methods.test.ts` | Unit tests for all checkers |
