import { describe, test, expect, beforeAll } from 'bun:test';
import { StateManager } from '../scripts/state/manager';
import { EventStore } from '../scripts/state/events';
import { Queries } from '../scripts/state/queries';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../scripts/state/migrations';
import { Database } from 'bun:sqlite';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';

function makeTempDb(): { db: Database; path: string; cleanup: () => void } {
    const dir = mkdtempSync(join(tmpdir(), 'orch-v2-test-'));
    const dbPath = join(dir, 'test.db');
    const db = new Database(dbPath, { create: true });
    return {
        db,
        path: dbPath,
        cleanup: () => {
            db.close();
            try {
                rmSync(dir, { recursive: true });
            } catch {}
        },
    };
}

import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('migrations', () => {
    test('fresh DB gets schema applied', () => {
        const { db, cleanup } = makeTempDb();
        try {
            runMigrations(db);

            // Check tables exist
            const tables = db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                .all() as Array<{ name: string }>;
            const tableNames = tables.map((t) => t.name);

            expect(tableNames).toContain('schema_version');
            expect(tableNames).toContain('events');
            expect(tableNames).toContain('runs');
            expect(tableNames).toContain('phases');
            expect(tableNames).toContain('gate_results');
            expect(tableNames).toContain('rollback_snapshots');
            expect(tableNames).toContain('resource_usage');

            // Check version
            const row = db.prepare('SELECT version FROM schema_version').get() as { version: number };
            expect(row.version).toBe(CURRENT_SCHEMA_VERSION);
        } finally {
            cleanup();
        }
    });

    test('idempotent — calling twice is safe', () => {
        const { db, cleanup } = makeTempDb();
        try {
            runMigrations(db);
            runMigrations(db);

            const row = db.prepare('SELECT COUNT(*) as count FROM schema_version').get() as { count: number };
            // Should have exactly one version entry (INSERT OR REPLACE)
            expect(row.count).toBeGreaterThanOrEqual(1);
        } finally {
            cleanup();
        }
    });

    test('upgrades from older schema version', () => {
        const { db, cleanup } = makeTempDb();
        try {
            // First, create schema_version manually at version 0 (older than CURRENT)
            db.exec(
                'CREATE TABLE schema_version (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
            );
            db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(0);

            // Now run migrations — should detect version 0 < CURRENT and apply DDL
            runMigrations(db);

            // Tables should exist
            const tables = db
                .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                .all() as Array<{ name: string }>;
            const tableNames = tables.map((t) => t.name);
            expect(tableNames).toContain('events');
            expect(tableNames).toContain('runs');
            expect(tableNames).toContain('phases');

            // Version should be updated
            const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as {
                version: number;
            } | null;
            expect(row?.version).toBe(CURRENT_SCHEMA_VERSION);
        } finally {
            cleanup();
        }
    });
});

describe('EventStore', () => {
    test('append and query events', async () => {
        const { db, cleanup } = makeTempDb();
        try {
            runMigrations(db);
            const store = new EventStore(db);

            const seq = await store.append({
                run_id: 'run-1',
                event_type: 'run.started',
                payload: { task_ref: '0266' },
            });
            expect(seq).toBeGreaterThan(0);

            await store.append({
                run_id: 'run-1',
                event_type: 'phase.started',
                payload: { phase: 'intake' },
            });

            await store.append({
                run_id: 'run-2',
                event_type: 'run.started',
                payload: { task_ref: '0270' },
            });

            // Query all for run
            const events = await store.getEventsForRun('run-1');
            expect(events).toHaveLength(2);
            expect(events[0].event_type).toBe('run.started');
            expect(events[1].event_type).toBe('phase.started');

            // Query by type
            const started = await store.query('run-1', ['run.started']);
            expect(started).toHaveLength(1);

            // Query wrong run
            const empty = await store.getEventsForRun('nonexistent');
            expect(empty).toHaveLength(0);
        } finally {
            cleanup();
        }
    });

    test('prune old events', async () => {
        const { db, cleanup } = makeTempDb();
        try {
            runMigrations(db);
            const store = new EventStore(db);

            await store.append({ run_id: 'r1', event_type: 'run.started', payload: {} });
            await store.append({ run_id: 'r2', event_type: 'run.started', payload: {} });

            // Prune events older than 0ms (everything)
            const deleted = await store.prune(0);
            expect(deleted).toBeGreaterThanOrEqual(2);

            const remaining = await store.getEventsForRun('r1');
            expect(remaining).toHaveLength(0);
        } finally {
            cleanup();
        }
    });
});

