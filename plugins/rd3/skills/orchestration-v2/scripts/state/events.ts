/**
 * orchestration-v2 — Event store
 *
 * Append-only event store backed by SQLite.
 */

import type { Database } from 'bun:sqlite';
import type { OrchestratorEvent, EventType } from '../model';

export class EventStore {
    constructor(private readonly db: Database) {}

    async append(event: Omit<OrchestratorEvent, 'sequence' | 'timestamp'>): Promise<number> {
        const stmt = this.db.prepare('INSERT INTO events (run_id, event_type, payload) VALUES (?, ?, ?)');
        const result = stmt.run(event.run_id, event.event_type, JSON.stringify(event.payload));
        return Number(result.lastInsertRowid);
    }

    async query(runId: string, eventTypes?: EventType[]): Promise<OrchestratorEvent[]> {
        if (eventTypes && eventTypes.length > 0) {
            const placeholders = eventTypes.map(() => '?').join(',');
            const stmt = this.db.prepare(
                `SELECT * FROM events WHERE run_id = ? AND event_type IN (${placeholders}) ORDER BY sequence`,
            );
            const rows = stmt.all(runId, ...eventTypes) as Array<Record<string, unknown>>;
            return rows.map((r) => rowToEvent(r));
        }
        const stmt = this.db.prepare('SELECT * FROM events WHERE run_id = ? ORDER BY sequence');
        const rows = stmt.all(runId) as Array<Record<string, unknown>>;
        return rows.map((r) => rowToEvent(r));
    }

    async getEventsForRun(runId: string): Promise<OrchestratorEvent[]> {
        return this.query(runId);
    }

    async prune(olderThanMs: number): Promise<number> {
        const cutoff = new Date(Date.now() - olderThanMs).toISOString();
        const stmt = this.db.prepare('DELETE FROM events WHERE timestamp < ?');
        const result = stmt.run(cutoff);
        return Number(result.changes);
    }
}

function rowToEvent(row: Record<string, unknown>): OrchestratorEvent {
    return {
        ...(row.sequence != null && { sequence: row.sequence as number }),
        run_id: row.run_id as string,
        event_type: row.event_type as EventType,
        payload: JSON.parse(row.payload as string) as Record<string, unknown>,
        ...(row.timestamp != null && { timestamp: new Date(row.timestamp as string) }),
    };
}
