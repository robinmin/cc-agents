import { describe, expect, it } from 'bun:test';

import {
    EVOLUTION_APPLY_MODES,
    EVOLUTION_APPLY_RISKS,
    EVOLUTION_CHANGE_TYPES,
    EVOLUTION_COMMANDS,
    EVOLUTION_DATA_SOURCES,
    EVOLUTION_EVIDENCE_TYPES,
    EVOLUTION_IMPROVEMENT_OBJECTIVES,
    EVOLUTION_PATTERN_TYPES,
    EVOLUTION_PROPOSAL_SCOPES,
    EVOLUTION_SAFETY_LEVELS,
    EVOLUTION_TARGET_KINDS,
    type EvolutionPattern,
    type EvolutionProposal,
    type EvolutionResult,
    type EvolutionRunOptionsBase,
} from '../scripts/evolution-contract';

describe('evolution contract', () => {
    it('defines the shared evolve command surface', () => {
        expect(EVOLUTION_COMMANDS).toEqual(['analyze', 'propose', 'apply', 'history', 'rollback']);
        expect(EVOLUTION_SAFETY_LEVELS).toEqual(['L1', 'L2', 'L3']);
    });

    it('defines the shared evolution data sources and pattern taxonomy', () => {
        expect(EVOLUTION_DATA_SOURCES).toContain('git-history');
        expect(EVOLUTION_DATA_SOURCES).toContain('interaction-logs');
        expect(EVOLUTION_PATTERN_TYPES).toContain('gap');
        expect(EVOLUTION_CHANGE_TYPES).toContain('modify');
        expect(EVOLUTION_TARGET_KINDS).toContain('magent');
        expect(EVOLUTION_IMPROVEMENT_OBJECTIVES).toContain('evolution-readiness');
        expect(EVOLUTION_PROPOSAL_SCOPES).toContain('tests');
        expect(EVOLUTION_EVIDENCE_TYPES).toContain('test-failure');
        expect(EVOLUTION_APPLY_RISKS).toContain('high');
        expect(EVOLUTION_APPLY_MODES).toContain('confirm-required');
    });

    it('supports the shared proposal and result shape', () => {
        const proposal: EvolutionProposal = {
            id: 'p1',
            targetSection: 'workflow',
            changeType: 'modify',
            description: 'Tighten the workflow steps',
            rationale: 'Repeated failures suggest the current workflow is vague',
            source: 'git-history',
            confidence: 0.8,
            affectsCritical: false,
            targetKind: 'skill',
            objective: 'quality',
            scope: 'workflows',
            evidenceType: 'history-pattern',
            applyRisk: 'low',
            applyMode: 'confirm-required',
            verificationPlan: {
                checks: ['validate', 'evaluate'],
                testsRequired: false,
                rollbackAvailable: true,
                minimumScore: 72,
                mustNotDecrease: true,
            },
            evidence: ['Repeated failures suggest the current workflow is vague'],
        };

        const result: EvolutionResult = {
            filePath: '/tmp/example.md',
            sourcesUsed: ['git-history'],
            proposals: [proposal],
            currentGrade: 'C',
            predictedGrade: 'B',
            safetyWarnings: [],
            timestamp: new Date().toISOString(),
            targetKind: 'skill',
        };

        expect(result.proposals[0]?.changeType).toBe('modify');
        expect(result.proposals[0]?.targetKind).toBe('skill');
        expect(result.proposals[0]?.verificationPlan?.rollbackAvailable).toBe(true);
        expect(result.proposals[0]?.verificationPlan?.mustNotDecrease).toBe(true);
        expect(result.proposals[0]?.evidence?.length).toBeGreaterThan(0);
        expect(result.currentGrade).toBe('C');
        expect(result.predictedGrade).toBe('B');
        expect(result.targetKind).toBe('skill');
    });

    it('supports the shared analysis and run option base types', () => {
        const pattern: EvolutionPattern = {
            type: 'gap',
            source: 'ci-results',
            description: 'Coverage instructions are missing',
            evidence: ['Repeated CI failures mention uncovered cases'],
            confidence: 0.6,
            affectedSection: 'testing',
        };

        const options: EvolutionRunOptionsBase = {
            command: 'propose',
            safetyLevel: 'L1',
            confirm: false,
        };

        expect(pattern.affectedSection).toBe('testing');
        expect(options.command).toBe('propose');
        expect(options.safetyLevel).toBe('L1');
    });
});
