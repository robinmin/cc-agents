# verification-chain (cov) — User Manual

## Quick Start

```bash
cd plugins/rd3/skills/verification-chain/scripts

# Run a verification chain from manifest
bun run cli.ts run ../../references/examples.md/build-verify.json

# Show chain status
bun run cli.ts show build-verify --task TASK-001

# Resume a paused chain with human approval
bun run cli.ts resume build-verify --task TASK-001 --response approve

# List all chains
bun run cli.ts list
```

---

## CLI Commands

### `cov run <manifest.json>`

Execute a chain from a manifest file.

```bash
bun run cli.ts run my-chain.json
```

**Example manifest:**

```json
{
  "chain_id": "build-verify",
  "chain_name": "Build and Verify",
  "task_wbs": "TASK-001",
  "nodes": [
    {
      "name": "run-build",
      "type": "single",
      "maker": { "command": "npm run build" },
      "checker": {
        "method": "cli",
        "config": { "command": "test -d dist", "exit_codes": [0] }
      }
    }
  ]
}
```

---

### `cov resume <chain-id> [--task <task_wbs>] [--response <choice>]`

Resume a paused chain. Use `--response` to provide human choice without pausing again.

```bash
bun run cli.ts resume build-verify --task TASK-001 --response approve
bun run cli.ts resume build-verify --task TASK-001 --response reject
```

**Choices:** `approve`, `reject`, `request_changes` (configurable in `HumanCheckerConfig`)

---

### `cov show <chain-id> [--task <task_wbs>]`

Display the current state of a chain. Alias: `inspect`.

```bash
bun run cli.ts show build-verify --task TASK-001
```

**Output:**

```json
{
  "ok": true,
  "state": {
    "chain_id": "build-verify",
    "task_wbs": "TASK-001",
    "chain_name": "Build and Verify",
    "status": "completed",
    "current_node": "run-build",
    "nodes": [
      {
        "name": "run-build",
        "type": "single",
        "status": "completed",
        "maker_status": "completed",
        "checker_status": "completed",
        "checker_result": "pass",
        "evidence": [...]
      }
    ]
  }
}
```

---

### `cov list [--task <task_wbs>]`

List chains, optionally filtered by task_wbs. Alias: `results`.

```bash
bun run cli.ts list
bun run cli.ts list --task TASK-001
```

**Output:**

```json
{
  "ok": true,
  "chains": [
    {
      "chain_id": "build-verify",
      "chain_name": "Build and Verify",
      "task_wbs": "TASK-001",
      "status": "completed",
      "current_node": "run-build",
      "updated_at": "2024-01-15T10:30:00Z",
      "paused_node": null
    }
  ],
  "count": 1
}
```

---

## Checker Methods

### CLI Checker

Run a command and verify exit code.

```json
{
  "checker": {
    "method": "cli",
    "config": {
      "command": "npm run test",
      "exit_codes": [0],
      "timeout": 300
    }
  }
}
```

---

### File Exists Checker

Verify that files exist.

```json
{
  "checker": {
    "method": "file-exists",
    "config": {
      "paths": ["dist/app.js", "dist/styles.css"]
    }
  }
}
```

---

### Content Match Checker

Verify content in a file using regex.

```json
{
  "checker": {
    "method": "content-match",
    "config": {
      "file": "dist/app.js",
      "pattern": "function bootstrap",
      "must_exist": true
    }
  }
}
```

Set `must_exist: false` to verify absence (e.g., no `console.log` in production code).

---

### LLM Judge Checker

Use LLM to verify code quality checklist.

```json
{
  "checker": {
    "method": "llm",
    "config": {
      "checklist": [
        "Code handles error cases with try/catch",
        "No hardcoded credentials or secrets",
        "Functions have JSDoc comments"
      ]
    }
  }
}
```

Reads `LLM_CLI_COMMAND` env var — auto-detects `pi` binary path if not set.

---

### Human Gate Checker

Pause chain for human approval.

```json
{
  "checker": {
    "method": "human",
    "config": {
      "prompt": "Please review the PR. Approve, reject, or request changes.",
      "choices": ["approve", "reject", "request_changes"]
    }
  }
}
```

Always returns `paused`. Store's `paused_response` field contains human's choice.

---

### Compound Checker

Combine multiple checks with AND/OR/quorum logic.

