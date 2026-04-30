import { describe, expect, test } from 'bun:test';
import { parseInstructionDocument, workspaceFromDocuments } from '../scripts/parser';

describe('main agent parser', () => {
    test('preserves markdown sections and imports', () => {
        const document = parseInstructionDocument(
            'CLAUDE.md',
            '# Root\n\nRead @AGENTS.md.\n\n## Safety\n\nAsk before destructive commands.',
        );
        expect(document.platform).toBe('claude-code');
        expect(document.sections.map((section) => section.heading)).toEqual(['Root', 'Safety']);
        expect(document.metadata.imports).toContain('AGENTS.md');
    });

    test('extracts workspace rules, memory, and permissions', () => {
        const document = parseInstructionDocument(
            'AGENTS.md',
            '# Rules\n\n## Testing\n\nRun tests for `src/**/*.ts`.\n\n## Memory\n\nUpdate MEMORY.md.\n\n## Safety\n\nAsk approval before destructive shell commands.',
            'agents-md',
        );
        const workspace = workspaceFromDocuments([document]);
        expect(workspace.rules.length).toBe(4);
        expect(workspace.rules.some((rule) => rule.globs.includes('src/**/*.ts'))).toBe(true);
        expect(workspace.memories.length).toBe(1);
        expect(workspace.permissions.length).toBeGreaterThan(0);
    });
});
