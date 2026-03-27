# Verification Chain Workflow

This workflow runs a Chain-of-Verification (CoV) protocol to verify generated artifacts before promoting them.

## Chain Manifest

The chain is defined in `chain.json` at the project root:

```json
{
  "chain_id": "artifact-verify",
  "chain_name": "Verify Generated Artifacts",
  "task_wbs": "TASK-001",
  "on_node_fail": "halt",
  "nodes": [
    {
      "name": "generate",
      "type": "single",
      "maker": { "command": "npm run generate" },
      "checker": {
        "method": "file-exists",
        "config": { "paths": ["dist/app.js", "dist/styles.css"] }
      }
    },
    {
      "name": "test",
      "type": "single",
      "maker": { "command": "npm test" },
      "checker": {
        "method": "cli",
        "config": { "command": "npm test -- --ci", "exit_codes": [0] }
      }
    },
    {
      "name": "human-review",
      "type": "single",
      "maker": { "command": "echo 'Artifacts ready for review'" },
      "checker": {
        "method": "human",
        "config": {
          "prompt": "Review the generated artifacts in dist/. Do they look correct?",
          "choices": ["approve", "reject", "request_changes"]
        }
      }
    }
  ]
}
```

## Running the Chain

### From TypeScript

```typescript
import { readFileSync } from 'node:fs';
import { runChain, resumeChain } from './interpreter';

const manifest = JSON.parse(readFileSync('chain.json', 'utf-8'));

// Run the chain
const state = await runChain({
  manifest,
  stateDir: process.cwd(),
  onNodeStart: (node) => console.log(`Starting: ${node.name}`),
  onNodeComplete: (node, result) => console.log(`Finished: ${node.name} → ${result.status}`),
  onChainPause: (state) => console.log(`Paused at: ${state.paused_node}`),
  onChainComplete: (state) => console.log(`Chain done: ${state.status}`),
  onChainFail: (state, reason) => console.error(`Failed: ${reason}`),
});

// Handle human response if chain paused
if (state.status === 'paused') {
  const response = await getHumanInput();
  const resumed = await resumeChain({ manifest, stateDir: process.cwd(), humanResponse: response });
}
```

### From CLI (future)

```bash
# Run a verification chain
bun ${SKILL_PATH}/scripts/run-chain.ts chain.json

# Resume a paused chain with human response
bun ${SKILL_PATH}/scripts/resume-chain.ts chain.json --response approve
```

## Workflow Patterns

### Pattern 1: Automated Verification Only

No human gates — fully automated pass/fail:

```json
{
  "chain_id": "auto-verify",
  "nodes": [
    { "maker": { "command": "npm run build" }, "checker": { "method": "file-exists", "config": { "paths": ["dist/app.js"] } } },
    { "maker": { "command": "npm test" }, "checker": { "method": "cli", "config": { "command": "test $? -eq 0", "exit_codes": [0] } } }
  ]
}
```

### Pattern 2: Human Gate at Key Stage

Pause before production deployment:

```json
{
  "chain_id": "deploy-verify",
  "nodes": [
    { "maker": { "command": "npm run build && npm test" }, "checker": { "method": "llm", "config": { "checklist": ["No TODO comments", "No hardcoded URLs"] } } },
    { "maker": { "command": "echo 'Ready for deployment'" }, "checker": { "method": "human", "config": { "prompt": "Approve deployment to production?", "choices": ["approve", "reject"] } } }
  ]
}
```

### Pattern 3: Parallel Verification with Quorum

Run multiple checkers simultaneously, pass if ≥N pass:

```json
{
  "chain_id": "multi-check",
  "nodes": [
    {
      "name": "run-checks",
      "type": "parallel-group",
      "convergence": "quorum",
      "quorum_count": 2,
      "children": [
        { "name": "lint", "maker": { "command": "npm run lint" } },
        { "name": "typecheck", "maker": { "command": "npm run typecheck" } },
        { "name": "test", "maker": { "command": "npm test" } }
      ],
      "checker": { "method": "cli", "config": { "command": "echo 'All checks passed'", "exit_codes": [0] } }
    }
  ]
}
```

## State Persistence

Chain state is saved to `cov/<chain_id>-<task_wbs>-cov-state.json` after every node transition. If the process is interrupted (e.g., crash, SIGINT), the chain can be resumed from where it left off by calling `resumeChain` with the same manifest.

## Retry Policy

```json
{
  "chain_id": "flaky-test",
  "global_retry": { "remaining": 2, "total": 2 },
  "nodes": [
    { "maker": { "command": "npm test" }, "checker": { "method": "cli", "config": { "command": "test $? -eq 0" }, "retry": 1 } }
  ]
}
```

Global retry re-runs only nodes whose maker did NOT complete successfully. Completed nodes are preserved.
