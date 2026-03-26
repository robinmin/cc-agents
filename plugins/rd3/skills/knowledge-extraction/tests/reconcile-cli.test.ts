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
import { setGlobalSilent } from '../../../scripts/logger';
import {
    executeReconcileCli,
    getConflictPriority,
    getReconcileHelpLines,
    readTextFromStream,
    resolveConflict,
    runReconcileCli,
} from '../scripts/reconcile';
import type { Conflict } from '../scripts/types';

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
    test('executeReconcileCli returns help lines without reading stdin', async () => {
        const result = await executeReconcileCli(['--help'], async () => {
            throw new Error('stdin should not be read');
        });

        expect(result).toEqual({
            exitCode: 0,
            stdout: getReconcileHelpLines(),
            stderr: [],
        });
    });

    test('readTextFromStream concatenates stdin chunks', async () => {
        async function* chunks(): AsyncGenerator<Uint8Array> {
            yield new TextEncoder().encode('[{"name":"a",');
            yield new TextEncoder().encode('"path":"doc.md",');
            yield new TextEncoder().encode('"content":"# Doc"}]');
        }

        expect(await readTextFromStream(chunks())).toBe('[{"name":"a","path":"doc.md","content":"# Doc"}]');
    });

    test('executeReconcileCli returns JSON summary without merged content', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool.' },
        ]);

        const result = await executeReconcileCli(['--json', '--summary'], async () => sources);

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toEqual([]);
        const parsed = JSON.parse(result.stdout[0] ?? '{}');
        expect(parsed).not.toHaveProperty('mergedContent');
        expect(parsed).toHaveProperty('conflictsSummary');
    });

    test('executeReconcileCli reports invalid stdin JSON', async () => {
        const result = await executeReconcileCli([], async () => 'not valid json');

        expect(result).toEqual({
            exitCode: 1,
            stdout: [],
            stderr: ['Failed to parse stdin as JSON'],
        });
    });

    test('executeReconcileCli returns text summary with merged content by default', async () => {
        const sources = JSON.stringify([
            { name: 'a', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool A.' },
            { name: 'b', path: 'SKILL.md', content: '# Skill\n\n## Usage\n\nUse tool B.' },
        ]);

        const result = await executeReconcileCli([], async () => sources);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('=== Reconciliation Result ===');
        expect(result.stdout).toContain('=== Merged Content ===');
        expect(result.warnings).toBeDefined();
    });

    test('resolveConflict merges preamble-only file content', () => {
        const conflict: Conflict = {
            id: 'conflict-1',
            type: 'file',
            location: 'notes.md',
            filePath: 'notes.md',
            sources: ['a', 'b'],
            snippets: {
                a: 'Intro paragraph from A.',
                b: 'Intro paragraph from B.',
            },
            resolution: '',
            attribution: {},
        };

        const result = resolveConflict(conflict);

        expect(result.resolved).toContain('Intro paragraph from A.');
        expect(result.resolved).toContain('Intro paragraph from B.');
        expect(result.attribution.a).toBe('Contributed preamble content');
    });

    test('resolveConflict handles section, paragraph, line, and fallback conflicts', () => {
        const section = resolveConflict({
            id: 'conflict-1',
            type: 'section',
            location: '## Usage',
            filePath: 'SKILL.md',
            sources: ['a', 'b'],
            snippets: {
                a: 'Paragraph A.\n\nShared paragraph.',
                b: 'Paragraph B.\n\nShared paragraph.',
            },
            resolution: '',
            attribution: {},
        });
        expect(section.resolved).toContain('Paragraph A.');
        expect(section.resolved).toContain('Paragraph B.');
        expect(section.resolution).toContain('unique paragraphs');

        const paragraph = resolveConflict({
            id: 'conflict-2',
            type: 'paragraph',
            location: 'Usage:para-0',
            filePath: 'SKILL.md',
            sources: ['a', 'b'],
            snippets: {
                a: 'Line one.\nLine two from A.',
                b: 'Line one.\nLine two from B.',
            },
            resolution: '',
            attribution: {},
        });
        expect(paragraph.resolved).toContain('Line two from A.');
        expect(paragraph.resolved).toContain('Line two from B.');

        const line = resolveConflict({
            id: 'conflict-3',
            type: 'line',
            location: 'Usage:para-0:line-2',
            filePath: 'SKILL.md',
            sources: ['a', 'b'],
            snippets: {
                a: 'Variant from A',
                b: 'Variant from B',
            },
            resolution: '',
            attribution: {},
        });
        expect(line.resolved).toContain('Variant from A');
        expect(line.attribution.a).toContain('Contributed line');

        const fallback = resolveConflict({
            id: 'conflict-4',
            type: 'unknown' as Conflict['type'],
            location: 'notes.md',
            filePath: 'notes.md',
            sources: ['a', 'b'],
            snippets: {
                a: 'Alpha',
                b: 'Beta',
            },
            resolution: '',
            attribution: {},
        });
        expect(fallback.resolution).toContain('Fallback');
        expect(fallback.resolved).toBe('Alpha\n\nBeta');
    });

    test('getConflictPriority ranks known types and falls back to zero', () => {
        expect(getConflictPriority('file')).toBeGreaterThan(getConflictPriority('section'));
        expect(getConflictPriority('section')).toBeGreaterThan(getConflictPriority('paragraph'));
        expect(getConflictPriority('paragraph')).toBeGreaterThan(getConflictPriority('line'));
        expect(getConflictPriority('unknown')).toBe(0);
    });

    test('runReconcileCli executes warning and error paths', async () => {
        setGlobalSilent(true);
        try {
            const lowQualitySources = JSON.stringify([
                {
                    name: 'a',
                    path: 'SKILL.md',
                    content: '# Skill\n\nThis source describes database migrations, indexes, and SQL join strategies.',
                },
                {
                    name: 'b',
                    path: 'SKILL.md',
                    content: '# Skill\n\nThis source describes CSS animations, layout primitives, and component props.',
                },
            ]);

            const successExit = await runReconcileCli([], async () => lowQualitySources);
            const errorExit = await runReconcileCli(['--sources=not-json'], async () => '');

            expect(successExit).toBe(0);
            expect(errorExit).toBe(1);
        } finally {
            setGlobalSilent(false);
        }
    });

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
