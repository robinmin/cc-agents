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
import { AutoExecutor } from './local';
import type { ExecutionRoutingPolicy } from './adapter';
import { createDefaultPolicy } from './adapter';
import type { Executor } from '../model';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createMockExecutor(id: string, channels: string[]): Executor {
    // Executor type has id, capabilities, execute, healthCheck, dispose
    return {
        id,
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
        capabilities: {
            parallel: true,
            streaming: true,
            structuredOutput: true,
            channels: channels,
            maxConcurrency: 4,
        },
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
            expect(policy.channelOverrides?.pi?.adapterId).toBe('acp-stateless:pi');
            expect(policy.channelOverrides?.codex?.adapterId).toBe('acp-stateless:codex');
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
            const executor = pool.get('auto');
            expect(executor).toBeDefined();
        });

        it('returns undefined for unknown ID', () => {
            const executor = pool.get('nonexistent-id');
            expect(executor).toBeUndefined();
        });
    });

    describe('getDefault', () => {
        it('returns default executor', () => {
            const executor = pool.getDefault();
            expect(executor).toBeDefined();
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
            const executor = pool.resolve('auto');
            expect(executor).toBeDefined();
        });

        it('throws for unknown channel', () => {
            expect(() => pool.resolve('unknown-channel')).toThrow();
        });
    });

    describe('has', () => {
        it('returns true for registered channel', () => {
            expect(pool.has('auto')).toBe(true);
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

    describe('enableAdapterMode', () => {
        it('enables adapter mode with default policy', () => {
            pool.enableAdapterMode();
            expect(pool.getRoutingPolicy().defaultMode).toBe('stateless');
        });

        it('enables adapter mode with custom policy', () => {
            const customPolicy: ExecutionRoutingPolicy = {
                defaultAdapterId: 'acp:pi',
                defaultMode: 'sessioned',
            };
            pool.enableAdapterMode(customPolicy);
            expect(pool.getRoutingPolicy().defaultMode).toBe('sessioned');
            expect(pool.getRoutingPolicy().channelOverrides?.codex?.adapterId).toBe('acp-sessioned:codex');
        });
    });

    describe('disableAdapterMode', () => {
        it('disables adapter mode and restores legacy executors', () => {
            pool.enableAdapterMode();
            pool.disableAdapterMode();
            expect(pool.get('pi')).toBeDefined();
        });
    });

    describe('getRoutingPolicy', () => {
        it('returns stateless as default mode', () => {
            expect(pool.getRoutingPolicy().defaultMode).toBe('stateless');
        });

        it('returns default adapter ID', () => {
            expect(pool.getRoutingPolicy().defaultAdapterId).toBeDefined();
        });
    });
});

describe('AutoExecutor', () => {
    it('can be instantiated directly', () => {
        const auto = new AutoExecutor();
        expect(auto).toBeDefined();
        expect(auto.id).toBe('auto');
    });
});

describe('createDefaultPolicy', () => {
    it('creates stateless policy by default', () => {
        const policy = createDefaultPolicy('test:adapter');
        expect(policy.defaultMode).toBe('stateless');
        expect(policy.defaultAdapterId).toBe('test:adapter');
    });
});

describe('executeWithPolicy (adapter mode)', () => {
    // Helper: create a pool with only mock executors to avoid real ACP calls
    function createMockPool(): ExecutorPool {
        const pool = new ExecutorPool();
        // Override executors with mocks
        const mockExec = createMockExecutor('mock-exec', ['mock-channel']);
        pool.register(mockExec);
        return pool;
    }

    it('falls back to legacy mode when adapter not found and executor exists', async () => {
        const pool2 = createMockPool();
        pool2.enableAdapterMode({
            defaultAdapterId: 'nonexistent:adapter',
            defaultMode: 'stateless',
        });
        // Create request with mock channel directly
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'mock-channel',
            timeoutMs: 60000,
        };
        // Should fall back to legacy mode and resolve mock executor
        const result = await pool2.execute(req);
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
    });

    it('falls back to legacy mode and throws when no executor found', async () => {
        const pool2 = createMockPool();
        pool2.enableAdapterMode({
            defaultAdapterId: 'nonexistent:adapter',
            defaultMode: 'stateless',
        });
        // Create request with nonexistent channel
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'nonexistent-channel',
            timeoutMs: 60000,
        };
        // Should fall back to legacy mode and throw
        await expect(pool2.execute(req)).rejects.toThrow('No executor registered for channel');
    });

    it('uses explicit executor ID which bypasses adapter mode', async () => {
        const pool2 = createMockPool();
        // Create request with mock channel directly
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test prompt',
            payload: { task_ref: 'test' },
            channel: 'mock-channel',
            timeoutMs: 60000,
        };
        // When executorId is provided, it bypasses adapter mode entirely
        const result = await pool2.execute(req, 'mock-exec');
        expect(result).toBeDefined();
    });
});
