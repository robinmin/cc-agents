import { describe, test, expect } from 'bun:test';
import { parseDuration, formatDuration, isOlderThan } from '../scripts/utils/time';
import {
    isValidWbs,
    isValidTaskRef,
    isValidPort,
    isValidCoverageThreshold,
    isValidPresetName,
} from '../scripts/utils/validation';

describe('utils/time', () => {
    describe('parseDuration', () => {
        test('parses minutes correctly', () => {
            expect(parseDuration('30m')).toBe(30 * 60 * 1000);
            expect(parseDuration('1m')).toBe(60 * 1000);
            expect(parseDuration('60m')).toBe(60 * 60 * 1000);
        });

        test('parses hours correctly', () => {
            expect(parseDuration('1h')).toBe(60 * 60 * 1000);
            expect(parseDuration('2h')).toBe(2 * 60 * 60 * 1000);
        });

        test('parses seconds correctly', () => {
            expect(parseDuration('30s')).toBe(30 * 1000);
            expect(parseDuration('120s')).toBe(120 * 1000);
        });

        test('defaults to minutes when no unit', () => {
            expect(parseDuration('30')).toBe(30 * 60 * 1000);
            expect(parseDuration('1')).toBe(60 * 1000);
        });

        test('returns default for invalid input', () => {
            expect(parseDuration(undefined)).toBe(30 * 60 * 1000);
            expect(parseDuration('invalid')).toBe(30 * 60 * 1000);
        });
    });

    describe('formatDuration', () => {
        test('formats milliseconds', () => {
            expect(formatDuration(500)).toBe('500ms');
        });

        test('formats seconds', () => {
            expect(formatDuration(30000)).toBe('30s');
        });

        test('formats minutes', () => {
            expect(formatDuration(5 * 60 * 1000)).toBe('5m');
        });

        test('formats hours', () => {
            expect(formatDuration(2 * 60 * 60 * 1000)).toBe('2h');
        });
    });

    describe('isOlderThan', () => {
        test('returns true for old timestamps', () => {
            const old = new Date(Date.now() - 1000);
            expect(isOlderThan(old, 500)).toBe(true);
        });

        test('returns false for recent timestamps', () => {
            const recent = new Date(Date.now() - 100);
            expect(isOlderThan(recent, 5000)).toBe(false);
        });
    });
});

describe('utils/validation', () => {
    describe('isValidWbs', () => {
        test('validates WBS numbers', () => {
            expect(isValidWbs('0300')).toBe(true);
            expect(isValidWbs('0331')).toBe(true);
            expect(isValidWbs('1000')).toBe(true);
        });

        test('validates WBS with suffix', () => {
            expect(isValidWbs('0300_task')).toBe(true);
            expect(isValidWbs('0300-task')).toBe(true);
        });

        test('rejects invalid WBS', () => {
            expect(isValidWbs('')).toBe(false);
            expect(isValidWbs('abc')).toBe(false);
            expect(isValidWbs('30')).toBe(true); // Valid (3 digits)
        });
    });

    describe('isValidTaskRef', () => {
        test('validates WBS numbers', () => {
            expect(isValidTaskRef('0300')).toBe(true);
            expect(isValidTaskRef('0330_task')).toBe(true);
        });

        test('validates file paths', () => {
            expect(isValidTaskRef('docs/tasks/0300.md')).toBe(true);
            expect(isValidTaskRef('./docs/tasks.md')).toBe(true);
            expect(isValidTaskRef('0300.md')).toBe(true);
        });

        test('rejects invalid refs', () => {
            expect(isValidTaskRef('')).toBe(false);
            expect(isValidTaskRef('abc')).toBe(false);
        });
    });

    describe('isValidPort', () => {
        test('validates port numbers', () => {
            expect(isValidPort(1)).toBe(true);
            expect(isValidPort(8080)).toBe(true);
            expect(isValidPort(65535)).toBe(true);
        });

        test('rejects invalid ports', () => {
            expect(isValidPort(0)).toBe(false);
            expect(isValidPort(65536)).toBe(false);
            expect(isValidPort(-1)).toBe(false);
        });
    });

    describe('isValidCoverageThreshold', () => {
        test('validates coverage thresholds', () => {
            expect(isValidCoverageThreshold(0)).toBe(true);
            expect(isValidCoverageThreshold(50)).toBe(true);
            expect(isValidCoverageThreshold(100)).toBe(true);
        });

        test('rejects invalid thresholds', () => {
            expect(isValidCoverageThreshold(-1)).toBe(false);
            expect(isValidCoverageThreshold(101)).toBe(false);
        });
    });

    describe('isValidPresetName', () => {
        test('validates preset names', () => {
            expect(isValidPresetName('simple')).toBe(true);
            expect(isValidPresetName('standard')).toBe(true);
            expect(isValidPresetName('complex-123')).toBe(true);
        });

        test('rejects invalid preset names', () => {
            expect(isValidPresetName('')).toBe(false);
            expect(isValidPresetName('123')).toBe(false); // Starts with number
            expect(isValidPresetName('_hidden')).toBe(false); // Starts with underscore
        });
    });
});
