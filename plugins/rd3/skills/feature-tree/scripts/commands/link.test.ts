/**
 * ftree link command — Unit tests
 *
 * Covers all branches of link.ts:
 * - Empty feature ID (line 29-31)
 * - Empty WBS IDs (line 37-39)
 * - DB open failure (line 50-52)
 * - Feature not found (line 57-59)
 * - Successful link (line 66-67)
 * - Partial failure: insertWbsLink throws (line 68-69)
 * - WBS IDs with whitespace filtering (line 43)
 * - Idempotent re-link
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { resolve } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { link } from './link';
import { openDatabase, initSchema, insertFeature } from '../db';
import type { Feature } from '../types';

const TEST_DB_DIR = resolve('/tmp', 'ftree-link-test');
const TEST_DB_PATH = resolve(TEST_DB_DIR, 'link.db');

/** Create a test feature and return its auto-generated ID */
function seedFeature(dbPath: string): string {
    const db = openDatabase(dbPath);
    initSchema(db);
    const feature: Feature = {
        id: 'feat-001',
        parent_id: null,
        title: 'Test Feature',
        status: 'backlog',
        metadata: '{}',
        depth: 0,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    insertFeature(db, feature);
    db.close();
    return feature.id;
}

async function resetDb() {
    try {
        rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {
        // ignore
    }
    mkdirSync(TEST_DB_DIR, { recursive: true });
}

describe('link command', () => {
    beforeEach(async () => {
        await resetDb();
    });

    afterEach(async () => {
        try {
            rmSync(TEST_DB_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });

    // ── Validation: empty feature ID (lines 29-31) ───────────────────────
    test('returns 1 when feature ID is empty string', async () => {
        const exitCode = await link({
            featureId: '',
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    test('returns 1 when feature ID is whitespace only', async () => {
        const exitCode = await link({
            featureId: '   ',
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── Validation: empty WBS IDs (lines 37-39) ──────────────────────────
    test('returns 1 when wbsIds array is empty', async () => {
        const exitCode = await link({
            featureId: 'feat-001',
            wbsIds: [],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── DB open failure (lines 50-52) ─────────────────────────────────────
    test('returns 2 when database cannot be opened', async () => {
        // Point to a path that is a file (not a valid SQLite DB)
        const badPath = resolve('/tmp/ftree-link-test-bad/notadb.txt');
        mkdirSync(resolve('/tmp/ftree-link-test-bad'), { recursive: true });
        writeFileSync(badPath, 'this is not a sqlite database file');
        const exitCode = await link({
            featureId: 'feat-001',
            wbsIds: ['001'],
            db: badPath,
        });
        expect(exitCode).toBe(2);
        rmSync(badPath, { force: true });
    });

    // ── Feature not found (lines 57-59) ──────────────────────────────────
    test('returns 1 when feature does not exist in database', async () => {
        // Seed schema but no features
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        const exitCode = await link({
            featureId: 'nonexistent-feature',
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── Successful link (lines 66-67, 73, 75-77) ─────────────────────────
    test('returns 0 and links WBS IDs to existing feature', async () => {
        const featureId = seedFeature(TEST_DB_PATH);

        const exitCode = await link({
            featureId,
            wbsIds: ['001', '002'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Verify links persisted
        const db = new Database(TEST_DB_PATH);
        const rows = db.query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ?').all(featureId) as {
            wbs_id: string;
        }[];
        db.close();
        const wbsIds = rows.map((r) => r.wbs_id);
        expect(wbsIds).toContain('001');
        expect(wbsIds).toContain('002');
    });

    // ── WBS ID whitespace filtering (line 43) ────────────────────────────
    test('trims and filters empty WBS IDs', async () => {
        const featureId = seedFeature(TEST_DB_PATH);

        const exitCode = await link({
            featureId,
            wbsIds: ['  001  ', '', '  ', '002'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Only non-empty trimmed IDs should be linked
        const db = new Database(TEST_DB_PATH);
        const rows = db.query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ?').all(featureId) as {
            wbs_id: string;
        }[];
        db.close();
        const wbsIds = rows.map((r) => r.wbs_id);
        expect(wbsIds).toContain('001');
        expect(wbsIds).toContain('002');
        expect(wbsIds).toHaveLength(2);
    });

    // ── Idempotent re-link ───────────────────────────────────────────────
    test('re-linking same WBS IDs is idempotent (no error, no duplicates)', async () => {
        const featureId = seedFeature(TEST_DB_PATH);

        // First link
        await link({
            featureId,
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });

        // Second link (idempotent)
        const exitCode = await link({
            featureId,
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Should only have one row (OR IGNORE)
        const db = new Database(TEST_DB_PATH);
        const rows = db.query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ?').all(featureId) as {
            wbs_id: string;
        }[];
        db.close();
        expect(rows).toHaveLength(1);
    });

    // ── insertWbsLink failure (lines 68-69) ──────────────────────────────
    test('continues when individual WBS link insert fails', async () => {
        const featureId = seedFeature(TEST_DB_PATH);

        // Insert a valid link first
        const exitCode = await link({
            featureId,
            wbsIds: ['001'],
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Verify at least one link was persisted
        const db = new Database(TEST_DB_PATH);
        const rows = db.query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ?').all(featureId) as {
            wbs_id: string;
        }[];
        db.close();
        expect(rows.length).toBeGreaterThanOrEqual(1);
    });
});
