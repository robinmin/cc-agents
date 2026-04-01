import { describe, test, expect, beforeAll } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { StateManager } from '../scripts/state/manager';
import { Pruner, parseDuration } from '../scripts/state/prune';
import { runMigrations } from '../scripts/state/migrations';
import { parseArgs } from '../scripts/cli/commands';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

function createTestContext(): { state: StateManager; pruner: Pruner; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'orch-v2-prune-'));
    const dbPath = join(dir, 'state.db');
    const state = new StateManager({ dbPath });
    // StateManager.init() runs migrations synchronously via runMigrations()
    runMigrations(state.getDb());
    const pruner = new Pruner(state.getDb());
    return {
        state,
        pruner,
        cleanup: () => {
            state.close();
            try {
                rmSync(dir, { recursive: true });
            } catch {}
        },
    };
}

/** Seed helper: create a run with events, gate results, resource usage, and rollback snapshots */
function seedRun(
    state: StateManager,
    runId: string,
    taskRef: string,
    createdAt: Date,
    phaseNames: string[] = ['implement'],
): void {
    const db = state.getDb();
    db.prepare(
        `INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at, updated_at)
     VALUES (?, ?, 'default', 'implement', 'COMPLETED', '{}', 'test', ?, ?)`,
    ).run(runId, taskRef, createdAt.toISOString(), createdAt.toISOString());

    for (const phaseName of phaseNames) {
        db.prepare(
            `INSERT INTO phases (run_id, name, status, skill, payload, rework_iteration, started_at, completed_at)
       VALUES (?, ?, 'completed', 'test-skill', NULL, 0, ?, ?)`,
        ).run(runId, phaseName, createdAt.toISOString(), createdAt.toISOString());

        // Insert events
        db.prepare('INSERT INTO events (run_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?)').run(
            runId,
            'phase.completed',
            JSON.stringify({ phase: phaseName }),
            createdAt.toISOString(),
        );
        db.prepare('INSERT INTO events (run_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?)').run(
            runId,
            'phase.started',
            JSON.stringify({ phase: phaseName }),
            createdAt.toISOString(),
        );

        // Insert gate results
        db.prepare(
            `INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, evidence, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).run(runId, phaseName, 'check-1', 'file-exists', 1, JSON.stringify({ ok: true }), 100);

        // Insert resource usage
        db.prepare(
            `INSERT INTO resource_usage (run_id, phase_name, model_id, model_provider, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, wall_clock_ms, execution_ms, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(runId, phaseName, 'gpt-4', 'openai', 100, 50, 0, 0, 5000, 4500, createdAt.toISOString());

        // Insert rollback snapshot
        db.prepare(
            `INSERT INTO rollback_snapshots (run_id, phase_name, git_head, files_before, files_after)
       VALUES (?, ?, ?, ?, ?)`,
        ).run(runId, phaseName, 'abc123', JSON.stringify({ a: 1 }), JSON.stringify({ b: 2 }));
    }
}

// ─── Duration Parser ──────────────────────────────────────────────────────────

describe('parseDuration', () => {
    test('parses seconds', () => {
        const result = parseDuration('30s');
        expect(result.ms).toBe(30 * 1000);
        expect(result.original).toBe('30s');
    });

    test('parses minutes', () => {
        const result = parseDuration('30m');
        expect(result.ms).toBe(30 * 60 * 1000);
    });

    test('parses hours', () => {
        const result = parseDuration('2h');
        expect(result.ms).toBe(2 * 60 * 60 * 1000);
    });

    test('parses days', () => {
        const result = parseDuration('30d');
        expect(result.ms).toBe(30 * 24 * 60 * 60 * 1000);
    });

    test('parses weeks', () => {
        const result = parseDuration('2w');
        expect(result.ms).toBe(2 * 7 * 24 * 60 * 60 * 1000);
    });

    test('parses months', () => {
        const result = parseDuration('6M');
        expect(result.ms).toBe(6 * 30 * 24 * 60 * 60 * 1000);
    });

    test('parses years', () => {
        const result = parseDuration('1y');
        expect(result.ms).toBe(365 * 24 * 60 * 60 * 1000);
    });

    test('parses decimal values', () => {
        const result = parseDuration('1.5d');
        expect(result.ms).toBe(Math.floor(1.5 * 24 * 60 * 60 * 1000));
    });

    test('throws on invalid format', () => {
        expect(() => parseDuration('abc')).toThrow('Invalid duration');
        expect(() => parseDuration('30')).toThrow('Invalid duration');
        expect(() => parseDuration('')).toThrow('Invalid duration');
        expect(() => parseDuration('30x')).toThrow('Invalid duration');
    });

    test('handles whitespace', () => {
        const result = parseDuration(' 30d ');
        expect(result.ms).toBe(30 * 24 * 60 * 60 * 1000);
    });
});

// ─── Pruner — Time-based ──────────────────────────────────────────────────────

describe('Pruner — time-based pruning', () => {
    test('identifies runs older than cutoff', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-old', 'task-1', oldDate);
            seedRun(state, 'run-recent', 'task-2', recentDate);

            const runIds = pruner.getRunIdsOlderThan(30 * 24 * 60 * 60 * 1000);
            expect(runIds).toEqual(['run-old']);
        } finally {
            cleanup();
        }
    });

    test('returns empty array when no runs qualify', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-recent', 'task-1', recentDate);

            const runIds = pruner.getRunIdsOlderThan(30 * 24 * 60 * 60 * 1000);
            expect(runIds).toHaveLength(0);
        } finally {
            cleanup();
        }
    });

    test('deletes events for qualifying runs', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-old', 'task-1', oldDate);
            seedRun(state, 'run-recent', 'task-2', recentDate);

            const result = pruner.prune({ olderThan: '30d' });

            expect(result.runsAffected).toBe(1);
            expect(result.eventsDeleted).toBe(2);
            expect(result.gateResultsDeleted).toBe(1);
            expect(result.resourceUsageDeleted).toBe(1);
            expect(result.rollbackSnapshotsDeleted).toBe(1);
        } finally {
            cleanup();
        }
    });

    test('preserves runs and phases records', async () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-old', 'task-1', oldDate);

            pruner.prune({ olderThan: '30d' });

            const run = await state.getRun('run-old');
            expect(run).not.toBeNull();
            expect(run?.id).toBe('run-old');

            const phases = await state.getPhases('run-old');
            expect(phases).toHaveLength(1);
        } finally {
            cleanup();
        }
    });

    test('prunes multiple old runs', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const date40d = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
            const date60d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const date10d = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-40d', 'task-1', date40d);
            seedRun(state, 'run-60d', 'task-2', date60d);
            seedRun(state, 'run-10d', 'task-3', date10d);

            const result = pruner.prune({ olderThan: '30d' });

            expect(result.runsAffected).toBe(2);
            expect(result.eventsDeleted).toBe(4);
        } finally {
            cleanup();
        }
    });
});

