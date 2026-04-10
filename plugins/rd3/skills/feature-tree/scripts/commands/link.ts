/**
 * ftree link command
 *
 * Core operation 2: Link a feature to WBS task IDs.
 * Idempotent — safe to call multiple times with the same IDs.
 */

import type { Database } from 'bun:sqlite';
import { openDatabase, initSchema, featureExists, insertWbsLink } from '../db';
import { resolveDbPath } from '../db';
import { logger } from '../../../../scripts/logger';

// ─── Link command ──────────────────────────────────────────────────────────

/**
 * Link a feature to WBS IDs.
 *
 * @param options - Link options
 * @returns Exit code (0 = success, 1 = validation error, 2 = DB error)
 */
export async function link(options: { featureId: string; wbsIds: string[]; db: string | undefined }): Promise<number> {
    const { path } = resolveDbPath(options.db);

    // Validate feature ID
    if (!options.featureId || options.featureId.trim() === '') {
        logger.error('Error: feature ID is required');
        return 1;
    }

    const featureId = options.featureId.trim();

    // Validate WBS IDs
    if (!options.wbsIds || options.wbsIds.length === 0) {
        logger.error('Error: at least one --wbs ID is required');
        return 1;
    }

    // WBS IDs are opaque strings — no format validation (C10 constraint)
    const wbsIds = options.wbsIds.map((id) => id.trim()).filter((id) => id !== '');

    // Open database
    let db: Database;
    try {
        db = openDatabase(path);
        initSchema(db);
    } catch (e) {
        logger.error(`Failed to open database: ${e}`);
        return 2;
    }

    // Check feature exists
    if (!featureExists(db, featureId)) {
        logger.error(`Error: Feature "${featureId}" not found`);
        db.close();
        return 1;
    }

    // Insert links (idempotent — OR IGNORE handles duplicates)
    let linkCount = 0;
    for (const wbsId of wbsIds) {
        try {
            insertWbsLink(db, featureId, wbsId);
            linkCount++;
        } catch (e) {
            logger.warn(`Failed to link WBS "${wbsId}": ${e}`);
        }
    }

    db.close();

    logger.debug(`Linked ${linkCount} WBS ID(s) to feature "${featureId}"`);

    return 0;
}
