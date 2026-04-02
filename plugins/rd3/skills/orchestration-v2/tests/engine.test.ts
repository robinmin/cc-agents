import { describe, test, expect, beforeAll } from 'bun:test';
import { DAGScheduler, validatePhaseSubset } from '../scripts/engine/dag';
import type { PhaseDefinition } from '../scripts/model';

const DEFAULT_PHASES: Record<string, PhaseDefinition> = {
    intake: { skill: 'rd3:request-intake', gate: { type: 'auto' }, timeout: '30m' },
    arch: { skill: 'rd3:backend-architect', gate: { type: 'auto' }, timeout: '1h', after: ['intake'] },
    design: { skill: 'rd3:backend-design', gate: { type: 'auto' }, timeout: '1h', after: ['arch'] },
    decompose: { skill: 'rd3:task-decomposition', gate: { type: 'auto' }, timeout: '30m', after: ['design'] },
    implement: {
        skill: 'rd3:code-implement-common',
        gate: { type: 'auto', rework: { max_iterations: 2, escalation: 'pause' } },
        timeout: '2h',
        after: ['decompose'],
    },
    test: {
        skill: 'rd3:sys-testing',
        gate: { type: 'auto', rework: { max_iterations: 3, escalation: 'pause' } },
        timeout: '1h',
        after: ['implement'],
    },
    review: { skill: 'rd3:code-review-common', gate: { type: 'human' }, after: ['test'] },
};

import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('DAGScheduler', () => {
    test('buildFromPhases creates nodes', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        const nodes = dag.getNodes();
        expect(nodes.size).toBe(7);
        expect(nodes.has('intake')).toBe(true);
        expect(nodes.has('review')).toBe(true);
    });

    test('intake has no dependencies', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        const intake = dag.getNodes().get('intake');
        expect(intake?.dependencies).toEqual([]);
    });

    test('implement depends on decompose', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        const impl = dag.getNodes().get('implement');
        expect(impl?.dependencies).toEqual(['decompose']);
    });

    test('evaluate returns intake as ready initially', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        const eval0 = dag.evaluate();
        expect(eval0.ready).toEqual(['intake']);
        expect(eval0.blocked.length).toBeGreaterThan(0);
    });

    test('markCompleted cascades to ready phases', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);

        dag.markCompleted('intake');
        const eval1 = dag.evaluate();
        expect(eval1.ready).toEqual(['arch']);

        dag.markCompleted('arch');
        const eval2 = dag.evaluate();
        expect(eval2.ready).toEqual(['design']);
    });

    test('full sequential pipeline progression', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);

        const order: string[] = [];
        for (let i = 0; i < 7; i++) {
            const eval_ = dag.evaluate();
            if (eval_.ready.length === 0) break;
            for (const phase of eval_.ready) {
                order.push(phase);
                dag.markCompleted(phase);
            }
        }

        expect(order).toEqual(['intake', 'arch', 'design', 'decompose', 'implement', 'test', 'review']);
    });

    test('parallel phases become ready together', () => {
        const phases: Record<string, PhaseDefinition> = {
            a: { skill: 'test' },
            b: { skill: 'test' },
            c: { skill: 'test', after: ['a', 'b'] },
        };
        const dag = new DAGScheduler();
        dag.buildFromPhases(phases);

        const eval0 = dag.evaluate();
        expect(eval0.ready).toEqual(['a', 'b']);

        dag.markCompleted('a');
        dag.markCompleted('b');
        const eval1 = dag.evaluate();
        expect(eval1.ready).toEqual(['c']);
    });

    test('markFailed blocks downstream', () => {
        const phases: Record<string, PhaseDefinition> = {
            a: { skill: 'test' },
            b: { skill: 'test', after: ['a'] },
        };
        const dag = new DAGScheduler();
        dag.buildFromPhases(phases);

        dag.markFailed('a');
        const eval_ = dag.evaluate();
        expect(eval_.ready).toEqual([]);
    });

    test('markPaused keeps downstream blocked', () => {
        const phases: Record<string, PhaseDefinition> = {
            a: { skill: 'test' },
            b: { skill: 'test', after: ['a'] },
        };
        const dag = new DAGScheduler();
        dag.buildFromPhases(phases);

        dag.markRunning('a');
        dag.markPaused('a');
        const eval_ = dag.evaluate();
        expect(eval_.ready).toEqual([]);
    });

    test('topologicalSort returns all phases', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        const sorted = dag.topologicalSort();
        expect(sorted).toHaveLength(7);
        expect(sorted.indexOf('intake')).toBeLessThan(sorted.indexOf('arch'));
        expect(sorted.indexOf('arch')).toBeLessThan(sorted.indexOf('design'));
        expect(sorted.indexOf('implement')).toBeLessThan(sorted.indexOf('test'));
    });

    test('hasCycle returns false for valid DAG', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases(DEFAULT_PHASES);
        expect(dag.hasCycle()).toBe(false);
    });

    test('node state transitions', () => {
        const dag = new DAGScheduler();
        dag.buildFromPhases({ a: { skill: 'test' } });

        const node = dag.getNodes().get('a');
        expect(node?.state).toBe('pending');

        dag.markRunning('a');
        expect(node?.state).toBe('running');

        dag.markCompleted('a');
        expect(node?.state).toBe('completed');
    });
});