describe('StateManager', () => {
    function makeManager(): { mgr: StateManager; cleanup: () => void } {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-test-'));
        const dbPath = join(dir, 'test.db');
        const mgr = new StateManager({ dbPath });
        return {
            mgr,
            cleanup: () => {
                try {
                    mgr.close();
                } catch {}
                try {
                    rmSync(dir, { recursive: true });
                } catch {}
            },
        };
    }

    test('create and retrieve run', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            const runId = await mgr.createRun({
                id: 'run-1',
                task_ref: '0266',
                preset: 'complex',
                phases_requested: 'intake,arch,design',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            expect(runId).toBe('run-1');

            const run = await mgr.getRun('run-1');
            expect(run).not.toBeNull();
            expect(run?.id).toBe('run-1');
            expect(run?.task_ref).toBe('0266');
            expect(run?.preset).toBe('complex');
            expect(run?.status).toBe('RUNNING');
        } finally {
            cleanup();
        }
    });

    test('update run status', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-2',
                task_ref: '0267',
                phases_requested: 'test',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.updateRunStatus('run-2', 'COMPLETED');

            const run = await mgr.getRun('run-2');
            expect(run?.status).toBe('COMPLETED');
        } finally {
            cleanup();
        }
    });

    test('get active runs', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-a',
                task_ref: '001',
                phases_requested: 'test',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.createRun({
                id: 'run-b',
                task_ref: '002',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            const active = await mgr.getActiveRuns();
            expect(active).toHaveLength(1);
            expect(active[0].id).toBe('run-a');
        } finally {
            cleanup();
        }
    });

    test('phase CRUD', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-3',
                task_ref: '0268',
                phases_requested: 'implement,test',
                status: 'RUNNING',
                config_snapshot: {
                    phases: {
                        implement: { skill: 'rd3:code-implement-common' },
                        test: { skill: 'rd3:sys-testing' },
                    },
                },
                pipeline_name: 'default',
            });

            // Create phases explicitly (runner does this, not createRun)
            await mgr.createPhase({
                run_id: 'run-3',
                name: 'implement',
                status: 'pending',
                skill: 'rd3:code-implement-common',
                rework_iteration: 0,
            });
            await mgr.createPhase({
                run_id: 'run-3',
                name: 'test',
                status: 'pending',
                skill: 'rd3:sys-testing',
                rework_iteration: 0,
            });

            // Check phases were created
            const phases = await mgr.getPhases('run-3');
            expect(phases).toHaveLength(2);

            // Update phase status
            await mgr.updatePhase('run-3', 'implement', 'running', {
                started_at: new Date(),
            });

            const phase = await mgr.getPhase('run-3', 'implement');
            expect(phase?.status).toBe('running');
            expect(phase?.started_at).toBeDefined();
        } finally {
            cleanup();
        }
    });

    test('gate results', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-4',
                task_ref: '0269',
                phases_requested: 'test',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveGateResult({
                run_id: 'run-4',
                phase_name: 'test',
                step_name: 'coverage-check',
                checker_method: 'threshold',
                passed: true,
                evidence: { actual: 85, threshold: 80 },
                duration_ms: 150,
            });

            const results = await mgr.getGateResults('run-4', 'test');
            expect(results).toHaveLength(1);
            expect(results[0].passed).toBe(true);
            expect(results[0].evidence).toEqual({ actual: 85, threshold: 80 });
        } finally {
            cleanup();
        }
    });

    test('gate results preserve advisory flag and retain repeated attempts', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-4b',
                task_ref: '0319',
                phases_requested: 'review',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveGateResult({
                run_id: 'run-4b',
                phase_name: 'review',
                step_name: 'auto-gate',
                checker_method: 'llm',
                passed: false,
                advisory: true,
                evidence: { severity: 'advisory', checklist: [{ item: 'a', passed: false }] },
                duration_ms: 25,
            });
            await mgr.saveGateResult({
                run_id: 'run-4b',
                phase_name: 'review',
                step_name: 'auto-gate',
                checker_method: 'llm',
                passed: true,
                evidence: { severity: 'blocking', checklist: [{ item: 'a', passed: true }] },
                duration_ms: 30,
            });

            const results = await mgr.getGateResults('run-4b', 'review');
            expect(results).toHaveLength(2);
            expect(results[0]?.advisory).toBe(true);
            expect(results[0]?.passed).toBe(false);
            expect(results[1]?.passed).toBe(true);
            expect(results.map((result) => result.step_name)).toEqual(['auto-gate', 'auto-gate#2']);
        } finally {
            cleanup();
        }
    });

    test('phase evidence persists and is queryable by phase', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-4c',
                task_ref: '0319',
                phases_requested: 'implement',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.savePhaseEvidence({
                run_id: 'run-4c',
                phase_name: 'implement',
                rework_iteration: 0,
                evidence: {
                    stdout: 'phase stdout',
                    stderr: 'phase stderr',
                    files_changed: ['a.ts'],
                    files_added: ['b.ts'],
                },
            });

            const evidence = await mgr.getPhaseEvidence('run-4c', 'implement');
            expect(evidence).toHaveLength(1);
            expect(evidence[0]?.rework_iteration).toBe(0);
            expect(evidence[0]?.evidence).toMatchObject({
                stdout: 'phase stdout',
                stderr: 'phase stderr',
                files_changed: ['a.ts'],
                files_added: ['b.ts'],
            });
        } finally {
            cleanup();
        }
    });

    test('resource usage', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-5',
                task_ref: '0270',
                phases_requested: 'test',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveResourceUsage({
                run_id: 'run-5',
                phase_name: 'test',
                model_id: 'claude-sonnet-4',
                model_provider: 'anthropic',
                input_tokens: 10000,
                output_tokens: 3000,
                cache_read_tokens: 5000,
                cache_creation_tokens: 500,
                wall_clock_ms: 30000,
                execution_ms: 28000,
            });

            const usage = await mgr.getResourceUsage('run-5');
            expect(usage).toHaveLength(1);
            expect(usage[0].input_tokens).toBe(10000);
            expect(usage[0].output_tokens).toBe(3000);
        } finally {
            cleanup();
        }
    });

    test('rollback snapshot', async () => {
        const { mgr, cleanup } = makeManager();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-6',
                task_ref: '0271',
                phases_requested: 'test',
                status: 'RUNNING',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveRollbackSnapshot({
                run_id: 'run-6',
                phase_name: 'implement',
                git_head: 'abc123',
                files_before: { 'src/foo.ts': 'old content' },
                files_after: { 'src/foo.ts': 'new content' },
            });

            const snap = await mgr.getRollbackSnapshot('run-6', 'implement');
            expect(snap).not.toBeNull();
            expect(snap?.git_head).toBe('abc123');
            expect(snap?.files_before).toEqual({ 'src/foo.ts': 'old content' });
        } finally {
            cleanup();
        }
    });
});

