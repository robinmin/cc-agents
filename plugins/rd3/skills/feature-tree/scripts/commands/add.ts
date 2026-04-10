/**
 * ftree add command
 *
 * Core operation 1: Add a new leaf node to the feature tree.
 */

import { createId } from '@paralleldrive/cuid2';

import type { Database } from 'bun:sqlite';
import type { FeatureStatus, Feature } from '../types';
import { openDatabase, initSchema, getMaxPosition, featureExists, insertFeature } from '../db';
import { resolveDbPath } from '../db';
import { FEATURE_STATUSES } from '../types';
import { logger } from '../../../../scripts/logger';

// ─── Add command ────────────────────────────────────────────────────────────

/**
 * Add a new feature to the tree.
 *
 * @param options - Add options
 * @returns Exit code (0 = success, 1 = validation error)
 */
export async function add(options: {
    title: string;
    parent: string | undefined;
    status: FeatureStatus | undefined;
    metadata: string | undefined;
    db: string | undefined;
}): Promise<number> {
    const { path } = resolveDbPath(options.db);

    // Validate title
    if (!options.title || options.title.trim() === '') {
        logger.error('Error: --title is required');
        return 1;
    }

    const title = options.title.trim();

    // Validate status if provided
    if (options.status && !FEATURE_STATUSES.includes(options.status)) {
        logger.error(`Invalid status "${options.status}". Valid: ${FEATURE_STATUSES.join(', ')}`);
        return 1;
    }

    const status: FeatureStatus = options.status ?? 'backlog';

    // Parse and validate metadata JSON
    let metadataJson = '{}';
    if (options.metadata) {
        try {
            const parsed = JSON.parse(options.metadata);
            metadataJson = JSON.stringify(parsed);
        } catch {
            logger.error('Error: --metadata must be valid JSON');
            return 1;
        }
    }

    // Open database
    let db: Database;
    try {
        db = openDatabase(path);
        initSchema(db);
    } catch (e) {
        logger.error(`Failed to open database: ${e}`);
        return 2; // Database error
    }

    // Validate parent if provided
    const parentId = options.parent ?? null;
    let depth = 0;

    if (parentId !== null) {
        if (!featureExists(db, parentId)) {
            logger.error(`Error: Parent feature "${parentId}" not found`);
            db.close();
            return 1;
        }

        // Get parent depth
        const parent = db.query('SELECT depth FROM features WHERE id = ?').get(parentId) as { depth: number } | null;
        if (parent) {
            depth = parent.depth + 1;
        }
    }

    // Compute position (append at end)
    const maxPos = getMaxPosition(db, parentId);
    const position = maxPos + 1;

    // Create the feature
    const id = createId();
    const feature: Feature = {
        id,
        parent_id: parentId,
        title,
        status,
        metadata: metadataJson,
        depth,
        position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    try {
        insertFeature(db, feature);
    } catch (e) {
        logger.error(`Failed to insert feature: ${e}`);
        db.close();
        return 2; // Database error
    }

    db.close();

    // Output the new feature ID to stdout
    logger.log(id);

    return 0;
}
