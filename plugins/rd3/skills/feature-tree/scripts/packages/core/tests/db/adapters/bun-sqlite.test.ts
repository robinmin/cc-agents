import { describe, expect, test } from 'bun:test';
import { BunSqliteAdapter } from '../../../src/db/adapters/bun-sqlite';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'backlog',
    metadata TEXT NOT NULL DEFAULT '{}',
    depth INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`;

function extractRawSqlite(adapter: BunSqliteAdapter) {
    return adapter.getRaw();
}

describe('BunSqliteAdapter', () => {
    test('creates in-memory database', () => {
        const adapter = new BunSqliteAdapter(':memory:');
        const db = adapter.getDb();
        expect(db).toBeDefined();
        adapter.close();
    });

    test('getDb returns a usable drizzle instance', async () => {
        const adapter = new BunSqliteAdapter(':memory:');
        const db = adapter.getDb();
        const raw = extractRawSqlite(adapter);

        raw.run(CREATE_TABLE_SQL);
        raw.run(`INSERT INTO features (id, title) VALUES ('test-id', 'test-feature')`);

        const { features } = await import('../../../src/db/schema');
        const rows = await db.select().from(features);
        expect(rows.length).toBe(1);
        expect(rows[0]).toBeDefined();
        const row = rows[0] as (typeof rows)[number];
        expect(row.id).toBe('test-id');
        expect(row.title).toBe('test-feature');

        adapter.close();
    });

    test('sets WAL pragma on file-based db', () => {
        const tmpPath = `${import.meta.dir}/.tmp-wal-test-${Date.now()}.db`;
        const adapter = new BunSqliteAdapter(tmpPath);
        try {
            const raw = extractRawSqlite(adapter);
            const result = raw.query('PRAGMA journal_mode').get() as Record<string, string>;
            expect(result.journal_mode).toBe('wal');
        } finally {
            adapter.close();
            for (const suffix of ['', '-wal', '-shm']) {
                try {
                    require('node:fs').unlinkSync(`${tmpPath}${suffix}`);
                } catch {}
            }
        }
    });

    test('sets foreign_keys pragma', () => {
        const adapter = new BunSqliteAdapter(':memory:');
        const raw = extractRawSqlite(adapter);
        const result = raw.query('PRAGMA foreign_keys').get() as Record<string, number>;
        expect(result.foreign_keys).toBe(1);
        adapter.close();
    });

    test('close does not throw on in-memory db', () => {
        const adapter = new BunSqliteAdapter(':memory:');
        expect(() => adapter.close()).not.toThrow();
    });

    test('getRaw returns the underlying bun:sqlite Database', () => {
        const adapter = new BunSqliteAdapter(':memory:');
        const raw = adapter.getRaw();
        expect(raw).toBeDefined();
        expect(typeof raw.query).toBe('function');
        adapter.close();
    });
});
