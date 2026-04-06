/**
 * orchestration-v2 — Error Types
 *
 * Centralized error types and error factory for the orchestrator.
 */

/**
 * Base error class for orchestrator errors.
 */
export class OrchestratorError extends Error {
    public constructor(
        message: string,
        public readonly code: string,
        public readonly exitCode: number,
        public readonly category: 'validation' | 'state' | 'executor' | 'config' | 'unknown' = 'unknown',
    ) {
        super(message);
        this.name = 'OrchestratorError';
    }
}

/**
 * Error codes and their metadata.
 */
export const ERROR_CODES = {
    // Validation errors (exit 10-19)
    INVALID_ARGS: {
        code: 'INVALID_ARGS',
        exitCode: 10,
        category: 'validation' as const,
        message: 'Invalid command line arguments',
    },
    VALIDATION_FAILED: {
        code: 'VALIDATION_FAILED',
        exitCode: 11,
        category: 'validation' as const,
        message: 'Pipeline validation failed',
    },

    // State errors (exit 20-29)
    TASK_NOT_FOUND: {
        code: 'TASK_NOT_FOUND',
        exitCode: 12,
        category: 'state' as const,
        message: 'Task not found',
    },
    STATE_ERROR: {
        code: 'STATE_ERROR',
        exitCode: 13,
        category: 'state' as const,
        message: 'State management error',
    },

    // Executor errors (exit 30-39)
    EXECUTOR_UNAVAILABLE: {
        code: 'EXECUTOR_UNAVAILABLE',
        exitCode: 20,
        category: 'executor' as const,
        message: 'Executor not available',
    },

    // Config errors (exit 40-49)
    CONFIG_NOT_FOUND: {
        code: 'CONFIG_NOT_FOUND',
        exitCode: 14,
        category: 'config' as const,
        message: 'Configuration file not found',
    },
    INVALID_CONFIG: {
        code: 'INVALID_CONFIG',
        exitCode: 15,
        category: 'config' as const,
        message: 'Invalid configuration',
    },

    // Pipeline errors (exit 50+)
    PIPELINE_FAILED: {
        code: 'PIPELINE_FAILED',
        exitCode: 1,
        category: 'unknown' as const,
        message: 'Pipeline execution failed',
    },
    PIPELINE_PAUSED: {
        code: 'PIPELINE_PAUSED',
        exitCode: 2,
        category: 'unknown' as const,
        message: 'Pipeline paused',
    },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;

/**
 * Create an OrchestratorError from an error code key.
 */
export function createError(code: ErrorCodeKey, message?: string): OrchestratorError {
    const errorDef = ERROR_CODES[code];
    return new OrchestratorError(message ?? errorDef.message, errorDef.code, errorDef.exitCode, errorDef.category);
}

/**
 * Format error for display.
 */
export function formatError(error: unknown): string {
    if (error instanceof OrchestratorError) {
        const context = Object.keys(error).filter(
            (k) => !['name', 'message', 'stack', 'code', 'exitCode', 'category'].includes(k),
        );
        if (context.length > 0) {
            return `${error.code}: ${error.message} (exit ${error.exitCode})`;
        }
        return `${error.code}: ${error.message}`;
    }

    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }

    return String(error);
}
