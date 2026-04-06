---
name: Add events subcommand to orchestrator CLI
description: Add events subcommand to orchestrator CLI
status: Done
profile: standard
created_at: 2026-04-06T06:50:56.259Z
updated_at: 2026-04-06T07:07:21.087Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0335. Add events subcommand to orchestrator CLI

### Background

### Background

The orchestration-v2 FSM (Finite State Machine) maintains a 5-state lifecycle: `IDLE → RUNNING → PAUSED/COMPLETED/FAILED`. Each state transition — as well as phase lifecycle events — is recorded as an `OrchestratorEvent` in the SQLite event store via `EventStore.append()`.

Currently there is no CLI command to query these events. The only way to inspect FSM transitions is a raw SQL query against the DB:

```bash
sqlite3 docs/.workflow-runs/state.db \
  "SELECT * FROM events WHERE run_id = '<id>' ORDER BY sequence"
```

This is error-prone and requires knowing the schema. An `events` subcommand fills this gap, enabling users to:
- Audit FSM transition history for debugging
- Filter by event type (e.g., `run.paused`, `run.resumed` for human gate cycles)
- Filter by phase name (e.g., `develop`, `review`)
- Export event history as JSON for tooling/reporting


### Requirements

- Add events command to VALID_COMMANDS in cli/commands.ts
- Add --type and --run flags to parseArgs()
- Add handleEvents() in run.ts
- Wire events case in switch statement
- Add help text in printHelp()
- Test: bun test


### Q&A

#### Intake Summary

| Field | Assessment | Quality |
|-------|-----------|---------|
| Background | Well-written: explains WHY (SQL → CLI gap), expected outcomes, user benefits | ✅ Complete |
| Requirements | 6 numbered, testable items covering CLI changes + tests | ✅ Complete |
| Constraints | Non-Functional section with explicit quality standards | ✅ Complete |
| Design | Full CLI interface rationale, event types reference, output formats | ✅ Complete |
| Solution | Detailed implementation across 3 files + tests | ✅ Complete |
| Profile | Auto-assigned via heuristics | ✅ `standard` |

**Intake verdict**: Task file well-formed. No elicitation needed — proceed to decomposition/planning.



### Design

### Design

#### CLI Interface Rationale

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Command name | `events` | Consistent with `status`, `inspect`, `report` pattern |
| Primary arg | `<task-ref>` positional | Matches other commands; `--run <id>` as explicit override |
| Run resolution | `--run <id>` > task-ref lookup via `getHistory(100)` | Avoids requiring user to know the UUID |
| Type filter | `--type a,b` (comma-separated) | Consistent with `--phases a,b` in `run` command |
| Phase filter | `--phase <name>` | Common filter for event streams |
| Output | Text table (default) + `--json` | Mirrors `inspect --evidence` pattern |

#### Event Types Reference

FSM lifecycle events (stored in `events` table, queried via `EventStore.query()`):

| Event | FSM Transition | Payload keys |
|-------|---------------|-------------|
| `run.created` | IDLE → RUNNING | `task_ref`, `pipeline`, `preset` |
| `run.started` | | `task_ref` |
| `run.paused` | RUNNING → PAUSED | `fromState`, `toState`, `reason` |
| `run.resumed` | PAUSED → RUNNING | `fromState`, `toState` |
| `run.completed` | RUNNING → COMPLETED | `fromState`, `toState` |
| `run.failed` | RUNNING → FAILED | `fromState`, `toState`, `error` |
| `phase.started` | | `phase_name`, `skill` |
| `phase.completed` | | `phase_name`, `skill`, `exit_code` |
| `phase.failed` | | `phase_name`, `skill`, `error` |
| `phase.rework` | | `phase_name`, `iteration`, `reason` |
| `gate.evaluated` | | `phase_name`, `step`, `passed`, `advisory` |
| `gate.rework` | | `phase_name`, `step`, `reason` |
| `gate.escalation` | | `phase_name`, `reason` |
| `executor.invoked` | | `phase_name`, `channel`, `model` |
| `executor.completed` | | `phase_name`, `duration_ms` |
| `phase.undo` | | `phase_name`, `snapshot_id` |

