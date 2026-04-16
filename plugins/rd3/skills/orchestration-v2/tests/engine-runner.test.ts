import { describe, test, expect, beforeAll, beforeEach, afterAll, spyOn } from 'bun:test';
import { PipelineRunner } from '../scripts/engine/runner';
import { StateManager } from '../scripts/state/manager';
import { EventStore } from '../scripts/state/events';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import { EventBus } from '../scripts/observability/event-bus';
import { HookRegistry } from '../scripts/engine/hooks';
import type {
    PipelineDefinition,
    RunOptions,
    ResumeOptions,
    OrchestratorEvent,
    VerificationDriver,
} from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';
import * as llmModule from '../../verification-chain/scripts/methods/llm';
import type { LlmCheckerConfig } from '../../verification-chain/scripts/types';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let llmSpy: ReturnType<typeof spyOn>;

beforeAll(() => {
    setGlobalSilent(true);

    // Mock runLlmCheck to always pass — auto gates use LLM verification
    // which requires external LLM access not available in test
    llmSpy = spyOn(llmModule, 'runLlmCheck').mockResolvedValue({
        result: 'pass',
        evidence: { method: 'llm', result: 'pass', timestamp: new Date().toISOString(), llm_results: [] },
    });
});

afterAll(() => {
    llmSpy?.mockRestore();
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

function createVerificationDriver(): VerificationDriver {
    return {
        runChain: async (manifest) => {
            const results = await Promise.all(
                manifest.checks.map(async (check) => {
                    if (check.method === 'llm') {
                        const llmResult = await llmModule.runLlmCheck(
                            (check.params ?? {}) as unknown as LlmCheckerConfig,
                        );
                        return {
                            run_id: manifest.run_id,
                            phase_name: manifest.phase_name,
                            step_name: check.name,
                            checker_method: check.method,
                            passed: llmResult.result === 'pass',
                            evidence: {
                                ...llmResult.evidence,
                                ...(llmResult.error ? { error: llmResult.error } : {}),
                            },
                            created_at: new Date(),
                        };
                    }

                    return {
                        run_id: manifest.run_id,
                        phase_name: manifest.phase_name,
                        step_name: check.name,
                        checker_method: check.method,
                        passed: true,
                        created_at: new Date(),
                    };
                }),
            );

            return {
                status: results.every((result) => result.passed) ? 'pass' : 'fail',
                results,
            };
        },
        resumeChain: async (_stateDir, action) => {
            if (action === 'approve') {
                return {
                    status: 'pass',
                    results: [
                        {
                            run_id: '',
                            phase_name: '',
                            step_name: 'human-review',
                            checker_method: 'human',
                            passed: true,
                            evidence: { human_response: 'approve' },
                            created_at: new Date(),
                        },
                    ],
                };
            }

            if (action === 'reject') {
                return {
                    status: 'fail',
                    results: [
                        {
                            run_id: '',
                            phase_name: '',
                            step_name: 'human-review',
                            checker_method: 'human',
                            passed: false,
                            evidence: { error: 'Human review rejected', human_response: 'reject' },
                            created_at: new Date(),
                        },
                    ],
                };
            }

            return {
                status: 'pending',
                results: [],
            };
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
        mockExecutor = new MockExecutor({ channels: ['inline', 'auto', 'current'] });
        pool.register(mockExecutor);
        runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
    });

    test('constructor initializes with required dependencies', () => {
        expect(runner).toBeDefined();
    });

    test('constructor with event bus initializes correctly', () => {
        const eventBus = new EventBus();
        const runnerWithEvents = new PipelineRunner(
            stateManager,
            pool,
            undefined,
            eventBus,
            createVerificationDriver(),
        );
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

    test('run fails for unknown channel instead of routing to default executor', async () => {
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

        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 800, timedOut: false } },
        ]);

        const options: RunOptions = {
            taskRef: 'test-006',
            dryRun: false,
            channel: 'nonexistent',
        };

        const result = await runner.run(options, pipeline);

        expect(result.exitCode).toBe(1);
        expect(result.status).toBe('FAILED');
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
        const undoRunner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
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

        const runnerWithEvents = new PipelineRunner(
            stateManager,
            pool,
            undefined,
            eventBus,
            createVerificationDriver(),
        );
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

describe('engine/runner — command gate', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;

    beforeEach(async () => {
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['inline', 'auto', 'current'] });
        pool.register(mockExecutor);
    });

    test('command gate passes when command exits 0', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'command-gate-pass',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'command', command: 'true' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'cmd-test-001' }, pipeline);

        expect(result.exitCode).toBe(0);
        expect(result.status).toBe('COMPLETED');
    }, 10000);

    test('command gate fails when command exits non-zero', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'command-gate-fail',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'command', command: 'false' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'cmd-test-002' }, pipeline);

        expect(result.exitCode).toBe(1);
        expect(result.status).toBe('FAILED');
    }, 10000);

    test('command gate substitutes template variables', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'command-gate-template',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'command', command: 'echo "{{task_ref}} {{phase}} {{run_id}}"' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: '0316' }, pipeline);

        expect(result.exitCode).toBe(0);
        expect(result.status).toBe('COMPLETED');
    }, 10000);

    test('command gate with rework retries on failure then succeeds', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const tempDir = mkdtempSync(join(tmpdir(), 'orch-v2-gate-rework-'));
        const gateFlag = join(tempDir, 'gate-fixed');

        try {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'command-gate-rework',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: {
                            type: 'command',
                            command: `[ -f '${gateFlag}' ] && exit 0; touch '${gateFlag}'; exit 1`,
                            rework: { max_iterations: 2, escalation: 'fail' },
                        },
                    },
                },
            };

            mockExecutor.setResponses([
                { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
                { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            ]);

            const result = await runner.run({ taskRef: 'cmd-test-003' }, pipeline);

            expect(result.exitCode).toBe(0);
            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(2);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }, 10000);

    test('command gate pause escalation pauses the run after retries are exhausted', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'command-gate-pause',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: {
                        type: 'command',
                        command: 'false',
                        rework: { max_iterations: 1, escalation: 'pause' },
                    },
                },
            },
        };

        mockExecutor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
            { result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } },
        ]);

        const result = await runner.run({ taskRef: 'cmd-test-004' }, pipeline);
        const phase = await stateManager.getPhase(result.runId, 'implement');

        expect(result.exitCode).toBe(0);
        expect(result.status).toBe('PAUSED');
        expect(phase?.status).toBe('paused');
    }, 10000);

    test('command gate results are persisted for inspection', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'command-gate-persist',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'command', command: 'printf "gate-ok"' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 1000, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'cmd-test-005' }, pipeline);
        const gateResults = await stateManager.getGateResults(result.runId, 'implement');

        expect(result.status).toBe('COMPLETED');
        expect(gateResults).toHaveLength(1);
        expect(gateResults[0]?.checker_method).toBe('command');
        expect(gateResults[0]?.evidence).toMatchObject({
            command: 'printf "gate-ok"',
            exitCode: 0,
            stdout: 'gate-ok',
        });
    }, 10000);
});

