/**
 * ftree — Feature Service
 *
 * Business logic layer for feature tree operations.
 * Uses Drizzle for simple CRUD and raw SQL for recursive CTEs.
 */

import type { Database } from 'bun:sqlite';
import type { DbAdapter } from '../db/adapter';
import { getDefaultAdapter } from '../db/client';
import { ConflictError, InternalError, NotFoundError, ValidationError } from '../errors';
import { parseFeature } from '../lib/dao/parsers';
import { FEATURE_SQL, SCHEMA_SQL, TEMPLATE_SQL } from '../lib/dao/sql';
import { describeTransition, validateTransition } from '../lib/state-machine';
import { logger } from '../logger';
import {
    FEATURE_STATUSES,
    type ContextView,
    type DoneCheckResult,
    type Feature,
    type FeatureNode,
    type FeatureStatus,
    type TemplateNode,
} from '../types/feature';
import type { Result } from '../types/result';
import { buildFeatureTree } from '../lib/tree-utils';

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

    private findByTitlePath(parentId: string | null, title: string): Feature | null {
        const sql =
            parentId === null
                ? 'SELECT * FROM features WHERE parent_id IS NULL AND title = ? ORDER BY position LIMIT 1'
                : 'SELECT * FROM features WHERE parent_id = ? AND title = ? ORDER BY position LIMIT 1';
        const params = parentId === null ? [title] : [parentId, title];
        const row = this.raw.query(sql).get(...params) as Record<string, unknown> | null;

        if (!row) {
            return null;
        }

        return parseFeature(row);
    }

    private validateTemplateNodes(nodes: TemplateNode[], path: string[] = []): TemplateNode[] {
        return nodes.map((node, index) => {
            const nodePath = [...path, `${index}`];

            if (typeof node !== 'object' || node === null || Array.isArray(node)) {
                throw new ValidationError(`Invalid template node at ${nodePath.join('.')}: expected object`);
            }

            if (typeof node.title !== 'string') {
                throw new ValidationError(`Invalid template node at ${nodePath.join('.')}: title must be a string`);
            }

            const title = node.title.trim();
            if (title.length === 0) {
                throw new ValidationError(`Invalid template node at ${nodePath.join('.')}: title must not be blank`);
            }

            if (node.status !== undefined && !FEATURE_STATUSES.includes(node.status)) {
                throw new ValidationError(
                    `Invalid template node at ${nodePath.join('.')}: unknown status "${String(node.status)}"`,
                );
            }

            if (node.children !== undefined && !Array.isArray(node.children)) {
                throw new ValidationError(
                    `Invalid template node at ${nodePath.join('.')}: children must be an array when provided`,
                );
            }

            return {
                title,
                ...(node.status ? { status: node.status } : {}),
                ...(node.children
                    ? { children: this.validateTemplateNodes(node.children, [...nodePath, 'children']) }
                    : {}),
            };
        });
    }

    private importTemplateNodes(nodes: TemplateNode[], parentId: string | null, depth: number): number {
        let created = 0;

        for (const node of nodes) {
            const existing = this.findByTitlePath(parentId, node.title);
            let targetId = existing?.id;

            if (!existing) {
                const id = crypto.randomUUID();
                const status: FeatureStatus = node.status ?? 'backlog';
                const now = new Date().toISOString();
                const position = this.getMaxPosition(parentId) + 1;

                this.raw.run(TEMPLATE_SQL.insertWithTimestamp, [
                    id,
                    parentId,
                    node.title,
                    status,
                    '{}',
                    depth,
                    position,
                    now,
                    now,
                ]);
                created++;
                targetId = id;
            }

            if (node.children && node.children.length > 0 && targetId) {
                created += this.importTemplateNodes(node.children, targetId, depth + 1);
            }
        }

        return created;
    }

    // ─── Mutation Operations ──────────────────────────────────────────────

    /**
     * Update a feature's title, status, and/or metadata.
     * Validates status transitions via the state machine.
     */
    async update(
        id: string,
        fields: { title?: string; status?: FeatureStatus; metadata?: string },
    ): Promise<Result<Feature>> {
        try {
            const featureResult = await this.getById(id);
            if (!featureResult.ok) return featureResult;

            const feature = featureResult.data;

            // Validate status transition if status is changing
            if (fields.status !== undefined && fields.status !== feature.status) {
                if (!validateTransition(feature.status, fields.status)) {
                    return {
                        ok: false,
                        error: new ValidationError(
                            `Invalid status transition: ${describeTransition(feature.status, fields.status)}`,
                        ),
                    };
                }
            }

            const newTitle = fields.title !== undefined ? fields.title.trim() : feature.title;
            const newStatus = fields.status ?? feature.status;
            const newMetadata = fields.metadata !== undefined ? fields.metadata : feature.metadata;

            if (newTitle.length === 0) {
                return { ok: false, error: new ValidationError('title must not be blank') };
            }

            this.raw.run('UPDATE features SET title = ?, status = ?, metadata = ? WHERE id = ?', [
                newTitle,
                newStatus,
                newMetadata,
                id,
            ]);

            const result = await this.getById(id);
            if (!result.ok) {
                return { ok: false, error: new InternalError('Failed to fetch updated feature') };
            }

            logger.info('Feature updated: {id}', { id });
            return { ok: true, data: result.data };
        } catch (e) {
            if (e instanceof ValidationError || e instanceof NotFoundError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Remove a feature.
     * Without force: only allowed for leaf nodes with no WBS links.
     * With force: removes the feature, its entire subtree, and all associated WBS links.
     */
    async remove(id: string, opts?: { force?: boolean }): Promise<Result<{ count: number }>> {
        try {
            if (!this.exists(id)) {
                return { ok: false, error: new NotFoundError(`Feature not found: ${id}`) };
            }

            const force = opts?.force ?? false;

            if (force) {
                // Collect entire subtree for deletion
                const subtree = this.getSubtree(id);
                const ids = subtree.map((f) => f.id);

                // Delete all WBS links for the subtree, then the features
                const doDelete = this.raw.transaction(() => {
                    // Delete WBS links for all nodes in subtree
                    for (const nodeId of ids) {
                        this.raw.run('DELETE FROM feature_wbs_links WHERE feature_id = ?', [nodeId]);
                    }
                    // Delete features — leaf-first (reverse depth order) to avoid FK issues
                    const sorted = [...ids].reverse();
                    for (const nodeId of sorted) {
                        this.raw.run(FEATURE_SQL.deleteFeature, [nodeId]);
                    }
                });
                doDelete();

                logger.info('Force-removed feature {id} and {count} descendants', { id, count: ids.length });
                return { ok: true, data: { count: ids.length } };
            }

            // Non-force: check for children
            const hasChildrenRow = this.raw.query(FEATURE_SQL.hasChildren).get(id) as { found: number };
            if (hasChildrenRow.found) {
                return {
                    ok: false,
                    error: new ConflictError(
                        `Cannot remove feature ${id}: has child features. Remove children first or use --force.`,
                    ),
                };
            }

            // Check for WBS links
            const hasWbsRow = this.raw.query(FEATURE_SQL.hasWbsLinks).get(id) as { found: number };
            if (hasWbsRow.found) {
                return {
                    ok: false,
                    error: new ConflictError(`Cannot remove feature ${id}: has WBS links. Unlink first.`),
                };
            }

            this.raw.run(FEATURE_SQL.deleteFeature, [id]);

            logger.info('Feature removed: {id}', { id });
            return { ok: true, data: { count: 1 } };
        } catch (e) {
            if (e instanceof NotFoundError || e instanceof ConflictError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Move a feature to a new parent.
     * Performs circular-reference detection and recalculates depths for the subtree.
     */
    async move(id: string, newParentId: string | null): Promise<Result<Feature>> {
        try {
            const featureResult = await this.getById(id);
            if (!featureResult.ok) return featureResult;
            const feature = featureResult.data;

            // Moving to same parent is a no-op
            if (feature.parentId === newParentId) {
                return { ok: true, data: feature };
            }

            let newDepth = 0;

            if (newParentId !== null) {
                // Validate new parent exists
                const parentResult = await this.getById(newParentId);
                if (!parentResult.ok) {
                    return { ok: false, error: new NotFoundError(`Target parent not found: ${newParentId}`) };
                }

                // Circular detection: new parent must not be in the subtree of id
                const subtree = this.getSubtree(id);
                const subtreeIds = new Set(subtree.map((f) => f.id));
                if (subtreeIds.has(newParentId)) {
                    return {
                        ok: false,
                        error: new ValidationError(
                            `Cannot move feature ${id}: target parent ${newParentId} is a descendant of this feature (circular reference)`,
                        ),
                    };
                }

                newDepth = parentResult.data.depth + 1;
            }

            // Compute position (append at end under new parent)
            const position = this.getMaxPosition(newParentId) + 1;

            // Depth delta for subtree recalculation
            const depthDelta = newDepth - feature.depth;

            // Update the feature itself
            this.raw.run('UPDATE features SET parent_id = ?, depth = ?, position = ? WHERE id = ?', [
                newParentId,
                newDepth,
                position,
                id,
            ]);

            // Recalculate depth for all descendants
            if (depthDelta !== 0) {
                const descendants = this.raw.query(FEATURE_SQL.selectDescendants).all(id, id);
                for (const row of descendants) {
                    const desc = parseFeature(row as Record<string, unknown>);
                    this.raw.run('UPDATE features SET depth = ? WHERE id = ?', [desc.depth + depthDelta, desc.id]);
                }
            }

            const result = await this.getById(id);
            if (!result.ok) {
                return { ok: false, error: new InternalError('Failed to fetch moved feature') };
            }

            logger.info('Feature moved: {id} -> parent {newParentId}', { id, newParentId });
            return { ok: true, data: result.data };
        } catch (e) {
            if (e instanceof ValidationError || e instanceof NotFoundError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    // ─── WBS Link Operations ──────────────────────────────────────────────

    /**
     * Remove WBS links from a feature. Accepts an array of WBS IDs.
     * Returns the count of deleted links.
     */
    async unlinkWbs(featureId: string, wbsIds: string[]): Promise<Result<{ count: number }>> {
        try {
            if (!this.exists(featureId)) {
                return { ok: false, error: new NotFoundError(`Feature not found: ${featureId}`) };
            }

            if (!wbsIds || wbsIds.length === 0) {
                return { ok: false, error: new ValidationError('wbsIds must not be empty') };
            }

            let totalDeleted = 0;

            for (const wbsId of wbsIds) {
                const result = this.raw.run('DELETE FROM feature_wbs_links WHERE feature_id = ? AND wbs_id = ?', [
                    featureId,
                    wbsId,
                ]);
                totalDeleted += result.changes;
            }

            logger.info('Unlinked {count} WBS link(s) from feature {featureId}', { count: totalDeleted, featureId });
            return { ok: true, data: { count: totalDeleted } };
        } catch (e) {
            if (e instanceof NotFoundError || e instanceof ValidationError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

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

    // ─── Query Operations ─────────────────────────────────────────────────

    /**
     * Get an agent-optimized context view around a single feature.
     */
    async getContext(id: string): Promise<Result<ContextView>> {
        try {
            const featureResult = await this.getById(id);
            if (!featureResult.ok) return featureResult as unknown as Result<ContextView>;
            const feature = featureResult.data;

            const children = this.getChildren(id);
            const linkedWbs = this.getWbsIds(id);

            // Build parent info
            let parent: { id: string; title: string } | null = null;
            if (feature.parentId) {
                const parentResult = await this.getById(feature.parentId);
                if (parentResult.ok) {
                    parent = { id: parentResult.data.id, title: parentResult.data.title };
                }
            }

            // Build the FeatureNode for this feature + its children using buildFeatureTree
            const allFeatures = [feature, ...children];
            const wbsMap = this.buildWbsMap(allFeatures.map((f) => f.id));

            const tree = buildFeatureTree(
                allFeatures.map((f) => ({
                    id: f.id,
                    parentId: f.parentId,
                    title: f.title,
                    status: f.status,
                    metadata: f.metadata,
                    depth: f.depth,
                    position: f.position,
                })),
                wbsMap,
                id,
            );

            // tree should be the node for `id`; children are the child FeatureNodes
            const node = tree ?? {
                id: feature.id,
                title: feature.title,
                status: feature.status,
                storedStatus: feature.status,
                metadata: JSON.parse(feature.metadata || '{}'),
                depth: feature.depth,
                position: feature.position,
                children: [] as FeatureNode[],
                wbsIds: linkedWbs,
            };

            const childNodes: FeatureNode[] =
                node.children ??
                children.map((c) => ({
                    id: c.id,
                    title: c.title,
                    status: c.status,
                    storedStatus: c.status,
                    metadata: JSON.parse(c.metadata || '{}'),
                    depth: c.depth,
                    position: c.position,
                    children: [] as FeatureNode[],
                    wbsIds: this.getWbsIds(c.id),
                }));

            return { ok: true, data: { node, parent, children: childNodes, linkedWbs } };
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Check whether a feature is eligible to be marked as done.
     * A leaf node (no children) is always eligible.
     * A branch node is eligible only when all children have status 'done'.
     */
    async checkDone(id: string): Promise<Result<DoneCheckResult>> {
        try {
            const featureResult = await this.getById(id);
            if (!featureResult.ok) return featureResult as unknown as Result<DoneCheckResult>;

            const children = this.getChildren(id);

            if (children.length === 0) {
                return { ok: true, data: { eligible: true, reasons: [] } };
            }

            const reasons: string[] = [];
            for (const child of children) {
                if (child.status !== 'done') {
                    reasons.push(`Child "${child.title}" (${child.id}) has status "${child.status}", expected "done"`);
                }
            }

            return { ok: true, data: { eligible: reasons.length === 0, reasons } };
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    /**
     * Export the feature tree as a serializable plain object.
     * If rootId is provided, exports only the subtree under that node.
     * Otherwise exports the full tree.
     */
    async exportTree(rootId?: string): Promise<Result<Record<string, unknown>>> {
        try {
            let features: Feature[];

            if (rootId) {
                features = this.getSubtree(rootId);
                if (features.length === 0) {
                    return { ok: false, error: new NotFoundError(`Feature not found: ${rootId}`) };
                }
            } else {
                const listResult = await this.list();
                if (!listResult.ok) return listResult as unknown as Result<Record<string, unknown>>;
                features = listResult.data;
            }

            const wbsMap = this.buildWbsMap(features.map((f) => f.id));

            const tree = buildFeatureTree(
                features.map((f) => ({
                    id: f.id,
                    parentId: f.parentId,
                    title: f.title,
                    status: f.status,
                    metadata: f.metadata,
                    depth: f.depth,
                    position: f.position,
                })),
                wbsMap,
                rootId,
            );

            if (!tree) {
                return { ok: true, data: {} };
            }

            const serializeNode = (node: FeatureNode): Record<string, unknown> => ({
                id: node.id,
                title: node.title,
                status: node.storedStatus,
                ...(node.storedStatus !== node.status ? { rollup_status: node.status } : {}),
                metadata: node.metadata,
                depth: node.depth,
                position: node.position,
                children: node.children.map(serializeNode),
                wbs_ids: node.wbsIds,
            });

            return { ok: true, data: serializeNode(tree) };
        } catch (e) {
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    // ─── Atomic Operations ───────────────────────────────────────────────

    /**
     * Produce a concise summary digest for a feature and its WBS links.
     * Optionally applies a status transition atomically before producing the digest.
     *
     * @param id      Feature ID
     * @param wbsIds  WBS IDs to link to the feature (idempotent)
     * @param opts    Optional status override (validated via state machine)
     * @returns       Summary record with feature info, children count, and WBS links
     */
    async digest(
        id: string,
        wbsIds: string[],
        opts?: { status?: FeatureStatus },
    ): Promise<Result<Record<string, unknown>>> {
        try {
            // ── Phase 1: Validate ────────────────────────────────────────
            const featureResult = await this.getById(id);
            if (!featureResult.ok) return featureResult as unknown as Result<Record<string, unknown>>;
            const feature = featureResult.data;

            const newStatus = opts?.status ?? 'executing';

            const isDefaultStartTransition =
                opts?.status === undefined && feature.status === 'backlog' && newStatus === 'executing';

            // Validate status transition if changing. The default digest path is allowed
            // to fast-forward backlog items into executing as a convenience wrapper.
            if (newStatus !== feature.status) {
                if (!isDefaultStartTransition && !validateTransition(feature.status, newStatus)) {
                    return {
                        ok: false,
                        error: new ValidationError(
                            `Invalid status transition: ${describeTransition(feature.status, newStatus)}`,
                        ),
                    };
                }
            }

            // ── Phase 2: Execute atomically ──────────────────────────────
            const doDigest = this.raw.transaction(() => {
                // Apply status change if provided
                if (newStatus !== feature.status) {
                    this.raw.run('UPDATE features SET status = ? WHERE id = ?', [newStatus, id]);
                }
                // Link WBS IDs (idempotent)
                for (const wbsId of wbsIds) {
                    this.raw.run(
                        "INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id, created_at) VALUES (?, ?, datetime('now'))",
                        [id, wbsId],
                    );
                }
            });
            doDigest();

            // ── Phase 3: Build summary ───────────────────────────────────
            const refreshedResult = await this.getById(id);
            if (!refreshedResult.ok) {
                return { ok: false, error: new InternalError('Failed to fetch digested feature') };
            }
            const refreshed = refreshedResult.data;

            const children = this.getChildren(id);
            const linkedWbs = this.getWbsIds(id);

            const summary: Record<string, unknown> = {
                id: refreshed.id,
                title: refreshed.title,
                status: refreshed.status,
                previous_status: feature.status,
                status_changed: refreshed.status !== feature.status,
                metadata: JSON.parse(refreshed.metadata || '{}'),
                depth: refreshed.depth,
                position: refreshed.position,
                children_count: children.length,
                wbs_ids: linkedWbs,
                wbs_linked: wbsIds,
                parent_id: refreshed.parentId,
            };

            logger.info('Feature digested: {id}', { id });
            return { ok: true, data: summary };
        } catch (e) {
            if (e instanceof ValidationError || e instanceof NotFoundError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

    // ─── Template Seeding ─────────────────────────────────────────────────

    /**
     * Import a template tree under an optional parent.
     * Validates the parent exists, then delegates to seedFromTemplate for insertion.
     */
    async importTree(nodes: TemplateNode[], parentId?: string | null): Promise<Result<{ count: number }>> {
        try {
            if (!nodes || nodes.length === 0) {
                return { ok: false, error: new ValidationError('Template nodes must not be empty') };
            }

            const validatedNodes = this.validateTemplateNodes(nodes);

            // Validate parent exists if provided
            const resolvedParentId = parentId ?? null;
            if (resolvedParentId !== null) {
                if (!this.exists(resolvedParentId)) {
                    return {
                        ok: false,
                        error: new NotFoundError(`Parent feature not found: ${resolvedParentId}`),
                    };
                }
            }

            // Determine starting depth
            let depth = 0;
            if (resolvedParentId !== null) {
                const parentResult = await this.getById(resolvedParentId);
                if (!parentResult.ok) {
                    return { ok: false, error: new NotFoundError(`Parent feature not found: ${resolvedParentId}`) };
                }
                depth = parentResult.data.depth + 1;
            }

            const doImport = this.raw.transaction(
                (templateNodes: TemplateNode[], targetParentId: string | null, targetDepth: number) =>
                    this.importTemplateNodes(templateNodes, targetParentId, targetDepth),
            );
            const count = doImport(validatedNodes, resolvedParentId, depth);

            logger.info('Imported {count} features under parent {parentId}', {
                count,
                parentId: resolvedParentId,
            });
            return { ok: true, data: { count } };
        } catch (e) {
            if (e instanceof ValidationError || e instanceof NotFoundError) {
                return { ok: false, error: e };
            }
            return {
                ok: false,
                error: e instanceof Error ? new InternalError(e.message, e) : new InternalError(String(e)),
            };
        }
    }

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
