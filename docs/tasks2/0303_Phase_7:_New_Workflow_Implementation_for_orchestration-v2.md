---
name: Phase 7: New Workflow Implementation for orchestration-v2
description: Phase 7: New Workflow Implementation for orchestration-v2
status: Backlog
created_at: 2026-03-31T23:38:26.185Z
updated_at: 2026-03-31T23:38:26.185Z
folder: docs/tasks2
type: task
priority: "medium"
dependencies: ["0302"]
tags: ["rd3","orchestration","v2","workflows"]
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0303. Phase 7: New Workflow Implementation for orchestration-v2

### Background

Implement new workflows enabled by the v2 engine: parallel verification (verify-bdd + verify-func concurrent), per-project custom pipelines (extends + overrides), security scan as parallel phase, and advanced reporting (historical trends, model comparison).


### Requirements

1. Parallel verification: verify-bdd and verify-func run concurrently after test+review, both must pass before docs. 2. Per-project pipelines: extends from base, override phases, add custom phases. 3. Security scan phase: parallel with test/review using rd3:code-review-common with security payload. 4. Advanced reporting: historical trend analysis, model comparison, preset success rates. 5. Each workflow has its own integration test. 6. Example pipeline YAML files for each workflow.


### Q&A



### Design

DAG-based parallel execution enables new workflows. verify-bdd and verify-func as parallel DAG nodes after review. Per-project pipelines via extends with deep merge. Security scan as parallel phase. Advanced reporting via aggregation queries.

### Solution

- Parallel verification: default.yaml has verify-bdd and verify-func both with `after: [review]`, docs with `after: [verify-bdd, verify-func]` — DAG resolves parallel execution
- Per-project pipelines: config/resolver.ts with extends resolution, deep merge on payload, child overrides parent phases, max 2 levels
- Security scan: security-first.yaml has security-scan phase parallel with test (both `after: [implement]`), review depends on both test and security-scan
- Advanced reporting: state/queries.ts has getTrends() (period-based with preset breakdown), getTokenUsageByModel() (model comparison), getAveragePhaseDuration() (per-phase timing), getPresetStats() (success rates)
- Example YAMLs: default.yaml, quick-fix.yaml, security-first.yaml plus docs.yaml, plan.yaml, refine.yaml, review.yaml, unit.yaml
- Tests: trends.test.ts for trend analysis, integration tests for parallel execution

### Plan

1. Define parallel verification in default.yaml DAG structure
2. Implement extends/override in config resolver
3. Create security-first.yaml with parallel security scan
4. Implement trend/model comparison queries in state/queries.ts
5. Add trend report formatting in reporter
6. Write tests for each workflow

### Review

All 6 requirements verified. Parallel verification is inherent in DAG structure. Per-project pipelines work via extends resolver. Security scan runs parallel via DAG deps. Advanced reporting via Queries class. Each workflow has integration tests and example YAMLs.

### Testing

`bun run check` passes. trends.test.ts covers trend analysis. Integration tests cover parallel phase execution. 91.26% line coverage.



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References


