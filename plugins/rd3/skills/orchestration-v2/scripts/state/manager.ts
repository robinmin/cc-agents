/**
 * orchestration-v2 — SQLite state manager
 *
 * Manages the SQLite database for pipeline state, runs, phases,
 * gate results, rollback snapshots, and resource usage.
 */

import { Database } from 'bun:sqlite';
import type {
    RunRecord,
    PhaseRecord,
    GateResult,
    RollbackSnapshot,
    ResourceUsageRecord,
    FSMState,
    DAGPhaseState,
} from '../model';
import { runMigrations } from './migrations';

export interface StateManagerOptions {
    readonly dbPath: string;
    readonly busyTimeout?: number;
}

export class StateManager {
    private db: Database;

    constructor(options: StateManagerOptions) {
        this.db = new Database(options.dbPath, { create: true });
        const timeout = options.busyTimeout ?? 5000;
        this.db.exec(`PRAGMA busy_timeout = ${timeout}`);
        this.db.exec('PRAGMA journal_mode = WAL');
    }

    async init(): Promise<void> {
        runMigrations(this.db);
    }

    async close(): Promise<void> {
        this.db.close();
    }

    async createRun(record: Omit<RunRecord, 'created_at' | 'updated_at'>): Promise<string> {
        const stmt = this.db.prepare(
            `INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );
        stmt.run(
            record.id,
            record.task_ref,
            record.preset ?? null,
            record.phases_requested,
            record.status,
            JSON.stringify(record.config_snapshot),
            record.pipeline_name,
        );

        return record.id;
    }

    async getRun(runId: string): Promise<RunRecord | null> {
        const stmt = this.db.prepare('SELECT * FROM runs WHERE id = ?');
        const row = stmt.get(runId) as Record<string, unknown> | null;
        if (!row) return null;
        return rowToRunRecord(row);
    }

    async getRunByTaskRef(taskRef: string): Promise<RunRecord | null> {
        const stmt = this.db.prepare('SELECT * FROM runs WHERE task_ref = ? ORDER BY created_at DESC LIMIT 1');
        const row = stmt.get(taskRef) as Record<string, unknown> | null;
        if (!row) return null;
        return rowToRunRecord(row);
    }

    async getActiveRuns(): Promise<RunRecord[]> {
        const stmt = this.db.prepare(
            "SELECT * FROM runs WHERE status IN ('RUNNING', 'PAUSED') ORDER BY created_at DESC",
        );
        const rows = stmt.all() as Array<Record<string, unknown>>;
        return rows.map(rowToRunRecord);
    }

    async updateRunStatus(runId: string, status: FSMState): Promise<void> {
        const stmt = this.db.prepare('UPDATE runs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        stmt.run(status, runId);
    }

    async createPhase(
        record: Omit<PhaseRecord, 'started_at' | 'completed_at' | 'error_code' | 'error_message'>,
    ): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT INTO phases (run_id, name, status, skill, payload, rework_iteration)
       VALUES (?, ?, ?, ?, ?, ?)`,
        );
        stmt.run(
            record.run_id,
            record.name,
            record.status,
            record.skill,
            record.payload ? JSON.stringify(record.payload) : null,
            record.rework_iteration,
        );
    }

    async updatePhaseStatus(
        runId: string,
        name: string,
        status: DAGPhaseState,
        errorCode?: string,
        errorMessage?: string,
    ): Promise<void> {
        const fields: string[] = ['status = ?'];
        const values: unknown[] = [status];

        if (status === 'running') {
            fields.push('started_at = ?');
            values.push(new Date().toISOString());
        }
        if (status === 'completed' || status === 'failed') {
            fields.push('completed_at = ?');
            values.push(new Date().toISOString());
        }
        if (errorCode !== undefined) {
            fields.push('error_code = ?');
            values.push(errorCode);
        }
        if (errorMessage !== undefined) {
            fields.push('error_message = ?');
            values.push(errorMessage);
        }

        values.push(runId, name);
        const stmt = this.db.prepare(`UPDATE phases SET ${fields.join(', ')} WHERE run_id = ? AND name = ?`);
        stmt.run(...(values as Array<string | number>));
    }

    async updatePhaseReworkIteration(runId: string, name: string, iteration: number): Promise<void> {
        const stmt = this.db.prepare('UPDATE phases SET rework_iteration = ? WHERE run_id = ? AND name = ?');
        stmt.run(iteration, runId, name);
    }

    async getPhasesByStatus(runId: string, status: DAGPhaseState): Promise<PhaseRecord[]> {
        const stmt = this.db.prepare('SELECT * FROM phases WHERE run_id = ? AND status = ?');
        const rows = stmt.all(runId, status) as Array<Record<string, unknown>>;
        return rows.map(rowToPhaseRecord);
    }

