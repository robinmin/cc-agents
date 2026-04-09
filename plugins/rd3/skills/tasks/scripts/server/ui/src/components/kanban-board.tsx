import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useState, useEffect, useCallback, type FC } from 'react';
import { STATUS_ORDER, STATUS_EMOJI, type TaskStatus, type TaskListItem } from '../types';
import type { SortOption } from './SortDropdown';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { sortTasks } from '../utils/taskSort';
import { Toast } from './Toast';
import { useKanbanDragDrop } from '../hooks/useKanbanDragDrop';

interface KanbanBoardProps {
    columns: Record<string, TaskListItem[]>;
    visibleStatuses: Record<TaskStatus, boolean>;
    onMoveTask: (wbs: string, newStatus: TaskStatus) => void;
    onSelectTask: (wbs: string) => void;
}

export function KanbanBoard({ columns, visibleStatuses, onMoveTask, onSelectTask }: KanbanBoardProps) {
    const [sortOptions, setSortOptions] = useState<Record<TaskStatus, SortOption>>({
        Backlog: 'wbs-desc',
        Todo: 'wbs-desc',
        WIP: 'wbs-desc',
        Testing: 'wbs-desc',
        Blocked: 'wbs-desc',
        Done: 'wbs-desc',
        Canceled: 'wbs-desc',
    });

    // Helper to get task's current status from columns
    const getTaskStatus = useCallback(
        (wbs: string): TaskStatus | undefined => {
            for (const status of STATUS_ORDER) {
                const tasks = columns[status] || [];
                if (tasks.some((t) => t.wbs === wbs)) {
                    return status;
                }
            }
            return undefined;
        },
        [columns],
    );

    const {
        state: toastState,
        handleDragEnd,
        dismissToast,
    } = useKanbanDragDrop({
        onValidTransition: onMoveTask,
        toastDuration: 3000,
    });

    function onDragEnd(result: DropResult) {
        handleDragEnd(result, getTaskStatus);
    }

    function handleSortChange(status: TaskStatus, option: SortOption) {
        setSortOptions((prev) => ({ ...prev, [status]: option }));
    }

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-120px)] w-full">
                    {STATUS_ORDER.filter((s) => visibleStatuses[s]).map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            tasks={sortTasks(columns[status] || [], sortOptions[status])}
                            sortOption={sortOptions[status]}
                            onSortChange={(opt) => handleSortChange(status, opt)}
                            onSelectTask={onSelectTask}
                        />
                    ))}
                </div>
            </DragDropContext>

            <Toast
                message={toastState.toastMessage || ''}
                type={toastState.toastType}
                visible={toastState.showToast}
                onDismiss={dismissToast}
                duration={3000}
            />
        </>
    );
}

interface KanbanColumnProps {
    status: TaskStatus;
    tasks: TaskListItem[];
    sortOption: SortOption;
    onSortChange: (option: SortOption) => void;
    onSelectTask: (wbs: string) => void;
}

const KanbanColumn: FC<KanbanColumnProps> = ({ status, tasks, sortOption, onSortChange, onSelectTask }) => {
    return (
        <div className="flex-1 min-w-[300px] max-w-[450px] flex flex-col transition-all duration-300">
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium"
                style={{ background: 'var(--kanban-card)', color: 'var(--kanban-text)' }}
            >
                <span>{STATUS_EMOJI[status]}</span>
                <span>{status}</span>
                <span className="flex-1 text-center text-xs" style={{ color: 'var(--kanban-text-secondary)' }}>
                    {tasks.length} tasks
                </span>
                <button
                    type="button"
                    onClick={() => onSortChange(sortOption === 'wbs-asc' ? 'wbs-desc' : 'wbs-asc')}
                    className="text-xs px-1 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--kanban-text-secondary)' }}
                    title={sortOption === 'wbs-asc' ? 'Sorted: WBS Ascending' : 'Sorted: WBS Descending'}
                >
                    {sortOption === 'wbs-asc' ? '▲' : '▼'}
                </button>
            </div>
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        role="listbox"
                        aria-label={`${status} tasks`}
                        className="flex-1 rounded-b-lg p-2 space-y-2 border-t-0 border"
                        style={{
                            background: snapshot.isDraggingOver ? 'rgba(59,130,246,0.05)' : 'var(--kanban-bg)',
                            borderColor: 'var(--kanban-border)',
                            minHeight: 200,
                        }}
                    >
                        {tasks.map((task, index) => (
                            <Draggable key={task.wbs} draggableId={task.wbs} index={index}>
                                {(provided, snapshot) => (
                                    <TaskCard
                                        task={task}
                                        provided={provided}
                                        snapshot={snapshot}
                                        onSelectTask={onSelectTask}
                                    />
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

interface TaskCardProps {
    task: TaskListItem;
    provided: {
        innerRef: React.Ref<HTMLDivElement>;
        draggableProps: React.HTMLAttributes<HTMLDivElement>;
        dragHandleProps: React.HTMLAttributes<HTMLDivElement> | null;
    };
    snapshot: {
        isDragging: boolean;
    };
    onSelectTask: (wbs: string) => void;
}

const TaskCard: FC<TaskCardProps> = ({ task, provided, snapshot, onSelectTask }) => {
    const [, setTick] = useState(0);

    // Auto-update timestamps every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setTick((t) => t + 1);
        }, 60000); // 60 seconds
        return () => clearInterval(interval);
    }, []);

    // Trigger re-render on tick to update relative timestamps
    const relativeTime = formatRelativeTime(task.updated_at);

    return (
        <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => onSelectTask(task.wbs)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectTask(task.wbs);
            }}
            role="option"
            tabIndex={0}
            aria-selected={false}
            className="p-3 rounded-md cursor-pointer transition-shadow hover:shadow-md"
            style={{
                background: 'var(--kanban-card)',
                boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                ...provided.draggableProps.style,
            }}
        >
            {/* Line 1: WBS (left) + Relative Timestamp (right) */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                    style={{
                        background: 'var(--kanban-bg)',
                        color: 'var(--kanban-text-secondary)',
                    }}
                >
                    {task.wbs}
                </span>
                <span
                    className="text-xs truncate"
                    style={{ color: 'var(--kanban-text-secondary)' }}
                    title={task.updated_at ? new Date(task.updated_at).toLocaleString() : undefined}
                >
                    {relativeTime}
                </span>
            </div>
            {/* Line 2: Task title */}
            <div className="text-sm truncate" style={{ color: 'var(--kanban-text)' }}>
                {task.name}
            </div>
        </div>
    );
};
