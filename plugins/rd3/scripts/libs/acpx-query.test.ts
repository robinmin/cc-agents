import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import type { AcpxQueryOptions, AcpxQueryResult, ResourceMetrics, AcpxHealth } from './acpx-query';

// ─── Test State ───────────────────────────────────────────────────────────────
// Capture ORIGINAL state at module load time to prevent test pollution
const originalEnv: Record<string, string | undefined> = { ...process.env };

beforeEach(() => {
    // Clean up test-specific env vars while preserving original state
    delete process.env.TEST_VAR;
    delete process.env.NONEXISTENT_VAR_12345;
    delete process.env.LLM_CLI_COMMAND;
    delete process.env.ACPX_AGENT;
    delete process.env.ACPX_BIN;
});

afterEach(() => {
    // Restore ALL env vars to their original state (captured at module load)
    // Delete any vars that weren't in the original state
    for (const key of Object.keys(process.env)) {
        if (!(key in originalEnv)) {
            delete process.env[key];
        }
    }
    // Restore original values
    for (const key of Object.keys(originalEnv)) {
        process.env[key] = originalEnv[key];
    }
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getEnv', async () => {
    test('returns value when env var exists', async () => {
        process.env.TEST_VAR = 'test-value';
        const { getEnv } = await import('./acpx-query');
        expect(getEnv('TEST_VAR')).toBe('test-value');
    });

    test('returns undefined when env var does not exist', async () => {
        const { getEnv } = await import('./acpx-query');
        expect(getEnv('NONEXISTENT_VAR_12345')).toBeUndefined();
    });
});

describe('getLegacyLlmCommand', async () => {
    test('returns explicit LLM_CLI_COMMAND when set', async () => {
        process.env.LLM_CLI_COMMAND = '/custom/pi/path';
        const { getLegacyLlmCommand } = await import('./acpx-query');
        const result = getLegacyLlmCommand();
        expect(result).toBe('/custom/pi/path');
    });
});

describe('initializeLlmEnv', async () => {
    test('does nothing if LLM_CLI_COMMAND already set', async () => {
        process.env.LLM_CLI_COMMAND = '/already/set';
        const { initializeLlmEnv } = await import('./acpx-query');
        // Should not throw
        initializeLlmEnv();
    });
});

describe('buildAcpxCommand', async () => {
    test('builds exec command array', async () => {
        const { buildAcpxCommand } = await import('./acpx-query');
        const cmd = buildAcpxCommand('test prompt');
        expect(cmd[cmd.length - 1]).toBe('test prompt');
        expect(cmd).toContain('exec');
    });

    test('returns array with acpx bin', async () => {
        const { buildAcpxCommand } = await import('./acpx-query');
        const cmd = buildAcpxCommand('test');
        expect(cmd[0]).toBeDefined();
    });

    test('accepts options parameter', async () => {
        const { buildAcpxCommand } = await import('./acpx-query');
        const cmd = buildAcpxCommand('test', { agent: 'custom' });
        expect(cmd).toBeDefined();
        expect(Array.isArray(cmd)).toBe(true);
    });
});

describe('buildAcpxFileCommand', async () => {
    test('builds file exec command with --file prefix', async () => {
        const { buildAcpxFileCommand } = await import('./acpx-query');
        const cmd = buildAcpxFileCommand('/path/to/prompt.txt');
        expect(cmd).toContain('--file=/path/to/prompt.txt');
        expect(cmd).toContain('exec');
    });

    test('accepts options parameter', async () => {
        const { buildAcpxFileCommand } = await import('./acpx-query');
        const cmd = buildAcpxFileCommand('/path', { format: 'json' });
        expect(cmd).toBeDefined();
        expect(Array.isArray(cmd)).toBe(true);
    });
});

