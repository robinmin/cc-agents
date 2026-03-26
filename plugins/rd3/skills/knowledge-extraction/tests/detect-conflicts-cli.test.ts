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
import { setGlobalSilent } from '../../../scripts/logger';
import {
    executeDetectConflictsCli,
    getDetectConflictsHelpLines,
    readTextFromStream,
    runDetectConflictsCli,
} from '../scripts/detect-conflicts';

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
    test('executeDetectConflictsCli returns help lines without reading stdin', async () => {
        const result = await executeDetectConflictsCli(['--help'], async () => {
            throw new Error('stdin should not be read');
        });

        expect(result).toEqual({
            exitCode: 0,
            stdout: getDetectConflictsHelpLines(),
            stderr: [],
        });
    });

    test('readTextFromStream concatenates all stdin chunks', async () => {
        async function* chunks(): AsyncGenerator<Uint8Array> {
            yield new TextEncoder().encode('[{"name":"a",');
            yield new TextEncoder().encode('"path":"doc.md",');
            yield new TextEncoder().encode('"content":"hello"}]');
        }

        expect(await readTextFromStream(chunks())).toBe('[{"name":"a","path":"doc.md","content":"hello"}]');
    });

    test('executeDetectConflictsCli reads stdin and formats text output', async () => {
        const stdin = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await executeDetectConflictsCli([], async () => stdin);

        expect(result.exitCode).toBe(0);
        expect(result.stdout[0]).toContain('Detected');
        expect(result.stdout.some((line) => line.includes('[file]'))).toBe(true);
        expect(result.stderr).toEqual([]);
    });

    test('executeDetectConflictsCli reports missing sources with help text', async () => {
        const result = await executeDetectConflictsCli([], async () => '');

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toEqual(['No sources provided. Use --sources= or pipe JSON to stdin.']);
        expect(result.stdout).toEqual(getDetectConflictsHelpLines());
    });

    test('executeDetectConflictsCli reports invalid stdin JSON', async () => {
        const result = await executeDetectConflictsCli([], async () => 'not valid json');

        expect(result).toEqual({
            exitCode: 1,
            stdout: [],
            stderr: ['Failed to parse stdin as JSON'],
        });
    });

    test('executeDetectConflictsCli returns JSON when --json is used', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await executeDetectConflictsCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toEqual([]);
        expect(() => JSON.parse(result.stdout[0] ?? '')).not.toThrow();
    });

    test('runDetectConflictsCli executes success and error paths', async () => {
        setGlobalSilent(true);
        try {
            const successExit = await runDetectConflictsCli(
                [
                    '--json',
                    '--sources=[{"name":"a","path":"doc.md","content":"# A"},{"name":"b","path":"doc.md","content":"# B"}]',
                ],
                async () => '',
            );
            const errorExit = await runDetectConflictsCli(['--sources=not-json'], async () => '');

            expect(successExit).toBe(0);
            expect(errorExit).toBe(1);
        } finally {
            setGlobalSilent(false);
        }
    });

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
