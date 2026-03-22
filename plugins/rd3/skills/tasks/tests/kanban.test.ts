import { describe, test, expect } from 'bun:test';
import { renderKanban } from "../scripts/lib/kanban";
import type { KanbanColumn, KanbanTaskLine } from "../scripts/lib/kanban";
import { STATUS_EMOJI } from "../scripts/types";

function makeTask(wbs: string, name: string, status: KanbanTaskLine['status']): KanbanTaskLine {
    return { wbs, name, status, folder: 'docs/tasks', checkbox: '[ ]' };
}

function makeColumn(status: KanbanTaskLine['status'], tasks: KanbanTaskLine[]): KanbanColumn {
    return { status, emoji: STATUS_EMOJI[status], tasks };
}

describe('renderKanban', () => {
    test('renders empty kanban board with frontmatter', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Backlog', []),
            makeColumn('Todo', []),
            makeColumn('WIP', []),
            makeColumn('Testing', []),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];
        const result = renderKanban(columns);
        expect(result).toContain('# Kanban Board');
        expect(result).toContain('🔴 Backlog');
        expect(result).toContain('🔵 Todo');
        expect(result).toContain('🟡 WIP');
        expect(result).toContain('🟠 Testing');
        expect(result).toContain('⛔ Blocked');
        expect(result).toContain('🟢 Done');
    });

    test('groups tasks by status', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Backlog', [makeTask('0001', 'Task_1', 'Backlog')]),
            makeColumn('Todo', [makeTask('0002', 'Task_2', 'Todo')]),
            makeColumn('WIP', [makeTask('0003', 'Task_3', 'WIP')]),
            makeColumn('Testing', []),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];
        const result = renderKanban(columns);
        expect(result).toContain('0001_Task_1');
        expect(result).toContain('0002_Task_2');
        expect(result).toContain('0003_Task_3');
    });

    test('includes WBS number and name for each task', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Todo', [makeTask('0047', 'My_Task', 'Todo')]),
            makeColumn('Backlog', []),
            makeColumn('WIP', []),
            makeColumn('Testing', []),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];
        const result = renderKanban(columns);
        expect(result).toContain('0047_My_Task');
    });

    test('uses correct emoji per column header', () => {
        const statuses: KanbanTaskLine['status'][] = ['Backlog', 'Todo', 'WIP', 'Testing', 'Blocked', 'Done'];
        const emojis = ['🔴', '🔵', '🟡', '🟠', '⛔', '🟢'] as const;

        statuses.forEach((status, i) => {
            const columns: KanbanColumn[] = [
                makeColumn('Backlog', []),
                makeColumn('Todo', []),
                makeColumn('WIP', []),
                makeColumn('Testing', []),
                makeColumn('Blocked', []),
                makeColumn('Done', []),
            ];
            columns[i].tasks.push(makeTask(String(i), `Task ${i}`, status));
            const result = renderKanban(columns);
            expect(result).toContain(emojis[i]);
        });
    });

    test('renders multiple tasks in same column', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Backlog', [
                makeTask('0001', 'Backlog_1', 'Backlog'),
                makeTask('0002', 'Backlog_2', 'Backlog'),
                makeTask('0003', 'Backlog_3', 'Backlog'),
            ]),
            makeColumn('Todo', []),
            makeColumn('WIP', []),
            makeColumn('Testing', []),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];
        const result = renderKanban(columns);
        expect(result).toContain('0001_Backlog_1');
        expect(result).toContain('0002_Backlog_2');
        expect(result).toContain('0003_Backlog_3');
    });

    test('includes frontmatter in output', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Backlog', []),
            makeColumn('Todo', []),
            makeColumn('WIP', []),
            makeColumn('Testing', []),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];
        const result = renderKanban(columns);
        expect(result).toContain('---');
        expect(result).toContain('kanban-plugin: board');
    });

    test('renders inline impl_progress notes for WIP and Testing tasks', () => {
        const columns: KanbanColumn[] = [
            makeColumn('Backlog', []),
            makeColumn('Todo', []),
            makeColumn('WIP', [
                {
                    ...makeTask('0003', 'Task_3', 'WIP'),
                    checkbox: '[.]',
                    progressNote: '[🟡 plan 🔬 impl]',
                },
            ]),
            makeColumn('Testing', [
                { ...makeTask('0004', 'Task_4', 'Testing'), checkbox: '[.]', progressNote: '[🔬 test]' },
            ]),
            makeColumn('Blocked', []),
            makeColumn('Done', []),
        ];

        const result = renderKanban(columns);
        expect(result).toContain('0003_Task_3 [🟡 plan 🔬 impl]');
        expect(result).toContain('0004_Task_4 [🔬 test]');
    });
});
