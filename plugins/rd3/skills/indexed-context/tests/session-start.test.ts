import { afterEach, describe, expect, spyOn, test, type Mock } from 'bun:test';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import {
    buildSessionStartOutput,
    createOutput,
    extractAnatomySummary,
    extractProjectName,
    extractSection,
    formatList,
    main,
    readJson,
    readText,
} from '../scripts/session-start';

function createProject(): string {
    return mkdtempSync(join(tmpdir(), 'indexed-context-test-'));
}

function writeWolfFile(projectRoot: string, fileName: string, content: string) {
    const wolfDir = join(projectRoot, '.wolf');
    mkdirSync(wolfDir, { recursive: true });
    writeFileSync(join(wolfDir, fileName), content);
}

describe('session-start helpers', () => {
    const cleanupPaths: string[] = [];

    afterEach(() => {
        for (const path of cleanupPaths.splice(0)) {
            rmSync(path, { recursive: true, force: true });
        }
    });

    test('readText returns undefined for missing or unreadable paths', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);

        expect(readText(join(projectRoot, 'missing.md'))).toBeUndefined();
        expect(readText(projectRoot)).toBeUndefined();
    });

    test('readJson parses valid JSON and ignores invalid JSON', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);
        const validPath = join(projectRoot, 'valid.json');
        const invalidPath = join(projectRoot, 'invalid.json');

        writeFileSync(validPath, '{"ok":true}');
        writeFileSync(invalidPath, '{not-json');

        expect(readJson<{ ok: boolean }>(validPath)).toEqual({ ok: true });
        expect(readJson(invalidPath)).toBeUndefined();
        expect(readJson(join(projectRoot, 'missing.json'))).toBeUndefined();
    });

    test('extractSection returns matching bullets, stops at next heading, and honors limit', () => {
        const markdown = [
            '## Do-Not-Repeat',
            '',
            '- First',
            '- Second',
            '- Third',
            '## Key Learnings',
            '- Not included',
        ].join('\n');

        expect(extractSection(markdown, 'do-not-repeat', 2)).toEqual(['- First', '- Second']);
        expect(extractSection(markdown, 'Missing')).toEqual([]);
    });

    test('extractAnatomySummary parses header and falls back to unknown', () => {
        const anatomy = [
            '# anatomy.md',
            '> Auto-maintained by OpenWolf. Last scanned: 2026-04-28T10:00:00Z',
            '> Files: 47 tracked | Anatomy hits: 23 | Misses: 2',
        ].join('\n');

        expect(extractAnatomySummary(anatomy)).toEqual({
            files: '47',
            scanned: '2026-04-28T10:00:00Z',
        });
        expect(extractAnatomySummary(undefined)).toEqual({ files: 'unknown', scanned: 'unknown' });
        expect(extractAnatomySummary('no header')).toEqual({ files: 'unknown', scanned: 'unknown' });
    });

    test('extractProjectName prefers explicit project/name, then heading, then directory basename', () => {
        expect(extractProjectName('/tmp/fallback-project', 'Project: Explicit Project')).toBe('Explicit Project');
        expect(extractProjectName('/tmp/fallback-project', 'Name: Named Project')).toBe('Named Project');
        expect(extractProjectName('/tmp/fallback-project', '# Heading Project')).toBe('Heading Project');
        expect(extractProjectName('/tmp/fallback-project', 'plain text')).toBe('fallback-project');
        expect(extractProjectName('/tmp/fallback-project', undefined)).toBe('fallback-project');
    });

    test('formatList returns entries or an empty-state bullet', () => {
        expect(formatList(['- one', '- two'], 'none')).toBe('- one\n- two');
        expect(formatList([], 'none')).toBe('- none');
    });

    test('createOutput creates a non-blocking visible hook output', () => {
        expect(createOutput('message')).toEqual({
            continue: true,
            suppressOutput: false,
            systemMessage: 'message',
        });
    });
});