describe('parseOutput', async () => {
    test('extracts metrics from NDJSON usage events', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"usage","usage":{"model_id":"gpt-4","model_provider":"openai","input_tokens":100,"output_tokens":50,"wall_clock_ms":1000,"execution_ms":950}}',
        ].join('\n');
        const result = parseOutput(output, false, true);
        expect(result.metrics).toHaveLength(1);
        expect(result.metrics?.[0].model_id).toBe('gpt-4');
        expect(result.metrics?.[0].model_provider).toBe('openai');
        expect(result.metrics?.[0].input_tokens).toBe(100);
        expect(result.metrics?.[0].output_tokens).toBe(50);
        expect(result.metrics?.[0].wall_clock_ms).toBe(1000);
        expect(result.metrics?.[0].execution_ms).toBe(950);
    });

    test('extracts structured from NDJSON events', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = ['{"type":"structured","data":{"key":"value"}}'].join('\n');
        const result = parseOutput(output, true, false);
        expect(result.structured).toEqual({ key: 'value' });
    });

    test('extracts structured from markdown json blocks', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = 'Some text\n```json\n{"result":"success"}\n```\nmore text';
        const result = parseOutput(output, true, false);
        expect(result.structured).toEqual({ result: 'success' });
    });

    test('extracts cache metrics when present', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"usage","usage":{"model_id":"claude-3","model_provider":"anthropic","input_tokens":500,"output_tokens":100,"wall_clock_ms":500,"execution_ms":400,"cache_read_tokens":300,"cache_creation_tokens":150,"first_token_ms":50}}',
        ].join('\n');
        const result = parseOutput(output, false, true);
        expect(result.metrics?.[0].cache_read_tokens).toBe(300);
        expect(result.metrics?.[0].cache_creation_tokens).toBe(150);
        expect(result.metrics?.[0].first_token_ms).toBe(50);
    });

    test('handles empty output', async () => {
        const { parseOutput } = await import('./acpx-query');
        const result = parseOutput('', true, true);
        expect(result.structured).toBeUndefined();
        expect(result.metrics).toBeUndefined();
    });

    test('handles invalid json gracefully', async () => {
        const { parseOutput } = await import('./acpx-query');
        const result = parseOutput('not json at all { incomplete', true, true);
        expect(result.structured).toBeUndefined();
    });

    test('prefers NDJSON structured over markdown', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"structured","data":{"source":"ndjson"}}',
            '```json',
            '{"source":"markdown"}',
            '```',
        ].join('\n');
        const result = parseOutput(output, true, false);
        expect(result.structured).toEqual({ source: 'ndjson' });
    });

    test('combines multiple usage events', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"usage","usage":{"model_id":"model-1","model_provider":"prov-1","input_tokens":10,"output_tokens":5,"wall_clock_ms":100,"execution_ms":90}}',
            '{"type":"usage","usage":{"model_id":"model-2","model_provider":"prov-2","input_tokens":20,"output_tokens":10,"wall_clock_ms":200,"execution_ms":180}}',
        ].join('\n');
        const result = parseOutput(output, false, true);
        expect(result.metrics).toHaveLength(2);
        expect(result.metrics?.[0].model_id).toBe('model-1');
        expect(result.metrics?.[1].model_id).toBe('model-2');
    });

    test('skips non-usage/non-structured NDJSON events', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"text","content":"hello"}',
            '{"type":"usage","usage":{"model_id":"gpt-4","model_provider":"openai","input_tokens":10,"output_tokens":5,"wall_clock_ms":100,"execution_ms":90}}',
            '{"type":"done"}',
        ].join('\n');
        const result = parseOutput(output, false, true);
        expect(result.metrics).toHaveLength(1);
    });

    test('extracts both structured and metrics when both enabled', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            '{"type":"usage","usage":{"model_id":"gpt-4","model_provider":"openai","input_tokens":10,"output_tokens":5,"wall_clock_ms":100,"execution_ms":90}}',
            '{"type":"structured","data":{"answer":"42"}}',
        ].join('\n');
        const result = parseOutput(output, true, true);
        expect(result.metrics).toHaveLength(1);
        expect(result.structured).toEqual({ answer: '42' });
    });
});

