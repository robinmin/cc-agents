import { describe, expect, test } from 'bun:test';
import {
    buildAcpxCommand,
    buildAcpxFileCommand,
    getEnv,
    getBackend,
    buildAgyChatArgs,
    execAgyChat,
    queryLlmAgy,
    queryLlmFromFileAgy,
    runSlashCommandAgy,
    checkAgyHealth,
    checkHealth,
    checkAllBackendsHealth,
} from '../scripts/libs/acpx-query';

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
        expect(cmd).toEqual([
            'acpx',
            '--format',
            'quiet',
            '--timeout',
            '300',
            'claude',
            'exec',
            '--file=/tmp/prompt.txt',
        ]);
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

// ─── Antigravity (agy) Adapter Tests ────────────────────────────────────────

describe('getBackend', () => {
    test('returns acpx by default when BACKEND is not set', () => {
        // Clear any existing BACKEND env var for this test
        const originalBackend = process.env.BACKEND;
        delete process.env.BACKEND;
        try {
            const backend = getBackend();
            expect(backend).toBe('acpx');
        } finally {
            if (originalBackend !== undefined) {
                process.env.BACKEND = originalBackend;
            }
        }
    });

    test('returns antigravity when BACKEND=antigravity', () => {
        const originalBackend = process.env.BACKEND;
        process.env.BACKEND = 'antigravity';
        try {
            const backend = getBackend();
            expect(backend).toBe('antigravity');
        } finally {
            process.env.BACKEND = originalBackend ?? ('' as unknown as string);
            if (originalBackend === undefined) {
                delete process.env.BACKEND;
            }
        }
    });

    test('returns antigravity when BACKEND=agy', () => {
        const originalBackend = process.env.BACKEND;
        process.env.BACKEND = 'agy';
        try {
            const backend = getBackend();
            expect(backend).toBe('antigravity');
        } finally {
            process.env.BACKEND = originalBackend ?? ('' as unknown as string);
            if (originalBackend === undefined) {
                delete process.env.BACKEND;
            }
        }
    });

    test('returns acpx for invalid BACKEND values', () => {
        const originalBackend = process.env.BACKEND;
        process.env.BACKEND = 'invalid';
        try {
            const backend = getBackend();
            expect(backend).toBe('acpx');
        } finally {
            process.env.BACKEND = originalBackend ?? ('' as unknown as string);
            if (originalBackend === undefined) {
                delete process.env.BACKEND;
            }
        }
    });
});

describe('buildAgyChatArgs', () => {
    test('builds basic chat command', () => {
        const args = buildAgyChatArgs('test prompt', {
            agent: 'claude',
            acpxBin: 'agy',
        });
        expect(args).toEqual(['agy', 'chat', 'test prompt']);
    });

    test('uses custom agy binary path', () => {
        const args = buildAgyChatArgs('prompt', {
            acpxBin: '/usr/local/bin/agy',
        });
        expect(args[0]).toBe('/usr/local/bin/agy');
    });

    test('adds --mode for non-claude agents', () => {
        const args = buildAgyChatArgs('prompt', {
            agent: 'pi',
            acpxBin: 'agy',
        });
        expect(args).toEqual(['agy', 'chat', '--mode', 'agent', 'prompt']);
    });

    test('adds --mode for codex agent', () => {
        const args = buildAgyChatArgs('prompt', {
            agent: 'codex',
            acpxBin: 'agy',
        });
        expect(args).toEqual(['agy', 'chat', '--mode', 'agent', 'prompt']);
    });

    test('no --mode for claude agent (default)', () => {
        const args = buildAgyChatArgs('prompt', {
            agent: 'claude',
            acpxBin: 'agy',
        });
        expect(args).toEqual(['agy', 'chat', 'prompt']);
    });

    test('uses AGY_BIN env var when acpxBin not provided', () => {
        const originalAgyBin = process.env.AGY_BIN;
        process.env.AGY_BIN = '/custom/path/agy';
        try {
            const args = buildAgyChatArgs('prompt', {});
            expect(args[0]).toBe('/custom/path/agy');
        } finally {
            process.env.AGY_BIN = originalAgyBin ?? ('' as unknown as string);
            if (originalAgyBin === undefined) {
                delete process.env.AGY_BIN;
            }
        }
    });
});

