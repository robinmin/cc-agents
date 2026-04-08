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

function writeTaskConfig(cwd: string): void {
    mkdirSync(join(cwd, 'docs', '.tasks'), { recursive: true });
    writeFileSync(
        join(cwd, 'docs', '.tasks', 'config.jsonc'),
        JSON.stringify(
            {
                $schema_version: 1,
                active_folder: 'docs/tasks2',
                folders: {
                    'docs/prompts': { base_counter: 0 },
                    'docs/tasks': { base_counter: 0 },
                    'docs/tasks2': { base_counter: 0 },
                },
            },
            null,
            2,
        ),
    );
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
        await state.savePhaseEvidence({
            run_id: 'run-inspect-001',
            phase_name: 'review',
            rework_iteration: 1,
            evidence: {
                stdout: 'review stdout',
                stderr: 'review stderr',
                files_changed: ['src/review.ts'],
                files_added: ['tests/review.test.ts'],
            },
        });
        await state.close();

        const result = runCli(['inspect', 'inspect-001', 'review', '--evidence'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Phase: review');
        expect(result.stdout).toContain('Status: failed');
        expect(result.stdout).toContain('Human review rejected');
        expect(result.stdout).toContain('missing tests');
        expect(result.stdout).toContain('review stdout');
        expect(result.stdout).toContain('tests/review.test.ts');
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

    test('--preset standard --dry-run loads default.yaml and lists all phases', () => {
        // This verifies the built-in named preset resolution fix:
        // --preset standard should resolve to default.yaml (where "standard" is defined
        // as a named preset), not try to open standard.yaml which does not exist.
        const cwd = createTempCwd('preset-standard');
        const result = runCli(['run', '0300', '--preset', 'standard', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('intake');
        expect(result.stdout).toContain('decompose');
        expect(result.stdout).toContain('implement');
        expect(result.stdout).toContain('test');
        expect(result.stdout).toContain('review');
        expect(result.stdout).toContain('verify-bdd');
        expect(result.stdout).toContain('verify-func');
        expect(result.stdout).toContain('docs');
    });

    test('--preset simple --dry-run loads default.yaml (named preset, not simple.yaml)', () => {
        const cwd = createTempCwd('preset-simple');
        const result = runCli(['run', '0300', '--preset', 'simple', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('intake');
        expect(result.stdout).toContain('decompose');
        expect(result.stdout).toContain('implement');
        expect(result.stdout).toContain('test');
        expect(result.stdout).not.toContain('review');
    });

    test('--preset complex --dry-run loads default.yaml (named preset)', () => {
        const cwd = createTempCwd('preset-complex');
        const result = runCli(['run', '0300', '--preset', 'complex', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        // complex preset includes all phases: intake, arch, design, decompose, etc.
        expect(result.stdout).toContain('intake');
        expect(result.stdout).toContain('arch');
        expect(result.stdout).toContain('design');
    });

    test('--preset security-first --dry-run loads standalone security-first.yaml', () => {
        const cwd = createTempCwd('preset-security-first');
        const result = runCli(['run', '0300', '--preset', 'security-first', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('security-scan');
        expect(result.stdout).toContain('review');
    });

    test('--preset review --dry-run loads standalone review.yaml', () => {
        const cwd = createTempCwd('preset-review');
        const result = runCli(['run', '0300', '--preset', 'review', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('review');
        expect(result.stdout).not.toContain('implement');
    });

    test('--phases --dry-run shows only the requested DAG-ordered subset', () => {
        const cwd = createTempCwd('phases-dry-run');
        const result = runCli(['run', '0300', '--phases', 'verify-bdd,review', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('review');
        expect(result.stdout).toContain('verify-bdd');
        expect(result.stdout).not.toContain('implement');
        expect(result.stdout.indexOf('review')).toBeLessThan(result.stdout.indexOf('verify-bdd'));
    });

    test('--channel current warns and normalizes to auto', () => {
        const cwd = createTempCwd('channel-current');
        const result = runCli(['run', '0300', '--preset', 'simple', '--channel', 'current', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toContain('--channel current is deprecated');
        expect(result.stderr).toContain('--channel auto');
    });

    test('--profile alias emits deprecation warning but still works', () => {
        const cwd = createTempCwd('profile-deprecated');
        const result = runCli(['run', '0300', '--profile', 'standard', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        // Warning is emitted to stderr
        expect(result.stderr).toContain('--profile is deprecated');
        expect(result.stderr).toContain('--preset');
    });

    test('task frontmatter preset overrides the old hardcoded default preset', () => {
        const cwd = createTempCwd('task-profile-simple');
        writeTaskConfig(cwd);
        mkdirSync(join(cwd, 'docs', 'tasks2'), { recursive: true });
        writeFileSync(
            join(cwd, 'docs', 'tasks2', '0353_Enhance_Kanban_UI.md'),
            `---
name: Enhance Kanban UI
description: Task-scoped preset selection regression
status: Backlog
created_at: 2026-04-07T20:58:36.206Z
updated_at: 2026-04-08T05:15:00.000Z
folder: docs/tasks2
type: task
preset: simple
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0353. Enhance Kanban UI
`,
        );

        const result = runCli(['run', '0353', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Pipeline valid');
        expect(result.stdout).toContain('intake');
        expect(result.stdout).toContain('decompose');
        expect(result.stdout).toContain('implement');
        expect(result.stdout).toContain('test');
        expect(result.stdout).not.toContain('review');
        expect(result.stdout).not.toContain('docs');
    });

    test('legacy task frontmatter profile still resolves when preset is absent', () => {
        const cwd = createTempCwd('task-legacy-profile-simple');
        writeTaskConfig(cwd);
        mkdirSync(join(cwd, 'docs', 'tasks2'), { recursive: true });
        writeFileSync(
            join(cwd, 'docs', 'tasks2', '0354_Legacy_Profile_Task.md'),
            `---
name: Legacy Profile Task
description: Legacy profile compatibility
status: Backlog
created_at: 2026-04-07T20:58:36.206Z
updated_at: 2026-04-08T05:15:00.000Z
folder: docs/tasks2
type: task
profile: simple
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

## 0354. Legacy Profile Task
`,
        );

        const result = runCli(['run', '0354', '--dry-run'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('intake');
        expect(result.stdout).toContain('decompose');
        expect(result.stdout).toContain('implement');
        expect(result.stdout).toContain('test');
    });

    test('unknown flags fail loudly instead of falling through to the default pipeline', () => {
        const cwd = createTempCwd('unknown-flag');
        const result = runCli(['run', '0300', '--preste', 'simple', '--dry-run'], cwd);

        expect(result.exitCode).toBe(10);
        expect(result.stderr).toContain('Unknown option: --preste');
        expect(result.stdout).not.toContain('Pipeline valid');
    });

    test('unknown preset names fail instead of silently falling back', () => {
        const cwd = createTempCwd('unknown-preset');
        const result = runCli(['run', '0300', '--preset', 'not-a-real-preset', '--dry-run'], cwd);

        expect(result.exitCode).toBe(10);
        expect(result.stderr).toContain('Unknown preset: not-a-real-preset');
        expect(result.stdout).not.toContain('Pipeline valid');
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

    test('init creates directories and copies default pipeline', () => {
        const cwd = createTempCwd('init-fresh');
        const result = runCli(['init'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Created directory');
        expect(result.stdout).toContain('docs/.workflows');
        expect(result.stdout).toContain('docs/.workflow-runs');
        expect(result.stdout).toContain('Copied default pipeline');
        expect(result.stdout).toContain('Initialization complete');
    });

    test('init is idempotent - running twice reports directories already exist', () => {
        const cwd = createTempCwd('init-twice');

        // First run
        const first = runCli(['init'], cwd);
        expect(first.exitCode).toBe(0);

        // Second run
        const second = runCli(['init'], cwd);
        expect(second.exitCode).toBe(0);
        expect(second.stdout).toContain('already exists');
        expect(second.stdout).toContain('Initialization complete');
    });

    test('init --help shows init command in help text', () => {
        const cwd = createTempCwd('init-help');
        const result = runCli(['--help'], cwd);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('init');
        expect(result.stdout).toContain('Initialize project');
    });
});