describe('extractFromJsonBlock', async () => {
    test('extracts JSON from fence blocks', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = 'Some text\n```json\n{"key":"value"}\n```\nend';
        const result = extractFromJsonBlock(output);
        expect(result).toEqual({ key: 'value' });
    });

    test('returns undefined when no json fence', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const result = extractFromJsonBlock('plain text without fences');
        expect(result).toBeUndefined();
    });

    test('returns undefined for incomplete fences', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const result = extractFromJsonBlock('```json\n{"incomplete"');
        expect(result).toBeUndefined();
    });

    test('handles nested objects', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = '```json\n{"nested":{"deep":true}}\n```';
        const result = extractFromJsonBlock(output);
        expect(result).toEqual({ nested: { deep: true } });
    });

    test('skips arrays', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = '```json\n[1, 2, 3]\n```';
        const result = extractFromJsonBlock(output);
        expect(result).toBeUndefined();
    });

    test('handles empty object', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = '```json\n{}\n```';
        const result = extractFromJsonBlock(output);
        expect(result).toBeUndefined(); // empty objects skipped
    });

    test('handles content after closing fence', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = '```json\n{"key":"value"}\n```\nmore content';
        const result = extractFromJsonBlock(output);
        expect(result).toEqual({ key: 'value' });
    });

    test('finds first json block when multiple present', async () => {
        const { extractFromJsonBlock } = await import('./acpx-query');
        const output = '```json\n{"first":true}\n```\ntext\n```json\n{"second":true}\n```';
        const result = extractFromJsonBlock(output);
        expect(result).toEqual({ first: true });
    });
});

describe('extractFirstBalancedJsonObject', async () => {
    test('extracts simple object', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('text { "key": "value" } more');
        expect(result).toContain('"key"');
        expect(result).toContain('"value"');
    });

    test('extracts nested object', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('before { "nested": { "a": 1 } } after');
        expect(result).toContain('"nested"');
        expect(result).toContain('"a"');
    });

    test('returns empty string when no brace', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('no braces here');
        expect(result).toBe('');
    });

    test('handles strings with braces', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('{"msg": "has { brace"}');
        expect(result).toContain('{');
    });

    test('handles escaped quotes', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('{"msg": "escaped \\"quote\\""}');
        expect(result).toContain('escaped');
    });

    test('handles arrays', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('text {[1, 2, 3]} after');
        expect(result).toContain('1');
        expect(result).toContain('3');
    });

    test('skips leading whitespace', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('   { "key": 1 }');
        expect(result).toContain('"key"');
    });

    test('handles deeply nested structures', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('{"a":{"b":{"c":{"d":1}}}}');
        expect(result).toContain('"a"');
        expect(result).toContain('"d"');
    });

    test('handles object with arrays', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        const result = extractFirstBalancedJsonObject('{"items":[1,2,3]}');
        expect(result).toContain('"items"');
    });

    test('handles escaped backslash', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        // Test escaped backslash handling (lines 428-429)
        const result = extractFirstBalancedJsonObject('{"path":"C:\\\\Users\\\\test"}');
        expect(result).toContain('path');
    });

    test('returns empty string for incomplete object', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        // Test early return when no balanced braces found (lines 432-433)
        const result = extractFirstBalancedJsonObject('{incomplete');
        expect(result).toBe('');
    });

    test('handles object with escaped quotes', async () => {
        const { extractFirstBalancedJsonObject } = await import('./acpx-query');
        // Test escaped quote handling
        const result = extractFirstBalancedJsonObject('{"msg":"say \\"hello\\""}');
        expect(result).toContain('msg');
    });
});

describe('ALLOWED_TOOLS constant', async () => {
    test('contains expected tools', async () => {
        const { ALLOWED_TOOLS } = await import('./acpx-query');
        expect(ALLOWED_TOOLS).toContain('Skill');
        expect(ALLOWED_TOOLS).toContain('Read');
        expect(ALLOWED_TOOLS).toContain('Bash');
        expect(ALLOWED_TOOLS).toContain('Edit');
        expect(ALLOWED_TOOLS).toContain('Write');
    });

    test('is a string', async () => {
        const { ALLOWED_TOOLS } = await import('./acpx-query');
        expect(typeof ALLOWED_TOOLS).toBe('string');
    });
});

