import { describe, test, expect } from 'bun:test';
import { OrchestratorError, ERROR_CODES, createError, formatError } from '../scripts/errors';

describe('errors', () => {
    describe('OrchestratorError', () => {
        test('creates error with all properties', () => {
            const error = new OrchestratorError('Test error', 'TEST_CODE', 1, 'validation');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.exitCode).toBe(1);
            expect(error.category).toBe('validation');
            expect(error.name).toBe('OrchestratorError');
        });

        test('defaults category to unknown', () => {
            const error = new OrchestratorError('Test', 'TEST', 1);
            expect(error.category).toBe('unknown');
        });
    });

    describe('ERROR_CODES', () => {
        test('has all required error codes', () => {
            expect(ERROR_CODES.INVALID_ARGS).toBeDefined();
            expect(ERROR_CODES.VALIDATION_FAILED).toBeDefined();
            expect(ERROR_CODES.TASK_NOT_FOUND).toBeDefined();
            expect(ERROR_CODES.STATE_ERROR).toBeDefined();
            expect(ERROR_CODES.EXECUTOR_UNAVAILABLE).toBeDefined();
            expect(ERROR_CODES.CONFIG_NOT_FOUND).toBeDefined();
            expect(ERROR_CODES.INVALID_CONFIG).toBeDefined();
            expect(ERROR_CODES.PIPELINE_FAILED).toBeDefined();
            expect(ERROR_CODES.PIPELINE_PAUSED).toBeDefined();
        });

        test('each error code has correct structure', () => {
            for (const [_key, errorDef] of Object.entries(ERROR_CODES)) {
                expect(errorDef.code).toBeDefined();
                expect(errorDef.exitCode).toBeDefined();
                expect(errorDef.category).toBeDefined();
                expect(errorDef.message).toBeDefined();
                expect(typeof errorDef.code).toBe('string');
                expect(typeof errorDef.exitCode).toBe('number');
                expect(typeof errorDef.category).toBe('string');
                expect(typeof errorDef.message).toBe('string');
            }
        });
    });

    describe('createError', () => {
        test('creates error with default message', () => {
            const error = createError('TASK_NOT_FOUND');
            expect(error.code).toBe('TASK_NOT_FOUND');
            expect(error.exitCode).toBe(12);
            expect(error.message).toBe('Task not found');
        });

        test('creates error with custom message', () => {
            const error = createError('TASK_NOT_FOUND', 'Custom message');
            expect(error.message).toBe('Custom message');
        });
    });

    describe('formatError', () => {
        test('formats OrchestratorError', () => {
            const error = new OrchestratorError('Test error', 'TEST', 1);
            expect(formatError(error)).toBe('TEST: Test error');
        });

        test('formats Error', () => {
            const error = new Error('Regular error');
            expect(formatError(error)).toBe('Error: Regular error');
        });

        test('formats string', () => {
            expect(formatError('simple string')).toBe('simple string');
        });
    });
});
