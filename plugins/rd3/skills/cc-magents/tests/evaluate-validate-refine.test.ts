import { describe, expect, test } from 'bun:test';
import { evaluateWorkspace } from '../scripts/evaluate';
import { parseInstructionDocument, workspaceFromDocuments } from '../scripts/parser';
import { suggestRefinements } from '../scripts/refine';
import { validatePlatformRegistry, validateWorkspace } from '../scripts/validate';

describe('validation, evaluation, and refinement', () => {
    test('validates platform registry', () => {
        expect(validatePlatformRegistry().ok).toBe(true);
    });

    test('warns when safety policy is missing', () => {
        const workspace = workspaceFromDocuments([
            parseInstructionDocument('AGENTS.md', '# Project\n\nUse TypeScript.', 'agents-md'),
        ]);
        const result = validateWorkspace(workspace);
        expect(result.ok).toBe(true);
        expect(result.issues.some((issue) => issue.message.includes('permission'))).toBe(true);
    });

    test('scores a well-formed workspace', () => {
        const workspace = workspaceFromDocuments([
            parseInstructionDocument(
                'AGENTS.md',
                '# Project\n\n## Architecture\n\nUse existing services.\n\n## Testing\n\nRun bun test.\n\n## Safety\n\nAsk approval for destructive commands and never expose secrets.',
                'agents-md',
            ),
        ]);
        const result = evaluateWorkspace(workspace);
        expect(result.score).toBeGreaterThanOrEqual(70);
    });

    test('suggests native split for target platforms', () => {
        const workspace = workspaceFromDocuments([
            parseInstructionDocument('AGENTS.md', '# Project\n\nUse TypeScript.', 'agents-md'),
        ]);
        const suggestions = suggestRefinements(workspace, 'copilot');
        expect(suggestions.some((suggestion) => suggestion.kind === 'split')).toBe(true);
    });
});
