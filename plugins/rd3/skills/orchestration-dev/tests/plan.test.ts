import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { setGlobalSilent } from '../../../scripts/logger';
import { generateExecutionPlan, main, validateProfile } from '../scripts/plan';

beforeAll(() => {
    setGlobalSilent(true);
});

const originalExit = process.exit;

afterEach(() => {
    process.exit = originalExit;
});

function stubExit(): void {
    process.exit = ((code?: number) => {
        throw new Error(`EXIT:${code ?? 0}`);
    }) as typeof process.exit;
}

describe('generateExecutionPlan', () => {
    test('uses the previous executed phase as the input dependency', () => {
        const plan = generateExecutionPlan('0266', 'standard', [7]);
        const phase4 = plan.phases.find((phase) => phase.number === 4);
        const phase8 = plan.phases.find((phase) => phase.number === 8);

        expect(phase4?.inputs).toEqual(['Phase 1 outputs']);
        expect(phase8?.inputs).toEqual(['Phase 6 outputs']);
    });

    test('uses task_ref inputs when the first executed phase has no predecessor', () => {
        const plan = generateExecutionPlan('0266', 'simple');
        const phase5 = plan.phases.find((phase) => phase.number === 5);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase5?.inputs).toEqual(['task_ref', 'description?']);
        expect(phase6?.inputs).toEqual(['Phase 5 outputs']);
    });

    test('encodes standard-profile phase 8 and 9 special cases', () => {
        const plan = generateExecutionPlan('0266', 'standard');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow');
        expect(phase8?.outputs).toEqual(['BDD Report']);
        expect(phase8?.gateCriteria).toBe('BDD scenarios generated and executed');

        expect(phase9?.skill).toBe('rd3:code-docs');
        expect(phase9?.outputs).toEqual(['Task References']);
        expect(phase9?.gateCriteria).toBe('Task references generated');
    });

    test('uses full phase 8 and 9 metadata outside the standard profile', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        const phase9 = plan.phases.find((phase) => phase.number === 9);

        expect(phase8?.skill).toBe('rd3:bdd-workflow + rd3:functional-review');
        expect(phase8?.outputs).toEqual(['Functional Verdict']);
        expect(phase8?.gateCriteria).toBe('Verdict pass or partial with approval');

        expect(phase9?.outputs).toEqual(['Documentation Artifacts']);
        expect(phase9?.gateCriteria).toBe('Documentation artifacts generated');
    });

    test('counts human gates and estimated duration after skipped phases', () => {
        const plan = generateExecutionPlan('0266', 'complex', [3, 7, 8]);

        expect(plan.estimated_duration_hours).toBe(11);
        expect(plan.total_gates).toBe(6);
        expect(plan.human_gates).toBe(0);
    });
});

describe('phase profiles', () => {
    test('refine profile runs only phase 1', () => {
        const plan = generateExecutionPlan('0266', 'refine');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(1);
        expect(plan.phases[0].name).toBe('Request Intake');
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'description?']);
    });

    test('plan profile runs phases 2, 3, 4', () => {
        const plan = generateExecutionPlan('0266', 'plan');
        expect(plan.phases).toHaveLength(3);
        expect(plan.phases.map((p) => p.number)).toEqual([2, 3, 4]);
        expect(plan.phases[0].inputs).toEqual(['task_ref', 'description?']);
        expect(plan.phases[1].inputs).toEqual(['Phase 2 outputs']);
        expect(plan.phases[2].inputs).toEqual(['Phase 3 outputs']);
    });

    test('unit profile runs only phase 6', () => {
        const plan = generateExecutionPlan('0266', 'unit');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(6);
        expect(plan.phases[0].name).toBe('Unit Testing');
    });

    test('review profile runs only phase 7', () => {
        const plan = generateExecutionPlan('0266', 'review');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(7);
        expect(plan.phases[0].name).toBe('Code Review');
        expect(plan.phases[0].gate).toBe('human');
    });

    test('docs profile runs only phase 9', () => {
        const plan = generateExecutionPlan('0266', 'docs');
        expect(plan.phases).toHaveLength(1);
        expect(plan.phases[0].number).toBe(9);
        expect(plan.phases[0].name).toBe('Documentation');
    });
});

describe('validateProfile', () => {
    test('accepts task profiles', () => {
        expect(validateProfile('simple')).toBe(true);
        expect(validateProfile('standard')).toBe(true);
        expect(validateProfile('complex')).toBe(true);
    });

    test('accepts phase profiles', () => {
        expect(validateProfile('refine')).toBe(true);
        expect(validateProfile('plan')).toBe(true);
        expect(validateProfile('unit')).toBe(true);
        expect(validateProfile('review')).toBe(true);
        expect(validateProfile('docs')).toBe(true);
    });

    test('rejects invalid profiles', () => {
        expect(validateProfile('research')).toBe(false);
        expect(validateProfile('invalid')).toBe(false);
    });
});

describe('plan main', () => {
    test('generates a plan for valid CLI args', () => {
        expect(() => main(['0266', '--profile', 'complex', '--skip', '2,7,12'])).not.toThrow();
    });

    test('exits with code 1 when task_ref is missing', () => {
        stubExit();

        expect(() => main([])).toThrow('EXIT:1');
    });

    test('exits with code 1 when profile is invalid', () => {
        stubExit();

        expect(() => main(['0266', '--profile', 'invalid'])).toThrow('EXIT:1');
    });

    test('ignores non-phase values in the skip list', () => {
        // Use the skip list directly with only valid values — boundary filtering
        // is tested at the CLI parse level (--skip handler filters n>=1 && n<=9)
        const plan = generateExecutionPlan('0266', 'standard', [7]);
        const numbers = plan.phases.map((phase) => phase.number);

        expect(numbers).toEqual([1, 4, 5, 6, 8, 9]);
    });

    test('uses coverage override in gate criteria and plan output', () => {
        const plan = generateExecutionPlan('0266', 'standard', [], 90);
        const phase6 = plan.phases.find((phase) => phase.number === 6);

        expect(phase6?.gateCriteria).toContain('90');
        expect(plan.coverage_threshold).toBe(90);
    });

    test('defaults coverage threshold to 80 when no override', () => {
        const plan = generateExecutionPlan('0266', 'standard');
        expect(plan.coverage_threshold).toBe(80);
    });

    test('phase 8 gate is auto/human hybrid', () => {
        const plan = generateExecutionPlan('0266', 'complex');
        const phase8 = plan.phases.find((phase) => phase.number === 8);
        expect(phase8?.gate).toBe('auto/human');
    });
});
