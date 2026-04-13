/**
 * ftree — Feature Service
 *
 * Business logic layer for feature tree operations.
 * Uses Drizzle for simple CRUD and raw SQL for recursive CTEs.
 */

import type { Database } from 'bun:sqlite';
import type { DbAdapter } from '../db/adapter';
import { getDefaultAdapter } from '../db/client';
import { InternalError, NotFoundError, ValidationError } from '../errors';
import { parseFeature } from '../lib/dao/parsers';
import { FEATURE_SQL, SCHEMA_SQL, TEMPLATE_SQL } from '../lib/dao/sql';
import { logger } from '../logger';
import type { Feature, FeatureStatus, TemplateNode } from '../types/feature';
import type { Result } from '../types/result';

/**
 * Initialize database schema. Safe to call on existing DB — uses CREATE TABLE IF NOT EXISTS.
 */
export function initSchema(adapter: DbAdapter): void {
    const raw = getRawSqlite(adapter);

    raw.run(SCHEMA_SQL.createFeaturesTable);
    raw.run(SCHEMA_SQL.createFeatureWbsLinksTable);

    for (const statement of SCHEMA_SQL.createIndexes.trim().split(';')) {
        if (statement.trim()) {
            raw.run(statement);
        }
    }

    raw.run(SCHEMA_SQL.createAutoTimestampTrigger);
}

/**
 * Extract the raw bun:sqlite connection from a DbAdapter.
 */
function getRawSqlite(adapter: DbAdapter): Database {
    // The adapter is a BunSqliteAdapter which has getRaw() method
    if ('getRaw' in adapter && typeof adapter.getRaw === 'function') {
        return (adapter as { getRaw: () => Database }).getRaw();
    }
    // Fallback: extract from Drizzle session
    const db = adapter.getDb();
    const session = Reflect.get(db, 'session');
    return Reflect.get(session, 'client') as Database;
}

export class FeatureService {
    private raw: Database;

    constructor(adapter?: DbAdapter) {
        const resolvedAdapter = adapter ?? getDefaultAdapter();
        this.raw = getRawSqlite(resolvedAdapter);
    }

    // ─── Schema ───────────────────────────────────────────────────────────

    /**
     * Initialize schema (idempotent).
     */
    initSchema(adapter: DbAdapter): void {
        initSchema(adapter);
    }

    // ─── Feature CRUD ─────────────────────────────────────────────────────

