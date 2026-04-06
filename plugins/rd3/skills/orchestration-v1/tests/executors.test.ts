import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
    AcpExecutor,
    LocalCommandExecutor,
    createExecutorForChannel,
    normalizeExecutionChannel,
} from '../scripts/executors';

describe('normalizeExecutionChannel', () => {
    test('defaults to current when omitted', () => {
        expect(normalizeExecutionChannel()).toBe('current');
    });

    test('maps claude-code to claude', () => {
        expect(normalizeExecutionChannel('claude-code')).toBe('claude');
    });

    test('passes through direct ACP agent names', () => {
        expect(normalizeExecutionChannel('codex')).toBe('codex');
        expect(normalizeExecutionChannel('pi')).toBe('pi');
    });

    test('throws for unknown channel names', () => {
        expect(() => normalizeExecutionChannel('unknown-agent')).toThrow('Unknown execution channel');
    });
});

describe('createExecutorForChannel', () => {
    test('returns a local executor for current', () => {
        const executor = createExecutorForChannel('current');
        expect(executor).toBeInstanceOf(LocalCommandExecutor);
    });

    test('returns an ACP executor for non-current channels', () => {
        const executor = createExecutorForChannel('codex');
        expect(executor).toBeInstanceOf(AcpExecutor);
    });
});

describe('executors', () => {
    const savedEnv: Record<string, string | undefined> = {};

    beforeEach(() => {
        savedEnv.ACPX_AGENT = process.env.ACPX_AGENT;
        savedEnv.ACPX_BIN = process.env.ACPX_BIN;
        savedEnv.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT = process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT;
        delete process.env.ACPX_AGENT;
        delete process.env.ACPX_BIN;
        delete process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT;
    });

    afterEach(() => {
        for (const [key, val] of Object.entries(savedEnv)) {
            if (val === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = val;
            }
        }
    });

    test('local executor fails when request.command is missing', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('request.command or request.prompt');
    });

    test('local executor runs the provided command via mock runner', async () => {
        const executor = new LocalCommandExecutor({
            runCommand: (cmd, cwd, timeoutMs) => ({
                status: 'completed',
                backend: 'local-child',
                normalized_channel: 'current',
                stdout: `${cmd}@${cwd}:${timeoutMs}`,
            }),
        });

        const result = await executor.execute({
            channel: 'current',
            cwd: '/tmp/example',
            command: 'bun run test:rd3',
            timeout_ms: 1000,
        });

        expect(result.status).toBe('completed');
        expect(result.stdout).toBe('bun run test:rd3@/tmp/example:1000');
    });

    test('local executor runs the provided prompt via mock runner', async () => {
        const executor = new LocalCommandExecutor({
            runPrompt: (prompt, cwd, timeoutMs) => ({
                status: 'completed',
                backend: 'local-child',
                normalized_channel: 'current',
                prompt_agent: 'pi',
                stdout: `${prompt}@${cwd}:${timeoutMs}`,
            }),
        });

        const result = await executor.execute({
            channel: 'current',
            cwd: '/tmp/example',
            prompt: 'review this task',
            timeout_ms: 1000,
        });

        expect(result.status).toBe('completed');
        expect(result.stdout).toBe('review this task@/tmp/example:1000');
        expect(result.prompt_agent).toBe('pi');
    });

    test('local executor default prompt runner fails without an explicit prompt agent', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            prompt: 'review this task',
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('requires an explicit prompt agent');
    });

    test('local executor default prompt runner records the configured prompt agent', async () => {
        process.env.ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT = 'pi';
        const executor = new LocalCommandExecutor({
            runPrompt: (prompt, _cwd, _timeoutMs) => ({
                status: 'completed',
                backend: 'local-child',
                normalized_channel: 'current',
                prompt_agent: 'pi',
                stdout: prompt,
                command: ['acpx', '--format', 'quiet', 'pi', 'exec', prompt],
            }),
        });

        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            prompt: 'mock-prompt',
        });

        expect(result.status).toBe('completed');
        expect(result.prompt_agent).toBe('pi');
    });

    test('local executor default runner captures successful shell output', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            command: 'printf "hello"',
        });

        expect(result.status).toBe('completed');
        expect(result.stdout).toBe('hello');
        expect(result.command).toEqual(['zsh', '-c', 'printf "hello"']);
    });

    test('local executor default runner captures failing shell output', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            command: 'echo boom && exit 2',
        });

        expect(result.status).toBe('failed');
        expect(result.exit_code).toBe(2);
        expect(result.error).toContain('boom');
    });

    test('acp executor rejects current channel requests', async () => {
        const executor = new AcpExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            prompt: 'inspect',
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('non-current');
    });

    test('acp executor rejects requests without prompt', async () => {
        const executor = new AcpExecutor();
        const result = await executor.execute({
            channel: 'codex',
            cwd: process.cwd(),
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('request.prompt');
    });

    test('acp executor builds an acpx exec request against the normalized channel', async () => {
        const executor = new AcpExecutor({
            acpxExec: (command) => ({
                exitCode: 0,
                stdout: JSON.stringify(command),
                stderr: '',
                ok: true,
            }),
        });

        const result = await executor.execute({
            channel: 'claude-code',
            cwd: '/tmp/example',
            prompt: 'inspect the repository',
        });

        expect(result.status).toBe('completed');
        expect(result.normalized_channel).toBe('claude');
        expect(result.stdout).toContain('"claude"');
        expect(result.stdout).toContain('"inspect the repository"');
    });

    test('acp executor surfaces command failures and honors custom binary', async () => {
        const executor = new AcpExecutor({
            acpxBin: '/custom/acpx',
            acpxExec: (_command) => ({
                exitCode: 7,
                stdout: '',
                stderr: 'permission denied',
                ok: false,
            }),
        });

        const result = await executor.execute({
            channel: 'pi',
            cwd: '/tmp/example',
            prompt: 'inspect the repository',
        });

        expect(result.status).toBe('failed');
        expect(result.command).toEqual(['/custom/acpx', '--format', 'quiet', 'pi', 'exec', 'inspect the repository']);
        expect(result.error).toContain('permission denied');
    });
});
