// Core types for rd3:tasks CLI

export type TaskStatus = 'Backlog' | 'Todo' | 'WIP' | 'Testing' | 'Blocked' | 'Done';

export type ImplPhase = 'planning' | 'design' | 'implementation' | 'review' | 'testing';

export type TaskType = 'task' | 'brainstorm';

export interface ImplProgress {
    planning: 'pending' | 'in_progress' | 'completed';
    design: 'pending' | 'in_progress' | 'completed';
    implementation: 'pending' | 'in_progress' | 'completed';
    review: 'pending' | 'in_progress' | 'completed';
    testing: 'pending' | 'in_progress' | 'completed';
}

export interface TaskFrontmatter {
    name: string;
    description: string;
    status: TaskStatus;
    created_at: string;
    updated_at: string;
    folder?: string;
    type?: TaskType;
    impl_progress: ImplProgress;
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

export interface TaskListItem {
    wbs: string;
    name: string;
    status: TaskStatus;
    folder: string;
}

export interface FolderConfig {
    base_counter: number;
    label?: string;
}

export interface TasksConfig {
    $schema_version: number;
    active_folder: string;
    folders: Record<string, FolderConfig>;
}

export interface ValidationIssue {
    type: 'error' | 'warning' | 'suggestion';
    message: string;
}

export interface ValidationResult {
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
    suggestions: ValidationIssue[];
    hasErrors: boolean;
    hasWarnings: boolean;
}

export interface CliArgs {
    folder?: string;
    json?: boolean;
    dryRun?: boolean;
    force?: boolean;
    section?: string;
    fromFile?: string;
    appendRow?: string;
    artifactType?: string;
    name?: string;
    background?: string;
    requirements?: string;
    phase?: ImplPhase;
    phaseStatus?: string;
    baseCounter?: number;
    label?: string;
}

export interface ToolInput {
    tool_name: string;
    tool_input: Record<string, unknown>;
}

export interface WriteGuardResult {
    allowed: boolean;
    reason?: string;
}

export interface BatchCreateItem {
    name: string;
    background?: string;
    requirements?: string;
    folder?: string;
}

export interface ArtifactEntry {
    type: string;
    path: string;
    agent?: string;
    date: string;
}

export interface PutResult {
    success: boolean;
    path: string;
    artifact?: ArtifactEntry;
}

export interface GetResult {
    wbs: string;
    artifacts: ArtifactEntry[];
    paths: string[];
}

export const VALID_STATUSES: TaskStatus[] = ['Backlog', 'Todo', 'WIP', 'Testing', 'Blocked', 'Done'];

export const VALID_PHASES: ImplPhase[] = ['planning', 'design', 'implementation', 'review', 'testing'];

export const STATUS_EMOJI: Record<TaskStatus, string> = {
    Backlog: '🔴',
    Todo: '🔵',
    WIP: '🟡',
    Testing: '🟠',
    Blocked: '⛔',
    Done: '🟢',
};
