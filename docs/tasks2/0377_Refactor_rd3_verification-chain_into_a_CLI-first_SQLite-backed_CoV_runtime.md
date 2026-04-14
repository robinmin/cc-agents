---
name: Refactor rd3verification-chain into a CLI-first SQLite-backed CoV runtime
description: Refactor rd3verification-chain into a CLI-first SQLite-backed CoV runtime
status: Done
created_at: 2026-04-13T22:20:33.960Z
updated_at: 2026-04-14T00:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0377. Refactor rd3verification-chain into a CLI-first SQLite-backed CoV runtime

### Background

rd3:verification-chain has the right conceptual model but it is not currently packaged for reliable integration. State is persisted as JSON files under a state directory, the interpreter is used as a library rather than a stable CLI surface, and orchestration-v2 currently duplicates parts of the verification behavior instead of delegating to a single CoV runtime. The next version needs to become the authoritative verification substrate for other agent skills.


### Requirements

Design and implement a proper CLI contract for verification-chain that other skills can call predictably for run, resume, inspect, and result retrieval. Introduce atomic SQLite-backed CoV record operations for chains, nodes, evidence, and resume state, with environment-variable configuration for database path and table names so orchestration-v2 and other skills can integrate without tight coupling. Harden the deterministic checker core first around cli, file-exists, content-match, and compound checks; keep llm and human support but make them clearly secondary to the deterministic path. Add tests for CLI behavior, persistence semantics, pause/resume, and database integration.

#### Review-Backed Findings

- The current implementation persists CoV state to JSON files under `<stateDir>/cov/...cov-state.json` instead of using integration-grade database records. That persistence model is insufficient for clean orchestration integration and should be replaced or wrapped by atomic SQLite-backed operations.
- `saveState()` currently logs persistence errors instead of failing loudly. The refactor must treat persistence as part of correctness, not best-effort bookkeeping.
- The interpreter is currently a library-style module exposing `runChain()` and `resumeChain()` rather than a stable CLI entrypoint, yet orchestration-v2 already tries to invoke it like a CLI. The new version must define and implement a real command surface.
- Resume currently depends on re-supplying the full manifest to `resumeChain()`. That is workable as an internal API but weak as an integration contract. The new design should support runtime lookup by persisted chain identity, while still allowing manifest-driven execution when needed.
- The deterministic checker core should become the authoritative foundation. CLI, file-exists, content-match, and compound checks need to be hardened first; LLM and human checks should remain supported but should not be the only trustworthy integration path.
- The external contract must be shaped for reuse by orchestration-v2 and other skills. Environment variables for database path and table names are required so integration can happen without hard-coding a single storage namespace.


### Q&A



### Design



### Solution

This task should establish `rd3:verification-chain` as the single verification runtime rather than a partially embedded helper.

#### Solution Outline

1. Define the CLI contract
   Introduce a real CLI entrypoint with a small, stable surface such as:
   - `run`
   - `resume`
   - `show` or `inspect`
   - `list` or `results`

   The CLI should return structured JSON suitable for other skills and scripts.

2. Introduce SQLite-backed persistence
   Replace or wrap the JSON-file state model with atomic record operations for:
   - chain header/state
   - node execution state
   - checker evidence
   - pause/resume checkpoints

   Persistence should fail loudly on write errors. Best-effort logging is not sufficient for workflow correctness.

3. Make storage configurable
   Support environment-driven configuration for:
   - database file path
   - table namespace or table names
   - optional runtime state directory for artifacts if still needed

   This allows orchestration-v2 to reuse verification-chain without forcing a single storage topology.

4. Harden the deterministic checker core
   Treat these as the production baseline:
   - `cli`
   - `file-exists`
   - `content-match`
   - `compound`

   LLM and human checks should remain available but be clearly documented and tested as higher-variability verification modes.

5. Formalize the integration contract
   Define exactly what a caller provides and what it gets back:
   - manifest or chain payload input
   - persisted chain identity
   - run/resume semantics
   - evidence shape
   - pass/fail/pending status semantics

   The goal is for orchestration-v2 to call verification-chain instead of reimplementing checker logic.

6. Add end-to-end tests
   Add tests covering:
   - CLI parsing and output
   - persistence correctness
   - pause/resume semantics
   - deterministic checker behavior
   - integration-style flows that simulate orchestration-v2 usage

#### Expected Outcome

After this task, verification-chain should be usable as a standalone verification service with a clear CLI and database contract, and other skills should be able to integrate with it without depending on internal interpreter details.


### Plan



### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

- `plugins/rd3/skills/verification-chain/scripts/interpreter.ts:39-55` — file-based load/save state implementation and current persistence error handling.
- `plugins/rd3/skills/verification-chain/scripts/interpreter.ts:533-558` — `runChain()` entry contract and current state-path construction.
- `plugins/rd3/skills/verification-chain/scripts/interpreter.ts:703-760` — `resumeChain()` contract requiring a manifest plus persisted state file.
- `plugins/rd3/skills/verification-chain/SKILL.md:247-277` — public usage and state-persistence contract currently centered on library calls and JSON files.
- `plugins/rd3/skills/verification-chain/scripts/types.ts:10-18` — canonical checker-method vocabulary and runtime type definitions that should anchor external integrations.
- `plugins/rd3/skills/verification-chain/tests/integration.test.ts:282-339` — current pause/resume flow expectations around human approval and rejection.

