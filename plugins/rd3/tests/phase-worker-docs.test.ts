import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase worker contracts inlined from the former orchestration-v1 contracts module.
 * These define the expected input/output keys and canonical backbones for each worker phase.
 */
type WorkerPhaseNumber = 5 | 6 | 7;

interface PhaseWorkerContract {
    phase: WorkerPhaseNumber;
    canonical_backbone: string[];
    input_keys: string[];
    output_keys: string[];
}

const PHASE_WORKER_CONTRACTS: Record<WorkerPhaseNumber, PhaseWorkerContract> = {
    5: {
        phase: 5,
        canonical_backbone: ['rd3:code-implement-common'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'implementation_goal?'],
        output_keys: ['status', 'phase', 'artifacts', 'evidence_summary', 'failed_stage?', 'next_step_recommendation'],
    },
    6: {
        phase: 6,
        canonical_backbone: ['rd3:sys-testing', 'rd3:advanced-testing'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'coverage_threshold'],
        output_keys: [
            'status',
            'phase',
            'test_artifacts',
            'evidence_summary',
            'failed_stage?',
            'next_step_recommendation',
        ],
    },
    7: {
        phase: 7,
        canonical_backbone: ['rd3:code-review-common'],
        input_keys: ['task_ref', 'phase_context', 'execution_channel', 'constraints?', 'review_depth?'],
        output_keys: ['status', 'phase', 'findings', 'evidence_summary', 'failed_stage?', 'next_step_recommendation'],
    },
};

const RD3_ROOT = join(import.meta.dir, '..');

function readRd3File(relativePath: string): string {
    return readFileSync(join(RD3_ROOT, relativePath), 'utf-8');
}

describe('phase-worker agent docs', () => {
    it('keeps super-coder and super-tester in explicit dual-mode with anti-recursion rules', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');

        expect(superCoder).toContain('## Mode Selection');
        expect(superCoder).toContain('### Worker Mode');
        expect(superCoder).toContain('must not call `rd3:orchestration-v2`');
        expect(superCoder).not.toContain('- rd3:orchestration-v2');
        expect(superCoder).not.toContain('| Full WBS pipeline execution | `rd3:orchestration-v2` |');

        expect(superTester).toContain('## Mode Selection');
        expect(superTester).toContain('### Worker Mode');
        expect(superTester).toContain('must not call `rd3:orchestration-v2`');
        expect(superTester).not.toContain('- rd3:orchestration-v2');
        expect(superTester).not.toContain('| Full WBS pipeline execution | `rd3:orchestration-v2` |');
    });

    it('defines super-reviewer as the phase-7 worker over code-review-common', () => {
        const superReviewer = readRd3File('agents/super-reviewer.md');

        expect(superReviewer).toContain('rd3:code-review-common');
        expect(superReviewer).toContain('Phase 7');
        expect(superReviewer).toContain('must not call `rd3:orchestration-v2`');
        expect(superReviewer).toContain('worker mode');
    });

    it('matches worker contract phase numbers in agent docs', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        expect(superCoder).toContain('Phase 5');
        expect(superTester).toContain('Phase 6');
        expect(superReviewer).toContain('Phase 7');
    });

    it('references worker contract version in agent worker contract sections', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        expect(superCoder).toContain('## Worker Contract');
        expect(superTester).toContain('## Worker Contract');
        expect(superReviewer).toContain('## Worker Contract');
    });

    it('includes worker contract input keys in each agent doc', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        for (const key of PHASE_WORKER_CONTRACTS[5].input_keys.filter((k) => !k.endsWith('?'))) {
            expect(superCoder).toContain(`\`${key}\``);
        }

        for (const key of PHASE_WORKER_CONTRACTS[6].input_keys.filter((k) => !k.endsWith('?'))) {
            expect(superTester).toContain(`\`${key}\``);
        }

        for (const key of PHASE_WORKER_CONTRACTS[7].input_keys.filter((k) => !k.endsWith('?'))) {
            expect(superReviewer).toContain(`\`${key}\``);
        }
    });

    it('includes worker contract output keys in each agent doc', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        for (const key of PHASE_WORKER_CONTRACTS[5].output_keys.filter((k) => !k.endsWith('?'))) {
            expect(superCoder).toContain(`\`${key}\``);
        }

        for (const key of PHASE_WORKER_CONTRACTS[6].output_keys.filter((k) => !k.endsWith('?'))) {
            expect(superTester).toContain(`\`${key}\``);
        }

        for (const key of PHASE_WORKER_CONTRACTS[7].output_keys.filter((k) => !k.endsWith('?'))) {
            expect(superReviewer).toContain(`\`${key}\``);
        }
    });

    it('does not include rd3:orchestration-v2 in any worker agent skill list', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        // Extract only the frontmatter skills section
        for (const content of [superCoder, superTester, superReviewer]) {
            const frontmatter = content.split('---')[1] ?? '';
            const skillLines = frontmatter.split('\n').filter((line) => line.trim().startsWith('- rd3:'));
            const hasOrchestration = skillLines.some((line) => line.includes('rd3:orchestration-v2'));
            expect(hasOrchestration).toBe(false);
        }
    });

    it('ensures worker agents only list skills allowed by their phase contract', () => {
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        // super-tester should not have phase-7 or phase-8 skills
        const testerFrontmatter = superTester.split('---')[1] ?? '';
        expect(testerFrontmatter).not.toContain('rd3:code-review-common');
        expect(testerFrontmatter).not.toContain('rd3:bdd-workflow');

        // super-reviewer should not have implementation skills
        const reviewerFrontmatter = superReviewer.split('---')[1] ?? '';
        expect(reviewerFrontmatter).not.toContain('rd3:code-implement-common');
        expect(reviewerFrontmatter).not.toContain('rd3:sys-testing');
    });

    it('references the correct canonical backbone per worker contract', () => {
        const superCoder = readRd3File('agents/super-coder.md');
        const superTester = readRd3File('agents/super-tester.md');
        const superReviewer = readRd3File('agents/super-reviewer.md');

        for (const backbone of PHASE_WORKER_CONTRACTS[5].canonical_backbone) {
            expect(superCoder).toContain(backbone);
        }

        for (const backbone of PHASE_WORKER_CONTRACTS[6].canonical_backbone) {
            expect(superTester).toContain(backbone);
        }

        for (const backbone of PHASE_WORKER_CONTRACTS[7].canonical_backbone) {
            expect(superReviewer).toContain(backbone);
        }
    });
});
