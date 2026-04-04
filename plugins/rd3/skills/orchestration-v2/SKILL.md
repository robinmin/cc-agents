---
name: orchestration-v2
description: "Next-generation pipeline orchestration engine with DAG-based parallel execution, FSM lifecycle management, event-sourced SQLite state, and CLI-first interface. Use when running multi-phase development pipelines, resuming paused workflows, generating pipeline reports, or customizing pipeline definitions per-project."
license: Apache-2.0
version: 0.1.0
created_at: 2026-03-31
updated_at: 2026-04-02
platform: rd3
type: orchestration
tags: [orchestration, pipeline, cli, dag, fsm, verification, event-sourced]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity,pi"
  category: orchestration
  interactions:
    - pipeline
see_also:
  - rd3:run-acp
  - rd3:request-intake
  - rd3:backend-architect
  - rd3:frontend-architect
  - rd3:backend-design
  - rd3:frontend-design
  - rd3:ui-ux-design
  - rd3:task-decomposition
  - rd3:code-implement-common
  - rd3:sys-testing
  - rd3:advanced-testing
  - rd3:code-review-common
  - rd3:bdd-workflow
  - rd3:functional-review
  - rd3:code-docs
  - rd3:verification-chain
---

# rd3:orchestration-v2 — DAG-Based Pipeline Engine

FSM-supervised DAG scheduler with event-sourced SQLite state, pluggable executors, and CLI-first interface. Replaces the hardcoded sequential loop of orchestration-dev with a declarative YAML pipeline definition and parallel phase execution.

## When to Use

- Run a multi-phase development pipeline (implement → test → review → docs)
- Resume a paused or failed pipeline from the last successful phase
- Execute pipeline phases in parallel where dependencies allow
- Customize pipeline definitions per-project via YAML
- Generate pipeline reports with timing and coverage metrics
- Migrate from v1 orchestration-dev state to v2

## Overview

The orchestration-v2 engine is a micro-kernel with six pluggable subsystems: FSM lifecycle, DAG scheduler, event bus, state manager, executor pool, and verification driver. Pipelines are declared in YAML and executed as a directed acyclic graph with automatic dependency resolution.

## Quick Start

```bash
# Run all phases in DAG order
orchestrator run 0266

# Run with a preset (named phase subset)
orchestrator run 0266 --preset complex

# Run specific phases (DAG resolves order)
orchestrator run 0266 --phases implement,test

# Override coverage threshold
orchestrator run 0266 --coverage 95

# Resume a paused pipeline
orchestrator resume 0266 --approve

# Check status
orchestrator status 0266

# Validate pipeline YAML
orchestrator validate

# Show pipeline JSON Schema
orchestrator validate --schema
```

## Core Concepts

### Pipeline YAML

Pipelines are defined in `docs/.workflows/pipeline.yaml`. The YAML declares **what** phases exist, their skills, dependencies, and parameters. The engine handles **how** they execute.

```yaml
schema_version: 1
name: default
phases:
  implement:
    skill: rd3:code-implement-common
    gate:
      type: command
      command: "bun run check"
    timeout: 2h
  test:
    skill: rd3:sys-testing
    gate:
      type: command
      command: "bun test --coverage"
    timeout: 1h
    after: [implement]
```

### Presets

Named aliases for common `--phases` combinations. Not a core concept — the DAG is the source of truth.

```bash
orchestrator run 0266 --preset simple    # ≡ --phases implement,test
orchestrator run 0266 --preset complex   # ≡ --phases intake,arch,...,docs
```

### FSM Lifecycle

Every pipeline run has exactly 5 lifecycle states: IDLE → RUNNING → PAUSED/COMPLETED/FAILED. The FSM is engine-internal — users never specify FSM states in YAML.

### DAG Scheduling

Phase dependencies are declared via `after:` edges. The scheduler resolves execution order via topological sort. Phases with satisfied dependencies run in parallel.