describe('buildSessionStartOutput', () => {
    const cleanupPaths: string[] = [];

    afterEach(() => {
        for (const path of cleanupPaths.splice(0)) {
            rmSync(path, { recursive: true, force: true });
        }
    });

    test('suggests OpenWolf initialization when .wolf is missing', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);

        const output = buildSessionStartOutput(projectRoot);

        expect(output.continue).toBe(true);
        expect(output.systemMessage).toContain('No .wolf/ directory found');
        expect(output.systemMessage).toContain('openwolf init');
    });

    test('loads complete .wolf context and lists recent bugs newest first', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);

        writeWolfFile(
            projectRoot,
            'anatomy.md',
            [
                '# anatomy.md',
                '> Auto-maintained by OpenWolf. Last scanned: 2026-04-28T10:00:00Z',
                '> Files: 47 tracked | Anatomy hits: 23 | Misses: 2',
            ].join('\n'),
        );
        writeWolfFile(projectRoot, 'identity.md', 'Project: Test Project');
        writeWolfFile(
            projectRoot,
            'cerebrum.md',
            [
                '## Do-Not-Repeat',
                '- Never use var',
                '- Do not default-export components',
                '',
                '## Key Learnings',
                '- Tests live next to source',
                '- Prefer Bun APIs where compatible',
            ].join('\n'),
        );
        writeWolfFile(
            projectRoot,
            'token-ledger.json',
            JSON.stringify({ lifetime: { estimated_savings_vs_bare_cli: 18500, total_sessions: 8 } }),
        );
        writeWolfFile(
            projectRoot,
            'buglog.json',
            JSON.stringify([
                { error_message: 'old', file: 'src/old.ts' },
                { error_message: 'middle', file: 'src/middle.ts' },
                { error_message: 'newer', file: 'src/newer.ts' },
                { error_message: 'newest', file: 'src/newest.ts' },
            ]),
        );

        const output = buildSessionStartOutput(projectRoot);

        expect(output.systemMessage).toContain('## OpenWolf Context Loaded');
        expect(output.systemMessage).toContain('**Project:** Test Project');
        expect(output.systemMessage).toContain('**Files tracked:** 47 | **Last scanned:** 2026-04-28T10:00:00Z');
        expect(output.systemMessage).toContain('**Token savings:** 18500 tokens across 8 sessions');
        expect(output.systemMessage).toContain('**Active warnings:** 2 Do-Not-Repeat rules');
        expect(output.systemMessage).toContain('**Bug memory:** 4 known bugs');
        expect(output.systemMessage).toContain('- Never use var');
        expect(output.systemMessage).toContain('- Tests live next to source');
        expect(output.systemMessage).toContain(
            '- newest in src/newest.ts\n- newer in src/newer.ts\n- middle in src/middle.ts',
        );
        expect(output.systemMessage).not.toContain('cerebrum.md is sparse');
    });

    test('uses safe defaults for missing or malformed OpenWolf files', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);

        writeWolfFile(projectRoot, 'identity.md', '# Heading Project');
        writeWolfFile(projectRoot, 'token-ledger.json', '{bad-json');
        writeWolfFile(projectRoot, 'buglog.json', '{bad-json');

        const output = buildSessionStartOutput(projectRoot);

        expect(output.systemMessage).toContain('**Project:** Heading Project');
        expect(output.systemMessage).toContain('**Files tracked:** unknown | **Last scanned:** unknown');
        expect(output.systemMessage).toContain('**Token savings:** 0 tokens across 0 sessions');
        expect(output.systemMessage).toContain('**Bug memory:** 0 known bugs');
        expect(output.systemMessage).toContain('- No Do-Not-Repeat entries found');
        expect(output.systemMessage).toContain('- No recent learnings found');
        expect(output.systemMessage).toContain('- No known bugs found');
        expect(output.systemMessage).toContain('cerebrum.md is sparse');
        expect(output.systemMessage).toContain('buglog.json is empty');
    });

    test('falls back to project directory name when identity is unavailable', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);
        mkdirSync(join(projectRoot, '.wolf'), { recursive: true });

        const output = buildSessionStartOutput(projectRoot);

        expect(output.systemMessage).toContain(`**Project:** ${basename(projectRoot)}`);
    });
});

describe('main', () => {
    const cleanupPaths: string[] = [];
    let stdoutSpy: Mock<typeof process.stdout.write>;
    let originalProjectDir: string | undefined;

    afterEach(() => {
        stdoutSpy?.mockRestore();
        if (originalProjectDir === undefined) {
            delete process.env.CLAUDE_PROJECT_DIR;
        } else {
            process.env.CLAUDE_PROJECT_DIR = originalProjectDir;
        }
        for (const path of cleanupPaths.splice(0)) {
            rmSync(path, { recursive: true, force: true });
        }
    });

    test('writes JSON hook output for the configured project directory', () => {
        const projectRoot = createProject();
        cleanupPaths.push(projectRoot);
        originalProjectDir = process.env.CLAUDE_PROJECT_DIR;
        process.env.CLAUDE_PROJECT_DIR = projectRoot;
        let written = '';
        stdoutSpy = spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        });

        main();

        const parsed = JSON.parse(written) as { continue: boolean; systemMessage: string };
        expect(parsed.continue).toBe(true);
        expect(parsed.systemMessage).toContain('No .wolf/ directory found');
    });
});
