import { describe, expect, test } from 'bun:test';
import { generateMarkdown, getDateRange, parseArgs } from '../scripts/daily-summary';
import type { DailySummary } from '../scripts/daily-summary';

describe('parseArgs', () => {
    test('defaults to today when --date missing', () => {
        const opts = parseArgs([]);
        expect(opts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(opts.dryRun).toBe(false);
        expect(opts.skipGit).toBe(false);
        expect(opts.skipCcusage).toBe(false);
    });

    test('parses explicit --date', () => {
        const opts = parseArgs(['--date', '2026-04-17']);
        expect(opts.date).toBe('2026-04-17');
    });

    test('resolves "yesterday" to a date string', () => {
        const opts = parseArgs(['--date', 'yesterday']);
        expect(opts.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(opts.date).not.toBe('yesterday');
    });

    test('parses --dry-run flag', () => {
        const opts = parseArgs(['--dry-run']);
        expect(opts.dryRun).toBe(true);
    });

    test('parses --output path', () => {
        const opts = parseArgs(['--output', '/tmp/custom.md']);
        expect(opts.outputPath).toBe('/tmp/custom.md');
    });

    test('parses --no-git and --no-ccusage skip flags', () => {
        const opts = parseArgs(['--no-git', '--no-ccusage']);
        expect(opts.skipGit).toBe(true);
        expect(opts.skipCcusage).toBe(true);
    });

    test('handles combined flags', () => {
        const opts = parseArgs(['--date', '2026-04-17', '--dry-run', '--no-git']);
        expect(opts.date).toBe('2026-04-17');
        expect(opts.dryRun).toBe(true);
        expect(opts.skipGit).toBe(true);
    });
});

describe('getDateRange', () => {
    test('returns start and end timestamps spanning one day', () => {
        const { start, end } = getDateRange('2026-04-17');
        expect(start).toBe('2026-04-17 00:00:00');
        expect(end).toBe('2026-04-18 00:00:00');
    });

    test('rolls over month boundary', () => {
        const { start, end } = getDateRange('2026-04-30');
        expect(start).toBe('2026-04-30 00:00:00');
        expect(end).toBe('2026-05-01 00:00:00');
    });

    test('rolls over year boundary', () => {
        const { start, end } = getDateRange('2026-12-31');
        expect(start).toBe('2026-12-31 00:00:00');
        expect(end).toBe('2027-01-01 00:00:00');
    });
});

describe('generateMarkdown', () => {
    const baseSummary: DailySummary = {
        date: '2026-04-17',
        platforms: ['Claude Code', 'Git'],
        commits: [],
        annotations: { learnings: '', issuesFixed: '', pending: '' },
        generatedAt: '2026-04-17 10:30:00',
    };

    test('includes header and meta section', () => {
        const md = generateMarkdown(baseSummary);
        expect(md).toContain('# Daily Summary — 2026-04-17');
        expect(md).toContain('## Meta');
        expect(md).toContain('- **Date:** 2026-04-17');
        expect(md).toContain('Claude Code, Git');
    });

    test('renders token usage table with cache hit rate', () => {
        const md = generateMarkdown({
            ...baseSummary,
            tokenUsage: {
                inputTokens: 1000,
                outputTokens: 500,
                cacheTokens: 3000,
                totalTokens: 4500,
                costUsd: 0.1234,
            },
        });
        expect(md).toContain('## Token Usage');
        expect(md).toContain('| Input Tokens | 1,000 |');
        expect(md).toContain('| Output Tokens | 500 |');
        expect(md).toContain('$0.1234');
        expect(md).toContain('**Cache Hit Rate:** 75.0%');
    });

    test('omits token usage section when absent', () => {
        const md = generateMarkdown(baseSummary);
        expect(md).not.toContain('## Token Usage');
    });

    test('renders git activity table', () => {
        const md = generateMarkdown({
            ...baseSummary,
            gitActivity: { commitCount: 3, filesChanged: 7, insertions: 120, deletions: 45 },
        });
        expect(md).toContain('## Git Activity');
        expect(md).toContain('| Commits | 3 |');
        expect(md).toContain('| Files Changed | 7 |');
        expect(md).toContain('+120');
        expect(md).toContain('-45');
    });

    test('lists commits with short hash', () => {
        const md = generateMarkdown({
            ...baseSummary,
            commits: [
                {
                    hash: 'abcdef1234567890',
                    date: '2026-04-17 10:00:00',
                    message: 'feat: add feature',
                    filesChanged: 2,
                    insertions: 10,
                    deletions: 1,
                },
            ],
        });
        expect(md).toContain('## Commits');
        expect(md).toContain('- `abcdef1` feat: add feature');
    });

    test('truncates commits list after 10 entries', () => {
        const commits = Array.from({ length: 12 }, (_, i) => ({
            hash: `hash${i.toString().padStart(10, '0')}`,
            date: '2026-04-17 10:00:00',
            message: `commit ${i}`,
            filesChanged: 1,
            insertions: 1,
            deletions: 0,
        }));
        const md = generateMarkdown({ ...baseSummary, commits });
        expect(md).toContain('... and 2 more commits');
    });

    test('includes annotation sections when provided', () => {
        const md = generateMarkdown({
            ...baseSummary,
            annotations: {
                learnings: 'Learned about Bun',
                issuesFixed: 'Fixed flaky test',
                pending: 'Review PR',
            },
        });
        expect(md).toContain('## Learnings');
        expect(md).toContain('Learned about Bun');
        expect(md).toContain('## Issues Fixed');
        expect(md).toContain('Fixed flaky test');
        expect(md).toContain('## Pending');
        expect(md).toContain('Review PR');
    });

    test('omits annotation sections when empty', () => {
        const md = generateMarkdown(baseSummary);
        expect(md).not.toContain('## Learnings');
        expect(md).not.toContain('## Issues Fixed');
        expect(md).not.toContain('## Pending');
    });

    test('includes footer with generation timestamp', () => {
        const md = generateMarkdown(baseSummary);
        expect(md).toContain('*Generated by rd3:daily-summary at 2026-04-17 10:30:00*');
    });

    test('falls back to "unknown" when no platforms detected', () => {
        const md = generateMarkdown({ ...baseSummary, platforms: [] });
        expect(md).toContain('- **Platforms:** unknown');
    });
});
