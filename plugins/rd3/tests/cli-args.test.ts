import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { parseCli, formatUsage, type CliSpec } from '../scripts/libs/cli-args';
import { setGlobalSilent, isGlobalSilent } from '../scripts/logger';

let previousSilent: boolean;
beforeAll(() => {
    previousSilent = isGlobalSilent();
    setGlobalSilent(true);
});
afterAll(() => {
    setGlobalSilent(previousSilent);
});

const testSpec: CliSpec = {
    name: 'test-tool',
    description: 'A test CLI tool',
    options: {
        report: { type: 'string', short: 'r', required: true },
        strict: { type: 'boolean', default: false },
        mode: { type: 'string', short: 'm', default: 'standard' },
    },
    examples: ['test-tool --report file.md', 'test-tool -r file.md --strict'],
};

describe('parseCli', () => {
    test('parses string options', () => {
        const result = parseCli(testSpec, ['--report', 'file.md']);
        expect(result.values.report).toBe('file.md');
    });

    test('parses short aliases', () => {
        const result = parseCli(testSpec, ['-r', 'file.md']);
        expect(result.values.report).toBe('file.md');
    });

    test('parses boolean flags', () => {
        const result = parseCli(testSpec, ['--report', 'file.md', '--strict']);
        expect(result.values.strict).toBe(true);
    });

    test('applies default values', () => {
        const result = parseCli(testSpec, ['--report', 'file.md']);
        expect(result.values.mode).toBe('standard');
        expect(result.values.strict).toBe(false);
    });

    test('overrides defaults with provided values', () => {
        const result = parseCli(testSpec, ['--report', 'file.md', '--mode', 'deep']);
        expect(result.values.mode).toBe('deep');
    });

    test('collects positionals when allowed', () => {
        const posSpec: CliSpec = {
            name: 'pos-tool',
            description: 'Tool with positionals',
            options: {},
            allowPositionals: true,
        };
        const result = parseCli(posSpec, ['arg1', 'arg2']);
        expect(result.positionals).toEqual(['arg1', 'arg2']);
    });
});

describe('formatUsage', () => {
    test('includes tool name', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('test-tool');
    });

    test('includes description', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('A test CLI tool');
    });

    test('includes option flags', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('--report');
        expect(usage).toContain('-r');
        expect(usage).toContain('--strict');
        expect(usage).toContain('--mode');
    });

    test('includes examples', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('test-tool --report file.md');
    });

    test('marks required options', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('(required)');
    });

    test('shows default values', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('standard');
    });

    test('includes help flag', () => {
        const usage = formatUsage(testSpec);
        expect(usage).toContain('--help');
    });
});
