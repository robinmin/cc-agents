/**
 * orchestration-v2 — Model types, interfaces, and error codes
 *
 * Single source of truth for all shared types across the engine.
 */

// ─── FSM States ────────────────────────────────────────────────────────────────

export type FSMState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

// ─── DAG Phase States ──────────────────────────────────────────────────────────

export type DAGPhaseState = 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'paused' | 'skipped';

// ─── Pipeline Definition ───────────────────────────────────────────────────────

export interface GateConfig {
    readonly type: 'auto' | 'human';
    readonly rework?: ReworkConfig;
}

export interface ReworkConfig {
    readonly max_iterations: number;
    readonly escalation: 'pause' | 'fail';
}

export interface PhaseDefinition {
    readonly skill: string;
    readonly gate?: GateConfig;
    readonly timeout?: string;
    readonly after?: readonly string[];
    readonly payload?: Record<string, unknown>;
}

export interface PresetDefinition {
    readonly phases: readonly string[];
    readonly defaults?: Record<string, unknown>;
}

export interface HookAction {
    readonly run?: string;
    readonly action?: 'pause' | 'fail';
    readonly reason?: string;
}

export interface PipelineHooks {
    readonly 'on-phase-start'?: readonly HookAction[];
    readonly 'on-phase-complete'?: readonly HookAction[];
    readonly 'on-phase-failure'?: readonly HookAction[];
    readonly 'on-rework'?: readonly HookAction[];
    readonly 'on-pause'?: readonly HookAction[];
    readonly 'on-resume'?: readonly HookAction[];
}

export interface StackDefinition {
    readonly language: string;
    readonly runtime: string;
    readonly linter: string;
    readonly test: string;
    readonly coverage: string;
}

export interface PipelineDefinition {
    readonly schema_version: 1;
    readonly name: string;
    readonly extends?: string;
    readonly stack?: StackDefinition;
    readonly phases: Readonly<Record<string, PhaseDefinition>>;
    readonly presets?: Readonly<Record<string, PresetDefinition>>;
    readonly hooks?: PipelineHooks;
}

// ─── Validation ────────────────────────────────────────────────────────────────

export interface ValidationError {
    readonly line?: number;
    readonly message: string;
    readonly rule: string;
}

export interface ValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
}

// ─── Executor ──────────────────────────────────────────────────────────────────

export interface ExecutorCapabilities {
    readonly parallel: boolean;
    readonly streaming: boolean;
    readonly structuredOutput: boolean;
    readonly channels: readonly string[];
    readonly maxConcurrency: number;
}

export interface ExecutorHealth {
    readonly healthy: boolean;
    readonly message?: string;
    readonly lastChecked: Date;
}

export interface ExecutionRequest {
    readonly skill: string;
    readonly phase: string;
    readonly prompt: string;
    readonly payload: Record<string, unknown>;
    readonly channel: string;
    readonly timeoutMs: number;
    readonly outputSchema?: Record<string, unknown>;
    readonly feedback?: string;
    readonly reworkIteration?: number;
    readonly reworkMax?: number;
    /** Optional task reference from RunRecord, injected by the runner. */
    readonly taskRef?: string;
}

export interface ResourceMetrics {
    readonly model_id: string;
    readonly model_provider: string;
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly cache_read_tokens?: number;
    readonly cache_creation_tokens?: number;
    readonly wall_clock_ms: number;
    readonly execution_ms: number;
    readonly first_token_ms?: number;
}

export interface ExecutionResult {
    readonly success: boolean;
    readonly exitCode: number;
    readonly stdout?: string;
    readonly stderr?: string;
    readonly structured?: Record<string, unknown>;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly resources?: readonly ResourceMetrics[];
}

export interface Executor {
    readonly id: string;
    readonly capabilities: ExecutorCapabilities;
    execute(req: ExecutionRequest): Promise<ExecutionResult>;
    healthCheck(): Promise<ExecutorHealth>;
    dispose(): Promise<void>;
}

// ─── Event Types ───────────────────────────────────────────────────────────────

export type EventType =
    | 'run.created'
    | 'run.started'
    | 'run.paused'
    | 'run.resumed'
    | 'run.completed'
    | 'run.failed'
    | 'phase.started'
    | 'phase.completed'
    | 'phase.failed'
    | 'phase.rework'
    | 'gate.evaluated'
    | 'executor.invoked'
    | 'executor.completed';

export interface OrchestratorEvent {
    readonly sequence?: number;
    readonly run_id: string;
    readonly event_type: EventType;
    readonly payload: Record<string, unknown>;
    readonly timestamp?: Date;
}

