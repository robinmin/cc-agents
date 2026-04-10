/**
 * ftree add command — Unit tests
 *
 * Covers all branches of add.ts:
 * - Empty title (line 36-39)
 * - Invalid status (line 44-47)
 * - Invalid metadata JSON (line 52-57)
 * - DB open failure (line 61-66)
 * - Parent not found (line 73-77)
 * - Root feature add (happy path, no parent)
 * - Child feature add (with parent, depth calculation)
 * - Position increment (append at end)
 * - Default status fallback to 'backlog'
 * - Metadata JSON passthrough
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { resolve } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { add } from './add';
import { openDatabase, initSchema, insertFeature } from '../db';
import type { Feature, FeatureStatus } from '../types';

const TEST_DB_DIR = resolve('/tmp', 'ftree-add-test');
const TEST_DB_PATH = resolve(TEST_DB_DIR, 'add.db');

function seedRootFeature(dbPath: string, id: string = 'parent-001'): Feature {
    const db = openDatabase(dbPath);
    initSchema(db);
    const feature: Feature = {
        id,
        parent_id: null,
        title: 'Parent Feature',
        status: 'backlog',
        metadata: '{}',
        depth: 0,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    insertFeature(db, feature);
    db.close();
    return feature;
}

async function resetDb() {
    try {
        rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {
        // ignore
    }
    mkdirSync(TEST_DB_DIR, { recursive: true });
}

describe('add command', () => {
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

    // ── Validation: empty title ──────────────────────────────────────────
    test('returns 1 when title is empty string', async () => {
        const exitCode = await add({
            title: '',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    test('returns 1 when title is whitespace only', async () => {
        const exitCode = await add({
            title: '   ',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── Validation: invalid status ───────────────────────────────────────
    test('returns 1 when status is invalid', async () => {
        const exitCode = await add({
            title: 'My Feature',
            parent: undefined,
            status: 'invalid-status' as FeatureStatus,
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── Validation: invalid metadata JSON ────────────────────────────────
    test('returns 1 when metadata is not valid JSON', async () => {
        const exitCode = await add({
            title: 'My Feature',
            parent: undefined,
            status: undefined,
            metadata: '{not json}',
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── DB open failure ──────────────────────────────────────────────────
    test('returns 2 when database cannot be opened', async () => {
        // Use /dev/null which is not a valid SQLite DB path for writes
        const exitCode = await add({
            title: 'My Feature',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: '/dev/null',
        });
        expect(exitCode).toBe(2);
    });

    // ── Parent not found ─────────────────────────────────────────────────
    test('returns 1 when parent feature does not exist', async () => {
        // Seed schema but no features
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        const exitCode = await add({
            title: 'Child Feature',
            parent: 'nonexistent-parent',
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(1);
    });

    // ── Root feature add (happy path) ────────────────────────────────────
    test('returns 0 and inserts root feature with defaults', async () => {
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        const exitCode = await add({
            title: 'My Root Feature',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Verify feature persisted
        const db2 = new Database(TEST_DB_PATH);
        const rows = db2.query('SELECT * FROM features').all() as Record<string, unknown>[];
        db2.close();

        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe('My Root Feature');
        expect(rows[0].status).toBe('backlog');
        expect(rows[0].parent_id).toBeNull();
        expect(rows[0].depth).toBe(0);
        expect(rows[0].position).toBe(0);
        expect(rows[0].metadata).toBe('{}');
    });

    // ── Child feature add (with parent, depth calculation) ──────────────
    test('returns 0 and inserts child with correct depth and position', async () => {
        seedRootFeature(TEST_DB_PATH, 'parent-001');

        const exitCode = await add({
            title: 'Child Feature',
            parent: 'parent-001',
            status: 'validated',
            metadata: undefined,
            db: TEST_DB_PATH,
        });
        expect(exitCode).toBe(0);

        // Verify child persisted with correct depth
        const db = new Database(TEST_DB_PATH);
        const rows = db.query('SELECT * FROM features WHERE parent_id = ?').all('parent-001') as Record<
            string,
            unknown
        >[];
        db.close();

        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe('Child Feature');
        expect(rows[0].status).toBe('validated');
        expect(rows[0].parent_id).toBe('parent-001');
        expect(rows[0].depth).toBe(1);
        expect(rows[0].position).toBe(0);
    });

    // ── Position increment ───────────────────────────────────────────────
    test('appends at next position when siblings exist', async () => {
        seedRootFeature(TEST_DB_PATH, 'parent-001');

        // Add first child
        await add({
            title: 'Child 1',
            parent: 'parent-001',
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        // Add second child
        await add({
            title: 'Child 2',
            parent: 'parent-001',
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        const db = new Database(TEST_DB_PATH);
        const rows = db
            .query('SELECT title, position FROM features WHERE parent_id = ? ORDER BY position')
            .all('parent-001') as Record<string, unknown>[];
        db.close();

        expect(rows).toHaveLength(2);
        expect(rows[0].title).toBe('Child 1');
        expect(rows[0].position).toBe(0);
        expect(rows[1].title).toBe('Child 2');
        expect(rows[1].position).toBe(1);
    });

    // ── Default status fallback ──────────────────────────────────────────
    test("defaults status to 'backlog' when not provided", async () => {
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        await add({
            title: 'Default Status Feature',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        const db2 = new Database(TEST_DB_PATH);
        const row = db2.query('SELECT status FROM features').get() as Record<string, unknown>;
        db2.close();
        expect(row.status).toBe('backlog');
    });

    // ── Metadata JSON passthrough ────────────────────────────────────────
    test('stores metadata JSON when provided', async () => {
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        await add({
            title: 'Meta Feature',
            parent: undefined,
            status: undefined,
            metadata: '{"priority": "high", "tags": ["core"]}',
            db: TEST_DB_PATH,
        });

        const db2 = new Database(TEST_DB_PATH);
        const row = db2.query('SELECT metadata FROM features').get() as Record<string, unknown>;
        db2.close();
        const parsed = JSON.parse(row.metadata as string);
        expect(parsed.priority).toBe('high');
        expect(parsed.tags).toEqual(['core']);
    });

    // ── Title is trimmed ─────────────────────────────────────────────────
    test('trims whitespace from title before storing', async () => {
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        await add({
            title: '  Trimmed Title  ',
            parent: undefined,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        const db2 = new Database(TEST_DB_PATH);
        const row = db2.query('SELECT title FROM features').get() as Record<string, unknown>;
        db2.close();
        expect(row.title).toBe('Trimmed Title');
    });

    // ── Explicit status ──────────────────────────────────────────────────
    test('stores explicit status when provided', async () => {
        const db = openDatabase(TEST_DB_PATH);
        initSchema(db);
        db.close();

        await add({
            title: 'Explicit Status',
            parent: undefined,
            status: 'executing',
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        const db2 = new Database(TEST_DB_PATH);
        const row = db2.query('SELECT status FROM features').get() as Record<string, unknown>;
        db2.close();
        expect(row.status).toBe('executing');
    });

    // ── Grandchild depth calculation ─────────────────────────────────────
    test('computes correct depth for grandchild (depth=2)', async () => {
        seedRootFeature(TEST_DB_PATH, 'grandparent');

        // Add child (depth=1)
        await add({
            title: 'Child',
            parent: 'grandparent',
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        // Find child ID
        const db1 = new Database(TEST_DB_PATH);
        const child = db1.query('SELECT id FROM features WHERE parent_id = ?').get('grandparent') as Record<
            string,
            unknown
        > | null;
        db1.close();

        // Add grandchild (depth=2)
        await add({
            title: 'Grandchild',
            parent: child?.id as string,
            status: undefined,
            metadata: undefined,
            db: TEST_DB_PATH,
        });

        const db2 = new Database(TEST_DB_PATH);
        const grandchild = db2.query('SELECT depth FROM features WHERE title = ?').get('Grandchild') as Record<
            string,
            unknown
        >;
        db2.close();
        expect(grandchild.depth).toBe(2);
    });
});
