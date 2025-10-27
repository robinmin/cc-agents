/**
 * [Brief description of what this module does]
 * @module module-name
 */

/**
 * [Brief description of what the function does].
 *
 * @param {string} param1 - [Description of param1]
 * @param {number} param2 - [Description of param2]
 * @returns {{key1: string, key2: number}} Object containing processed results
 * @throws {Error} If param1 is empty or param2 is negative
 *
 * @example
 * const result = functionName('example', 42);
 * // Returns: { key1: 'processed_example', key2: 84 }
 */
function functionName(param1, param2) {
    // Input validation
    if (!param1) {
        throw new Error('param1 cannot be empty');
    }

    if (typeof param1 !== 'string') {
        throw new Error('param1 must be a string');
    }

    if (typeof param2 !== 'number') {
        throw new Error('param2 must be a number');
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

module.exports = { functionName };
