/**
 * Tests for module-name
 */

import { functionName } from './module-name';

describe('functionName', () => {
    test('smoke test', () => {
        const result = functionName('test', 10);
        expect(result).toBeDefined();
        expect(result).toHaveProperty('key1');
        expect(result).toHaveProperty('key2');
    });

    test('processes valid input correctly', () => {
        const result = functionName('hello', 42);

        expect(result.key1).toBe('processed_hello');
        expect(result.key2).toBe(84);
    });

    test('throws error for empty string', () => {
        expect(() => functionName('', 10))
            .toThrow('param1 cannot be empty');
    });

    test('throws error for negative number', () => {
        expect(() => functionName('test', -1))
            .toThrow('param2 must be non-negative');
    });

    test('handles zero correctly', () => {
        const result = functionName('test', 0);
        expect(result.key2).toBe(0);
    });

    test('handles large numbers', () => {
        const result = functionName('test', 1000000);
        expect(result.key2).toBe(2000000);
    });

    // Parametrized tests
    test.each([
        ['hello', 10, 'processed_hello', 20],
        ['world', 5, 'processed_world', 10],
        ['test', 0, 'processed_test', 0],
    ])('processes %s and %d correctly', (inputStr, inputNum, expectedKey1, expectedKey2) => {
        const result = functionName(inputStr, inputNum);
        expect(result.key1).toBe(expectedKey1);
        expect(result.key2).toBe(expectedKey2);
    });
});
