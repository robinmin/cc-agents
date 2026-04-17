import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import {
    detectStack,
    validateTasksInfra,
    validateStackFiles,
    validateRequiredScripts,
    generateReport,
    formatReport,
    runDevInit,
    parseArgs,
    type StackType,
} from '../scripts/init';

beforeAll(() => {
    setGlobalSilent(true);
});

// Ensure template files exist for runInit (which copies from CLAUDE_PLUGIN_ROOT)
const pluginRoot = resolve(import.meta.dir, '../../../../..');
process.env.CLAUDE_PLUGIN_ROOT = pluginRoot;

function makeTempDir(): string {
    return mkdtempSync(join(tmpdir(), 'init-test-'));
}

describe('detectStack', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('detects typescript-bun-biome', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'package.json'), '{}');
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        expect(detectStack(dir)).toBe('typescript-bun-biome');
    });

    test('detects python-uv-ruff', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'pyproject.toml'), '');
        writeFileSync(join(dir, 'ruff.toml'), '');
        expect(detectStack(dir)).toBe('python-uv-ruff');
    });

    test('detects go-mod', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'go.mod'), 'module example');
        expect(detectStack(dir)).toBe('go-mod');
    });

    test('returns unknown for empty dir', () => {
        dir = makeTempDir();
        expect(detectStack(dir)).toBe('unknown');
    });

    test('prefers typescript over python when both present', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'package.json'), '{}');
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        writeFileSync(join(dir, 'pyproject.toml'), '');
        writeFileSync(join(dir, 'ruff.toml'), '');
        expect(detectStack(dir)).toBe('typescript-bun-biome');
    });
});

describe('validateTasksInfra', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('all present after runInit', () => {
        dir = makeTempDir();
        mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
        writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
        writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
        const result = validateTasksInfra(dir);
        expect(result.ready).toBe(true);
        expect(result.checks).toHaveLength(3);
        expect(result.checks.every((c) => c.present)).toBe(true);
    });

    test('missing config.jsonc', () => {
        dir = makeTempDir();
        mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
        writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
        const result = validateTasksInfra(dir);
        expect(result.ready).toBe(false);
        expect(result.checks.find((c) => c.name.includes('config'))?.present).toBe(false);
    });
});

describe('validateStackFiles', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('all typescript files present', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'package.json'), '{}');
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const result = validateStackFiles(dir, 'typescript-bun-biome');
        expect(result.ready).toBe(true);
        expect(result.checks).toHaveLength(3);
    });

    test('missing tsconfig.json', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'package.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const result = validateStackFiles(dir, 'typescript-bun-biome');
        expect(result.ready).toBe(false);
        expect(result.checks.find((c) => c.name === 'tsconfig.json')?.present).toBe(false);
    });

    test('unknown stack always not ready', () => {
        dir = makeTempDir();
        const result = validateStackFiles(dir, 'unknown');
        expect(result.ready).toBe(false);
    });
});

describe('validateRequiredScripts', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('all required scripts present', () => {
        dir = makeTempDir();
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({ scripts: { typecheck: 'tsc', lint: 'biome lint', test: 'bun test' } }),
        );
        const result = validateRequiredScripts(dir, 'typescript-bun-biome');
        expect(result.ready).toBe(true);
        expect(result.checks).toHaveLength(3);
    });

    test('missing test script', () => {
        dir = makeTempDir();
        writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts: { typecheck: 'tsc', lint: 'biome lint' } }));
        const result = validateRequiredScripts(dir, 'typescript-bun-biome');
        expect(result.ready).toBe(false);
        expect(result.checks.find((c) => c.name.includes('test'))?.present).toBe(false);
    });

    test('lint:rd3 variant satisfies lint check', () => {
        dir = makeTempDir();
        writeFileSync(
            join(dir, 'package.json'),
            JSON.stringify({
                scripts: { typecheck: 'tsc', 'lint:rd3': 'biome lint plugins', 'test:rd3': 'bun test' },
            }),
        );
        const result = validateRequiredScripts(dir, 'typescript-bun-biome');
        expect(result.ready).toBe(true);
    });

    test('unknown stack skips script checks', () => {
        dir = makeTempDir();
        const result = validateRequiredScripts(dir, 'unknown');
        expect(result.ready).toBe(true);
        expect(result.checks).toHaveLength(0);
    });
});