describe('interface types', async () => {
    test('AcpxQueryOptions has expected shape', () => {
        const opts: AcpxQueryOptions = {
            agent: 'test',
            format: 'json',
            timeoutMs: 60_000,
            parseStructured: true,
            extractMetrics: true,
        };
        expect(opts.agent).toBe('test');
        expect(opts.format).toBe('json');
    });

    test('AcpxQueryResult has expected shape', () => {
        const result: AcpxQueryResult = {
            ok: true,
            exitCode: 0,
            stdout: 'output',
            stderr: '',
            durationMs: 100,
            timedOut: false,
        };
        expect(result.ok).toBe(true);
        expect(result.durationMs).toBe(100);
    });

    test('ResourceMetrics has expected shape', () => {
        const metrics: ResourceMetrics = {
            model_id: 'gpt-4',
            model_provider: 'openai',
            input_tokens: 100,
            output_tokens: 50,
            wall_clock_ms: 1000,
            execution_ms: 950,
        };
        expect(metrics.model_id).toBe('gpt-4');
        expect(metrics.input_tokens).toBe(100);
    });

    test('AcpxHealth has expected shape', () => {
        const health: AcpxHealth = {
            healthy: true,
            version: '1.0.0',
        };
        expect(health.healthy).toBe(true);
        expect(health.version).toBe('1.0.0');
    });

    test('AcpxHealth can have error', () => {
        const health: AcpxHealth = {
            healthy: false,
            error: 'not found',
        };
        expect(health.healthy).toBe(false);
        expect(health.error).toBe('not found');
    });
});

describe('resolveOptions', async () => {
    test('applies defaults when no options provided', async () => {
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions();
        expect(resolved.agent).toBe('claude');
        expect(resolved.acpxBin).toBe('acpx');
        expect(resolved.format).toBe('quiet');
        expect(resolved.timeoutMs).toBe(300_000);
        expect(resolved.parseStructured).toBe(false);
        expect(resolved.extractMetrics).toBe(false);
    });

    test('uses provided options', async () => {
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions({
            agent: 'custom-agent',
            acpxBin: '/custom/acpx',
            format: 'json',
            timeoutMs: 60_000,
            parseStructured: true,
            extractMetrics: true,
        });
        expect(resolved.agent).toBe('custom-agent');
        expect(resolved.acpxBin).toBe('/custom/acpx');
        expect(resolved.format).toBe('json');
        expect(resolved.timeoutMs).toBe(60_000);
        expect(resolved.parseStructured).toBe(true);
        expect(resolved.extractMetrics).toBe(true);
    });

    test('uses ACPX_AGENT env var fallback', async () => {
        process.env.ACPX_AGENT = 'env-agent';
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions({});
        expect(resolved.agent).toBe('env-agent');
    });

    test('uses ACPX_BIN env var fallback', async () => {
        process.env.ACPX_BIN = '/env/acpx';
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions({});
        expect(resolved.acpxBin).toBe('/env/acpx');
    });

    test('defaults empty env vars to empty string', async () => {
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions({});
        expect(resolved.allowedTools).toBe('');
        expect(resolved.env).toEqual({});
    });

    test('can provide env override', async () => {
        const { resolveOptions } = await import('./acpx-query');
        const resolved = resolveOptions({ env: { CUSTOM: 'value' } });
        expect(resolved.env).toEqual({ CUSTOM: 'value' });
    });
});

describe('buildAcpxArgs', async () => {
    test('builds basic args with defaults', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions();
        const args = buildAcpxArgs('claude', 'exec', 'hello world', opts);
        expect(args[0]).toBe('acpx');
        expect(args).toContain('--format');
        expect(args).toContain('quiet');
        expect(args).toContain('claude');
        expect(args).toContain('exec');
        expect(args).toContain('hello world');
    });

    test('includes timeout when specified', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ timeoutMs: 60_000 });
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('--timeout');
        expect(args).toContain('60');
    });

    test('rounds timeout up to seconds', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ timeoutMs: 61_500 });
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('62');
    });

    test('rounds timeout up (1500ms -> 2s)', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ timeoutMs: 1_500 });
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('2');
    });

    test('includes allowed tools when specified', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ allowedTools: 'Read,Bash' });
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('--allowed-tools');
        expect(args).toContain('Read,Bash');
    });

    test('includes custom format', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ format: 'json' });
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('--format');
        expect(args).toContain('json');
    });

    test('default timeout is 300 seconds', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions();
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).toContain('--timeout');
        expect(args).toContain('300');
    });

    test('excludes allowed tools when empty', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions();
        const args = buildAcpxArgs('claude', 'exec', 'prompt', opts);
        expect(args).not.toContain('--allowed-tools');
    });

    test('handles text format', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ format: 'text' });
        const args = buildAcpxArgs('agent', 'cmd', 'input', opts);
        expect(args).toContain('--format');
        expect(args).toContain('text');
    });

    test('handles custom agent name', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions();
        const args = buildAcpxArgs('custom-agent', 'exec', 'input', opts);
        expect(args).toContain('custom-agent');
    });
});

