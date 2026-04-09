/**
 * pool.ts tests
 *
 * Tests for executor pool with routing policy support.
 * Tests focus on pool behavior without requiring full ACP transport mocking.
 */

import { describe, it, expect, beforeEach, vi } from 'bun:test';
import type { ExecutionRequest, ExecutionResult } from '../model';

// ─── Mock modules ──────────────────────────────────────────────────────────────

vi.mock('../config/config', () => ({
    resolveConfig: vi.fn().mockReturnValue({
        defaultChannel: 'pi',
        executorChannels: ['pi', 'codex'],
    }),
    loadExternalConfig: vi.fn().mockReturnValue(null),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { ExecutorPool } from './pool';
import { createDefaultPolicy } from './adapter';
import type { Executor } from '../model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createMockExecutor(id: string, channels: string[]): Executor {
    return {
        id,
        name: `Mock (${id})`,
        channels,
        maxConcurrency: 4,
        execute: vi.fn().mockResolvedValue({
            success: true,
            exitCode: 0,
            stdout: 'mock output',
            durationMs: 10,
            timedOut: false,
        } as ExecutionResult),
        healthCheck: vi.fn().mockResolvedValue({
            healthy: true,
            lastChecked: new Date(),
        }),
        dispose: vi.fn().mockResolvedValue(undefined),
    };
}

function createRequest(): ExecutionRequest {
    return {
        skill: 'rd3:test',
        phase: 'implement',
        prompt: 'test prompt',
        payload: { task_ref: 'test' },
        channel: 'pi',
        timeoutMs: 60000,
    };
}

// ─── ExecutorPool Tests ────────────────────────────────────────────────────────

describe('ExecutorPool', () => {
    let pool: ExecutorPool;

    beforeEach(() => {
        vi.clearAllMocks();
        pool = new ExecutorPool();
    });

    describe('constructor', () => {
        it('creates pool with default configuration', () => {
            expect(pool).toBeDefined();
        });

        it('has default routing policy', () => {
            const policy = pool.getRoutingPolicy();
            expect(policy).toBeDefined();
            expect(policy.defaultMode).toBe('stateless');
            expect(policy.defaultAdapterId).toBe('inline');
            expect(policy.channelOverrides?.pi?.adapterId).toBe('acp-oneshot:pi');
            expect(policy.channelOverrides?.codex?.adapterId).toBe('acp-oneshot:codex');
        });
    });

    describe('register', () => {
        it('registers custom executor by ID', () => {
            const mockExec = createMockExecutor('custom:id', ['custom']);
            pool.register(mockExec);

            expect(pool.get('custom:id')).toBe(mockExec);
        });

        it('registers executor channel alias', () => {
            const mockExec = createMockExecutor('alias:id', ['alias-channel']);
            pool.register(mockExec);

            expect(pool.resolve('alias-channel')).toBe(mockExec);
        });
    });

    describe('get', () => {
        it('returns executor by ID', () => {
            const executor = pool.get('inline');
            expect(executor).toBeDefined();
        });

        it('returns undefined for unknown ID', () => {
            const executor = pool.get('nonexistent-id');
            expect(executor).toBeUndefined();
        });

        it('resolves legacy alias "local" to inline', () => {
            const executor = pool.get('local');
            expect(executor).toBeDefined();
            if (executor) {
                expect(executor.id).toBe('inline');
            }
        });
    });

    describe('getDefault', () => {
        it('returns inline executor as default', () => {
            const executor = pool.getDefault();
            expect(executor).toBeDefined();
            expect(executor.id).toBe('inline');
        });
    });

    describe('list', () => {
        it('lists all registered executors', () => {
            const executors = pool.list();
            expect(executors.length).toBeGreaterThan(0);
        });
    });

    describe('resolve', () => {
        it('resolves executor by channel', () => {
            const executor = pool.resolve('inline');
            expect(executor).toBeDefined();
            expect(executor.id).toBe('inline');
        });

        it('resolves legacy alias "local" to inline', () => {
            const executor = pool.resolve('local');
            expect(executor.id).toBe('inline');
        });

        it('resolves legacy alias "direct" to subprocess', () => {
            const executor = pool.resolve('direct');
            expect(executor.id).toBe('subprocess');
        });

        it('throws for unknown channel', () => {
            expect(() => pool.resolve('unknown-channel')).toThrow();
        });
    });

    describe('has', () => {
        it('returns true for registered channel', () => {
            expect(pool.has('inline')).toBe(true);
        });

        it('returns true for legacy aliases', () => {
            expect(pool.has('local')).toBe(true);
            expect(pool.has('direct')).toBe(true);
            expect(pool.has('auto')).toBe(true);
            expect(pool.has('current')).toBe(true);
        });

        it('returns false for unknown channel', () => {
            expect(pool.has('unknown-channel')).toBe(false);
        });
    });

    describe('execute', () => {
        it('throws for unknown executor ID', async () => {
            const req = createRequest();

            await expect(pool.execute(req, 'nonexistent')).rejects.toThrow();
        });
    });

    describe('healthCheckAll', () => {
        it('returns health status for all executors', async () => {
            const results = await pool.healthCheckAll();
            expect(results.size).toBeGreaterThan(0);
        });
    });

    describe('disposeAll', () => {
        it('cleans up all executors', async () => {
            await pool.disposeAll();
            expect(pool.list()).toHaveLength(0);
        });
    });
});

describe('Routing Policy Integration', () => {
    let pool: ExecutorPool;

    beforeEach(() => {
        vi.clearAllMocks();
        pool = new ExecutorPool();
    });

    describe('getRoutingPolicy', () => {
        it('returns stateless as default mode', () => {
            expect(pool.getRoutingPolicy().defaultMode).toBe('stateless');
        });

        it('returns inline as default adapter ID', () => {
            expect(pool.getRoutingPolicy().defaultAdapterId).toBe('inline');
        });
    });
});

describe('createDefaultPolicy', () => {
    it('creates stateless policy by default', () => {
        const policy = createDefaultPolicy('test:adapter');
        expect(policy.defaultMode).toBe('stateless');
        expect(policy.defaultAdapterId).toBe('test:adapter');
    });
});

describe('execute with routing', () => {
    // Helper: create a pool with only mock executors to avoid real ACP calls
    function createMockPool(): ExecutorPool {
        const pool = new ExecutorPool();
        // Override executors with mocks
        const mockExec = createMockExecutor('mock-exec', ['mock-channel']);
        pool.register(mockExec);
        return pool;
    }

    it('uses explicit executor ID which bypasses routing', async () => {
        const pool2 = createMockPool();
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'mock-channel',
            timeoutMs: 60000,
        };
        // When executorId is provided, it bypasses routing entirely
        const result = await pool2.execute(req, 'mock-exec');
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    });

    it('preserves explicit subprocess channel selection before policy fallback', async () => {
        const pool2 = new ExecutorPool();
        const subprocess = pool2.resolve('subprocess');
        const executeSpy = vi.spyOn(subprocess, 'execute').mockResolvedValue({
            success: true,
            exitCode: 0,
            stdout: 'subprocess output',
            durationMs: 12,
            timedOut: false,
        });
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'subprocess',
            timeoutMs: 60000,
        };

        const result = await pool2.execute(req);

        expect(result.success).toBe(true);
        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(executeSpy).toHaveBeenCalledWith(req);
    });

    it('preserves legacy direct channel selection before policy fallback', async () => {
        const pool2 = new ExecutorPool();
        const subprocess = pool2.resolve('subprocess');
        const executeSpy = vi.spyOn(subprocess, 'execute').mockResolvedValue({
            success: true,
            exitCode: 0,
            stdout: 'subprocess output',
            durationMs: 12,
            timedOut: false,
        });
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'direct',
            timeoutMs: 60000,
        };

        const result = await pool2.execute(req);

        expect(result.success).toBe(true);
        expect(executeSpy).toHaveBeenCalledTimes(1);
        expect(executeSpy).toHaveBeenCalledWith(req);
    });

    it('throws for unknown channel instead of falling back to inline', async () => {
        const pool2 = new ExecutorPool();
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'nonexistent-channel',
            timeoutMs: 60000,
        };

        await expect(pool2.execute(req)).rejects.toThrow('No executor registered for channel: nonexistent-channel');
    });
});
