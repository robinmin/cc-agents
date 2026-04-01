import { describe, test, expect, beforeAll } from 'bun:test';
import { FSMEngine } from '../scripts/engine/fsm';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('FSMEngine', () => {
    test('initial state is IDLE', () => {
        const fsm = new FSMEngine();
        expect(fsm.getState()).toBe('IDLE');
    });

    test("IDLE → RUNNING on 'run' transition", () => {
        const fsm = new FSMEngine();
        const result = fsm.transition('run');
        expect(result.fromState).toBe('IDLE');
        expect(result.toState).toBe('RUNNING');
        expect(fsm.getState()).toBe('RUNNING');
    });

    test("RUNNING → PAUSED on 'human-gate'", () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('human-gate');
        expect(result.toState).toBe('PAUSED');
        expect(fsm.getState()).toBe('PAUSED');
    });

    test("RUNNING → COMPLETED on 'all-phases-done'", () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('all-phases-done');
        expect(result.toState).toBe('COMPLETED');
        expect(fsm.getState()).toBe('COMPLETED');
    });

    test("RUNNING → FAILED on 'phase-fail-exhausted'", () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        const result = fsm.transition('phase-fail-exhausted');
        expect(result.toState).toBe('FAILED');
        expect(fsm.getState()).toBe('FAILED');
    });

    test("PAUSED → RUNNING on 'resume-approve'", () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        fsm.transition('human-gate');
        const result = fsm.transition('resume-approve');
        expect(result.toState).toBe('RUNNING');
        expect(fsm.getState()).toBe('RUNNING');
    });

    test("PAUSED → FAILED on 'resume-reject'", () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        fsm.transition('human-gate');
        const result = fsm.transition('resume-reject');
        expect(result.toState).toBe('FAILED');
        expect(fsm.getState()).toBe('FAILED');
    });

    test('onTransition handler receives events', () => {
        const fsm = new FSMEngine();
        const results: import('../scripts/engine/fsm').FSMTransitionResult[] = [];
        fsm.onTransition((r) => results.push(r));

        fsm.transition('run');
        fsm.transition('all-phases-done');

        expect(results).toHaveLength(2);
        expect(results[0].transition).toBe('run');
        expect(results[1].transition).toBe('all-phases-done');
    });

    test('reset returns to IDLE', () => {
        const fsm = new FSMEngine();
        fsm.transition('run');
        expect(fsm.getState()).toBe('RUNNING');
        fsm.reset();
        expect(fsm.getState()).toBe('IDLE');
    });

    test('unknown transition keeps current state', () => {
        const fsm = new FSMEngine();
        // COMPLETED state has no outgoing transitions
        fsm.transition('run');
        fsm.transition('all-phases-done');
        const result = fsm.transition('run'); // run from COMPLETED
        expect(result.toState).toBe('COMPLETED');
        expect(fsm.getState()).toBe('COMPLETED');
    });
});