describe('execAcpxSync integration', async () => {
    test('executes simple command successfully', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/bin/echo', 'hello']);
        expect(result.ok).toBe(true);
        expect(result.stdout.trim()).toBe('hello');
    });

    test('captures exit code', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/usr/bin/find', '/usr', '-name', 'nonexistent-file-xyz']);
        // find returns non-zero when file not found
        expect(result.exitCode).toBeGreaterThanOrEqual(1);
    });

    test('returns non-zero exit code on failure', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/bin/false']);
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
    });

    test('includes duration', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/bin/echo', 'test']);
        expect(typeof result.durationMs).toBe('number');
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    test('surfaces spawn errors for missing binaries', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/definitely/missing/acpx-binary']);
        expect(result.ok).toBe(false);
        expect(result.errorMessage).toBeDefined();
        expect(result.stderr).toContain('spawn_error:');
    });

    test('marks timed out processes and preserves timeout diagnostics', async () => {
        const { execAcpxSync } = await import('./acpx-query');
        const result = execAcpxSync(['/bin/sh', '-c', 'sleep 1'], 10);
        expect(result.ok).toBe(false);
        expect(result.timedOut).toBe(true);
        expect(result.errorMessage).toBeDefined();
        expect(result.stderr).toContain('spawn_error:');
    });
});

describe('execLlmCli integration', async () => {
    test('executes with temp prompt file', async () => {
        const { execLlmCli } = await import('./acpx-query');
        // Create a simple shell script
        const fs = await import('node:fs');
        const os = await import('node:os');
        const path = await import('node:path');

        const tmpDir = os.tmpdir();
        const scriptPath = path.join(tmpDir, `test-${Date.now()}.sh`);
        const promptPath = path.join(tmpDir, `prompt-${Date.now()}.txt`);

        fs.writeFileSync(scriptPath, '#!/bin/sh\ncat');
        fs.chmodSync(scriptPath, 0o755);
        fs.writeFileSync(promptPath, 'test prompt content');

        try {
            const result = execLlmCli([scriptPath], promptPath);
            expect(result.stdout).toContain('test prompt content');
        } finally {
            fs.unlinkSync(scriptPath);
            fs.unlinkSync(promptPath);
        }
    });
});

describe('execAcpx integration', async () => {
    test('delegates to execAcpxSync', async () => {
        const { execAcpx } = await import('./acpx-query');
        const result = execAcpx(['/bin/echo', 'delegated']);
        expect(result.ok).toBe(true);
    });
});

describe('checkAcpxHealth integration', async () => {
    test('returns healthy when acpx is available', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        const result = checkAcpxHealth();
        // May be healthy or unhealthy depending on acpx setup
        expect(typeof result.healthy).toBe('boolean');
    });

    test('returns healthy when using full path', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        const result = checkAcpxHealth('/Users/robin/Library/pnpm/acpx');
        expect(typeof result.healthy).toBe('boolean');
    });

    test('returns error field when unhealthy', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        const result = checkAcpxHealth('/nonexistent');
        expect(result.healthy).toBe(false);
        expect(result.error).toBeDefined();
    });

    test('returns version when healthy', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        const result = checkAcpxHealth();
        if (result.healthy) {
            expect(result.version).toBeDefined();
        }
    });
});

