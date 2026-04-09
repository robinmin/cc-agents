/**
 * transport.ts tests
 *
 * Tests for ACP transport layer (command building, execution, diagnostics).
 * Uses mock.module() to intercept acpx-query dependencies.
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';

// ─── Mock State ───────────────────────────────────────────────────────────────

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
    stdout: '{"success":true}',
    stderr: '',
    timedOut: false,
};

let mockParseOutputResult: MockParseOutputResult = {
    structured: { success: true },
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

// ─── Module Mock Setup ────────────────────────────────────────────────────────
// Must be called before importing transport.ts (which transitively imports acpx-query).
// Top-level call ensures bun's module registry intercepts the import before it loads.

mock.module('../../../../../scripts/libs/acpx-query', () => ({
    execAcpxSync: mockExecAcpxSync,
    parseOutput: mockParseOutput,
    ALLOWED_TOOLS: 'Skill,Read,Bash,Edit,Write',
}));

// ─── Imports After Mock Setup ─────────────────────────────────────────────────

import {
    buildAcpxArgs,
    executeAcpxTransport,
    executeSessioned,
    executeStateless,
    type AcpTransportOptions,
} from './transport';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function createSuccessResult(stdout = '{"success":true}', stderr = ''): MockExecResult {
    return {
        ok: true,
        exitCode: 0,
        stdout,
        stderr,
        timedOut: false,
    };
}

function createFailureResult(exitCode = 1, stderr = 'error', signal?: string): MockExecResult {
    const result: MockExecResult = {
        ok: false,
        exitCode,
        stderr,
        stdout: '',
        timedOut: false,
    };
    if (signal !== undefined) {
        result.signal = signal;
    }
    return result;
}

function createTimeoutResult(): MockExecResult {
    return {
        ok: false,
        exitCode: 124,
        stdout: '',
        stderr: 'Command timed out',
        timedOut: true,
    };
}

// ─── buildAcpxArgs Tests ──────────────────────────────────────────────────────

describe('buildAcpxArgs', () => {
    const defaultOptions: AcpTransportOptions = {
        agent: 'pi',
        format: 'json',
        allowedTools: 'Skill,Read,Bash,Edit,Write',
        nonInteractivePermissions: 'deny',
    };

    it('builds exec command with all options', () => {
        const args = buildAcpxArgs('exec', 'test prompt', defaultOptions);

        expect(args).toContain('--format');
        expect(args).toContain('json');
        expect(args).toContain('--allowed-tools');
        expect(args).toContain('Skill,Read,Bash,Edit,Write');
        expect(args).toContain('--non-interactive-permissions');
        expect(args).toContain('deny');
        expect(args).toContain('pi');
        expect(args).toContain('exec');
        expect(args).toContain('test prompt');
    });

    it('builds prompt command without session', () => {
        const args = buildAcpxArgs('prompt', 'test prompt', defaultOptions);

        expect(args).toContain('pi');
        expect(args).toContain('prompt');
        expect(args).toContain('test prompt');
        // No --session without session options
        expect(args).not.toContain('--session');
    });

    it('builds prompt command with session', () => {
        const args = buildAcpxArgs('prompt', 'test prompt', defaultOptions, {
            sessionName: 'my-session',
            sessionTtlSeconds: 300,
        });

        expect(args).toContain('--session');
        expect(args).toContain('my-session');
        expect(args).toContain('--ttl');
        expect(args).toContain('300');
    });

    it('uses default agent when not specified', () => {
        const options: AcpTransportOptions = {
            format: 'json',
        };

        const args = buildAcpxArgs('exec', 'test', options);

        expect(args).toContain('pi'); // Default agent
    });

    it('applies custom allowed tools', () => {
        const options: AcpTransportOptions = {
            agent: 'pi',
            format: 'json',
            allowedTools: 'Skill,Read',
        };

        const args = buildAcpxArgs('exec', 'test', options);

        expect(args).toContain('--allowed-tools');
        const allowedIdx = args.indexOf('--allowed-tools');
        expect(args[allowedIdx + 1]).toBe('Skill,Read');
    });

    it('uses default allowed tools and global option ordering', () => {
        const args = buildAcpxArgs('exec', 'ordered prompt', {});

        expect(args).toEqual([
            '--format',
            'json',
            '--allowed-tools',
            'Skill,Read,Bash,Edit,Write',
            '--non-interactive-permissions',
            'deny',
            'pi',
            'exec',
            'ordered prompt',
        ]);
    });

    it('omits ttl when session ttl is zero or negative', () => {
        const zeroTtlArgs = buildAcpxArgs('prompt', 'test prompt', defaultOptions, {
            sessionName: 'zero-session',
            sessionTtlSeconds: 0,
        });
        const negativeTtlArgs = buildAcpxArgs('prompt', 'test prompt', defaultOptions, {
            sessionName: 'negative-session',
            sessionTtlSeconds: -5,
        });

        expect(zeroTtlArgs).toContain('--session');
        expect(zeroTtlArgs).not.toContain('--ttl');
        expect(negativeTtlArgs).toContain('--session');
        expect(negativeTtlArgs).not.toContain('--ttl');
    });

    it('ignores ttl when no session name is provided', () => {
        const args = buildAcpxArgs('prompt', 'test prompt', defaultOptions, {
            sessionTtlSeconds: 300,
        });

        expect(args).toEqual([
            '--format',
            'json',
            '--allowed-tools',
            'Skill,Read,Bash,Edit,Write',
            '--non-interactive-permissions',
            'deny',
            'pi',
            'prompt',
            'test prompt',
        ]);
    });
});

describe('AcpTransportOptions defaults', () => {
    it('uses sensible defaults', () => {
        const args = buildAcpxArgs('exec', 'test', {});

        expect(args).toContain('json'); // Default format
        expect(args).toContain('pi'); // Default agent
    });
});

// ─── executeAcpxTransport Tests ───────────────────────────────────────────────

describe('executeAcpxTransport', () => {
    beforeEach(() => {
        mockExecAcpxSync.mockClear();
        mockParseOutput.mockClear();
        mockExecResult = createSuccessResult();
        mockParseOutputResult = { structured: { success: true }, metrics: [] };
    });

    it('returns successful result on exec success', () => {
        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
        expect(result.timedOut).toBe(false);
        expect(mockExecAcpxSync).toHaveBeenCalled();
    });

    it('returns failure result on exec failure', () => {
        mockExecResult = createFailureResult(1, 'Command failed');
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.success).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('acpx transport diagnostics:');
    });

    it('handles timeout result', () => {
        mockExecResult = createTimeoutResult();
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.success).toBe(false);
        expect(result.timedOut).toBe(true);
        expect(result.stderr).toContain('timed_out: true');
    });

    it('includes structured data in result when present', () => {
        const structuredData = { result: 'test', data: { key: 'value' } };
        mockParseOutputResult = { structured: structuredData, metrics: [] };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.structured).toEqual(structuredData);
    });

    it('includes resource metrics when present', () => {
        const metrics = [
            {
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 100,
                output_tokens: 200,
                wall_clock_ms: 1000,
                execution_ms: 950,
            },
            {
                model_id: 'claude-3',
                model_provider: 'anthropic',
                input_tokens: 150,
                output_tokens: 250,
                wall_clock_ms: 1200,
                execution_ms: 1100,
            },
        ];
        mockParseOutputResult = { structured: undefined, metrics };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.resources).toBeDefined();
        expect(result.resources?.length).toBe(2);
        expect(result.resources?.[0].model_id).toBe('gpt-4');
        expect(result.resources?.[1].model_provider).toBe('anthropic');
    });

    it('truncates stdout and stderr to limits', () => {
        const longOutput = 'x'.repeat(100_000);
        mockExecResult = {
            ok: true,
            exitCode: 0,
            stdout: longOutput,
            stderr: longOutput,
            timedOut: false,
        };
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test', 30_000, {});

        expect(result.stdout.length).toBeLessThanOrEqual(50_000);
        expect(result.stderr.length).toBeLessThanOrEqual(10_000);
    });

    it('applies timeout as ceiling to Math.max(1, Math.ceil(timeoutMs/1000))', () => {
        // Very small timeout
        executeAcpxTransport('exec', 'test', 100, {});

        // The command should include --timeout with minimum value of 1
        const callArgs = mockExecAcpxSync.mock.calls.at(-1)?.[0] ?? [];
        const timeoutIdx = callArgs.indexOf('--timeout');
        expect(timeoutIdx).toBeGreaterThan(-1);
        const timeoutValue = parseInt(callArgs[timeoutIdx + 1], 10);
        expect(timeoutValue).toBeGreaterThanOrEqual(1);
    });

    it('includes diagnostics on failure', () => {
        mockExecResult = createFailureResult(127, 'command not found');
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('prompt', 'test', 30_000, {}, { sessionName: 'test-session' });

        expect(result.stderr).toContain('mode: prompt');
        expect(result.stderr).toContain('session: test-session');
        expect(result.stderr).toContain('exit_code: 127');
    });

    it('returns stderr unchanged if already contains diagnostics marker', () => {
        const existingDiagnostics = 'acpx transport diagnostics:\nexisting error';
        mockExecResult = { ...createFailureResult(1, existingDiagnostics) };
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test', 30_000, {});

        // Should return the original stderr without appending duplicate diagnostics
        expect(result.stderr).toBe(existingDiagnostics);
    });

    it('uses the custom acpx binary and passes parse flags', () => {
        executeAcpxTransport('exec', 'test prompt', 30_000, {
            acpxBin: '/opt/bin/acpx-custom',
            agent: 'codex',
            format: 'text',
            nonInteractivePermissions: 'allow',
        });

        expect(mockExecAcpxSync).toHaveBeenCalledWith(
            [
                '/opt/bin/acpx-custom',
                '--timeout',
                '30',
                '--format',
                'text',
                '--allowed-tools',
                'Skill,Read,Bash,Edit,Write',
                '--non-interactive-permissions',
                'allow',
                'codex',
                'exec',
                'test prompt',
            ],
            30_000,
        );
        expect(mockParseOutput).toHaveBeenCalledWith('{"success":true}', true, true);
    });

    it('omits optional structured data and resources when parser returns none', () => {
        mockParseOutputResult = { structured: undefined, metrics: undefined };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.structured).toBeUndefined();
        expect(result.resources).toBeUndefined();
    });

    it('defaults timedOut to false when exec result does not provide it', () => {
        mockExecResult = {
            ok: true,
            exitCode: 0,
            stdout: '{"success":true}',
            stderr: '',
        } as MockExecResult;
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.timedOut).toBe(false);
    });

    it('returns diagnostics only when stderr is empty and includes failure metadata', () => {
        mockExecResult = {
            ok: false,
            exitCode: 1,
            stdout: '',
            stderr: '',
            timedOut: false,
            signal: 'SIGTERM',
            errorMessage: 'spawn failed',
        };
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport(
            'prompt',
            'test prompt',
            31_000,
            { agent: 'codex' },
            { sessionName: 'session-1', sessionTtlSeconds: 900 },
        );

        expect(result.stderr).toContain('acpx transport diagnostics:');
        expect(result.stderr).toContain('mode: prompt');
        expect(result.stderr).toContain('agent: codex');
        expect(result.stderr).toContain('signal: SIGTERM');
        expect(result.stderr).toContain('spawn_error: spawn failed');
        expect(result.stderr).toContain('session_ttl_seconds: 900');
        expect(result.stderr).toContain(
            'command: acpx --format json --allowed-tools [configured] --timeout 31 --non-interactive-permissions deny codex prompt [--session <name>] <prompt>',
        );
    });

    it('trims trailing stderr whitespace before appending diagnostics', () => {
        mockExecResult = createFailureResult(2, 'base error   \n\n');
        mockParseOutputResult = { structured: undefined, metrics: [] };

        const result = executeAcpxTransport('exec', 'test prompt', 30_000, {});

        expect(result.stderr).toStartWith('base error\nacpx transport diagnostics:');
    });
});

// ─── executeStateless Tests ───────────────────────────────────────────────────

describe('executeStateless', () => {
    beforeEach(() => {
        mockExecAcpxSync.mockClear();
        mockParseOutput.mockClear();
        mockExecResult = createSuccessResult();
        mockParseOutputResult = { structured: { success: true }, metrics: [] };
    });

    it('returns a successful stateless result', () => {
        const result = executeStateless('test prompt', 30_000);

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
    });

    it('accepts custom options without changing the result contract', () => {
        const result = executeStateless('test', 30_000, { agent: 'codex', format: 'text' });

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.timedOut).toBe(false);
    });

    it('preserves the transport result shape with default options', () => {
        const result = executeStateless('test', 30_000);

        expect(typeof result.stdout).toBe('string');
        expect(typeof result.stderr).toBe('string');
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
});

// ─── executeSessioned Tests ──────────────────────────────────────────────────

describe('executeSessioned', () => {
    beforeEach(() => {
        mockExecAcpxSync.mockClear();
        mockParseOutput.mockClear();
        mockExecResult = createSuccessResult();
        mockParseOutputResult = { structured: { success: true }, metrics: [] };
    });

    it('returns a successful sessioned result', () => {
        const result = executeSessioned('test prompt', 30_000, 'my-session');

        expect(result.success).toBe(true);
        expect(result.exitCode).toBe(0);
    });

    it('accepts a session ttl parameter', () => {
        const result = executeSessioned('test', 30_000, 'my-session', 300);

        expect(result.success).toBe(true);
    });

    it('accepts alternate ttl values without changing result shape', () => {
        const result = executeSessioned('test', 30_000, 'my-session', 600);

        expect(result.success).toBe(true);
        expect(result.timedOut).toBe(false);
    });

    it('works without TTL', () => {
        const result = executeSessioned('test', 30_000, 'my-session');

        expect(result.success).toBe(true);
    });

    it('accepts custom sessioned options', () => {
        const result = executeSessioned('test', 30_000, 'session-1', undefined, { agent: 'opencode' });

        expect(result.success).toBe(true);
    });

    it('accepts zero ttl values', () => {
        const result = executeSessioned('test', 30_000, 'session-1', 0);

        expect(result.success).toBe(true);
    });
});