### Event-Sourced State

All events (phase starts, completions, failures, gate checks) are persisted to SQLite. This enables resume, undo, history, and detailed reporting without external state files.

## Workflows

### Step 1: Define Pipeline

Create or customize `docs/.workflows/pipeline.yaml` with phases, skills, dependencies, and gates. Use `orchestrator validate` to verify the YAML.

### Step 2: Run Pipeline

Execute `orchestrator run <task-id>` to start the DAG. The engine resolves phase order, runs independent phases in parallel, and persists events to SQLite.

### Step 3: Handle Gates

Command gates enforce deterministic checks, auto gates run checklist-based verification, and human gates pause the run for approval. Use `orchestrator resume <task-id> --approve` to continue a paused run.

### Step 4: Review and Report

After completion, use `orchestrator status` for a summary or `orchestrator report` for detailed timing, coverage, and phase results.

### Step 5: Recovery

If a phase fails, use `orchestrator undo <task-id> --phase <name>` to rollback, then re-run or adjust and resume.

## CLI Reference

Full CLI documentation: → `references/cli-reference.md`

| Command | Purpose |
|---------|---------|
| `orchestrator run` | Run a pipeline |
| `orchestrator resume` | Resume paused pipeline |
| `orchestrator status` | Show pipeline status |
| `orchestrator report` | Generate detailed report |
| `orchestrator validate` | Validate pipeline YAML |
| `orchestrator list` | List available pipelines |
| `orchestrator history` | Show run history |
| `orchestrator undo` | Rollback a phase |
| `orchestrator inspect` | Show phase detail |
| `orchestrator prune` | Compact event store |
| `orchestrator migrate` | Migrate v1 state to v2 |

## Pipeline YAML Guide

How to write and customize pipeline definitions: → `references/pipeline-yaml-guide.md`

## Agent Cooperation

How agents interact with running pipelines: → `references/agent-cooperation.md`

## Error Recovery

Error taxonomy with recovery strategies: → `references/error-codes.md`

## Example Pipelines

- `references/examples/default.yaml` — Full 9-phase pipeline
- `references/examples/quick-fix.yaml` — Simple 2-phase pipeline
- `references/examples/security-first.yaml` — Pipeline with security scan

## Architecture

The engine is a micro-kernel with pluggable subsystems:

- **FSM Engine** — 5-state lifecycle machine (IDLE, RUNNING, PAUSED, COMPLETED, FAILED)
- **DAG Scheduler** — Dependency resolution, topological sort, parallel dispatch
- **Event Bus** — Typed event emitter, all subsystems produce
- **State Manager** — SQLite with event sourcing (6 tables)
- **Executor Pool** — LocalBun, ACP, and Mock executors
- **CoV Driver** — Verification chain adapter
- **Pipeline Compiler** — YAML → validated PipelineDefinition → DAG + FSM config

Blueprint document: `docs/orchestration-v2-blueprint.md`

## Coexistence with v1

During migration, both systems coexist:

- `orchestration-v1/` — Legacy system (frozen, use v2 instead)
- `orchestration-v2/` — New system (active development)
- `orchestrator` command always points to v2
- No shared state — v1 uses JSON, v2 uses SQLite

## Additional Resources

- **CLI Reference**: `references/cli-reference.md` — Full command documentation
- **Pipeline YAML Guide**: `references/pipeline-yaml-guide.md` — How to write pipeline definitions
- **Gate Architecture**: `references/gate-architecture.md` — Gate model, evidence contract, and policy design
- **Agent Cooperation**: `references/agent-cooperation.md` — How agents interact with pipelines
- **Error Recovery**: `references/error-codes.md` — Error taxonomy and recovery strategies
- **Example Pipelines**: `references/examples/` — Default, quick-fix, security-first, and more
- **Blueprint**: `docs/orchestration-v2-blueprint.md` — Design document