#### Text Output Format

```
Run: abc123 (0001)
Filter: --type run.paused,run.resumed
Total events: 4

[0001] 2026-04-06 01:00:00  run.created              plan               IDLE → RUNNING
[0007] 2026-04-06 01:05:22  phase.started           develop            → 
[0012] 2026-04-06 01:08:45  run.paused              develop            RUNNING → PAUSED
[0018] 2026-04-06 01:09:00  run.resumed             develop            PAUSED → RUNNING
```

Columns: `[seq] timestamp event_type phase_name transition`

#### JSON Output Shape

```json
{
  "runId": "abc-123",
  "taskRef": "0001",
  "filters": { "types": ["run.paused", "run.resumed"], "phase": null },
  "count": 4,
  "events": [
    {
      "sequence": 12,
      "eventType": "run.paused",
      "timestamp": "2026-04-06T01:08:45.000Z",
      "phaseName": "develop",
      "fromState": "RUNNING",
      "toState": "PAUSED",
      "payload": { "reason": "human_gate_pending" }
    }
  ]
}
```


### Solution

#### Subtasks

- [ ] [0336 - Add EventsOptions interface to model.ts](0336_Add_EventsOptions_interface_to_model.ts.md)
- [ ] [0337 - Add events to VALID_COMMANDS and flag parsing](0337_Add_events_to_VALID_COMMANDS_and_flag_parsing.md)
- [ ] [0338 - Implement handleEvents() in run.ts](0338_Implement_handleEvents_in_run.ts.md)
- [ ] [0339 - Wire events case in switch and add help text](0339_Wire_events_case_in_switch_and_add_help_text.md)
- [ ] [0340 - Add events.test.ts with coverage](0340_Add_events.test.ts_with_coverage.md)
- [ ] [0341 - Run bun run check and smoke test](0341_Run_bun_run_check_and_smoke_test.md)

**Dependency order:** 0336 → 0337 → (0338 || 0339) → 0340 → 0341
**Estimated total effort:** 4-6 hours

#### Interface

```bash
orchestrator events <task-ref>            # List all events for a run
orchestrator events <task-ref> --run <id>  # Show specific run by ID
orchestrator events <task-ref> --type run.paused,run.resumed   # Filter by event type(s)
orchestrator events <task-ref> --phase develop   # Filter by phase name
orchestrator events <task-ref> --json      # JSON output
```

**Exit codes:** 0 success, 10 invalid args, 12 run not found, 13 state error

---

### Files to Modify

| File | Change |
|------|--------|
| `scripts/cli/commands.ts` | Add `'events'` to `VALID_COMMANDS`; add `--type`, `--phase`, `--run` flag parsing; update `validateCommand()` |
| `scripts/run.ts` | Import `EventStore`; add `handleEvents()`; add `case 'events'` in switch; add help text in `printHelp()` |
| `scripts/model.ts` | Add `EventsOptions` interface |
| `tests/` | Add `events.test.ts` |

---

### Implementation Details

#### 1. `cli/commands.ts`

Add `'events'` to `VALID_COMMANDS` array.
Add flag parsing in `parseArgs()`:

```typescript
} else if (arg === '--type' && argv[i + 1]) {
    options.types = argv[i + 1].split(','); // array of EventType
    i++;
} else if (arg === '--phase' && argv[i + 1]) {
    options.phase = argv[i + 1];
    i++;
}
```

Update `validateCommand()`:

```typescript
if (command === 'events' && !cmd.options.run && !cmd.options.taskRef) {
    return 'Missing required argument: task-ref or --run <id>';
}
```

#### 2. `model.ts`

Add:

