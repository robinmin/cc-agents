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
    priority?: string;
    estimated_hours?: number;
    tags?: string[];
    dependencies?: string[];
    profile?: 'simple' | 'standard' | 'complex' | 'research';
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
    solution?: string;
    priority?: string;
    estimatedHours?: number;
    tags?: string[];
    dependencies?: string[];
    profile?: string;
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
    solution?: string;
    priority?: string;
    estimated_hours?: number;
    dependencies?: string[];
    tags?: string[];
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

export const STATUS_ALIASES: Record<string, TaskStatus> = {
    inprogress: 'WIP',
    in_progress: 'WIP',
    'in-progress': 'WIP',
    progress: 'WIP',
    working: 'WIP',
    active: 'WIP',
    review: 'Testing',
    complete: 'Done',
    completed: 'Done',
    finished: 'Done',
    pending: 'Backlog',
    queued: 'Backlog',
    ready: 'Todo',
    hold: 'Blocked',
    'on-hold': 'Blocked',
    onhold: 'Blocked',
    waiting: 'Blocked',
};

export interface NormalizedStatus {
    status: TaskStatus;
    wasNormalized: boolean;
    recognized: boolean;
    original?: string;
}

export function normalizeStatus(raw: string): NormalizedStatus {
    // Exact match
    if (VALID_STATUSES.includes(raw as TaskStatus)) {
        return { status: raw as TaskStatus, wasNormalized: false, recognized: true };
    }
    // Case-insensitive exact match
    const ciMatch = VALID_STATUSES.find((s) => s.toLowerCase() === raw.toLowerCase());
    if (ciMatch) {
        return { status: ciMatch, wasNormalized: true, recognized: true, original: raw };
    }
    // Alias match
    const alias = STATUS_ALIASES[raw.toLowerCase()];
    if (alias) {
        return { status: alias, wasNormalized: true, recognized: true, original: raw };
    }
    // Unknown — default to Backlog
    return { status: 'Backlog', wasNormalized: true, recognized: false, original: raw };
}

export const STATUS_EMOJI: Record<TaskStatus, string> = {
    Backlog: '🔴',
    Todo: '🔵',
    WIP: '🟡',
    Testing: '🟠',
    Blocked: '⛔',
    Done: '🟢',
};