describe('validatePhaseSubset', () => {
    const phases: Record<string, PhaseDefinition> = {
        intake: { skill: 'rd3:request-intake', gate: { type: 'auto' } },
        plan: { skill: 'rd3:dev-plan', gate: { type: 'auto' }, after: ['intake'] },
        implement: { skill: 'rd3:code-implement-common', gate: { type: 'auto' }, after: ['plan'] },
        test: { skill: 'rd3:sys-testing', gate: { type: 'auto' }, after: ['implement'] },
        review: { skill: 'rd3:code-review-common', gate: { type: 'human' }, after: ['test'] },
    };

    test('valid subgraph — all deps present in requested set', () => {
        const requested = new Set(['implement', 'test', 'review']);
        // implement depends on plan, which is NOT in the set — invalid
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(false);
        expect(result.missingDeps).toHaveLength(1);
        expect(result.missingDeps[0]).toEqual({ phase: 'implement', missingDependency: 'plan' });
    });

    test('valid subgraph — all deps satisfied', () => {
        const requested = new Set(['intake', 'plan', 'implement', 'test']);
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(true);
        expect(result.missingDeps).toHaveLength(0);
    });

    test('valid subgraph with pre-completed deps', () => {
        // implement needs plan — plan is not in requested set but is completed
        const requested = new Set(['implement', 'test']);
        const completed = new Set(['plan']);
        const result = validatePhaseSubset(requested, phases, completed);
        expect(result.valid).toBe(true);
        expect(result.missingDeps).toHaveLength(0);
    });

    test('invalid subgraph — missing deps', () => {
        const requested = new Set(['review']);
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(false);
        // review depends on test, which depends on implement, which depends on plan, which depends on intake
        // Only the immediate dependency is reported (test)
        expect(result.missingDeps).toHaveLength(1);
        expect(result.missingDeps[0]).toEqual({ phase: 'review', missingDependency: 'test' });
    });

    test('empty phase list edge case', () => {
        const requested = new Set<string>();
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(true);
        expect(result.missingDeps).toHaveLength(0);
    });

    test('single phase with no deps is valid', () => {
        const requested = new Set(['intake']);
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(true);
    });

    test('multiple missing deps reported', () => {
        const requested = new Set(['test', 'review']);
        const result = validatePhaseSubset(requested, phases);
        expect(result.valid).toBe(false);
        // test needs implement, review needs test (but test is in set)
        expect(result.missingDeps).toHaveLength(1);
        expect(result.missingDeps[0]).toEqual({ phase: 'test', missingDependency: 'implement' });
    });
});
