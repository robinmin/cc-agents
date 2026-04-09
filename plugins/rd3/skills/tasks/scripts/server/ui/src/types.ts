export type TaskStatus = 'Backlog' | 'Todo' | 'WIP' | 'Testing' | 'Blocked' | 'Done' | 'Canceled';

export const STATUS_ORDER: TaskStatus[] = ['Backlog', 'Todo', 'WIP', 'Testing', 'Blocked', 'Done', 'Canceled'];

export const STATUS_COLORS: Record<TaskStatus, string> = {
    Backlog: 'bg-gray-200 dark:bg-gray-700',
    Todo: 'bg-blue-200 dark:bg-blue-800',
    WIP: 'bg-yellow-200 dark:bg-yellow-800',
    Testing: 'bg-orange-200 dark:bg-orange-800',
    Blocked: 'bg-red-200 dark:bg-red-800',
    Done: 'bg-green-200 dark:bg-green-800',
    Canceled: 'bg-slate-300 dark:bg-slate-600',
};

export const STATUS_EMOJI: Record<TaskStatus, string> = {
    Backlog: '\u{1F534}',
    Todo: '\u{1F535}',
    WIP: '\u{1F7E1}',
    Testing: '\u{1F7E0}',
    Blocked: '\u{26D4}',
    Done: '\u{1F7E2}',
    Canceled: '\u{26AB}',
};

export interface TaskListItem {
    wbs: string;
    name: string;
    status: TaskStatus;
    folder: string;
    created_at?: string;
    updated_at?: string;
}

export interface TaskFile {
    wbs: string;
    name: string;
    status: TaskStatus;
    folder: string;
    path: string;
    frontmatter: TaskFrontmatter;
    content: string;
}

export interface TaskFrontmatter {
    name: string;
    description: string;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
    folder?: string;
    type?: string;
    priority?: string;
    estimated_hours?: number;
    tags?: string[];
    dependencies?: string[];
    preset?: string;
    profile?: string;
    impl_progress?: ImplProgress;
}

export interface ImplProgress {
    planning: 'pending' | 'in_progress' | 'completed';
    design: 'pending' | 'in_progress' | 'completed';
    implementation: 'pending' | 'in_progress' | 'completed';
    review: 'pending' | 'in_progress' | 'completed';
    testing: 'pending' | 'in_progress' | 'completed';
}

export interface TaskEvent {
    type: 'created' | 'updated' | 'deleted';
    wbs: string;
    status?: TaskStatus;
    timestamp: string;
}

export interface TasksConfig {
    project_name?: string;
    active_folder: string;
    folders: Record<string, { base_counter: number; label?: string }>;
}
