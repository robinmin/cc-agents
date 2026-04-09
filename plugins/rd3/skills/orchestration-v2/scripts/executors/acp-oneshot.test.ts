/**
 * acp-oneshot.ts tests
 *
 * Tests for ACP oneshot executor.
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

import { AcpOneshotExecutor } from './acp-oneshot';

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

// ─── AcpOneshotExecutor Tests ───────────────────────────────────────────────

describe('AcpOneshotExecutor', () => {
    let executor: AcpOneshotExecutor;

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
        executor = new AcpOneshotExecutor('pi');
    });

    describe('constructor', () => {
        it('sets correct id and name for default agent', () => {
            expect(executor.id).toBe('acp-oneshot:pi');
            expect(executor.name).toBe('ACP Oneshot (pi)');
        });

        it('has maxConcurrency of 4 by default', () => {
            expect(executor.maxConcurrency).toBe(4);
        });

        it('registers expected channels', () => {
            expect(executor.channels).toContain('pi');
            expect(executor.channels).toContain('acp');
            expect(executor.channels).toContain('acp:pi');
        });

        it('accepts custom agent name', () => {
            const customExecutor = new AcpOneshotExecutor('codex');

            expect(customExecutor.id).toBe('acp-oneshot:codex');
            expect(customExecutor.name).toBe('ACP Oneshot (codex)');
            expect(customExecutor.channels).toContain('codex');
        });

        it('accepts custom maxConcurrency', () => {
            const customExecutor = new AcpOneshotExecutor('pi', 8);
            expect(customExecutor.maxConcurrency).toBe(8);
        });
    });

    describe('execute', () => {
        it('executes successfully with basic request', async () => {
            const req = createRequest();

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.exitCode).toBe(0);
        });

        it('includes session fields but ignores them (oneshot)', async () => {
            const req = createRequest({
                session: 'ignored-session',
                sessionTtlSeconds: 300,
            });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('handles rework iteration in request', async () => {
            const req = createRequest({
                reworkIteration: 2,
                reworkMax: 3,
                feedback: 'Fix the error on line 42',
            });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('handles request with custom timeout', async () => {
            const req = createRequest({
                timeoutMs: 120000,
            });

            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('handles failed transport gracefully', async () => {
            mockExecResult = {
                ok: false,
                exitCode: 1,
                stdout: '',
                stderr: 'Transport failed',
                timedOut: false,
            };

            const req = createRequest();
            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.exitCode).toBe(1);
        });

        it('handles timed out transport gracefully', async () => {
            mockExecResult = {
                ok: false,
                exitCode: 124,
                stdout: '',
                stderr: 'Timeout',
                timedOut: true,
            };

            const req = createRequest();
            const result = await executor.execute(req);

            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.timedOut).toBe(true);
        });
    });

    describe('healthCheck', () => {
        it('returns health status with timestamp', async () => {
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

describe('Factory functions', () => {
    describe('createOneshotExecutor', () => {
        it('creates executor with default agent', async () => {
            const { createOneshotExecutor } = await import('./acp-oneshot');
            const executor = createOneshotExecutor();

            expect(executor).toBeDefined();
            expect(executor.id).toBe('acp-oneshot:pi');
        });

        it('creates executor with custom agent', async () => {
            const { createOneshotExecutor } = await import('./acp-oneshot');
            const executor = createOneshotExecutor('codex');

            expect(executor).toBeDefined();
            expect(executor.id).toBe('acp-oneshot:codex');
        });
    });

    describe('DEFAULT_ONESHOT_EXECUTOR', () => {
        it('is pre-configured for pi agent', async () => {
            const { DEFAULT_ONESHOT_EXECUTOR } = await import('./acp-oneshot');

            expect(DEFAULT_ONESHOT_EXECUTOR).toBeDefined();
            expect(DEFAULT_ONESHOT_EXECUTOR.id).toBe('acp-oneshot:pi');
        });
    });
});
