import { describe, test, expect, beforeAll, beforeEach } from 'bun:test';
import { PipelineRunner } from '../scripts/engine/runner';
import { StateManager } from '../scripts/state/manager';
import { EventStore } from '../scripts/state/events';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import { EventBus } from '../scripts/observability/event-bus';
import { HookRegistry } from '../scripts/engine/hooks';
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

        // Test undo — should return error when no snapshot exists
        const undoResult = await runner.undo(runId, 'test');
        expect(undoResult.success).toBe(false);
        expect(undoResult.exitCode).toBe(13);
    });

    test('undo with force flag', async () => {
        const undoResult = await runner.undo('any-run', 'any-phase', { force: true });
        expect(undoResult.success).toBe(false);
    });

    test('undo with existing snapshot restores files and resets phases', async () => {
        // Create a run with phases that have a DAG relationship
        const runId = 'undo-test-run';
        await stateManager.createRun({
            id: runId,
            task_ref: 'undo-task',
            phases_requested: 'implement,test,review',
            status: 'COMPLETED',
            config_snapshot: {
                phases: {
                    implement: { skill: 'a' },
                    test: { skill: 'b', after: ['implement'] },
                    review: { skill: 'c', after: ['test'] },
                },
            },
            pipeline_name: 'test-pipeline',
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'implement',
            status: 'completed',
            skill: 'a',
            rework_iteration: 0,
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'test',
            status: 'completed',
            skill: 'b',
            rework_iteration: 0,
        });
        await stateManager.createPhase({
            run_id: runId,
            name: 'review',
            status: 'completed',
            skill: 'c',
            rework_iteration: 0,
        });

        // Save a rollback snapshot for 'implement'
        await stateManager.saveRollbackSnapshot({
            run_id: runId,
            phase_name: 'implement',
            git_head: 'abc123',
            files_before: { 'src/main.ts': 'abc123' },
            files_after: { 'src/main.ts': 'abc123', 'src/new-file.ts': 'def456' },
        });

        // Build DAG so findDownstreamPhases can traverse it
        const pipelineDef: PipelineDefinition = {
            schema_version: 1 as const,
            name: 'test-pipeline',
            phases: {
                implement: { skill: 'a' },
                test: { skill: 'b', after: ['implement'] },
                review: { skill: 'c', after: ['test'] },
            },
        };

        // Need a runner that has initialized the DAG
        const undoRunner = new PipelineRunner(stateManager, pool);
        // Access private method via initializePipeline (called in run)
        // We'll use a small trick: run with dry-run to init the DAG
        await undoRunner.run({ taskRef: 'undo-task-dry', dryRun: true } as RunOptions, pipelineDef);

        // Now test undo with force (bypasses uncommitted check since we're not in a git repo)
        const result = await undoRunner.undo(runId, 'implement', { force: true });
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify phase status was reset
        const implementPhase = await stateManager.getPhase(runId, 'implement');
        expect(implementPhase?.status).toBe('pending');

        // Verify downstream phases were reset
        const testPhase = await stateManager.getPhase(runId, 'test');
        expect(testPhase?.status).toBe('pending');

        const reviewPhase = await stateManager.getPhase(runId, 'review');
        expect(reviewPhase?.status).toBe('pending');

        // Verify run status is PAUSED
        const run = await stateManager.getRun(runId);
        expect(run?.status).toBe('PAUSED');
    });

    test('undo dry-run shows plan without side effects', async () => {
        const runId = 'undo-dryrun-run';
        await stateManager.createRun({
            id: runId,
            task_ref: 'undo-dry-task',
            phases_requested: 'implement',
            status: 'COMPLETED',
            config_snapshot: {},
            pipeline_name: 'test-pipeline',
        });
        await stateManager.saveRollbackSnapshot({
            run_id: runId,
            phase_name: 'implement',
            git_head: 'abc123',
            files_before: { 'src/main.ts': 'abc123' },
            files_after: { 'src/main.ts': 'def456', 'src/new.ts': 'ghi789' },
        });

        const result = await runner.undo(runId, 'implement', { force: true, dryRun: true });
        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);

        // Verify no state was changed
        const run = await stateManager.getRun(runId);
        expect(run?.status).toBe('COMPLETED');
    });

    test('undo without snapshot returns STATE_CORRUPT error', async () => {
        const runId = 'undo-no-snapshot';
        const result = await runner.undo(runId, 'nonexistent-phase');
        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(13);
        expect(result.error).toContain('STATE_CORRUPT');
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

    test('events are persisted to EventStore via EventBus wiring', async () => {
        const pipeline = createTestPipeline();
        const eventStore = new EventStore(stateManager.getDb());

        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-persist-events',
            dryRun: false,
        };

        const result = await runner.run(options, pipeline);
        expect(result.exitCode).toBe(0);

        // Allow async .catch() handlers to flush
        await new Promise((r) => setTimeout(r, 50));

        const events = await eventStore.getEventsForRun(result.runId);

        // Expect the full event sequence for a 2-phase pipeline
        const eventTypes = events.map((e) => e.event_type);
        expect(eventTypes).toContain('run.created');
        expect(eventTypes).toContain('phase.started');
        expect(eventTypes).toContain('phase.completed');
        expect(eventTypes).toContain('run.completed');

        // Verify ordering: run.created first, run.completed last
        expect(eventTypes[0]).toBe('run.created');
        expect(eventTypes[eventTypes.length - 1]).toBe('run.completed');

        // All events should reference the same run_id
        for (const event of events) {
            expect(event.run_id).toBe(result.runId);
        }
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

describe('engine/runner — hook execution', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;

    beforeEach(async () => {
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['current'] });
        pool.register(mockExecutor);
    });

    test('on-phase-start hook fires before phase execution', async () => {
        const hookRegistry = new HookRegistry();
        const firedHooks: string[] = [];
        hookRegistry.register('on-phase-start', {
            run: 'echo "phase-start-hook"',
        });

        // Use a spy by wrapping execute
        const originalExecute = hookRegistry.execute.bind(hookRegistry);
        hookRegistry.execute = async (name: string, ctx: import('../scripts/engine/hooks').HookContext) => {
            firedHooks.push(name);
            await originalExecute(name, ctx);
        };

        const runner = new PipelineRunner(stateManager, pool, hookRegistry);
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'hook-test',
            phases: {
                implement: {
                    skill: 'test-skill',
                    gate: { type: 'auto' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        await runner.run({ taskRef: 'hook-test-001' }, pipeline);

        expect(firedHooks).toContain('on-phase-start');
        expect(firedHooks).toContain('on-phase-complete');
    }, 10000);

    test('on-phase-failure hook fires when phase fails', async () => {
        const hookRegistry = new HookRegistry();
        const firedHooks: string[] = [];
        const originalExecute = hookRegistry.execute.bind(hookRegistry);
        hookRegistry.execute = async (name: string, ctx: import('../scripts/engine/hooks').HookContext) => {
            firedHooks.push(name);
            await originalExecute(name, ctx);
        };

        const runner = new PipelineRunner(stateManager, pool, hookRegistry);
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'failure-hook-test',
            phases: {
                implement: {
                    skill: 'test-skill',
                    gate: { type: 'auto' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } }]);

        await runner.run({ taskRef: 'hook-test-002' }, pipeline);

        expect(firedHooks).toContain('on-phase-failure');
    }, 10000);

    test('on-pause hook fires when pipeline pauses for human gate', async () => {
        const hookRegistry = new HookRegistry();
        const firedHooks: string[] = [];
        const originalExecute = hookRegistry.execute.bind(hookRegistry);
        hookRegistry.execute = async (name: string, ctx: import('../scripts/engine/hooks').HookContext) => {
            firedHooks.push(name);
            await originalExecute(name, ctx);
        };

        const runner = new PipelineRunner(stateManager, pool, hookRegistry);
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'pause-hook-test',
            phases: {
                implement: {
                    skill: 'test-skill',
                    gate: { type: 'human' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'hook-test-003' }, pipeline);

        expect(result.status).toBe('PAUSED');
        expect(firedHooks).toContain('on-phase-start');
        expect(firedHooks).toContain('on-pause');
    }, 10000);

    test('on-pause hook fires on execution failure with pause escalation', async () => {
        const hookRegistry = new HookRegistry();
        const firedHooks: string[] = [];
        const originalExecute = hookRegistry.execute.bind(hookRegistry);
        hookRegistry.execute = async (name: string, ctx: import('../scripts/engine/hooks').HookContext) => {
            firedHooks.push(name);
            await originalExecute(name, ctx);
        };

        const runner = new PipelineRunner(stateManager, pool, hookRegistry);
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'pause-escalation-test',
            phases: {
                implement: {
                    skill: 'test-skill',
                    gate: {
                        type: 'human',
                        rework: {
                            max_iterations: 0,
                            escalation: 'pause',
                        },
                    },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: false, exitCode: 1, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'hook-test-004' }, pipeline);

        expect(result.status).toBe('PAUSED');
        expect(firedHooks).toContain('on-phase-failure');
        expect(firedHooks).toContain('on-pause');
    }, 10000);
});
