import { describe, test, expect, beforeAll } from 'bun:test';
import {
    OrchestratorError,
    EXIT_SUCCESS,
    EXIT_PIPELINE_FAILED,
    EXIT_PIPELINE_PAUSED,
    EXIT_INVALID_ARGS,
    EXIT_VALIDATION_FAILED,
    EXIT_TASK_NOT_FOUND,
    EXIT_STATE_ERROR,
    EXIT_EXECUTOR_UNAVAILABLE,
} from '../scripts/model';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('model — exit codes', () => {
    test('EXIT_SUCCESS is 0', () => {
        expect(EXIT_SUCCESS).toBe(0);
    });

    test('EXIT_PIPELINE_FAILED is 1', () => {
        expect(EXIT_PIPELINE_FAILED).toBe(1);
    });

    test('EXIT_PIPELINE_PAUSED is 2', () => {
        expect(EXIT_PIPELINE_PAUSED).toBe(2);
    });

    test('EXIT_INVALID_ARGS is 10', () => {
        expect(EXIT_INVALID_ARGS).toBe(10);
    });

    test('EXIT_VALIDATION_FAILED is 11', () => {
        expect(EXIT_VALIDATION_FAILED).toBe(11);
    });

    test('EXIT_TASK_NOT_FOUND is 12', () => {
        expect(EXIT_TASK_NOT_FOUND).toBe(12);
    });

    test('EXIT_STATE_ERROR is 13', () => {
        expect(EXIT_STATE_ERROR).toBe(13);
    });

    test('EXIT_EXECUTOR_UNAVAILABLE is 20', () => {
        expect(EXIT_EXECUTOR_UNAVAILABLE).toBe(20);
    });
});

describe('model — OrchestratorError', () => {
    test('config error has correct properties', () => {
        const err = new OrchestratorError('PIPELINE_NOT_FOUND', 'No pipeline.yaml found');
        expect(err.name).toBe('OrchestratorError');
        expect(err.code).toBe('PIPELINE_NOT_FOUND');
        expect(err.category).toBe('config');
        expect(err.exitCode).toBe(EXIT_VALIDATION_FAILED);
        expect(err.message).toBe('No pipeline.yaml found');
    });

    test('state error has correct category', () => {
        const err = new OrchestratorError('STATE_CORRUPT', 'DB is corrupted');
        expect(err.category).toBe('state');
        expect(err.exitCode).toBe(EXIT_STATE_ERROR);
    });

    test('execution error has correct category', () => {
        const err = new OrchestratorError('EXECUTOR_TIMEOUT', 'Phase timed out');
        expect(err.category).toBe('execution');
        expect(err.exitCode).toBe(EXIT_PIPELINE_FAILED);
    });

    test('verification error has correct category', () => {
        const err = new OrchestratorError('GATE_PENDING', 'Awaiting approval');
        expect(err.category).toBe('verification');
        expect(err.exitCode).toBe(EXIT_PIPELINE_PAUSED);
    });

    test('wraps cause error', () => {
        const cause = new Error('original');
        const err = new OrchestratorError('STATE_LOCKED', 'DB locked', cause);
        expect(err.cause).toBe(cause);
    });

    test('is instance of Error', () => {
        const err = new OrchestratorError('TASK_NOT_FOUND', 'Not found');
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(OrchestratorError);
    });

    test('all error codes map to valid exit codes', () => {
        const codes: Array<import('../scripts/model').ErrorCode> = [
            'PIPELINE_NOT_FOUND',
            'TASK_NOT_FOUND',
            'PRESET_NOT_FOUND',
            'PHASE_NOT_FOUND',
            'PIPELINE_VALIDATION_FAILED',
            'DAG_CYCLE_DETECTED',
            'EXTENDS_CIRCULAR',
            'EXTENDS_DEPTH_EXCEEDED',
            'STATE_CORRUPT',
            'STATE_LOCKED',
            'STATE_MIGRATION_NEEDED',
            'EXECUTOR_UNAVAILABLE',
            'EXECUTOR_TIMEOUT',
            'EXECUTOR_FAILED',
            'CHANNEL_UNAVAILABLE',
            'CONTRACT_VIOLATION',
            'GATE_FAILED',
            'GATE_PENDING',
            'REWORK_EXHAUSTED',
            'UNDO_UNCOMMITTED_CHANGES',
        ];
        for (const code of codes) {
            const err = new OrchestratorError(code, `test: ${code}`);
            expect(err.exitCode).toBeGreaterThanOrEqual(0);
            expect(err.category).toBeDefined();
        }
    });
});
