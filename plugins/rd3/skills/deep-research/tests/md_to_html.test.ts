import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { main, convertMarkdownToHtml } from '../scripts/md_to_html';

// Suppress logger output during tests
import { setGlobalSilent } from '../../../scripts/logger';
beforeAll(() => {
    setGlobalSilent(true);
});

const originalArgv = [...process.argv];
const originalExit = process.exit;
const tempDirs: string[] = [];

afterEach(() => {
    process.argv = [...originalArgv];
    process.exit = originalExit;

    while (tempDirs.length > 0) {
        const dir = tempDirs.pop();
        if (dir) {
            rmSync(dir, { recursive: true, force: true });
        }
    }
});

function makeTempMarkdown(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'md-to-html-'));
    tempDirs.push(dir);
    const filePath = join(dir, 'report.md');
    writeFileSync(filePath, content, 'utf-8');
    return filePath;
}

function stubExit(): void {
    process.exit = ((code?: number) => {
        throw new Error(`EXIT:${code ?? 0}`);
    }) as typeof process.exit;
}

// ---------------------------------------------------------------------------
// convertMarkdownToHtml
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Section structure & executive summary
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — section structure', () => {
    test('wraps executive summary in dedicated div', () => {
        const md = `## Title

## Executive Summary

Summary content here.

## Other Section

Section content.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="executive-summary">');
        expect(contentHtml).toContain('<h2 class="section-title">Executive Summary</h2>');
        expect(contentHtml).toContain('</div>');
    });

    test('closes executive summary div when no following section exists', () => {
        // Line 94 branch: exec summary at end of document with no next section
        const md = `## Title

## Executive Summary

Only this.

`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="executive-summary">');
        expect(contentHtml).toContain('</div>');
    });

    test('handles document with no executive summary', () => {
        const md = `## Title

## Regular Section

Some content.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="section">');
        expect(contentHtml).not.toContain('executive-summary');
    });

    test('skips content before first major section (##)', () => {
        const md = `# Project Title

Some front matter.

## First Section

Content.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).not.toContain('Project Title');
        expect(contentHtml).not.toContain('front matter');
        expect(contentHtml).toContain('First Section');
    });

    test('converts multiple sections correctly', () => {
        const md = `## Title

## Section One

Content one.

## Section Two

Content two.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="section">');
        expect(contentHtml).toContain('<h2 class="section-title">Section One</h2>');
        expect(contentHtml).toContain('<h2 class="section-title">Section Two</h2>');
        expect(contentHtml).toContain('</div>');
    });
});

