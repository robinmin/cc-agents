/**
 * ftree ls command
 *
 * List features in a tree view (human) or as JSON array.
 * Respects --depth limits.
 */

import type { Database } from 'bun:sqlite';
import { openDatabase, initSchema, getAllFeatures, getSubtree, getWbsIds } from '../db';
import { resolveDbPath } from '../db';
import type { FeatureStatus, FeatureNode } from '../types';
import { buildFeatureTree } from '../utils';
import { logger } from '../../../../scripts/logger';

// ─── Helper: build WBS map ─────────────────────────────────────────────────

/**
 * Build a map of feature ID -> WBS IDs.
 *
 * @param db - Open database connection
 * @param featureIds - Feature IDs to fetch WBS links for
 * @returns Map of feature ID -> WBS IDs array
 */
function buildWbsMap(db: ReturnType<typeof import('../db').openDatabase>, featureIds: string[]): Map<string, string[]> {
    const wbsByFeature = new Map<string, string[]>();

    for (const id of featureIds) {
        const wbsIds = getWbsIds(db, id);
        wbsByFeature.set(id, wbsIds);
    }

    return wbsByFeature;
}

// ─── LS command ────────────────────────────────────────────────────────────

/**
 * List features in tree view.
 *
 * @param options - LS options
 * @returns Exit code (0 = success, 1 = error)
 */
export async function ls(options: {
    root: string | undefined;
    depth: number | undefined;
    status: FeatureStatus | undefined;
    json: boolean | undefined;
    db: string | undefined;
}): Promise<number> {
    const { path } = resolveDbPath(options.db);

    // Open database
    let db: Database;
    try {
        db = openDatabase(path);
        initSchema(db);
    } catch (e) {
        logger.error(`Failed to open database: ${e}`);
        return 2;
    }

    // Determine which features to list
    let features: ReturnType<typeof getAllFeatures>;
    let wbsByFeature: Map<string, string[]>;

    if (options.root) {
        // List subtree under root
        features = getSubtree(db, options.root);
        if (features.length === 0) {
            logger.error(`Error: Root feature "${options.root}" not found`);
            db.close();
            return 1;
        }

        // Build WBS map for all features in subtree
        const ids = features.map((f) => f.id);
        wbsByFeature = buildWbsMap(db, ids);
    } else if (options.status) {
        // List features by status (flat list)
        features = getAllFeatures(db).filter((f) => f.status === options.status);
        const ids = features.map((f) => f.id);
        wbsByFeature = buildWbsMap(db, ids);
    } else {
        // List all features
        features = getAllFeatures(db);
        const ids = features.map((f) => f.id);
        wbsByFeature = buildWbsMap(db, ids);
    }

    db.close();

    if (features.length === 0) {
        if (options.json) {
            logger.log('[]');
        } else {
            logger.log('(no features)');
        }
        return 0;
    }

    // Build tree
    const maxDepth = options.depth !== undefined ? options.depth : -1;
    const tree = buildFeatureTree(features, wbsByFeature, options.root, maxDepth);

    if (!tree) {
        logger.error('Failed to build feature tree');
        return 1;
    }

    if (options.json) {
        // JSON output: serialize FeatureNode to JSON
        const serializeNode = (node: FeatureNode): Record<string, unknown> => ({
            id: node.id,
            title: node.title,
            status: node.storedStatus,
            ...(node.storedStatus !== node.status ? { rollup_status: node.status } : {}),
            metadata: node.metadata,
            depth: node.depth,
            position: node.position,
            children: node.children.map(serializeNode),
            wbs_ids: node.wbs_ids,
        });

        logger.log(JSON.stringify(serializeNode(tree), null, 2));
    } else {
        // Human-readable tree output
        // Import renderTree dynamically to avoid circular deps
        const { renderTree } = await import('../utils');
        logger.log(renderTree(tree, { color: true }));
    }

    return 0;
}
