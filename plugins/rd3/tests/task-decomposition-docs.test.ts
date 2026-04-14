import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const RD3_ROOT = join(import.meta.dir, '..');
const TASK_DECOMPOSITION_ROOT = join(RD3_ROOT, 'skills', 'task-decomposition');

type Coordination = 'none' | 'moderate' | 'high';
type Risk = 'low' | 'medium' | 'high';
type Decision = 'skip' | 'should decompose' | 'must decompose';
type Override = 'none' | 'force-must-high-risk' | 'force-must-effort' | 'force-skip';

interface CorpusCase {
    id: string;
    expectedDecision: Decision;
    expectedOverride: Override;
    signals: {
        effortHours: number;
        deliverables: number;
        layers: number;
        coordination: Coordination;
        risk: Risk;
    };
    context: {
        singleModule: boolean;
        singleReviewRollbackBoundary: boolean;
    };
    requiredSubtasks?: string[];
    optionalSubtasks?: string[];
}

interface RubricResult {
    decision: Decision;
    override: Override;
    score: number;
}

function readTaskDecompositionFile(relativePath: string): string {
    return readFileSync(join(TASK_DECOMPOSITION_ROOT, relativePath), 'utf-8');
}

function scoreEffort(hours: number): number {
    if (hours <= 4) return 0;
    if (hours <= 8) return 1;
    if (hours <= 16) return 2;
    return 3;
}

function scoreDeliverables(count: number): number {
    if (count <= 1) return 0;
    if (count === 2) return 1;
    return 2;
}

function scoreLayers(count: number): number {
    if (count <= 1) return 0;
    if (count === 2) return 1;
    return 2;
}

function scoreCoordination(level: Coordination): number {
    return level === 'high' ? 2 : level === 'moderate' ? 1 : 0;
}

function scoreRisk(level: Risk): number {
    return level === 'high' ? 2 : level === 'medium' ? 1 : 0;
}

function applyRubric(corpusCase: CorpusCase): RubricResult {
    const { signals, context } = corpusCase;

    const score =
        scoreEffort(signals.effortHours) +
        scoreDeliverables(signals.deliverables) +
        scoreLayers(signals.layers) +
        scoreCoordination(signals.coordination) +
        scoreRisk(signals.risk);

    if (signals.risk === 'high') {
        return { decision: 'must decompose', override: 'force-must-high-risk', score };
    }

    if (signals.effortHours > 16) {
        return { decision: 'must decompose', override: 'force-must-effort', score };
    }

    if (
        score >= 3 &&
        score <= 4 &&
        context.singleModule &&
        context.singleReviewRollbackBoundary &&
        signals.deliverables === 1 &&
        signals.layers === 1 &&
        signals.coordination === 'none'
    ) {
        return { decision: 'skip', override: 'force-skip', score };
    }

    if (score >= 5) {
        return { decision: 'must decompose', override: 'none', score };
    }

    if (score >= 3) {
        return { decision: 'should decompose', override: 'none', score };
    }

    return { decision: 'skip', override: 'none', score };
}

function extractCorpusCases(content: string): CorpusCase[] {
    const matches = content.matchAll(/```yaml corpus-case\n([\s\S]*?)```/g);
    return Array.from(matches, (match) => YAML.parse(match[1]) as CorpusCase);
}

function extractCaseSections(content: string): string[] {
    const matches = content.matchAll(
        /## Case \d+:[\s\S]*?(?=\n---\n\n## Case \d+:|\n---\n\n## Validation Rules|\s*$)/g,
    );
    return Array.from(matches, (match) => match[0]);
}

function startsWithForbiddenPhaseLabel(taskName: string): boolean {
    return /^(audit|investigat|research|design|validation|test|testing|(?:add|write|create)\s+(?:unit\s+|integration\s+|regression\s+|e2e\s+|end-to-end\s+)?tests?)\b/i.test(
        taskName.trim(),
    );
}

describe('task-decomposition docs contract', () => {
    it('keeps the core policy docs aligned on thresholds and bug-fix guidance', () => {
        const skillDoc = readTaskDecompositionFile('SKILL.md');
        const decisionRules = readTaskDecompositionFile('references/decomposition-decision-rules.md');
        const rubric = readTaskDecompositionFile('references/rubric-model.md');
        const corePrinciples = readTaskDecompositionFile('references/core-principles.md');
        const antiPatterns = readTaskDecompositionFile('references/anti-patterns.md');
        const externalResources = readTaskDecompositionFile('references/external-resources.md');
        const patterns = readTaskDecompositionFile('references/patterns.md');
        const verificationProtocol = readTaskDecompositionFile('references/verification-protocol.md');

        expect(skillDoc).not.toContain('Single task with investigation subtasks');
        expect(skillDoc).toContain('never by investigation/design/test phases');
        expect(skillDoc).not.toContain('Create tasks smaller than 1 hour');
        expect(skillDoc).toContain('Create tasks smaller than 2 hours');

        expect(decisionRules).not.toContain('| D4 |');
        expect(decisionRules).not.toContain('| D5 |');
        expect(decisionRules).not.toContain('| D6 |');
        expect(decisionRules).toContain('Apply overrides in this exact order');
        expect(decisionRules).not.toContain('(< 8 hours)');

        expect(rubric).toContain('always wins over `force-skip`');
        expect(rubric).toContain('> 4 and ≤ 8');
        expect(rubric).toContain('> 8 and ≤ 16');
        expect(rubric).toContain('one review/rollback boundary');

        expect(skillDoc).not.toContain('Spike -> Core -> Security -> Testing');
        expect(patterns).not.toContain('Spike/Validation');
        expect(patterns).not.toContain('Testing & Rollout');
        expect(patterns).toContain('Validation artifact + sandbox contract');
        expect(patterns).toContain('Rollout guardrails + rollback path');

        for (const content of [corePrinciples, antiPatterns, externalResources, verificationProtocol]) {
            expect(content).not.toContain('< 1 hour');
            expect(content).not.toContain('Maximum task size: 8 hours');
        }
    });

    it('validates golden corpus decisions and override precedence against the rubric', () => {
        const corpusContent = readTaskDecompositionFile('references/golden-corpus.md');
        const corpusCases = extractCorpusCases(corpusContent);
        const sections = extractCaseSections(corpusContent);

        expect(corpusCases.length).toBe(13);
        expect(sections.length).toBe(13);

        const resultsById = new Map<string, RubricResult>();

        for (const [index, corpusCase] of corpusCases.entries()) {
            const result = applyRubric(corpusCase);
            const section = sections[index];
            resultsById.set(corpusCase.id, result);

            expect(result.decision).toBe(corpusCase.expectedDecision);
            expect(result.override).toBe(corpusCase.expectedOverride);
            expect(section).toContain(`**Expected Decision:** \`${corpusCase.expectedDecision}\``);

            for (const subtask of [
                ...(corpusCase.requiredSubtasks ?? []),
                ...(corpusCase.optionalSubtasks ?? []),
            ]) {
                expect(startsWithForbiddenPhaseLabel(subtask)).toBe(false);
            }
        }

        expect(resultsById.get('case-10')).toEqual({
            decision: 'must decompose',
            override: 'none',
            score: 5,
        });
        expect(resultsById.get('case-11')).toEqual({
            decision: 'must decompose',
            override: 'force-must-effort',
            score: 3,
        });
        expect(resultsById.get('case-12')).toEqual({
            decision: 'skip',
            override: 'force-skip',
            score: 3,
        });
        expect(resultsById.get('case-13')).toEqual({
            decision: 'should decompose',
            override: 'none',
            score: 3,
        });
    });
});
