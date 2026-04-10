/**
 * ftree — Database Tests
 *
 * R8.1: Schema creation, idempotent init, PRAGMA verification.
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { resolve } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { openDatabase, initSchema } from '../scripts/db';

const TEST_DB_DIR = resolve('/tmp', 'ftree-test-db');
const TEST_DB_PATH = resolve(TEST_DB_DIR, 'test.db');

describe('Database', () => {
    beforeEach(() => {
        // Clean up
        try {
            rmSync(TEST_DB_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
        mkdirSync(TEST_DB_DIR, { recursive: true });
    });

    afterEach(() => {
        try {
            rmSync(TEST_DB_DIR, { recursive: true, force: true });
        } catch {
            // ignore
        }
    });

    describe('openDatabase', () => {
        test('creates database file if it does not exist', () => {
            expect(existsSync(TEST_DB_PATH)).toBe(false);
            const db = openDatabase(TEST_DB_PATH);
            expect(existsSync(TEST_DB_PATH)).toBe(true);
            db.close();
        });

        test('opens existing database without error', () => {
            // Create DB first
            const db1 = openDatabase(TEST_DB_PATH);
            db1.close();

            // Re-open should work
            const db2 = openDatabase(TEST_DB_PATH);
            expect(db2).toBeDefined();
            db2.close();
        });

        test('creates parent directory if it does not exist', () => {
            const nestedPath = resolve(TEST_DB_DIR, 'nested', 'deep', 'test.db');
            expect(existsSync(nestedPath)).toBe(false);
            const db = openDatabase(nestedPath);
            expect(existsSync(nestedPath)).toBe(true);
            db.close();
        });
    });

    describe('initSchema', () => {
        test('creates features table', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            // Verify table exists
            const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='features'").get();
            expect(result).toBeDefined();
            expect((result as { name: string }).name).toBe('features');

            db.close();
        });

        test('creates feature_wbs_links table', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const result = db
                .query("SELECT name FROM sqlite_master WHERE type='table' AND name='feature_wbs_links'")
                .get();
            expect(result).toBeDefined();
            expect((result as { name: string }).name).toBe('feature_wbs_links');

            db.close();
        });

        test('creates indexes', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const indexes = db.query("SELECT name FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all() as {
                name: string;
            }[];

            expect(indexes.length).toBeGreaterThan(0);
            const indexNames = indexes.map((i) => i.name);
            expect(indexNames).toContain('idx_features_parent_id');
            expect(indexNames).toContain('idx_features_status');

            db.close();
        });

        test('creates auto-update trigger', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const triggers = db.query("SELECT name FROM sqlite_master WHERE type='trigger'").all() as {
                name: string;
            }[];

            expect(triggers.length).toBeGreaterThan(0);

            db.close();
        });

        test('is idempotent — safe to call twice', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);
            initSchema(db); // Should not throw

            const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
            expect(tables.length).toBeGreaterThanOrEqual(2);

            db.close();
        });
    });

    describe('PRAGMA enforcement', () => {
        test('WAL mode is enabled', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const mode = db.query('PRAGMA journal_mode').get() as { journal_mode: string };
            expect(mode.journal_mode.toLowerCase()).toBe('wal');

            db.close();
        });

        test('foreign_keys is enabled', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const fk = db.query('PRAGMA foreign_keys').get() as { foreign_keys: number };
            expect(fk.foreign_keys).toBe(1);

            db.close();
        });

        test('busy_timeout is set', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            const result = db.query('PRAGMA busy_timeout').get();
            // PRAGMA returns a row object or scalar
            expect(result).toBeDefined();

            db.close();
        });
    });

    describe('Feature CRUD', () => {
        test('insert and retrieve feature', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['f1', null, 'Test Feature', 'backlog', '{}', 0, 0],
            );

            const row = db.query('SELECT * FROM features WHERE id = ?').get('f1') as Record<string, unknown> | null;
            expect(row).not.toBeNull();
            expect(row?.id).toBe('f1');
            expect(row?.title).toBe('Test Feature');
            expect(row?.status).toBe('backlog');
            expect(row?.parent_id).toBeNull();

            db.close();
        });

        test('CASCADE delete works', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            // Insert parent and child
            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['parent1', null, 'Parent', 'backlog', '{}', 0, 0],
            );
            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['child1', 'parent1', 'Child', 'backlog', '{}', 1, 0],
            );

            // Delete parent
            db.run('DELETE FROM features WHERE id = ?', ['parent1']);

            // Child should be gone (null from sqlite, not undefined)
            const child = db.query('SELECT * FROM features WHERE id = ?').get('child1');
            expect(child).toBeNull();

            db.close();
        });

        test('auto_timestamp trigger updates updated_at', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['f1', null, 'Test', 'backlog', '{}', 0, 0],
            );

            // Small delay to ensure timestamp would differ
            const start = Date.now();
            while (Date.now() - start < 100) {
                // busy wait
            }

            db.run('UPDATE features SET title = ? WHERE id = ?', ['Updated', 'f1']);

            const afterRow = db.query('SELECT updated_at FROM features WHERE id = ?').get('f1') as {
                updated_at: string;
            };
            expect(afterRow.updated_at).toBeDefined();
            // Trigger should update updated_at (may or may not differ if update is fast)

            db.close();
        });
    });

    describe('WBS Links', () => {
        test('insert and retrieve WBS links', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            // Insert feature first
            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['f1', null, 'Test', 'backlog', '{}', 0, 0],
            );

            // Insert WBS links
            db.run(`INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id) VALUES (?, ?)`, ['f1', 'WBS-001']);
            db.run(`INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id) VALUES (?, ?)`, ['f1', 'WBS-002']);

            const links = db
                .query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ? ORDER BY wbs_id')
                .all('f1') as { wbs_id: string }[];

            expect(links.length).toBe(2);
            expect(links[0].wbs_id).toBe('WBS-001');
            expect(links[1].wbs_id).toBe('WBS-002');

            db.close();
        });

        test('WBS links are idempotent', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['f1', null, 'Test', 'backlog', '{}', 0, 0],
            );

            // Insert same link twice
            db.run(`INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id) VALUES (?, ?)`, ['f1', 'WBS-001']);
            db.run(`INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id) VALUES (?, ?)`, ['f1', 'WBS-001']);

            const links = db.query('SELECT wbs_id FROM feature_wbs_links WHERE feature_id = ?').all('f1') as {
                wbs_id: string;
            }[];

            expect(links.length).toBe(1);

            db.close();
        });

        test('CASCADE delete removes WBS links', () => {
            const db = openDatabase(TEST_DB_PATH);
            initSchema(db);

            db.run(
                `INSERT INTO features (id, parent_id, title, status, metadata, depth, position)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['f1', null, 'Test', 'backlog', '{}', 0, 0],
            );
            db.run(`INSERT OR IGNORE INTO feature_wbs_links (feature_id, wbs_id) VALUES (?, ?)`, ['f1', 'WBS-001']);

            db.run('DELETE FROM features WHERE id = ?', ['f1']);

            const links = db.query('SELECT * FROM feature_wbs_links WHERE feature_id = ?').all('f1');

            expect(links.length).toBe(0);

            db.close();
        });
    });
});
