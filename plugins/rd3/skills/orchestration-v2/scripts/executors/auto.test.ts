import { beforeAll, describe, expect, test } from 'bun:test';
import type { ExecutionRequest, ExecutionResult } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';
import { AutoExecutor } from './auto';
import { MockExecutor } from './mock';

beforeAll(() => {
    setGlobalSilent(true);
});

function makeRequest(phase = 'validate'): ExecutionRequest {
    return {
        skill: 'rd3:orchestration-v2',
        phase,
        prompt: 'Validate pipeline',
        payload: {},
        channel: 'auto',
        timeoutMs: 5000,
    };
}

function mockResult(overrides: Partial<ExecutionResult> = {}): ExecutionResult {
    return {
        success: true,
        exitCode: 0,
        durationMs: 50,
        timedOut: false,
        ...overrides,
    };
}

describe('AutoExecutor', () => {
    test('has id "auto" and registers auto/current channels', () => {
        const mock = new MockExecutor();
        const exec = new AutoExecutor(mock);
        expect(exec.id).toBe('auto');
        expect(exec.capabilities.channels).toContain('auto');
        expect(exec.capabilities.channels).toContain('current');
    });

    test('inherits parallel capability from delegate', () => {
        const mock = new MockExecutor();
        const exec = new AutoExecutor(mock);
        expect(exec.capabilities.parallel).toBe(true);
        expect(exec.capabilities.maxConcurrency).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('execute delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: mockResult({ success: true, exitCode: 0 }) }]);
        const exec = new AutoExecutor(mock);

        const result = await exec.execute(makeRequest());

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(mock.getCallLog()).toHaveLength(1);
        expect(mock.getCallLog()[0].channel).toBe(mock.id as string);
    });

    test('dispose delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: mockResult() }]);
        const exec = new AutoExecutor(mock);

        await exec.execute(makeRequest());
        await exec.dispose();

        expect(mock.getCallLog()).toHaveLength(0);
    });

    test('healthCheck delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        const exec = new AutoExecutor(mock);
        const health = await exec.healthCheck();
        expect(health.healthy).toBe(true);
        expect(health.lastChecked).toBeInstanceOf(Date);
    });
});