describe('generateReport', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('fully ready typescript project', () => {
        dir = makeTempDir();
        mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
        writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
        writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
        writeFileSync(
            join(dir, 'package.json'),
            '{"scripts":{"typecheck":"tsc","lint":"biome lint","test":"bun test"}}',
        );
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const report = generateReport(dir);
        expect(report.stack).toBe('typescript-bun-biome');
        expect(report.overall).toBe(true);
    });

    test('partially ready — missing scripts', () => {
        dir = makeTempDir();
        mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
        writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
        writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
        writeFileSync(join(dir, 'package.json'), '{"scripts":{"typecheck":"tsc"}}');
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const report = generateReport(dir);
        expect(report.stack).toBe('typescript-bun-biome');
        expect(report.overall).toBe(false);
        expect(report.requiredScripts.ready).toBe(false);
    });
});

describe('runDevInit', () => {
    let dir: string;

    afterEach(() => {
        if (dir) rmSync(dir, { recursive: true, force: true });
    });

    test('returns Ok and creates task infrastructure', () => {
        dir = makeTempDir();
        // Stack files so detectStack finds something
        writeFileSync(
            join(dir, 'package.json'),
            '{"scripts":{"typecheck":"tsc","lint":"biome lint","test":"bun test"}}',
        );
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const result = runDevInit(dir);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.overall).toBe(true);
        }
        expect(existsSync(join(dir, 'docs', '.tasks', 'config.jsonc'))).toBe(true);
    });

    test('idempotent on second run', () => {
        dir = makeTempDir();
        writeFileSync(
            join(dir, 'package.json'),
            '{"scripts":{"typecheck":"tsc","lint":"biome lint","test":"bun test"}}',
        );
        writeFileSync(join(dir, 'tsconfig.json'), '{}');
        writeFileSync(join(dir, 'biome.json'), '{}');
        const first = runDevInit(dir);
        const second = runDevInit(dir);
        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        if (first.ok && second.ok) {
            expect(first.value.overall).toBe(second.value.overall);
        }
    });

    test('stack override works', () => {
        dir = makeTempDir();
        mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
        mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
        writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
        writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
        // Force typescript stack even though files are missing
        const result = runDevInit(dir, 'typescript-bun-biome' as StackType);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.stack).toBe('typescript-bun-biome');
            expect(result.value.overall).toBe(false);
        }
    });
});

describe('formatReport', () => {
    test('formats ready report with all sections', () => {
        const report: import('../scripts/init').ReadinessReport = {
            projectRoot: '/tmp/test',
            stack: 'typescript-bun-biome',
            tasksInfra: {
                ready: true,
                checks: [
                    { name: 'config.jsonc', present: true, detail: 'found' },
                    { name: 'task.md', present: true, detail: 'found' },
                ],
            },
            stackFiles: {
                ready: true,
                checks: [{ name: 'package.json', present: true, detail: 'found' }],
            },
            requiredScripts: {
                ready: true,
                checks: [{ name: 'typecheck', present: true, detail: 'found: typecheck' }],
            },
            overall: true,
        };
        const output = formatReport(report);
        expect(output).toContain('Overall: READY');
        expect(output).toContain('[OK] config.jsonc');
        expect(output).toContain('[OK] package.json');
        expect(output).toContain('[OK] typecheck');
        expect(output).toContain('Task Infrastructure:');
        expect(output).toContain('Stack Configuration:');
        expect(output).toContain('Required Scripts:');
    });

    test('formats not-ready report with issues count', () => {
        const report: import('../scripts/init').ReadinessReport = {
            projectRoot: '/tmp/test',
            stack: 'typescript-bun-biome',
            tasksInfra: {
                ready: true,
                checks: [{ name: 'config', present: true, detail: 'found' }],
            },
            stackFiles: {
                ready: false,
                checks: [
                    { name: 'package.json', present: true, detail: 'found' },
                    { name: 'tsconfig.json', present: false, detail: 'missing' },
                ],
            },
            requiredScripts: {
                ready: false,
                checks: [{ name: 'typecheck', present: false, detail: 'not found' }],
            },
            overall: false,
        };
        const output = formatReport(report);
        expect(output).toContain('NOT READY (2 issues)');
        expect(output).toContain('[X] tsconfig.json');
        expect(output).toContain('[X] typecheck');
    });

    test('formats unknown stack', () => {
        const report: import('../scripts/init').ReadinessReport = {
            projectRoot: '/tmp/test',
            stack: 'unknown',
            tasksInfra: {
                ready: true,
                checks: [{ name: 'config', present: true, detail: 'found' }],
            },
            stackFiles: {
                ready: false,
                checks: [{ name: 'Unknown stack', present: false, detail: 'No recognized project files found' }],
            },
            requiredScripts: { ready: true, checks: [] },
            overall: false,
        };
        const output = formatReport(report);
        expect(output).toContain('not recognized');
    });

    test('omits Required Scripts section when no script checks', () => {
        const report: import('../scripts/init').ReadinessReport = {
            projectRoot: '/tmp/test',
            stack: 'go-mod',
            tasksInfra: {
                ready: true,
                checks: [{ name: 'config', present: true, detail: 'found' }],
            },
            stackFiles: {
                ready: true,
                checks: [{ name: 'go.mod', present: true, detail: 'found' }],
            },
            requiredScripts: { ready: true, checks: [] },
            overall: true,
        };
        const output = formatReport(report);
        expect(output).not.toContain('Required Scripts:');
        expect(output).toContain('Overall: READY');
    });
});