// ─── Pruner — Count-based ─────────────────────────────────────────────────────

describe('Pruner — count-based pruning', () => {
    test('keeps last N runs', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-2', 'task-2', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-3', 'task-3', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-4', 'task-4', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));

            const runIds = pruner.getRunIdsBeyondKeepLast(2);
            expect(runIds).toEqual(['run-1', 'run-2']);
        } finally {
            cleanup();
        }
    });

    test('returns empty when all runs fit within keep-last', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', now);
            seedRun(state, 'run-2', 'task-2', now);

            const runIds = pruner.getRunIdsBeyondKeepLast(5);
            expect(runIds).toHaveLength(0);
        } finally {
            cleanup();
        }
    });

    test('prunes runs beyond keep-last count', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-2', 'task-2', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-3', 'task-3', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));

            const result = pruner.prune({ keepLast: 1 });

            expect(result.runsAffected).toBe(2);
            expect(result.eventsDeleted).toBe(4);
        } finally {
            cleanup();
        }
    });

    test('preserves runs and phases records for count-based', async () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-2', 'task-2', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));

            pruner.prune({ keepLast: 1 });

            const run1 = await state.getRun('run-1');
            const run2 = await state.getRun('run-2');
            expect(run1).not.toBeNull();
            expect(run2).not.toBeNull();

            // Events for run-1 are gone, run-2 preserved
            const db = state.getDb();
            const events1 = (
                db.prepare('SELECT COUNT(*) as c FROM events WHERE run_id = ?').get('run-1') as { c: number }
            ).c;
            const events2 = (
                db.prepare('SELECT COUNT(*) as c FROM events WHERE run_id = ?').get('run-2') as { c: number }
            ).c;
            expect(events1).toBe(0);
            expect(events2).toBe(2);
        } finally {
            cleanup();
        }
    });
});