```typescript
export interface EventsOptions {
    readonly taskRef?: string;
    readonly runId?: string;
    readonly types?: readonly string[];
    readonly phase?: string;
    readonly json?: boolean;
}
```

#### 3. `run.ts` — handleEvents()

```typescript
async function handleEvents(options: Record<string, unknown>, queries: Queries, state: StateManager): Promise<void> {
    const taskRef = options.taskRef as string | undefined;
    const runIdOpt = options.run as string | undefined;
    const typeFilters = (options.types as string[] | undefined)?.map(t => t.trim()) ?? [];
    const phaseFilter = options.phase as string | undefined;

    // Resolve runId: --run wins; fall back to taskRef lookup
    let resolvedRunId = runIdOpt;
    if (!resolvedRunId && taskRef) {
        const history = await queries.getHistory(100);
        const match = history.find(h => h.taskRef === taskRef);
        if (!match || !match.runId) {
            logger.error(`No run found for task ref: ${taskRef}`);
            process.exit(EXIT_TASK_NOT_FOUND);
        }
        resolvedRunId = match.runId;
    }

    if (!resolvedRunId) {
        logger.error('Missing required: --run <id> or <task-ref>');
        process.exit(EXIT_INVALID_ARGS);
    }

    const eventStore = new EventStore(state.getDb());

    // Determine event types to query
    let eventTypes: EventType[] | undefined;
    if (typeFilters.length > 0) {
        const validTypes = VALID_EVENT_TYPES;
        for (const t of typeFilters) {
            if (!validTypes.includes(t as EventType)) {
                logger.error(`Unknown event type: ${t}. Valid types: ${validTypes.join(', ')}`);
                process.exit(EXIT_INVALID_ARGS);
            }
        }
        eventTypes = typeFilters as EventType[];
    }

    // Query events
    const events = await eventStore.query(resolvedRunId, eventTypes);

    // Filter by phase name if specified (payload.phase_name match)
    const filtered = phaseFilter
        ? events.filter(e => (e.payload.phase_name as string) === phaseFilter)
        : events;

    if (options.json) {
        process.stdout.write(JSON.stringify({
            runId: resolvedRunId,
            taskRef: taskRef ?? null,
            filters: { types: typeFilters.length > 0 ? typeFilters : null, phase: phaseFilter ?? null },
            count: filtered.length,
            events: filtered.map(e => ({
                sequence: e.sequence,
                eventType: e.event_type,
                timestamp: e.timestamp?.toISOString() ?? null,
                phaseName: e.payload.phase_name ?? null,
                fromState: e.payload.fromState ?? null,
                toState: e.payload.toState ?? null,
                payload: e.payload,
            })),
        }, null, 2));
        process.stdout.write('\n');
        process.exit(EXIT_SUCCESS);
    }

    // Human-readable output
    if (filtered.length === 0) {
        process.stdout.write(`No events found for run ${resolvedRunId}.\n`);
        process.exit(EXIT_SUCCESS);
    }

    process.stdout.write(`Run: ${resolvedRunId}${taskRef ? ` (${taskRef})` : ''}\n`);
    if (typeFilters.length > 0) process.stdout.write(`Filter: --type ${typeFilters.join(',')}\n`);
    if (phaseFilter) process.stdout.write(`Filter: --phase ${phaseFilter}\n`);
    process.stdout.write(`Total events: ${filtered.length}\n\n`);

    for (const e of filtered) {
        const seq = String(e.sequence ?? '?').padStart(4);
        const ts = e.timestamp ? e.timestamp.toISOString().slice(0, 19).replace('T', ' ') : '             ';
        const type = e.event_type.padEnd(24);
        const phase = (e.payload.phase_name as string | undefined) ?? '';
        const transition = e.payload.fromState && e.payload.toState
            ? `${e.payload.fromState} → ${e.payload.toState}`
            : '';
        process.stdout.write(`[${seq}] ${ts}  ${type}  ${phase.padEnd(16)}  ${transition}\n`);
    }

    process.exit(EXIT_SUCCESS);
}
```

