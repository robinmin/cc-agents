#!/usr/bin/env bun
import { describe, expect, it } from 'bun:test';

import {
    calculateLetterGrade,
    getEvaluationDecisionState,
    getOperationDecisionState,
    getThresholdDecisionState,
    getValidationDecisionState,
    meetsPercentageThreshold,
} from '../scripts/grading';

describe('calculateLetterGrade', () => {
    it('returns A for 90% and above', () => {
        expect(calculateLetterGrade(90)).toBe('A');
        expect(calculateLetterGrade(95)).toBe('A');
        expect(calculateLetterGrade(100)).toBe('A');
    });

    it('returns B for 80-89%', () => {
        expect(calculateLetterGrade(80)).toBe('B');
        expect(calculateLetterGrade(85)).toBe('B');
        expect(calculateLetterGrade(89)).toBe('B');
    });

    it('returns C for 70-79%', () => {
        expect(calculateLetterGrade(70)).toBe('C');
        expect(calculateLetterGrade(75)).toBe('C');
        expect(calculateLetterGrade(79)).toBe('C');
    });

    it('returns D for 60-69%', () => {
        expect(calculateLetterGrade(60)).toBe('D');
        expect(calculateLetterGrade(65)).toBe('D');
        expect(calculateLetterGrade(69)).toBe('D');
    });

    it('returns F for below 60%', () => {
        expect(calculateLetterGrade(59)).toBe('F');
        expect(calculateLetterGrade(0)).toBe('F');
        expect(calculateLetterGrade(30)).toBe('F');
    });
});

describe('meetsPercentageThreshold', () => {
    it('passes when percentage equals threshold', () => {
        expect(meetsPercentageThreshold(70, 70)).toBe(true);
        expect(meetsPercentageThreshold(80, 80)).toBe(true);
    });

    it('passes when percentage exceeds threshold', () => {
        expect(meetsPercentageThreshold(71, 70)).toBe(true);
        expect(meetsPercentageThreshold(100, 70)).toBe(true);
    });

    it('fails when percentage is below threshold', () => {
        expect(meetsPercentageThreshold(69, 70)).toBe(false);
        expect(meetsPercentageThreshold(0, 70)).toBe(false);
    });

    it('uses default threshold of 70', () => {
        expect(meetsPercentageThreshold(70)).toBe(true);
        expect(meetsPercentageThreshold(69)).toBe(false);
    });
});

describe('getThresholdDecisionState', () => {
    it('returns PASS when threshold is met', () => {
        expect(getThresholdDecisionState(70, 70)).toBe('PASS');
        expect(getThresholdDecisionState(100, 70)).toBe('PASS');
    });

    it('returns WARN when threshold is not met', () => {
        expect(getThresholdDecisionState(69, 70)).toBe('WARN');
        expect(getThresholdDecisionState(0, 70)).toBe('WARN');
    });
});

describe('getEvaluationDecisionState', () => {
    it('returns BLOCK when rejected', () => {
        expect(getEvaluationDecisionState(true, true)).toBe('BLOCK');
        expect(getEvaluationDecisionState(false, true)).toBe('BLOCK');
    });

    it('returns PASS when passed and not rejected', () => {
        expect(getEvaluationDecisionState(true, false)).toBe('PASS');
    });

    it('returns WARN when not passed and not rejected', () => {
        expect(getEvaluationDecisionState(false, false)).toBe('WARN');
    });
});

describe('getValidationDecisionState', () => {
    it('returns BLOCK when valid is false', () => {
        expect(getValidationDecisionState(false, 0)).toBe('BLOCK');
        expect(getValidationDecisionState(false, 99)).toBe('BLOCK');
    });

    it('returns PASS when valid and no warnings', () => {
        expect(getValidationDecisionState(true, 0)).toBe('PASS');
    });

    it('returns WARN when valid but has warnings', () => {
        expect(getValidationDecisionState(true, 1)).toBe('WARN');
        expect(getValidationDecisionState(true, 99)).toBe('WARN');
    });
});

describe('getOperationDecisionState', () => {
    it('returns PASS when success is true', () => {
        expect(getOperationDecisionState(true)).toBe('PASS');
    });

    it('returns BLOCK when success is false', () => {
        expect(getOperationDecisionState(false)).toBe('BLOCK');
    });
});
