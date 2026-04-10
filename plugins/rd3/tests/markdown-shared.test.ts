import { describe, expect, it } from 'bun:test';

import {
    detectUnknownFields,
    parseMarkdownFrontmatter,
    serializeMarkdownFrontmatter,
} from '../scripts/markdown-frontmatter';
import {
    countTodoMarkers,
    extractMarkdownHeadings,
    filterNonCodeAndCommentLines,
    hasSecondPersonLanguage,
} from '../scripts/markdown-analysis';

describe('markdown-frontmatter shared utilities', () => {
    it('parses frontmatter with configurable body trimming', () => {
        const trimmed = parseMarkdownFrontmatter('# body\n', { trimBodyWithoutFrontmatter: true });
        const preserved = parseMarkdownFrontmatter('# body\n');

        expect(trimmed.body).toBe('# body');
        expect(preserved.body).toBe('# body\n');
    });

    it('detects unknown fields against an allowed list', () => {
        const parsed = parseMarkdownFrontmatter('---\nname: test\nauthor: robin\n---\nBody');
        expect(parsed.frontmatter).not.toBeNull();
        expect(detectUnknownFields(parsed.frontmatter ?? {}, ['name'])).toEqual(['author']);
    });

    it('serializes frontmatter while omitting undefined values', () => {
        const output = serializeMarkdownFrontmatter({ name: 'test', description: undefined }, 'Body');
        expect(output).toContain('name: test');
        expect(output).not.toContain('description');
        expect(output).toContain('\n---\n\nBody');
    });
});

describe('markdown-analysis shared utilities', () => {
    it('extracts markdown headings up to a max level', () => {
        const sections = extractMarkdownHeadings('# One\n## Two\n#### Four', 3);
        expect(sections).toEqual(['One', 'Two']);
    });

    it('filters code blocks and html comments for language analysis', () => {
        const lines = filterNonCodeAndCommentLines([
            'Keep this',
            '```ts',
            'you should ignore this',
            '```',
            '<!-- ignore',
            'your comment',
            '-->',
            'Keep that',
        ]);

        expect(lines).toEqual(['Keep this', 'Keep that']);
    });

    it('detects second-person language outside code blocks', () => {
        expect(hasSecondPersonLanguage('Use this.\n```md\nyou should not count\n```')).toBe(false);
        expect(hasSecondPersonLanguage('You should rewrite this.')).toBe(true);
    });

    it('counts todo markers', () => {
        expect(countTodoMarkers('TODO one\nTODO two\nDone')).toBe(2);
    });
});
