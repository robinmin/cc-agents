/**
 * orchestration-v2 — Common queries
 *
 * Aggregation queries for status, history, and reports.
 */

import type { Database } from 'bun:sqlite';
import type { RunRecord, PhaseRecord, ResourceUsageRecord, FSMState } from '../model';

export interface RunSummary {
    readonly run: RunRecord;
    readonly phases: PhaseRecord[];
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly totalWallMs: number;
    readonly modelsUsed: string[];
}

export interface HistoryEntry {
    readonly runId: string;
    readonly taskRef: string;
    readonly preset?: string;
    readonly status: string;
    readonly durationMs: number;
    readonly totalTokens: number;
    readonly createdAt?: Date;
}

export interface PresetStats {
    readonly preset: string;
    readonly totalRuns: number;
    readonly successes: number;
    readonly successRate: number;
}

export interface PresetTrend {
    readonly preset: string;
    readonly totalRuns: number;
    readonly successes: number;
    readonly successRate: number;
    readonly avgDurationMs: number;
}

export interface TrendReport {
    readonly periodDays: number;
    readonly totalRuns: number;
    readonly successes: number;
    readonly successRate: number;
    readonly presets: PresetTrend[];
}

export interface HistoryFilters {
    preset?: string;
    since?: string;
    failed?: boolean;
}

export class Queries {
    constructor(private readonly db: Database) {}

    async getRunSummary(runId: string): Promise<RunSummary | null> {
        const runRow = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(runId) as Record<string, unknown> | null;
        if (!runRow) return null;

        const phaseRows = this.db.prepare('SELECT * FROM phases WHERE run_id = ? ORDER BY name').all(runId) as Array<
            Record<string, unknown>
        >;

        const usageRows = this.db.prepare('SELECT * FROM resource_usage WHERE run_id = ?').all(runId) as Array<
            Record<string, unknown>
        >;

        const phases = phaseRows.map(rowToPhaseRecord);
        const totalInputTokens = usageRows.reduce((sum, r) => sum + (r.input_tokens as number), 0);
        const totalOutputTokens = usageRows.reduce((sum, r) => sum + (r.output_tokens as number), 0);
        const totalWallMs = usageRows.reduce((sum, r) => sum + (r.wall_clock_ms as number), 0);
        const modelsUsed = [...new Set(usageRows.map((r) => r.model_id as string))];

        return {
            run: rowToRunRecord(runRow),
            phases,
            totalInputTokens,
            totalOutputTokens,
            totalWallMs,
            modelsUsed,
        };
    }

