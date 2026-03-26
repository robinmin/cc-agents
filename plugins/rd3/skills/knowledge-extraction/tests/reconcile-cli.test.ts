#!/usr/bin/env bun
/**
 * reconcile-cli.test.ts
 *
 * Integration tests for reconcile.ts CLI.
 * Covers lines 391-489 (showHelp, readStdin, main).
 */

import { describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SCRIPT_PATH = resolve(__dirname, '../scripts/reconcile.ts');

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

        if (stdin !== undefined) {
            proc.stdin?.write(stdin);
        }
        proc.stdin?.end();
    });
}

describe('reconcile CLI', () => {
    test('--help shows usage and exits with 0', async () => {
        const result = await runCli(['--help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: reconcile.ts');
        expect(result.stdout).toContain('--help');
        expect(result.stdout).toContain('--json');
        expect(result.stdout).toContain('--sources');
        expect(result.stdout).toContain('--summary');
    });

    test('-h shows usage and exits with 0', async () => {
        const result = await runCli(['-h']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Usage: reconcile.ts');
    });

    test('--json with sources outputs full JSON', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        const parsed = JSON.parse(result.stdout);
        expect(parsed).toHaveProperty('mergedContent');
        expect(parsed).toHaveProperty('qualityScore');
        expect(parsed).toHaveProperty('conflictManifest');
        expect(parsed).toHaveProperty('sourceAttributions');
    });

    test('--json --summary outputs summary only', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool.' },
        ]);

        const result = await runCli(['--json', '--summary', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        // Summary should NOT have mergedContent
        expect(parsed).not.toHaveProperty('mergedContent');
        expect(parsed).toHaveProperty('qualityScore');
        expect(parsed).toHaveProperty('sourceAttributions');
    });

    test('piping JSON via stdin outputs reconciliation summary', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A with specific configuration.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B with different configuration.' },
        ]);

        const result = await runCli([], sources);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('=== Reconciliation Result ===');
        expect(result.stdout).toContain('Quality Score:');
        expect(result.stdout).toContain('Deterministic:');
        expect(result.stdout).toContain('Conflicts detected:');
    });

    test('no sources produces error and exit code 1', async () => {
        const result = await runCli([], '');

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

    test('empty sources array produces error', async () => {
        const result = await runCli(['--sources=[]']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('No sources provided');
    });

    test('--summary shows only summary without merged content', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Overview\n\nContent A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Overview\n\nContent B.' },
        ]);

        const result = await runCli(['--summary', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('=== Reconciliation Result ===');
        expect(result.stdout).not.toContain('=== Merged Content ===');
    });

    test('identical sources shows zero conflicts', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse the tool.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse the tool.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        expect(parsed.conflictManifest.summary.totalConflicts).toBe(0);
    });

    test('shows warnings for low quality merges', async () => {
        // Very different sources that barely overlap
        const sources = JSON.stringify([
            {
                name: 'a',
                path: 'SKILL.md',
                content:
                    '# Skill\n\nThis is a completely different skill for managing databases with SQL queries and table operations.',
            },
            {
                name: 'b',
                path: 'SKILL.md',
                content:
                    '# Skill\n\nAn entirely separate skill for building web interfaces using React components and CSS styling.',
            },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        // Low quality should trigger warning
        expect(parsed.warnings).toBeDefined();
    });

    test('--json shows all conflict types in output', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Overview\n\nPara 1 same.\n\nPara 2 from A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Overview\n\nPara 1 same.\n\nPara 2 from B.' },
        ]);

        const result = await runCli(['--json', `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout);
        // JSON output contains all conflict types
        expect(parsed.conflictManifest.summary.totalConflicts).toBe(4);
        expect(parsed.conflictManifest.summary.fileLevelConflicts).toBe(1);
        expect(parsed.conflictManifest.summary.sectionLevelConflicts).toBe(1);
        expect(parsed.conflictManifest.summary.paragraphLevelConflicts).toBe(1);
        expect(parsed.conflictManifest.summary.lineLevelConflicts).toBe(1);
    });
});
