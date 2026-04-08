/**
 * Unit tests for subtask detection utilities
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { getSubtasks, extractWbsFromPath, isSubtaskOf } from './subtasks';
import { existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const TEST_DIR = resolve(process.cwd(), 'docs/tasks2');

describe('getSubtasks', () => {
    beforeEach(() => {
        // Ensure test directory exists
        if (!existsSync(TEST_DIR)) {
            mkdirSync(TEST_DIR, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files - match both patterns:
        // - ^999[0-9]_ : files like 9991_9990_test.md (WBS_WBS_name.md)
        // - ^999[0-9]{5}_: files like 99919990_test.md (parentWBS_taskWBS_name.md)
        if (existsSync(TEST_DIR)) {
            try {
                const files = readdirSync(TEST_DIR);
                for (const file of files) {
                    if (file.startsWith('TEST_') || file.match(/^999[0-9]_/) || file.match(/^999[0-9]{5}_/)) {
                        rmSync(resolve(TEST_DIR, file), { force: true });
                    }
                }
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    it('should return empty array for non-existent directory', () => {
        const result = getSubtasks('0000', '/non/existent/path');
        expect(result).toEqual([]);
    });

    it('should return empty array when no subtasks exist', () => {
        const result = getSubtasks('9999', TEST_DIR);
        expect(result).toEqual([]);
    });

    it('should find subtasks matching parent WBS prefix pattern', () => {
        // Create test subtask files
        writeFileSync(resolve(TEST_DIR, '9991_9990_test_subtask_a.md'), '# Test A');
        writeFileSync(resolve(TEST_DIR, '9992_9990_test_subtask_b.md'), '# Test B');
        writeFileSync(resolve(TEST_DIR, '9993_9990_test_subtask_c.md'), '# Test C');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(3);
        expect(result[0].wbs).toBe('9991');
        expect(result[1].wbs).toBe('9992');
        expect(result[2].wbs).toBe('9993');
    });

    it('should sort subtasks by WBS order', () => {
        // Create test files in non-sorted order
        writeFileSync(resolve(TEST_DIR, '9995_9990_test_z.md'), '# Z');
        writeFileSync(resolve(TEST_DIR, '9993_9990_test_b.md'), '# B');
        writeFileSync(resolve(TEST_DIR, '9994_9990_test_m.md'), '# M');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(3);
        expect(result[0].order).toBe(9993);
        expect(result[1].order).toBe(9994);
        expect(result[2].order).toBe(9995);
    });

    it('should return only files with .md extension', () => {
        // Create mixed files
        writeFileSync(resolve(TEST_DIR, '9991_9990_test.txt'), 'not a task');
        writeFileSync(resolve(TEST_DIR, '9992_9990_test.md'), '# Valid task');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(1);
        expect(result[0].wbs).toBe('9992');
    });

    it('should not match files without proper WBS pattern', () => {
        // Create files that look similar but don't match the pattern
        writeFileSync(resolve(TEST_DIR, '9990_test.md'), '# Not a subtask');
        writeFileSync(resolve(TEST_DIR, '9990_parent_task.md'), '# Parent task');
        writeFileSync(resolve(TEST_DIR, '99919990_test.md'), '# No underscore');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(0);
    });

    it('should include full path in result', () => {
        writeFileSync(resolve(TEST_DIR, '9997_9990_test.md'), '# Test');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(1);
        expect(result[0].path).toContain('9997_9990_test.md');
        expect(result[0].path).toBe(resolve(TEST_DIR, '9997_9990_test.md'));
    });
});

describe('extractWbsFromPath', () => {
    it('should extract WBS from full path', () => {
        const result = extractWbsFromPath('/path/to/docs/tasks2/0343_0342_add_helper.md');
        expect(result).toBe('0343');
    });

    it('should extract WBS from relative path', () => {
        const result = extractWbsFromPath('docs/tasks2/0345_0342_pr_phase.md');
        expect(result).toBe('0345');
    });

    it('should extract WBS from filename only', () => {
        const result = extractWbsFromPath('0343_0342_test.md');
        expect(result).toBe('0343');
    });

    it('should extract WBS from a bare WBS task ref', () => {
        const result = extractWbsFromPath('0353');
        expect(result).toBe('0353');
    });

    it('should return null for invalid path', () => {
        expect(extractWbsFromPath('invalid')).toBeNull();
        expect(extractWbsFromPath('no_wbs_here')).toBeNull();
        expect(extractWbsFromPath('')).toBeNull();
    });

    it('should return null for path without .md extension', () => {
        const result = extractWbsFromPath('docs/tasks/0343_test.txt');
        expect(result).toBeNull();
    });
});

describe('isSubtaskOf', () => {
    it('should return true for valid subtask path', () => {
        const result = isSubtaskOf('docs/tasks2/0343_0342_test.md', '0342');
        expect(result).toBe(true);
    });

    it('should return false for parent task path', () => {
        const result = isSubtaskOf('docs/tasks2/0342_parent.md', '0342');
        expect(result).toBe(false);
    });

    it('should return false for unrelated task', () => {
        const result = isSubtaskOf('docs/tasks2/0500_other.md', '0342');
        expect(result).toBe(false);
    });

    it('should return false for task with same prefix but different parent', () => {
        const result = isSubtaskOf('docs/tasks2/0342_9999_test.md', '0342');
        expect(result).toBe(false);
    });

    it('should return false for invalid WBS in path', () => {
        const result = isSubtaskOf('docs/tasks2/invalid_test.md', '0342');
        expect(result).toBe(false);
    });
});
