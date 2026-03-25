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
import {
    type ValidationFindingAccumulator,
    addValidationFinding,
    createValidationFinding,
} from '../scripts/validation-findings';

type TestFinding = {
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    suggestion?: string;
};

describe('validation-findings shared helpers', () => {
    it('creates structured findings with optional metadata', () => {
        const finding = createValidationFinding<TestFinding>(
            'warning',
            'Description is short',
            'description',
            'Expand it',
        );

        expect(finding).toEqual({
            severity: 'warning',
            message: 'Description is short',
            field: 'description',
            suggestion: 'Expand it',
        });
    });

    it('accumulates errors and warnings without promoting info findings', () => {
        const report: ValidationFindingAccumulator<TestFinding> = {
            errors: [],
            warnings: [],
            findings: [],
        };

        addValidationFinding(report, 'error', 'Missing required field', 'name');
        addValidationFinding(report, 'warning', 'Description is short', 'description');
        addValidationFinding(report, 'info', 'TODO marker found');

        expect(report.errors).toEqual(['Missing required field']);
        expect(report.warnings).toEqual(['Description is short']);
        expect(report.findings).toHaveLength(3);
        expect(report.findings[2]?.severity).toBe('info');
    });

    it('accumulates suggestions when the report exposes a suggestion bucket', () => {
        const report: ValidationFindingAccumulator<{
            severity: 'error' | 'warning' | 'suggestion';
            message: string;
            suggestion?: string;
        }> = {
            errors: [],
            warnings: [],
            suggestions: [],
            findings: [],
        };

        addValidationFinding(report, 'suggestion', 'Consider splitting the config');

        expect(report.suggestions).toEqual(['Consider splitting the config']);
        expect(report.findings[0]?.severity).toBe('suggestion');
    });
});

describe('grading shared helpers', () => {
    it('maps percentage bands to letter grades', () => {
        expect(calculateLetterGrade(95)).toBe('A');
        expect(calculateLetterGrade(85)).toBe('B');
        expect(calculateLetterGrade(75)).toBe('C');
        expect(calculateLetterGrade(65)).toBe('D');
        expect(calculateLetterGrade(55)).toBe('F');
    });

    it('evaluates pass thresholds with a shared default and overrides', () => {
        expect(meetsPercentageThreshold(70)).toBe(true);
        expect(meetsPercentageThreshold(69)).toBe(false);
        expect(meetsPercentageThreshold(75, 75)).toBe(true);
        expect(meetsPercentageThreshold(74, 75)).toBe(false);
    });

    it('maps evaluation and validation outcomes onto shared decision states', () => {
        expect(getThresholdDecisionState(70)).toBe('PASS');
        expect(getThresholdDecisionState(69)).toBe('WARN');
        expect(getEvaluationDecisionState(true)).toBe('PASS');
        expect(getEvaluationDecisionState(false)).toBe('WARN');
        expect(getEvaluationDecisionState(false, true)).toBe('BLOCK');
        expect(getOperationDecisionState(true)).toBe('PASS');
        expect(getOperationDecisionState(false)).toBe('BLOCK');
        expect(getValidationDecisionState(false, 0)).toBe('BLOCK');
        expect(getValidationDecisionState(true, 2)).toBe('WARN');
        expect(getValidationDecisionState(true, 0)).toBe('PASS');
    });
});
