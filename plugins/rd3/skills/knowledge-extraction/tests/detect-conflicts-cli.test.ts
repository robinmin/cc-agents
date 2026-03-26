#!/usr/bin/env bun
/**
 * detect-conflicts-cli.test.ts
 *
 * Integration tests for detect-conflicts.ts CLI.
 * Covers lines 388-455 (showHelp, readStdin, main).
 */

import { describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SCRIPT_PATH = resolve(__dirname, '../scripts/detect-conflicts.ts');

function runCli(args: string[], stdin?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
        const proc = spawn('bun', [SCRIPT_PATH, ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
        });

        proc.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code ?? 0 });
        });

        proc.on('error', (err) => {
            resolve({ stdout, stderr: err.message, exitCode: 1 });
        });

        // Write stdin and close immediately
        if (stdin !== undefined) {
            proc.stdin?.write(stdin);
        }
        proc.stdin?.end();
    });
}

describe('detect-conflicts CLI', () => {
    test('--help shows usage and exits with 0', async () => {
        const result = await runCli(['--help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: detect-conflicts.ts');
        expect(result.stdout).toContain('--help');
        expect(result.stdout).toContain('--json');
        expect(result.stdout).toContain('--sources');
    });

    test('-h shows usage and exits with 0', async () => {
        const result = await runCli(['-h']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: detect-conflicts.ts');
    });

    test('--json with sources outputs JSON', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        const manifest = JSON.parse(result.stdout);
        expect(manifest).toHaveProperty('conflicts');
        expect(manifest).toHaveProperty('conflictsByFile');
        expect(manifest).toHaveProperty('summary');
    });

    test('piping JSON via stdin outputs summary', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await runCli([], sources);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Detected');
        expect(result.stdout).toContain('conflict(s)');
        expect(result.stdout).toContain('File-level:');
        expect(result.stdout).toContain('Section-level:');
    });

    test('no sources produces error and exit code 1', async () => {
        const result = await runCli([]);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('No sources provided');
    });

    test('invalid JSON in --sources produces error', async () => {
        const result = await runCli(['--sources=not-valid-json']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Failed to parse --sources JSON');
    });

    test('invalid JSON via stdin produces error', async () => {
        const result = await runCli([], 'not valid json {');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Failed to parse stdin as JSON');
    });

    test('empty stdin produces error', async () => {
        const result = await runCli([], '');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('No sources provided');
    });

    test('--json with identical sources shows zero conflicts', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse the tool.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse the tool.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const manifest = JSON.parse(result.stdout);
        expect(manifest.summary.totalConflicts).toBe(0);
    });

    test('--json with multiple sources shows correct summary', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\nContent A for testing.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\nContent B for testing.' },
            { name: 'c', path: 'SKILL.md', content: '# Skill\n\nContent C for testing.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const manifest = JSON.parse(result.stdout);
        expect(manifest.summary.sources).toContain('a');
        expect(manifest.summary.sources).toContain('b');
        expect(manifest.summary.sources).toContain('c');
    });
});
