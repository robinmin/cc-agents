import { useTasks } from './hooks/use-tasks';
import { KanbanBoard } from './components/kanban-board';
import { FolderSelector } from './components/folder-selector';
import { lazy, Suspense, useState, useMemo } from 'react';

const TaskDetail = lazy(() => import('./components/task-detail').then((m) => ({ default: m.TaskDetail })));
const TaskCreate = lazy(() => import('./components/task-create').then((m) => ({ default: m.TaskCreate })));
import { STATUS_ORDER, STATUS_EMOJI, type TaskStatus } from './types';

export function App() {
    const { columns, config, activeFolder, loading, error, moveTask, changeFolder, refresh, connected } = useTasks();
    const [selectedWbs, setSelectedWbs] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    // Default: most active statuses are shown, "Blocked" and "Canceled" are off
    const [visibleStatuses, setVisibleStatuses] = useState<Record<TaskStatus, boolean>>(() => {
        const result: Record<TaskStatus, boolean> = {} as Record<TaskStatus, boolean>;
        for (const s of STATUS_ORDER) {
            result[s] = !['Blocked', 'Canceled'].includes(s);
        }
        return result;
    });

    const toggleStatus = (status: TaskStatus) => {
        setVisibleStatuses((prev) => ({ ...prev, [status]: !prev[status] }));
    };

    const filteredColumns = useMemo(() => {
        return Object.keys(columns).reduce(
            (acc, status) => {
                if (visibleStatuses[status as TaskStatus]) {
                    acc[status] = columns[status];
                }
                return acc;
            },
            {} as typeof columns,
        );
    }, [columns, visibleStatuses]);

    return (
        <div className="min-h-screen" style={{ background: 'var(--kanban-bg)' }}>
            {connected === false && (
                <div
                    className="px-4 py-1.5 text-xs text-white text-center font-medium"
                    style={{ background: 'var(--kanban-danger)' }}
                >
                    Data stream disconnected. Trying to reconnect...
                </div>
            )}
            <header
                className="border-b px-4 py-3 flex items-center justify-between"
                style={{ borderColor: 'var(--kanban-border)', background: 'var(--kanban-card)' }}
            >
                <h1 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--kanban-text)' }}>
                    Tasks Kanban
                    {config?.project_name && (
                        <span className="text-gray-400 dark:text-gray-500 font-normal ml-1">
                            / {config.project_name}
                        </span>
                    )}
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: connected ? 'var(--kanban-accent)' : 'var(--kanban-danger)' }}
                        title={connected ? 'Connected to server' : 'Disconnected from server'}
                    />
                </h1>
                <div className="flex items-center gap-4">
                    {/* Status Visibility Checkboxes */}
                    <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        {STATUS_ORDER.map((status) => (
                            <label
                                key={status}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-all ${
                                    visibleStatuses[status]
                                        ? 'opacity-100 bg-white dark:bg-gray-700 shadow-sm'
                                        : 'opacity-40 hover:opacity-100'
                                }`}
                                title={`Toggle ${status} visibility`}
                            >
                                <input
                                    type="checkbox"
                                    checked={visibleStatuses[status]}
                                    onChange={() => toggleStatus(status)}
                                    className="hidden"
                                />
                                <span className="text-sm">{STATUS_EMOJI[status]}</span>
                                <span
                                    className="text-[10px] font-bold uppercase tracking-wider hidden xl:inline"
                                    style={{ color: 'var(--kanban-text-secondary)' }}
                                >
                                    {status}
                                </span>
                            </label>
                        ))}
                    </div>

                    {config && <FolderSelector config={config} activeFolder={activeFolder} onChange={changeFolder} />}
                    <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="px-3 py-1.5 text-sm rounded-md text-white"
                        style={{ background: 'var(--kanban-accent)' }}
                    >
                        + New Task
                    </button>
                </div>
            </header>

            {error && (
                <div className="px-4 py-2 text-sm text-white" style={{ background: 'var(--kanban-danger)' }}>
                    {error}
                </div>
            )}

            {loading ? (
                <div
                    className="flex items-center justify-center h-64"
                    style={{ color: 'var(--kanban-text-secondary)' }}
                >
                    Loading tasks...
                </div>
            ) : (
                <KanbanBoard
                    columns={filteredColumns}
                    visibleStatuses={visibleStatuses}
                    onMoveTask={moveTask}
                    onSelectTask={setSelectedWbs}
                />
            )}

            <Suspense>
                {selectedWbs && (
                    <TaskDetail wbs={selectedWbs} onClose={() => setSelectedWbs(null)} onStatusChange={refresh} />
                )}

                {showCreate && <TaskCreate onClose={() => setShowCreate(false)} />}
            </Suspense>
        </div>
    );
}
