/**
 * orchestration-v2 — Event store pruning
 *
 * Compacts the SQLite event store by deleting events, gate results,
 * resource usage, and rollback snapshots for qualifying runs.
 * Preserves runs and phases records for historical queries.
 */

import type { Database } from 'bun:sqlite';

// ─── Duration Parser ──────────────────────────────────────────────────────────

export interface ParsedDuration {
    readonly ms: number;
    readonly original: string;
}

const DURATION_REGEX = /^(\d+(?:\.\d+)?)([smhdwMy])$/;

const DURATION_UNITS: Record<string, number> = {
    s: 1000, // seconds
    m: 60 * 1000, // minutes
    h: 60 * 60 * 1000, // hours
    d: 24 * 60 * 60 * 1000, // days
    w: 7 * 24 * 60 * 60 * 1000, // weeks
    M: 30 * 24 * 60 * 60 * 1000, // months (approximate)
    y: 365 * 24 * 60 * 60 * 1000, // years (approximate)
};

/**
 * Parse a duration string (e.g., "30d", "90d", "1y", "2h", "30m").
 * Returns milliseconds or throws on invalid input.
 */
export function parseDuration(input: string): ParsedDuration {
    const match = DURATION_REGEX.exec(input.trim());
    if (!match) {
        throw new Error(
            `Invalid duration: "${input}". Expected format: <number><unit> where unit is s, m, h, d, w, M, or y (e.g., "30d", "1y")`,
        );
    }

    const value = parseFloat(match[1]);
    const unit = match[2];
    const ms = Math.floor(value * DURATION_UNITS[unit]);

    return { ms, original: input };
}

// ─── Prune Result ─────────────────────────────────────────────────────────────

export interface PruneCounts {
    readonly runsAffected: number;
    readonly eventsDeleted: number;
    readonly gateResultsDeleted: number;
    readonly resourceUsageDeleted: number;
    readonly rollbackSnapshotsDeleted: number;
}

export interface PruneOptions {
    /** Duration string (e.g., "30d") — prune runs older than this */
    readonly olderThan?: string;
    /** Keep only the last N runs */
    readonly keepLast?: number;
    /** If true, report what would be deleted without making changes */
    readonly dryRun?: boolean;
}

// ─── Pruner ───────────────────────────────────────────────────────────────────

export class Pruner {
    constructor(private readonly db: Database) {}

    /**
     * Get run IDs older than the specified duration from now.
     */
    getRunIdsOlderThan(olderThanMs: number): string[] {
        const cutoff = new Date(Date.now() - olderThanMs).toISOString();
        const stmt = this.db.prepare(
            "SELECT id FROM runs WHERE created_at < ? AND status IN ('COMPLETED', 'FAILED') ORDER BY created_at ASC",
        );
        const rows = stmt.all(cutoff) as Array<{ id: string }>;
        return rows.map((r) => r.id);
    }

    /**
     * Get run IDs beyond the last N (i.e., all runs except the N most recent).
     */
    getRunIdsBeyondKeepLast(keepLast: number): string[] {
        const stmt = this.db.prepare(
            "SELECT id FROM runs WHERE status IN ('COMPLETED', 'FAILED') AND id NOT IN (SELECT id FROM runs ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC",
        );
        const rows = stmt.all(keepLast) as Array<{ id: string }>;
        return rows.map((r) => r.id);
    }

    /**
     * Count records that would be deleted for given run IDs (no mutations).
     */
    countForRunIds(runIds: string[]): PruneCounts {
        if (runIds.length === 0) {
            return {
                runsAffected: 0,
                eventsDeleted: 0,
                gateResultsDeleted: 0,
                resourceUsageDeleted: 0,
                rollbackSnapshotsDeleted: 0,
            };
        }

        const placeholders = runIds.map(() => '?').join(',');

        const eventsCount = (
            this.db
                .prepare(`SELECT COUNT(*) as count FROM events WHERE run_id IN (${placeholders})`)
                .get(...runIds) as { count: number }
        ).count;

        const gateResultsCount = (
            this.db
                .prepare(`SELECT COUNT(*) as count FROM gate_results WHERE run_id IN (${placeholders})`)
                .get(...runIds) as { count: number }
        ).count;

        const resourceUsageCount = (
            this.db
                .prepare(`SELECT COUNT(*) as count FROM resource_usage WHERE run_id IN (${placeholders})`)
                .get(...runIds) as { count: number }
        ).count;

        const rollbackSnapshotsCount = (
            this.db
                .prepare(`SELECT COUNT(*) as count FROM rollback_snapshots WHERE run_id IN (${placeholders})`)
                .get(...runIds) as { count: number }
        ).count;

        return {
            runsAffected: runIds.length,
            eventsDeleted: eventsCount,
            gateResultsDeleted: gateResultsCount,
            resourceUsageDeleted: resourceUsageCount,
            rollbackSnapshotsDeleted: rollbackSnapshotsCount,
        };
    }

    /**
     * Delete records from prune tables for given run IDs.
     * Returns counts of deleted rows.
     */
    deleteForRunIds(runIds: string[]): PruneCounts {
        if (runIds.length === 0) {
            return {
                runsAffected: 0,
                eventsDeleted: 0,
                gateResultsDeleted: 0,
                resourceUsageDeleted: 0,
                rollbackSnapshotsDeleted: 0,
            };
        }

        const placeholders = runIds.map(() => '?').join(',');

        const eventsDeleted = this.db
            .prepare(`DELETE FROM events WHERE run_id IN (${placeholders})`)
            .run(...runIds).changes;

        const gateResultsDeleted = this.db
            .prepare(`DELETE FROM gate_results WHERE run_id IN (${placeholders})`)
            .run(...runIds).changes;

        const resourceUsageDeleted = this.db
            .prepare(`DELETE FROM resource_usage WHERE run_id IN (${placeholders})`)
            .run(...runIds).changes;

        const rollbackSnapshotsDeleted = this.db
            .prepare(`DELETE FROM rollback_snapshots WHERE run_id IN (${placeholders})`)
            .run(...runIds).changes;

        return {
            runsAffected: runIds.length,
            eventsDeleted,
            gateResultsDeleted,
            resourceUsageDeleted,
            rollbackSnapshotsDeleted,
        };
    }

    /**
     * Execute pruning based on options.
     * Default: prune runs older than 30 days.
     */
    prune(options: PruneOptions): PruneCounts {
        const runIds = this.resolveRunIds(options);

        if (options.dryRun) {
            return this.countForRunIds(runIds);
        }

        return this.deleteForRunIds(runIds);
    }

    /**
     * Resolve run IDs based on prune options.
     */
    private resolveRunIds(options: PruneOptions): string[] {
        if (options.keepLast != null && options.keepLast > 0) {
            return this.getRunIdsBeyondKeepLast(options.keepLast);
        }

        if (options.olderThan) {
            const parsed = parseDuration(options.olderThan);
            return this.getRunIdsOlderThan(parsed.ms);
        }

        // Default: older than 30 days
        return this.getRunIdsOlderThan(30 * 24 * 60 * 60 * 1000);
    }
}
