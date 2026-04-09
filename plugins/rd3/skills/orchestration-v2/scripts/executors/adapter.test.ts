/**
 * adapter.ts tests
 *
 * Tests for transport-agnostic executor adapter interfaces and routing policy.
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import type { ExecutionRequest } from '../model';
import type { PhaseExecutorAdapter, ExecutionRoutingPolicy, ExecutorHealth } from './adapter';
import { routePhase, createDefaultPolicy } from './adapter';
import { DefaultAdapterRegistry } from './adapter';

// ─── Mock Executor ────────────────────────────────────────────────────────────

/**
 * Mock executor for testing.
 */
class MockExecutor implements PhaseExecutorAdapter {
    readonly id: string;
    readonly name: string;
    readonly executionMode: 'stateless' | 'sessioned' = 'stateless';
    readonly channels: readonly string[];

    executeCalls: ExecutionRequest[] = [];

    constructor(id: string, channels: string[] = []) {
        this.id = id;
        this.name = `Mock (${id})`;
        this.channels = channels;
    }

    async execute(req: ExecutionRequest) {
        this.executeCalls.push(req);
        return {
            success: true,
            exitCode: 0,
            stdout: 'mock output',
            durationMs: 100,
            timedOut: false,
        };
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return { healthy: true, lastChecked: new Date() };
    }

    async dispose(): Promise<void> {
        // No-op
    }
}

// ─── Routing Policy Tests ─────────────────────────────────────────────────────

describe('routePhase', () => {
    const basePolicy: ExecutionRoutingPolicy = {
        defaultAdapterId: 'acp:pi',
        defaultMode: 'stateless',
        phaseOverrides: {
            implement: { adapterId: 'local', executionMode: 'stateless' },
        },
        channelOverrides: {
            codex: { adapterId: 'acp:codex', executionMode: 'sessioned' },
        },
    };

    it('returns phase override when phase matches', () => {
        const decision = routePhase(basePolicy, 'implement', 'pi');

        expect(decision.adapterId).toBe('local');
        expect(decision.executionMode).toBe('stateless');
        expect(decision.priority).toBe(1);
    });

    it('returns channel override when channel matches', () => {
        const decision = routePhase(basePolicy, 'review', 'codex');

        expect(decision.adapterId).toBe('acp:codex');
        expect(decision.executionMode).toBe('sessioned');
        expect(decision.priority).toBe(2);
    });

    it('returns defaults when no override matches', () => {
        const decision = routePhase(basePolicy, 'review', 'pi');

        expect(decision.adapterId).toBe('acp:pi');
        expect(decision.executionMode).toBe('stateless');
        expect(decision.priority).toBe(3);
    });

    it('handles empty phase overrides', () => {
        const policy: ExecutionRoutingPolicy = {
            defaultAdapterId: 'local',
            defaultMode: 'stateless',
        };

        const decision = routePhase(policy, 'implement', 'pi');

        expect(decision.adapterId).toBe('local');
        expect(decision.executionMode).toBe('stateless');
    });

    it('phase override takes precedence over channel override', () => {
        const policy: ExecutionRoutingPolicy = {
            defaultAdapterId: 'default',
            defaultMode: 'stateless',
            phaseOverrides: {
                implement: { adapterId: 'from-phase' },
            },
            channelOverrides: {
                pi: { adapterId: 'from-channel' },
            },
        };

        const decision = routePhase(policy, 'implement', 'pi');

        expect(decision.adapterId).toBe('from-phase');
        expect(decision.priority).toBe(1);
    });
});

describe('createDefaultPolicy', () => {
    it('creates stateless policy by default', () => {
        const policy = createDefaultPolicy('acp:pi');

        expect(policy.defaultAdapterId).toBe('acp:pi');
        expect(policy.defaultMode).toBe('stateless');
        expect(policy.phaseOverrides).toEqual({});
        expect(policy.channelOverrides).toEqual({});
    });
});

// ─── Adapter Registry Tests ───────────────────────────────────────────────────

describe('DefaultAdapterRegistry', () => {
    let registry: DefaultAdapterRegistry;
    let mockStateless: MockExecutor;
    let mockSessioned: MockExecutor;

    beforeEach(() => {
        registry = new DefaultAdapterRegistry();
        mockStateless = new MockExecutor('stateless:pi', ['pi', 'stateless']);
        mockSessioned = new MockExecutor('sessioned:pi', ['sessioned']);
    });

    it('registers and retrieves adapter by ID', () => {
        registry.register(mockStateless);

        expect(registry.get('stateless:pi')).toBe(mockStateless);
        expect(registry.list()).toContain(mockStateless);
    });

    it('registers and retrieves adapter by channel', () => {
        registry.register(mockStateless);

        expect(registry.getByChannel('pi')).toBe(mockStateless);
    });

    it('returns undefined for unknown ID', () => {
        expect(registry.get('unknown')).toBeUndefined();
    });

    it('returns undefined for unknown channel', () => {
        expect(registry.getByChannel('unknown')).toBeUndefined();
    });

    it('checks existence by ID', () => {
        registry.register(mockStateless);

        expect(registry.has('stateless:pi')).toBe(true);
        expect(registry.has('unknown')).toBe(false);
    });

    it('checks existence by channel', () => {
        registry.register(mockStateless);

        expect(registry.has('pi')).toBe(true);
        expect(registry.has('unknown')).toBe(false);
    });

    it('executes with routing policy', async () => {
        registry.register(mockStateless);

        const policy = createDefaultPolicy('stateless:pi');
        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test',
            payload: {},
            channel: 'pi',
            timeoutMs: 60000,
        };

        const result = await registry.executeWithPolicy(req, policy);

        expect(result.success).toBe(true);
        expect(mockStateless.executeCalls).toHaveLength(1);
        expect(mockStateless.executeCalls[0].skill).toBe('rd3:test');
    });

    it('returns error when adapter not found', async () => {
        const policy = createDefaultPolicy('nonexistent');

        const req: ExecutionRequest = {
            skill: 'rd3:test',
            phase: 'implement',
            prompt: 'test',
            payload: {},
            channel: 'pi',
            timeoutMs: 60000,
        };

        const result = await registry.executeWithPolicy(req, policy);

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(20);
    });

    it('health checks all adapters', async () => {
        registry.register(mockStateless);
        registry.register(mockSessioned);

        const results = await registry.healthCheckAll();

        expect(results.size).toBe(2);
        expect(results.get('stateless:pi')?.healthy).toBe(true);
        expect(results.get('sessioned:pi')?.healthy).toBe(true);
    });

    it('disposes all adapters', async () => {
        registry.register(mockStateless);
        registry.register(mockSessioned);

        await registry.disposeAll();

        expect(registry.list()).toHaveLength(0);
    });
});

// ─── ExecutionMode Tests ──────────────────────────────────────────────────────

describe('ExecutionMode', () => {
    it('stateless is the safe default', () => {
        const policy = createDefaultPolicy('acp:pi');

        expect(policy.defaultMode).toBe('stateless');
    });

    it('sessioned can be configured as default', () => {
        const policy: ExecutionRoutingPolicy = {
            defaultAdapterId: 'acp:pi',
            defaultMode: 'sessioned',
        };

        expect(policy.defaultMode).toBe('sessioned');
    });
});
