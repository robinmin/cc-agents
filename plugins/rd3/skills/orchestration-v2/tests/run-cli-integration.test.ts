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
        expect(undoResult.exitCode).toBe(13);
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