    /**
     * Insert a feature with auto-generated ID and computed position/depth.
     */
    async create(input: {
        title: string;
        parentId?: string | null;
        status?: FeatureStatus;
        metadata?: string;
    }): Promise<Result<Feature>> {
        try {
            const title = input.title.trim();
            if (title.length === 0) {
                return { ok: false, error: new ValidationError('title must not be blank') };
            }

            const parentId = input.parentId ?? null;
            const status: FeatureStatus = input.status ?? 'backlog';
            const metadataJson = input.metadata ?? '{}';

            // Validate parent exists if provided
            let depth = 0;
            if (parentId !== null) {
                const parent = await this.getById(parentId);
                if (!parent.ok) {
                    return {
                        ok: false,
                        error: new NotFoundError(`Parent feature not found: ${parentId}`),
                    };
                }
                depth = (parent.data.depth ?? 0) + 1;
            }

            // Compute position (append at end)
            const maxPos = this.getMaxPosition(parentId);
            const position = maxPos + 1;

            const id = crypto.randomUUID();

            this.raw.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [id, parentId, title, status, metadataJson, depth, position],
            );

            const result = await this.getById(id);
            if (!result.ok) {
                return { ok: false, error: new InternalError('Failed to create feature') };
            }

            logger.info('Feature created: {id}', { id });
            return { ok: true, data: result.data };
        } catch (e) {
            if (e instanceof ValidationError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Get a feature by ID.
     */
    async getById(id: string): Promise<Result<Feature>> {
        try {
            const rows = this.raw.query('SELECT * FROM features WHERE id = ?').all(id);
            if (!rows || rows.length === 0) {
                return { ok: false, error: new NotFoundError(`Feature not found: ${id}`) };
            }
            return { ok: true, data: parseFeature(rows[0] as Record<string, unknown>) };
        } catch (e) {
            if (e instanceof NotFoundError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * List all features ordered by depth, position.
     */
    async list(): Promise<Result<Feature[]>> {
        try {
            const rows = this.raw.query('SELECT * FROM features ORDER BY depth, position').all();
            return { ok: true, data: rows.map((r) => parseFeature(r as Record<string, unknown>)) };
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Get children of a feature.
     */
    getChildren(parentId: string | null): Feature[] {
        const sql =
            parentId === null
                ? 'SELECT * FROM features WHERE parent_id IS NULL ORDER BY position'
                : 'SELECT * FROM features WHERE parent_id = ? ORDER BY position';
        const params = parentId === null ? [] : [parentId];
        const rows = this.raw.query(sql).all(...params);
        return rows.map((r) => parseFeature(r as Record<string, unknown>));
    }

    /**
     * Get subtree under a feature (inclusive) using recursive CTE.
     */
    getSubtree(rootId: string): Feature[] {
        const rows = this.raw.query(FEATURE_SQL.selectSubtree).all(rootId);
        return rows.map((r) => parseFeature(r as Record<string, unknown>));
    }

    /**
     * Check if a feature exists.
     */
    exists(id: string): boolean {
        const row = this.raw.query('SELECT id FROM features WHERE id = ?').get(id);
        return row != null;
    }

    /**
     * Get max position for children of a parent.
     */
    getMaxPosition(parentId: string | null): number {
        const sql =
            parentId === null
                ? 'SELECT COALESCE(MAX(position), -1) as max_pos FROM features WHERE parent_id IS NULL'
                : 'SELECT COALESCE(MAX(position), -1) as max_pos FROM features WHERE parent_id = ?';
        const params = parentId === null ? [] : [parentId];
        const row = this.raw.query(sql).get(...params) as { max_pos: number };
        return row.max_pos;
    }

    // ─── WBS Link Operations ──────────────────────────────────────────────

    /**
     * Insert a WBS link (idempotent — OR IGNORE).
     */
    linkWbs(featureId: string, wbsId: string): void {
        this.raw.run(
            "INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id, created_at) VALUES (?, ?, datetime('now'))",
            [featureId, wbsId],
        );
    }

    /**
     * Get all WBS IDs for a feature.
     */
    getWbsIds(featureId: string): string[] {
        const rows = this.raw
            .query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ? ORDER BY wbs_id')
            .all(featureId) as Record<string, unknown>[];
        return rows.map((r) => r.wbs_id as string);
    }

    /**
     * Build a map of feature ID -> WBS IDs for a set of features.
     */
    buildWbsMap(featureIds: string[]): Map<string, string[]> {
        const wbsByFeature = new Map<string, string[]>();
        for (const id of featureIds) {
            wbsByFeature.set(id, this.getWbsIds(id));
        }
        return wbsByFeature;
    }

    // ─── Template Seeding ─────────────────────────────────────────────────

    /**
     * Seed database from a template tree.
     */
    seedFromTemplate(nodes: TemplateNode[], parentId: string | null, depth: number): number {
        let count = 0;

        for (const [i, node] of nodes.entries()) {
            const id = crypto.randomUUID();
            const status: FeatureStatus = node.status ?? 'backlog';
            const now = new Date().toISOString();

            this.raw.run(TEMPLATE_SQL.insertWithTimestamp, [
                id,
                parentId,
                node.title,
                status,
                '{}',
                depth,
                i,
                now,
                now,
            ]);

            count++;

            if (node.children && node.children.length > 0) {
                count += this.seedFromTemplate(node.children, id, depth + 1);
            }
        }

        return count;
    }
}
