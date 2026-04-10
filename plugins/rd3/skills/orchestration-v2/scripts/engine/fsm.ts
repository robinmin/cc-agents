/**
 * orchestration-v2 — FSM Engine
 *
 * 5-state lifecycle state machine: IDLE → RUNNING → PAUSED/COMPLETED/failed.
 * FSM = lifecycle (kitchen open/closed), DAG = scheduling (ticket board).
 */

import type { FSMState, OrchestratorEvent } from '../model';
import { logger } from '../../../../scripts/logger';

export type FSMTransition =
    | 'run'
    | 'phase-complete'
    | 'phase-fail-reworkable'
    | 'human-gate'
    | 'all-blocked'
    | 'phase-fail-exhausted'
    | 'executor-unavailable'
    | 'all-phases-done'
    | 'resume-approve'
    | 'resume-reject';

export interface FSMTransitionResult {
    readonly fromState: FSMState;
    readonly toState: FSMState;
    readonly transition: FSMTransition;
    readonly events: OrchestratorEvent[];
}

export type FSMTransitionHandler = (result: FSMTransitionResult) => void;

export class FSMEngine {
    // biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
    constructor() {}
    private state: FSMState = 'IDLE';
    private handlers: FSMTransitionHandler[] = [];

    getState(): FSMState {
        return this.state;
    }

    onTransition(handler: FSMTransitionHandler): void {
        this.handlers.push(handler);
    }

    transition(transition: FSMTransition, _context?: Record<string, unknown>): FSMTransitionResult {
        const transitionMap: Partial<Record<FSMState, Partial<Record<FSMTransition, FSMState>>>> = {
            IDLE: { run: 'RUNNING' },
            RUNNING: {
                'phase-complete': 'RUNNING',
                'phase-fail-reworkable': 'RUNNING',
                'human-gate': 'PAUSED',
                'all-blocked': 'PAUSED',
                'phase-fail-exhausted': 'FAILED',
                'executor-unavailable': 'FAILED',
                'all-phases-done': 'COMPLETED',
            },
            PAUSED: {
                'resume-approve': 'RUNNING',
                'resume-reject': 'FAILED',
            },
        };

        const validTransition = transitionMap[this.state]?.[transition];
        if (validTransition === undefined) {
            logger.warn(`[fsm] Invalid transition "${transition}" from state "${this.state}" — no-op`);
        }
        const toState = validTransition ?? this.state;

        const result: FSMTransitionResult = {
            fromState: this.state,
            toState,
            transition,
            events: [],
        };
        this.state = result.toState;
        for (const handler of this.handlers) {
            handler(result);
        }
        return result;
    }

    reset(): void {
        this.state = 'IDLE';
    }
}