// ─── Pruner — Dry-run mode ────────────────────────────────────────────────────

describe('Pruner — dry-run mode', () => {
    test('dry-run reports counts without deleting', async () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-old', 'task-1', oldDate);

            const result = pruner.prune({ olderThan: '30d', dryRun: true });

            expect(result.runsAffected).toBe(1);
            expect(result.eventsDeleted).toBe(2);

            // Verify events were NOT deleted
            const db = state.getDb();
            const count = (
                db.prepare('SELECT COUNT(*) as c FROM events WHERE run_id = ?').get('run-old') as { c: number }
            ).c;
            expect(count).toBe(2);
        } finally {
            cleanup();
        }
    });

    test('dry-run with keep-last reports correctly', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-2', 'task-2', new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-3', 'task-3', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));

            const result = pruner.prune({ keepLast: 1, dryRun: true });

            expect(result.runsAffected).toBe(2);
            expect(result.eventsDeleted).toBe(4);

            // Verify nothing was actually deleted
            const db = state.getDb();
            const total = (db.prepare('SELECT COUNT(*) as c FROM events').get() as { c: number }).c;
            expect(total).toBe(6);
        } finally {
            cleanup();
        }
    });
});

// ─── Pruner — Default behavior ────────────────────────────────────────────────

describe('Pruner — default behavior', () => {
    test('no arguments defaults to 30 days', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const date20d = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
            const date40d = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-20d', 'task-1', date20d);
            seedRun(state, 'run-40d', 'task-2', date40d);

            const result = pruner.prune({});

            expect(result.runsAffected).toBe(1);
            expect(result.eventsDeleted).toBe(2);
        } finally {
            cleanup();
        }
    });
});

// ─── Pruner — Edge cases ──────────────────────────────────────────────────────

