import { describe, test, expect } from 'bun:test';
import type { TaskListItem } from '../types';
import { type SortOption } from './SortDropdown';

// Replicate sort logic for testing (isolated from component)
function parseWbsNumber(wbs: string): number {
    const parts = wbs.split('.');
    return parts.reduce((acc, part, index) => {
        const num = parseInt(part, 10);
        return acc + num / Math.pow(100, index + 1);
    }, 0);
}

function parseDate(dateStr: string | undefined): number {
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
}

function sortTasks(tasks: TaskListItem[], sortOption: SortOption): TaskListItem[] {
    return [...tasks].sort((a, b) => {
        switch (sortOption) {
            case 'wbs-asc':
                return parseWbsNumber(a.wbs) - parseWbsNumber(b.wbs);
            case 'wbs-desc':
                return parseWbsNumber(b.wbs) - parseWbsNumber(a.wbs);
            case 'created-asc':
                return parseDate(a.created_at) - parseDate(b.created_at);
            case 'created-desc':
                return parseDate(b.created_at) - parseDate(a.created_at);
            case 'updated-asc':
                return parseDate(a.updated_at) - parseDate(b.updated_at);
            case 'updated-desc':
                return parseDate(b.updated_at) - parseDate(a.updated_at);
            default:
                return 0;
        }
    });
}

function makeTask(wbs: string, name: string, created?: string, updated?: string): TaskListItem {
    return {
        wbs,
        name,
        status: 'Todo',
        folder: 'docs/tasks',
        ...(created !== undefined && { created_at: created }),
        ...(updated !== undefined && { updated_at: updated }),
    };
}

describe('sortTasks', () => {
    test('sorts by WBS ascending', () => {
        const tasks = [makeTask('0030', 'Task 30'), makeTask('0010', 'Task 10'), makeTask('0020', 'Task 20')];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted[0].wbs).toBe('0010');
        expect(sorted[1].wbs).toBe('0020');
        expect(sorted[2].wbs).toBe('0030');
    });

    test('sorts by WBS descending (default)', () => {
        const tasks = [makeTask('0010', 'Task 10'), makeTask('0030', 'Task 30'), makeTask('0020', 'Task 20')];
        const sorted = sortTasks(tasks, 'wbs-desc');
        expect(sorted[0].wbs).toBe('0030');
        expect(sorted[1].wbs).toBe('0020');
        expect(sorted[2].wbs).toBe('0010');
    });

    test('sorts nested WBS correctly', () => {
        const tasks = [
            makeTask('0002', 'Task 2'),
            makeTask('0001.0001', 'Subtask 1'),
            makeTask('0001.0002', 'Subtask 2'),
        ];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted[0].wbs).toBe('0001.0001');
        expect(sorted[1].wbs).toBe('0001.0002');
        expect(sorted[2].wbs).toBe('0002');
    });

    test('sorts by created date ascending', () => {
        const tasks = [
            makeTask('0001', 'Task 1', '2024-01-03', undefined),
            makeTask('0002', 'Task 2', '2024-01-01', undefined),
            makeTask('0003', 'Task 3', '2024-01-02', undefined),
        ];
        const sorted = sortTasks(tasks, 'created-asc');
        expect(sorted[0].wbs).toBe('0002');
        expect(sorted[1].wbs).toBe('0003');
        expect(sorted[2].wbs).toBe('0001');
    });

    test('sorts by created date descending', () => {
        const tasks = [
            makeTask('0001', 'Task 1', '2024-01-01', undefined),
            makeTask('0002', 'Task 2', '2024-01-03', undefined),
            makeTask('0003', 'Task 3', '2024-01-02', undefined),
        ];
        const sorted = sortTasks(tasks, 'created-desc');
        expect(sorted[0].wbs).toBe('0002');
        expect(sorted[1].wbs).toBe('0003');
        expect(sorted[2].wbs).toBe('0001');
    });

    test('sorts by updated date ascending', () => {
        const tasks = [
            makeTask('0001', 'Task 1', undefined, '2024-01-03'),
            makeTask('0002', 'Task 2', undefined, '2024-01-01'),
            makeTask('0003', 'Task 3', undefined, '2024-01-02'),
        ];
        const sorted = sortTasks(tasks, 'updated-asc');
        expect(sorted[0].wbs).toBe('0002');
        expect(sorted[1].wbs).toBe('0003');
        expect(sorted[2].wbs).toBe('0001');
    });

    test('sorts by updated date descending', () => {
        const tasks = [
            makeTask('0001', 'Task 1', undefined, '2024-01-01'),
            makeTask('0002', 'Task 2', undefined, '2024-01-03'),
            makeTask('0003', 'Task 3', undefined, '2024-01-02'),
        ];
        const sorted = sortTasks(tasks, 'updated-desc');
        expect(sorted[0].wbs).toBe('0002');
        expect(sorted[1].wbs).toBe('0003');
        expect(sorted[2].wbs).toBe('0001');
    });

    test('handles missing timestamps gracefully', () => {
        const tasks = [
            makeTask('0001', 'Task 1', undefined, undefined),
            makeTask('0002', 'Task 2', '2024-01-01', '2024-01-01'),
            makeTask('0003', 'Task 3', '2024-01-02', undefined),
        ];
        const sorted = sortTasks(tasks, 'created-desc');
        expect(sorted[0].wbs).toBe('0003');
        expect(sorted[1].wbs).toBe('0002');
        expect(sorted[2].wbs).toBe('0001');
    });

    test('does not mutate original array', () => {
        const tasks = [makeTask('0030', 'Task 30'), makeTask('0010', 'Task 10')];
        const originalFirst = tasks[0];
        sortTasks(tasks, 'wbs-asc');
        expect(tasks[0]).toBe(originalFirst);
        expect(tasks[0].wbs).toBe('0030');
    });

    test('handles empty array', () => {
        const sorted = sortTasks([], 'wbs-asc');
        expect(sorted).toEqual([]);
    });

    test('handles single item array', () => {
        const tasks = [makeTask('0001', 'Task 1')];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted).toHaveLength(1);
        expect(sorted[0].wbs).toBe('0001');
    });
});
