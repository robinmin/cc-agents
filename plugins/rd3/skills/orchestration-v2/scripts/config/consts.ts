/**
 * orchestration-v2 — Constants
 *
 * Centralized constants for the orchestrator CLI.
 */

// ─── Directory Paths ───────────────────────────────────────────────────────────

/** Default directory for workflow state (relative to CWD) */
export const DEFAULT_STATE_DIR = 'docs/.workflow-runs';

/** Directory for orchestrator global config file */
export const CONFIG_DIR_NAME = '.config';

/** Filename for the orchestrator global config file */
export const CONFIG_FILE_NAME = 'config.yaml';

/** Default filename for the SQLite database */
export const DB_FILENAME = 'state.db';

/** Default directory for pipeline YAML files (relative to CWD) */
export const DEFAULT_PIPELINE_DIR = 'docs/.workflows';

/** Default pipeline YAML filename */
export const DEFAULT_PIPELINE_FILE = 'pipeline.yaml';

/** Directory for bundled pipeline presets */
export const PRESETS_DIR_NAME = 'examples';

/** Default pipeline YAML filename */
export const DEFAULT_PIPELINE_NAME = 'default.yaml';

// ─── Defaults ────────────────────────────────────────────────────────────────

/** Default execution preset */
export const DEFAULT_PRESET = 'default';

/** Default execution channel */
export const DEFAULT_CHANNEL = 'pi';

/** Default coverage threshold (percentage) */
export const DEFAULT_COVERAGE_THRESHOLD = 80;

/** Default timeout for phases without explicit timeout (30 minutes in ms) */
export const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

// ─── Database ────────────────────────────────────────────────────────────────

/** SQLite busy timeout (ms) */
export const DB_BUSY_TIMEOUT_MS = 5000;

/** SQLite journal mode */
export const DB_JOURNAL_MODE = 'WAL';

/** Current schema version */
export const SCHEMA_VERSION = 3;

// ─── Exit Codes ──────────────────────────────────────────────────────────────

export const EXIT_SUCCESS = 0;
export const EXIT_PIPELINE_FAILED = 1;
export const EXIT_PIPELINE_PAUSED = 2;
export const EXIT_INVALID_ARGS = 10;
export const EXIT_VALIDATION_FAILED = 11;
export const EXIT_TASK_NOT_FOUND = 12;
export const EXIT_STATE_ERROR = 13;
export const EXIT_EXECUTOR_UNAVAILABLE = 20;

// ─── FSM States ───────────────────────────────────────────────────────────────

export const FSM_STATES = {
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
} as const;

// ─── Phase States ─────────────────────────────────────────────────────────────

export const PHASE_STATES = {
    PENDING: 'pending',
    READY: 'ready',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    PAUSED: 'paused',
    SKIPPED: 'skipped',
} as const;

// ─── Gate Types ─────────────────────────────────────────────────────────────

export const GATE_TYPES = {
    AUTO: 'auto',
    COMMAND: 'command',
    HUMAN: 'human',
} as const;

// ─── Run Limits ─────────────────────────────────────────────────────────────

/** Maximum iterations for the main run loop (safety valve) */
export const MAX_RUN_ITERATIONS = 100;

/** Maximum idle timeout for Bun.serve (255 is max allowed) */
export const SERVER_IDLE_TIMEOUT = 255;

// ─── CLI ────────────────────────────────────────────────────────────────────

/** Default server port */
export const DEFAULT_SERVER_PORT = 3456;

/** Default server host */
export const DEFAULT_SERVER_HOST = '127.0.0.1';

/** Environment variable for server host */
export const ENV_SERVER_HOST = 'TASKS_HOST';

/** Environment variable for server port */
export const ENV_SERVER_PORT = 'TASKS_PORT';

/** Environment variable for orchestrator state directory */
export const ENV_ORCHESTRATOR_STATE_DIR = 'ORCHESTRATOR_STATE_DIR';

/** Environment variable for local prompt agent */
export const ENV_ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT = 'ORCHESTRATION_DEV_LOCAL_PROMPT_AGENT';

/** Environment variable for ACP agent */
export const ENV_ACPX_AGENT = 'ACPX_AGENT';