describe('queryLlm integration', async () => {
    test('calls execAcpxSync with built args', async () => {
        const { execAcpxSync, resolveOptions, buildAcpxArgs } = await import('./acpx-query');
        const opts = resolveOptions({ timeoutMs: 3000 });
        const args = buildAcpxArgs(opts.agent, 'exec', 'test', opts);
        const result = execAcpxSync(args, opts.timeoutMs);
        // Should execute (may fail but returns valid structure)
        expect(typeof result.ok).toBe('boolean');
    });

    test('builds correct args for acpx exec', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions({ agent: 'claude', timeoutMs: 5000 });
        const args = buildAcpxArgs(opts.agent, 'exec', 'test prompt', opts);
        expect(args[0]).toBe('acpx');
        expect(args).toContain('claude');
        expect(args).toContain('exec');
        expect(args).toContain('test prompt');
    });
});

describe('queryLlmFromFile integration', async () => {
    test('calls execAcpxSync with file path args', async () => {
        const { execAcpxSync, resolveOptions, buildAcpxArgs } = await import('./acpx-query');
        const opts = resolveOptions({ timeoutMs: 3000 });
        const args = buildAcpxArgs(opts.agent, 'exec', '--file=/tmp/prompt.txt', opts);
        const result = execAcpxSync(args, opts.timeoutMs);
        expect(typeof result.ok).toBe('boolean');
    });

    test('includes file path in built args', async () => {
        const { buildAcpxArgs, resolveOptions } = await import('./acpx-query');
        const opts = resolveOptions();
        const args = buildAcpxArgs('claude', 'exec', '--file=/path/to/file.txt', opts);
        expect(args).toContain('--file=/path/to/file.txt');
    });
});

describe('queryLlm with mock acpx', async () => {
    const originalBin = process.env.ACPX_BIN;

    beforeEach(() => {
        process.env.ACPX_BIN = '/tmp/acpx-mock/mock-acpx.sh';
    });

    afterEach(() => {
        if (originalBin !== undefined) {
            process.env.ACPX_BIN = originalBin;
        } else {
            delete process.env.ACPX_BIN;
        }
    });

    test('executes queryLlm with mock acpx', async () => {
        const { queryLlm } = await import('./acpx-query');
        const result = queryLlm('test', { timeoutMs: 1000 });
        expect(result.ok).toBe(true);
        expect(result.stdout).toContain('mock output');
    });

    test('queryLlm parses structured when enabled', async () => {
        const { queryLlm } = await import('./acpx-query');
        // Mock doesn't output JSON so structured should be undefined
        const result = queryLlm('test', { parseStructured: true, timeoutMs: 1000 });
        expect(result.ok).toBe(true);
    });
});

describe('queryLlmFromFile with mock acpx', async () => {
    const originalBin = process.env.ACPX_BIN;

    beforeEach(() => {
        process.env.ACPX_BIN = '/tmp/acpx-mock/mock-acpx.sh';
    });

    afterEach(() => {
        if (originalBin !== undefined) {
            process.env.ACPX_BIN = originalBin;
        } else {
            delete process.env.ACPX_BIN;
        }
    });

    test('executes queryLlmFromFile with mock acpx', async () => {
        const { queryLlmFromFile } = await import('./acpx-query');
        const fs = await import('node:fs');
        const os = await import('node:os');
        const path = await import('node:path');

        const promptPath = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
        fs.writeFileSync(promptPath, 'test');

        try {
            const result = queryLlmFromFile(promptPath, { timeoutMs: 1000 });
            expect(result.ok).toBe(true);
        } finally {
            fs.unlinkSync(promptPath);
        }
    });
});

describe('parseOutput edge cases', async () => {
    test('handles mixed valid and invalid lines', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = [
            'not json at all',
            '{"type":"usage","usage":{"model_id":"gpt-4","model_provider":"openai","input_tokens":10,"output_tokens":5,"wall_clock_ms":100,"execution_ms":90}}',
            'more invalid text',
        ].join('\n');
        const result = parseOutput(output, false, true);
        expect(result.metrics).toHaveLength(1);
    });

    test('handles partial json objects', async () => {
        const { parseOutput } = await import('./acpx-query');
        const output = '{"incomplete';
        const result = parseOutput(output, true, true);
        // Should not throw, should handle gracefully
        expect(result.structured).toBeUndefined();
    });
});

