import { describe, test, expect, beforeAll } from 'bun:test';
import { MockExecutor } from '../scripts/executors/mock';
import type { ExecutionRequest } from '../scripts/model';

function makeRequest(phase = 'test'): ExecutionRequest {
    return {
        skill: 'rd3:sys-testing',
        phase,
        prompt: 'Run tests',
        payload: {},
        channel: 'mock',
        timeoutMs: 30000,
    };
}

import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('MockExecutor', () => {
    test('returns default success result', async () => {
        const executor = new MockExecutor();
        const result = await executor.execute(makeRequest());

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.timedOut).toBe(false);
    });

    test('logs calls', async () => {
        const executor = new MockExecutor();
        await executor.execute(makeRequest('phase-a'));
        await executor.execute(makeRequest('phase-b'));

        const log = executor.getCallLog();
        expect(log).toHaveLength(2);
        expect(log[0].phase).toBe('phase-a');
        expect(log[1].phase).toBe('phase-b');
    });

    test('returns sequential responses', async () => {
        const executor = new MockExecutor();
        executor.setResponses([
            { result: { success: true, exitCode: 0, durationMs: 100, timedOut: false } },
            { result: { success: false, exitCode: 1, durationMs: 200, timedOut: false } },
        ]);

        const first = await executor.execute(makeRequest());
        expect(first.success).toBe(true);

        const second = await executor.execute(makeRequest());
        expect(second.success).toBe(false);

        // Third call gets default
        const third = await executor.execute(makeRequest());
        expect(third.success).toBe(true);
    });

    test('healthCheck returns healthy', async () => {
        const executor = new MockExecutor();
        const health = await executor.healthCheck();
        expect(health.healthy).toBe(true);
    });

    test('dispose clears state', async () => {
        const executor = new MockExecutor();
        await executor.execute(makeRequest());
        await executor.dispose();

        expect(executor.getCallLog()).toHaveLength(0);
    });

    test('reset clears call log', async () => {
        const executor = new MockExecutor();
        await executor.execute(makeRequest());
        expect(executor.getCallLog()).toHaveLength(1);

        executor.reset();
        expect(executor.getCallLog()).toHaveLength(0);
    });

    test('properties are correct', () => {
        const executor = new MockExecutor();
        expect(executor.id).toBe('mock');
        expect(executor.name).toBe('Mock Executor');
        expect(executor.maxConcurrency).toBe(Number.MAX_SAFE_INTEGER);
        expect(executor.channels).toContain('mock');
    });
});