describe('engine/runner — auto gate evidence', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;

    beforeEach(async () => {
        llmSpy.mockClear();
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['inline', 'auto', 'current'] });
        pool.register(mockExecutor);
    });

    test('auto gate receives phase evidence and persists gate results', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        llmSpy.mockImplementationOnce(async (config: LlmCheckerConfig) => {
            expect(config.prompt_template).toContain('stdout from phase');
            expect(config.prompt_template).toContain('stderr from phase');
            expect(config.prompt_template).toContain('"summary": "structured-output"');
            expect(config.prompt_template).toContain('"files_changed"');
            return {
                result: 'pass',
                evidence: {
                    method: 'llm',
                    result: 'pass',
                    timestamp: new Date().toISOString(),
                    llm_results: [{ item: 'Phase completed successfully without errors', passed: true }],
                },
            };
        });

        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'auto-gate-evidence',
            phases: {
                implement: {
                    skill: 'rd3:code-implement',
                    gate: { type: 'auto' },
                },
            },
        };

        mockExecutor.setResponses([
            {
                result: {
                    success: true,
                    exitCode: 0,
                    stdout: 'stdout from phase',
                    stderr: 'stderr from phase',
                    structured: { summary: 'structured-output' },
                    durationMs: 250,
                    timedOut: false,
                },
            },
        ]);

        const result = await runner.run({ taskRef: 'auto-test-001' }, pipeline);
        const gateResults = await stateManager.getGateResults(result.runId, 'implement');

        expect(result.status).toBe('COMPLETED');
        expect(gateResults).toHaveLength(1);
        expect(gateResults[0]?.checker_method).toBe('llm');
        expect(gateResults[0]?.evidence).toMatchObject({
            severity: 'blocking',
            source: 'engine',
            phase_evidence: {
                success: true,
                files_changed: expect.any(Array),
            },
        });
    }, 10000);

    test('auto gate resolves checklist defaults from skill metadata before engine defaults', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const skillDir = join(process.cwd(), 'plugins', 'rd3', 'skills', 'tmp-auto-default-skill');

        mkdirSync(skillDir, { recursive: true });
        writeFileSync(
            join(skillDir, 'SKILL.md'),
            `---
name: tmp-auto-default-skill
metadata:
  gate_defaults:
    auto:
      checklist:
        - "Skill default checklist item"
---
`,
            'utf-8',
        );

        try {
            llmSpy.mockImplementationOnce(async (config: LlmCheckerConfig) => {
                expect(config.checklist).toEqual(['Skill default checklist item']);
                return {
                    result: 'pass',
                    evidence: {
                        method: 'llm',
                        result: 'pass',
                        timestamp: new Date().toISOString(),
                        llm_results: [{ item: 'Skill default checklist item', passed: true }],
                    },
                };
            });

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'auto-gate-skill-defaults',
                phases: {
                    implement: {
                        skill: 'rd3:tmp-auto-default-skill',
                        gate: { type: 'auto' },
                    },
                },
            };

            mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 100, timedOut: false } }]);

            const result = await runner.run({ taskRef: 'auto-test-002' }, pipeline);
            const gateResults = await stateManager.getGateResults(result.runId, 'implement');

            expect(result.status).toBe('COMPLETED');
            expect(gateResults[0]?.evidence).toMatchObject({ source: 'skill' });
        } finally {
            rmSync(skillDir, { recursive: true, force: true });
        }
    }, 10000);
});

