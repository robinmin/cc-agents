#!/usr/bin/env bun
/**
 * score-quality-cli.test.ts
 *
 * Unit tests for score-quality.ts CLI execution and low-score warnings.
 */

import { describe, expect, test } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import {
    executeScoreQualityCli,
    getScoreQualityHelpLines,
    runScoreQualityCli,
    scoreMergeQuality,
} from '../scripts/score-quality';
import type { SourceContent } from '../scripts/types';

describe('score-quality CLI', () => {
    test('executeScoreQualityCli returns help lines', async () => {
        const result = await executeScoreQualityCli(['--help']);

        expect(result).toEqual({
            exitCode: 0,
            stdout: getScoreQualityHelpLines(),
            stderr: [],
        });
    });

    test('executeScoreQualityCli requires merged content', async () => {
        const result = await executeScoreQualityCli(['--json']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toEqual(['--merged is required']);
        expect(result.stdout).toEqual(getScoreQualityHelpLines());
    });

    test('executeScoreQualityCli rejects invalid sources JSON', async () => {
        const result = await executeScoreQualityCli(['--merged=content', '--sources=not-json']);

        expect(result.exitCode).toBe(1);
        expect(result.stdout).toEqual([]);
        expect(result.stderr).toEqual(['Failed to parse --sources JSON']);
    });

    test('executeScoreQualityCli outputs JSON for string and object sources', async () => {
        const merged = '# Doc\n\nSource: alpha\n\nAccording to beta, conflict resolution is documented.';
        const sources = JSON.stringify(['alpha', { name: 'beta', path: 'doc.md', content: 'Original content' }]);

        const result = await executeScoreQualityCli(['--json', `--merged=${merged}`, `--sources=${sources}`]);

        expect(result.exitCode).toBe(0);
        const parsed = JSON.parse(result.stdout[0] ?? '{}');
        expect(parsed).toHaveProperty('score');
        expect(parsed).toHaveProperty('dimensions');
        expect(Array.isArray(parsed.warnings)).toBe(true);
    });

    test('executeScoreQualityCli outputs text summary and warnings', async () => {
        const repeatedParagraph =
            'This paragraph is intentionally long enough to count as duplicate content for scoring coverage.';
        const merged = [
            '# Alpha',
            '',
            repeatedParagraph,
            '',
            '# Alpha',
            '',
            repeatedParagraph,
            '',
            '# Beta',
            '',
            repeatedParagraph,
            '',
            '# Beta',
            '',
            repeatedParagraph,
        ].join('\n');

        const result = await executeScoreQualityCli([`--merged=${merged}`]);

        expect(result.exitCode).toBe(0);
        expect(result.stdout[0]).toContain('Quality Score:');
        expect(result.stdout.some((line) => line.includes('Non-redundancy'))).toBe(true);
        expect(result.warnings?.some((line) => line.includes('significant duplicate content'))).toBe(true);
    });

    test('runScoreQualityCli executes success and error paths', async () => {
        setGlobalSilent(true);
        try {
            const successExit = await runScoreQualityCli(['--merged=# Doc\n\n[TODO] unresolved summary']);
            const errorExit = await runScoreQualityCli(['--sources=not-json']);

            expect(successExit).toBe(0);
            expect(errorExit).toBe(1);
        } finally {
            setGlobalSilent(false);
        }
    });
});

describe('scoreMergeQuality warnings', () => {
    test('warns when coherence is very low', () => {
        const merged = [
            '## Alpha',
            '',
            'tiny',
            '',
            '## Alpha',
            '',
            'tiny',
            '',
            '## Beta',
            '',
            'tiny',
            '',
            '## Beta',
            '',
            'tiny',
            '',
            '## Gamma',
            '',
            'tiny',
            '',
            '## Gamma',
            '',
            'tiny',
            '',
            'however however however however however however',
        ].join('\n');

        const result = scoreMergeQuality(merged, []);

        expect(result.dimensions.coherence).toBeLessThan(10);
        expect(result.warnings).toContain('Coherence is very low: merged text may be fragmented or contradictory.');
        expect(result.weakDimensions).toContain('coherence');
    });

    test('warns when completeness is very low', () => {
        const merged = '# Summary\n\n[TODO] [INSERT details] [FIXME] [placeholder]';
        const sources: SourceContent[] = [
            { name: 'alpha', path: 'a.md', content: 'A' },
            { name: 'beta', path: 'b.md', content: 'B' },
            { name: 'gamma', path: 'c.md', content: 'C' },
            { name: 'delta', path: 'd.md', content: 'D' },
        ];

        const result = scoreMergeQuality(merged, sources);

        expect(result.dimensions.completeness).toBeLessThan(10);
        expect(result.warnings).toContain('Completeness is low: some source content may have been lost.');
        expect(result.weakDimensions).toContain('completeness');
    });

    test('warns when non-redundancy is very low', () => {
        const repeatedParagraph =
            'This paragraph is intentionally long enough to count as duplicate content for scoring coverage and repeated phrase detection.';
        const repeatedPhrase =
            'alpha beta gamma delta epsilon zeta eta theta iota kappa alpha beta gamma delta epsilon zeta eta theta iota kappa';
        const merged = [
            '# Alpha',
            '',
            repeatedParagraph,
            '',
            '# Alpha',
            '',
            repeatedParagraph,
            '',
            '# Beta',
            '',
            repeatedParagraph,
            '',
            '# Beta',
            '',
            repeatedParagraph,
            '',
            repeatedPhrase,
            '',
            repeatedPhrase,
        ].join('\n');

        const result = scoreMergeQuality(merged, []);

        expect(result.dimensions.nonRedundancy).toBeLessThan(10);
        expect(result.warnings).toContain('Non-redundancy is low: significant duplicate content detected.');
        expect(result.weakDimensions).toContain('nonRedundancy');
    });
});
