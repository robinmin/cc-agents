import { describe, expect, test } from 'bun:test';
import { generateWorkspace } from '../scripts/generator';
import { parseInstructionDocument, workspaceFromDocuments } from '../scripts/parser';

function sampleWorkspace() {
    return workspaceFromDocuments([
        parseInstructionDocument(
            'AGENTS.md',
            '# Project\n\n## Coding\n\nUse TypeScript.\n\n## Safety\n\nAsk approval before destructive actions.\n\n## Frontend\n\nUse existing patterns for `src/components/**/*.tsx`.',
            'agents-md',
        ),
    ]);
}

describe('workspace generator', () => {
    test('generates Claude bridge with import', () => {
        const generated = generateWorkspace(sampleWorkspace(), 'agents-md', 'claude-code');
        expect(generated.files).toHaveLength(1);
        expect(generated.files[0].path).toBe('CLAUDE.md');
        expect(generated.files[0].content).toContain('@AGENTS.md');
    });

    test('generates multi-file Cursor rules', () => {
        const generated = generateWorkspace(sampleWorkspace(), 'agents-md', 'cursor');
        expect(generated.files.length).toBeGreaterThan(1);
        expect(generated.files.every((file) => file.path.startsWith('.cursor/rules/'))).toBe(true);
    });

    test('generates OpenClaw workspace files', () => {
        const generated = generateWorkspace(sampleWorkspace(), 'agents-md', 'openclaw');
        expect(generated.files.map((file) => file.path)).toContain('SOUL.md');
        expect(generated.files.map((file) => file.path)).toContain('AGENTS.md');
    });
});