// ─── State ─────────────────────────────────────────────────────────────────────

export interface RunRecord {
    readonly id: string;
    readonly task_ref: string;
    readonly preset?: string;
    readonly phases_requested: string;
    readonly status: FSMState;
    readonly config_snapshot: Record<string, unknown>;
    readonly pipeline_name: string;
    readonly created_at?: Date;
    readonly updated_at?: Date;
}

export interface PhaseRecord {
    readonly run_id: string;
    readonly name: string;
    readonly status: DAGPhaseState;
    readonly skill: string;
    readonly payload?: Record<string, unknown>;
    readonly started_at?: Date;
    readonly completed_at?: Date;
    readonly error_code?: string;
    readonly error_message?: string;
    readonly rework_iteration: number;
}

export interface GateResult {
    readonly run_id: string;
    readonly phase_name: string;
    readonly step_name: string;
    readonly checker_method: string;
    readonly passed: boolean;
    readonly evidence?: Record<string, unknown>;
    readonly duration_ms?: number;
    readonly created_at?: Date;
}

export interface RollbackSnapshot {
    readonly run_id: string;
    readonly phase_name: string;
    readonly git_head?: string;
    readonly files_before?: Record<string, unknown>;
    readonly files_after?: Record<string, unknown>;
    readonly created_at?: Date;
}

export interface ResourceUsageRecord {
    readonly id?: number;
    readonly run_id: string;
    readonly phase_name: string;
    readonly model_id: string;
    readonly model_provider: string;
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly cache_read_tokens: number;
    readonly cache_creation_tokens: number;
    readonly wall_clock_ms: number;
    readonly execution_ms: number;
    readonly first_token_ms?: number;
    readonly recorded_at?: Date;
}

// ─── Error Codes ───────────────────────────────────────────────────────────────

export type ErrorCategory = 'config' | 'state' | 'execution' | 'verification';

export const EXIT_SUCCESS = 0;
export const EXIT_PIPELINE_FAILED = 1;
export const EXIT_PIPELINE_PAUSED = 2;
export const EXIT_INVALID_ARGS = 10;
export const EXIT_VALIDATION_FAILED = 11;
export const EXIT_TASK_NOT_FOUND = 12;
export const EXIT_STATE_ERROR = 13;
export const EXIT_EXECUTOR_UNAVAILABLE = 20;

export type ErrorCode =
    | 'PIPELINE_NOT_FOUND'
    | 'TASK_NOT_FOUND'
    | 'PRESET_NOT_FOUND'
    | 'PHASE_NOT_FOUND'
    | 'PIPELINE_VALIDATION_FAILED'
    | 'DAG_CYCLE_DETECTED'
    | 'EXTENDS_CIRCULAR'
    | 'EXTENDS_DEPTH_EXCEEDED'
    | 'STATE_CORRUPT'
    | 'STATE_LOCKED'
    | 'STATE_MIGRATION_NEEDED'
    | 'EXECUTOR_UNAVAILABLE'
    | 'EXECUTOR_TIMEOUT'
    | 'EXECUTOR_FAILED'
    | 'CHANNEL_UNAVAILABLE'
    | 'CONTRACT_VIOLATION'
    | 'GATE_FAILED'
    | 'GATE_PENDING'
    | 'REWORK_EXHAUSTED'
    | 'UNDO_UNCOMMITTED_CHANGES';

const ERROR_EXIT_MAP: Record<ErrorCode, number> = {
    PIPELINE_NOT_FOUND: EXIT_VALIDATION_FAILED,
    TASK_NOT_FOUND: EXIT_TASK_NOT_FOUND,
    PRESET_NOT_FOUND: EXIT_INVALID_ARGS,
    PHASE_NOT_FOUND: EXIT_INVALID_ARGS,
    PIPELINE_VALIDATION_FAILED: EXIT_VALIDATION_FAILED,
    DAG_CYCLE_DETECTED: EXIT_VALIDATION_FAILED,
    EXTENDS_CIRCULAR: EXIT_VALIDATION_FAILED,
    EXTENDS_DEPTH_EXCEEDED: EXIT_VALIDATION_FAILED,
    STATE_CORRUPT: EXIT_STATE_ERROR,
    STATE_LOCKED: EXIT_STATE_ERROR,
    STATE_MIGRATION_NEEDED: EXIT_STATE_ERROR,
    EXECUTOR_UNAVAILABLE: EXIT_EXECUTOR_UNAVAILABLE,
    EXECUTOR_TIMEOUT: EXIT_PIPELINE_FAILED,
    EXECUTOR_FAILED: EXIT_PIPELINE_FAILED,
    CHANNEL_UNAVAILABLE: EXIT_EXECUTOR_UNAVAILABLE,
    CONTRACT_VIOLATION: EXIT_PIPELINE_FAILED,
    GATE_FAILED: EXIT_PIPELINE_FAILED,
    GATE_PENDING: EXIT_PIPELINE_PAUSED,
    REWORK_EXHAUSTED: EXIT_PIPELINE_FAILED,
    UNDO_UNCOMMITTED_CHANGES: EXIT_PIPELINE_FAILED,
};

