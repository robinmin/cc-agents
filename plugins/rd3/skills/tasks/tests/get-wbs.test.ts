import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { extractWbsFromPath, getWbs } from '../scripts/commands/getWbs';
import { setGlobalSilent } from '../../../scripts/logger';

describe('extractWbsFromPath', () => {
    test('extracts WBS from standard task file path', () => {
        expect(extractWbsFromPath('docs/tasks/0047_my-task.md')).toBe('0047');
        expect(extractWbsFromPath('docs/prompts/0001_legacy-task.md')).toBe('0001');
        expect(extractWbsFromPath('docs/tasks2/9999_final-task.md')).toBe('9999');
    });

    test('extracts WBS from file name only', () => {
        expect(extractWbsFromPath('0047_my-task.md')).toBe('0047');
        expect(extractWbsFromPath('0001_legacy-task.md')).toBe('0001');
    });

    test('extracts WBS from absolute path', () => {
        expect(extractWbsFromPath('/Users/robin/project/docs/tasks/0047_my-task.md')).toBe('0047');
        expect(extractWbsFromPath('/home/user/project/docs/prompts/0123_other-task.md')).toBe('0123');
    });

    test('returns null for invalid WBS format', () => {
        expect(extractWbsFromPath('docs/tasks/my-task.md')).toBeNull();
        expect(extractWbsFromPath('docs/tasks/47_my-task.md')).toBeNull(); // only 2 digits
        expect(extractWbsFromPath('task.md')).toBeNull();
        expect(extractWbsFromPath('')).toBeNull();
    });

    test('handles edge cases with underscores and dashes', () => {
        expect(extractWbsFromPath('docs/tasks/0047_my-task_name.md')).toBe('0047');
        expect(extractWbsFromPath('docs/tasks/0047_-dash-start.md')).toBe('0047');
    });
});

describe('getWbs', () => {
    beforeEach(() => {
        setGlobalSilent(true);
    });

    afterEach(() => {
        setGlobalSilent(false);
    });

    test('returns WBS and path when valid', () => {
        const result = getWbs('docs/tasks/0047_my-task.md', true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBe('0047');
            expect(result.value.path).toBe('docs/tasks/0047_my-task.md');
        }
    });

    test('returns null WBS for invalid path', () => {
        const result = getWbs('invalid.md', true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBeNull();
            expect(result.value.path).toBe('invalid.md');
        }
    });

    test('works with quiet=false but silent logger', () => {
        // Should not throw even though logger is silenced
        const result = getWbs('docs/tasks/0047_my-task.md', false);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBe('0047');
        }
    });

    test('returns null WBS for empty path', () => {
        const result = getWbs('', true);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.wbs).toBeNull();
            expect(result.value.path).toBe('');
        }
    });
});
