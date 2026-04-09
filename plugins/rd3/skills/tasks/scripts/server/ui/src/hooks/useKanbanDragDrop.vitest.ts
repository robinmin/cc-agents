import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanbanDragDrop } from './useKanbanDragDrop';
import type { DropResult } from '@hello-pangea/dnd';
import type { TaskStatus } from '../types';

const customTransitions = {
    transitions: {
        Backlog: {
            Backlog: false,
            Todo: true,
            WIP: false,
            Testing: false,
            Blocked: false,
            Done: false,
            Canceled: false,
        },
        Todo: {
            Backlog: false,
            Todo: false,
            WIP: true,
            Testing: false,
            Blocked: true,
            Done: false,
            Canceled: true,
        },
        WIP: {
            Backlog: false,
            Todo: false,
            WIP: false,
            Testing: true,
            Blocked: true,
            Done: false,
            Canceled: true,
        },
        Testing: {
            Backlog: false,
            Todo: false,
            WIP: false,
            Testing: false,
            Blocked: true,
            Done: true,
            Canceled: true,
        },
        Blocked: {
            Backlog: true,
            Todo: true,
            WIP: true,
            Testing: false,
            Blocked: false,
            Done: false,
            Canceled: true,
        },
        Done: {
            Backlog: false,
            Todo: false,
            WIP: false,
            Testing: false,
            Blocked: false,
            Done: false,
            Canceled: true,
        },
        Canceled: {
            Backlog: true,
            Todo: true,
            WIP: false,
            Testing: false,
            Blocked: false,
            Canceled: false,
            Done: false,
        },
    } satisfies Record<TaskStatus, Record<TaskStatus, boolean>>,
};

function createDropResult(overrides: Partial<DropResult> = {}): DropResult {
    return {
        draggableId: '001.001',
        type: 'DEFAULT',
        source: {
            droppableId: 'Backlog',
            index: 0,
        },
        destination: {
            droppableId: 'Todo',
            index: 0,
        },
        combine: null,
        mode: 'FLUID',
        reason: 'DROP',
        ...overrides,
    } as DropResult;
}