    async getHistory(limit: number, filters?: HistoryFilters): Promise<HistoryEntry[]> {
        let sql =
            'SELECT r.id, r.task_ref, r.preset, r.status, r.created_at, COALESCE(SUM(ru.input_tokens + ru.output_tokens), 0) as total_tokens, COALESCE(SUM(ru.wall_clock_ms), 0) as total_wall_ms FROM runs r LEFT JOIN resource_usage ru ON ru.run_id = r.id';
        const conditions: string[] = [];
        const values: unknown[] = [];

        if (filters?.preset) {
            conditions.push('r.preset = ?');
            values.push(filters.preset);
        }
        if (filters?.since) {
            conditions.push('r.created_at >= ?');
            values.push(filters.since);
        }
        if (filters?.failed) {
            conditions.push("r.status = 'FAILED'");
        }

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        sql += ' GROUP BY r.id ORDER BY r.created_at DESC LIMIT ?';
        values.push(limit);

        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...(values as Array<string | number>)) as Array<Record<string, unknown>>;
        return rows.map((row) => ({
            runId: row.id as string,
            taskRef: row.task_ref as string,
            ...(row.preset != null && { preset: row.preset as string }),
            status: row.status as string,
            durationMs: (row.total_wall_ms as number) ?? 0,
            totalTokens: (row.total_tokens as number) ?? 0,
            ...(row.created_at != null && { createdAt: new Date(row.created_at as string) }),
        }));
    }

    async getPresetStats(): Promise<PresetStats[]> {
        const rows = this.db
            .prepare(
                `SELECT preset,
              COUNT(*) as total_runs,
              SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successes
       FROM runs
       WHERE preset IS NOT NULL
       GROUP BY preset`,
            )
            .all() as Array<Record<string, unknown>>;

        return rows.map((row) => {
            const total = row.total_runs as number;
            const successes = row.successes as number;
            return {
                preset: row.preset as string,
                totalRuns: total,
                successes,
                successRate: total > 0 ? Math.round((100 * successes) / total) / 100 : 0,
            };
        });
    }

    async getTokenUsageByModel(): Promise<
        {
            model_id: string;
            model_provider: string;
            total_input: number;
            total_output: number;
            call_count: number;
        }[]
    > {
        const rows = this.db
            .prepare(
                `SELECT model_id, model_provider,
              SUM(input_tokens) AS total_input,
              SUM(output_tokens) AS total_output,
              COUNT(*) AS call_count
       FROM resource_usage
       GROUP BY model_id, model_provider`,
            )
            .all() as Array<Record<string, unknown>>;

        return rows.map((row) => ({
            model_id: row.model_id as string,
            model_provider: row.model_provider as string,
            total_input: row.total_input as number,
            total_output: row.total_output as number,
            call_count: row.call_count as number,
        }));
    }

    async getAveragePhaseDuration(): Promise<
        {
            preset: string;
            phase_name: string;
            avg_ms: number;
            avg_tokens: number;
        }[]
    > {
        const rows = this.db
            .prepare(
                `SELECT r.preset, p.name AS phase_name,
              AVG(CAST((julianday(p.completed_at) - julianday(p.started_at)) * 86400000 AS INTEGER)) AS avg_ms,
              AVG(COALESCE(ru.input_tokens, 0) + COALESCE(ru.output_tokens, 0)) AS avg_tokens
       FROM phases p
       JOIN runs r ON p.run_id = r.id
       LEFT JOIN resource_usage ru ON ru.run_id = p.run_id AND ru.phase_name = p.name
       WHERE p.status = 'completed'
       GROUP BY r.preset, p.name`,
            )
            .all() as Array<Record<string, unknown>>;

        return rows.map((row) => ({
            preset: (row.preset as string) ?? 'unknown',
            phase_name: row.phase_name as string,
            avg_ms: Math.round(row.avg_ms as number) ?? 0,
            avg_tokens: Math.round(row.avg_tokens as number) ?? 0,
        }));
    }

    async getResourceUsageForRun(runId: string): Promise<ResourceUsageRecord[]> {
        const rows = this.db.prepare('SELECT * FROM resource_usage WHERE run_id = ? ORDER BY id').all(runId) as Array<
            Record<string, unknown>
        >;
        return rows.map(rowToResourceUsage);
    }

    async getTrends(days = 30): Promise<TrendReport> {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const overall = this.db
            .prepare(
                `SELECT COUNT(*) as total_runs,
              SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successes
       FROM runs
       WHERE created_at >= ?`,
            )
            .get(since) as Record<string, unknown> | null;

        const totalRuns = (overall?.total_runs as number) ?? 0;
        const successes = (overall?.successes as number) ?? 0;
        const successRate = totalRuns > 0 ? Math.round((100 * successes) / totalRuns) : 0;

        const byPreset = this.db
            .prepare(
                `SELECT preset,
              COUNT(*) as total_runs,
              SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successes,
              AVG(CAST((julianday(updated_at) - julianday(created_at)) * 86400000 AS INTEGER)) as avg_duration_ms
       FROM runs
       WHERE created_at >= ? AND preset IS NOT NULL
       GROUP BY preset`,
            )
            .all(since) as Array<Record<string, unknown>>;

        const presetTrends: PresetTrend[] = byPreset.map((row) => {
            const runs = row.total_runs as number;
            const succ = (row.successes as number) ?? 0;
            return {
                preset: row.preset as string,
                totalRuns: runs,
                successes: succ,
                successRate: runs > 0 ? Math.round((100 * succ) / runs) : 0,
                avgDurationMs: Math.round((row.avg_duration_ms as number) ?? 0),
            };
        });

        return {
            periodDays: days,
            totalRuns,
            successes,
            successRate,
            presets: presetTrends,
        };
    }
}

// ─── Row Mappers (shared with manager.ts pattern) ────────────────────────────

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
        status: row.status as PhaseRecord['status'],
        skill: row.skill as string,
        ...(row.payload != null && { payload: JSON.parse(row.payload as string) as Record<string, unknown> }),
        ...(row.started_at != null && { started_at: new Date(row.started_at as string) }),
        ...(row.completed_at != null && { completed_at: new Date(row.completed_at as string) }),
        ...(row.error_code != null && { error_code: row.error_code as string }),
        ...(row.error_message != null && { error_message: row.error_message as string }),
        rework_iteration: (row.rework_iteration as number) ?? 0,
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
