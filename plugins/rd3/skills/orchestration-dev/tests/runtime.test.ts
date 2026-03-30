import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setGlobalSilent } from '../../../scripts/logger';
import { createExecutionPlan } from '../scripts/plan';
import {
    createOrchestrationState,
    getOrchestrationStatePath,
    loadOrchestrationState,
    main,
    resumeOrchestration,
    runOrchestration,
    saveOrchestrationState,
} from '../scripts/runtime';

beforeAll(() => {
    setGlobalSilent(true);
});

const tempDirs: string[] = [];

afterEach(() => {
    while (tempDirs.length > 0) {
        rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
});

function createTempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
}

function writeTaskFile(dir: string, name: string, solution = '[Solution placeholder]'): string {
    const taskPath = join(dir, name);
    writeFileSync(
        taskPath,
        `---
name: runtime-test
description: runtime-test
status: Backlog
created_at: 2026-03-28T00:00:00.000Z
updated_at: 2026-03-28T00:00:00.000Z
profile: "simple"
impl_progress:
  planning: pending
  design: pending
  implementation: pending
  review: pending
  testing: pending
---

### Solution

${solution}
`,
        'utf-8',
    );
    return taskPath;
}

function writePilotWorkspaceFiles(dir: string): void {
    writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify(
            {
                name: 'pilot-runtime-test',
                private: true,
                scripts: {
                    typecheck: 'true',
                    'lint:rd3': 'true',
                    'test:rd3': 'true',
                },
            },
            null,
            2,
        ),
        'utf-8',
    );
    writeFileSync(join(dir, 'tsconfig.json'), '{}', 'utf-8');
    writeFileSync(join(dir, 'biome.json'), '{}', 'utf-8');
}

function stubExit(): void {
    process.exit = ((code?: number) => {
        throw new Error(`EXIT:${code ?? 0}`);
    }) as typeof process.exit;
}