// ---------------------------------------------------------------------------
// Inline formatting
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — inline formatting', () => {
    test('converts bold **text** to <strong>', () => {
        const md = `## Title\n\n**bold text**\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<strong>bold text</strong>');
    });

    test('converts italic *text* to <em>', () => {
        const md = `## Title\n\n*italic text*\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<em>italic text</em>');
    });

    test('converts inline `code` to <code>', () => {
        const md = `## Title\n\n\`inline code\`\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<code>inline code</code>');
    });

    test('handles multiple formatting in one line', () => {
        const md = `## Title\n\n**bold** and *italic* and \`code\`\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<strong>bold</strong>');
        expect(contentHtml).toContain('<em>italic</em>');
        expect(contentHtml).toContain('<code>code</code>');
    });
});

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — unordered lists', () => {
    test('converts simple unordered list', () => {
        const md = `## Title\n\n- Item one\n- Item two\n- Item three\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ul>');
        expect(contentHtml).toContain('<li>Item one</li>');
        expect(contentHtml).toContain('<li>Item two</li>');
        expect(contentHtml).toContain('<li>Item three</li>');
        expect(contentHtml).toContain('</ul>');
    });

    test('converts unordered list with * marker', () => {
        const md = `## Title\n\n* Star item\n* Another star\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ul>');
        expect(contentHtml).toContain('<li>Star item</li>');
    });

    test('closes list when items stop', () => {
        const md = `## Title\n\n- List item\n\nNot a list item.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ul>');
        expect(contentHtml).toContain('</ul>');
        expect(contentHtml).toContain('Not a list item');
    });

    test('handles indented continuation lines', () => {
        // Lines 193-201: continuation of list item
        const md = `## Title\n\n- First item\n  continued line\n- Second item\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<li>First item continued line</li>');
    });

    test('handles nested list structure', () => {
        const md = `## Title\n\n- Item one\n- Item two\n  - nested\n  - also nested\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<li>Item one</li>');
        expect(contentHtml).toContain('<li>Item two</li>');
    });
});

describe('convertMarkdownToHtml — ordered lists', () => {
    test('converts simple ordered list', () => {
        const md = `## Title\n\n1. First\n2. Second\n3. Third\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ol>');
        expect(contentHtml).toContain('<li>First</li>');
        expect(contentHtml).toContain('<li>Second</li>');
        expect(contentHtml).toContain('<li>Third</li>');
        expect(contentHtml).toContain('</ol>');
    });

    test('ordered list with varied numbering', () => {
        const md = `## Title\n\n1. One\n5. Five\n10. Ten\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ol>');
        expect(contentHtml).toContain('<li>One</li>');
        expect(contentHtml).toContain('<li>Five</li>');
        expect(contentHtml).toContain('<li>Ten</li>');
    });

    test('closes ordered list when items stop', () => {
        const md = `## Title\n\n1. List item\n\nAfter list.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<ol>');
        expect(contentHtml).toContain('</ol>');
        expect(contentHtml).toContain('After list');
    });
});

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — tables', () => {
    test('converts markdown table with header and rows', () => {
        const md = `## Title

| Column A | Column B |
|----------|----------|
| Cell A1  | Cell B1  |
| Cell A2  | Cell B2  |
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<table>');
        expect(contentHtml).toContain('<thead>');
        expect(contentHtml).toContain('<th>Column A</th>');
        expect(contentHtml).toContain('<th>Column B</th>');
        expect(contentHtml).toContain('<tbody>');
        expect(contentHtml).toContain('<td>Cell A1</td>');
        expect(contentHtml).toContain('<td>Cell B1</td>');
        expect(contentHtml).toContain('<td>Cell A2</td>');
        expect(contentHtml).toContain('<td>Cell B2</td>');
        expect(contentHtml).toContain('</tbody></table>');
    });

    test('handles single-column table', () => {
        const md = `## Title

| Single |
|--------|
| Value  |
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<th>Single</th>');
        expect(contentHtml).toContain('<td>Value</td>');
    });

    test('closes table when pipe format ends', () => {
        const md = `## Title

| Header |
|--------|
| Data   |

After table text.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</tbody></table>');
        expect(contentHtml).toContain('After table text');
    });

    test('ignores separator row (---) as data', () => {
        const md = `## Title

| A | B |
|---|---|
| x | y |
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        // Should have exactly one data row (x, y), not the separator
        expect(contentHtml).toContain('<td>x</td>');
        expect(contentHtml).not.toContain('<td>---</td>');
    });
});

