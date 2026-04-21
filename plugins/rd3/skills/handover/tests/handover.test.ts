import { describe, expect, test } from 'bun:test';
import { generateHandoverMarkdown, slugify } from '../scripts/template';
import type { HandoverDocument } from '../scripts/types';

describe('handover template', () => {
    const minimalDoc: HandoverDocument = {
        description: 'TypeScript compilation fails in build step',
        goal: 'Fix the build pipeline',
        progress: 'Identified the problematic type definition',
        sourceCodeChanges: [{ file: 'src/index.ts', status: 'modified', insertions: 5, deletions: 2 }],
        blocker: "Type 'Foo' is not assignable to type 'Bar'",
        rejectedApproaches: [{ approach: 'Use type assertion', reason: 'Masks the underlying issue' }],
        nextSteps: 'Review the interface definition and adjust the type hierarchy',
        generatedAt: '2026-04-17 10:30:00',
        environment: undefined,
        relatedFiles: undefined,
        taskFile: undefined,
    };

    test('generates valid markdown', () => {
        const markdown = generateHandoverMarkdown(minimalDoc);
        expect(markdown).toContain('# Handover Document');
        expect(markdown).toContain('## Description');
        expect(markdown).toContain('## Goal');
        expect(markdown).toContain('## Blocker');
        expect(markdown).toContain('## Rejected Approaches');
    });

    test('includes source code changes table', () => {
        const markdown = generateHandoverMarkdown(minimalDoc);
        expect(markdown).toContain('| File | Status | Changes |');
        expect(markdown).toContain('src/index.ts');
        expect(markdown).toContain('modified');
        expect(markdown).toContain('+5 / -2');
    });

    test('handles empty source code changes', () => {
        const doc = { ...minimalDoc, sourceCodeChanges: [] };
        const markdown = generateHandoverMarkdown(doc);
        expect(markdown).toContain('*No source code changes detected.*');
    });

    test('includes environment if present', () => {
        const doc = { ...minimalDoc, environment: 'Node.js 20, Bun 1.1' };
        const markdown = generateHandoverMarkdown(doc);
        expect(markdown).toContain('## Environment');
        expect(markdown).toContain('Node.js 20, Bun 1.1');
    });

    test('includes related files if present', () => {
        const doc = { ...minimalDoc, relatedFiles: ['src/index.ts', 'src/types.ts'] };
        const markdown = generateHandoverMarkdown(doc);
        expect(markdown).toContain('## Related Files');
        expect(markdown).toContain('src/index.ts');
        expect(markdown).toContain('src/types.ts');
    });
});

describe('slugify', () => {
    test('converts to lowercase', () => {
        expect(slugify('TypeScript Error')).toBe('typescript-error');
    });

    test('replaces spaces with hyphens', () => {
        expect(slugify('fix build error')).toBe('fix-build-error');
    });

    test('removes special characters', () => {
        expect(slugify('fix: build error!')).toBe('fix-build-error');
    });

    test('limits length to 50 characters', () => {
        const long = 'a'.repeat(60);
        expect(slugify(long).length).toBe(50);
    });

    test('removes leading/trailing hyphens', () => {
        expect(slugify('  test  ')).toBe('test');
    });
});
