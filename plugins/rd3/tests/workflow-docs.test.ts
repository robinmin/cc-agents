import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RD3_ROOT = join(import.meta.dir, '..');

function readRd3File(relativePath: string): string {
    return readFileSync(join(RD3_ROOT, relativePath), 'utf-8');
}

describe('workflow docs contract', () => {
    it('links all meta-skill workflow docs to the shared workflow schema', () => {
        const workflowDocs = [
            'skills/cc-skills/references/workflows.md',
            'skills/cc-commands/references/workflows.md',
            'skills/cc-agents/references/workflows.md',
            'skills/cc-magents/references/workflows.md',
        ];

        for (const docPath of workflowDocs) {
            const content = readRd3File(docPath);
            expect(content).toContain('## Shared Workflow Framework');
            expect(content).toContain('Meta-Agent Workflow Schema');
            expect(content).toContain('## Create Workflow');
        }
    });

    it('does not document a separate --llm-eval command path for meta-skills', () => {
        const workflowDocs = [
            'skills/cc-skills/references/workflows.md',
            'skills/cc-commands/references/workflows.md',
            'skills/cc-agents/references/workflows.md',
            'skills/cc-magents/references/workflows.md',
        ];

        for (const docPath of workflowDocs) {
            const content = readRd3File(docPath);
            expect(content).not.toContain('Claude via `--llm-eval` flag');
            expect(content).not.toMatch(/evaluate\\.ts\\s+[^\\n]*--llm-eval/);
        }
    });

    it('includes evolve workflow coverage where the skill exposes evolve', () => {
        const docsWithEvolve = [
            'skills/cc-skills/references/workflows.md',
            'skills/cc-commands/references/workflows.md',
            'skills/cc-agents/references/workflows.md',
            'skills/cc-magents/references/workflows.md',
        ];

        for (const docPath of docsWithEvolve) {
            expect(readRd3File(docPath)).toContain('## Evolve Workflow');
            expect(readRd3File(docPath)).toContain('Closed-Loop Phases');
            expect(readRd3File(docPath)).toContain('Embedded LLM');
        }
    });

    it('keeps cc-commands evolve proposal generation script-driven', () => {
        const workflows = readRd3File('skills/cc-commands/references/workflows.md');

        expect(workflows).toContain('| 3 | Generate Proposals | `evolve.ts --propose` |');
        expect(workflows).toContain('| 4 | Embedded LLM Proposal Review | LLM (invoking agent) |');
        expect(workflows).not.toContain('Claude via `--llm-eval` flag');
    });

    it('fills cc-magents quick start and example commands', () => {
        const skillDoc = readRd3File('skills/cc-magents/SKILL.md');

        expect(skillDoc).toContain('bun scripts/synthesize.ts general-agent --output AGENTS.md');
        expect(skillDoc).toContain('bun scripts/evaluate.ts AGENTS.md --profile standard');
        expect(skillDoc).toContain('bun scripts/refine.ts AGENTS.md --dry-run');
        expect(skillDoc).toContain('bun scripts/refine.ts AGENTS.md --apply');
        expect(skillDoc).toContain('bun scripts/evolve.ts AGENTS.md --propose');
        expect(skillDoc).toContain('bun scripts/adapt.ts CLAUDE.md --to cursorrules --output .cursorrules');
    });

    it('keeps cc-magents adapt workflow ordered as generate then validate', () => {
        const workflows = readRd3File('skills/cc-magents/references/workflows.md');

        const generateIndex = workflows.indexOf('### Step 3: Generate Output');
        const validateIndex = workflows.indexOf('### Step 4: Validate Target');

        expect(generateIndex).toBeGreaterThan(-1);
        expect(validateIndex).toBeGreaterThan(generateIndex);
    });

    it('documents validate workflow for cc-skills and cc-magents and adapt workflow for cc-skills', () => {
        const skillsWorkflows = readRd3File('skills/cc-skills/references/workflows.md');
        const magentsWorkflows = readRd3File('skills/cc-magents/references/workflows.md');

        expect(skillsWorkflows).toContain('## Validate Workflow');
        expect(skillsWorkflows).toContain('## Adapt Workflow');
        expect(magentsWorkflows).toContain('## Validate Workflow');
    });

    it('uses BLOCK/WARN/PASS as the workflow decision vocabulary without legacy stop-suggest labels', () => {
        const workflowDocs = [
            'skills/cc-skills/references/workflows.md',
            'skills/cc-commands/references/workflows.md',
            'skills/cc-agents/references/workflows.md',
            'skills/cc-magents/references/workflows.md',
        ];

        for (const docPath of workflowDocs) {
            const content = readRd3File(docPath);
            expect(content).toContain('BLOCK');
            expect(content).toContain('WARN');
            expect(content).toContain('PASS');
            expect(content).not.toContain('STOP/WARN/PASS');
            expect(content).not.toContain('STOP/');
            expect(content).not.toContain('SUGGEST');
            expect(content).not.toContain('| STOP |');
            expect(content).not.toContain('[FAIL: STOP]');
        }
    });
});
