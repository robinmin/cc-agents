---
name: New skill development for verification-chain
description: New skill development for verification-chain
status: Todo
created_at: 2026-03-26T21:36:27.403Z
updated_at: 2026-03-26T21:56:32.783Z
folder: docs/tasks2
type: task
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0265. New skill development for verification-chain

### Background

#### What Is verification-chain

`verification-chain` (CoV) is an **orchestration infrastructure skill** — a reusable interpreter that executes a structured chain manifest. Workflow skills (bdd-workflow, task-workflow, request-intake) define their phases as a chain manifest and delegate execution to verification-chain. It is **not** a workflow itself; it is the engine that drives any workflow built on top of it.

#### Core Model

```
Chain
 └── Nodes (sequential by default)
      ├── single node
      │    ├── Maker  — does the work (any skill/agent/command)
      │    └── Checker — verifies the result
      └── parallel group
           ├── branching point
           ├── [node A, node B, ...]  — run concurrently
           └── convergence point
```

**Key constraints:**
- Parallel groups have exactly one branching point and one convergence point
- Convergence produces only a pass/fail aggregate (not individual outputs)
- Nodes are sequential unless grouped in a parallel group

#### Node Anatomy

```yaml
node:
  name: "implement-auth-api"
  type: single                        # single | parallel-group
  maker:
    delegate_to: rd3:code-implement-common
    task_ref: "0265_task_file.md"
    timeout: 3600
  checker:
    method: llm                       # cli | llm | human | file-exists | content-match | compound
    config: {}                         # method-specific
    retry: 2                           # node-level retries
    on_fail: halt                      # halt | skip | continue
  children: []                         # only for parallel-group type
```

#### Checker Verification Methods

| Method | Success Condition | Evidence |
|--------|-----------------|----------|
| `cli` | Exit code 0 | stdout/stderr to state file |
| `llm` | All checklist items pass | Checklist results to state file |
| `human` | Manual approval (no timeout) | Approval text to state file |
| `file-exists` | All paths exist | Path list to state file |
| `content-match` | Pattern found/not found in file | Match evidence to state file |
| `compound` | AND/OR/quorum of sub-checks | Aggregated result |

#### Parallel Group Convergence Modes

| Mode | Behavior |
|------|----------|
| `all` | All nodes must pass |
| `any` | First to pass wins (short-circuit) |
| `quorum(N)` | At least N nodes pass |
| `best-effort` | Run all, aggregate even if some fail |

#### Retry Policy

- **Node-level retry**: `retry: N` — re-execute the failed node up to N times
- **Global retry**: `global_retry: {remaining, total}` — restart from the failed node, skip already-succeeded nodes
- Already-succeeded nodes in a parallel group are skipped on retry

#### On-Failure Policies

| Policy | Behavior |
|--------|----------|
| `halt` | Stop the chain immediately |
| `skip` | Skip remaining nodes in this branch, continue to next |
| `continue` | Log failure, proceed anyway |

#### Human-in-the-Loop

- No timeout — chain **pauses** at a human checker node
- Proceed signal: explicit user trigger (e.g., `/cov proceed <task_wbs>`)
- Human response captured as evidence in the state file

#### State Persistence

```
docs/.workflows/
├── cov/
│   └── <wbs>-cov-state.json          # Chain execution state per task
└── *.workflow.yaml                    # Workflow definitions (request-intake, bdd, etc.)
```

**Chain state file schema:**
```json
{
  "chain_id": "cov-0265",
  "task_wbs": "0265",
  "chain_name": "verification-chain",
  "status": "running",
  "current_node": "checker",
  "global_retry": { "remaining": 2, "total": 3 },
  "nodes": [
    {
      "name": "Q&A",
      "type": "single",
      "status": "completed",
      "maker": { "status": "completed" },
      "checker": { "status": "completed", "method": "human", "result": "pass" },
      "started_at": "2026-03-26T10:00:00Z",
      "completed_at": "2026-03-26T10:15:00Z",
      "evidence": {}
    }
  ],
  "created_at": "2026-03-26T10:00:00Z",
  "updated_at": "2026-03-26T10:15:01Z"
}
```

#### Skill Architecture

```
verification-chain/
├── SKILL.md                           ← Protocol definition + operation API
├── interpreter.ts                      ← Reads manifest, executes nodes, manages state
├── types.ts                           ← Node, Chain, Method, State interfaces
└── methods/                           ← Pre-built verification method implementations
    ├── cli.ts
    ├── llm.ts
    ├── human.ts
    ├── file_exists.ts
    ├── content_match.ts
    └── compound.ts
```

#### Relationship to Downstream Workflow Skills

| Workflow Skill | Chain Manifest It Produces | Delegation |
|---------------|---------------------------|------------|
| `request-intake` | 2-node: Q&A → task-file generation | → verification-chain |
| `bdd-workflow` | 3-node: generate → execute → report | → verification-chain |
| `functional-review` | N-node: per-acceptance-criterion checks | → verification-chain |
| `task-workflow` | 9-phase (profile-dependent) | → verification-chain |

All four workflow skills are **thin wrappers** — they define a chain manifest and delegate execution. The verification-chain interpreter is the thick runtime.


### Requirements

1. Define the verification-chain skill scope, interfaces, and types precisely. 2. Design the chain manifest format (YAML/JSON schema for nodes, parallel groups, convergence modes). 3. Define pre-built verification methods (cli, llm-checklist, human, file-exists, content-match, compound). 4. Specify the interpreter: how it reads a chain manifest and executes nodes with proper error handling, retry, and skip logic. 5. Design how verification evidence is persisted (CLI output to task file). 6. Specify the relationship between verification-chain and downstream workflow skills (bdd-workflow, task-workflow, request-intake). 7. Produce a SKILL.md draft with operation definitions.


### Q&A



### Design



### Solution



### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


