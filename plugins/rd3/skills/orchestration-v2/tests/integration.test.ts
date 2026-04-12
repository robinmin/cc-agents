import { describe, test, expect, beforeEach, afterEach, beforeAll, spyOn } from 'bun:test';
import { StateManager } from '../scripts/state/manager';
import { Queries } from '../scripts/state/queries';
import type { RunSummary } from '../scripts/state/queries';
import { EventBus } from '../scripts/observability/event-bus';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import { PipelineRunner } from '../scripts/engine/runner';
import { Reporter } from '../scripts/observability/reporter';
import type { PipelineDefinition, RunOptions } from '../scripts/model';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';

const MOCK_PIPELINE: PipelineDefinition = {
    schema_version: 1,
    name: 'test-pipeline',
    stack: {
        language: 'typescript',
        runtime: 'bun',
        linter: 'biome',
        test: 'bun test',
        coverage: 'bun test --coverage',
    },
    phases: {
        'phase-a': {
            skill: 'rd3:mock-a',
            gate: { type: 'auto' },
            timeout: '5m',
        },
        'phase-b': {
            skill: 'rd3:mock-b',
            gate: { type: 'auto' },
            timeout: '5m',
            after: ['phase-a'],
        },
    },
};

const PARALLEL_PIPELINE: PipelineDefinition = {
    schema_version: 1,
    name: 'parallel-test',
    stack: {
        language: 'typescript',
        runtime: 'bun',
        linter: 'biome',
        test: 'bun test',
        coverage: 'bun test --coverage',
    },
    phases: {
        intake: { skill: 'rd3:mock-intake', gate: { type: 'auto' }, timeout: '1m' },
        implement: { skill: 'rd3:mock-impl', gate: { type: 'auto' }, timeout: '1m', after: ['intake'] },
        'verify-bdd': { skill: 'rd3:mock-bdd', gate: { type: 'auto' }, timeout: '1m', after: ['implement'] },
        'verify-func': { skill: 'rd3:mock-func', gate: { type: 'auto' }, timeout: '1m', after: ['implement'] },
    },
};

import { setGlobalSilent } from '../../../scripts/logger';
import * as llmModule from '../../verification-chain/scripts/methods/llm';

beforeAll(() => {
    setGlobalSilent(true);

    // Mock runLlmCheck to always pass — auto gates use LLM verification
    // which requires external LLM access not available in test
    spyOn(llmModule, 'runLlmCheck').mockResolvedValue({
        result: 'pass',
        evidence: { method: 'llm', result: 'pass', timestamp: new Date().toISOString(), llm_results: [] },
    });
});

describe('Integration: full pipeline run', () => {
    let tempDir: string;
    let stateManager: StateManager;

    beforeEach(() => {
        tempDir = join(tmpdir(), `orch-v2-integration-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
        stateManager = new StateManager({ dbPath: join(tempDir, 'test.db') });
    });

    afterEach(async () => {
        await stateManager.close();
        rmSync(tempDir, { recursive: true, force: true });
    });

    test('runs sequential pipeline from start to completion', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 10, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        const options: RunOptions = { taskRef: '0400' };

        const result = await runner.run(options, MOCK_PIPELINE);

        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
        expect(result.runId).toBeDefined();
    });

    test('runs parallel pipeline with DAG dependencies', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 10, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        const options: RunOptions = { taskRef: '0401' };

        const result = await runner.run(options, PARALLEL_PIPELINE);

        expect(result.status).toBe('COMPLETED');
        expect(result.exitCode).toBe(0);
    });

    test('state persists run after completion', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 5, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        await runner.run({ taskRef: '0402' }, MOCK_PIPELINE);

        const run = await stateManager.getRunByTaskRef('0402');
        expect(run).toBeDefined();
        expect(run?.status).toBe('COMPLETED');
    });

    test('queries produce valid RunSummary', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 5, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        const result = await runner.run({ taskRef: '0403' }, MOCK_PIPELINE);

        const queries = new Queries(stateManager.getDb());
        const summary = await queries.getRunSummary(result.runId);

        expect(summary).toBeDefined();
        expect(summary?.run.task_ref).toBe('0403');
        expect(summary?.run.status).toBe('COMPLETED');
        expect(summary?.phases.length).toBe(2);
        expect(summary?.totalInputTokens).toBeGreaterThanOrEqual(0);
    });

    test('reporter formats completed run', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 5, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        const result = await runner.run({ taskRef: '0404' }, MOCK_PIPELINE);

        const queries = new Queries(stateManager.getDb());
        const summaryRaw = await queries.getRunSummary(result.runId);
        expect(summaryRaw).toBeDefined();
        const summary = summaryRaw as RunSummary;

        const reporter = new Reporter();
        const table = reporter.formatStatusTable(summary);
        expect(table).toContain('0404');
        expect(table).toContain('COMPLETED');

        const markdown = reporter.formatMarkdownReport(summary);
        expect(markdown).toContain('# Pipeline Report');

        const json = reporter.formatJsonReport(summary);
        const parsed = JSON.parse(json) as { run: { task_ref: string } };
        expect(parsed.run.task_ref).toBe('0404');
    });

    test('event bus records events during run', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 5, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const eventBus = new EventBus();
        const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
        eventBus.subscribeAll((event) => {
            events.push({ type: event.event_type, payload: event.payload as Record<string, unknown> });
        });

        const runner = new PipelineRunner(stateManager, pool, undefined, eventBus);
        await runner.run({ taskRef: '0405' }, MOCK_PIPELINE);

        expect(events.length).toBeGreaterThan(0);
        const types = events.map((e) => e.type);
        expect(types).toContain('run.created');
    });

    test('parallel verification phases complete before downstream', async () => {
        await stateManager.init();

        const mockExecutor = new MockExecutor({ delayMs: 10, channels: ['inline', 'auto', 'current'] });
        const pool = new ExecutorPool();
        pool.register(mockExecutor);

        const runner = new PipelineRunner(stateManager, pool);
        const result = await runner.run({ taskRef: '0406' }, PARALLEL_PIPELINE);

        const queries = new Queries(stateManager.getDb());
        const summary = await queries.getRunSummary(result.runId);
        expect(summary).toBeDefined();

        // All 4 phases should be completed
        const completed = summary?.phases.filter((p) => p.status === 'completed');
        expect(completed?.length).toBe(4);

        // Both verify phases should be completed (parallel fan-out from implement)
        const bddPhase = summary?.phases.find((p) => p.name === 'verify-bdd');
        expect(bddPhase).toBeDefined();
        expect(bddPhase?.status).toBe('completed');
        const funcPhase = summary?.phases.find((p) => p.name === 'verify-func');
        expect(funcPhase).toBeDefined();
        expect(funcPhase?.status).toBe('completed');
    });
});
