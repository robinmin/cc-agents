import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { KanbanBoard } from './kanban-board';
import { updateTaskStatus } from '../lib/api';
import type { TaskListItem, TaskStatus } from '../types';

let capturedOnValidTransition: ((wbs: string, targetStatus: TaskStatus) => void | Promise<void>) | undefined;

vi.mock('../hooks/useKanbanDragDrop', () => ({
    useKanbanDragDrop: (options: {
        onValidTransition?: (wbs: string, targetStatus: TaskStatus) => void | Promise<void>;
    }) => {
        capturedOnValidTransition = options.onValidTransition;

        return {
            state: {
                toastMessage: null,
                toastType: 'info' as const,
                showToast: false,
                revertCard: false,
            },
            handleDragEnd: vi.fn(),
            dismissToast: vi.fn(),
            getRevertClass: vi.fn(() => ''),
            validateTransition: vi.fn(),
            transitions: {},
        };
    },
}));

vi.mock('../lib/api', () => ({
    updateTaskStatus: vi.fn(),
}));

vi.mock('@hello-pangea/dnd', () => ({
    DragDropContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Droppable: ({
        children,
        droppableId,
    }: {
        children: (provided: unknown, snapshot: unknown) => ReactNode;
        droppableId: string;
    }) =>
        children(
            {
                innerRef: vi.fn(),
                droppableProps: { 'data-droppable-id': droppableId },
                placeholder: null,
            },
            { isDraggingOver: false },
        ),
    Draggable: ({
        children,
        draggableId,
        index,
    }: {
        children: (provided: unknown, snapshot: unknown) => ReactNode;
        draggableId: string;
        index: number;
    }) =>
        children(
            {
                innerRef: vi.fn(),
                draggableProps: {
                    style: {},
                    'data-draggable-id': draggableId,
                    'data-index': index,
                },
                dragHandleProps: {},
            },
            { isDragging: false },
        ),
}));

afterEach(() => {
    capturedOnValidTransition = undefined;
    vi.clearAllMocks();
});

function makeTask(wbs: string, status: TaskStatus): TaskListItem {
    return {
        wbs,
        name: `Task ${wbs}`,
        status,
        folder: 'docs/tasks',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
    };
}

describe('KanbanBoard', () => {
    it('delegates valid moves to onMoveTask without issuing a second API patch', async () => {
        const onMoveTask = vi.fn();

        render(
            <KanbanBoard
                columns={{
                    Backlog: [makeTask('0001', 'Backlog')],
                    Todo: [],
                    WIP: [],
                    Testing: [],
                    Blocked: [],
                    Done: [],
                    Canceled: [],
                }}
                visibleStatuses={{
                    Backlog: true,
                    Todo: true,
                    WIP: true,
                    Testing: true,
                    Blocked: true,
                    Done: true,
                    Canceled: true,
                }}
                onMoveTask={onMoveTask}
                onSelectTask={vi.fn()}
            />,
        );

        expect(capturedOnValidTransition).toBeDefined();

        await act(async () => {
            await capturedOnValidTransition?.('0001', 'Todo');
        });

        expect(onMoveTask).toHaveBeenCalledTimes(1);
        expect(onMoveTask).toHaveBeenCalledWith('0001', 'Todo');
        expect(updateTaskStatus).not.toHaveBeenCalled();
    });
});
