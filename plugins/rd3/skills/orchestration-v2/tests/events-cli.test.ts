/**
 * events.ts — CLI-output integration tests
 *
 * Covers the 4 missing test cases from task 0340:
 *  4) --type filter with invalid type → exit 10
 *  8) nonexistent task ref           → exit 12
 *  9) empty events                  → "No events found"
 *  9) text output table format       → headers + event lines
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { handleEvents, normalizeTaskRef, VALID_EVENT_TYPES } from '../scripts/cli/events';
import { StateManager } from '../scripts/state/manager';
import { EventStore } from '../scripts/state/events';
import { setGlobalSilent } from '../../../scripts/logger';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

// Capture originals once (before any beforeEach runs)
const origExit = process.exit;
const origStdoutWrite = process.stdout.write.bind(process.stdout);
const origStderrWrite = process.stderr.write.bind(process.stderr);

let exitCode = 0;
let stdout = '';
let _stderr = '';

// Suppress internal logger noise during tests
beforeEach(() => {
    setGlobalSilent(true);
});

// ─── normalizeTaskRef unit tests ───────────────────────────────────────────────

describe('normalizeTaskRef', () => {
    test('extracts WBS from bare number', () => {
        expect(normalizeTaskRef('0335')).toBe('0335');
    });

    test('extracts WBS from task file path', () => {
        expect(normalizeTaskRef('docs/tasks2/0335_Add_events.md')).toBe('0335');
    });

    test('extracts WBS from prompt file path', () => {
        expect(normalizeTaskRef('docs/prompts/0334_my-task.md')).toBe('0334');
    });

    test('handles nested paths', () => {
        expect(normalizeTaskRef('a/b/docs/tasks2/0400_test.md')).toBe('0400');
    });

    test('handles bare WBS with .md extension (no underscore)', () => {
        expect(normalizeTaskRef('docs/tasks2/0400.md')).toBe('0400');
    });
});

// ─── VALID_EVENT_TYPES ─────────────────────────────────────────────────────────

describe('VALID_EVENT_TYPES', () => {
    test('contains all 17 FSM lifecycle event types', () => {
        const expected = [
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
        expect(VALID_EVENT_TYPES).toEqual(expected as unknown as typeof VALID_EVENT_TYPES); // type-safe: values are identical
    });

    test('is a readonly array', () => {
        expect(Array.isArray(VALID_EVENT_TYPES)).toBe(true);
    });
});

// ─── handleEvents test helpers ─────────────────────────────────────────────────

const TEST_DIR = join(import.meta.dir, '../test-events-cli-tmp');

function resetOutput() {
    stdout = '';
    _stderr = '';
    exitCode = 0;
}

function interceptExit() {
    (process.exit as unknown as (code?: number) => never) = (code?: number) => {
        exitCode = code ?? 0;
        throw new Error(`EXIT:${code ?? 0}`);
    };
}

function restoreExit() {
    (process.exit as (code?: number) => never) = origExit;
}

// Isolated output capture for JSON output tests.
// Uses a private buffer (no real stdout I/O) so JSON output does not pollute
// the dot-reporter stream. Call get() after handleEvents to retrieve the
// captured string for assertions.
function captureTestOutput(): { activate(): void; get(): string } {
    let output = '';
    return {
        activate() {
            (process.stdout.write as (str: string) => boolean) = (str: string) => {
                output += str;
                return true;
            };
        },
        get() {
            const result = output;
            output = '';
            return result;
        },
    };
}

function makeFakeQueries(history?: Array<{ taskRef: string; runId?: string }>) {
    return {
        getHistory: async (_limit: number) => history ?? [],
    };
}

beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    resetOutput();
    // Intercept stdout/stderr into local variables only — no real I/O during tests.
    // Tests assert on the captured `stdout` / `_stderr` variables.
    (process.stdout.write as (str: string) => boolean) = (str: string) => {
        stdout += str;
        return true;
    };
    (process.stderr.write as (str: string) => boolean) = (str: string) => {
        _stderr += str;
        return true;
    };
});

afterEach(() => {
    restoreExit();
    process.stdout.write = origStdoutWrite;
    process.stderr.write = origStderrWrite;
    rmSync(TEST_DIR, { recursive: true, force: true });
});

// ── Test 4: --type filter with invalid type → exit 10 ─────────────────────────

describe('handleEvents — invalid event type exits with code 10', () => {
    let sm: StateManager;

    beforeEach(async () => {
        sm = new StateManager({ dbPath: join(TEST_DIR, 'invalid-type.db') });
        await sm.init();
        interceptExit();
    });

    afterEach(() => {
        sm.close();
    });

    test('single invalid type', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-001',
            event_type: 'run.created',
            payload: {},
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-001' }]);

        try {
            await handleEvents({ run: 'run-001', types: ['bogus.type'] }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(10);
    });

    test('partial invalid type in comma-separated list', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-002',
            event_type: 'run.created',
            payload: {},
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-002' }]);

        try {
            await handleEvents({ run: 'run-002', types: ['run.created', 'invalid.phase'] }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(10);
    });
});

// ── Test 8: nonexistent task ref → exit 12 ───────────────────────────────────

describe('handleEvents — nonexistent task ref exits with code 12', () => {
    let sm: StateManager;

    beforeEach(async () => {
        sm = new StateManager({ dbPath: join(TEST_DIR, 'nonexistent.db') });
        await sm.init();
        interceptExit();
    });

    afterEach(() => {
        sm.close();
    });

    test('empty history returns exit 12', async () => {
        const queries = makeFakeQueries([]);

        try {
            await handleEvents({ taskRef: 'does-not-exist' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(12);
    });

    test('history entry with no runId returns exit 12', async () => {
        const queries = makeFakeQueries([{ taskRef: '0300' }]);

        try {
            await handleEvents({ taskRef: '0300' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(12);
    });
});

// ── Test 9a: empty events → "No events found" ─────────────────────────────────

describe('handleEvents — empty event set', () => {
    let sm: StateManager;

    beforeEach(async () => {
        sm = new StateManager({ dbPath: join(TEST_DIR, 'empty.db') });
        await sm.init();
        interceptExit();
    });

    afterEach(() => {
        sm.close();
    });

    test("outputs 'No events found' and exits 0", async () => {
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-empty' }]);
        // Note: no events appended for run-empty

        try {
            await handleEvents({ run: 'run-empty' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);
        expect(stdout).toContain('No events found for run run-empty');
    });
});

// ── Test 9b: text table output format ─────────────────────────────────────────

describe('handleEvents — text table format', () => {
    let sm: StateManager;

    beforeEach(async () => {
        sm = new StateManager({ dbPath: join(TEST_DIR, 'table.db') });
        await sm.init();
        interceptExit();
    });

    afterEach(() => {
        sm.close();
    });

    test('outputs run header + event lines', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-table',
            event_type: 'run.created',
            payload: { task_ref: '0300' },
        });
        await es.append({
            run_id: 'run-table',
            event_type: 'phase.started',
            payload: {
                phase_name: 'develop',
                fromState: 'pending',
                toState: 'running',
            },
        });
        await es.append({
            run_id: 'run-table',
            event_type: 'phase.completed',
            payload: {
                phase_name: 'develop',
                fromState: 'running',
                toState: 'completed',
            },
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-table' }]);

        try {
            await handleEvents({ run: 'run-table' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);

        // Header
        expect(stdout).toContain('Run: run-table');
        expect(stdout).toContain('Total events: 3');

        // All 3 event types present
        expect(stdout).toContain('run.created');
        expect(stdout).toContain('phase.started');
        expect(stdout).toContain('phase.completed');

        // Transition arrow present
        expect(stdout).toContain('→');

        // Exactly 3 event lines (each starts with a sequence number)
        const lines = stdout.split('\n');
        const eventLines = lines.filter((l) => l.startsWith('['));
        expect(eventLines.length).toBe(3);
    });

    test('--phase filter outputs only matching events', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-phase',
            event_type: 'run.created',
            payload: {},
        });
        await es.append({
            run_id: 'run-phase',
            event_type: 'phase.started',
            payload: { phase_name: 'develop' },
        });
        await es.append({
            run_id: 'run-phase',
            event_type: 'phase.started',
            payload: { phase_name: 'review' },
        });
        await es.append({
            run_id: 'run-phase',
            event_type: 'phase.completed',
            payload: { phase_name: 'develop' },
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-phase' }]);

        try {
            await handleEvents({ run: 'run-phase', phase: 'develop' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);

        expect(stdout).toContain('Filter: --phase develop');
        expect(stdout).toContain('Total events: 2');
        expect(stdout).toContain('phase.started');
        expect(stdout).toContain('phase.completed');

        // review phase events should NOT appear
        expect(stdout).not.toContain('review');
    });

    test('--type filter outputs only matching events', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-type',
            event_type: 'run.created',
            payload: {},
        });
        await es.append({
            run_id: 'run-type',
            event_type: 'run.started',
            payload: {},
        });
        await es.append({
            run_id: 'run-type',
            event_type: 'phase.started',
            payload: {},
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-type' }]);

        try {
            await handleEvents({ run: 'run-type', types: ['run.created', 'run.started'] }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);

        expect(stdout).toContain('Filter: --type run.created,run.started');
        expect(stdout).toContain('Total events: 2');
        expect(stdout).toContain('run.created');
        expect(stdout).toContain('run.started');
        expect(stdout).not.toContain('phase.started');
    });

    test('missing both taskRef and run exits with code 10', async () => {
        const queries = makeFakeQueries([]);

        try {
            await handleEvents({}, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(10);
    });

    test('resolves taskRef from history when --run not provided', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-resolved',
            event_type: 'run.created',
            payload: {},
        });
        const queries = makeFakeQueries([{ taskRef: 'docs/tasks2/0300_test.md', runId: 'run-resolved' }]);

        try {
            await handleEvents({ taskRef: '0300' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Run: run-resolved (0300)');
    });

    test('--run flag takes precedence over taskRef', async () => {
        const es = new EventStore(sm.getDb());
        await es.append({
            run_id: 'run-a',
            event_type: 'run.created',
            payload: {},
        });
        await es.append({
            run_id: 'run-b',
            event_type: 'run.created',
            payload: {},
        });
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-a' }]);

        try {
            await handleEvents({ taskRef: '0300', run: 'run-b' }, sm, queries as never);
        } catch {
            /* exit thrown */
        }
        expect(exitCode).toBe(0);
        expect(stdout).toContain('Run: run-b');
        expect(stdout).not.toContain('run-a');
    });

    // ── JSON output coverage (lines 164-189) ─────────────────────────────────────
    // Helper: creates isolated StateManager for JSON output tests
    async function setupJsonTest(
        runId: string,
        taskRef: string,
        events?: Parameters<typeof EventStore.prototype.append>[0][],
    ) {
        const testSm = new StateManager({ dbPath: join(TEST_DIR, `${runId}.db`) });
        await testSm.init();
        await testSm.createRun({
            id: runId,
            task_ref: taskRef,
            phases_requested: 'develop',
            status: 'RUNNING',
            config_snapshot: {},
            pipeline_name: 'test-pipeline',
        });
        if (events) {
            const es = new EventStore(testSm.getDb());
            for (const ev of events) {
                await es.append(ev);
            }
        }
        return testSm;
    }

    test('handleEvents > json output with events', async () => {
        const testSm = await setupJsonTest('run-json', '0300', [
            {
                run_id: 'run-json',
                event_type: 'phase.started',
                payload: { phase_name: 'develop', fromState: 'pending', toState: 'running' },
            },
            {
                run_id: 'run-json',
                event_type: 'phase.completed',
                payload: { phase_name: 'develop', fromState: 'running', toState: 'completed' },
            },
        ]);
        const queries = makeFakeQueries([{ taskRef: '0300', runId: 'run-json' }]);
        const cap = captureTestOutput();
        cap.activate();
        interceptExit();
        try {
            await handleEvents({ taskRef: '0300', run: 'run-json', json: true }, testSm, queries as never);
        } catch {
            /* exit thrown */
        }
        const output = JSON.parse(cap.get());
        expect(exitCode).toBe(0);
        expect(output.runId).toBe('run-json');
        expect(output.taskRef).toBe('0300');
        expect(output.count).toBe(2);
        expect(output.events).toHaveLength(2);
        expect(output.events[0].eventType).toBe('phase.started');
        expect(output.events[0].phaseName).toBe('develop');
        expect(output.events[0].fromState).toBe('pending');
        expect(output.events[0].toState).toBe('running');
        expect(output.filters.types).toBeNull();
        expect(output.filters.phase).toBeNull();
        testSm.close();
        restoreExit();
    });

    test('handleEvents > json output with empty events', async () => {
        const testSm = await setupJsonTest('run-empty-json', '0301');
        const queries = makeFakeQueries([{ taskRef: '0301', runId: 'run-empty-json' }]);
        const cap = captureTestOutput();
        cap.activate();
        interceptExit();
        try {
            await handleEvents({ taskRef: '0301', run: 'run-empty-json', json: true }, testSm, queries as never);
        } catch {
            /* exit thrown */
        }
        const output = JSON.parse(cap.get());
        expect(exitCode).toBe(0);
        expect(output.count).toBe(0);
        expect(output.events).toHaveLength(0);
        testSm.close();
        restoreExit();
    });

    test('handleEvents > json output with type filter', async () => {
        const testSm = await setupJsonTest('run-type-json', '0302', [
            {
                run_id: 'run-type-json',
                event_type: 'phase.started',
                payload: { phase_name: 'develop', fromState: 'pending', toState: 'running' },
            },
            {
                run_id: 'run-type-json',
                event_type: 'phase.completed',
                payload: { phase_name: 'develop', fromState: 'running', toState: 'completed' },
            },
        ]);
        const queries = makeFakeQueries([{ taskRef: '0302', runId: 'run-type-json' }]);
        const cap = captureTestOutput();
        cap.activate();
        interceptExit();
        try {
            await handleEvents(
                { taskRef: '0302', run: 'run-type-json', json: true, types: ['phase.completed'] },
                testSm,
                queries as never,
            );
        } catch {
            /* exit thrown */
        }
        const output = JSON.parse(cap.get());
        expect(exitCode).toBe(0);
        expect(output.count).toBe(1);
        expect(output.events[0].eventType).toBe('phase.completed');
        expect(output.filters.types).toEqual(['phase.completed']);
        testSm.close();
        restoreExit();
    });

    test('handleEvents > json output with phase filter', async () => {
        const testSm = await setupJsonTest('run-phase-json', '0303', [
            {
                run_id: 'run-phase-json',
                event_type: 'phase.started',
                payload: { phase_name: 'develop', fromState: 'pending', toState: 'running' },
            },
            {
                run_id: 'run-phase-json',
                event_type: 'phase.started',
                payload: { phase_name: 'plan', fromState: 'pending', toState: 'running' },
            },
        ]);
        const queries = makeFakeQueries([{ taskRef: '0303', runId: 'run-phase-json' }]);
        const cap = captureTestOutput();
        cap.activate();
        interceptExit();
        try {
            await handleEvents(
                { taskRef: '0303', run: 'run-phase-json', json: true, phase: 'plan' },
                testSm,
                queries as never,
            );
        } catch {
            /* exit thrown */
        }
        const output = JSON.parse(cap.get());
        expect(exitCode).toBe(0);
        expect(output.count).toBe(1);
        expect(output.events[0].phaseName).toBe('plan');
        expect(output.filters.phase).toBe('plan');
        testSm.close();
        restoreExit();
    });

    test('handleEvents > json output with no matching type filter', async () => {
        const testSm = await setupJsonTest('run-no-match-json', '0304', [
            {
                run_id: 'run-no-match-json',
                event_type: 'phase.started',
                payload: { phase_name: 'develop', fromState: 'pending', toState: 'running' },
            },
        ]);
        const queries = makeFakeQueries([{ taskRef: '0304', runId: 'run-no-match-json' }]);
        const cap = captureTestOutput();
        cap.activate();
        interceptExit();
        try {
            await handleEvents(
                { taskRef: '0304', run: 'run-no-match-json', json: true, types: ['phase.completed'] },
                testSm,
                queries as never,
            );
        } catch {
            /* exit thrown */
        }
        const output = JSON.parse(cap.get());
        expect(exitCode).toBe(0);
        expect(output.count).toBe(0);
        expect(output.events).toHaveLength(0);
        expect(output.filters.types).toEqual(['phase.completed']);
        testSm.close();
        restoreExit();
    });
});