describe('engine/runner — human gate evidence', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;

    beforeEach(async () => {
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['inline', 'auto', 'current'] });
        pool.register(mockExecutor);
    });

    test('human gate persists prompt evidence for inspect and approval flows', async () => {
        const runner = new PipelineRunner(stateManager, pool, undefined, undefined, createVerificationDriver());
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'human-gate-prompt',
            phases: {
                review: {
                    skill: 'rd3:code-review-common',
                    gate: { type: 'human', prompt: 'Review the implementation for missing tests' },
                },
            },
        };

        mockExecutor.setResponses([{ result: { success: true, exitCode: 0, durationMs: 100, timedOut: false } }]);

        const result = await runner.run({ taskRef: 'human-test-001' }, pipeline);
        const gateResults = await stateManager.getGateResults(result.runId, 'review');

        expect(result.status).toBe('PAUSED');
        expect(gateResults).toHaveLength(1);
        expect(gateResults[0]?.checker_method).toBe('human');
        expect(gateResults[0]?.evidence).toMatchObject({
            prompt: 'Review the implementation for missing tests',
        });
    }, 10000);
});

describe('engine/runner — hook execution', () => {
    let stateManager: StateManager;
    let pool: ExecutorPool;
    let mockExecutor: MockExecutor;

    beforeEach(async () => {
        stateManager = new StateManager({ dbPath: ':memory:' });
        await stateManager.init();
        pool = new ExecutorPool();
        mockExecutor = new MockExecutor({ channels: ['inline', 'auto', 'current'] });
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

        const runner = new PipelineRunner(stateManager, pool, hookRegistry, undefined, createVerificationDriver());
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

        const runner = new PipelineRunner(stateManager, pool, hookRegistry, undefined, createVerificationDriver());
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

        const runner = new PipelineRunner(stateManager, pool, hookRegistry, undefined, createVerificationDriver());
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

        const runner = new PipelineRunner(stateManager, pool, hookRegistry, undefined, createVerificationDriver());
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
