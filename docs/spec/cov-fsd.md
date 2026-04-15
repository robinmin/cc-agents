# verification-chain (cov) — Functional Specification

## 1. Overview

`verification-chain` (cov) implements a Chain-of-Verification (CoV) protocol — a Maker-Checker pattern for orchestrating multi-step verification workflows with durable state persistence and human-in-the-loop pause/resume.

**Design principles:**
- Thin CLI over durable state — stateless orchestration, state persisted between runs
- Human gates for approval chains — chains can pause and wait for human input
- Parallel group convergence — multiple makers run concurrently with configurable pass criteria
- Global retry — re-run failed nodes while preserving successful intermediate results

---

## 2. Technology Stack

| Component | Choice | Rationale |
|:---|:---|:---|
| Runtime | Bun | Project standard |
| Database | `bun:sqlite` (WAL mode) | Zero-config, embedded, no daemon |
| State Persistence | SQLite + JSON snapshot | Authoritative in SQLite; JSON for compat/inspection |
| CLI Parsing | Custom argv parser | Simple, no external deps |
| Logging | `@logtape/logtape` | Structured logging via shared logger |

---

## 3. Core Types

### 3.1 Chain Manifest

```typescript
interface ChainManifest {
  chain_id: string;           // unique chain identifier
  chain_name: string;         // human-readable name
  task_wbs: string;          // task work breakdown structure ID
  global_retry?: {            // optional global retry policy
    remaining: number;
    total: number;
  };
  on_node_fail?: 'halt' | 'skip' | 'continue';  // default 'halt'
  global_timeout?: number;    // seconds, default unlimited
  nodes: ChainNode[];
}
```

### 3.2 Node Types

```typescript
// Single node
interface SingleNode {
  name: string;
  type: 'single';
  maker: Maker;
  checker: Checker;
}

// Parallel group child (maker-only)
interface ParallelChildNode {
  name: string;
  maker: Maker;
}

// Parallel group node
interface ParallelGroupNode {
  name: string;
  type: 'parallel-group';
  convergence: 'all' | 'any' | 'quorum' | 'best-effort';
  quorum_count?: number;     // required if convergence is 'quorum'
  children: ParallelChildNode[];
  checker: Checker;          // runs after convergence
}

type ChainNode = SingleNode | ParallelGroupNode;
```

### 3.3 Maker

```typescript
interface Maker {
  delegate_to?: string;      // skill name to delegate to
  task_ref?: string;       // path to task file
  args?: Record<string, unknown>;
  execution_channel?: string;
  cwd?: string;
  command?: string;         // raw shell command
  timeout?: number;          // seconds, default 3600
}
```

At least one of `delegate_to`, `task_ref`, or `command` must be set.

### 3.4 Checker

```typescript
type CheckerMethod = 'cli' | 'llm' | 'human' | 'file-exists' | 'content-match' | 'compound';

interface Checker {
  method: CheckerMethod;
  config: CheckerConfig;
  retry?: number;           // node-level retries, default 0
  on_fail?: OnFailPolicy;   // default 'halt'
}
```

### 3.5 Checker Configs

```typescript
// CLI checker
interface CliCheckerConfig {
  command: string;
  exit_codes?: number[];   // default [0]
  timeout?: number;        // seconds
}

// LLM judge checker
interface LlmCheckerConfig {
  checklist: string[];      // all items must PASS for overall pass
  prompt_template?: string; // optional custom prompt
}

// Human gate checker
interface HumanCheckerConfig {
  prompt: string;
  choices?: string[];       // default ["approve", "reject", "request_changes"]
}

// File existence checker
interface FileExistsCheckerConfig {
  paths: string[];         // all must exist for pass
}

// Content match checker
interface ContentMatchCheckerConfig {
  file: string;             // file path (relative to chain cwd)
  pattern: string;          // regex pattern
  must_exist: boolean;     // true=pattern found, false=pattern absent
}

// Compound checker
interface CompoundCheckerConfig {
  operator: 'and' | 'or' | 'quorum';
  quorum_count?: number;    // required for 'quorum'
  checks: Checker[];        // sub-checks run concurrently
}
```

---

## 4. State Machine

### 4.1 Chain Status

| Status | Meaning |
|:---|:---|
| `running` | Chain is actively executing |
| `paused` | Chain is waiting for human input |
| `completed` | All nodes passed successfully |
| `failed` | A node failed with halt policy |
| `halted` | Chain was stopped via on_fail policy |

### 4.2 Node Status

| Status | Meaning |
|:---|:---|
| `pending` | Node not yet started |
| `running` | Node currently executing |
| `completed` | Node passed all checks |
| `failed` | Node checker failed with halt |
| `skipped` | Node failed with skip policy |

### 4.3 Checker Result

| Result | Meaning |
|:---|:---|
| `pass` | Checker succeeded, node continues |
| `fail` | Checker failed, apply on_fail policy |
| `paused` | Waiting for human input |

### 4.4 Convergence Modes (Parallel Groups)

| Mode | Pass When |
|:---|:---|
| `all` | All child makers pass |
| `any` | At least one passes |
| `quorum` | `quorum_count` or ceil(N/2) pass |
| `best-effort` | More than zero pass |