describe('execAgyChat', () => {
    test('executes a simple echo command', () => {
        // Use echo as a stand-in for agy to test the execution path
        const result = execAgyChat(['echo', 'hello from agy'], 5000);
        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('hello from agy');
        expect(result.ok).toBe(true);
    });

    test('captures failure exit code', () => {
        const result = execAgyChat(['sh', '-c', 'echo error >&2 && exit 1'], 5000);
        expect(result.exitCode).not.toBe(0);
        expect(result.ok).toBe(false);
    });
});

describe('queryLlmAgy', () => {
    test('returns result from execAgyChat', () => {
        // Use echo as stand-in for agy
        const result = queryLlmAgy('test prompt', { acpxBin: 'echo', agent: 'claude' });
        expect(result).toBeDefined();
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.stdout).toBe('string');
        expect(typeof result.stderr).toBe('string');
        expect(typeof result.ok).toBe('boolean');
    });
});

describe('queryLlmFromFileAgy', () => {
    test('returns result with file content', () => {
        // Create a temp file with content and use echo to verify the read path works
        const tmpFile = '/tmp/agy-test-prompt.txt';
        require('fs').writeFileSync(tmpFile, 'test prompt content');
        // Note: echo just echoes the content, doesn't read the file
        // This tests that the file reading works, actual content goes through queryLlmAgy
        const result = queryLlmFromFileAgy(tmpFile, { acpxBin: 'echo', agent: 'claude' });
        expect(result).toBeDefined();
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.stdout).toBe('string');
    });

    test('returns error for missing file', () => {
        const result = queryLlmFromFileAgy('/nonexistent/file/path.txt', { acpxBin: 'agy' });
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Failed to read file');
    });
});

describe('runSlashCommandAgy', () => {
    test('returns not supported error', () => {
        const result = runSlashCommandAgy('/some:command args');
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('not supported by agy');
    });

    test('handles empty slash command gracefully', () => {
        // Note: runSlashCommand validates empty command before calling agy adapter
        // But runSlashCommandAgy should handle any input gracefully
        const result = runSlashCommandAgy('');
        expect(result.ok).toBe(false);
        expect(result.stderr).toContain('not supported by agy');
    });
});

describe('checkAgyHealth', () => {
    test('returns healthy status for valid binary', () => {
        // Use echo as stand-in - it will succeed
        const health = checkAgyHealth('echo');
        expect(health.healthy).toBe(true);
        expect(health.version).toBeDefined();
    });

    test('returns unhealthy for invalid binary', () => {
        const health = checkAgyHealth('/nonexistent/agy');
        expect(health.healthy).toBe(false);
        expect(health.error).toBeDefined();
    });

    test('uses default binary when not specified', () => {
        const health = checkAgyHealth();
        // Will use 'agy' from PATH or AGY_BIN env
        // This test verifies the function doesn't crash
        expect(typeof health.healthy).toBe('boolean');
    });
});

describe('checkHealth', () => {
    test('returns current backend health', () => {
        const originalBackend = process.env.BACKEND;
        delete process.env.BACKEND;
        try {
            const health = checkHealth({ acpxBin: 'echo' });
            expect(health.backend).toBe('acpx');
            expect(typeof health.healthy).toBe('boolean');
        } finally {
            process.env.BACKEND = originalBackend ?? ('' as unknown as string);
            if (originalBackend === undefined) {
                delete process.env.BACKEND;
            }
        }
    });

    test('returns antigravity backend when BACKEND=antigravity', () => {
        const originalBackend = process.env.BACKEND;
        process.env.BACKEND = 'antigravity';
        try {
            const health = checkHealth({ agyBin: 'echo' });
            expect(health.backend).toBe('antigravity');
        } finally {
            process.env.BACKEND = originalBackend ?? ('' as unknown as string);
            if (originalBackend === undefined) {
                delete process.env.BACKEND;
            }
        }
    });
});

describe('checkAllBackendsHealth', () => {
    test('returns health for both backends', () => {
        const health = checkAllBackendsHealth();
        expect(health).toBeDefined();
        expect(typeof health.acpx).toBe('object');
        expect(typeof health.agy).toBe('object');
        expect(typeof health.acpx.healthy).toBe('boolean');
        expect(typeof health.agy.healthy).toBe('boolean');
    });
});
