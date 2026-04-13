import { describe, expect, test } from 'bun:test';
import {
    computeRollupStatus,
    describeTransition,
    getValidTransitions,
    TRANSITION_MAP,
    validateTransition,
} from '../../src/lib/state-machine';
import type { FeatureStatus } from '../../src/types/feature';

describe('State Machine', () => {
    describe('validateTransition', () => {
        test('backlog → validated is valid', () => {
            expect(validateTransition('backlog', 'validated')).toBe(true);
        });

        test('backlog → blocked is valid', () => {
            expect(validateTransition('backlog', 'blocked')).toBe(true);
        });

        test('backlog → executing is invalid', () => {
            expect(validateTransition('backlog', 'executing')).toBe(false);
        });

        test('backlog → done is invalid', () => {
            expect(validateTransition('backlog', 'done')).toBe(false);
        });

        test('validated → executing is valid', () => {
            expect(validateTransition('validated', 'executing')).toBe(true);
        });

        test('validated → backlog is valid', () => {
            expect(validateTransition('validated', 'backlog')).toBe(true);
        });

        test('validated → blocked is valid', () => {
            expect(validateTransition('validated', 'blocked')).toBe(true);
        });

        test('validated → done is invalid', () => {
            expect(validateTransition('validated', 'done')).toBe(false);
        });

        test('executing → done is valid', () => {
            expect(validateTransition('executing', 'done')).toBe(true);
        });

        test('executing → blocked is valid', () => {
            expect(validateTransition('executing', 'blocked')).toBe(true);
        });

        test('executing → backlog is invalid', () => {
            expect(validateTransition('executing', 'backlog')).toBe(false);
        });

        test('blocked → backlog is valid', () => {
            expect(validateTransition('blocked', 'backlog')).toBe(true);
        });

        test('blocked → validated is valid', () => {
            expect(validateTransition('blocked', 'validated')).toBe(true);
        });

        test('blocked → executing is valid', () => {
            expect(validateTransition('blocked', 'executing')).toBe(true);
        });

        test('blocked → done is invalid', () => {
            expect(validateTransition('blocked', 'done')).toBe(false);
        });

        test('done → blocked is valid', () => {
            expect(validateTransition('done', 'blocked')).toBe(true);
        });

        test('done → backlog is invalid', () => {
            expect(validateTransition('done', 'backlog')).toBe(false);
        });

        test('same status transitions are invalid', () => {
            const statuses: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];
            for (const status of statuses) {
                expect(validateTransition(status, status)).toBe(false);
            }
        });
    });

    describe('computeRollupStatus', () => {
        test('empty array returns backlog', () => {
            expect(computeRollupStatus([])).toBe('backlog');
        });

        test('single backlog returns backlog', () => {
            expect(computeRollupStatus(['backlog'])).toBe('backlog');
        });

        test('single done returns done', () => {
            expect(computeRollupStatus(['done'])).toBe('done');
        });

        test('priorities: blocked > executing > validated > done > backlog', () => {
            expect(computeRollupStatus(['backlog', 'done'])).toBe('done');
            expect(computeRollupStatus(['done', 'validated'])).toBe('validated');
            expect(computeRollupStatus(['validated', 'executing'])).toBe('executing');
            expect(computeRollupStatus(['executing', 'blocked'])).toBe('blocked');
        });

        test('worst-case wins among many children', () => {
            expect(computeRollupStatus(['backlog', 'backlog', 'done'])).toBe('done');
            expect(computeRollupStatus(['done', 'validated', 'backlog'])).toBe('validated');
            expect(computeRollupStatus(['backlog', 'done', 'executing'])).toBe('executing');
            expect(computeRollupStatus(['blocked', 'done', 'validated', 'executing'])).toBe('blocked');
        });
    });

    describe('getValidTransitions', () => {
        test('backlog valid transitions', () => {
            expect(getValidTransitions('backlog')).toEqual(['validated', 'blocked']);
        });

        test('validated valid transitions', () => {
            expect(getValidTransitions('validated')).toEqual(['executing', 'backlog', 'blocked']);
        });

        test('executing valid transitions', () => {
            expect(getValidTransitions('executing')).toEqual(['done', 'blocked']);
        });

        test('blocked valid transitions', () => {
            expect(getValidTransitions('blocked')).toEqual(['backlog', 'validated', 'executing']);
        });

        test('done valid transitions', () => {
            expect(getValidTransitions('done')).toEqual(['blocked']);
        });
    });

    describe('describeTransition', () => {
        test('valid transition description', () => {
            expect(describeTransition('backlog', 'validated')).toBe('"backlog" → "validated"');
        });

        test('invalid transition shows valid options', () => {
            const desc = describeTransition('backlog', 'done');
            expect(desc).toContain('invalid');
            expect(desc).toContain('"backlog"');
            expect(desc).toContain('"done"');
        });
    });

    describe('TRANSITION_MAP', () => {
        test('has entries for all statuses', () => {
            const statuses: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];
            for (const status of statuses) {
                expect(TRANSITION_MAP[status]).toBeDefined();
                expect(TRANSITION_MAP[status]).toBeInstanceOf(Set);
            }
        });

        test('all transitions in map are valid', () => {
            const statuses: FeatureStatus[] = ['backlog', 'validated', 'executing', 'done', 'blocked'];
            for (const from of statuses) {
                for (const to of TRANSITION_MAP[from]) {
                    expect(validateTransition(from, to)).toBe(true);
                }
            }
        });
    });
});