describe('Queries', () => {
    function makeQueries(): { queries: Queries; mgr: StateManager; cleanup: () => void } {
        const dir = mkdtempSync(join(tmpdir(), 'orch-v2-test-'));
        const dbPath = join(dir, 'test.db');
        const mgr = new StateManager({ dbPath });
        return {
            mgr,
            queries: new Queries((mgr as unknown as { db: Database }).db),
            cleanup: () => {
                try {
                    mgr.close();
                } catch {}
                try {
                    rmSync(dir, { recursive: true });
                } catch {}
            },
        };
    }

    test('getRunSummary with resource usage', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-s1',
                task_ref: '0266',
                preset: 'complex',
                phases_requested: 'implement,test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveResourceUsage({
                run_id: 'run-s1',
                phase_name: 'implement',
                model_id: 'claude-sonnet-4',
                model_provider: 'anthropic',
                input_tokens: 10000,
                output_tokens: 3000,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 30000,
                execution_ms: 28000,
            });

            const summary = await queries.getRunSummary('run-s1');
            expect(summary).not.toBeNull();
            expect(summary?.run.id).toBe('run-s1');
            expect(summary?.totalInputTokens).toBe(10000);
            expect(summary?.totalOutputTokens).toBe(3000);
            expect(summary?.modelsUsed).toContain('claude-sonnet-4');
        } finally {
            cleanup();
        }
    });

    test('getHistory with filters', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'h1',
                task_ref: '001',
                preset: 'simple',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.createRun({
                id: 'h2',
                task_ref: '002',
                preset: 'complex',
                phases_requested: 'test',
                status: 'FAILED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            // All history
            const all = await queries.getHistory(10);
            expect(all).toHaveLength(2);

            // Filter by preset
            const complex = await queries.getHistory(10, { preset: 'complex' });
            expect(complex).toHaveLength(1);
            expect(complex[0].runId).toBe('h2');

            // Filter failed
            const failed = await queries.getHistory(10, { failed: true });
            expect(failed).toHaveLength(1);
            expect(failed[0].status).toBe('FAILED');
        } finally {
            cleanup();
        }
    });

    test('getPresetStats', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 's1',
                task_ref: '001',
                preset: 'simple',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });
            await mgr.createRun({
                id: 's2',
                task_ref: '002',
                preset: 'simple',
                phases_requested: 'test',
                status: 'FAILED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });
            await mgr.createRun({
                id: 's3',
                task_ref: '003',
                preset: 'complex',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            const stats = await queries.getPresetStats();
            expect(stats).toHaveLength(2);

            const simpleStat = stats.find((s) => s.preset === 'simple');
            expect(simpleStat?.totalRuns).toBe(2);
            expect(simpleStat?.successes).toBe(1);
        } finally {
            cleanup();
        }
    });

    test('getRunSummary returns null for non-existent run', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            const summary = await queries.getRunSummary('nonexistent');
            expect(summary).toBeNull();
        } finally {
            cleanup();
        }
    });

    test('getRunSummary with phases and multiple resource entries', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-full',
                task_ref: '0300',
                preset: 'standard',
                phases_requested: 'implement,test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.createPhase({
                run_id: 'run-full',
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                rework_iteration: 0,
            });
            await mgr.createPhase({
                run_id: 'run-full',
                name: 'test',
                status: 'completed',
                skill: 'rd3:sys-testing',
                rework_iteration: 1,
            });

            await mgr.saveResourceUsage({
                run_id: 'run-full',
                phase_name: 'implement',
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 5000,
                output_tokens: 2000,
                cache_read_tokens: 1000,
                cache_creation_tokens: 500,
                wall_clock_ms: 15000,
                execution_ms: 14000,
            });
            await mgr.saveResourceUsage({
                run_id: 'run-full',
                phase_name: 'test',
                model_id: 'claude-3',
                model_provider: 'anthropic',
                input_tokens: 3000,
                output_tokens: 1000,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 10000,
                execution_ms: 9000,
            });

            const summary = await queries.getRunSummary('run-full');
            expect(summary).not.toBeNull();
            expect(summary?.phases).toHaveLength(2);
            expect(summary?.totalInputTokens).toBe(8000);
            expect(summary?.totalOutputTokens).toBe(3000);
            expect(summary?.totalWallMs).toBe(25000);
            expect(summary?.modelsUsed).toHaveLength(2);
            expect(summary?.modelsUsed).toContain('gpt-4');
            expect(summary?.modelsUsed).toContain('claude-3');
        } finally {
            cleanup();
        }
    });

    test('getHistory with since filter', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'h-since',
                task_ref: '040',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            // Filter with a since date far in the past
            const results = await queries.getHistory(10, { since: '2000-01-01' });
            expect(results).toHaveLength(1);
            expect(results[0].runId).toBe('h-since');
        } finally {
            cleanup();
        }
    });

    test('getTokenUsageByModel aggregates correctly', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-tok',
                task_ref: '050',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveResourceUsage({
                run_id: 'run-tok',
                phase_name: 'implement',
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 5000,
                output_tokens: 2000,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 10000,
                execution_ms: 9000,
            });
            await mgr.saveResourceUsage({
                run_id: 'run-tok',
                phase_name: 'test',
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 3000,
                output_tokens: 1000,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 5000,
                execution_ms: 4500,
            });
            await mgr.saveResourceUsage({
                run_id: 'run-tok',
                phase_name: 'implement',
                model_id: 'claude-3',
                model_provider: 'anthropic',
                input_tokens: 4000,
                output_tokens: 1500,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 8000,
                execution_ms: 7000,
            });

            const usage = await queries.getTokenUsageByModel();
            expect(usage).toHaveLength(2);

            const gpt4 = usage.find((u) => u.model_id === 'gpt-4');
            expect(gpt4?.total_input).toBe(8000);
            expect(gpt4?.total_output).toBe(3000);
            expect(gpt4?.call_count).toBe(2);

            const claude3 = usage.find((u) => u.model_id === 'claude-3');
            expect(claude3?.total_input).toBe(4000);
            expect(claude3?.call_count).toBe(1);
        } finally {
            cleanup();
        }
    });

    test('getResourceUsageForRun returns records', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-res',
                task_ref: '060',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            await mgr.saveResourceUsage({
                run_id: 'run-res',
                phase_name: 'implement',
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 1000,
                output_tokens: 500,
                cache_read_tokens: 100,
                cache_creation_tokens: 50,
                wall_clock_ms: 5000,
                execution_ms: 4000,
            });

            const records = await queries.getResourceUsageForRun('run-res');
            expect(records).toHaveLength(1);
            expect(records[0].model_id).toBe('gpt-4');
            expect(records[0].input_tokens).toBe(1000);
            expect(records[0].output_tokens).toBe(500);
            expect(records[0].cache_read_tokens).toBe(100);
            expect(records[0].cache_creation_tokens).toBe(50);
        } finally {
            cleanup();
        }
    });

    test('getTrends returns aggregated data', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 't1',
                task_ref: '070',
                preset: 'simple',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });
            await mgr.createRun({
                id: 't2',
                task_ref: '071',
                preset: 'simple',
                phases_requested: 'test',
                status: 'FAILED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });
            await mgr.createRun({
                id: 't3',
                task_ref: '072',
                preset: 'complex',
                phases_requested: 'test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            const trends = await queries.getTrends(30);
            expect(trends.periodDays).toBe(30);
            expect(trends.totalRuns).toBe(3);
            expect(trends.successes).toBe(2);
            expect(trends.successRate).toBe(67); // 2/3 * 100 = 66.67 → rounds to 67

            expect(trends.presets).toHaveLength(2);

            const simpleTrend = trends.presets.find((p) => p.preset === 'simple');
            expect(simpleTrend?.totalRuns).toBe(2);
            expect(simpleTrend?.successes).toBe(1);
        } finally {
            cleanup();
        }
    });

    test('getTrends with no data returns zeros', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            const trends = await queries.getTrends(30);
            expect(trends.totalRuns).toBe(0);
            expect(trends.successes).toBe(0);
            expect(trends.successRate).toBe(0);
            expect(trends.presets).toHaveLength(0);
        } finally {
            cleanup();
        }
    });

    test('getAveragePhaseDuration aggregates phase times', async () => {
        const { queries, mgr, cleanup } = makeQueries();
        try {
            await mgr.init();

            await mgr.createRun({
                id: 'run-avg',
                task_ref: '080',
                preset: 'standard',
                phases_requested: 'implement,test',
                status: 'COMPLETED',
                config_snapshot: { phases: {} },
                pipeline_name: 'default',
            });

            // Create phases with explicit started_at / completed_at
            await mgr.createPhase({
                run_id: 'run-avg',
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                rework_iteration: 0,
            });
            // Manually update to set timestamps
            const db = (mgr as unknown as { db: Database }).db;
            db.prepare(
                "UPDATE phases SET started_at = '2024-01-15T10:00:00', completed_at = '2024-01-15T11:00:00' WHERE run_id = ? AND name = ?",
            ).run('run-avg', 'implement');

            await mgr.createPhase({
                run_id: 'run-avg',
                name: 'test',
                status: 'completed',
                skill: 'rd3:sys-testing',
                rework_iteration: 0,
            });
            db.prepare(
                "UPDATE phases SET started_at = '2024-01-15T11:00:00', completed_at = '2024-01-15T11:30:00' WHERE run_id = ? AND name = ?",
            ).run('run-avg', 'test');

            await mgr.saveResourceUsage({
                run_id: 'run-avg',
                phase_name: 'implement',
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 2000,
                output_tokens: 1000,
                cache_read_tokens: 0,
                cache_creation_tokens: 0,
                wall_clock_ms: 3600000,
                execution_ms: 3500000,
            });

            const durations = await queries.getAveragePhaseDuration();
            expect(durations.length).toBeGreaterThan(0);

            const impl = durations.find((d) => d.phase_name === 'implement');
            expect(impl).toBeDefined();
            expect(impl?.preset).toBe('standard');
            expect(impl?.avg_ms).toBeGreaterThan(0);
        } finally {
            cleanup();
        }
    });
});