// ---------------------------------------------------------------------------
// Paragraphs
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — paragraphs', () => {
    test('wraps plain text lines in <p> tags', () => {
        const md = `## Title

This is a paragraph.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<p>This is a paragraph.');
        expect(contentHtml).toContain('</p>');
    });

    test('closes paragraph on empty line', () => {
        const md = `## Title

First paragraph.

Second paragraph.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</p>');
        expect(contentHtml).toContain('<p>First paragraph.');
        expect(contentHtml).toContain('<p>Second paragraph.');
    });

    test('does not wrap lines containing HTML tags in <p>', () => {
        const md = `## Title

<div class="special">Custom div</div>
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        // Should not double-wrap the div in a p tag
        expect(contentHtml).toContain('<div class="special">');
    });

    test('handles closing tags correctly', () => {
        const md = `## Title

</div>
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</div>');
    });

    test('continues paragraph for non-empty continuation lines', () => {
        // Line 311: continuation within paragraph
        const md = `## Title

This is a long
paragraph that spans
multiple lines.
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        // All lines should be part of the same paragraph
        expect(contentHtml).toContain('This is a long');
        expect(contentHtml).toContain('paragraph that spans');
        expect(contentHtml).toContain('multiple lines');
    });

    test('closes paragraph before HTML-like content', () => {
        const md = `## Title

Some text.

<table><tr><td>cell</td></tr></table>
`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<p>Some text.');
        expect(contentHtml).toContain('</p>');
        expect(contentHtml).toContain('<table>');
    });
});

// ---------------------------------------------------------------------------
// Headers (h2, h3, h4)
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — header levels', () => {
    test('converts ## to section div + h2', () => {
        const md = `## My Section\n\nContent.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="section">');
        expect(contentHtml).toContain('<h2 class="section-title">My Section</h2>');
    });

    test('converts ### to h3 with subsection class', () => {
        const md = `## Title\n\n### Subsection\n\nContent.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<h3 class="subsection-title">Subsection</h3>');
    });

    test('converts #### to h4 with subsubsection class', () => {
        const md = `## Title\n\n#### SubSubSection\n\nContent.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<h4 class="subsubsection-title">SubSubSection</h4>');
    });
});

// ---------------------------------------------------------------------------
// closeSections
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — closeSections', () => {
    test('closes multiple open sections', () => {
        const md = `## Section One\n\nContent one.\n\n## Section Two\n\nContent two.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        // Both sections should be wrapped and closed
        expect(contentHtml).toContain('<div class="section">');
        // Should have closing divs for both sections
        const openCount = (contentHtml.match(/<div class="section">/g) || []).length;
        const closeCount = (contentHtml.match(/<\/div>/g) || []).length;
        expect(closeCount).toBeGreaterThanOrEqual(openCount);
    });
});

// ---------------------------------------------------------------------------
// Full document integration
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — full document', () => {
    test('converts a complete research report structure', () => {
        const md = `## Research Report

## Executive Summary

This report covers **important** topics.

## Methodology

1. First step
2. Second step

## Results

| Metric | Value |
|--------|-------|
| A      | 100   |

## Bibliography

[1] Author. "Title". https://example.com
`;
        const { contentHtml, bibliographyHtml } = convertMarkdownToHtml(md);

        // Content sections
        expect(contentHtml).toContain('<div class="section">');
        expect(contentHtml).toContain('<strong>important</strong>');
        expect(contentHtml).toContain('<ol>');
        expect(contentHtml).toContain('<table>');

        // Bibliography
        expect(bibliographyHtml).toContain('class="bib-entry"');
        expect(bibliographyHtml).toContain('Author');
    });

    test('handles empty bibliography section', () => {
        const md = `## Title

## Bibliography
`;
        const { bibliographyHtml } = convertMarkdownToHtml(md);
        expect(bibliographyHtml).toBe('');
    });

    test('handles document without bibliography', () => {
        const md = `## Title\n\nContent only.\n`;
        const { bibliographyHtml } = convertMarkdownToHtml(md);
        expect(bibliographyHtml).toBe('');
    });

    test('handles mixed bold and italic in bibliography', () => {
        const md = `## Bibliography

[1] **Bold** and *Italic* - https://example.com
`;
        const { bibliographyHtml } = convertMarkdownToHtml(md);
        expect(bibliographyHtml).toContain('<strong>Bold</strong>');
        expect(bibliographyHtml).toContain('<em>Italic</em>');
    });
});

