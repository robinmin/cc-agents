import { describe, expect, test } from 'bun:test';
import { proposeEvolution } from '../scripts/evolve';
import { synthesizeWorkspace } from '../scripts/synthesize';

describe('synthesize and evolve', () => {
    test('synthesizes default AGENTS.md output', () => {
        const generated = synthesizeWorkspace('dev-agent', 'agents-md');
        expect(generated.files).toHaveLength(1);
        expect(generated.files[0].path).toBe('AGENTS.md');
        expect(generated.files[0].content).toContain('Development Agent Instructions');
    });

    test('proposes evidence refresh for provisional platforms', () => {
        const proposals = proposeEvolution();
        expect(proposals.some((proposal) => proposal.id === 'refresh-provisional-platforms')).toBe(true);
    });
});
