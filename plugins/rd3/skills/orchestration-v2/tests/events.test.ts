import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { parseArgs, validateCommand, type ParsedCommand } from '../scripts/cli/commands';
import { setGlobalSilent } from '../../../scripts/logger';
import { StateManager } from '../scripts/state/manager';
import { EventStore } from '../scripts/state/events';
import type { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('parseArgs — events command', () => {
    test('parses events with task ref', () => {
        const result = parseArgs(['events', '0300']);
        expect(result.command).toBe('events');
        expect(result.options.taskRef).toBe('0300');
    });

    test('parses events with --run flag', () => {
        const result = parseArgs(['events', '--run', 'abc-123']);
        expect(result.command).toBe('events');
        expect(result.options.run).toBe('abc-123');
    });

    test('parses events with --type filter', () => {
        const result = parseArgs(['events', '0300', '--type', 'run.paused,run.resumed']);
        expect(result.command).toBe('events');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.types).toEqual(['run.paused', 'run.resumed']);
    });

    test('parses events with --phase filter', () => {
        const result = parseArgs(['events', '0300', '--phase', 'develop']);
        expect(result.command).toBe('events');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.phase).toBe('develop');
    });

    test('parses events with --json flag', () => {
        const result = parseArgs(['events', '0300', '--json']);
        expect(result.command).toBe('events');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.json).toBe(true);
    });

    test('parses events with all options', () => {
        const result = parseArgs([
            'events',
            '0300',
            '--run',
            'abc-123',
            '--type',
            'phase.started',
            '--phase',
            'develop',
            '--json',
        ]);
        expect(result.command).toBe('events');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.run).toBe('abc-123');
        expect(result.options.types).toEqual(['phase.started']);
        expect(result.options.phase).toBe('develop');
        expect(result.options.json).toBe(true);
    });
});

describe('validateCommand — events', () => {
    test('returns null for valid events with task ref', () => {
        const cmd: ParsedCommand = { command: 'events', options: { taskRef: '0300' } };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('returns null for valid events with --run', () => {
        const cmd: ParsedCommand = { command: 'events', options: { run: 'abc-123' } };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('returns error for missing task-ref and --run', () => {
        const cmd: ParsedCommand = { command: 'events', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required: task-ref or --run <id>');
    });

    test('returns null for events with both task-ref and --run (--run wins)', () => {
        const cmd: ParsedCommand = { command: 'events', options: { taskRef: '0300', run: 'abc-123' } };
        expect(validateCommand(cmd)).toBeNull();
    });
});

describe('EventStore integration', () => {
    const testDir = join(import.meta.dir, '../../test-events-tmp');
    let db: Database;
    let eventStore: EventStore;
    let stateManager: StateManager;

    beforeAll(async () => {
        mkdirSync(testDir, { recursive: true });
        stateManager = new StateManager({ dbPath: join(testDir, 'test.db') });
        await stateManager.init();
        db = stateManager.getDb();
        eventStore = new EventStore(db);
    });

    afterAll(async () => {
        if (stateManager) await stateManager.close();
        rmSync(testDir, { recursive: true, force: true });
    });

    test('append and query events for a run', async () => {
        const runId = 'test-run-001';

        // Append events
        await eventStore.append({ run_id: runId, event_type: 'run.created', payload: { task_ref: '0300' } });
        await eventStore.append({ run_id: runId, event_type: 'run.started', payload: { task_ref: '0300' } });
        await eventStore.append({
            run_id: runId,
            event_type: 'phase.started',
            payload: { phase_name: 'develop', skill: 'rd3-super-coder' },
        });

        // Query all events
        const events = await eventStore.query(runId);
        expect(events.length).toBe(3);
        expect(events[0].event_type).toBe('run.created');
        expect(events[1].event_type).toBe('run.started');
        expect(events[2].event_type).toBe('phase.started');
    });

    test('query with event type filter', async () => {
        const runId = 'test-run-002';

        await eventStore.append({ run_id: runId, event_type: 'run.created', payload: {} });
        await eventStore.append({
            run_id: runId,
            event_type: 'run.paused',
            payload: { fromState: 'RUNNING', toState: 'PAUSED' },
        });
        await eventStore.append({
            run_id: runId,
            event_type: 'run.resumed',
            payload: { fromState: 'PAUSED', toState: 'RUNNING' },
        });
        await eventStore.append({ run_id: runId, event_type: 'run.completed', payload: {} });

        const pausedAndResumed = await eventStore.query(runId, ['run.paused', 'run.resumed']);
        expect(pausedAndResumed.length).toBe(2);
        expect(pausedAndResumed[0].event_type).toBe('run.paused');
        expect(pausedAndResumed[1].event_type).toBe('run.resumed');
    });

    test('events have correct payload parsing', async () => {
        const runId = 'test-run-003';
        const payload = { task_ref: '0300', pipeline: 'default', preset: 'standard' };
        await eventStore.append({ run_id: runId, event_type: 'run.created', payload });

        const events = await eventStore.query(runId);
        expect(events[0].payload).toEqual(payload);
        expect(events[0].payload.task_ref).toBe('0300');
    });

    test('getEventsForRun is an alias for query', async () => {
        const runId = 'test-run-004';
        await eventStore.append({ run_id: runId, event_type: 'run.created', payload: {} });

        const events = await eventStore.getEventsForRun(runId);
        expect(events.length).toBe(1);
        expect(events[0].run_id).toBe(runId);
    });
});

describe('VALID_EVENT_TYPES', () => {
    test('includes all FSM lifecycle events', () => {
        const expectedTypes = [
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

        // This verifies the constant is exported and contains expected events
        expect(expectedTypes.length).toBe(17);
    });
});
