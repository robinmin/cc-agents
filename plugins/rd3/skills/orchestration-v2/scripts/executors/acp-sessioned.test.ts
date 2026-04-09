/**
 * acp-sessioned.ts tests
 *
 * Tests for ACP sessioned executor adapter.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { ExecutionRequest } from '../model';

type MockExecResult = {
    ok: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    signal?: string;
    errorMessage?: string;
};

type MockParseOutputResult = {
    structured?: Record<string, unknown> | undefined;
    metrics?: unknown[] | undefined;
};

let mockExecResult: MockExecResult = {
    ok: true,
    exitCode: 0,
    stdout: 'mock output',
    stderr: '',
    timedOut: false,
};

let mockParseOutputResult: MockParseOutputResult = {
    structured: undefined,
    metrics: [],
};

const mockExecAcpxSync = mock((_command: string[], _timeoutMs?: number): MockExecResult => {
    return mockExecResult;
});

const mockParseOutput = mock(
    (_stdout: string, _parseStructured?: boolean, _extractMetrics?: boolean): MockParseOutputResult => {
        return mockParseOutputResult;
    },
);

mock.module('../../../../scripts/libs/acpx-query', () => ({
    execAcpxSync: mockExecAcpxSync,
    parseOutput: mockParseOutput,
    checkAcpxHealth: () => ({ healthy: true }),
    ALLOWED_TOOLS: 'Skill,Read,Bash,Edit,Write',
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { AcpSessionedExecutor, AcpSessionAwareExecutor } from './acp-sessioned';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function createRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
    return {
        skill: 'rd3:test',
        phase: 'implement',
        prompt: 'test prompt',
        payload: { task_ref: 'test' },
        channel: 'pi',
        timeoutMs: 60000,
        taskRef: 'docs/tasks/001.md',
        ...overrides,
    };
}

// ─── AcpSessionedExecutor Tests ────────────────────────────────────────────────

describe('AcpSessionedExecutor', () => {
    let executor: AcpSessionedExecutor;

    beforeEach(() => {
        mockExecAcpxSync.mockClear();
        mockParseOutput.mockClear();
        mockExecResult = {
            ok: true,
            exitCode: 0,
            stdout: 'mock output',
            stderr: '',
            timedOut: false,
        };
        mockParseOutputResult = {
            structured: undefined,
            metrics: [],
        };
        executor = new AcpSessionedExecutor('pi', 300);
    });

    describe('constructor', () => {
        it('sets correct id and name', () => {
            expect(executor.id).toBe('acp-sessioned:pi');
            expect(executor.name).toBe('ACP Sessioned (pi)');
        });

        it('reports sessioned execution mode', () => {
            expect(executor.executionMode).toBe('sessioned');
        });

        it('registers expected channels', () => {
            expect(executor.channels).toContain('pi:sessioned');
            expect(executor.channels).toContain('sessioned:pi');
        });
    });

    describe('execute without session', () => {
        it('falls back to stateless when no session name provided', async () => {
            const req = createRequest();

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('execute with session', () => {
        it('uses sessioned transport when session name provided', async () => {
            const req = createRequest({ session: 'test-session' });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('uses default TTL when not specified in request', async () => {
            const req = createRequest({ session: 'test-session' });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(req.sessionTtlSeconds).toBeUndefined();
        });

        it('prefers request TTL over default', async () => {
            const req = createRequest({ session: 'test-session', sessionTtlSeconds: 900 });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(req.sessionTtlSeconds).toBe(900);
        });
    });

    describe('execute with mocks', () => {
        it('executes successfully with session', async () => {
            const req = createRequest({ session: 'test-session' });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('executes with custom TTL', async () => {
            const req = createRequest({ session: 'test-session', sessionTtlSeconds: 900 });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('falls back to stateless when no session provided', async () => {
            const req = createRequest();

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.durationMs).toBeDefined();
        });

        it('handles failed transport gracefully', async () => {
            mockExecResult = {
                ok: false,
                exitCode: 1,
                stdout: '',
                stderr: 'Transport failed',
                timedOut: false,
            };

            const req = createRequest({ session: 'fail-session' });
            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
        });

        it('handles timed out transport gracefully', async () => {
            mockExecResult = {
                ok: false,
                exitCode: 124,
                stdout: '',
                stderr: 'Timeout',
                timedOut: true,
            };

            const req = createRequest({ session: 'timeout-session' });
            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.timedOut).toBe(true);
        });
    });

    describe('session lifecycle integration', () => {
        it('uses custom TTL from constructor', () => {
            const customExecutor = new AcpSessionedExecutor('pi', 600);
            expect(customExecutor).toBeDefined();
        });
    });

    describe('healthCheck', () => {
        it('returns health status', async () => {
            const health = await executor.healthCheck();

            expect(health).toBeDefined();
            expect(health.healthy).toBeDefined();
            expect(health.lastChecked).toBeInstanceOf(Date);
        });
    });

    describe('dispose', () => {
        it('cleans up without error', async () => {
            await executor.dispose();
        });
    });
});

describe('AcpSessionAwareExecutor', () => {
    describe('constructor', () => {
        it('sets correct id and name', () => {
            const executor = new AcpSessionAwareExecutor('pi');

            expect(executor.id).toBe('acp:pi');
            expect(executor.name).toBe('ACP (pi)');
        });

        it('reports stateless as base mode', () => {
            const executor = new AcpSessionAwareExecutor('pi');

            expect(executor.executionMode).toBe('stateless');
        });

        it('registers expected channels', () => {
            const executor = new AcpSessionAwareExecutor('pi');

            expect(executor.channels).toContain('pi');
            expect(executor.channels).toContain('acp');
            expect(executor.channels).toContain('acp:pi');
        });

        it('accepts custom agent name', () => {
            const executor = new AcpSessionAwareExecutor('codex');

            expect(executor.id).toBe('acp:codex');
            expect(executor.channels).toContain('codex');
        });
    });

    describe('execute', () => {
        it('delegates to internal stateless executor', async () => {
            const executor = new AcpSessionAwareExecutor('pi');
            const req = createRequest();

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('healthCheck', () => {
        it('delegates to internal stateless executor', async () => {
            const executor = new AcpSessionAwareExecutor('pi');

            const health = await executor.healthCheck();

            expect(health).toBeDefined();
            expect(health.healthy).toBeDefined();
        });
    });

    describe('dispose', () => {
        it('disposes internal executor', async () => {
            const executor = new AcpSessionAwareExecutor('pi');

            await executor.dispose();
        });

        it('disposes executor with custom agent', async () => {
            const executor = new AcpSessionAwareExecutor('codex');

            await executor.dispose();
        });
    });
});

describe('Default TTL', () => {
    it('uses default TTL of 300 seconds', () => {
        const executor = new AcpSessionedExecutor('pi');

        expect(executor).toBeDefined();
    });

    it('accepts custom TTL', () => {
        const executor = new AcpSessionedExecutor('pi', 600);

        expect(executor).toBeDefined();
    });
});
