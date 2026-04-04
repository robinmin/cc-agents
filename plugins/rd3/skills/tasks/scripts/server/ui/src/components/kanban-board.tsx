import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import type { TaskListItem, TaskStatus } from '../types';
import { STATUS_ORDER, STATUS_EMOJI } from '../types';

interface KanbanBoardProps {
    columns: Record<string, TaskListItem[]>;
    visibleStatuses: Record<TaskStatus, boolean>;
    onMoveTask: (wbs: string, newStatus: TaskStatus) => void;
    onSelectTask: (wbs: string) => void;
}

export function KanbanBoard({ columns, visibleStatuses, onMoveTask, onSelectTask }: KanbanBoardProps) {
    function handleDragEnd(result: DropResult) {
        if (!result.destination) return;
        const wbs = result.draggableId;
        const newStatus = result.destination.droppableId as TaskStatus;
        onMoveTask(wbs, newStatus);
    }

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-4 overflow-x-auto min-h-[calc(100vh-120px)] w-full">
                {STATUS_ORDER.filter((s) => visibleStatuses[s]).map((status) => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        tasks={columns[status] || []}
                        onSelectTask={onSelectTask}
                    />
                ))}
            </div>
        </DragDropContext>
    );
}

function KanbanColumn({
    status,
    tasks,
    onSelectTask,
}: {
    status: TaskStatus;
    tasks: TaskListItem[];
    onSelectTask: (wbs: string) => void;
}) {
    return (
        <div className="flex-1 min-w-[300px] max-w-[450px] flex flex-col transition-all duration-300">
            <div
                className="flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium"
                style={{ background: 'var(--kanban-card)', color: 'var(--kanban-text)' }}
            >
                <span>{STATUS_EMOJI[status]}</span>
                <span>{status}</span>
                <span className="ml-auto text-xs" style={{ color: 'var(--kanban-text-secondary)' }}>
                    {tasks.length}
                </span>
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
                                        <div className="flex items-center gap-2 mb-1">
                                            <span
                                                className="text-xs font-mono px-1.5 py-0.5 rounded"
                                                style={{
                                                    background: 'var(--kanban-bg)',
                                                    color: 'var(--kanban-text-secondary)',
                                                }}
                                            >
                                                {task.wbs}
                                            </span>
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--kanban-text)' }}>
                                            {task.name}
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
