import { describe, test, expect } from 'bun:test';
import { ok, err, isOk, isErr } from '../../../scripts/libs/result';

describe('Result type', () => {
    test('ok() creates a successful result', () => {
        const result = ok(42);
        expect(isOk(result)).toBe(true);
        expect(isErr(result)).toBe(false);
        if (isOk(result)) {
            expect(result.value).toBe(42);
        }
    });

    test('err() creates an error result', () => {
        const result = err('something went wrong');
        expect(isErr(result)).toBe(true);
        expect(isOk(result)).toBe(false);
        if (isErr(result)) {
            expect(result.error).toBe('something went wrong');
        }
    });

    test('ok result with undefined value', () => {
        const result = ok(undefined);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            expect(result.value).toBe(undefined);
        }
    });

    test('err result with empty string error', () => {
        const result = err('');
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error).toBe('');
        }
    });

    test('ok result with object value', () => {
        const result = ok({ name: 'test', count: 5 });
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
            expect(result.value.name).toBe('test');
            expect(result.value.count).toBe(5);
        }
    });

    test('err result with Error object', () => {
        const result = err(new Error('fail'));
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
            expect(result.error).toBeInstanceOf(Error);
        }
    });
});
