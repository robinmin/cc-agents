# Dry-Run Output Schema

Standardized JSON schema for `--dry-run` output, consumable by CI and schedulers.

## Schema Version

Current: `1`

## Schema

```typescript
interface DryRunOutput {
  schema_version: 1;
  task_ref: string;              // WBS number, e.g. "0387"
  task_file: string;             // Absolute path to task file
  preset: "simple" | "standard" | "complex" | "research";
  stage: "all" | "plan-only" | "implement-only";
  channel: string;               // Raw channel value; normalization owned by run-acp
  flags: {
    auto: boolean;
    preflight_verify: boolean;
    postflight_verify: boolean;
    coverage: number | null;     // Coverage threshold if set
    max_loop_iterations: number; // Default 3
  };
  workflow: {
    preflight: { enabled: true };
    preflight_verify: { enabled: boolean; skipped_reason?: string };
    refine: { enabled: boolean; skipped_reason?: string };
    plan: { enabled: boolean; skipped_reason?: string };
    implement_test_loop: { enabled: boolean; max_iterations: number };
    verify: { enabled: boolean };
    postflight_verify: { enabled: boolean };
  };
  status_transitions_planned: Array<{
    from: string;
    to: string;
    trigger: string;
    guards: string[];
  }>;
  delegation_plan: Array<{
    stage: "plan" | "implement" | "verify";
    channel: string;
    prompt_contract: "plan" | "implement" | "verify";
  }>;
  exit_conditions: {
    early_exit_at_stage?: "plan-only" | "implement-only";
    expected_final_status: "Todo" | "WIP" | "Testing" | "Done" | "Blocked";
  };
}
```

## Example Output

### Example 1: Standard Preset, All Stages

```json
{
  "schema_version": 1,
  "task_ref": "0387",
  "task_file": "/path/to/docs/tasks2/0387_refactor.md",
  "preset": "standard",
  "stage": "all",
  "channel": "current",
  "flags": {
    "auto": false,
    "preflight_verify": false,
    "postflight_verify": false,
    "coverage": null,
    "max_loop_iterations": 3
  },
  "workflow": {
    "preflight": { "enabled": true },
    "preflight_verify": { "enabled": false },
    "refine": { "enabled": false, "skipped_reason": "task already refined" },
    "plan": { "enabled": false, "skipped_reason": "preset=standard, no decomposition needed" },
    "implement_test_loop": { "enabled": true, "max_iterations": 3 },
    "verify": { "enabled": true },
    "postflight_verify": { "enabled": false }
  },
  "status_transitions_planned": [
    { "from": "Todo", "to": "WIP", "trigger": "stage:implement-start", "guards": ["pre-implementation"] },
    { "from": "WIP", "to": "Testing", "trigger": "stage:testing-start", "guards": ["pre-testing"] },
    { "from": "Testing", "to": "Done", "trigger": "verify:PASS", "guards": ["completion"] }
  ],
  "delegation_plan": [],
  "exit_conditions": {
    "expected_final_status": "Done"
  }
}
```

### Example 2: Complex Preset with `--stage plan-only`

```json
{
  "schema_version": 1,
  "task_ref": "0274",
  "task_file": "/path/to/docs/tasks2/0274_big_feature.md",
  "preset": "complex",
  "stage": "plan-only",
  "channel": "codex",
  "flags": {
    "auto": true,
    "preflight_verify": true,
    "postflight_verify": false,
    "coverage": null,
    "max_loop_iterations": 3
  },
  "workflow": {
    "preflight": { "enabled": true },
    "preflight_verify": { "enabled": true },
    "refine": { "enabled": true },
    "plan": { "enabled": true },
    "implement_test_loop": { "enabled": false, "max_iterations": 3 },
    "verify": { "enabled": false },
    "postflight_verify": { "enabled": false }
  },
  "status_transitions_planned": [
    { "from": "Todo", "to": "WIP", "trigger": "stage:refine-start", "guards": ["pre-implementation"] }
  ],
  "delegation_plan": [
    { "stage": "plan", "channel": "codex", "prompt_contract": "plan" }
  ],
  "exit_conditions": {
    "early_exit_at_stage": "plan-only",
    "expected_final_status": "WIP"
  }
}
```

## Consumer Guidelines

- **CI:** parse `exit_conditions.expected_final_status` to validate workflow shape
- **Schedulers:** use `stage` + `flags.preflight_verify` + `flags.postflight_verify` to chain runs
- **Observability:** `status_transitions_planned` + `delegation_plan` provide observability surface
- **Versioning:** `schema_version: 1`. Breaking changes bump to `2`.

## Implementation

Rendered by `scripts/dry-run-output.ts`. Invoked with resolved workflow state.
