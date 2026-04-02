import { beforeAll, describe, expect, test } from 'bun:test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StateManager } from '../scripts/state/manager';
import type { PipelineDefinition } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

const SCRIPT_PATH = join(import.meta.dir, '../scripts/run.ts');
const decoder = new TextDecoder();

beforeAll(() => {
    setGlobalSilent(true);
});

function runCli(args: string[], cwd: string): { exitCode: number; stdout: string; stderr: string } {
    const proc = Bun.spawnSync({
        cmd: ['bun', SCRIPT_PATH, ...args],
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: process.env,
    });

    return {
        exitCode: proc.exitCode,
        stdout: decoder.decode(proc.stdout),
        stderr: decoder.decode(proc.stderr),
    };
}

function createTempCwd(name: string): string {
    const cwd = join(tmpdir(), `orch-v2-cli-${name}-${Date.now()}`);
    mkdirSync(cwd, { recursive: true });
    return cwd;
}

describe('scripts/run.ts CLI integration', () => {
    test('validate succeeds from a fresh checkout without a state directory', () => {
        const cwd = createTempCwd('validate');
        const result = runCli(['validate'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stderr).not.toContain('unable to open database file');
    });

    test('validate --schema outputs the pipeline JSON Schema', () => {
        const cwd = createTempCwd('validate-schema');
        const result = runCli(['validate', '--schema'], cwd);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.$schema).toBe('http://json-schema.org/draft-07/schema#');
        expect(parsed.required).toContain('schema_version');
        expect(parsed.required).toContain('name');
        expect(parsed.required).toContain('phases');
    });

    test('list resolves bundled presets relative to the script', () => {
        const cwd = createTempCwd('list');
        const result = runCli(['list'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('default');
        expect(result.stdout).toContain('security-first');
    });

    test('validate resolves extends from the child file location', () => {
        const cwd = createTempCwd('extends');
        const examplesDir = join(cwd, 'examples');
        mkdirSync(examplesDir, { recursive: true });

        const parent = join(examplesDir, 'default.yaml');
        const child = join(examplesDir, 'security.yaml');

        writeFileSync(
            parent,
            `schema_version: 1
name: parent
phases:
  implement:
    skill: rd3:code-implement-common
`,
        );
        writeFileSync(
            child,
            `schema_version: 1
name: child
extends: default.yaml
phases:
  review:
    skill: rd3:code-review-common
    after: [implement]
`,
        );

        const result = runCli(['validate', '--file', child], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
    });

    test('inspect shows only the requested phase detail', async () => {
        const cwd = createTempCwd('inspect');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'inspect-pipeline',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'auto' },
                },
                review: {
                    skill: 'rd3:code-review',
                    gate: { type: 'human' },
                    after: ['implement'],
                },
            },
        };

        await state.createRun({
            id: 'run-inspect-001',
            task_ref: 'inspect-001',
            phases_requested: 'implement,review',
            status: 'FAILED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'inspect-pipeline',
        });
        await state.createPhase({
            run_id: 'run-inspect-001',
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await state.createPhase({
            run_id: 'run-inspect-001',
            name: 'review',
            status: 'failed',
            skill: 'rd3:code-review',
            rework_iteration: 1,
        });
        await state.updatePhaseStatus('run-inspect-001', 'review', 'failed', 'GATE_FAILED', 'Human review rejected');
        await state.saveGateResult({
            run_id: 'run-inspect-001',
            phase_name: 'review',
            step_name: 'approval',
            checker_method: 'human',
            passed: false,
            evidence: { reason: 'missing tests' },
        });
        await state.close();

        const result = runCli(['inspect', 'inspect-001', 'review', '--evidence'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Phase: review');
        expect(result.stdout).toContain('Status: failed');
        expect(result.stdout).toContain('Human review rejected');
        expect(result.stdout).toContain('missing tests');
        expect(result.stdout).not.toContain('implement completed');
    });

    test('undo fails until support exists, prune succeeds, and migrate accepts a source dir', () => {
        const cwd = createTempCwd('commands');
        const legacyDir = join(cwd, 'legacy-state');
        mkdirSync(legacyDir, { recursive: true });

        const migrateResult = runCli(['migrate', '--dir', legacyDir], cwd);
        const undoResult = runCli(['undo', '0300', 'implement'], cwd);
        const pruneResult = runCli(['prune'], cwd);

        expect(migrateResult.exitCode).toBe(0);
        expect(migrateResult.stdout).toContain('Successfully migrated 0 run(s)');
        expect(undoResult.exitCode).toBe(12); // TASK_NOT_FOUND — no run exists for task-ref
        // Prune now implemented — succeeds with 0 exit, reports 0 runs pruned
        expect(pruneResult.exitCode).toBe(0);
        expect(pruneResult.stdout).toContain('Pruned 0 run(s)');
    });

    test('prune --dry-run reports counts without deleting', async () => {
        const cwd = createTempCwd('prune-dry');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'prune-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-prune-001',
            task_ref: 'prune-task',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'prune-test',
        });
        await state.createPhase({
            run_id: 'run-prune-001',
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });

        // Add events
        const db = state.getDb();
        db.prepare('INSERT INTO events (run_id, event_type, payload) VALUES (?, ?, ?)').run(
            'run-prune-001',
            'phase.completed',
            '{}',
        );
        await state.close();

        const result = runCli(['prune', '--older-than', '1s', '--dry-run'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('[dry-run]');
        expect(result.stdout).toContain('Runs affected: 1');
        expect(result.stdout).toContain('Events: 1');
    });

    test('status --run shows a specific run by ID', async () => {
        const cwd = createTempCwd('status-run');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'status-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-status-001',
            task_ref: 'status-task-1',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'status-test',
        });
        await state.createPhase({
            run_id: 'run-status-001',
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await state.close();

        const result = runCli(['status', '--run', 'run-status-001'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('status-task-1');
        expect(result.stdout).toContain('COMPLETED');
    });

    test('status --run with invalid ID exits with TASK_NOT_FOUND', () => {
        const cwd = createTempCwd('status-run-invalid');
        const result = runCli(['status', '--run', 'nonexistent-id'], cwd);
        expect(result.exitCode).toBe(12);
    });

    test('status --all lists all runs', async () => {
        const cwd = createTempCwd('status-all');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'status-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-all-001',
            task_ref: 'all-task-1',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'status-test',
            preset: 'default',
        });
        await state.createRun({
            id: 'run-all-002',
            task_ref: 'all-task-2',
            phases_requested: 'implement',
            status: 'RUNNING',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'status-test',
            preset: 'security-first',
        });
        await state.close();

        const result = runCli(['status', '--all'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('all-task-1');
        expect(result.stdout).toContain('all-task-2');
        expect(result.stdout).toContain('RUN ID');
    });

    test('status --all --json outputs JSON array', async () => {
        const cwd = createTempCwd('status-all-json');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'status-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-json-001',
            task_ref: 'json-task',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'status-test',
        });
        await state.close();

        const result = runCli(['status', '--all', '--json'], cwd);
        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(1);
        expect(parsed[0].run.task_ref).toBe('json-task');
    });

    test('status default (no flags) shows latest run', async () => {
        const cwd = createTempCwd('status-default');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'status-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-default-001',
            task_ref: 'default-task',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'status-test',
        });
        await state.createPhase({
            run_id: 'run-default-001',
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await state.close();

        const result = runCli(['status'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('default-task');
        expect(result.stdout).toContain('COMPLETED');
    });

    test('prune --keep-last deletes beyond the kept count', async () => {
        const cwd = createTempCwd('prune-keep');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'prune-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'run-keep-001',
            task_ref: 'keep-task-1',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'prune-test',
        });
        await state.createRun({
            id: 'run-keep-002',
            task_ref: 'keep-task-2',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'prune-test',
        });
        await state.close();

        const result = runCli(['prune', '--keep-last', '1'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pruned 1 run(s)');
    });
});

describe('history command', () => {
    test('history --json outputs JSON array with run entries', async () => {
        const cwd = createTempCwd('history-json');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'history-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'hist-run-001',
            task_ref: '0200',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'history-test',
            preset: 'simple',
        });
        await state.createRun({
            id: 'hist-run-002',
            task_ref: '0201',
            phases_requested: 'implement,test',
            status: 'FAILED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'history-test',
            preset: 'standard',
        });
        await state.close();

        const result = runCli(['history', '--json'], cwd);
        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(2);
        const refs = parsed.map((e: { taskRef: string }) => e.taskRef);
        expect(refs).toContain('0200');
        expect(refs).toContain('0201');
    });

    test('history --json with empty DB returns empty array', async () => {
        const cwd = createTempCwd('history-json-empty');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();
        await state.close();

        const result = runCli(['history', '--json'], cwd);
        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed.length).toBe(0);
    });

    test('history text mode shows trends when 2+ runs exist', async () => {
        const cwd = createTempCwd('history-trends');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'history-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'trend-run-001',
            task_ref: '0300',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'history-test',
            preset: 'simple',
        });
        await state.createRun({
            id: 'trend-run-002',
            task_ref: '0301',
            phases_requested: 'implement',
            status: 'FAILED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'history-test',
            preset: 'simple',
        });
        await state.close();

        const result = runCli(['history'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline Trends');
        expect(result.stdout).toContain('success rate');
    });

    test('history text mode skips trends for single run', async () => {
        const cwd = createTempCwd('history-single');
        const dbPath = join(cwd, 'docs', '.workflow-runs', 'state.db');
        const state = new StateManager({ dbPath });
        await state.init();

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'history-test',
            phases: { implement: { skill: 'rd3:code-implement' } },
        };

        await state.createRun({
            id: 'single-run-001',
            task_ref: '0400',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'history-test',
            preset: 'simple',
        });
        await state.close();

        const result = runCli(['history'], cwd);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('Pipeline Trends');
    });
});
