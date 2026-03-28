import { describe, expect, test, beforeAll } from 'bun:test';
import { convertMarkdownToHtml } from '../scripts/md_to_html';

// Suppress logger output during tests
import { setGlobalSilent } from '../../../scripts/logger';
beforeAll(() => {
    setGlobalSilent(true);
});

describe('convertMarkdownToHtml — bibliography conversion', () => {
    test('converts academic-style bibliography entries with URL to linked HTML', () => {
        const md = `## Bibliography

[1] Smith, J. (2025). "Test Research Advances". Journal of Testing. https://example.com/paper1
[2] Johnson, K. (2025). "Current State Analysis". Research Quarterly. https://example.com/paper2
`;

        const { bibliographyHtml } = convertMarkdownToHtml(md);

        expect(bibliographyHtml).toContain('class="bib-entry"');
        expect(bibliographyHtml).toContain('class="bib-number"');
        expect(bibliographyHtml).toContain('[1]');
        expect(bibliographyHtml).toContain('[2]');
        expect(bibliographyHtml).toContain('<a href="https://example.com/paper1"');
        expect(bibliographyHtml).toContain('<a href="https://example.com/paper2"');
        expect(bibliographyHtml).toContain('target="_blank"');
    });

    test('converts dash-separated bibliography entries (legacy format)', () => {
        const md = `## Bibliography

[1] Test Title - https://example.com/1
[2] Another Title - https://example.com/2
`;

        const { bibliographyHtml } = convertMarkdownToHtml(md);

        expect(bibliographyHtml).toContain('class="bib-entry"');
        expect(bibliographyHtml).toContain('<a href="https://example.com/1"');
        expect(bibliographyHtml).toContain('<a href="https://example.com/2"');
    });

    test('handles bibliography entries without URLs', () => {
        const md = `## Bibliography

[1] Smith, J. (2025). "Offline Reference". Print Publication.
`;

        const { bibliographyHtml } = convertMarkdownToHtml(md);

        expect(bibliographyHtml).toContain('class="bib-entry"');
        expect(bibliographyHtml).toContain('[1]');
        expect(bibliographyHtml).toContain('Print Publication');
        expect(bibliographyHtml).not.toContain('<a href=');
    });

    test('preserves bold formatting in bibliography entries', () => {
        const md = `## Bibliography

[1] **Smith**, J. (2025). "Title". Pub. https://example.com/1
`;

        const { bibliographyHtml } = convertMarkdownToHtml(md);

        expect(bibliographyHtml).toContain('<strong>Smith</strong>');
    });

    test('returns empty content div for empty bibliography', () => {
        const md = `## Bibliography\n`;
        const { bibliographyHtml } = convertMarkdownToHtml(md);

        // Empty bibliography section produces empty string (no entries to wrap)
        expect(bibliographyHtml).toBe('');
    });

    test('splits content and bibliography correctly', () => {
        const md = `# Title

## Executive Summary

Some summary text [1].

## Bibliography

[1] Source. https://example.com
`;

        const { contentHtml, bibliographyHtml } = convertMarkdownToHtml(md);

        expect(contentHtml).toContain('Executive Summary');
        expect(contentHtml).toContain('Some summary text');
        expect(contentHtml).not.toContain('https://example.com');
        expect(bibliographyHtml).toContain('https://example.com');
    });
});
