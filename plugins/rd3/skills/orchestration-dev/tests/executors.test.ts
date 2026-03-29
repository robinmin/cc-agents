import { describe, expect, test } from 'bun:test';
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
    test('local executor fails when request.command is missing', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
        });

        expect(result.status).toBe('failed');
        expect(result.error).toContain('request.command');
    });

    test('local executor runs the provided command', async () => {
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

    test('local executor default runner captures successful shell output', async () => {
        const executor = new LocalCommandExecutor();
        const result = await executor.execute({
            channel: 'current',
            cwd: process.cwd(),
            command: 'printf "hello"',
        });

        expect(result.status).toBe('completed');
        expect(result.stdout).toBe('hello');
        expect(result.command).toEqual(['zsh', '-lc', 'printf "hello"']);
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
