/**
 * ftree — Feature status state machine
 *
 * Pure function validateTransition() + TRANSITION_MAP constant.
 * NOT a class — ftree is a stateless CLI, no lifecycle to manage.
 */

import type { FeatureStatus, TransitionMap } from '../types/feature';

/**
 * Valid status transitions map.
 * All other transitions are rejected.
 *
 * Roll-up rules (display-only):
 *   blocked > executing > validated > done > backlog
 *   (worst-case wins among children)
 */
export const TRANSITION_MAP: TransitionMap = {
    backlog: new Set(['validated', 'blocked']),
    validated: new Set(['executing', 'backlog', 'blocked']),
    executing: new Set(['done', 'blocked']),
    blocked: new Set(['backlog', 'validated', 'executing']),
    done: new Set(['blocked']),
} as const;

/**
 * Roll-up priority: higher index = worse status.
 */
const ROLLUP_PRIORITY: Record<FeatureStatus, number> = {
    backlog: 0,
    done: 1,
    validated: 2,
    executing: 3,
    blocked: 4,
};

/**
 * Validate whether a status transition is allowed.
 */
export function validateTransition(from: FeatureStatus, to: FeatureStatus): boolean {
    return TRANSITION_MAP[from]?.has(to) ?? false;
}

/**
 * Compute roll-up status from an array of child statuses.
 * Uses worst-case wins: blocked > executing > validated > done > backlog.
 */
export function computeRollupStatus(childStatuses: FeatureStatus[]): FeatureStatus {
    if (childStatuses.length === 0) {
        return 'backlog';
    }

    let worst: FeatureStatus = 'backlog';
    let worstPriority = ROLLUP_PRIORITY.backlog;

    for (const status of childStatuses) {
        const priority = ROLLUP_PRIORITY[status];
        if (priority > worstPriority) {
            worst = status;
            worstPriority = priority;
        }
    }

    return worst;
}

/**
 * Get all valid next statuses from a given status.
 */
export function getValidTransitions(from: FeatureStatus): FeatureStatus[] {
    return [...(TRANSITION_MAP[from] ?? new Set())];
}

/**
 * Get human-readable description of a transition.
 */
export function describeTransition(from: FeatureStatus, to: FeatureStatus): string {
    if (validateTransition(from, to)) {
        return `"${from}" → "${to}"`;
    }
    const valid = getValidTransitions(from);
    const validStr = valid.length > 0 ? valid.map((s) => `"${s}"`).join(', ') : '(none)';
    return `"${from}" → "${to}" is invalid. Valid transitions: ${validStr}`;
}