```json
{
  "checker": {
    "method": "compound",
    "config": {
      "operator": "and",
      "checks": [
        { "method": "file-exists", "config": { "paths": ["dist/app.js"] } },
        { "method": "content-match", "config": { "file": "dist/app.js", "pattern": "bootstrap", "must_exist": true } }
      ]
    }
  }
}
```

---

## Parallel Groups

Run multiple makers concurrently, then verify convergence.

```json
{
  "chain_id": "lint-all",
  "chain_name": "Run All Linters",
  "task_wbs": "TASK-002",
  "nodes": [
    {
      "name": "run-linters",
      "type": "parallel-group",
      "convergence": "any",
      "children": [
        { "name": "eslint", "maker": { "command": "npm run lint:eslint" } },
        { "name": "prettier", "maker": { "command": "npm run lint:prettier" } },
        { "name": "tsc", "maker": { "command": "npm run lint:types" } }
      ],
      "checker": {
        "method": "cli",
        "config": { "command": "test -f reports/lint.json", "exit_codes": [0] }
      }
    }
  ]
}
```

**Convergence modes:**

| Mode | Pass When |
|:---|:---|
| `all` | All children pass |
| `any` | At least one passes |
| `quorum` | `quorum_count` or ceil(N/2) pass |
| `best-effort` | More than zero pass |

---

## Global Retry

Retry failed nodes while preserving successful results.

```json
{
  "chain_id": "flaky-test",
  "chain_name": "Flaky Test Handler",
  "task_wbs": "TASK-003",
  "global_retry": {
    "remaining": 3,
    "total": 3
  },
  "nodes": [
    {
      "name": "run-tests",
      "type": "single",
      "maker": { "command": "npm test" },
      "checker": { "method": "cli", "config": { "command": "npm test", "exit_codes": [0] } }
    }
  ]
}
```

---

## On-Failure Policies

Control what happens when a checker fails.

```json
{
  "on_node_fail": "halt",
  "nodes": [
    {
      "name": "required-check",
      "type": "single",
      "maker": { "command": "npm run lint" },
      "checker": { "method": "cli", "config": { "command": "test -f lint.json", "exit_codes": [0] } }
    },
    {
      "name": "optional-check",
      "type": "single",
      "maker": { "command": "npm run coverage" },
      "checker": { "method": "cli", "config": { "command": "test -f coverage.json", "exit_codes": [0] } },
      "on_fail": "skip"
    }
  ]
}
```

| Policy | Behavior |
|:---|:---|
| `halt` | Stop chain immediately, mark failed |
| `skip` | Mark node skipped, continue to next |
| `continue` | Mark node failed, continue to next |

---

## Environment Variables

| Variable | Purpose | Default |
|:---|:---|:---|
| `COV_STATE_DIR` | Base runtime directory | `docs/.workflow-runs` |
| `COV_STORE_PATH` | SQLite path (absolute or relative) | `cov/cov-store.db` |
| `COV_STORE_TABLE` | Table namespace | `chain_state` |

---

## State Persistence

Chain state is persisted to:

1. **SQLite:** `<COV_STATE_DIR>/cov/cov-store.db` (primary)
2. **JSON snapshot:** `<COV_STATE_DIR>/cov/<chain_id>-<task_wbs>-cov-state.json` (compatibility)

---

## Programmatic Usage

### Run a Chain

```typescript
import { runChain } from './interpreter';

const manifest = JSON.parse(readFileSync('chain.json', 'utf-8'));

const state = await runChain({
  manifest,
  stateDir: './project',
  onNodeStart: (node) => console.log(`Starting: ${node.name}`),
  onNodeComplete: (node, ns) => console.log(`Finished: ${node.name} → ${ns.status}`),
  onChainPause: (state) => console.log(`Paused at: ${state.paused_node}`),
  onChainComplete: (state) => console.log(`Chain done: ${state.status}`),
  onChainFail: (state, reason) => console.error(`Failed: ${reason}`),
});
```

### Resume a Paused Chain

```typescript
import { resumeChain } from './interpreter';

const state = await resumeChain({
  manifest,
  stateDir: './project',
  humanResponse: 'approve',  // or 'reject' or 'request_changes'
});
```

---

## Examples

See `references/examples.md` for complete example manifests including:

- Simple sequential chain
- Parallel group with quorum
- Compound AND/OR checkers
- Human gate with pause/resume
- LLM judge checker
- Content match (presence and absence)
- Global retry
- Skip on failure

---

## Exit Codes

| Code | Meaning |
|:---|:---|
| 0 | Success |
| 1 | Error (validation, not found, or chain failed) |
