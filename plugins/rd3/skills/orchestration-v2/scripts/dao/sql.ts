/**
 * orchestration-v2 — DAO SQL Constants
 *
 * Centralized SQL statements for all database operations.
 * These constants should be used with prepared statements in the state manager.
 */

// ─── Run SQL ───────────────────────────────────────────────────────────────

export const RUN_SQL = {
    insert: `INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,

    selectById: `SELECT * FROM runs WHERE id = ?`,

    selectByTaskRef: `SELECT * FROM runs WHERE task_ref = ? ORDER BY created_at DESC LIMIT 1`,

    selectActive: `SELECT * FROM runs WHERE status IN ('RUNNING', 'PAUSED') ORDER BY created_at DESC`,

    updateStatus: `UPDATE runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
} as const;

// ─── Phase SQL ─────────────────────────────────────────────────────────────

export const PHASE_SQL = {
    insert: `INSERT INTO phases (run_id, name, status, skill, payload, rework_iteration)
             VALUES (?, ?, ?, ?, ?, ?)`,

    selectByRunAndName: `SELECT * FROM phases WHERE run_id = ? AND name = ?`,

    selectByRun: `SELECT * FROM phases WHERE run_id = ? ORDER BY name`,

    selectByRunAndStatus: `SELECT * FROM phases WHERE run_id = ? AND status = ?`,

    updateStatus: `UPDATE phases SET status = ?, started_at = ?, completed_at = ?, error_code = ?, error_message = ? WHERE run_id = ? AND name = ?`,

    updateReworkIteration: `UPDATE phases SET rework_iteration = ? WHERE run_id = ? AND name = ?`,
} as const;

// ─── Gate Result SQL ──────────────────────────────────────────────────────

export const GATE_RESULT_SQL = {
    insert: `INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, advisory, evidence, duration_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,

    selectByRunAndPhase: `SELECT * FROM gate_results WHERE run_id = ? AND phase_name = ? ORDER BY created_at`,

    // Returns rows where step_name matches the base name OR matches the "name#*" glob pattern.
    // The loop in resolveGateResultStepName includes the base name to compute correct suffixes.
    selectExistingSteps: `SELECT step_name FROM gate_results
         WHERE run_id = ? AND phase_name = ? AND (step_name = ? OR step_name GLOB ?)
         ORDER BY created_at, step_name`,
} as const;

// ─── Phase Evidence SQL ────────────────────────────────────────────────────

export const PHASE_EVIDENCE_SQL = {
    insert: `INSERT INTO phase_evidence (run_id, phase_name, rework_iteration, evidence)
             VALUES (?, ?, ?, ?)`,

    selectByRunAndPhase: `SELECT run_id, phase_name, rework_iteration, evidence, created_at
         FROM phase_evidence WHERE run_id = ? AND phase_name = ? ORDER BY created_at, id`,
} as const;

// ─── Rollback Snapshot SQL ────────────────────────────────────────────────

export const ROLLBACK_SQL = {
    insert: `INSERT OR REPLACE INTO rollback_snapshots (run_id, phase_name, git_head, files_before, files_after)
             VALUES (?, ?, ?, ?, ?)`,

    selectByRunAndPhase: `SELECT * FROM rollback_snapshots WHERE run_id = ? AND phase_name = ?`,
} as const;

// ─── Resource Usage SQL ────────────────────────────────────────────────────

export const RESOURCE_USAGE_SQL = {
    insert: `INSERT INTO resource_usage (run_id, phase_name, model_id, model_provider, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, wall_clock_ms, execution_ms, first_token_ms)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,

    selectByRun: `SELECT * FROM resource_usage WHERE run_id = ? ORDER BY id`,
} as const;
