import { describe, it, expect } from 'vitest';
import type { TaskListItem } from '../types';
import { sortTasks } from '../utils/taskSort';

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
    it('sorts by WBS ascending', () => {
        const tasks = [makeTask('0030', 'Task 30'), makeTask('0010', 'Task 10'), makeTask('0020', 'Task 20')];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted[0].wbs).toBe('0010');
        expect(sorted[1].wbs).toBe('0020');
        expect(sorted[2].wbs).toBe('0030');
    });

    it('sorts by WBS descending (default)', () => {
        const tasks = [makeTask('0010', 'Task 10'), makeTask('0030', 'Task 30'), makeTask('0020', 'Task 20')];
        const sorted = sortTasks(tasks, 'wbs-desc');
        expect(sorted[0].wbs).toBe('0030');
        expect(sorted[1].wbs).toBe('0020');
        expect(sorted[2].wbs).toBe('0010');
    });

    it('sorts nested WBS correctly', () => {
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

    it('does not collide when a child segment reaches 100', () => {
        const tasks = [
            makeTask('0002', 'Task 2'),
            makeTask('0001.0100', 'Subtask 100'),
            makeTask('0001.0099', 'Subtask 99'),
        ];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted.map((task) => task.wbs)).toEqual(['0001.0099', '0001.0100', '0002']);
    });

    it('sorts by created date ascending', () => {
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

    it('sorts by created date descending', () => {
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

    it('sorts by updated date ascending', () => {
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

    it('sorts by updated date descending', () => {
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

    it('handles missing timestamps gracefully', () => {
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

    it('does not mutate original array', () => {
        const tasks = [makeTask('0030', 'Task 30'), makeTask('0010', 'Task 10')];
        const originalFirst = tasks[0];
        sortTasks(tasks, 'wbs-asc');
        expect(tasks[0]).toBe(originalFirst);
        expect(tasks[0].wbs).toBe('0030');
    });

    it('handles empty array', () => {
        const sorted = sortTasks([], 'wbs-asc');
        expect(sorted).toEqual([]);
    });

    it('handles single item array', () => {
        const tasks = [makeTask('0001', 'Task 1')];
        const sorted = sortTasks(tasks, 'wbs-asc');
        expect(sorted).toHaveLength(1);
        expect(sorted[0].wbs).toBe('0001');
    });
});