describe('orchestration runtime', () => {
    test('returns null when loading a missing orchestration state file', () => {
        const dir = createTempDir('orchestration-missing-state-');
        expect(loadOrchestrationState(join(dir, 'missing.json'))).toBeNull();
    });

    test('sanitizes task refs in the state path', () => {
        const statePath = getOrchestrationStatePath('docs/tasks2/0276 runtime.md', '/tmp/example');
        expect(statePath).toBe('/tmp/example/orchestration/docs_tasks2_0276_runtime.md-state.json');
    });

    test('creates, saves, and reloads orchestration state', () => {
        const dir = createTempDir('orchestration-runtime-');
        const taskPath = writeTaskFile(dir, '0266_runtime.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const state = createOrchestrationState(plan);
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);

        saveOrchestrationState(state, statePath);
        const reloaded = loadOrchestrationState(statePath);

        expect(reloaded?.task_ref).toBe(plan.task_ref);
        expect(reloaded?.phases).toHaveLength(2);
        expect(reloaded?.status).toBe('pending');
    });

    test('preserves task_path in orchestration state when available', () => {
        const dir = createTempDir('orchestration-task-path-');
        const taskPath = writeTaskFile(dir, '0266_task_path.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const state = createOrchestrationState(plan);

        expect(state.task_path).toBe(taskPath);
    });

    test('records worker executor metadata for heavy phases in orchestration state', () => {
        const dir = createTempDir('orchestration-worker-metadata-');
        const taskPath = writeTaskFile(dir, '0266_worker_metadata.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 5 });
        const state = createOrchestrationState(plan);

        expect(state.phases.map((phase) => phase.number)).toEqual([5, 6, 7, 8, 9]);
        expect(state.phases[0]).toMatchObject({
            number: 5,
            skill: 'rd3:code-implement-common',
            executor: 'rd3:super-coder',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[1]).toMatchObject({
            number: 6,
            skill: 'rd3:sys-testing + rd3:advanced-testing',
            executor: 'rd3:super-tester',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[2]).toMatchObject({
            number: 7,
            skill: 'rd3:code-review-common',
            executor: 'rd3:super-reviewer',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(state.phases[3]).toMatchObject({
            number: 8,
            executor: 'rd3:bdd-workflow + rd3:functional-review',
            execution_mode: 'direct-skill',
        });
    });

    test('preserves worker executor metadata through save and reload round-trip', () => {
        const dir = createTempDir('orchestration-worker-roundtrip-');
        const taskPath = writeTaskFile(dir, '0266_worker_roundtrip.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 5 });
        const state = createOrchestrationState(plan);
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);

        saveOrchestrationState(state, statePath);
        const reloaded = loadOrchestrationState(statePath);

        expect(reloaded?.phases[0]).toMatchObject({
            number: 5,
            executor: 'rd3:super-coder',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(reloaded?.phases[1]).toMatchObject({
            number: 6,
            executor: 'rd3:super-tester',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        expect(reloaded?.phases[2]).toMatchObject({
            number: 7,
            executor: 'rd3:super-reviewer',
            execution_mode: 'worker-agent',
            worker_contract_version: 'rd3-phase-worker-v1',
        });
        // Non-heavy phase should not have worker_contract_version
        expect(reloaded?.phases[3]).toMatchObject({
            number: 8,
            execution_mode: 'direct-skill',
        });
        expect(reloaded?.phases[3]).not.toHaveProperty('worker_contract_version');
    });

    test('fails when a phase prerequisite is missing', async () => {
        const dir = createTempDir('orchestration-prereq-');
        const taskPath = writeTaskFile(dir, '0266_prereq.md');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({ status: 'completed' }),
        });

        expect(state.status).toBe('failed');
        expect(state.phases[0].error).toContain('Solution section populated');
    });

    test('marks the orchestration failed when a phase runner returns failed', async () => {
        const dir = createTempDir('orchestration-phase-fail-');
        const taskPath = writeTaskFile(dir, '0266_phase_fail.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        const state = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'failed',
                error: 'verification failed',
                evidence: [{ kind: 'failure', detail: 'phase failed' }],
            }),
        });

        expect(state.status).toBe('failed');
        expect(state.current_phase).toBe(6);
        expect(state.phases[0].status).toBe('failed');
        expect(state.phases[0].error).toBe('verification failed');
        expect(state.phases[0].completed_at).toBeDefined();
    });

    test('skips phases already completed in a persisted state', async () => {
        const dir = createTempDir('orchestration-preloaded-state-');
        const taskPath = writeTaskFile(dir, '0266_preloaded.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'simple' });
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const state = createOrchestrationState(plan);
        state.status = 'running';
        state.phases[0].status = 'completed';
        state.phases[0].completed_at = new Date().toISOString();
        saveOrchestrationState(state, statePath);

        const seenPhases: number[] = [];
        const result = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async (phase) => {
                seenPhases.push(phase.number);
                return { status: 'completed', evidence: [{ kind: 'ok', detail: `phase ${phase.number}` }] };
            },
        });

        expect(result.status).toBe('completed');
        expect(seenPhases).toEqual([6]);
    });

    test('respects startPhase by only executing the selected suffix of phases', async () => {
        const dir = createTempDir('orchestration-start-phase-');
        const taskPath = writeTaskFile(dir, '0266_start_phase.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'complex', startPhase: 6 });
        const seenPhases: number[] = [];

        const result = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async (phase) => {
                seenPhases.push(phase.number);
                return { status: 'completed', evidence: [{ kind: 'ok', detail: `phase ${phase.number}` }] };
            },
        });

        expect(result.status).toBe('completed');
        expect(seenPhases).toEqual([6, 7, 8, 9]);
    });

    test('runs phases sequentially and can resume from a paused phase', async () => {
        const dir = createTempDir('orchestration-resume-');
        const taskPath = writeTaskFile(dir, '0266_resume.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        let invocationCount = 0;

        const phaseRunner = async () => {
            invocationCount += 1;
            if (invocationCount === 1) {
                return { status: 'paused' as const, evidence: [{ kind: 'pause', detail: 'waiting' }] };
            }

            return { status: 'completed' as const, evidence: [{ kind: 'done', detail: 'verified' }] };
        };

        const paused = await runOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner,
        });

        expect(paused.status).toBe('paused');
        expect(paused.phases[0].status).toBe('paused');

        const resumed = await resumeOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner,
        });

        expect(resumed.status).toBe('completed');
        expect(resumed.phases[0].status).toBe('completed');

        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });

    test('resume resets a paused phase to pending and clears stale error state when it later succeeds', async () => {
        const dir = createTempDir('orchestration-resume-error-clear-');
        const taskPath = writeTaskFile(dir, '0266_resume_clear.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const state = createOrchestrationState(plan);
        state.status = 'paused';
        state.current_phase = 6;
        state.phases[0].status = 'paused';
        state.phases[0].error = 'stale error';
        saveOrchestrationState(state, statePath);

        const resumed = await resumeOrchestration({
            plan,
            projectRoot: dir,
            phaseRunner: async () => ({
                status: 'completed',
                evidence: [{ kind: 'done', detail: 'verified' }],
            }),
        });

        expect(resumed.status).toBe('completed');
        expect(resumed.phases[0].status).toBe('completed');
        expect(resumed.phases[0].error).toBeUndefined();
    });

    test('resume throws when state file is missing', async () => {
        const dir = createTempDir('orchestration-resume-missing-');
        const taskPath = writeTaskFile(dir, '0266_resume_missing.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });

        await expect(
            resumeOrchestration({
                plan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('No orchestration state found');
    });

    test('resume throws when orchestration is not paused', async () => {
        const dir = createTempDir('orchestration-resume-not-paused-');
        const taskPath = writeTaskFile(dir, '0266_resume_not_paused.md', 'Implement the feature.');
        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(plan.task_ref, dir);
        const state = createOrchestrationState(plan);
        state.status = 'completed';
        saveOrchestrationState(state, statePath);

        await expect(
            resumeOrchestration({
                plan,
                projectRoot: dir,
                phaseRunner: async () => ({ status: 'completed' }),
            }),
        ).rejects.toThrow('Orchestration is not paused');
    });
});

describe('runtime main', () => {
    const originalExit = process.exit;
    const originalCwd = process.cwd();

    afterEach(() => {
        process.exit = originalExit;
        process.chdir(originalCwd);
    });

    test('exits when task_ref is missing', async () => {
        stubExit();
        await expect(main([])).rejects.toThrow('EXIT:1');
    });

    test('exits when profile is invalid', async () => {
        stubExit();
        await expect(main(['0266', '--profile', 'invalid'])).rejects.toThrow('EXIT:1');
    });

    test('exits when coverage is invalid', async () => {
        stubExit();
        await expect(main(['0266', '--coverage', '101'])).rejects.toThrow('EXIT:1');
    });

    test('exits when start-phase is invalid', async () => {
        stubExit();
        await expect(main(['0266', '--start-phase', '11'])).rejects.toThrow('EXIT:1');
    });

    test('runs the pilot runtime successfully for a local unit-profile workspace', async () => {
        const dir = createTempDir('orchestration-main-success-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_success.md', 'Implement the feature.');
        process.chdir(dir);

        await expect(main([taskPath, '--profile', 'unit', '--channel', 'current'])).resolves.toBeUndefined();

        const statePath = getOrchestrationStatePath(taskPath, dir);
        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });

    test('runs the pilot runtime from an explicit start phase', async () => {
        const dir = createTempDir('orchestration-main-start-phase-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_start_phase.md', 'Implement the feature.');
        process.chdir(dir);

        await expect(main([taskPath, '--profile', 'complex', '--start-phase', '6'])).resolves.toBeUndefined();

        const statePath = getOrchestrationStatePath(taskPath, dir);
        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as {
            status: string;
            current_phase?: number;
            phases: Array<{ number: number }>;
        };
        expect(persisted.status).toBe('paused');
        expect(persisted.current_phase).toBe(7);
        expect(persisted.phases.map((phase) => phase.number)).toEqual([6, 7, 8, 9]);
    });

    test('parses skip-phases and stack-profile arguments in runtime main', async () => {
        const dir = createTempDir('orchestration-main-skip-stack-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_skip_stack.md', 'Implement the feature.');
        process.chdir(dir);

        await expect(
            main([
                taskPath,
                '--profile',
                'complex',
                '--start-phase',
                '6',
                '--skip-phases',
                '7,8,9',
                '--stack-profile',
                'typescript-bun-biome',
                '--channel',
                'current',
                '--auto',
                '--dry-run',
                '--refine',
            ]),
        ).resolves.toBeUndefined();

        const statePath = getOrchestrationStatePath(taskPath, dir);
        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as {
            status: string;
            phases: Array<{ number: number }>;
        };
        expect(persisted.status).toBe('completed');
        expect(persisted.phases.map((phase) => phase.number)).toEqual([6]);
    });

    test('can resume the pilot runtime from a previously paused state file', async () => {
        const dir = createTempDir('orchestration-main-resume-');
        writePilotWorkspaceFiles(dir);
        const taskPath = writeTaskFile(dir, '0266_main_resume.md', 'Implement the feature.');
        process.chdir(dir);

        const plan = createExecutionPlan(taskPath, { profile: 'unit' });
        const statePath = getOrchestrationStatePath(taskPath, dir);
        const state = createOrchestrationState(plan);
        state.status = 'paused';
        state.current_phase = 6;
        state.phases[0].status = 'paused';
        saveOrchestrationState(state, statePath);

        await expect(main([taskPath, '--profile', 'unit', '--resume'])).resolves.toBeUndefined();

        const persisted = JSON.parse(readFileSync(statePath, 'utf-8')) as { status: string };
        expect(persisted.status).toBe('completed');
    });
});
