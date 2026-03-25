import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectSourcePlatform, installAgent, main, parseCliArgs } from '../scripts/install';

const TEST_DIR = '/tmp/cc-agents-install-test';
const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTALL_SCRIPT = join(__dirname, '..', 'scripts', 'install.ts');
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

    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.error = () => {};

    return () => {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
        console.error = originalError;
    };
}

describe('install.ts', () => {
    beforeEach(() => {
        rmSync(TEST_DIR, { recursive: true, force: true });
        mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(TEST_DIR)) {
            rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should detect generated OpenClaw JSON as openclaw', () => {
        const filePath = join(TEST_DIR, 'sample-openclaw.json');
        writeFileSync(
            filePath,
            JSON.stringify({
                name: 'sample-agent',
                description: 'Sample OpenClaw agent',
                instructions: 'Be helpful',
                runTimeoutSeconds: 60,
            }),
            'utf-8',
        );

        expect(detectSourcePlatform(filePath)).toBe('openclaw');
    });

    it('should detect platform types across supported file formats', () => {
        const codexPath = join(TEST_DIR, 'sample.toml');
        writeFileSync(codexPath, 'name = "codex-agent"\ndescription = "Codex agent"\n', 'utf-8');

        const opencodeJsonPath = join(TEST_DIR, 'sample-opencode.json');
        writeFileSync(
            opencodeJsonPath,
            JSON.stringify({
                description: 'OpenCode agent',
                prompt: 'Be helpful',
                steps: 3,
            }),
            'utf-8',
        );

        const geminiPath = join(TEST_DIR, 'sample-gemini.md');
        writeFileSync(
            geminiPath,
            `---
name: gemini-agent
description: Gemini agent
kind: local
max_turns: 5
---

Body`,
            'utf-8',
        );

        const opencodeMdPath = join(TEST_DIR, 'sample-opencode.md');
        writeFileSync(
            opencodeMdPath,
            `---
name: opencode-agent
description: OpenCode agent
steps: 3
hidden: true
---

Body`,
            'utf-8',
        );

        const claudePath = join(TEST_DIR, 'sample-claude.md');
        writeFileSync(
            claudePath,
            `---
name: claude-agent
description: Claude agent
---

Body`,
            'utf-8',
        );

        const fallbackPath = join(TEST_DIR, 'sample.unknown');
        writeFileSync(fallbackPath, 'unknown', 'utf-8');

        expect(detectSourcePlatform(codexPath)).toBe('codex');
        expect(detectSourcePlatform(opencodeJsonPath)).toBe('opencode');
        expect(detectSourcePlatform(geminiPath)).toBe('gemini');
        expect(detectSourcePlatform(opencodeMdPath)).toBe('opencode');
        expect(detectSourcePlatform(claudePath)).toBe('claude');
        expect(detectSourcePlatform(fallbackPath)).toBe('claude');
    });

    it('should parse CLI args for a directory of agent sources', () => {
        const agentsDir = join(TEST_DIR, 'agents');
        mkdirSync(agentsDir, { recursive: true });
        writeFileSync(join(agentsDir, 'one.md'), '---\nname: one\ndescription: one\n---\n\nBody', 'utf-8');
        writeFileSync(join(agentsDir, 'two.toml'), 'name = "two"\ndescription = "two"\n', 'utf-8');

        const options = parseCliArgs([agentsDir, '--target', 'codex', '--global', '--dry-run', '--verbose']);

        expect(options.sources).toHaveLength(2);
        expect(options.targetPlatform).toBe('codex');
        expect(options.global).toBe(true);
        expect(options.dryRun).toBe(true);
        expect(options.verbose).toBe(true);
    });

    it('should exit on help and CLI validation errors', () => {
        const restoreConsole = muteConsole();

        try {
            let exitMock = mockExit();
            try {
                expect(() => parseCliArgs(['--help'])).toThrow('exit');
                expect(exitMock.getCode()).toBe(0);
            } finally {
                exitMock.restore();
            }

            exitMock = mockExit();
            try {
                expect(() => parseCliArgs([])).toThrow('exit');
                expect(exitMock.getCode()).toBe(1);
            } finally {
                exitMock.restore();
            }

            exitMock = mockExit();
            try {
                expect(() => parseCliArgs([TEST_DIR])).toThrow('exit');
                expect(exitMock.getCode()).toBe(1);
            } finally {
                exitMock.restore();
            }

            exitMock = mockExit();
            try {
                expect(() => parseCliArgs([TEST_DIR, '--target', 'invalid'])).toThrow('exit');
                expect(exitMock.getCode()).toBe(1);
            } finally {
                exitMock.restore();
            }

            exitMock = mockExit();
            try {
                expect(() => parseCliArgs([join(TEST_DIR, 'missing.md'), '--target', 'codex'])).toThrow('exit');
                expect(exitMock.getCode()).toBe(1);
            } finally {
                exitMock.restore();
            }
        } finally {
            restoreConsole();
        }
    });

    it('should auto-install OpenClaw JSON without requiring --source-platform', async () => {
        const filePath = join(TEST_DIR, 'sample-openclaw.json');
        writeFileSync(
            filePath,
            JSON.stringify({
                name: 'sample-agent',
                description: 'Sample OpenClaw agent',
                instructions: 'Be helpful',
                runTimeoutSeconds: 60,
            }),
            'utf-8',
        );

        const proc = Bun.spawn(['bun', 'run', INSTALL_SCRIPT, filePath, '--target', 'codex', '--dry-run'], {
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout, stderr] = await Promise.all([
            proc.exited,
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);

        const output = stdout + stderr;
        expect(exitCode).toBe(0);
        expect(output).toContain('[WOULD INSTALL]');
        expect(output).toContain('sample-agent.toml');
    });

    it('should fail gracefully when source path is missing', async () => {
        const missingPath = join(TEST_DIR, 'missing-agent.json');

        const proc = Bun.spawn(['bun', 'run', INSTALL_SCRIPT, missingPath, '--target', 'codex'], {
            env: {
                ...process.env,
                RD3_LOG_QUIET: '0',
            },
            stdout: 'pipe',
            stderr: 'pipe',
        });

        const [exitCode, stdout, stderr] = await Promise.all([
            proc.exited,
            new Response(proc.stdout).text(),
            new Response(proc.stderr).text(),
        ]);

        const output = stdout + stderr;
        expect(exitCode).toBe(1);
        expect(output).toContain(`Source not found: ${missingPath}`);
        expect(output).not.toContain('ENOENT');
    });

    it('should dry-run install when source and target platforms match', async () => {
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');
        const result = await installAgent(sourcePath, 'claude', join(TEST_DIR, 'install-dir'), undefined, true);

        expect(result.success).toBe(true);
        expect(result.agentName).toBe('minimal-agent');
        expect(result.installedPath).toContain('minimal-agent.md');
        expect(existsSync(result.installedPath)).toBe(false);
    });

    it('should copy source file when source and target platforms match', async () => {
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');
        const installDir = join(TEST_DIR, 'same-platform');
        const result = await installAgent(sourcePath, 'claude', installDir, undefined, false);

        expect(result.success).toBe(true);
        expect(existsSync(result.installedPath)).toBe(true);
        expect(readFileSync(result.installedPath, 'utf-8')).toContain('quick-helper');
    });

    it('should cross-install between platforms in dry-run mode', async () => {
        const filePath = join(TEST_DIR, 'sample-openclaw.json');
        writeFileSync(
            filePath,
            JSON.stringify({
                name: 'sample-agent',
                description: 'Sample OpenClaw agent',
                instructions: 'Be helpful',
                runTimeoutSeconds: 60,
            }),
            'utf-8',
        );

        const result = await installAgent(filePath, 'codex', join(TEST_DIR, 'codex-install'), undefined, true);

        expect(result.success).toBe(true);
        expect(result.installedPath).toContain('sample-agent.toml');
        expect(existsSync(result.installedPath)).toBe(false);
    });

    it('should cross-install between platforms and write generated files', async () => {
        const sourcePath = resolve(FIXTURES_DIR, 'minimal-agent.md');
        const installDir = join(TEST_DIR, 'codex-install');
        const result = await installAgent(sourcePath, 'codex', installDir, undefined, false);

        expect(result.success).toBe(true);
        expect(existsSync(result.installedPath)).toBe(true);
        expect(readFileSync(result.installedPath, 'utf-8')).toContain('name = "quick-helper"');
    });

    it('should surface adaptation errors from installAgent', async () => {
        const sourcePath = resolve(FIXTURES_DIR, 'invalid-frontmatter.md');
        const result = await installAgent(sourcePath, 'codex', join(TEST_DIR, 'bad-install'), undefined, true);

        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should run main successfully for a dry-run installation', async () => {
        const restoreConsole = muteConsole();

        try {
            await main([resolve(FIXTURES_DIR, 'minimal-agent.md'), '--target', 'codex', '--dry-run']);
        } finally {
            restoreConsole();
        }
    });

    it('should exit from main when installation fails', async () => {
        const restoreConsole = muteConsole();
        const exitMock = mockExit();

        try {
            await expect(
                main([resolve(FIXTURES_DIR, 'invalid-frontmatter.md'), '--target', 'codex', '--dry-run']),
            ).rejects.toThrow('exit');
            expect(exitMock.getCode()).toBe(1);
        } finally {
            restoreConsole();
            exitMock.restore();
        }
    });
});
