import { describe, test, expect, beforeAll, beforeEach } from 'bun:test';
import { PipelineRunner } from '../scripts/engine/runner';
import { StateManager } from '../scripts/state/manager';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import { EventBus } from '../scripts/observability/event-bus';
import type { PipelineDefinition, RunOptions, ResumeOptions, OrchestratorEvent } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

function createTestPipeline(): PipelineDefinition {
    return {
        schema_version: 1,
        name: 'test-pipeline',
        phases: {
            implement: {
                skill: 'rd3:code-implement',
                gate: { type: 'auto' },
                timeout: '1h',
            },
            test: {
                skill: 'rd3:sys-testing',
                gate: { type: 'auto' },
                timeout: '30m',
                after: ['implement'],
            },
        },
    };
}

describe('engine/runner — PipelineRunner', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;
    let runner: PipelineRunner;

    beforeEach(async () => {
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['current'] });
        pool.register(mockExecutor);
        runner = new PipelineRunner(stateManager, pool);
    });

    test('constructor initializes with required dependencies', () => {
        expect(runner).toBeDefined();
    });

    test('constructor with event bus initializes correctly', () => {
        const eventBus = new EventBus();
        const runnerWithEvents = new PipelineRunner(stateManager, pool, undefined, eventBus);
        expect(runnerWithEvents).toBeDefined();
    });

    test('run creates and executes simple pipeline', async () => {
        const pipeline = createTestPipeline();

        // Configure mock to succeed
        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-001',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(0);
        expect(result.runId).toBeDefined();
        expect(mockExecutor.getCallLog()).toHaveLength(2);
    }, 10000);

    test('run handles phase failure correctly', async () => {
        const pipeline = createTestPipeline();

        // Configure mock to fail on first phase
        mockExecutor.setResponses([{ result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } }]);

        const options: RunOptions = {
            taskRef: 'test-002',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(1);
        expect(mockExecutor.getCallLog()).toHaveLength(1);
    }, 10000);

    test('run handles dry run mode', async () => {
        const pipeline = createTestPipeline();

        const options: RunOptions = {
            taskRef: 'test-003',
            dryRun: true,
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(0);
        expect(mockExecutor.getCallLog()).toHaveLength(0); // No actual execution in dry run
    }, 10000);

    test('run respects phase filtering', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            phases: {
                ...createTestPipeline().phases,
                deploy: {
                    skill: 'rd3:deploy',
                    gate: { type: 'auto' },
                    timeout: '15m',
                    after: ['test'],
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const options: RunOptions = {
            taskRef: 'test-004',
            dryRun: false,
            phases: ['implement'], // Only run implement phase
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(0);
        expect(mockExecutor.getCallLog()).toHaveLength(1);
    }, 10000);

    test('run handles preset configuration', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            presets: {
                quick: {
                    phases: ['implement'],
                    defaults: { timeout: '30m' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const options: RunOptions = {
            taskRef: 'test-005',
            dryRun: false,
            preset: 'quick',
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(0);
        expect(mockExecutor.getCallLog()).toHaveLength(1); // Only implement phase
    }, 10000);

    test('run handles missing executor for channel', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            phases: {
                implement: {
                    ...createTestPipeline().phases.implement,
                },
                test: {
                    ...createTestPipeline().phases.test,
                },
            },
        };

        const options: RunOptions = {
            taskRef: 'test-006',
            dryRun: false,
            channel: 'nonexistent', // No executor for this channel
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(1);
    }, 10000);

    test('getStatus returns run information', async () => {
        // First create a run
        const pipeline = createTestPipeline();
        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-007',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);

        // Then check status
        const status = await runner.getStatus(result.runId);

        expect(status).toBeDefined();
        expect(status?.id).toBe(result.runId);
        expect(status?.task_ref).toBe('test-007');
    }, 10000);

    test('getStatus returns null for nonexistent run', async () => {
        const status = await runner.getStatus('nonexistent-run-id');
        expect(status).toBeNull();
    });

    test('resume continues paused pipeline', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            phases: {
                ...createTestPipeline().phases,
                deploy: {
                    skill: 'rd3:deploy',
                    gate: { type: 'auto' },
                    timeout: '15m',
                    after: ['test'],
                },
            },
        };

        // Create a paused run by inserting directly into database
        const runId = 'paused-run-123';
        await stateManager.createRun({
            id: runId,
            task_ref: 'test-008',
            phases_requested: 'implement,test,deploy',
            status: 'PAUSED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'test-pipeline',
        });

        await stateManager.createPhase({
            run_id: runId,
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'test',
            status: 'paused',
            skill: 'rd3:sys-testing',
            rework_iteration: 0,
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'deploy',
            status: 'pending',
            skill: 'rd3:deploy',
            rework_iteration: 0,
        });

        const options: ResumeOptions = {
            taskRef: 'test-008',
            approve: true,
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } }]);

        const result = await runner.resume(options);
        const resumedRun = await stateManager.getRun(runId);
        const deploy = await stateManager.getPhase(runId, 'deploy');
        const testPhase = await stateManager.getPhase(runId, 'test');

        expect(result.exitCode).toBe(0);
        expect(result.status).toBe('COMPLETED');
        expect(result.runId).toBe(runId);
        expect(resumedRun?.status).toBe('COMPLETED');
        expect(testPhase?.status).toBe('completed');
        expect(deploy?.status).toBe('completed');
        expect(mockExecutor.getCallLog()).toHaveLength(1);
    }, 10000);

    test('resume rejects pipeline when approve is false', async () => {
        const pipeline = createTestPipeline();

        // Create a paused run
        const runId = 'paused-run-124';
        await stateManager.createRun({
            id: runId,
            task_ref: 'test-009',
            phases_requested: 'implement,test',
            status: 'PAUSED',
            config_snapshot: pipeline as unknown as Record<string, unknown>,
            pipeline_name: 'test-pipeline',
        });

        await stateManager.createPhase({
            run_id: runId,
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'test',
            status: 'paused',
            skill: 'rd3:sys-testing',
            rework_iteration: 0,
        });

        const options: ResumeOptions = {
            taskRef: 'test-009',
            reject: true,
        };

        const result = await runner.resume(options);
        const resumedRun = await stateManager.getRun(runId);
        const pausedPhase = await stateManager.getPhase(runId, 'test');

        expect(result.exitCode).toBe(1);
        expect(result.status).toBe('FAILED');
        expect(resumedRun?.status).toBe('FAILED');
        expect(pausedPhase?.status).toBe('failed');
    }, 10000);

    test('resume handles nonexistent task', async () => {
        const options: ResumeOptions = {
            taskRef: 'nonexistent-task',
            approve: true,
        };

        await expect(runner.resume(options)).rejects.toThrow();
    }, 10000);

    test('undo removes completed phase', async () => {
        // Create a completed run with phases
        const runId = 'completed-run-125';
        await stateManager.createRun({
            id: runId,
            task_ref: 'test-010',
            phases_requested: 'implement,test',
            status: 'COMPLETED',
            config_snapshot: {},
            pipeline_name: 'test-pipeline',
        });

        // Record completed phases
        await stateManager.createPhase({
            run_id: runId,
            name: 'implement',
            status: 'completed',
            skill: 'rd3:code-implement',
            rework_iteration: 0,
        });
        await stateManager.updatePhaseStatus(runId, 'implement', 'completed');
        await stateManager.createPhase({
            run_id: runId,
            name: 'test',
            status: 'completed',
            skill: 'rd3:sys-testing',
            rework_iteration: 0,
        });
        await stateManager.updatePhaseStatus(runId, 'test', 'completed');
        await stateManager.updateRunStatus(runId, 'COMPLETED');

        // Test undo
        await expect(runner.undo('test-010', 'test', false)).resolves.toBeUndefined();
    });

    test('undo with force flag bypasses checks', async () => {
        await expect(runner.undo('any-task', 'any-phase', true)).resolves.toBeUndefined();
    });

    test('handles event bus integration', async () => {
        const eventBus = new EventBus();
        const events: OrchestratorEvent[] = [];

        eventBus.subscribeAll((event) => {
            events.push(event);
        });

        const runnerWithEvents = new PipelineRunner(stateManager, pool, undefined, eventBus);
        const pipeline = createTestPipeline();

        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-011',
            dryRun: false,
        };

        await runnerWithEvents.run(options, pipeline);

        expect(events.length).toBeGreaterThan(0);
        expect(events.some((e) => e.event_type === 'run.created')).toBe(true);
    }, 10000);

    test('handles pipeline with human gate', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'human' }, // Human gate
                    timeout: '1h',
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const options: RunOptions = {
            taskRef: 'test-012',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);

        // Should pause for human approval
        expect(result.status).toBe('PAUSED');
        const status = await runner.getStatus(result.runId);
        expect(status?.status).toBe('PAUSED');
    }, 10000);

    test('handles rework scenarios with max iterations', async () => {
        const pipeline: PipelineDefinition = {
            ...createTestPipeline(),
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: {
                        type: 'auto',
                        rework: {
                            max_iterations: 2,
                            escalation: 'fail',
                        },
                    },
                    timeout: '1h',
                },
            },
        };

        // Configure mock to fail initially, then succeed
        mockExecutor.setResponses([
            { result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } },
            { result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } },
            { result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-013',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(1); // Should fail after max iterations
        expect(mockExecutor.getCallLog()).toHaveLength(3); // Initial + 2 rework attempts
    }, 15000);
});
