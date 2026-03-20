import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { adaptAgent, adaptToAll, main, parseCliArgs, printResults, validateOptions } from '../scripts/adapt';
import { setGlobalSilent } from '../../../scripts/logger';

const TEST_DIR = '/tmp/cc-agents-adapt-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, 'fixtures');

class ExitError extends Error {
    code: number | undefined;

    constructor(code?: number) {
        super('exit');
        this.code = code;
    }
}

function mockExit(): { restore: () => void; getCode: () => number | undefined } {
    const originalExit = process.exit;
    let exitCode: number | undefined;

    process.exit = ((code?: number) => {
        exitCode = code;
        throw new ExitError(code);
    }) as (code?: number) => never;

    return {
        restore: () => {
            process.exit = originalExit;
        },
        getCode: () => exitCode,
    };
}

function muteConsole(): () => void {
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalDebug = console.debug;

    // Enable global silent mode to suppress all logger output
    setGlobalSilent(true);

    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.debug = () => {};

    return () => {
        setGlobalSilent(false);
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
        console.debug = originalDebug;
    };
}

describe('adapt.ts', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(TEST_DIR, { recursive: true });
        // Suppress all console output for all tests
        muteConsole();
    });

    afterEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse CLI args with default all-target behavior', () => {
        const sourcePath = join(TEST_DIR, 'agent.md');
        const options = parseCliArgs([sourcePath, 'claude']);

        expect(options.sourcePath).toBe(resolve(sourcePath));
        expect(options.sourcePlatform).toBe('claude');
        expect(options.targetPlatforms).toEqual(['gemini', 'opencode', 'codex', 'openclaw', 'antigravity']);
        expect(options.outputDir).toBe(resolve(TEST_DIR));
        expect(options.dryRun).toBe(false);
        expect(options.verbose).toBe(false);
    });

    it('should parse CLI args with explicit targets and flags', () => {
        const sourcePath = join(TEST_DIR, 'agent.md');
        const outputDir = join(TEST_DIR, 'out');
        const options = parseCliArgs([
            sourcePath,
            'claude',
            'gemini,codex',
            '--output',
            outputDir,
            '--dry-run',
            '--verbose',
        ]);

        expect(options.targetPlatforms).toEqual(['gemini', 'codex']);
        expect(options.outputDir).toBe(resolve(outputDir));
        expect(options.dryRun).toBe(true);
        expect(options.verbose).toBe(true);
    });

    it('should exit on help', () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();

        try {
            expect(() => parseCliArgs(['--help'])).toThrow('exit');
            expect(exitMock.getCode()).toBe(0);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });

    it('should exit when required CLI args are missing', () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();

        try {
            expect(() => parseCliArgs([])).toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });

    it('should validate options successfully for a real source file', () => {
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');

        expect(() =>
            validateOptions({
                sourcePath,
                sourcePlatform: 'claude',
                targetPlatforms: ['codex'],
                outputDir: TEST_DIR,
                dryRun: true,
                verbose: false,
            }),
        ).not.toThrow();
    });

    it('should exit when validation finds an invalid source path', () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();

        try {
            expect(() =>
                validateOptions({
                    sourcePath: join(TEST_DIR, 'missing.md'),
                    sourcePlatform: 'claude',
                    targetPlatforms: ['codex'],
                    outputDir: TEST_DIR,
                    dryRun: true,
                    verbose: false,
                }),
            ).toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });

    it('should exit when validation finds an invalid source platform', () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');

        try {
            expect(() =>
                validateOptions({
                    sourcePath,
                    sourcePlatform: 'antigravity',
                    targetPlatforms: ['codex'],
                    outputDir: TEST_DIR,
                    dryRun: true,
                    verbose: false,
                }),
            ).toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });

    it('should exit when validation finds an invalid target platform', () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');

        try {
            expect(() =>
                validateOptions({
                    sourcePath,
                    sourcePlatform: 'claude',
                    targetPlatforms: ['invalid' as never],
                    outputDir: TEST_DIR,
                    dryRun: true,
                    verbose: false,
                }),
            ).toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });

    it('should return parse errors from adaptAgent', async () => {
        const content = readFileSync(resolve(FIXTURES_DIR, 'invalid-frontmatter.md'), 'utf-8');
        const result = await adaptAgent(content, 'invalid-frontmatter.md', 'claude', 'codex', TEST_DIR);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.agentName).toBe('');
    });

    it('should fail validation in adaptAgent when parsed agent body is empty', async () => {
        const content = `name = "empty-body-agent"
description = "Agent without developer instructions"
`;
        const result = await adaptAgent(content, 'empty-body-agent.toml', 'codex', 'claude', TEST_DIR);

        expect(result.success).toBe(false);
        expect(result.agentName).toBe('empty-body-agent');
        expect(result.errors).toContain('Agent body (system prompt) is required');
    });

    it('should adapt a valid agent and report dropped fields', async () => {
        const content = readFileSync(resolve(FIXTURES_DIR, 'minimal-agent.md'), 'utf-8');
        const result = await adaptAgent(content, 'minimal-agent.md', 'claude', 'codex', TEST_DIR);

        expect(result.success).toBe(true);
        expect(result.agentName).toBe('quick-helper');
        expect(result.outputFiles.some((file) => file.endsWith('quick-helper.toml'))).toBe(true);
        expect(result.files).toBeDefined();
        expect(result.droppedFields.length).toBeGreaterThan(0);
        expect(result.warnings.some((warning) => warning.startsWith('[info]'))).toBe(true);
    });

    it('should adapt to all targets, skip the source platform, and write output files', async () => {
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');
        const outputDir = join(TEST_DIR, 'adapted');
        const results = await adaptToAll(sourcePath, 'claude', ['claude', 'codex'], outputDir, false, true);

        expect(results).toHaveLength(1);
        expect(results[0]?.targetPlatform).toBe('codex');
        expect(existsSync(join(outputDir, 'quick-helper.toml'))).toBe(true);
    });

    it('should print results for both success and failure cases', () => {
        const restoreConsole = muteConsole();

        try {
            expect(() =>
                printResults(
                    [
                        {
                            sourcePlatform: 'claude',
                            targetPlatform: 'codex',
                            agentName: 'quick-helper',
                            success: true,
                            outputFiles: ['quick-helper.toml'],
                            droppedFields: ['color'],
                            errors: [],
                            warnings: ['warning'],
                        },
                        {
                            sourcePlatform: 'claude',
                            targetPlatform: 'gemini',
                            agentName: 'quick-helper',
                            success: false,
                            outputFiles: [],
                            droppedFields: [],
                            errors: ['parse failed'],
                            warnings: [],
                        },
                    ],
                    true,
                ),
            ).not.toThrow();
        } finally {
            restoreConsole();
        }
    });

    it('should run main successfully in dry-run mode', async () => {
        const restoreConsole = muteConsole();

        try {
            await main([resolve(FIXTURES_DIR, 'minimal-agent.md'), 'claude', 'codex', '--dry-run']);
        } finally {
            restoreConsole();
        }
    });

    it('should exit from main when adaptation fails', async () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();

        try {
            await expect(
                main([resolve(FIXTURES_DIR, 'invalid-frontmatter.md'), 'claude', 'codex', '--dry-run']),
            ).rejects.toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });
});