describe('parseArgs', () => {
    test('no args returns json false', () => {
        const result = parseArgs([]);
        expect(result.json).toBe(false);
        expect(result.stack).toBeUndefined();
    });

    test('--json flag', () => {
        const result = parseArgs(['--json']);
        expect(result.json).toBe(true);
        expect(result.stack).toBeUndefined();
    });

    test('--stack=value format', () => {
        const result = parseArgs(['--stack=typescript-bun-biome']);
        expect(result.stack).toBe('typescript-bun-biome');
        expect(result.json).toBe(false);
    });

    test('--stack value format', () => {
        const result = parseArgs(['--stack', 'go-mod']);
        expect(result.stack).toBe('go-mod');
    });

    test('--stack and --json combined', () => {
        const result = parseArgs(['--json', '--stack=python-uv-ruff']);
        expect(result.json).toBe(true);
        expect(result.stack).toBe('python-uv-ruff');
    });

    test('--stack at end without value returns no stack', () => {
        const result = parseArgs(['--stack']);
        expect(result.stack).toBeUndefined();
    });
});

describe('CLI entry point (import.meta.main)', () => {
    const scriptPath = resolve(import.meta.dir, '../scripts/init.ts');

    test('--json outputs valid JSON and exits 0 for ready project', () => {
        const dir = makeTempDir();
        try {
            mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
            mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
            mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
            writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
            writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
            writeFileSync(
                join(dir, 'package.json'),
                '{"scripts":{"typecheck":"tsc","lint":"biome lint","test":"bun test"}}',
            );
            writeFileSync(join(dir, 'tsconfig.json'), '{}');
            writeFileSync(join(dir, 'biome.json'), '{}');

            const result = spawnSync('bun', [scriptPath, '--json'], {
                cwd: dir,
                encoding: 'utf-8',
                timeout: 10000,
            });
            expect(result.status).toBe(0);
            const parsed = JSON.parse(result.stdout);
            expect(parsed.overall).toBe(true);
            expect(parsed.stack).toBe('typescript-bun-biome');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('--json exits 1 for not-ready project', () => {
        const dir = makeTempDir();
        try {
            const result = spawnSync('bun', [scriptPath, '--json'], {
                cwd: dir,
                encoding: 'utf-8',
                timeout: 10000,
            });
            expect(result.status).toBe(1);
            const parsed = JSON.parse(result.stdout);
            expect(parsed.overall).toBe(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    test('text mode outputs human-readable report', () => {
        const dir = makeTempDir();
        try {
            mkdirSync(join(dir, 'docs', '.tasks'), { recursive: true });
            mkdirSync(join(dir, 'docs', 'tasks'), { recursive: true });
            mkdirSync(join(dir, 'docs', 'prompts'), { recursive: true });
            writeFileSync(join(dir, 'docs', '.tasks', 'config.jsonc'), '{}');
            writeFileSync(join(dir, 'docs', '.tasks', 'task.md'), '# template');
            writeFileSync(
                join(dir, 'package.json'),
                '{"scripts":{"typecheck":"tsc","lint":"biome lint","test":"bun test"}}',
            );
            writeFileSync(join(dir, 'tsconfig.json'), '{}');
            writeFileSync(join(dir, 'biome.json'), '{}');

            const result = spawnSync('bun', [scriptPath], {
                cwd: dir,
                encoding: 'utf-8',
                timeout: 10000,
            });
            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Overall: READY');
            expect(result.stdout).toContain('Task Infrastructure:');
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
