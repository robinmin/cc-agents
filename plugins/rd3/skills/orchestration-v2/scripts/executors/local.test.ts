import { describe, test, expect, beforeAll } from 'bun:test';
import { LocalExecutor } from './local';
import { MockExecutor } from './mock';
import type { ExecutionRequest, ExecutionResult } from '../model';
import { setGlobalSilent } from '../../../../scripts/logger';

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

describe('LocalExecutor', () => {
    test('has id "auto" and registers auto/current channels', () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        expect(exec.id).toBe('auto');
        expect(exec.capabilities.channels).toContain('auto');
        expect(exec.capabilities.channels).toContain('current');
    });

    test('inherits parallel capability from delegate', () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        expect(exec.capabilities.parallel).toBe(true); // MockExecutor has parallel: true
        expect(exec.capabilities.maxConcurrency).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('execute delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: mockResult({ success: true, exitCode: 0 }) }]);
        const exec = new LocalExecutor(mock);

        const result = await exec.execute(makeRequest());

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(mock.getCallLog()).toHaveLength(1);
        expect(mock.getCallLog()[0].phase).toBe('validate');
    });

    test('dispose delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: mockResult() }]);
        const exec = new LocalExecutor(mock);

        await exec.execute(makeRequest());
        await exec.dispose();

        // MockExecutor clears callLog on dispose
        expect(mock.getCallLog()).toHaveLength(0);
    });

    test('healthCheck delegates to the injected executor', async () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        const health = await exec.healthCheck();
        expect(health.healthy).toBe(true);
        expect(health.lastChecked).toBeInstanceOf(Date);
    });

    test('execute passes the delegate id as channel, not the alias', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: mockResult() }]);
        const exec = new LocalExecutor(mock);

        await exec.execute({ ...makeRequest(), channel: 'auto' });

        // The request passed to the delegate should have channel === mock's id,
        // not the alias from the original request.
        const log = mock.getCallLog();
        expect(log).toHaveLength(1);
        expect(log[0].channel).toBe(mock.id as string);
    });
});
