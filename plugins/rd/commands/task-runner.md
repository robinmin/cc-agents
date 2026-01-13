---
description: Orchestrate task planning and execution with checkpoint discipline
argument-hint: <task-file.md> [--dry-run] [--no-interview] [--scope <level>] [--resume] [--verify <cmd>] [--execute]
---

# task-runner

Orchestrate task decomposition and execution using specialized subagents.

## Quick Start

```bash
/rd:task-runner docs/prompts/0001_feature.md                    # Plan only
/rd:task-runner docs/prompts/0001_feature.md --execute          # Plan + execute
/rd:task-runner docs/prompts/0001_feature.md --resume           # Continue interrupted work
/rd:task-runner docs/prompts/0001_feature.md --resume --execute # Resume and execute
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<task-file.md>` | Path to task file (created via `tasks create <name>`) |
| `--dry-run` | Preview without modifying file |
| `--no-interview` | Skip requirements discovery |
| `--scope` | `minimal` \| `standard` (default) \| `comprehensive` |
| `--resume` | Resume from last checkpoint |
| `--verify <cmd>` | Verification command (e.g., `npm test`) |
| `--execute` | After planning, execute implementation phases |

## Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                  /rd:task-runner Orchestration                  │
├────────────────────────────┬───────────────────────────────────┤
│   PLANNING (Phases 1-6)    │         EXECUTION                 │
│   ───────────────────────  │   ─────────────────────────────   │
│   rd:task-decomposition-   │   rd:task-runner (subagent)       │
│   expert (subagent)        │                                   │
│                            │   • Sequential phase execution    │
│   • Validate task file     │   • Checkpoint after each phase   │
│   • Interview requirements │   • TodoWrite synchronization     │
│   • Design solution        │   • Expert delegation when needed │
│   • Create impl phases     │   • Resume capability             │
└────────────────────────────┴───────────────────────────────────┘
```

## Subagent Orchestration

This command delegates to two specialized subagents:

### Phase 1: Planning (task-decomposition-expert)

```python
Task(
  subagent_type="rd:task-decomposition-expert",
  prompt="""Analyze and decompose task file: {task_file}

  Execute planning phases:
  1. Validate: Check frontmatter and required sections
  2. Interview: Use AskUserQuestion for requirements (unless --no-interview)
  3. Design: Create architecture in Solutions/Goals section
  4. Plan: Create implementation phases with action items

  Scope: {scope}  # minimal|standard|comprehensive
  Verify command: {verify_cmd}  # if provided

  Update current_phase in frontmatter after each phase.
  Initialize impl_progress when plan complete.""",
  description="Decompose task into phases"
)
```

### Phase 2: Execution (task-runner subagent)

Invoked when `--execute` flag set OR when `impl_progress` has pending phases:

```python
Task(
  subagent_type="rd:task-runner",
  prompt="""Execute implementation phases for: {task_file}

  For each pending phase:
  1. Verify dependencies met
  2. Set status to in_progress
  3. Execute action items (delegate to experts if needed)
  4. Mark action items complete: - [ ] → - [x]
  5. Set status to completed
  6. Sync with TodoWrite

  Stop on blocker, document resolution steps.""",
  description="Execute implementation phase"
)
```

## Progress Tracking

Progress tracked in task file frontmatter (source of truth):

```yaml
---
name: Feature Name
status: WIP
current_phase: 6           # Planning phase (1-6)
verify_cmd: npm test       # From --verify or interview
impl_progress:             # Execution tracking
  phase_1: completed
  phase_2: in_progress
  phase_3: pending
updated_at: 2026-01-13
---
```

**Status values:** `pending` | `in_progress` | `completed` | `blocked`

## Resume Protocol

When `--resume` is used:

1. Read `current_phase` → Skip completed planning phases
2. Read `impl_progress` → Find next pending/in_progress phase
3. Continue from interruption point

```bash
# Check current state before resuming
grep -E "^(current_phase|impl_progress|status):" docs/prompts/0001_feature.md
```

## Expert Delegation

During execution, task-runner delegates specialized work:

| Action Pattern | Delegated To |
|----------------|--------------|
| Python, async, pytest | `rd:python-expert` |
| TypeScript, React | `rd:typescript-expert` |
| MCP server | `rd:mcp-expert` |
| Create agent | `rd:agent-expert` |
| General coding | `rd:super-coder` |

## Integration

```bash
# Full workflow
tasks create "Feature Name"                    # Create task file
/rd:task-runner <file> --verify "npm test"     # Plan
/rd:task-runner <file> --resume --execute      # Execute phases
/rd:task-fixall npm test                       # Final verification
tasks update 0001 Done                         # Mark complete
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| File not found | `tasks create <name>` first |
| Interrupted | `--resume` to continue |
| Phase blocked | Check `**Blocker**:` note in phase section |
| Verification fails | `/rd:task-fixall <cmd>` to fix and re-verify |

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
