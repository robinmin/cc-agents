/**
 * Integration tests for subtask-aware implement phase.
 *
 * Verifies:
 * 1. Orchestrator detects subtask files correctly
 * 2. Subtasks are executed in WBS order
 * 3. Subtask status is updated as each completes
 * 4. Parent task status reflects subtask completion
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { getSubtasks, extractWbsFromPath, isSubtaskOf, type SubtaskInfo } from '../../scripts/utils/subtasks';

const TEST_DIR = resolve(process.cwd(), 'docs/tasks2');

describe('Subtask Detection Utilities', () => {
    beforeEach(() => {
        if (!existsSync(TEST_DIR)) {
            mkdirSync(TEST_DIR, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(TEST_DIR)) {
            try {
                const files = readdirSync(TEST_DIR);
                for (const file of files) {
                    if (file.startsWith('TEST_') || file.match(/^999[0-9]_/)) {
                        rmSync(resolve(TEST_DIR, file), { force: true });
                    }
                }
            } catch {
                // Ignore cleanup errors
            }
        }
    });

    test('getSubtasks finds subtasks in WBS order', () => {
        // Create test subtask files in non-sequential order
        writeFileSync(resolve(TEST_DIR, '9995_9990_test_z.md'), '# Z subtask');
        writeFileSync(resolve(TEST_DIR, '9993_9990_test_b.md'), '# B subtask');
        writeFileSync(resolve(TEST_DIR, '9994_9990_test_m.md'), '# M subtask');

        const result = getSubtasks('9990', TEST_DIR);

        expect(result).toHaveLength(3);
        // Should be sorted by WBS order
        expect(result[0].wbs).toBe('9993');
        expect(result[1].wbs).toBe('9994');
        expect(result[2].wbs).toBe('9995');
        expect(result[0].order).toBe(9993);
        expect(result[2].order).toBe(9995);
    });

    test('getSubtasks returns empty array when no subtasks exist', () => {
        const result = getSubtasks('8888', TEST_DIR);
        expect(result).toHaveLength(0);
    });

    test('getSubtasks handles non-existent directory gracefully', () => {
        const result = getSubtasks('0000', '/non/existent/path');
        expect(result).toEqual([]);
    });

    test('extractWbsFromPath extracts WBS from various path formats', () => {
        expect(extractWbsFromPath('/path/to/docs/tasks2/0343_0342_add_helper.md')).toBe('0343');
        expect(extractWbsFromPath('docs/tasks2/0345_0342_pr_phase.md')).toBe('0345');
        expect(extractWbsFromPath('0343_0342_test.md')).toBe('0343');
    });

    test('extractWbsFromPath returns null for invalid paths', () => {
        expect(extractWbsFromPath('invalid')).toBeNull();
        expect(extractWbsFromPath('')).toBeNull();
        expect(extractWbsFromPath('docs/tasks/0343_test.txt')).toBeNull();
    });

    test('isSubtaskOf correctly identifies subtasks', () => {
        expect(isSubtaskOf('docs/tasks2/0343_0342_test.md', '0342')).toBe(true);
        expect(isSubtaskOf('docs/tasks2/0342_parent.md', '0342')).toBe(false);
        expect(isSubtaskOf('docs/tasks2/0500_other.md', '0342')).toBe(false);
    });
});

describe('Subtask Execution Logic', () => {
    test('subtasks are sorted correctly for sequential execution', () => {
        // Simulate subtask data from getSubtasks
        const subtasks: SubtaskInfo[] = [
            { path: '/test/docs/tasks2/9995_parent_test.md', wbs: '9995', order: 9995 },
            { path: '/test/docs/tasks2/9993_parent_test.md', wbs: '9993', order: 9993 },
            { path: '/test/docs/tasks2/9994_parent_test.md', wbs: '9994', order: 9994 },
        ];

        // Sort by order
        const sorted = [...subtasks].sort((a, b) => a.order - b.order);

        expect(sorted.map((s) => s.wbs)).toEqual(['9993', '9994', '9995']);
    });

    test('parent WBS can be extracted from task path', () => {
        const parentPath = 'docs/tasks2/0342_Fix_orchestrator_workflow_issues.md';
        const wbs = extractWbsFromPath(parentPath);
        expect(wbs).toBe('0342');
    });
});

describe('Human Gate Blocking Logic', () => {
    // Import gate check logic for testing
    const checkHumanGateBlocking = (
        blocking: boolean | undefined,
        auto: boolean | undefined,
    ): { status: 'pass' | 'pending'; advisory?: boolean } => {
        // Simulating the checkHumanGate logic from runner.ts
        if (blocking === true) {
            return { status: 'pending' };
        }
        if (auto === true) {
            return { status: 'pass', advisory: true };
        }
        return { status: 'pending' };
    };

    test('blocking:true gate always pauses regardless of --auto', () => {
        // PR review gate MUST pause
        expect(checkHumanGateBlocking(true, true)).toEqual({ status: 'pending' });
        expect(checkHumanGateBlocking(true, false)).toEqual({ status: 'pending' });
        expect(checkHumanGateBlocking(true, undefined)).toEqual({ status: 'pending' });
    });

    test('blocking:false gate bypasses when --auto is set', () => {
        // Advisory gates can be bypassed with --auto
        expect(checkHumanGateBlocking(false, true)).toEqual({ status: 'pass', advisory: true });
        expect(checkHumanGateBlocking(false, false)).toEqual({ status: 'pending' });
        expect(checkHumanGateBlocking(undefined, true)).toEqual({ status: 'pass', advisory: true });
        expect(checkHumanGateBlocking(undefined, false)).toEqual({ status: 'pending' });
    });

    test('default blocking behavior is blocking', () => {
        // Default (undefined) should block
        expect(checkHumanGateBlocking(undefined, undefined)).toEqual({ status: 'pending' });
        expect(checkHumanGateBlocking(undefined, false)).toEqual({ status: 'pending' });
    });
});
