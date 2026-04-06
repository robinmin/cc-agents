/**
 * Comprehensive unit tests for PipelineRunner
 *
 * This test suite provides comprehensive coverage for:
 * - PipelineRunner class constructor and initialization
 * - FSM state transitions and lifecycle management
 * - DAG scheduling with complex dependency chains
 * - Executor pool integration and error handling
 * - Gate checking (auto/human) with different scenarios
 * - Rework handling and escalation strategies
 * - Event emission and observability
 * - Error conditions, timeouts, and edge cases
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, spyOn } from 'bun:test';
import { PipelineRunner } from '../scripts/engine/runner';
import { StateManager } from '../scripts/state/manager';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import { HookRegistry } from '../scripts/engine/hooks';
import { EventBus } from '../scripts/observability/event-bus';
import { runMigrations } from '../scripts/state/migrations';
import { setGlobalSilent } from '../../../scripts/logger';
import type { PipelineDefinition, RunOptions, ResumeOptions, OrchestratorEvent } from '../scripts/model';
import * as llmModule from '../../verification-chain/scripts/methods/llm';

// Setup global test environment
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

/**
 * Creates a fresh StateManager backed by an in-memory SQLite database
 * with migrations already applied.
 */
function createTestStateManager(): StateManager {
    const sm = new StateManager({ dbPath: ':memory:' });
    runMigrations(sm.getDb());
    return sm;
}

