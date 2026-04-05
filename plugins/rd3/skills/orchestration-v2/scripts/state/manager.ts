/**
 * orchestration-v2 — SQLite state manager
 *
 * Manages the SQLite database for pipeline state, runs, phases,
 * gate results, rollback snapshots, and resource usage.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
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
import { runMigrations } from './migrations';
import {
    RUN_SQL,
    PHASE_SQL,
    GATE_RESULT_SQL,
    PHASE_EVIDENCE_SQL,
    ROLLBACK_SQL,
    RESOURCE_USAGE_SQL,
    parseRunRecord,
    parsePhaseRecord,
    parseGateResult,
    parsePhaseEvidenceRecord,
    parseRollbackSnapshot,
    parseResourceUsage,
} from '../dao';

export interface StateManagerOptions {
    readonly dbPath: string;
    readonly busyTimeout?: number;
}

export class StateManager {
    private db: Database;

    constructor(options: StateManagerOptions) {
        if (options.dbPath !== ':memory:') {
            mkdirSync(dirname(options.dbPath), { recursive: true });
        }
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
        const stmt = this.db.prepare(RUN_SQL.insert);
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
        const stmt = this.db.prepare(RUN_SQL.selectById);
        const row = stmt.get(runId) as Record<string, unknown> | null;
        if (!row) return null;
        return parseRunRecord(row);
    }

    async getRunByTaskRef(taskRef: string): Promise<RunRecord | null> {
        const stmt = this.db.prepare(RUN_SQL.selectByTaskRef);
        const row = stmt.get(taskRef) as Record<string, unknown> | null;
        if (!row) return null;
        return parseRunRecord(row);
    }

    async getActiveRuns(): Promise<RunRecord[]> {
        const stmt = this.db.prepare(RUN_SQL.selectActive);
        const rows = stmt.all() as Array<Record<string, unknown>>;
        return rows.map(parseRunRecord);
    }

    async updateRunStatus(runId: string, status: FSMState): Promise<void> {
        const stmt = this.db.prepare(RUN_SQL.updateStatus);
        stmt.run(status, runId);
    }

    async createPhase(
        record: Omit<PhaseRecord, 'started_at' | 'completed_at' | 'error_code' | 'error_message'>,
    ): Promise<void> {
        const stmt = this.db.prepare(PHASE_SQL.insert);
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
        } else if (status === 'completed' || status === 'failed') {
            fields.push('completed_at = ?');
            values.push(new Date().toISOString());
        } else {
            fields.push('started_at = ?');
            values.push(null);
            fields.push('completed_at = ?');
            values.push(null);
        }

        if (errorCode !== undefined) {
            fields.push('error_code = ?');
            values.push(errorCode);
        } else {
            fields.push('error_code = ?');
            values.push(null);
        }

        if (errorMessage !== undefined) {
            fields.push('error_message = ?');
            values.push(errorMessage);
        } else {
            fields.push('error_message = ?');
            values.push(null);
        }

        values.push(runId, name);
        const sql = `UPDATE phases SET ${fields.join(', ')} WHERE run_id = ? AND name = ?`;
        this.db.prepare(sql).run(...(values as Array<string | number>));
    }

    async updatePhaseReworkIteration(runId: string, name: string, iteration: number): Promise<void> {
        const stmt = this.db.prepare(PHASE_SQL.updateReworkIteration);
        stmt.run(iteration, runId, name);
    }

    async getPhasesByStatus(runId: string, status: DAGPhaseState): Promise<PhaseRecord[]> {
        const stmt = this.db.prepare(PHASE_SQL.selectByRunAndStatus);
        const rows = stmt.all(runId, status) as Array<Record<string, unknown>>;
        return rows.map(parsePhaseRecord);
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
        const sql = `UPDATE phases SET ${fields.join(', ')} WHERE run_id = ? AND name = ?`;
        this.db.prepare(sql).run(...(values as Array<string | number>));
    }

    async getPhase(runId: string, name: string): Promise<PhaseRecord | null> {
        const stmt = this.db.prepare(PHASE_SQL.selectByRunAndName);
        const row = stmt.get(runId, name) as Record<string, unknown> | null;
        if (!row) return null;
        return parsePhaseRecord(row);
    }

    async getPhases(runId: string): Promise<PhaseRecord[]> {
        const stmt = this.db.prepare(PHASE_SQL.selectByRun);
        const rows = stmt.all(runId) as Array<Record<string, unknown>>;
        return rows.map(parsePhaseRecord);
    }

    async saveGateResult(result: GateResult): Promise<void> {
        const stepName = this.resolveGateResultStepName(result);
        const stmt = this.db.prepare(GATE_RESULT_SQL.insert);
        stmt.run(
            result.run_id,
            result.phase_name,
            stepName,
            result.checker_method,
            result.passed ? 1 : 0,
            result.advisory ? 1 : 0,
            result.evidence ? JSON.stringify(result.evidence) : null,
            result.duration_ms ?? null,
        );
    }

    async getGateResults(runId: string, phaseName: string): Promise<GateResult[]> {
        const stmt = this.db.prepare(GATE_RESULT_SQL.selectByRunAndPhase);
        const rows = stmt.all(runId, phaseName) as Array<Record<string, unknown>>;
        return rows.map(parseGateResult);
    }

    async savePhaseEvidence(record: Omit<PhaseEvidenceRecord, 'created_at'>): Promise<void> {
        const stmt = this.db.prepare(PHASE_EVIDENCE_SQL.insert);
        stmt.run(record.run_id, record.phase_name, record.rework_iteration, JSON.stringify(record.evidence));
    }

    async getPhaseEvidence(runId: string, phaseName: string): Promise<PhaseEvidenceRecord[]> {
        const stmt = this.db.prepare(PHASE_EVIDENCE_SQL.selectByRunAndPhase);
        const rows = stmt.all(runId, phaseName) as Array<Record<string, unknown>>;
        return rows.map(parsePhaseEvidenceRecord);
    }

    async saveRollbackSnapshot(snapshot: RollbackSnapshot): Promise<void> {
        const stmt = this.db.prepare(ROLLBACK_SQL.insert);
        stmt.run(
            snapshot.run_id,
            snapshot.phase_name,
            snapshot.git_head ?? null,
            snapshot.files_before ? JSON.stringify(snapshot.files_before) : null,
            snapshot.files_after ? JSON.stringify(snapshot.files_after) : null,
        );
    }

    async getRollbackSnapshot(runId: string, phaseName: string): Promise<RollbackSnapshot | null> {
        const stmt = this.db.prepare(ROLLBACK_SQL.selectByRunAndPhase);
        const row = stmt.get(runId, phaseName) as Record<string, unknown> | null;
        if (!row) return null;
        return parseRollbackSnapshot(row);
    }

    async saveResourceUsage(usage: Omit<ResourceUsageRecord, 'id' | 'recorded_at'>): Promise<void> {
        const stmt = this.db.prepare(RESOURCE_USAGE_SQL.insert);
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
        const stmt = this.db.prepare(RESOURCE_USAGE_SQL.selectByRun);
        const rows = stmt.all(runId) as Array<Record<string, unknown>>;
        return rows.map(parseResourceUsage);
    }

    /** Expose db for queries module */
    getDb(): Database {
        return this.db;
    }

    private resolveGateResultStepName(result: GateResult): string {
        // SQL returns rows where step_name == base OR step_name GLOB 'base#*'.
        const existing = this.db
            .prepare(GATE_RESULT_SQL.selectExistingSteps)
            .all(result.run_id, result.phase_name, result.step_name, `${result.step_name}#*`) as Array<{
            step_name: string;
        }>;

        // No existing rows — this is the first attempt; insert with base name.
        if (existing.length === 0) {
            return result.step_name;
        }

        let maxSuffix = 1;
        for (const row of existing) {
            if (row.step_name === result.step_name) {
                // Exact match — base row already present; increment from 1
                maxSuffix = Math.max(maxSuffix, 1);
            } else {
                // Suffix variant — extract the number after '#'
                const match = row.step_name.match(/#(\d+)$/);
                if (match) {
                    maxSuffix = Math.max(maxSuffix, Number.parseInt(match[1], 10));
                }
            }
        }

        return `${result.step_name}#${maxSuffix + 1}`;
    }
}