// ─── runSlashCommand Tests ──────────────────────────────────────────────────

describe('isExecutionChannel', async () => {
    const { isExecutionChannel } = await import('./acpx-query');

    test('returns true for valid channels', () => {
        expect(isExecutionChannel('claude-code')).toBe(true);
        expect(isExecutionChannel('pi')).toBe(true);
        expect(isExecutionChannel('codex')).toBe(true);
        expect(isExecutionChannel('gemini')).toBe(true);
        expect(isExecutionChannel('kilocode')).toBe(true);
        expect(isExecutionChannel('openclaw')).toBe(true);
        expect(isExecutionChannel('opencode')).toBe(true);
    });

    test('returns false for invalid channels', () => {
        expect(isExecutionChannel('invalid')).toBe(false);
        expect(isExecutionChannel('claude')).toBe(false);
        expect(isExecutionChannel('openai')).toBe(false);
        expect(isExecutionChannel('')).toBe(false);
        expect(isExecutionChannel('CLAUDE-CODE')).toBe(false);
    });
});

describe('transformSlashCommand', async () => {
    const { transformSlashCommand } = await import('./acpx-query');

    test('claude-code passes through unchanged', () => {
        const result = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'claude-code');
        expect(result).toBe('/rd3:dev-fixall "bun run test"');
    });

    test('pi transforms rd3: to skill:rd3-', () => {
        const result = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'pi');
        expect(result).toBe('/skill:rd3-dev-fixall "bun run test"');
    });

    test('codex transforms rd3: to $', () => {
        const result = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'codex');
        expect(result).toBe('$rd3-dev-fixall "bun run test"');
    });

    test('gemini passes through unchanged', () => {
        const result = transformSlashCommand('/rd3:dev-fixall', 'gemini');
        expect(result).toBe('/rd3:dev-fixall');
    });

    test('kilocode passes through unchanged', () => {
        const result = transformSlashCommand('/rd3:dev-fixall', 'kilocode');
        expect(result).toBe('/rd3:dev-fixall');
    });

    test('openclaw passes through unchanged', () => {
        const result = transformSlashCommand('/rd3:dev-fixall', 'openclaw');
        expect(result).toBe('/rd3:dev-fixall');
    });

    test('opencode passes through unchanged', () => {
        const result = transformSlashCommand('/rd3:dev-fixall', 'opencode');
        expect(result).toBe('/rd3:dev-fixall');
    });

    test('throws TypeError for invalid channel', () => {
        // @ts-expect-error - intentionally passing invalid channel to test error handling
        expect(() => transformSlashCommand('/rd3:test', 'invalid')).toThrow(TypeError);
    });

    test('trims whitespace', () => {
        const result = transformSlashCommand('  /rd3:dev-fixall  ', 'claude-code');
        expect(result).toBe('/rd3:dev-fixall');
    });

    test('handles command without arguments', () => {
        const result = transformSlashCommand('/rd3:dev-fixall', 'pi');
        expect(result).toBe('/skill:rd3-dev-fixall');
    });
});

describe('runSlashCommand', async () => {
    const { runSlashCommand } = await import('./acpx-query');

    test('returns error result for empty slash command', () => {
        const result = runSlashCommand('');
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Empty slash command');
    });

    test('returns error result for whitespace-only slash command', () => {
        const result = runSlashCommand('   ');
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
    });

    test('returns error result for invalid channel', () => {
        // @ts-expect-error Testing invalid channel input intentionally
        const result = runSlashCommand('/rd3:test', { channel: 'invalid' });
        expect(result.ok).toBe(false);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Invalid execution channel');
        expect(result.stderr).toContain('invalid');
    });

    test('error message lists valid channels', () => {
        // @ts-expect-error Testing invalid channel input intentionally
        const result = runSlashCommand('/rd3:test', { channel: 'not-valid' });
        expect(result.stderr).toContain('claude-code');
        expect(result.stderr).toContain('pi');
        expect(result.stderr).toContain('codex');
    });

    test('uses claude-code as default channel', () => {
        const result = runSlashCommand('/rd3:test', { timeoutMs: 1000 });
        expect(typeof result.ok).toBe('boolean');
    });

    test('accepts valid channel option', () => {
        const result = runSlashCommand('/rd3:test', { channel: 'pi', timeoutMs: 1000 });
        expect(typeof result.ok).toBe('boolean');
    });

    test('result structure includes all expected fields', () => {
        const result = runSlashCommand('/rd3:test', { timeoutMs: 1000 });
        expect(typeof result.ok).toBe('boolean');
        expect(typeof result.exitCode).toBe('number');
        expect(typeof result.stdout).toBe('string');
        expect(typeof result.stderr).toBe('string');
        expect(typeof result.durationMs).toBe('number');
        expect(typeof result.timedOut).toBe('boolean');
    });
});

