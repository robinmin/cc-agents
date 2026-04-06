import { describe, expect, test } from 'bun:test';
import { buildAcpxCommand, buildAcpxFileCommand, getEnv } from '../scripts/libs/acpx-query';

// execAcpx, queryLlm, queryLlmFromFile require Bun.spawnSync mocking.
// Since Bun.spawnSync is a built-in, we test these via integration-style tests
// that verify the code paths without actually spawning (when acpx is absent).

describe('getEnv', () => {
    test('returns undefined for missing env key', () => {
        // (import.meta as {env: Record<string,string|undefined>}).env returns {}
        // when no env vars are set in test context
        const result = getEnv('DEFINITELY_NOT_SET_12345');
        expect(result).toBeUndefined();
    });
});

describe('buildAcpxCommand', () => {
    test('builds command with defaults including timeout', () => {
        const cmd = buildAcpxCommand('summarize this', {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        // Order: bin, --format, format, --timeout, timeout, agent, exec, prompt
        expect(cmd).toEqual(['acpx', '--format', 'quiet', '--timeout', '300', 'claude', 'exec', 'summarize this']);
    });

    test('uses custom agent', () => {
        const cmd = buildAcpxCommand('hello', {
            agent: 'codex',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        // Order: bin, --format, format, --timeout, timeout, agent, exec, prompt
        // agent is at index 5 after bin, --format, format, --timeout, timeout
        expect(cmd[5]).toBe('codex');
    });

    test('uses custom format', () => {
        const cmd = buildAcpxCommand('hello', {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'json',
        });
        expect(cmd[1]).toBe('--format');
        expect(cmd[2]).toBe('json');
    });

    test('uses custom acpx binary path', () => {
        const cmd = buildAcpxCommand('hello', {
            agent: 'claude',
            acpxBin: '/usr/local/bin/acpx',
            format: 'quiet',
        });
        expect(cmd[0]).toBe('/usr/local/bin/acpx');
    });

    test('preserves prompt text exactly', () => {
        const prompt = 'What is the meaning of life?';
        const cmd = buildAcpxCommand(prompt, {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        // prompt is at the end
        expect(cmd[cmd.length - 1]).toBe(prompt);
    });

    test('command structure is correct with all options', () => {
        const cmd = buildAcpxCommand('prompt text', {
            agent: 'custom-agent',
            acpxBin: '/bin/acpx',
            format: 'text',
        });
        // Order: bin, --format, format, --timeout, timeout, agent, exec, prompt
        expect(cmd[0]).toBe('/bin/acpx');
        expect(cmd[1]).toBe('--format');
        expect(cmd[2]).toBe('text');
        expect(cmd[3]).toBe('--timeout');
        expect(cmd[4]).toBe('300');
        expect(cmd[5]).toBe('custom-agent');
        expect(cmd[6]).toBe('exec');
        expect(cmd[7]).toBe('prompt text');
    });

    test('passing undefined options uses all defaults', () => {
        // When options is undefined, getEnv provides defaults
        const cmd = buildAcpxCommand('test prompt');
        expect(cmd[0]).toBe('acpx'); // default acpxBin from env or "acpx"
        expect(cmd[1]).toBe('--format');
        expect(cmd[2]).toBe('quiet'); // default format
        expect(cmd[3]).toBe('--timeout');
        expect(cmd[4]).toBe('300'); // default timeout
        expect(cmd[5]).toBe('claude'); // default agent from env or "claude"
        expect(cmd[6]).toBe('exec');
        expect(cmd[7]).toBe('test prompt');
    });
});

describe('buildAcpxFileCommand', () => {
    test('builds file command with --file flag', () => {
        const cmd = buildAcpxFileCommand('/tmp/prompt.txt', {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        // Order: bin, --format, format, --timeout, timeout, agent, exec, --file, path
        expect(cmd).toEqual(['acpx', '--format', 'quiet', '--timeout', '300', 'claude', 'exec', '--file=/tmp/prompt.txt']);
    });

    test('supports stdin via dash', () => {
        const cmd = buildAcpxFileCommand('-', {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        // --file=- is used for stdin
        expect(cmd[cmd.length - 1]).toBe('--file=-');
    });

    test('file path with spaces is preserved', () => {
        const cmd = buildAcpxFileCommand('/tmp/my prompts/file with spaces.txt', {
            agent: 'claude',
            acpxBin: 'acpx',
            format: 'quiet',
        });
        expect(cmd[cmd.length - 1]).toBe('--file=/tmp/my prompts/file with spaces.txt');
    });

    test('passing undefined options uses all defaults', () => {
        const cmd = buildAcpxFileCommand('/tmp/file.txt');
        expect(cmd[0]).toBe('acpx');
        expect(cmd[1]).toBe('--format');
        expect(cmd[2]).toBe('quiet');
        expect(cmd[3]).toBe('--timeout');
        expect(cmd[4]).toBe('300');
        expect(cmd[5]).toBe('claude');
        expect(cmd[6]).toBe('exec');
        expect(cmd[cmd.length - 1]).toBe('--file=/tmp/file.txt');
    });
});

describe('execAcpx', () => {
    // execAcpx calls Bun.spawnSync - we test it with a real short-lived command
    // that we know will succeed (echo). This tests the full execution path.

    test('executes a simple command and returns result', () => {
        // Use a command that will succeed
        const { execAcpx } = require('../scripts/libs/acpx-query');
        const result = execAcpx(['echo', 'hello']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('hello');
        expect(result.stderr).toBe('');
        expect(result.ok).toBe(true);
    });

    test('captures stderr from a failing command', () => {
        const { execAcpx } = require('../scripts/libs/acpx-query');
        const result = execAcpx(['sh', '-c', 'echo error >&2 && exit 1']);
        expect(result.exitCode).not.toBe(0);
        expect(result.ok).toBe(false);
    });
});

describe('queryLlm', () => {
    test('returns result from execAcpx', () => {
        const { queryLlm } = require('../scripts/libs/acpx-query');
        // Use a command that succeeds quickly
        const result = queryLlm('echo test', { acpxBin: 'echo', agent: 'test' });
        expect(result).toBeDefined();
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.stdout).toBe('string');
        expect(typeof result.stderr).toBe('string');
        expect(typeof result.ok).toBe('boolean');
    });
});

describe('queryLlmFromFile', () => {
    test('returns result from execAcpx', () => {
        const { queryLlmFromFile } = require('../scripts/libs/acpx-query');
        // Use echo as stand-in for acpx to verify the function works
        const result = queryLlmFromFile('-', { acpxBin: 'cat', agent: 'test' });
        expect(result).toBeDefined();
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.stdout).toBe('string');
        expect(typeof result.stderr).toBe('string');
    });
});
