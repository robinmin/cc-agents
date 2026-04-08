/**
 * orchestration-v2 — Events CLI command handler
 *
 * Handles `orchestrator events <task-ref> [--run <id>] [--type ...] [--phase ...] [--json]`
 */

import { logger } from '../../../../scripts/logger';
import type { Queries } from '../state/queries';
import { EventStore } from '../state/events';
import type { StateManager } from '../state/manager';
import type { EventType } from '../model';
import { EXIT_SUCCESS, EXIT_INVALID_ARGS, EXIT_TASK_NOT_FOUND } from '../model';

export const VALID_EVENT_TYPES: readonly EventType[] = [
    'run.created',
    'run.started',
    'run.paused',
    'run.resumed',
    'run.completed',
    'run.failed',
    'phase.started',
    'phase.completed',
    'phase.failed',
    'phase.rework',
    'gate.evaluated',
    'gate.advisory_fail',
    'gate.rework',
    'gate.escalation',
    'executor.invoked',
    'executor.completed',
    'phase.undo',
];

/**
 * Normalize a task reference to its WBS number.
 *
 * Extracts the WBS prefix from task file paths and returns bare WBS
 * identifiers unchanged. This ensures all DB records and event payloads
 * store a consistent WBS key regardless of how the user invokes the CLI.
 *
 * Examples:
 *   docs/tasks2/0335_Add_events_subcommand_to_orchestrator_CLI.md → 0335
 *   docs/prompts/0334_my-task.md                                 → 0334
 *   0334                                                          → 0334
 */
export function normalizeTaskRef(raw: string): string {
    const segment = raw.split('/').pop() ?? raw;
    // Strip .md extension then extract WBS prefix
    const name = segment.replace(/\.md$/, '');
    return name.split('_')[0];
}

export interface EventsOptions {
    taskRef?: string;
    run?: string;
    types?: readonly string[];
    phase?: string;
    json?: boolean;
}

async function formatEventsOutput(
    resolvedRunId: string,
    taskRef: string | undefined,
    typeFilters: string[],
    phaseFilter: string | undefined,
    events: Array<{
        sequence?: number;
        event_type: string;
        timestamp?: Date;
        payload: Record<string, unknown>;
    }>,
): Promise<void> {
    process.stdout.write(`Run: ${resolvedRunId}${taskRef ? ` (${taskRef})` : ''}\n`);
    if (typeFilters.length > 0) process.stdout.write(`Filter: --type ${typeFilters.join(',')}\n`);
    if (phaseFilter) process.stdout.write(`Filter: --phase ${phaseFilter}\n`);
    process.stdout.write(`Total events: ${events.length}\n\n`);

    for (const e of events) {
        const seq = String(e.sequence ?? '?').padStart(4);
        const ts = e.timestamp ? e.timestamp.toISOString().slice(0, 19).replace('T', ' ') : '             ';
        const type = e.event_type.padEnd(24);
        const phase = ((e.payload.phase_name as string | undefined) ?? '').padEnd(16);
        const transition =
            e.payload.fromState && e.payload.toState ? `${e.payload.fromState} → ${e.payload.toState}` : '';
        process.stdout.write(`[${seq}] ${ts}  ${type}  ${phase}  ${transition}\n`);
    }
}

/**
 * Handle `orchestrator events` command.
 *
 * @param options Parsed CLI options from parseArgs
 * @param stateManager StateManager instance (caller's responsibility to close it)
 * @param queries Queries instance for history lookups
 */
export async function handleEvents(
    options: Record<string, unknown>,
    stateManager: StateManager,
    queries: Queries,
): Promise<void> {
    const taskRef = options.taskRef != null ? normalizeTaskRef(options.taskRef as string) : undefined;
    const runIdOpt = options.run as string | undefined;
    const typeFilters = ((options.types as string[] | undefined) ?? []).map((t) => t.trim());
    const phaseFilter = options.phase as string | undefined;

    // Resolve runId: --run wins; fall back to taskRef lookup
    let resolvedRunId = runIdOpt;
    if (!resolvedRunId && taskRef) {
        const history = await queries.getHistory(100);
        const match = history.find((h) => normalizeTaskRef(h.taskRef) === taskRef);
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

    const eventStore = new EventStore(stateManager.getDb());

    // Determine event types to query
    let eventTypes: EventType[] | undefined;
    if (typeFilters.length > 0) {
        for (const t of typeFilters) {
            if (!VALID_EVENT_TYPES.includes(t as EventType)) {
                logger.error(`Unknown event type: ${t}. Valid types: ${VALID_EVENT_TYPES.join(', ')}`);
                process.exit(EXIT_INVALID_ARGS);
            }
        }
        eventTypes = typeFilters as EventType[];
    }

    // Query events
    const events = await eventStore.query(resolvedRunId, eventTypes);

    // Filter by phase name if specified (payload.phase_name match)
    const filtered = phaseFilter ? events.filter((e) => (e.payload.phase_name as string) === phaseFilter) : events;

    if (options.json) {
        process.stdout.write(
            JSON.stringify(
                {
                    runId: resolvedRunId,
                    taskRef: taskRef ?? null,
                    filters: {
                        types: typeFilters.length > 0 ? typeFilters : null,
                        phase: phaseFilter ?? null,
                    },
                    count: filtered.length,
                    events: filtered.map((e) => ({
                        sequence: e.sequence,
                        eventType: e.event_type,
                        timestamp: e.timestamp?.toISOString() ?? null,
                        phaseName: e.payload.phase_name ?? null,
                        fromState: e.payload.fromState ?? null,
                        toState: e.payload.toState ?? null,
                        payload: e.payload,
                    })),
                },
                null,
                2,
            ),
        );
        process.stdout.write('\n');
        process.exit(EXIT_SUCCESS);
    }

    // Human-readable output
    if (filtered.length === 0) {
        process.stdout.write(`No events found for run ${resolvedRunId}.\n`);
        process.exit(EXIT_SUCCESS);
    }

    await formatEventsOutput(resolvedRunId, taskRef, typeFilters, phaseFilter, filtered);
    process.exit(EXIT_SUCCESS);
}