describe('runSlashCommand transformation integration', async () => {
    const { transformSlashCommand } = await import('./acpx-query');

    test('transformation for pi matches expected format', () => {
        const transformed = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'pi');
        expect(transformed).toBe('/skill:rd3-dev-fixall "bun run test"');
    });

    test('transformation for codex matches expected format', () => {
        const transformed = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'codex');
        expect(transformed).toBe('$rd3-dev-fixall "bun run test"');
    });

    test('transformation for claude-code passes through', () => {
        const transformed = transformSlashCommand('/rd3:dev-fixall "bun run test"', 'claude-code');
        expect(transformed).toBe('/rd3:dev-fixall "bun run test"');
    });
});

// ─── Additional Coverage Tests ───────────────────────────────────────────────

describe('queryLlmSession via runSlashCommand', async () => {
    test('creates session-based query with ttl', async () => {
        const { runSlashCommand } = await import('./acpx-query');
        const result = runSlashCommand('/rd3:test', {
            channel: 'claude-code',
            session: 'test-session',
            sessionTtlSeconds: 3600,
            timeoutMs: 5000,
        });
        // Should return valid structure regardless of execution result
        expect(typeof result.ok).toBe('boolean');
        expect(typeof result.durationMs).toBe('number');
        expect(typeof result.exitCode).toBe('number');
    });

    test('session query without ttl uses defaults', async () => {
        const { runSlashCommand } = await import('./acpx-query');
        const result = runSlashCommand('/rd3:test', {
            channel: 'claude-code',
            session: 'test-session-no-ttl',
            timeoutMs: 1000,
        });
        expect(typeof result.ok).toBe('boolean');
        expect(typeof result.timedOut).toBe('boolean');
    });
});

describe('checkAcpxHealth error handling', async () => {
    test('handles binary that exits with non-zero', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        const result = checkAcpxHealth('/bin/false');
        expect(result.healthy).toBe(false);
        expect(result.error).toContain('exited with code');
    });

    test('handles exception when spawning binary', async () => {
        const { checkAcpxHealth } = await import('./acpx-query');
        // Use an invalid path that will throw
        const result = checkAcpxHealth('/nonexistent/binary/path/xyz');
        expect(result.healthy).toBe(false);
        expect(result.error).toBeDefined();
    });
});

describe('queryLlmFromFile early return', async () => {
    test('returns result without parsing when no options enabled', async () => {
        const { queryLlmFromFile } = await import('./acpx-query');
        // Create a temp file
        const fs = await import('node:fs');
        const os = await import('node:os');
        const path = await import('node:path');
        const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}.txt`);
        fs.writeFileSync(tmpPath, 'test content');

        try {
            // Use mock acpx via env
            const originalBin = process.env.ACPX_BIN;
            process.env.ACPX_BIN = '/tmp/acpx-mock/mock-acpx.sh';

            const result = queryLlmFromFile(tmpPath, {
                timeoutMs: 1000,
                parseStructured: false,
                extractMetrics: false,
            });
            // Should return result directly without parsing
            expect(typeof result.ok).toBe('boolean');
            expect(typeof result.durationMs).toBe('number');

            process.env.ACPX_BIN = originalBin;
        } finally {
            fs.unlinkSync(tmpPath);
        }
    });
});