#### 4. EventStore import and VALID_EVENT_TYPES

In `run.ts`, add import:

```typescript
import { EventStore } from './state/events';
import type { EventType } from './model';

const VALID_EVENT_TYPES: readonly EventType[] = [
    'run.created', 'run.started', 'run.paused', 'run.resumed',
    'run.completed', 'run.failed',
    'phase.started', 'phase.completed', 'phase.failed', 'phase.rework',
    'gate.evaluated', 'gate.advisory_fail', 'gate.rework', 'gate.escalation',
    'executor.invoked', 'executor.completed', 'phase.undo',
];
```

#### 5. Wire in main switch

```typescript
case 'events': {
    const ctx = await getStateContext();
    await handleEvents(parsed.options, ctx.queries, ctx.state);
    break;
}
```

#### 6. printHelp() — add under "Command-specific options"

```
  events:
    --run <id>              Show events for specific run ID
    --type <t1,t2>          Comma-separated event types (e.g., run.paused,run.resumed)
    --phase <name>          Filter events by phase name
    --json                  JSON output
```

---

### Testing Strategy

```bash
# Happy path
orchestrator events 0001                    # events by task-ref
orchestrator events --run <uuid>             # events by run-id
orchestrator events 0001 --type run.paused,run.resumed --json
orchestrator events --run <uuid> --phase develop

# Error cases
orchestrator events                         # exit 10 — missing arg
orchestrator events 0001 --type invalid.type # exit 10 — unknown type
orchestrator events nonexistent             # exit 12 — run not found
```

Unit test file: `tests/events.test.ts`

---

### Non-Functional

- No `console.*` calls — use `logger.*` from `scripts/logger.ts`
- Exit code 0: success, 12: task not found, 13: state error
- Matches existing code style: 2-space indent, semicolons, double quotes
- Pre-commit gate: `bun run check`


### Plan

### Plan

1. [ ] Add `'events'` to `VALID_COMMANDS` in `scripts/cli/commands.ts`
2. [ ] Add `--type`, `--phase`, `--run` flag parsing in `parseArgs()`
3. [ ] Add events validation in `validateCommand()`
4. [ ] Add `EventsOptions` interface to `scripts/model.ts`
5. [ ] Add `VALID_EVENT_TYPES` constant and `EventStore` import to `scripts/run.ts`
6. [ ] Implement `handleEvents()` in `scripts/run.ts`
7. [ ] Add `case 'events'` in main switch statement
8. [ ] Add help text for `events` command in `printHelp()`
9. [ ] Add `tests/events.test.ts` with coverage
10. [ ] Run `bun run check` — must pass lint + typecheck + test
11. [ ] Manual smoke test against existing runs

Estimated scope: ~150 lines across 3 files + ~80 lines of tests.


### Review



### Testing



### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |

### References

### References

- `plugins/rd3/skills/orchestration-v2/scripts/state/events.ts` — EventStore (source of truth)
- `plugins/rd3/skills/orchestration-v2/scripts/model.ts` — `EventType` union, `OrchestratorEvent` interface
- `plugins/rd3/skills/orchestration-v2/scripts/state/queries.ts` — `Queries.getHistory()` for task-ref → run-id resolution
- `plugins/rd3/skills/orchestration-v2/scripts/state/migrations.ts` — `events` table schema
- `plugins/rd3/skills/orchestration-v2/scripts/engine/fsm.ts` — FSM transition map (source of truth for valid transitions)
- `plugins/rd3/skills/orchestration-v2/scripts/run.ts` — CLI entry point (pattern to follow)
- `plugins/rd3/skills/orchestration-v2/scripts/cli/commands.ts` — `parseArgs()`, `validateCommand()`
- `plugins/rd3/skills/orchestration-v2/tests/` — existing test patterns