describe('useKanbanDragDrop', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('validateTransition', () => {
        it('should allow Backlog -> Todo transition (default config)', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const validation = result.current.validateTransition('Backlog', 'Todo');

            expect(validation.isValid).toBe(true);
            expect(validation.sourceStatus).toBe('Backlog');
            expect(validation.targetStatus).toBe('Todo');
            expect(validation.errorMessage).toBeUndefined();
        });

        it('should forbid Backlog -> WIP transition', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const validation = result.current.validateTransition('Backlog', 'WIP');

            expect(validation.isValid).toBe(false);
            expect(validation.sourceStatus).toBe('Backlog');
            expect(validation.targetStatus).toBe('WIP');
            expect(validation.errorMessage).toContain('Backlog');
            expect(validation.errorMessage).toContain('WIP');
        });

        it('should forbid Todo -> Backlog transition', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const validation = result.current.validateTransition('Todo', 'Backlog');

            expect(validation.isValid).toBe(false);
        });

        it('should forbid Todo -> WIP transition in the shipped default config', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const validation = result.current.validateTransition('Todo', 'WIP');

            expect(validation.isValid).toBe(false);
        });

        it('should allow Todo -> WIP when custom transitions are provided', () => {
            const { result } = renderHook(() => useKanbanDragDrop({ customTransitions }));

            const validation = result.current.validateTransition('Todo', 'WIP');

            expect(validation.isValid).toBe(true);
        });

        it('should allow Testing -> Done when custom transitions are provided', () => {
            const { result } = renderHook(() => useKanbanDragDrop({ customTransitions }));

            const validation = result.current.validateTransition('Testing', 'Done');

            expect(validation.isValid).toBe(true);
        });

        it('should allow Blocked -> Backlog when custom transitions are provided', () => {
            const { result } = renderHook(() => useKanbanDragDrop({ customTransitions }));

            const validation = result.current.validateTransition('Blocked', 'Backlog');

            expect(validation.isValid).toBe(true);
        });
    });

    describe('handleDragEnd', () => {
        it('should return none when dropped outside', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const dropResult = createDropResult({ destination: null });
            const getStatus = vi.fn(() => 'Backlog' as const);

            const action = result.current.handleDragEnd(dropResult, getStatus);

            expect(action.action).toBe('none');
        });

        it('should return none when dropped in same position', () => {
            const { result } = renderHook(() => useKanbanDragDrop());

            const dropResult = createDropResult({
                destination: { droppableId: 'Backlog', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => 'Backlog' as const);

            const action = result.current.handleDragEnd(dropResult, getStatus);

            expect(action.action).toBe('none');
        });

        it('should return move for valid transition with callback', () => {
            const onValid = vi.fn();
            const { result } = renderHook(() => useKanbanDragDrop({ onValidTransition: onValid }));

            const dropResult = createDropResult({
                destination: { droppableId: 'Todo', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => 'Backlog' as const);

            const action = result.current.handleDragEnd(dropResult, getStatus);

            expect(action.action).toBe('move');
            expect(action.wbs).toBe('001.001');
            expect(action.targetStatus).toBe('Todo');
            expect(onValid).toHaveBeenCalledWith('001.001', 'Todo');
        });

        it('should show toast and return revert for invalid transition', () => {
            const onValid = vi.fn();
            const { result } = renderHook(() => useKanbanDragDrop({ onValidTransition: onValid, toastDuration: 3000 }));

            const dropResult = createDropResult({
                destination: { droppableId: 'WIP', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => 'Backlog' as const);

            let action: ReturnType<typeof result.current.handleDragEnd> | undefined;
            act(() => {
                action = result.current.handleDragEnd(dropResult, getStatus);
            });

            expect(action?.action).toBe('revert');
            expect(action?.wbs).toBe('001.001');
            expect(action?.targetStatus).toBe('WIP');
            expect(onValid).not.toHaveBeenCalled();

            // Toast should be showing
            expect(result.current.state.showToast).toBe(true);
            expect(result.current.state.toastMessage).toContain('Backlog');
            expect(result.current.state.toastMessage).toContain('WIP');
        });

        it('should return none when task status cannot be determined', () => {
            const onValid = vi.fn();
            const { result } = renderHook(() => useKanbanDragDrop({ onValidTransition: onValid }));

            const dropResult = createDropResult({
                destination: { droppableId: 'Todo', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => undefined);

            const action = result.current.handleDragEnd(dropResult, getStatus);

            expect(action.action).toBe('none');
            expect(onValid).not.toHaveBeenCalled();
        });
    });

    describe('toast auto-dismiss', () => {
        it('should auto-dismiss toast after duration', () => {
            const { result } = renderHook(() => useKanbanDragDrop({ toastDuration: 3000 }));

            // Trigger invalid transition to show toast
            const dropResult = createDropResult({
                destination: { droppableId: 'WIP', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => 'Backlog' as const);

            act(() => {
                result.current.handleDragEnd(dropResult, getStatus);
            });

            expect(result.current.state.showToast).toBe(true);

            // Advance time by 3 seconds
            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(result.current.state.showToast).toBe(false);
            expect(result.current.state.toastMessage).toBeNull();
        });

        it('should allow manual dismiss', () => {
            const { result } = renderHook(() => useKanbanDragDrop({ toastDuration: 3000 }));

            // Trigger invalid transition to show toast
            const dropResult = createDropResult({
                destination: { droppableId: 'WIP', index: 0 },
                source: { droppableId: 'Backlog', index: 0 },
            });
            const getStatus = vi.fn(() => 'Backlog' as const);

            act(() => {
                result.current.handleDragEnd(dropResult, getStatus);
            });

            expect(result.current.state.showToast).toBe(true);

            act(() => {
                result.current.dismissToast();
            });

            expect(result.current.state.showToast).toBe(false);
            expect(result.current.state.toastMessage).toBeNull();
        });
    });

    describe('custom transitions', () => {
        it('should use custom transitions when provided', () => {
            // Create custom transitions where only Backlog -> WIP is allowed (opposite of default)
            const allStatuses: TaskStatus[] = ['Backlog', 'Todo', 'WIP', 'Testing', 'Blocked', 'Done', 'Canceled'];
            const customTransitions: Record<TaskStatus, Record<TaskStatus, boolean>> = {} as Record<
                TaskStatus,
                Record<TaskStatus, boolean>
            >;

            for (const source of allStatuses) {
                customTransitions[source] = {} as Record<TaskStatus, boolean>;
                for (const target of allStatuses) {
                    // Only allow Backlog -> WIP
                    customTransitions[source][target] = source === 'Backlog' && target === 'WIP';
                }
            }

            const { result } = renderHook(() =>
                useKanbanDragDrop({
                    customTransitions: { transitions: customTransitions },
                }),
            );

            // With custom config, Backlog->WIP should be allowed
            const validation1 = result.current.validateTransition('Backlog', 'WIP');
            expect(validation1.isValid).toBe(true);

            // With custom config, Backlog->Todo should be forbidden
            const validation2 = result.current.validateTransition('Backlog', 'Todo');
            expect(validation2.isValid).toBe(false);
        });
    });
});