describe('Pruner — edge cases', () => {
    test('empty database — no errors', () => {
        const { pruner, cleanup } = createTestContext();
        try {
            const result = pruner.prune({ olderThan: '30d' });
            expect(result.runsAffected).toBe(0);
            expect(result.eventsDeleted).toBe(0);
        } finally {
            cleanup();
        }
    });

    test('run with multiple phases — all pruned', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-multi', 'task-1', oldDate, ['implement', 'test', 'review']);

            const result = pruner.prune({ olderThan: '30d' });

            expect(result.runsAffected).toBe(1);
            expect(result.eventsDeleted).toBe(6);
            expect(result.gateResultsDeleted).toBe(3);
            expect(result.resourceUsageDeleted).toBe(3);
            expect(result.rollbackSnapshotsDeleted).toBe(3);
        } finally {
            cleanup();
        }
    });

    test('keep-last zero — no pruning', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            seedRun(state, 'run-1', 'task-1', now);

            const result = pruner.prune({ keepLast: 0 });
            expect(result.runsAffected).toBe(0);
        } finally {
            cleanup();
        }
    });

    test('excludes active (RUNNING/PAUSED) runs from time-based pruning', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
            const db = state.getDb();

            // Insert a RUNNING run old enough to be pruned
            db.prepare(
                `INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at, updated_at)
             VALUES (?, ?, 'default', 'implement', 'RUNNING', '{}', 'test', ?, ?)`,
            ).run('run-active', 'task-active', oldDate.toISOString(), oldDate.toISOString());
            db.prepare('INSERT INTO events (run_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?)').run(
                'run-active',
                'phase.started',
                '{}',
                oldDate.toISOString(),
            );

            // Insert a completed run of the same age
            seedRun(state, 'run-completed', 'task-done', oldDate);

            const runIds = pruner.getRunIdsOlderThan(30 * 24 * 60 * 60 * 1000);
            expect(runIds).toEqual(['run-completed']);
            expect(runIds).not.toContain('run-active');
        } finally {
            cleanup();
        }
    });

    test('excludes PAUSED runs from count-based pruning', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const db = state.getDb();
            const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            // Insert a PAUSED run (oldest)
            db.prepare(
                `INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at, updated_at)
             VALUES (?, ?, 'default', 'implement', 'PAUSED', '{}', 'test', ?, ?)`,
            ).run('run-paused', 'task-paused', oldDate.toISOString(), oldDate.toISOString());
            db.prepare('INSERT INTO events (run_id, event_type, payload, timestamp) VALUES (?, ?, ?, ?)').run(
                'run-paused',
                'phase.started',
                '{}',
                oldDate.toISOString(),
            );

            // Insert completed runs (more recent)
            seedRun(state, 'run-completed-1', 'task-1', new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));
            seedRun(state, 'run-completed-2', 'task-2', new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000));

            const runIds = pruner.getRunIdsBeyondKeepLast(1);
            // Only the completed run should be pruned, not the paused one
            expect(runIds).toEqual(['run-completed-1']);
            expect(runIds).not.toContain('run-paused');
        } finally {
            cleanup();
        }
    });
});

// ─── CLI — prune flag parsing ─────────────────────────────────────────────────

describe('CLI — prune flag parsing', () => {
    test('parses --older-than', () => {
        const result = parseArgs(['prune', '--older-than', '90d']);
        expect(result.command).toBe('prune');
        expect(result.options.olderThan).toBe('90d');
    });

    test('parses --keep-last', () => {
        const result = parseArgs(['prune', '--keep-last', '5']);
        expect(result.command).toBe('prune');
        expect(result.options.keepLast).toBe(5);
    });

    test('parses --dry-run with prune', () => {
        const result = parseArgs(['prune', '--older-than', '30d', '--dry-run']);
        expect(result.options.dryRun).toBe(true);
        expect(result.options.olderThan).toBe('30d');
    });

    test('parses prune with no options', () => {
        const result = parseArgs(['prune']);
        expect(result.command).toBe('prune');
    });

    test('parses --keep-last and --dry-run combined', () => {
        const result = parseArgs(['prune', '--keep-last', '10', '--dry-run']);
        expect(result.options.keepLast).toBe(10);
        expect(result.options.dryRun).toBe(true);
    });
});

// ─── countForRunIds ───────────────────────────────────────────────────────────

describe('Pruner — countForRunIds', () => {
    test('counts correctly for multiple runs', () => {
        const { state, pruner, cleanup } = createTestContext();
        try {
            const now = new Date();
            const oldDate1 = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);
            const oldDate2 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            seedRun(state, 'run-1', 'task-1', oldDate1, ['implement', 'test']);
            seedRun(state, 'run-2', 'task-2', oldDate2, ['implement']);

            const counts = pruner.countForRunIds(['run-1', 'run-2']);

            expect(counts.runsAffected).toBe(2);
            expect(counts.eventsDeleted).toBe(6); // 2 phases × 2 + 1 phase × 2
            expect(counts.gateResultsDeleted).toBe(3);
            expect(counts.resourceUsageDeleted).toBe(3);
            expect(counts.rollbackSnapshotsDeleted).toBe(3);
        } finally {
            cleanup();
        }
    });

    test('returns zeros for empty run IDs', () => {
        const { pruner, cleanup } = createTestContext();
        try {
            const counts = pruner.countForRunIds([]);
            expect(counts.runsAffected).toBe(0);
            expect(counts.eventsDeleted).toBe(0);
        } finally {
            cleanup();
        }
    });
});
