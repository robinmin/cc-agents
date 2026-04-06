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

Chain state is saved to `<stateDir>/cov/<chain_id>-<task_wbs>-cov-state.json` after every node transition. Resume reads this file to continue from where the chain left off. Orchestrators can choose a project root, a per-run artifact directory, or any other runtime namespace by passing the appropriate `stateDir`.

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
