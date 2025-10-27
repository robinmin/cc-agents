/**
 * [Brief description of what this module does]
 */

/**
 * [Brief description of what the function does].
 *
 * @param param1 - [Description of param1]
 * @param param2 - [Description of param2]
 * @returns Object containing processed results
 * @throws {Error} If param1 is empty or param2 is negative
 *
 * @example
 * const result = functionName('example', 42);
 * // Returns: { key1: 'processed_example', key2: 84 }
 */
export function functionName(param1: string, param2: number): { key1: string; key2: number } {
    // Input validation
    if (!param1) {
        throw new Error('param1 cannot be empty');
    }

    if (param2 < 0) {
        throw new Error('param2 must be non-negative');
    }

    // Implementation
    const result = {
        key1: `processed_${param1}`,
        key2: param2 * 2
    };

    return result;
}
