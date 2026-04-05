/**
 * orchestration-v2 — DAO Row Parsers
 *
 * Centralized row-to-record parsing functions.
 * These parsers convert database rows to typed records.
 */

import type {
    RunRecord,
    PhaseRecord,
    GateResult,
    PhaseEvidenceRecord,
    RollbackSnapshot,
    ResourceUsageRecord,
    FSMState,
    DAGPhaseState,
} from '../model';

/**
 * Parse a database row to a RunRecord.
 */
export function parseRunRecord(row: Record<string, unknown>): RunRecord {
    return {
        id: row.id as string,
        task_ref: row.task_ref as string,
        ...(row.preset != null && { preset: row.preset as string }),
        phases_requested: row.phases_requested as string,
        status: row.status as FSMState,
        config_snapshot: JSON.parse(row.config_snapshot as string) as Record<string, unknown>,
        pipeline_name: row.pipeline_name as string,
        ...(row.created_at != null && { created_at: new Date(row.created_at as string) }),
        ...(row.updated_at != null && { updated_at: new Date(row.updated_at as string) }),
    };
}

/**
 * Parse a database row to a PhaseRecord.
 */
export function parsePhaseRecord(row: Record<string, unknown>): PhaseRecord {
    return {
        run_id: row.run_id as string,
        name: row.name as string,
        status: row.status as DAGPhaseState,
        skill: row.skill as string,
        ...(row.payload != null && { payload: JSON.parse(row.payload as string) as Record<string, unknown> }),
        ...(row.started_at != null && { started_at: new Date(row.started_at as string) }),
        ...(row.completed_at != null && { completed_at: new Date(row.completed_at as string) }),
        ...(row.error_code != null && { error_code: row.error_code as string }),
        ...(row.error_message != null && { error_message: row.error_message as string }),
        rework_iteration: (row.rework_iteration as number) ?? 0,
    };
}

/**
 * Parse a database row to a GateResult.
 */
export function parseGateResult(row: Record<string, unknown>): GateResult {
    return {
        run_id: row.run_id as string,
        phase_name: row.phase_name as string,
        step_name: row.step_name as string,
        checker_method: row.checker_method as string,
        passed: (row.passed as number) === 1,
        ...(row.advisory != null && (row.advisory as number) === 1 ? { advisory: true } : {}),
        ...(row.evidence != null && { evidence: JSON.parse(row.evidence as string) as Record<string, unknown> }),
        ...(row.duration_ms != null && { duration_ms: row.duration_ms as number }),
        ...(row.created_at != null && { created_at: new Date(row.created_at as string) }),
    };
}

/**
 * Parse a database row to a PhaseEvidenceRecord.
 */
export function parsePhaseEvidenceRecord(row: Record<string, unknown>): PhaseEvidenceRecord {
    return {
        run_id: row.run_id as string,
        phase_name: row.phase_name as string,
        rework_iteration: (row.rework_iteration as number) ?? 0,
        evidence: JSON.parse(row.evidence as string) as Record<string, unknown>,
        ...(row.created_at != null && { created_at: new Date(row.created_at as string) }),
    };
}

/**
 * Parse a database row to a RollbackSnapshot.
 */
export function parseRollbackSnapshot(row: Record<string, unknown>): RollbackSnapshot {
    return {
        run_id: row.run_id as string,
        phase_name: row.phase_name as string,
        ...(row.git_head != null && { git_head: row.git_head as string }),
        ...(row.files_before != null && {
            files_before: JSON.parse(row.files_before as string) as Record<string, unknown>,
        }),
        ...(row.files_after != null && {
            files_after: JSON.parse(row.files_after as string) as Record<string, unknown>,
        }),
        ...(row.created_at != null && { created_at: new Date(row.created_at as string) }),
    };
}

/**
 * Parse a database row to a ResourceUsageRecord.
 */
export function parseResourceUsage(row: Record<string, unknown>): ResourceUsageRecord {
    return {
        id: row.id as number,
        run_id: row.run_id as string,
        phase_name: row.phase_name as string,
        model_id: row.model_id as string,
        model_provider: row.model_provider as string,
        input_tokens: row.input_tokens as number,
        output_tokens: row.output_tokens as number,
        cache_read_tokens: (row.cache_read_tokens as number) ?? 0,
        cache_creation_tokens: (row.cache_creation_tokens as number) ?? 0,
        wall_clock_ms: row.wall_clock_ms as number,
        execution_ms: row.execution_ms as number,
        ...(row.first_token_ms != null && { first_token_ms: row.first_token_ms as number }),
        ...(row.recorded_at != null && { recorded_at: new Date(row.recorded_at as string) }),
    };
}
