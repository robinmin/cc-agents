/**
 * ftree — Database connection factory
 *
 * Handles SQLite connection setup, PRAGMA enforcement, and schema migrations.
 * Follows the embedded SQLite pattern — no daemon, CLI opens DB, runs command, exits.
 */

import { Database } from 'bun:sqlite';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import type { DbConfig, Feature } from './types';
import { SCHEMA_SQL, FEATURE_SQL, WBS_LINK_SQL } from './dao/sql';
import { parseFeature } from './dao/parsers';
import { logger } from '../../../scripts/logger';
import { ok, err } from '../../../scripts/libs/result';
import type { Result } from '../../../scripts/libs/result';

// ─── DB path resolution ─────────────────────────────────────────────────────

/** Default database path relative to CWD */
const DEFAULT_DB_PATH = 'docs/.ftree/db.sqlite';

/**
 * Resolve database path using 3-tier chain:
 * 1. --db flag (explicit)
 * 2. FTREE_DB env var
 * 3. docs/.ftree/db.sqlite in CWD
 *
 * @param explicitPath - Explicit --db flag value
 * @returns Resolved DB config with path and tier
 */
export function resolveDbPath(explicitPath?: string): DbConfig {
    if (explicitPath) {
        return { path: resolve(explicitPath), tier: '--db flag' };
    }

    const envPath = process.env.FTREE_DB;
    if (envPath) {
        return { path: resolve(envPath), tier: 'FTREE_DB env' };
    }

    return { path: resolve(DEFAULT_DB_PATH), tier: 'CWD default' };
}

// ─── Connection factory ────────────────────────────────────────────────────

/**
 * Open a SQLite database connection with proper PRAGMA setup.
 * Creates the database file and schema if they don't exist.
 *
 * @param dbPath - Path to the SQLite database file
 * @returns Open database connection (with PRAGMA already applied)
 */
export function openDatabase(dbPath: string): Database {
    // Ensure parent directory exists
    const dir = dbPath.replace(/[/\\][^/\\]+$/, '');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Enforce WAL mode for concurrent reads
    db.run('PRAGMA journal_mode = WAL');

    // Enforce foreign keys (required for CASCADE deletes)
    db.run('PRAGMA foreign_keys = ON');

    // Busy timeout to avoid SQLITE_BUSY on concurrent access
    db.run('PRAGMA busy_timeout = 5000');

    return db;
}

/**
 * Initialize database schema.
 * Safe to call on existing DB — uses CREATE TABLE IF NOT EXISTS.
 *
 * @param db - Open database connection
 */
export function initSchema(db: Database): void {
    db.run(SCHEMA_SQL.createFeaturesTable);
    db.run(SCHEMA_SQL.createFeatureWbsLinksTable);

    // Split index and trigger creation
    for (const statement of SCHEMA_SQL.createIndexes.trim().split(';')) {
        if (statement.trim()) {
            db.run(statement);
        }
    }

    db.run(SCHEMA_SQL.createAutoTimestampTrigger);

    logger.debug(`[ftree] Schema initialized at ${db.filename}`);
}

// ─── Feature DAO ────────────────────────────────────────────────────────────

/**
 * Insert a new feature into the database.
 *
 * @param db - Open database connection
 * @param feature - Feature record to insert
 */
export function insertFeature(db: Database, feature: Feature): void {
    db.run(FEATURE_SQL.insert, [
        feature.id,
        feature.parent_id,
        feature.title,
        feature.status,
        feature.metadata,
        feature.depth,
        feature.position,
    ]);
}

/**
 * Get a feature by ID.
 *
 * @param db - Open database connection
 * @param id - Feature ID
 * @returns Feature record or null
 */
export function getFeatureById(db: Database, id: string): Feature | null {
    const row = db.query(FEATURE_SQL.selectById).get(id) as Record<string, unknown> | null;
    return row ? parseFeature(row) : null;
}

