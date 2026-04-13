import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from '../src/db/schema';

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
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES features(id) ON DELETE CASCADE
  )
`;

const CREATE_WBS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS feature_wbs_links (
    feature_id TEXT NOT NULL,
    wbs_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (feature_id, wbs_id),
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
  )
`;

export function createTestDb() {
    const sqlite = new Database(':memory:');
    sqlite.run('PRAGMA journal_mode = WAL');
    sqlite.run('PRAGMA foreign_keys = ON');
    sqlite.run(CREATE_TABLE_SQL);
    sqlite.run(CREATE_WBS_TABLE_SQL);
    const db = drizzle(sqlite, { schema });
    return { sqlite, db };
}