const ERROR_CATEGORY_MAP: Record<ErrorCode, ErrorCategory> = {
    PIPELINE_NOT_FOUND: 'config',
    TASK_NOT_FOUND: 'config',
    PRESET_NOT_FOUND: 'config',
    PHASE_NOT_FOUND: 'config',
    PIPELINE_VALIDATION_FAILED: 'config',
    DAG_CYCLE_DETECTED: 'config',
    EXTENDS_CIRCULAR: 'config',
    EXTENDS_DEPTH_EXCEEDED: 'config',
    STATE_CORRUPT: 'state',
    STATE_LOCKED: 'state',
    STATE_MIGRATION_NEEDED: 'state',
    EXECUTOR_UNAVAILABLE: 'execution',
    EXECUTOR_TIMEOUT: 'execution',
    EXECUTOR_FAILED: 'execution',
    CHANNEL_UNAVAILABLE: 'execution',
    CONTRACT_VIOLATION: 'execution',
    GATE_FAILED: 'verification',
    GATE_PENDING: 'verification',
    REWORK_EXHAUSTED: 'verification',
    UNDO_UNCOMMITTED_CHANGES: 'state',
};

export class OrchestratorError extends Error {
    readonly code: ErrorCode;
    readonly category: ErrorCategory;
    readonly exitCode: number;

    constructor(
        code: ErrorCode,
        message: string,
        override readonly cause?: Error,
    ) {
        super(message);
        this.name = 'OrchestratorError';
        this.code = code;
        this.category = ERROR_CATEGORY_MAP[code];
        this.exitCode = ERROR_EXIT_MAP[code];
    }
}

// ─── Verification ──────────────────────────────────────────────────────────────

export interface ChainManifest {
    readonly run_id: string;
    readonly phase_name: string;
    readonly checks: readonly ChainCheck[];
}

export interface ChainCheck {
    readonly name: string;
    readonly method: string;
    readonly params?: Record<string, unknown>;
}

export interface ChainState {
    readonly status: 'pass' | 'fail' | 'pending';
    readonly results: readonly GateResult[];
}

export interface VerificationDriver {
    runChain(manifest: ChainManifest): Promise<ChainState>;
    resumeChain(stateDir: string, action?: 'approve' | 'reject'): Promise<ChainState>;
}

// ─── Report ────────────────────────────────────────────────────────────────────

export type ReportFormat = 'table' | 'markdown' | 'json' | 'summary';

export interface ReportOptions {
    readonly format: ReportFormat;
    readonly output?: string;
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

export interface RunOptions {
    readonly taskRef: string;
    readonly preset?: string;
    readonly phases?: readonly string[];
    readonly pipeline?: string;
    readonly auto?: boolean;
    readonly channel?: string;
    readonly dryRun?: boolean;
    readonly coverage?: number;
}

export interface ResumeOptions {
    readonly taskRef: string;
    readonly approve?: boolean;
    readonly reject?: boolean;
    readonly auto?: boolean;
}

export interface StatusOptions {
    readonly taskRef?: string;
    readonly runId?: string;
    readonly all?: boolean;
    readonly json?: boolean;
}

export interface ReportCliOptions {
    readonly taskRef: string;
    readonly format?: ReportFormat;
    readonly output?: string;
}

export interface HistoryOptions {
    readonly last?: number;
    readonly preset?: string;
    readonly since?: string;
    readonly failed?: boolean;
    readonly json?: boolean;
}

export interface UndoOptions {
    readonly taskRef: string;
    readonly phase: string;
    readonly dryRun?: boolean;
    readonly force?: boolean;
}

export interface InspectOptions {
    readonly taskRef: string;
    readonly phase: string;
    readonly evidence?: boolean;
    readonly json?: boolean;
}

export interface PruneOptions {
    readonly olderThan?: string;
    readonly keepLast?: number;
    readonly dryRun?: boolean;
}

export interface MigrateOptions {
    readonly fromV1?: boolean;
    readonly dryRun?: boolean;
}
