/**
 * orchestration-v2 — PipelineRunner Tests
 *
 * Unit tests for the PipelineRunner class and its dependencies.
 * Tests cover: FSM transitions, DAG scheduling, gate types, and runner lifecycle.
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { mkdirSync, rmSync } from 'node:fs';
import type {
    RunOptions,
    PipelineDefinition,
    RunRecord,
    PhaseRecord,
    GateResult,
    FSMState,
    ExecutionResult,
    ChainState,
} from '../model';
import { FSMEngine } from './fsm';
import { DAGScheduler, validatePhaseSubset } from './dag';

// ─── Test Directory Setup ───────────────────────────────────────────────────────

const TEST_DIR = '/tmp/orchestrator-runner-test';

function setupTestDir(): void {
    mkdirSync(TEST_DIR, { recursive: true });
}

function cleanupTestDir(): void {
    rmSync(TEST_DIR, { recursive: true, force: true });
}

beforeEach(() => {
    setupTestDir();
    cleanupTestDir();
    setupTestDir();
});

// ─── Mock Implementations ───────────────────────────────────────────────────────

class MockStateManager {
    private runs: Map<string, RunRecord> = new Map();
    private phases: Map<string, PhaseRecord[]> = new Map();
    private gateResults: GateResult[] = [];
    private rollbackSnapshots: Map<string, unknown> = new Map();

    async createRun(record: Omit<RunRecord, 'created_at' | 'updated_at'>): Promise<string> {
        this.runs.set(record.id, record as RunRecord);
        return record.id;
    }

    async getRun(runId: string): Promise<RunRecord | null> {
        return this.runs.get(runId) ?? null;
    }

    async getRunByTaskRef(taskRef: string): Promise<RunRecord | null> {
        for (const run of this.runs.values()) {
            if (run.task_ref === taskRef) return run;
        }
        return null;
    }

    async updateRunStatus(_runId: string, _status: FSMState): Promise<void> {
        // No-op for tests
    }

    async createPhase(phase: Omit<PhaseRecord, never>): Promise<void> {
        const runPhases = this.phases.get(phase.run_id) ?? [];
        runPhases.push(phase as PhaseRecord);
        this.phases.set(phase.run_id, runPhases);
    }

    async getPhases(runId: string): Promise<PhaseRecord[]> {
        return this.phases.get(runId) ?? [];
    }

    async getPhasesByStatus(runId: string, status: string): Promise<PhaseRecord[]> {
        return (this.phases.get(runId) ?? []).filter((p) => p.status === status);
    }

    async getPhase(_runId: string, _phaseName: string): Promise<PhaseRecord | null> {
        return null;
    }

    async updatePhaseStatus(
        _runId: string,
        _phaseName: string,
        _status: unknown,
        _errorCode?: string,
        _errorMessage?: string,
    ): Promise<void> {
        // No-op for tests
    }

    async updatePhase(_runId: string, _phaseName: string, _status: unknown): Promise<void> {
        // No-op for tests
    }

    async updatePhaseReworkIteration(_runId: string, _phaseName: string, _iteration: number): Promise<void> {
        // No-op for tests
    }

    async saveGateResult(result: GateResult): Promise<void> {
        this.gateResults.push(result);
    }

    async savePhaseEvidence(_evidence: unknown): Promise<void> {
        // No-op for tests
    }

    async getRollbackSnapshot(_runId: string, _phaseName: string): Promise<unknown> {
        return this.rollbackSnapshots.get(`${_runId}:${_phaseName}`) ?? null;
    }

    async saveRollbackSnapshot(snapshot: unknown): Promise<void> {
        const s = snapshot as { run_id: string; phase_name: string };
        this.rollbackSnapshots.set(`${s.run_id}:${s.phase_name}`, snapshot);
    }

    getDb(): unknown {
        return {};
    }

    // Test helpers
    setRun(run: RunRecord): void {
        this.runs.set(run.id, run);
    }

    getGateResults(): GateResult[] {
        return this.gateResults;
    }
}

class MockExecutorPool {
    executeCount = 0;
    mockResult: ExecutionResult = {
        success: true,
        exitCode: 0,
        stdout: 'success',
        stderr: '',
        durationMs: 100,
        timedOut: false,
    };

    async execute(_req: unknown): Promise<ExecutionResult> {
        this.executeCount++;
        return this.mockResult;
    }

    async healthCheck(): Promise<{ healthy: boolean }> {
        return { healthy: true };
    }

    async dispose(): Promise<void> {}
}

class MockVerificationDriver {
    runChainCount = 0;
    mockResult: ChainState = { status: 'pass', results: [] };

    async runChain(_manifest: unknown): Promise<ChainState> {
        this.runChainCount++;
        return this.mockResult;
    }
}

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

function createTestPipeline(overrides?: Partial<PipelineDefinition>): PipelineDefinition {
    return {
        schema_version: 1,
        name: 'test-pipeline',
        phases: {
            init: {
                skill: 'rd3:dev-init',
                gate: { type: 'command', command: 'echo test' },
            },
            plan: {
                skill: 'rd3:dev-plan',
                gate: { type: 'command', command: 'echo test' },
                after: ['init'],
            },
            implement: {
                skill: 'rd3:dev-implement',
                gate: { type: 'command', command: 'echo test' },
                after: ['plan'],
            },
            verify: {
                skill: 'rd3:dev-verify',
                gate: { type: 'command', command: 'echo test' },
                after: ['implement'],
            },
        },
        ...overrides,
    };
}

function createTestOptions(overrides?: Partial<RunOptions>): RunOptions {
    return {
        taskRef: 'docs/tasks2/0001_test.md',
        ...overrides,
    };
}

// ─── FSMEngine Tests ───────────────────────────────────────────────────────────

describe('FSMEngine', () => {
    test('initial state is IDLE', () => {
        const fsm = new FSMEngine();
        expect(fsm.getState()).toBe('IDLE');
    });

    test('transitions from IDLE to RUNNING on "run" event', () => {
        const fsm = new FSMEngine();
        const result = fsm.transition('run');

        expect(result.fromState).toBe('IDLE');
        expect(result.toState).toBe('RUNNING');
        expect(fsm.getState()).toBe('RUNNING');
    });

    test('transitions from RUNNING to COMPLETED on "all-phases-done" event', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('all-phases-done');

        expect(result.fromState).toBe('RUNNING');
        expect(result.toState).toBe('COMPLETED');
        expect(fsm.getState()).toBe('COMPLETED');
    });

    test('transitions from RUNNING to PAUSED on "human-gate" event', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('human-gate');

        expect(result.fromState).toBe('RUNNING');
        expect(result.toState).toBe('PAUSED');
        expect(fsm.getState()).toBe('PAUSED');
    });

    test('transitions from PAUSED to RUNNING on "resume-approve" event', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        fsm.transition('human-gate');
        const result = fsm.transition('resume-approve');

        expect(result.fromState).toBe('PAUSED');
        expect(result.toState).toBe('RUNNING');
        expect(fsm.getState()).toBe('RUNNING');
    });

    test('transitions from PAUSED to FAILED on "resume-reject" event', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        fsm.transition('human-gate');
        const result = fsm.transition('resume-reject');

        expect(result.fromState).toBe('PAUSED');
        expect(result.toState).toBe('FAILED');
        expect(fsm.getState()).toBe('FAILED');
    });

    test('transitions from RUNNING to FAILED on "phase-fail-exhausted" event', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('phase-fail-exhausted');

        expect(result.fromState).toBe('RUNNING');
        expect(result.toState).toBe('FAILED');
        expect(fsm.getState()).toBe('FAILED');
    });

    test('ignores invalid transitions', () => {
        const fsm = new FSMEngine();
        const result = fsm.transition('all-phases-done');

        expect(result.toState).toBe('IDLE');
        expect(fsm.getState()).toBe('IDLE');
    });

    test('reset returns to IDLE state', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        fsm.transition('all-phases-done');

        fsm.reset();

        expect(fsm.getState()).toBe('IDLE');
    });

    test('onTransition registers handler', () => {
        const fsm = new FSMEngine();
        let handlerCalled = false;

        fsm.onTransition(() => {
            handlerCalled = true;
        });

        fsm.transition('run');

        expect(handlerCalled).toBe(true);
    });
});

// ─── DAGScheduler Tests ────────────────────────────────────────────────────────

describe('DAGScheduler', () => {
    test('builds DAG from phases', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);

        const nodes = dag.getNodes();
        expect(nodes.size).toBe(4);
        expect(nodes.has('init')).toBe(true);
        expect(nodes.has('plan')).toBe(true);
        expect(nodes.has('implement')).toBe(true);
        expect(nodes.has('verify')).toBe(true);
    });

    test('sets correct dependencies from "after" field', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);

        const nodes = dag.getNodes();
        expect(nodes.get('plan')?.dependencies).toEqual(['init']);
        expect(nodes.get('implement')?.dependencies).toEqual(['plan']);
        expect(nodes.get('verify')?.dependencies).toEqual(['implement']);
    });

    test('evaluates ready phases - first phase is ready', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);

        const eval_ = dag.evaluate();

        expect(eval_.ready).toEqual(['init']);
        expect(eval_.blocked).toEqual(['plan', 'implement', 'verify']);
    });

    test('marks phase as running', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);
        dag.markRunning('init');

        const eval_ = dag.evaluate();

        expect(eval_.ready).not.toContain('init');
        expect(eval_.blocked).not.toContain('init');
    });

    test('marks phase as completed and unblocks dependents', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);
        dag.markRunning('init');
        dag.markCompleted('init');

        const eval_ = dag.evaluate();

        expect(eval_.ready).toContain('plan');
        expect(eval_.completed).toContain('init');
    });

    test('marks phase as failed', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);
        dag.markRunning('init');
        dag.markFailed('init');

        const eval_ = dag.evaluate();

        expect(eval_.failed).toContain('init');
        expect(eval_.ready).not.toContain('init');
    });

    test('marks phase as paused', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);
        dag.markRunning('init');
        dag.markPaused('init');

        const eval_ = dag.evaluate();

        expect(eval_.paused).toContain('init');
        expect(eval_.ready).not.toContain('init');
    });

    test('evaluates DAG with all phases completed', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);
        dag.markCompleted('init');
        dag.markCompleted('plan');
        dag.markCompleted('implement');
        dag.markCompleted('verify');

        const eval_ = dag.evaluate();

        expect(eval_.ready.length).toBe(0);
        expect(eval_.completed).toEqual(['init', 'plan', 'implement', 'verify']);
    });

    test('evaluates DAG with all phases blocked', () => {
        const dag = new DAGScheduler();
        const pipeline = createTestPipeline();

        dag.buildFromPhases(pipeline.phases);

        const eval_ = dag.evaluate();

        expect(eval_.ready).toEqual(['init']);
        expect(eval_.blocked).toEqual(['plan', 'implement', 'verify']);
    });

    test('validates phase subset with all dependencies satisfied', () => {
        const pipeline = createTestPipeline();
        const requested = new Set(['init', 'plan', 'implement']);

        const result = validatePhaseSubset(requested, pipeline.phases);

        expect(result.valid).toBe(true);
        expect(result.missingDeps).toHaveLength(0);
    });

    test('validates phase subset with missing dependencies', () => {
        const pipeline = createTestPipeline();
        const requested = new Set(['plan', 'implement']);

        const result = validatePhaseSubset(requested, pipeline.phases);

        expect(result.valid).toBe(false);
        expect(result.missingDeps).toContainEqual({ phase: 'plan', missingDependency: 'init' });
    });

    test('validates phase subset with completed dependencies satisfied', () => {
        const pipeline = createTestPipeline();
        const requested = new Set(['plan', 'implement']);
        const completed = new Set(['init']);

        const result = validatePhaseSubset(requested, pipeline.phases, completed);

        expect(result.valid).toBe(true);
    });
});

// ─── PipelineRunner Instantiation Tests ────────────────────────────────────────

describe('PipelineRunner instantiation', () => {
    test('creates PipelineRunner with minimal dependencies', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never);

        expect(runner).toBeDefined();
    });

    test('creates PipelineRunner with all dependencies', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');
        const { HookRegistry } = await import('./hooks');
        const { EventBus } = await import('../observability/event-bus');

        const runner = new PipelineRunner(
            stateManager as never,
            executorPool as never,
            new HookRegistry(),
            new EventBus(),
            new MockVerificationDriver() as never,
        );

        expect(runner).toBeDefined();
    });
});

// ─── PipelineRunner.run() Basic Tests ──────────────────────────────────────────

describe('PipelineRunner.run() basic behavior', () => {
    test('throws error when pipeline is not provided', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        await expect(runner.run(createTestOptions())).rejects.toThrow('Pipeline definition required');
    });

    test('returns COMPLETED for dry-run without executing phases', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        const result = await runner.run({ ...createTestOptions(), dryRun: true }, pipeline);

        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
        expect(result.runId).toBeTruthy();
    });

    test('returns FAILED for invalid phase subset', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        // Request only 'plan' phase without its dependency 'init'
        const result = await runner.run({ ...createTestOptions(), phases: ['plan'] }, pipeline);

        expect(result.status).toBe('FAILED');
        expect(result.exitCode).toBe(10); // EXIT_INVALID_ARGS
    });

    test('run result contains all required fields', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        const result = await runner.run({ ...createTestOptions(), dryRun: true }, pipeline);

        expect(result).toHaveProperty('runId');
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('exitCode');
        expect(result).toHaveProperty('durationMs');

        expect(typeof result.runId).toBe('string');
        expect(['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED']).toContain(result.status);
        expect(typeof result.exitCode).toBe('number');
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
});

// ─── PipelineRunner.resume() Tests ─────────────────────────────────────────────

describe('PipelineRunner.resume()', () => {
    test('throws error when no run exists for task ref', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        await expect(runner.resume({ taskRef: 'nonexistent-task' })).rejects.toThrow(
            'No run found for task ref: nonexistent-task',
        );
    });

    test('throws error when run is not paused', async () => {
        const stateManager = new MockStateManager();
        stateManager.setRun({
            id: 'test-run-123',
            task_ref: 'docs/tasks2/0001_test.md',
            phases_requested: 'test',
            status: 'RUNNING',
            config_snapshot: {},
            pipeline_name: 'test-pipeline',
        });

        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        await expect(runner.resume({ taskRef: 'docs/tasks2/0001_test.md' })).rejects.toThrow(
            'Run test-run-123 is not paused (status: RUNNING)',
        );
    });

    test('rejects paused run when reject option is set', async () => {
        const stateManager = new MockStateManager();
        stateManager.setRun({
            id: 'test-run-123',
            task_ref: 'docs/tasks2/0001_test.md',
            phases_requested: 'test',
            status: 'PAUSED',
            config_snapshot: {
                schema_version: 1,
                name: 'test-pipeline',
                phases: {},
            } as never,
            pipeline_name: 'test-pipeline',
        });

        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        const result = await runner.resume({
            taskRef: 'docs/tasks2/0001_test.md',
            reject: true,
        });

        expect(result.status).toBe('FAILED');
        expect(result.exitCode).toBe(1);
    });
});

// ─── PipelineRunner.getStatus() Tests ─────────────────────────────────────────

describe('PipelineRunner.getStatus()', () => {
    test('returns null for non-existent run', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        const result = await runner.getStatus('nonexistent-run');

        expect(result).toBeNull();
    });

    test('returns run record for existing run', async () => {
        const stateManager = new MockStateManager();
        stateManager.setRun({
            id: 'test-run-456',
            task_ref: 'docs/tasks2/0001_test.md',
            phases_requested: 'test',
            status: 'RUNNING',
            config_snapshot: {},
            pipeline_name: 'test-pipeline',
        });

        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        const result = await runner.getStatus('test-run-456');

        expect(result).not.toBeNull();
        expect(result?.id).toBe('test-run-456');
        expect(result?.status).toBe('RUNNING');
    });
});

// ─── PipelineRunner.undo() Tests ─────────────────────────────────────────────

describe('PipelineRunner.undo()', () => {
    test('returns error when no rollback snapshot exists', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        const result = await runner.undo('run-123', 'phase-x');

        expect(result.success).toBe(false);
        expect(result.error).toContain('No rollback snapshot found');
        expect(result.exitCode).toBe(13); // EXIT_STATE_ERROR
    });

    test('undo with force flag bypasses uncommitted changes check', async () => {
        const stateManager = new MockStateManager();
        await stateManager.saveRollbackSnapshot({
            run_id: 'run-123',
            phase_name: 'phase-x',
            files_before: { 'test.ts': 'abc123' },
            files_after: { 'test.ts': 'def456' },
        });

        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);

        // Force bypasses uncommitted changes check
        const result = await runner.undo('run-123', 'phase-x', { force: true });

        expect(typeof result.success).toBe('boolean');
        expect(typeof result.exitCode).toBe('number');
    });
});

// ─── Pipeline Definition Tests ────────────────────────────────────────────────

describe('Pipeline definition', () => {
    test('creates valid pipeline with all phase types', () => {
        const pipeline: PipelineDefinition = {
            schema_version: 1,
            name: 'full-pipeline',
            phases: {
                init: {
                    skill: 'rd3:dev-init',
                    gate: { type: 'command', command: 'echo init' },
                },
                plan: {
                    skill: 'rd3:dev-plan',
                    gate: {
                        type: 'auto',
                        checklist: ['Plan exists', 'Dependencies listed'],
                    },
                    after: ['init'],
                },
                implement: {
                    skill: 'rd3:dev-implement',
                    gate: {
                        type: 'human',
                        prompt: 'Review implementation',
                        blocking: true,
                    },
                    after: ['plan'],
                },
                verify: {
                    skill: 'rd3:dev-verify',
                    gate: { type: 'command', command: 'bun run check' },
                    after: ['implement'],
                },
            },
            presets: {
                plan_only: {
                    phases: ['init', 'plan'],
                },
                full: {
                    phases: ['init', 'plan', 'implement', 'verify'],
                },
            },
        };

        expect(pipeline.phases.init.gate?.type).toBe('command');
        expect(pipeline.phases.plan.gate?.type).toBe('auto');
        expect(pipeline.phases.implement.gate?.type).toBe('human');
        expect(pipeline.phases.verify.gate?.type).toBe('command');
        expect(pipeline.presets?.plan_only.phases).toEqual(['init', 'plan']);
    });

    test('validates preset phases are valid phase names', () => {
        const pipeline = createTestPipeline({
            presets: {
                test_preset: {
                    phases: ['init', 'verify'],
                },
            },
        });

        expect(pipeline.phases.init).toBeDefined();
        expect(pipeline.phases.verify).toBeDefined();
    });
});

// ─── Timeout Parsing Tests ────────────────────────────────────────────────────

describe('Timeout configuration', () => {
    test('pipeline accepts timeout strings', () => {
        const pipeline = createTestPipeline({
            phases: {
                slow: {
                    skill: 'rd3:slow-skill',
                    timeout: '5m',
                },
                slower: {
                    skill: 'rd3:slower-skill',
                    timeout: '2h',
                },
                fast: {
                    skill: 'rd3:fast-skill',
                    timeout: '30s',
                },
            },
        });

        expect(pipeline.phases.slow.timeout).toBe('5m');
        expect(pipeline.phases.slower.timeout).toBe('2h');
        expect(pipeline.phases.fast.timeout).toBe('30s');
    });

    test('phase without timeout uses undefined', () => {
        const pipeline = createTestPipeline({
            phases: {
                no_timeout: {
                    skill: 'rd3:test',
                },
            },
        });

        expect(pipeline.phases.no_timeout.timeout).toBeUndefined();
    });
});

// ─── Gate Configuration Tests ─────────────────────────────────────────────────

describe('Gate configuration', () => {
    test('command gate requires command field', () => {
        const gate = { type: 'command' as const, command: 'bun test' };
        expect(gate.command).toBe('bun test');
    });

    test('auto gate supports checklist', () => {
        const gate = {
            type: 'auto' as const,
            checklist: ['Item 1', 'Item 2', 'Item 3'],
        };
        expect(gate.checklist).toHaveLength(3);
    });

    test('human gate supports blocking flag', () => {
        const blockingGate = {
            type: 'human' as const,
            blocking: true,
            prompt: 'Must approve',
        };
        const advisoryGate = {
            type: 'human' as const,
            blocking: false,
            prompt: 'Optional review',
        };

        expect(blockingGate.blocking).toBe(true);
        expect(advisoryGate.blocking).toBe(false);
    });

    test('gate supports rework configuration', () => {
        const gate = {
            type: 'auto' as const,
            rework: {
                max_iterations: 3,
                escalation: 'pause' as const,
            },
        };

        expect(gate.rework?.max_iterations).toBe(3);
        expect(gate.rework?.escalation).toBe('pause');
    });

    test('gate supports severity configuration', () => {
        const blockingGate = {
            type: 'auto' as const,
            severity: 'blocking' as const,
        };
        const advisoryGate = {
            type: 'auto' as const,
            severity: 'advisory' as const,
        };

        expect(blockingGate.severity).toBe('blocking');
        expect(advisoryGate.severity).toBe('advisory');
    });
});

// ─── PipelineRunner Gate Execution Tests ────────────────────────────────────────

describe('PipelineRunner gate execution', () => {
    test('executes single phase with passing command gate', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: { type: 'command', command: 'echo success && exit 0' },
                },
            },
        });

        const result = await runner.run(createTestOptions(), pipeline);

        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
        expect(executorPool.executeCount).toBeGreaterThan(0);
    });

    test('handles command gate failure', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: { type: 'command', command: 'exit 1' },
                },
            },
        });

        const result = await runner.run(createTestOptions(), pipeline);

        expect(result.status).toBe('FAILED');
        expect(result.exitCode).toBe(1);
    });

    test('handles missing command in command gate', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: { type: 'command' }, // No command specified
                },
            },
        });

        const result = await runner.run(createTestOptions(), pipeline);

        expect(result.status).toBe('FAILED');
        expect(result.exitCode).toBe(1);
    });

    test('blocking human gate pauses pipeline regardless of --auto', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: {
                        type: 'human',
                        blocking: true,
                        prompt: 'Approval required',
                    },
                },
            },
        });

        const result = await runner.run({ ...createTestOptions(), auto: true }, pipeline);

        // Blocking human gates pause even with --auto
        expect(result.status).toBe('PAUSED');
        expect(result.exitCode).toBe(0);
    });

    test('advisory human gate is bypassed by --auto', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: {
                        type: 'human',
                        blocking: false,
                        prompt: 'Optional approval',
                    },
                },
            },
        });

        const result = await runner.run({ ...createTestOptions(), auto: true }, pipeline);

        // Advisory human gates are bypassed by --auto
        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
    });

    test('non-blocking human gate pauses without --auto', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                test: {
                    skill: 'rd3:test',
                    gate: {
                        type: 'human',
                        blocking: false,
                        prompt: 'Optional approval',
                    },
                },
            },
        });

        const result = await runner.run(createTestOptions(), pipeline);

        // Non-blocking human gates pause without --auto
        expect(result.status).toBe('PAUSED');
        expect(result.exitCode).toBe(0);
    });
});

// ─── PipelineRunner Phase Chain Tests ──────────────────────────────────────────

describe('PipelineRunner phase chain', () => {
    test('executes multiple phases in dependency order', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            phases: {
                init: {
                    skill: 'rd3:dev-init',
                    gate: { type: 'command', command: 'exit 0' },
                },
                plan: {
                    skill: 'rd3:dev-plan',
                    gate: { type: 'command', command: 'exit 0' },
                    after: ['init'],
                },
            },
        });

        const result = await runner.run(createTestOptions(), pipeline);

        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
        // Should execute init first, then plan
        expect(executorPool.executeCount).toBeGreaterThanOrEqual(2);
    });

    test('handles preset phases correctly', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline({
            presets: {
                plan_only: {
                    phases: ['init', 'plan'],
                },
            },
            phases: {
                init: {
                    skill: 'rd3:dev-init',
                    gate: { type: 'command', command: 'exit 0' },
                },
                plan: {
                    skill: 'rd3:dev-plan',
                    gate: { type: 'command', command: 'exit 0' },
                    after: ['init'],
                },
                implement: {
                    skill: 'rd3:dev-implement',
                    gate: { type: 'command', command: 'exit 0' },
                    after: ['plan'],
                },
                verify: {
                    skill: 'rd3:dev-verify',
                    gate: { type: 'command', command: 'exit 0' },
                    after: ['implement'],
                },
            },
        });

        const result = await runner.run({ ...createTestOptions(), preset: 'plan_only' }, pipeline);

        expect(result.status).toBe('COMPLETED');
        // Should only execute init and plan
        expect(executorPool.executeCount).toBe(2);
    });

    test('handles specific phases correctly', async () => {
        const stateManager = new MockStateManager();
        const executorPool = new MockExecutorPool();
        const { PipelineRunner } = await import('./runner');

        const runner = new PipelineRunner(stateManager as never, executorPool as never);

        const pipeline = createTestPipeline();

        const result = await runner.run({ ...createTestOptions(), phases: ['init', 'plan'] }, pipeline);

        expect(result.status).toBe('COMPLETED');
        expect(executorPool.executeCount).toBe(2);
    });
});

// ─── PipelineRunResult Structure Tests ────────────────────────────────────────

describe('PipelineRunResult structure', () => {
    test('run result has valid FSM state', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        const result = await runner.run({ ...createTestOptions(), dryRun: true }, pipeline);

        expect(['IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED']).toContain(result.status);
    });

    test('run result has positive duration', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        const result = await runner.run({ ...createTestOptions(), dryRun: true }, pipeline);

        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('run ID is unique', async () => {
        const stateManager = new MockStateManager();
        const { PipelineRunner } = await import('./runner');
        const runner = new PipelineRunner(stateManager as never);
        const pipeline = createTestPipeline();

        const result1 = await runner.run(
            { ...createTestOptions({ taskRef: 'docs/tasks2/0001_test.md' }), dryRun: true },
            pipeline,
        );
        const result2 = await runner.run(
            { ...createTestOptions({ taskRef: 'docs/tasks2/0002_test.md' }), dryRun: true },
            pipeline,
        );

        expect(result1.runId).not.toBe(result2.runId);
    });
});