### 4.5 On-Failure Policies

| Policy | Behavior |
|:---|:---|
| `halt` (default) | Stop chain immediately, mark failed |
| `skip` | Mark node skipped, continue to next |
| `continue` | Mark node failed, continue to next |

---

## 5. CLI Commands

### 5.1 `cov run <manifest.json>`

Execute a chain from a manifest file.

```bash
cov run chain.json
```

**Output:** `{ ok: true, state: ChainState }` or `{ ok: false, error: string, state?: ChainState }`

### 5.2 `cov resume <chain-id> [--task <task_wbs>] [--response <choice>]`

Resume a paused chain. If `--response` is provided, continues immediately with that human response.

```bash
cov resume build-verify --task TASK-001 --response approve
```

### 5.3 `cov show <chain-id> [--task <task_wbs>]`

Display the current state of a chain. Alias: `inspect`.

```bash
cov show build-verify --task TASK-001
```

### 5.4 `cov list [--task <task_wbs>]`

List chains, optionally filtered by task_wbs. Alias: `results`.

```bash
cov list
cov list --task TASK-001
```

### 5.5 Global Options

All commands accept environment variables for configuration:

| Variable | Purpose | Default |
|:---|:---|:---|
| `COV_STATE_DIR` | Base runtime directory | `docs/.workflow-runs` |
| `COV_STORE_PATH` | SQLite path | `cov/cov-store.db` |
| `COV_STORE_TABLE` | Table namespace | `chain_state` |

---

## 6. Interpreter API

### 6.1 `runChain(options)`

Execute a chain from a manifest.

```typescript
import { runChain } from './interpreter';

const state = await runChain({
  manifest,
  stateDir: './project',
  cwd: process.cwd(),
  onNodeStart: (node) => logger.log(`Starting: ${node.name}`),
  onNodeComplete: (node, nodeState) => logger.log(`Finished: ${node.name} → ${nodeState.status}`),
  onChainPause: (state) => logger.log(`Paused at: ${state.paused_node}`),
  onChainComplete: (state) => logger.success(`Chain done: ${state.status}`),
  onChainFail: (state, reason) => logger.error(`Failed: ${reason}`),
  delegateRunner: async (req) => { /* ... */ },
});
```

### 6.2 `resumeChain(options)`

Resume a paused chain with optional human response.

```typescript
import { resumeChain } from './interpreter';

const state = await resumeChain({
  manifest,
  stateDir: './project',
  humanResponse: 'approve',  // 'approve' | 'reject' | 'request_changes'
});
```

---

## 7. Method Results

### 7.1 Return Type

```typescript
interface MethodResult {
  result: 'pass' | 'fail' | 'paused';
  evidence: CheckerEvidence;
  error?: string;
}
```

### 7.2 CheckerEvidence

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

---

## 8. State Persistence

### 8.1 Persistence Strategy

1. **Primary:** SQLite via `store.ts` — normalized records for chains, nodes, evidence, checkpoints
2. **Compatibility:** JSON snapshot at `<stateDir>/cov/<chain_id>-<task_wbs>-cov-state.json`

### 8.2 Store Functions

| Function | Purpose |
|:---|:---|
| `openStore(stateDir)` | Open SQLite connection |
| `saveChain(stateDir, state, manifest?)` | Persist chain state atomically |
| `loadChain(stateDir, chainId, taskWbs)` | Load chain from SQLite |
| `loadChainById(stateDir, chainId)` | Load most recent chain by ID |
| `loadCheckpoint(stateDir, chainId, taskWbs)` | Load pause checkpoint |
| `listChains(stateDir, taskWbs?)` | List chains, optionally filtered |

---

## 9. Workflows

### 9.1 Run → Verify → Resume

1. **Define manifest** — create a `ChainManifest` with nodes, checkers, and failure policies
2. **Run chain** — call `runChain()` which executes nodes sequentially
3. **Handle pause** — if a human gate is hit, chain pauses and persists state
4. **Resume chain** — call `resumeChain()` with human's response to continue
5. **Check result** — final state contains `status` and per-node evidence

### 9.2 Parallel Group Flow

1. All child makers run concurrently
2. Wait for convergence based on mode (`all`, `any`, `quorum`, `best-effort`)
3. Run the group's checker against converged results
4. Apply `on_fail` policy if checker fails

### 9.3 Global Retry Flow

1. Node fails with checker error
2. If `global_retry.remaining > 0`:
   a. Decrement `remaining`
   b. Reset failed/skipped nodes to pending
   c. Preserve completed makers' output
   d. Re-run only failed nodes
3. If `global_retry.remaining === 0`, mark chain failed

---

## 10. Exit Codes

| Code | Meaning |
|:---|:---|
| 0 | Success (chain completed or output JSON) |
| 1 | Validation error, chain failed, or not found |

---

## 11. Dependencies

| Package | Purpose |
|:---|:---|
| `bun:sqlite` | Embedded SQLite database |
| `@logtape/logtape` | Structured logging |
| `../../../scripts/logger` | Shared project logger |

No runtime external dependencies beyond Bun.