// ---------------------------------------------------------------------------
// Edge cases — list at EOF
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — list at EOF', () => {
    test('closes list that ends at end of document without trailing newline', () => {
        // Line 216: closes open list at EOF
        const md = '## Title\n\n- Item one\n- Item two';
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</ul>');
    });

    test('closes ordered list that ends at end of document without trailing newline', () => {
        // Line 216: closes open ordered list at EOF
        const md = '## Title\n\n1. First\n2. Second';
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</ol>');
    });

    test('list continuation with matching level ends list', () => {
        // Lines 201-207: continuation line with same or lower indent ends list
        const md = `## Title\n\n- Item one\nNot indented\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</ul>');
        expect(contentHtml).toContain('Not indented');
    });
});

// ---------------------------------------------------------------------------
// Edge cases — table at EOF
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — table at EOF', () => {
    test('closes table that ends at end of document without trailing newline', () => {
        // Line 266: closes open table at EOF
        const md = '## Title\n\n| A | B |\n|---|---|\n| x | y |';
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</tbody></table>');
    });
});

// ---------------------------------------------------------------------------
// Edge cases — HTML-like content in paragraphs
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — HTML-like content', () => {
    test('treats closing tag as HTML-like content', () => {
        // Lines 298-305: closing tags trigger paragraph close
        const md = `## Title\n\nBefore text\n</custom>\nAfter\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</custom>');
    });

    test('HTML-like content is passed through unchanged', () => {
        // Lines 298-305: HTML-like lines are passed through, not wrapped in <p>
        const md = `## Title\n\n<div class="inline">content</div>\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<div class="inline">');
        // Should NOT have <p> around the div line
        expect(contentHtml).not.toContain('<p><div');
    });
});

// ---------------------------------------------------------------------------
// Edge cases — paragraph at EOF
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — paragraph at EOF', () => {
    test('closes paragraph when document ends mid-paragraph without trailing newline', () => {
        // Line 317: closes paragraph at EOF
        const md = '## Title\n\nFinal paragraph text.';
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('<p>Final paragraph text.');
        expect(contentHtml).toContain('</p>');
    });

    test('closes paragraph with continuation lines at EOF without trailing newline', () => {
        // Line 317 + continuation at line 312
        const md = '## Title\n\nLine one\nLine two\nLine three';
        const { contentHtml } = convertMarkdownToHtml(md);
        expect(contentHtml).toContain('</p>');
    });
});

// ---------------------------------------------------------------------------
// Edge cases — multiple sections
// ---------------------------------------------------------------------------

describe('convertMarkdownToHtml — multiple sections edge cases', () => {
    test('closes previous section div when new section opens', () => {
        // Line 331: closes previous section when new one opens
        const md = `## Title\n\nContent one.\n\n## Section Two\n\nContent two.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        // Should have closing div before second section opens
        expect(contentHtml).toContain('</div>');
        expect(contentHtml).toContain('<div class="section">');
    });

    test('handles three consecutive sections', () => {
        const md = `## Title\n\n## Section 1\n\nContent 1.\n\n## Section 2\n\nContent 2.\n\n## Section 3\n\nContent 3.\n`;
        const { contentHtml } = convertMarkdownToHtml(md);
        const openCount = (contentHtml.match(/<div class="section">/g) || []).length;
        expect(openCount).toBeGreaterThanOrEqual(3);
    });
});

// ---------------------------------------------------------------------------
// CLI main
// ---------------------------------------------------------------------------

describe('md_to_html main', () => {
    test('logs converted content for a readable markdown file', () => {
        const markdownPath = makeTempMarkdown('## Title\n\n## Executive Summary\n\nSummary text.');
        process.argv = ['bun', 'md_to_html.ts', markdownPath];

        expect(() => main()).not.toThrow();
    });

    test('exits with code 1 when no markdown file path is provided', () => {
        process.argv = ['bun', 'md_to_html.ts'];
        stubExit();

        expect(() => main()).toThrow('EXIT:1');
    });

    test('exits with code 1 when the markdown file cannot be read', () => {
        process.argv = ['bun', 'md_to_html.ts', join(tmpdir(), 'missing-md-to-html-file.md')];
        stubExit();

        expect(() => main()).toThrow('EXIT:1');
    });
});
