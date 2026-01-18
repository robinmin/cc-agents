---
description: Orchestrate task planning and execution with checkpoint discipline via orchestrator-expert
argument-hint: <task-file.md> [--dry-run] [--no-interview] [--scope <level>] [--resume] [--verify <cmd>] [--execute]
---

# task-runner

Orchestrate task planning and execution using the orchestrator-expert meta-coordinator, which manages specialized subagents for decomposition, execution, testing, and domain expertise.

## Quick Start

```bash
/rd:task-runner docs/prompts/0001_feature.md                    # Plan only
/rd:task-runner docs/prompts/0001_feature.md --execute          # Plan + execute
/rd:task-runner docs/prompts/0001_feature.md --resume           # Continue interrupted work
/rd:task-runner docs/prompts/0001_feature.md --resume --execute # Resume and execute
```

## Arguments

| Argument         | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `<task-file.md>` | Path to task file (created via `tasks create <name>`) |
| `--dry-run`      | Preview without modifying file                        |
| `--no-interview` | Skip requirements discovery                           |
| `--scope`        | `minimal` \| `standard` (default) \| `comprehensive`  |
| `--resume`       | Resume from last checkpoint                           |
| `--verify <cmd>` | Verification command (e.g., `npm test`)               |
| `--execute`      | After planning, execute implementation phases         |

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  /rd:task-runner Orchestration                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   User Request → rd:orchestrator-expert (Meta-Coordinator)      │
│                                                                 │
│   ├─→ Analyze task file state                                   │
│   ├─→ Determine required subagents                              │
│   ├─→ Coordinate planning → execution loop                      │
│   └─→ Manage progress & resumption                              │
│                                                                 │
│   Coordinated Subagents:                                        │
│   ├─→ rd:task-decomposition-expert (Planning phases)            │
│   ├─→ rd:task-runner (Execution phases)                         │
│   ├─→ Domain experts (Python/TS/Go/MCP/etc.)                    │
│   └─→ rd:test-expert (Test generation)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Orchestrator Delegation

This command delegates to `rd:orchestrator-expert`, which coordinates the workflow:

```python
Task(
  subagent_type="rd:orchestrator-expert",
  prompt="""Coordinate task execution for: {task_file}

  Arguments:
  - dry_run: {dry_run}
  - no_interview: {no_interview}
  - scope: {scope}
  - resume: {resume}
  - verify_cmd: {verify_cmd}
  - execute: {execute}

  Workflow:
  1. Check task file state (tasks list)
  2. If planning needed → Invoke rd:task-decomposition-expert
  3. If execution needed → Invoke rd:task-runner
  4. If testing needed → Invoke rd:test-expert
  5. If domain expertise needed → Invoke appropriate expert
  6. Monitor progress via tasks CLI
  7. Handle resumption from checkpoints

  Maintain progress tracking and error recovery throughout.""",
  description="Orchestrate task planning and execution"
)
```

## Progress Tracking

Progress tracked by orchestrator via tasks CLI and task file frontmatter:

```yaml
---
name: Feature Name
status: WIP
current_phase: 6 # Planning phase (1-6)
verify_cmd: npm test # From --verify or interview
impl_progress: # Execution tracking
  phase_1: completed
  phase_2: in_progress
  phase_3: pending
updated_at: 2026-01-13
---
```

**Status values:** `Backlog` | `Todo` | `WIP` | `Testing` | `Done` | `Blocked`

**Impl progress values:** `pending` | `in_progress` | `completed` | `blocked`

## Resume Protocol

When `--resume` is used, the orchestrator:

1. Scans all task files via `tasks list`
2. Reconstructs state from status frontmatter
3. Identifies last completed task (Done) and in-progress task (WIP)
4. Continues from checkpoint or next eligible task

```bash
# Orchestrator checks current state before resuming
tasks list                    # View all tasks
tasks list wip                # View in-progress tasks
```

## Expert Delegation

The orchestrator delegates specialized work to appropriate experts:

| Action Pattern         | Delegated To           |
| ---------------------- | ---------------------- |
| Python, async, pytest  | `rd:python-expert`     |
| TypeScript, React      | `rd:typescript-expert` |
| Go, goroutines         | `rd:golang-expert`     |
| MCP server             | `rd:mcp-expert`        |
| Test design/generation | `rd:test-expert`       |
| Create agent           | `rd:agent-expert`      |
| Browser automation     | `rd:agent-browser`     |
| General coding         | `rd:super-coder`       |

## Integration

```bash
# Full workflow (orchestrator-managed)
tasks create "Feature Name"                    # Create task file
/rd:task-runner <file> --verify "npm test"     # Orchestrator coordinates planning
/rd:task-runner <file> --resume --execute      # Orchestrator coordinates execution
/rd:task-fixall npm test                       # Final verification (optional)
tasks update 0001 Done                         # Mark complete (or via orchestrator)
```

## Workflow Flowchart

```
User invokes /rd:task-runner
         ↓
rd:orchestrator-expert receives request
         ↓
    ┌──────────────────────┐
    │ Check task file state │
    │ (tasks list + status)  │
    └──────────────────────┘
         ↓
    ┌─────────────────────────────────┐
    │ What state is the task in?      │
    └─────────────────────────────────┘
         ↓
    ┌──────────┬──────────┬──────────┬──────────┐
    ↓          ↓          ↓          ↓          ↓
Backlog     Todo       WIP      Testing     Done
    ↓          ↓          ↓          ↓          ↓
Invoke    Invoke    Resume    Review     Report
task-      task-     from      &         complete
decomp     runner    checkpoint fix
    │          │          │          │
    └──────────┴──────────┴──────────┘
                ↓
        rd:orchestrator-expert
        coordinates all subagents
                ↓
        Track progress via tasks CLI
                ↓
        Handle errors & resumption
                ↓
        Report completion
```

## Troubleshooting

| Issue                | Solution                                                                             |
| -------------------- | ------------------------------------------------------------------------------------ |
| File not found       | `tasks create <name>` first                                                          |
| Interrupted workflow | `--resume` to continue from checkpoint                                               |
| Task blocked         | Check `**Blocker**:` note in task file; orchestrator will continue independent tasks |
| Verification fails   | `/rd:task-fixall <cmd>` to fix and re-verify                                         |
| Need progress check  | `tasks list` to view all task states                                                 |

## Orchestrator Benefits

1. **Unified coordination**: Single entry point manages all subagent interactions
2. **State reconstruction**: Can resume from any breakpoint by scanning task files
3. **Error recovery**: Continues with independent tasks when one fails
4. **Flexible delegation**: Invokes only the subagents needed for current state
5. **Progress monitoring**: Tracks all tasks via tasks CLI integration

## Examples

### Plan a feature

```bash
/rd:task-runner docs/prompts/0005_add_auth.md --scope comprehensive --verify "npm test"
```

### Resume and execute

```bash
/rd:task-runner docs/prompts/0005_add_auth.md --resume --execute
```

### Dry run (preview only)

```bash
/rd:task-runner docs/prompts/0005_add_auth.md --dry-run
```