/**
 * Get all features.
 *
 * @param db - Open database connection
 * @returns Array of all features
 */
export function getAllFeatures(db: Database): Feature[] {
    const rows = db.query(FEATURE_SQL.selectAll).all() as Record<string, unknown>[];
    return rows.map(parseFeature);
}

/**
 * Get children of a feature.
 *
 * @param db - Open database connection
 * @param parentId - Parent feature ID
 * @returns Array of child features
 */
export function getChildren(db: Database, parentId: string | null): Feature[] {
    const sql = parentId === null ? FEATURE_SQL.selectRoots : FEATURE_SQL.selectByParent;
    const rows = db.query(sql).all(...(parentId === null ? [] : [parentId])) as Record<string, unknown>[];
    return rows.map(parseFeature);
}

/**
 * Get subtree under a feature (inclusive).
 *
 * @param db - Open database connection
 * @param rootId - Root feature ID
 * @returns Array of features in subtree
 */
export function getSubtree(db: Database, rootId: string): Feature[] {
    const rows = db.query(FEATURE_SQL.selectSubtree).all(...[rootId]) as Record<string, unknown>[];
    return rows.map(parseFeature);
}

/**
 * Check if a feature exists.
 *
 * @param db - Open database connection
 * @param id - Feature ID
 * @returns true if feature exists
 */
export function featureExists(db: Database, id: string): boolean {
    const row = db.query(FEATURE_SQL.selectById).get(id);
    return row != null;
}

/**
 * Check if a feature has children.
 *
 * @param db - Open database connection
 * @param id - Feature ID
 * @returns true if feature has children
 */
export function hasChildren(db: Database, id: string): boolean {
    const row = db.query(FEATURE_SQL.hasChildren).get(id) as { found: number };
    return row.found === 1;
}

/**
 * Check if a feature has WBS links.
 *
 * @param db - Open database connection
 * @param id - Feature ID
 * @returns true if feature has WBS links
 */
export function hasWbsLinks(db: Database, id: string): boolean {
    const row = db.query(FEATURE_SQL.hasWbsLinks).get(id) as { found: number };
    return row.found === 1;
}

/**
 * Get max position for children of a parent.
 *
 * @param db - Open database connection
 * @param parentId - Parent feature ID (null for root)
 * @returns Max position (or -1 if no children)
 */
export function getMaxPosition(db: Database, parentId: string | null): number {
    const sql = parentId === null ? FEATURE_SQL.maxPositionForRoots : FEATURE_SQL.maxPositionForParent;
    const params = parentId === null ? [] : [parentId];
    const row = db.query(sql).get(...params) as { max_pos: number };
    return row.max_pos;
}

// ─── WBS Link DAO ──────────────────────────────────────────────────────────

/**
 * Insert a WBS link (idempotent).
 *
 * @param db - Open database connection
 * @param featureId - Feature ID
 * @param wbsId - WBS ID
 */
export function insertWbsLink(db: Database, featureId: string, wbsId: string): void {
    db.run(WBS_LINK_SQL.insert, [featureId, wbsId]);
}

/**
 * Get all WBS IDs for a feature.
 *
 * @param db - Open database connection
 * @param featureId - Feature ID
 * @returns Array of WBS IDs
 */
export function getWbsIds(db: Database, featureId: string): string[] {
    const rows = db.query(WBS_LINK_SQL.selectByFeatureRaw).all(...[featureId]) as Record<string, unknown>[];
    return rows.map((r) => r.wbs_id as string);
}

// ─── Validation helpers ────────────────────────────────────────────────────

/**
 * Validate feature ID format (basic check).
 *
 * @param id - Feature ID to validate
 * @returns Result with validation error or null
 */
export function validateFeatureId(id: string): Result<string, string> {
    if (!id || id.trim() === '') {
        return err('Feature ID cannot be empty');
    }
    return ok('valid');
}
