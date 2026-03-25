/**
 * Shared grading helpers for rd3 evaluation and evolution workflows.
 */

export const LETTER_GRADES = ['A', 'B', 'C', 'D', 'F'] as const;
export const DEFAULT_PASS_PERCENTAGE = 70;
export const DECISION_STATES = ['BLOCK', 'WARN', 'PASS'] as const;

export type LetterGrade = (typeof LETTER_GRADES)[number];
export type DecisionState = (typeof DECISION_STATES)[number];

export function calculateLetterGrade(percentage: number): LetterGrade {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
}

export function meetsPercentageThreshold(percentage: number, threshold = DEFAULT_PASS_PERCENTAGE): boolean {
    return percentage >= threshold;
}

export function getThresholdDecisionState(
    percentage: number,
    threshold = DEFAULT_PASS_PERCENTAGE,
): Exclude<DecisionState, 'BLOCK'> {
    return meetsPercentageThreshold(percentage, threshold) ? 'PASS' : 'WARN';
}

export function getEvaluationDecisionState(passed: boolean, rejected = false): DecisionState {
    if (rejected) {
        return 'BLOCK';
    }

    return passed ? 'PASS' : 'WARN';
}

export function getValidationDecisionState(valid: boolean, warningCount = 0): DecisionState {
    if (!valid) {
        return 'BLOCK';
    }

    return warningCount > 0 ? 'WARN' : 'PASS';
}

export function getOperationDecisionState(success: boolean): Exclude<DecisionState, 'WARN'> {
    return success ? 'PASS' : 'BLOCK';
}
