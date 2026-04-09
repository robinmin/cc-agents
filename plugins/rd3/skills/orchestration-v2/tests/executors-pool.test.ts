import { describe, test, expect } from 'bun:test';
import { LocalExecutor } from '../scripts/executors/local';
import { AcpExecutor } from '../scripts/executors/acp';
import { ExecutorPool } from '../scripts/executors/pool';
import { MockExecutor } from '../scripts/executors/mock';
import type { ExecutionRequest } from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

setGlobalSilent(true);

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
    return {
        skill: 'rd3:orchestration-v2',
        phase: 'test',
        prompt: 'hello',
        payload: {},
        channel: 'auto',
        timeoutMs: 5000,
        ...overrides,
    };
}

// ── LocalExecutor ────────────────────────────────────────────────────────────────

describe('LocalExecutor', () => {
    test('has id "auto" and registers auto/current channels', () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        expect(exec.id).toBe('auto');
        expect(exec.capabilities.channels).toContain('auto');
        expect(exec.capabilities.channels).toContain('current');
    });

    test('inherits parallel from injected delegate', () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        expect(exec.capabilities.parallel).toBe(true); // MockExecutor has parallel: true
        expect(exec.capabilities.maxConcurrency).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('dispose delegates to injected executor', async () => {
        const mock = new MockExecutor();
        const exec = new LocalExecutor(mock);
        await exec.dispose();
        expect(mock.getCallLog()).toHaveLength(0); // MockExecutor clears log on dispose
    });

    test('healthCheck delegates to injected executor', async () => {
        const exec = new LocalExecutor(new MockExecutor());
        const health = await exec.healthCheck();
        expect(health.healthy).toBe(true);
    });

    test('execute delegates to injected executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: { success: true, exitCode: 0, durationMs: 42, timedOut: false } }]);
        const exec = new LocalExecutor(mock);

        const result = await exec.execute(makeRequest({ phase: 'implement' }));

        expect(result.success).toBe(true);
        expect(result.durationMs).toBe(42);
        expect(mock.getCallLog()[0].phase).toBe('implement');
    });
});

// ── AcpExecutor ────────────────────────────────────────────────────────────────

describe('AcpExecutor', () => {
    test('has correct id from agent name', () => {
        const exec = new AcpExecutor('codex');
        expect(exec.id).toBe('acp:codex');
        expect(exec.capabilities.parallel).toBe(true);
        expect(exec.capabilities.maxConcurrency).toBe(4);
        expect(exec.capabilities.channels).toContain('codex');
        expect(exec.capabilities.channels).toContain('acp');
    });

    test('dispose is idempotent', async () => {
        const exec = new AcpExecutor('pi');
        await exec.dispose();
        await expect(exec.dispose()).resolves.toBeUndefined();
    });
});

// ── ExecutorPool ───────────────────────────────────────────────────────────────

/**
 * Tests that depend only on 'auto' and the deprecated 'current' alias.
 * These tests do NOT read the real config file and are fully isolated.
 */
describe('ExecutorPool (config-independent)', () => {
    test('getDefault returns auto executor', () => {
        const pool = new ExecutorPool();
        expect(pool.getDefault().id).toBe('auto');
    });

    test('resolve("auto") returns auto executor', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('auto').id).toBe('auto');
    });

    test('resolve("current") returns auto executor via compatibility alias', () => {
        const pool = new ExecutorPool();
        expect(pool.resolve('current').id).toBe('auto');
    });

    test('resolve throws for unknown channel', () => {
        const pool = new ExecutorPool();
        expect(() => pool.resolve('unknown-channel')).toThrow();
    });

    test('has returns true for registered channels', () => {
        const pool = new ExecutorPool();
        expect(pool.has('auto')).toBe(true);
        expect(pool.has('current')).toBe(true);
    });

    test('has returns false for unknown channels', () => {
        const pool = new ExecutorPool();
        expect(pool.has('nonexistent')).toBe(false);
    });

    test('disposeAll clears executors', async () => {
        const pool = new ExecutorPool();
        await pool.disposeAll();
        expect(pool.list()).toHaveLength(0);
    });
});

/**
 * Tests for manually registered executors — isolated from the pool's config-driven
 * registration. Uses a fresh pool so config read in constructor does not affect
 * the assertions.
 */
describe('ExecutorPool (manual registration)', () => {
    test('register adds executor for channel alias', () => {
        const pool = new ExecutorPool();
        pool.disableAdapterMode();
        const acp = new AcpExecutor('codex');
        pool.register(acp);
        expect(pool.has('codex')).toBe(true);
        expect(pool.has('acp:codex')).toBe(true);
        expect(pool.get('acp:codex')?.id).toBe('acp:codex');
    });

    test('register adds executor also for its id', () => {
        const pool = new ExecutorPool();
        pool.disableAdapterMode();
        pool.register(new AcpExecutor('openclaw'));
        expect(pool.has('acp:openclaw')).toBe(true);
    });

    test('execute dispatches to manually registered executor', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: { success: true, exitCode: 0, durationMs: 7, timedOut: false } }]);
        const local = new LocalExecutor(mock);
        const pool = new ExecutorPool();
        pool.disableAdapterMode();
        pool.register(local);

        const result = await pool.execute(makeRequest());

        expect(result.durationMs).toBe(7);
        expect(mock.getCallLog()).toHaveLength(1);
    });

    test('execute dispatches to explicitly registered executor by channel', async () => {
        const mock = new MockExecutor();
        mock.setResponses([{ result: { success: true, exitCode: 0, durationMs: 11, timedOut: false } }]);
        const acp = new LocalExecutor(mock); // use LocalExecutor so it registers auto/current
        const pool = new ExecutorPool();
        pool.disableAdapterMode();
        pool.register(acp);

        const result = await pool.execute(makeRequest({ channel: 'current' }));

        expect(result.durationMs).toBe(11);
        expect(mock.getCallLog()).toHaveLength(1);
    });

    test('healthCheckAll returns map with auto executor', async () => {
        const pool = new ExecutorPool();
        pool.disableAdapterMode();
        const results = await pool.healthCheckAll();
        expect(results.has('auto')).toBe(true);
    });
});
