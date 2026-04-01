import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { migrateFromV1 } from '../scripts/state/migrate-v1';
import { SCHEMA_DDL, CURRENT_SCHEMA_VERSION } from '../scripts/state/migrations';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('migrateFromV1', () => {
    let db: Database;
    let tempDir: string;

    beforeEach(() => {
        db = new Database(':memory:');
        db.exec(SCHEMA_DDL);
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(CURRENT_SCHEMA_VERSION);

        tempDir = join(tmpdir(), `orch-v2-migrate-test-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        db.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    function writeV1State(taskRef: string, state: Record<string, unknown>): string {
        const dir = join(tempDir, taskRef);
        mkdirSync(dir, { recursive: true });
        const filePath = join(dir, `${taskRef}-run.json`);
        writeFileSync(filePath, JSON.stringify(state, null, 2));
        return filePath;
    }

    test('migrates empty directory', async () => {
        const result = await migrateFromV1(db, tempDir);
        expect(result.totalFiles).toBe(0);
        expect(result.migrated).toBe(0);
        expect(result.skipped).toBe(0);
    });

    test('migrates a completed v1 state', async () => {
        writeV1State('0200', {
            task_ref: '0200',
            profile: 'standard',
            status: 'completed',
            created_at: '2026-03-31T12:00:00Z',
            updated_at: '2026-03-31T12:30:00Z',
            phases: [
                {
                    number: 5,
                    name: 'Implementation',
                    skill: 'rd3:code-implement-common',
                    gate: 'auto',
                    status: 'completed',
                    started_at: '2026-03-31T12:00:00Z',
                    completed_at: '2026-03-31T12:20:00Z',
                    rework_iterations: 0,
                },
                {
                    number: 6,
                    name: 'Unit Testing',
                    skill: 'rd3:sys-testing',
                    gate: 'auto',
                    status: 'completed',
                    started_at: '2026-03-31T12:20:00Z',
                    completed_at: '2026-03-31T12:30:00Z',
                    rework_iterations: 0,
                },
            ],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(1);
        expect(result.skipped).toBe(0);
        expect(result.errors.length).toBe(0);

        const runs = db.prepare('SELECT * FROM runs WHERE task_ref = ?').all('0200');
        expect(runs.length).toBe(1);
        expect((runs[0] as Record<string, unknown>).status).toBe('COMPLETED');
        expect((runs[0] as Record<string, unknown>).preset).toBe('standard');

        const phases = db.prepare('SELECT * FROM phases WHERE run_id LIKE ? ORDER BY name').all('v1-0200%');
        expect(phases.length).toBe(2);
    });

    test('migrates a failed v1 state with evidence', async () => {
        writeV1State('0292', {
            task_ref: '0292',
            profile: 'unit',
            status: 'failed',
            created_at: '2026-03-31T21:06:07Z',
            updated_at: '2026-03-31T21:06:07Z',
            coverage_threshold: 90,
            phases: [
                {
                    number: 6,
                    name: 'Unit Testing',
                    skill: 'rd3:sys-testing',
                    gate: 'auto',
                    status: 'failed',
                    started_at: '2026-03-31T21:06:07Z',
                    completed_at: '2026-03-31T21:06:07Z',
                    rework_iterations: 1,
                    error: 'Timed out after 123ms',
                    evidence: [
                        { kind: 'timeout', detail: 'Phase 6 timed out after 123ms' },
                        {
                            kind: 'rework-attempt',
                            detail: 'Phase 6 failed (iteration 1/1)',
                            payload: { iteration: 1 },
                        },
                    ],
                },
            ],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(1);

        const phases = db.prepare("SELECT * FROM phases WHERE run_id LIKE '%0292%'").all();
        expect(phases.length).toBe(1);
        expect((phases[0] as Record<string, unknown>).status).toBe('failed');
        expect((phases[0] as Record<string, unknown>).rework_iteration).toBe(1);

        const events = db.prepare("SELECT * FROM events WHERE run_id LIKE '%0292%'").all();
        expect(events.length).toBe(2);
    });

    test('skips invalid JSON files', async () => {
        const dir = join(tempDir, 'invalid');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'bad.json'), 'not valid json {{{');

        const result = await migrateFromV1(db, tempDir);
        expect(result.skipped).toBe(1);
        expect(result.errors.length).toBe(1);
    });

    test('skips files missing task_ref', async () => {
        const dir = join(tempDir, 'notask');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, 'notask.json'), JSON.stringify({ phases: [] }));

        const result = await migrateFromV1(db, tempDir);
        expect(result.skipped).toBe(1);
    });

    test('maps phase numbers to v2 names', async () => {
        writeV1State('0210', {
            task_ref: '0210',
            profile: 'complex',
            status: 'completed',
            phases: [
                { number: 1, name: 'Request Intake', skill: 'rd3:request-intake', gate: 'auto', status: 'completed' },
                { number: 2, name: 'Architecture', skill: 'rd3:backend-architect', gate: 'auto', status: 'completed' },
                {
                    number: 5,
                    name: 'Implementation',
                    skill: 'rd3:code-implement-common',
                    gate: 'auto',
                    status: 'completed',
                },
                { number: 9, name: 'Documentation', skill: 'rd3:code-docs', gate: 'auto', status: 'completed' },
            ],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(1);

        const phases = db.prepare("SELECT name FROM phases WHERE run_id LIKE '%0210%' ORDER BY name").all();
        const names = phases.map((p) => (p as Record<string, unknown>).name as string);
        expect(names).toContain('intake');
        expect(names).toContain('arch');
        expect(names).toContain('implement');
        expect(names).toContain('docs');
    });

    test('migrates multiple state files', async () => {
        writeV1State('0300', {
            task_ref: '0300',
            profile: 'simple',
            status: 'completed',
            phases: [
                {
                    number: 5,
                    name: 'Implementation',
                    skill: 'rd3:code-implement-common',
                    gate: 'auto',
                    status: 'completed',
                },
            ],
        });

        writeV1State('0301', {
            task_ref: '0301',
            profile: 'standard',
            status: 'running',
            phases: [
                {
                    number: 5,
                    name: 'Implementation',
                    skill: 'rd3:code-implement-common',
                    gate: 'auto',
                    status: 'running',
                },
            ],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(2);

        const runs = db.prepare('SELECT COUNT(*) as cnt FROM runs').get() as Record<string, unknown>;
        expect(runs.cnt).toBe(2);
    });

    test('preserves rework_config in config_snapshot', async () => {
        writeV1State('0305', {
            task_ref: '0305',
            profile: 'standard',
            status: 'failed',
            rework_config: { max_iterations: 3, feedback_injection: true, escalation_state: 'failed' },
            coverage_threshold: 80,
            phases: [
                {
                    number: 5,
                    name: 'Implementation',
                    skill: 'rd3:code-implement-common',
                    gate: 'auto',
                    status: 'failed',
                    rework_iterations: 3,
                    error: 'Max rework exhausted',
                },
            ],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(1);

        const run = db.prepare('SELECT config_snapshot FROM runs WHERE task_ref = ?').get('0305') as Record<
            string,
            unknown
        >;
        const config = JSON.parse(run.config_snapshot as string) as Record<string, unknown>;
        expect(config.rework_config).toEqual({
            max_iterations: 3,
            feedback_injection: true,
            escalation_state: 'failed',
        });
        expect(config.coverage_threshold).toBe(80);
    });

    test('handles unknown phase numbers gracefully', async () => {
        writeV1State('0310', {
            task_ref: '0310',
            profile: 'standard',
            status: 'completed',
            phases: [{ number: 99, name: 'Custom Phase', skill: 'custom:skill', gate: 'auto', status: 'completed' }],
        });

        const result = await migrateFromV1(db, tempDir);
        expect(result.migrated).toBe(1);

        const phases = db.prepare("SELECT name FROM phases WHERE run_id LIKE '%0310%'").all();
        expect((phases[0] as Record<string, unknown>).name).toBe('phase-99');
    });
});