    async updatePhase(
        runId: string,
        name: string,
        status: DAGPhaseState,
        updates?: Partial<PhaseRecord>,
    ): Promise<void> {
        const fields: string[] = ['status = ?'];
        const values: unknown[] = [status];

        if (updates?.started_at) {
            fields.push('started_at = ?');
            values.push(updates.started_at.toISOString());
        }
        if (updates?.completed_at) {
            fields.push('completed_at = ?');
            values.push(updates.completed_at.toISOString());
        }
        if (updates?.error_code !== undefined) {
            fields.push('error_code = ?');
            values.push(updates.error_code);
        }
        if (updates?.error_message !== undefined) {
            fields.push('error_message = ?');
            values.push(updates.error_message);
        }
        if (updates?.rework_iteration !== undefined) {
            fields.push('rework_iteration = ?');
            values.push(updates.rework_iteration);
        }
        if (updates?.payload !== undefined) {
            fields.push('payload = ?');
            values.push(JSON.stringify(updates.payload));
        }

        values.push(runId, name);
        const stmt = this.db.prepare(`UPDATE phases SET ${fields.join(', ')} WHERE run_id = ? AND name = ?`);
        stmt.run(...(values as Array<string | number>));
    }

    async getPhase(runId: string, name: string): Promise<PhaseRecord | null> {
        const stmt = this.db.prepare('SELECT * FROM phases WHERE run_id = ? AND name = ?');
        const row = stmt.get(runId, name) as Record<string, unknown> | null;
        if (!row) return null;
        return rowToPhaseRecord(row);
    }

    async getPhases(runId: string): Promise<PhaseRecord[]> {
        const stmt = this.db.prepare('SELECT * FROM phases WHERE run_id = ? ORDER BY name');
        const rows = stmt.all(runId) as Array<Record<string, unknown>>;
        return rows.map(rowToPhaseRecord);
    }

    async saveGateResult(result: GateResult): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT OR REPLACE INTO gate_results (run_id, phase_name, step_name, checker_method, passed, evidence, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );
        stmt.run(
            result.run_id,
            result.phase_name,
            result.step_name,
            result.checker_method,
            result.passed ? 1 : 0,
            result.evidence ? JSON.stringify(result.evidence) : null,
            result.duration_ms ?? null,
        );
    }

    async getGateResults(runId: string, phaseName: string): Promise<GateResult[]> {
        const stmt = this.db.prepare(
            'SELECT * FROM gate_results WHERE run_id = ? AND phase_name = ? ORDER BY created_at',
        );
        const rows = stmt.all(runId, phaseName) as Array<Record<string, unknown>>;
        return rows.map(rowToGateResult);
    }

    async saveRollbackSnapshot(snapshot: RollbackSnapshot): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT OR REPLACE INTO rollback_snapshots (run_id, phase_name, git_head, files_before, files_after)
       VALUES (?, ?, ?, ?, ?)`,
        );
        stmt.run(
            snapshot.run_id,
            snapshot.phase_name,
            snapshot.git_head ?? null,
            snapshot.files_before ? JSON.stringify(snapshot.files_before) : null,
            snapshot.files_after ? JSON.stringify(snapshot.files_after) : null,
        );
    }

    async getRollbackSnapshot(runId: string, phaseName: string): Promise<RollbackSnapshot | null> {
        const stmt = this.db.prepare('SELECT * FROM rollback_snapshots WHERE run_id = ? AND phase_name = ?');
        const row = stmt.get(runId, phaseName) as Record<string, unknown> | null;
        if (!row) return null;
        return rowToRollbackSnapshot(row);
    }

    async saveResourceUsage(usage: Omit<ResourceUsageRecord, 'id' | 'recorded_at'>): Promise<void> {
        const stmt = this.db.prepare(
            `INSERT INTO resource_usage (run_id, phase_name, model_id, model_provider, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, wall_clock_ms, execution_ms, first_token_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        stmt.run(
            usage.run_id,
            usage.phase_name,
            usage.model_id,
            usage.model_provider,
            usage.input_tokens,
            usage.output_tokens,
            usage.cache_read_tokens,
            usage.cache_creation_tokens,
            usage.wall_clock_ms,
            usage.execution_ms,
            usage.first_token_ms ?? null,
        );
    }

    async getResourceUsage(runId: string): Promise<ResourceUsageRecord[]> {
        const stmt = this.db.prepare('SELECT * FROM resource_usage WHERE run_id = ? ORDER BY id');
        const rows = stmt.all(runId) as Array<Record<string, unknown>>;
        return rows.map(rowToResourceUsage);
    }

    /** Expose db for queries module */
    getDb(): Database {
        return this.db;
    }
}

// ─── Row-to-Record Mappers ──────────────────────────────────────────────────

function rowToRunRecord(row: Record<string, unknown>): RunRecord {
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

function rowToPhaseRecord(row: Record<string, unknown>): PhaseRecord {
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

function rowToGateResult(row: Record<string, unknown>): GateResult {
    return {
        run_id: row.run_id as string,
        phase_name: row.phase_name as string,
        step_name: row.step_name as string,
        checker_method: row.checker_method as string,
        passed: (row.passed as number) === 1,
        ...(row.evidence != null && { evidence: JSON.parse(row.evidence as string) as Record<string, unknown> }),
        ...(row.duration_ms != null && { duration_ms: row.duration_ms as number }),
        ...(row.created_at != null && { created_at: new Date(row.created_at as string) }),
    };
}

function rowToRollbackSnapshot(row: Record<string, unknown>): RollbackSnapshot {
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

function rowToResourceUsage(row: Record<string, unknown>): ResourceUsageRecord {
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
