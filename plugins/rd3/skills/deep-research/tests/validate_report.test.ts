import { describe, expect, test, beforeAll } from 'bun:test';
import { join } from 'node:path';
import { ReportValidator } from '../scripts/validate_report';

// Suppress logger output during tests
import { setGlobalSilent } from '../../../scripts/logger';
beforeAll(() => {
    setGlobalSilent(true);
});

const fixturesPath = join(import.meta.dir, 'fixtures');
const validReportPath = join(fixturesPath, 'valid_report.md');
const invalidReportPath = join(fixturesPath, 'invalid_report.md');

describe('ReportValidator — valid report', () => {
    test('passes validation with no errors', () => {
        const validator = new ReportValidator(validReportPath);
        const result = validator.validate();
        expect(result.passed).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('detects all required sections present', () => {
        const validator = new ReportValidator(validReportPath);
        const result = validator.validate();
        const sectionError = result.errors.find((e) => e.includes('Missing sections'));
        expect(sectionError).toBeUndefined();
    });

    test('detects citations present', () => {
        const validator = new ReportValidator(validReportPath);
        const result = validator.validate();
        const citationError = result.errors.find((e) => e.includes('No citations'));
        expect(citationError).toBeUndefined();
    });

    test('detects bibliography entries', () => {
        const validator = new ReportValidator(validReportPath);
        const result = validator.validate();
        const bibError = result.errors.find((e) => e.includes('Bibliography'));
        expect(bibError).toBeUndefined();
    });
});

describe('ReportValidator — invalid report', () => {
    test('fails validation with errors', () => {
        const validator = new ReportValidator(invalidReportPath);
        const result = validator.validate();
        expect(result.passed).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    test('detects placeholder text (TBD, TODO)', () => {
        const validator = new ReportValidator(invalidReportPath);
        const result = validator.validate();
        const placeholderError = result.errors.find((e) => e.includes('placeholder'));
        expect(placeholderError).toBeDefined();
    });

    test('detects missing required sections', () => {
        const validator = new ReportValidator(invalidReportPath);
        const result = validator.validate();
        const sectionError = result.errors.find((e) => e.includes('Missing sections'));
        expect(sectionError).toBeDefined();
    });

    test('detects missing bibliography entries for citations', () => {
        const validator = new ReportValidator(invalidReportPath);
        const result = validator.validate();
        const bibError = result.errors.find(
            (e) => e.includes('Bibliography') || e.includes('bibliography') || e.includes('Citations missing'),
        );
        expect(bibError).toBeDefined();
    });

    test('generates warnings for short executive summary', () => {
        const validator = new ReportValidator(invalidReportPath);
        const result = validator.validate();
        const shortWarning = result.warnings.find((e) => e.includes('too short'));
        expect(shortWarning).toBeDefined();
    });
});