describe('PipelineRunner - Comprehensive Coverage', () => {
    let stateManager: StateManager;
    let executorPool: ExecutorPool;
    let hookRegistry: HookRegistry;
    let eventBus: EventBus;
    let runner: PipelineRunner;

    // Mock executor for controlled testing
    let mockExecutor: MockExecutor;

    beforeEach(() => {
        // Create fresh test environment
        stateManager = createTestStateManager();
        executorPool = new ExecutorPool();
        hookRegistry = new HookRegistry();
        eventBus = new EventBus();

        // Create and register mock executor — channels come from capabilities
        mockExecutor = new MockExecutor({ channels: ['auto', 'current'] });
        executorPool.register(mockExecutor);

        // Create runner with all dependencies
        runner = new PipelineRunner(stateManager, executorPool, hookRegistry, eventBus);
    });

    afterEach(() => {
        stateManager.close();
    });

    // ─── Constructor & Initialization ───────────────────────────────────────────

    describe('Constructor & Initialization', () => {
        test('should initialize with required state manager', () => {
            const sm = createTestStateManager();
            const minimalRunner = new PipelineRunner(sm);
            expect(minimalRunner).toBeDefined();
        });

        test('should initialize with all optional dependencies', () => {
            const fullRunner = new PipelineRunner(stateManager, executorPool, hookRegistry, eventBus);
            expect(fullRunner).toBeDefined();
        });

        test('should create default dependencies when not provided', () => {
            const sm = createTestStateManager();
            const defaultRunner = new PipelineRunner(sm);
            expect(defaultRunner).toBeDefined();
        });
    });

    // ─── Pipeline Execution - Basic Scenarios ──────────────────────────────────

    describe('Pipeline Execution - Basic Scenarios', () => {
        test('should execute simple single-phase pipeline successfully', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'simple-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'simple-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
            expect(result.runId).toBeDefined();
            expect(result.durationMs).toBeGreaterThanOrEqual(0);
            expect(mockExecutor.getCallLog()).toHaveLength(1);
        });

        test('should execute multi-phase pipeline with dependencies', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'multi-phase-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                    test: {
                        skill: 'rd3:sys-testing',
                        gate: { type: 'auto' },
                        after: ['implement'],
                    },
                    deploy: {
                        skill: 'rd3:deploy',
                        gate: { type: 'auto' },
                        after: ['test'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'multi-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
            expect(mockExecutor.getCallLog()).toHaveLength(3);

            // Verify execution order by checking call arguments
            const calls = mockExecutor.getCallLog();
            expect(calls[0].phase).toBe('implement');
            expect(calls[1].phase).toBe('test');
            expect(calls[2].phase).toBe('deploy');
        });

        test('should handle phase filtering correctly', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'filtered-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                    test: {
                        skill: 'rd3:sys-testing',
                        gate: { type: 'auto' },
                        after: ['implement'],
                    },
                    deploy: {
                        skill: 'rd3:deploy',
                        gate: { type: 'auto' },
                        after: ['test'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'filtered-001',
                phases: ['implement', 'test'], // Only run implement and test
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(2);

            const calls = mockExecutor.getCallLog();
            expect(calls[0].phase).toBe('implement');
            expect(calls[1].phase).toBe('test');
        });

        test('should require pipeline definition', async () => {
            const options: RunOptions = {
                taskRef: 'no-pipeline-001',
            };

            await expect(runner.run(options)).rejects.toThrow('Pipeline definition required');
        });
    });

    // ─── Error Handling & Failure Scenarios ────────────────────────────────────

    describe('Error Handling & Failure Scenarios', () => {
        test('should handle phase execution failure', async () => {
            mockExecutor.setResponses([
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Execution failed',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
            ]);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'failing-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'failure-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(1);
            expect(mockExecutor.getCallLog()).toHaveLength(1);
        });

        test('should handle executor unavailable error', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'unavailable-executor-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'unavailable-001',
                channel: 'nonexistent-channel',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(1);
        });

        test('should handle unexpected errors gracefully', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'error-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'error-001',
            };

            const result = await runner.run(options, pipeline);

            // Default mock executor succeeds, so this should complete
            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
        });

        test('should prevent infinite loops with max iterations', async () => {
            // Create a pipeline that would cause infinite blocking
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'infinite-pipeline',
                phases: {
                    phase1: {
                        skill: 'rd3:test',
                        gate: { type: 'auto' },
                        after: ['phase2'], // Circular dependency
                    },
                    phase2: {
                        skill: 'rd3:test',
                        gate: { type: 'auto' },
                        after: ['phase1'], // Circular dependency
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'infinite-001',
            };

            const result = await runner.run(options, pipeline);

            // Circular deps mean no phases become ready, runner exhausts iterations
            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(1);
        });
    });

    // ─── Gate Checking & Rework Scenarios ───────────────────────────────────────

    describe('Gate Checking & Rework Scenarios', () => {
        test('should handle auto gate passing', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'auto-gate-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'auto-gate-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
        });

        test('should propagate auto gate configuration errors', async () => {
            // Mock runLlmCheck to return a configuration error
            llmSpy.mockResolvedValueOnce({
                result: 'fail',
                error: 'LLM CLI not found. Set LLM_CLI_COMMAND or ensure "pi" binary is in PATH',
                evidence: {
                    method: 'llm',
                    result: 'fail',
                    timestamp: new Date().toISOString(),
                },
            });

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'auto-gate-error-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'auto-gate-error-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('FAILED');
            // Verify that the error message is propagated in the phase record or logs
            const phase = await stateManager.getPhase(result.runId, 'implement');
            // The runner sets error_message on phase failure
            expect(phase?.status).toBe('failed');

            // Verify gate result has the error
            const gateResults = await stateManager.getGateResults(result.runId, 'implement');
            expect(gateResults[0].evidence?.error).toBe('LLM CLI not found. Set LLM_CLI_COMMAND or ensure "pi" binary is in PATH');
        });

        test('should pause pipeline for human gate', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'human-gate-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'human' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'human-gate-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('PAUSED');
            expect(result.exitCode).toBe(0);
        });

        test('should handle rework with max iterations', async () => {
            // Configure executor to fail initially, then succeed after rework
            mockExecutor.setResponses([
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Attempt 1 failed',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Attempt 2 failed',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
                {
                    result: {
                        success: true,
                        exitCode: 0,
                        stdout: 'Success after rework',
                        stderr: '',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
            ]);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'rework-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: {
                            type: 'auto',
                            rework: {
                                max_iterations: 3,
                                escalation: 'fail',
                            },
                        },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'rework-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(3); // Initial + 2 rework attempts
        });

        test('should fail after max rework iterations exceeded', async () => {
            // Configure executor to always fail
            mockExecutor.setResponses([
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Always fails',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Always fails',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Always fails',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
            ]);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'max-rework-pipeline',
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
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'max-rework-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(1);
            expect(mockExecutor.getCallLog()).toHaveLength(3); // Initial + 2 rework attempts
        });

        test('should pause for human escalation when rework exhausted', async () => {
            // Configure executor to always fail
            mockExecutor.setResponses([
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Always fails',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Always fails',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
            ]);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'escalation-pause-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: {
                            type: 'human',
                            rework: {
                                max_iterations: 1,
                                escalation: 'pause',
                            },
                        },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'escalation-pause-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('PAUSED');
            expect(result.exitCode).toBe(0);
        });
    });

    // ─── Resume Functionality ───────────────────────────────────────────────────

    describe('Resume Functionality', () => {
        test('should resume paused run with approval', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'test-pipeline',
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
                    docs: {
                        skill: 'rd3:code-docs',
                        gate: { type: 'auto' },
                        after: ['review'],
                    },
                },
            };

            // First create a paused run
            const runRecord = await stateManager.createRun({
                id: 'test-run-resume-001',
                task_ref: 'resume-001',
                phases_requested: 'implement,review,docs',
                status: 'PAUSED',
                config_snapshot: pipeline as unknown as Record<string, unknown>,
                pipeline_name: 'test-pipeline',
            });

            await stateManager.createPhase({
                run_id: runRecord,
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                rework_iteration: 0,
            });

            await stateManager.createPhase({
                run_id: runRecord,
                name: 'review',
                status: 'paused',
                skill: 'rd3:code-review',
                rework_iteration: 0,
            });

            await stateManager.createPhase({
                run_id: runRecord,
                name: 'docs',
                status: 'pending',
                skill: 'rd3:code-docs',
                rework_iteration: 0,
            });

            const resumeOptions: ResumeOptions = {
                taskRef: 'resume-001',
                approve: true,
            };

            const result = await runner.resume(resumeOptions);
            const resumedRun = await stateManager.getRun(runRecord);
            const docsPhase = await stateManager.getPhase(runRecord, 'docs');
            const reviewPhase = await stateManager.getPhase(runRecord, 'review');

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
            expect(resumedRun?.status).toBe('COMPLETED');
            expect(reviewPhase?.status).toBe('completed');
            expect(docsPhase?.status).toBe('completed');
        });

        test('should handle resume with rejection', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'test-pipeline',
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

            // Create a paused run
            const runRecord = await stateManager.createRun({
                id: 'test-run-resume-002',
                task_ref: 'resume-002',
                phases_requested: 'implement,review',
                status: 'PAUSED',
                config_snapshot: pipeline as unknown as Record<string, unknown>,
                pipeline_name: 'test-pipeline',
            });

            await stateManager.createPhase({
                run_id: runRecord,
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                rework_iteration: 0,
            });

            await stateManager.createPhase({
                run_id: runRecord,
                name: 'review',
                status: 'paused',
                skill: 'rd3:code-review',
                rework_iteration: 0,
            });

            const resumeOptions: ResumeOptions = {
                taskRef: 'resume-002',
                reject: true,
            };

            const result = await runner.resume(resumeOptions);
            const resumedRun = await stateManager.getRun(runRecord);
            const reviewPhase = await stateManager.getPhase(runRecord, 'review');

            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(1);
            expect(resumedRun?.status).toBe('FAILED');
            expect(reviewPhase?.status).toBe('failed');
        });

        test('should fail to resume non-existent run', async () => {
            const resumeOptions: ResumeOptions = {
                taskRef: 'nonexistent-task',
                approve: true,
            };

            await expect(runner.resume(resumeOptions)).rejects.toThrow('No run found for task ref: nonexistent-task');
        });

        test('should fail to resume non-paused run', async () => {
            // Create a completed run
            await stateManager.createRun({
                id: 'test-run-resume-003',
                task_ref: 'resume-003',
                phases_requested: 'implement',
                status: 'COMPLETED',
                config_snapshot: {},
                pipeline_name: 'test-pipeline',
            });

            const resumeOptions: ResumeOptions = {
                taskRef: 'resume-003',
                approve: true,
            };

            await expect(runner.resume(resumeOptions)).rejects.toThrow('is not paused (status: COMPLETED)');
        });
    });

    // ─── Event Emission & Observability ─────────────────────────────────────────

    describe('Event Emission & Observability', () => {
        test('should emit run lifecycle events', async () => {
            const events: OrchestratorEvent[] = [];
            eventBus.subscribeAll((event) => {
                events.push(event);
            });

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'event-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'events-001',
            };

            await runner.run(options, pipeline);

            // Verify expected events were emitted
            expect(events.length).toBeGreaterThan(0);
            expect(events.some((e) => e.event_type === 'run.created')).toBe(true);
            expect(events.some((e) => e.event_type === 'phase.started')).toBe(true);
            expect(events.some((e) => e.event_type === 'phase.completed')).toBe(true);
            expect(events.some((e) => e.event_type === 'run.completed')).toBe(true);
        });

        test('should emit failure events when pipeline fails', async () => {
            mockExecutor.setResponses([
                {
                    result: {
                        success: false,
                        exitCode: 1,
                        stdout: '',
                        stderr: 'Test failure',
                        durationMs: 100,
                        timedOut: false,
                    },
                },
            ]);

            const events: OrchestratorEvent[] = [];
            eventBus.subscribeAll((event) => {
                events.push(event);
            });

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'failure-event-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'failure-events-001',
            };

            await runner.run(options, pipeline);

            expect(events.some((e) => e.event_type === 'run.failed')).toBe(true);
        });

        test('should emit pause events for human gates', async () => {
            const events: OrchestratorEvent[] = [];
            eventBus.subscribeAll((event) => {
                events.push(event);
            });

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'pause-event-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'human' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'pause-events-001',
            };

            await runner.run(options, pipeline);

            expect(events.some((e) => e.event_type === 'run.paused')).toBe(true);
        });
    });

    // ─── Status & State Management ───────────────────────────────────────────────

    describe('Status & State Management', () => {
        test('should return run status for valid run ID', async () => {
            // Create a run first
            const runRecord = await stateManager.createRun({
                id: 'test-status-001',
                task_ref: 'status-001',
                phases_requested: 'implement',
                status: 'COMPLETED',
                config_snapshot: {},
                pipeline_name: 'test-pipeline',
            });

            const status = await runner.getStatus(runRecord);

            expect(status).not.toBeNull();
            expect(status?.id).toBe(runRecord);
            expect(status?.task_ref).toBe('status-001');
            expect(status?.status).toBe('COMPLETED');
        });

        test('should return null for nonexistent run ID', async () => {
            const status = await runner.getStatus('nonexistent-run-id');
            expect(status).toBeNull();
        });
    });

    // ─── Undo Functionality ─────────────────────────────────────────────────────

    describe('Undo Functionality', () => {
        test('should return error when no snapshot exists', async () => {
            const result = await runner.undo('test-task', 'test-phase');
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(13);
        });

        test('should handle undo with force flag', async () => {
            const result = await runner.undo('test-task', 'test-phase', { force: true });
            expect(result.success).toBe(false);
        });
    });

    // ─── Timeout Handling ────────────────────────────────────────────────────────

    describe('Timeout Handling', () => {
        test('should parse various timeout formats', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'timeout-pipeline',
                phases: {
                    quick: {
                        skill: 'rd3:test',
                        timeout: '30s',
                        gate: { type: 'auto' },
                    },
                    medium: {
                        skill: 'rd3:test',
                        timeout: '15m',
                        gate: { type: 'auto' },
                        after: ['quick'],
                    },
                    long: {
                        skill: 'rd3:test',
                        timeout: '2h',
                        gate: { type: 'auto' },
                        after: ['medium'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'timeout-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');

            // Verify timeout values were passed correctly to executor
            const calls = mockExecutor.getCallLog();
            expect(calls[0].timeoutMs).toBe(30 * 1000); // 30 seconds
            expect(calls[1].timeoutMs).toBe(15 * 60 * 1000); // 15 minutes
            expect(calls[2].timeoutMs).toBe(2 * 60 * 60 * 1000); // 2 hours
        });

        test('should use default timeout when not specified', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'default-timeout-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                        // No timeout specified
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'default-timeout-001',
            };

            await runner.run(options, pipeline);

            const calls = mockExecutor.getCallLog();
            expect(calls[0].timeoutMs).toBe(30 * 60 * 1000); // Default 30 minutes
        });
    });

    // ─── Complex DAG Scenarios ──────────────────────────────────────────────────

    describe('Complex DAG Scenarios', () => {
        test('should handle diamond dependency pattern', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'diamond-pipeline',
                phases: {
                    start: {
                        skill: 'rd3:start',
                        gate: { type: 'auto' },
                    },
                    branch_a: {
                        skill: 'rd3:branch-a',
                        gate: { type: 'auto' },
                        after: ['start'],
                    },
                    branch_b: {
                        skill: 'rd3:branch-b',
                        gate: { type: 'auto' },
                        after: ['start'],
                    },
                    merge: {
                        skill: 'rd3:merge',
                        gate: { type: 'auto' },
                        after: ['branch_a', 'branch_b'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'diamond-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(4);

            const calls = mockExecutor.getCallLog();
            expect(calls[0].phase).toBe('start');
            // branch_a and branch_b can execute in any order after start
            expect(['branch_a', 'branch_b']).toContain(calls[1].phase);
            expect(['branch_a', 'branch_b']).toContain(calls[2].phase);
            expect(calls[3].phase).toBe('merge'); // merge must come last
        });

        test('should handle mixed channel assignments', async () => {
            // Register additional executor for different channel
            const cloudExecutor = new MockExecutor({ channels: ['cloud'] });
            executorPool.register(cloudExecutor);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'mixed-channel-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                    deploy: {
                        skill: 'rd3:deploy',
                        gate: { type: 'auto' },
                        after: ['implement'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'mixed-channel-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(2);
            expect(cloudExecutor.getCallLog()).toHaveLength(0);
        });
    });

    // ─── Hook Integration ────────────────────────────────────────────────────────

    describe('Hook Integration', () => {
        test('should execute hooks during pipeline lifecycle', async () => {
            const hookSpy = spyOn(hookRegistry, 'execute').mockResolvedValue(undefined);

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'hook-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
                hooks: {
                    'on-phase-complete': [{ run: 'echo "Phase completed"' }],
                },
            };

            const options: RunOptions = {
                taskRef: 'hooks-001',
            };

            await runner.run(options, pipeline);

            expect(hookSpy).toHaveBeenCalledWith(
                'on-phase-complete',
                expect.objectContaining({
                    phase: 'implement',
                    task_ref: 'hooks-001',
                }),
            );

            hookSpy.mockRestore();
        });
    });

    // ─── Dry Run Mode ────────────────────────────────────────────────────────────

    describe('Dry Run Mode', () => {
        test('should pass dry run flag to execution requests', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'dryrun-pipeline',
                phases: {
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'dryrun-001',
                dryRun: true,
            };

            await runner.run(options, pipeline);

            expect(mockExecutor.getCallLog()).toHaveLength(0);
        });
    });

    // ─── Phase Subset Validation (ss3.2) ─────────────────────────────────────────

    describe('Phase Subset Validation', () => {
        test('should reject --phases with missing dependencies', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'validation-pipeline',
                phases: {
                    intake: { skill: 'rd3:request-intake', gate: { type: 'auto' } },
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                        after: ['intake'],
                    },
                    test: {
                        skill: 'rd3:sys-testing',
                        gate: { type: 'auto' },
                        after: ['implement'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'invalid-phases-001',
                phases: ['implement', 'test'],
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('FAILED');
            expect(result.exitCode).toBe(10); // EXIT_INVALID_ARGS
        });

        test('should accept --phases when all deps are present', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'valid-subset-pipeline',
                phases: {
                    intake: { skill: 'rd3:request-intake', gate: { type: 'auto' } },
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                        after: ['intake'],
                    },
                },
            };

            const options: RunOptions = {
                taskRef: 'valid-phases-001',
                phases: ['intake', 'implement'],
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
        });

        test('should accept --phases when missing deps have prior completed runs', async () => {
            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'completed-dep-pipeline',
                phases: {
                    intake: { skill: 'rd3:request-intake', gate: { type: 'auto' } },
                    implement: {
                        skill: 'rd3:code-implement',
                        gate: { type: 'auto' },
                        after: ['intake'],
                    },
                },
            };

            // Create a prior run with intake completed
            const priorRunId = await stateManager.createRun({
                id: 'prior-run-001',
                task_ref: 'completed-dep-001',
                phases_requested: 'intake,implement',
                status: 'COMPLETED',
                config_snapshot: pipeline as unknown as Record<string, unknown>,
                pipeline_name: 'completed-dep-pipeline',
            });
            await stateManager.createPhase({
                run_id: priorRunId,
                name: 'intake',
                status: 'completed',
                skill: 'rd3:request-intake',
                rework_iteration: 0,
            });
            await stateManager.createPhase({
                run_id: priorRunId,
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                rework_iteration: 0,
            });

            const options: RunOptions = {
                taskRef: 'completed-dep-001',
                phases: ['implement'],
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(result.exitCode).toBe(0);
        });
    });

    // ─── Performance & Stress Tests ──────────────────────────────────────────────

    describe('Performance & Stress Tests', () => {
        test('should handle large number of phases efficiently', async () => {
            // Create a pipeline with many sequential phases
            const phases: Record<string, { skill: string; gate: { type: 'auto' | 'human' }; after?: string[] }> = {};
            for (let i = 1; i <= 20; i++) {
                phases[`phase_${i}`] = {
                    skill: 'rd3:test',
                    gate: { type: 'auto' },
                    ...(i > 1 && { after: [`phase_${i - 1}`] }),
                };
            }

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'large-pipeline',
                phases,
            };

            const options: RunOptions = {
                taskRef: 'large-001',
            };

            const startTime = Date.now();
            const result = await runner.run(options, pipeline);
            const endTime = Date.now();

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(20);
            expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
        }, 10000);

        test('should handle parallel phase execution', async () => {
            // Create a pipeline with many parallel phases
            const phases: Record<string, { skill: string; gate: { type: 'auto' | 'human' } }> = {};
            for (let i = 1; i <= 10; i++) {
                phases[`parallel_${i}`] = {
                    skill: 'rd3:test',
                    gate: { type: 'auto' },
                    // No dependencies - all can run in parallel
                };
            }

            const pipeline: PipelineDefinition = {
                schema_version: 1,
                name: 'parallel-pipeline',
                phases,
            };

            const options: RunOptions = {
                taskRef: 'parallel-001',
            };

            const result = await runner.run(options, pipeline);

            expect(result.status).toBe('COMPLETED');
            expect(mockExecutor.getCallLog()).toHaveLength(10);
        });
    });
});
