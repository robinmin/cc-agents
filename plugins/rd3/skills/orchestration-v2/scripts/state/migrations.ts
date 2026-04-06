/**
 * orchestration-v2 — Schema migrations
 *
 * Manages SQLite schema versioning.
 */

import type { Database } from 'bun:sqlite';

export const CURRENT_SCHEMA_VERSION = 3;

export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
    sequence INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSON NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_run ON events(run_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    task_ref TEXT NOT NULL,
    preset TEXT,
    phases_requested TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('IDLE', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED')),
    config_snapshot JSON NOT NULL,
    pipeline_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_runs_task ON runs(task_ref);
CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at);

CREATE TABLE IF NOT EXISTS phases (
    run_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'running', 'completed', 'failed', 'paused', 'skipped')),
    skill TEXT NOT NULL,
    payload JSON,
    started_at DATETIME,
    completed_at DATETIME,
    error_code TEXT,
    error_message TEXT,
    rework_iteration INTEGER DEFAULT 0,
    PRIMARY KEY (run_id, name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status);

CREATE TABLE IF NOT EXISTS gate_results (
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    checker_method TEXT NOT NULL,
    passed INTEGER NOT NULL,
    advisory INTEGER DEFAULT 0,
    evidence JSON,
    duration_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase_name, step_name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX IF NOT EXISTS idx_gate_results_created ON gate_results(created_at);

CREATE TABLE IF NOT EXISTS phase_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    rework_iteration INTEGER DEFAULT 0,
    evidence JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX IF NOT EXISTS idx_phase_evidence_run_phase ON phase_evidence(run_id, phase_name);
CREATE INDEX IF NOT EXISTS idx_phase_evidence_created ON phase_evidence(created_at);

CREATE TABLE IF NOT EXISTS rollback_snapshots (
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    git_head TEXT,
    files_before JSON,
    files_after JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, phase_name),
    FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE TABLE IF NOT EXISTS resource_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    phase_name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    model_provider TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cache_read_tokens INTEGER DEFAULT 0,
    cache_creation_tokens INTEGER DEFAULT 0,
    wall_clock_ms INTEGER NOT NULL,
    execution_ms INTEGER NOT NULL,
    first_token_ms INTEGER,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE INDEX IF NOT EXISTS idx_resource_usage_run ON resource_usage(run_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_model ON resource_usage(model_id);
CREATE INDEX IF NOT EXISTS idx_resource_usage_phase ON resource_usage(phase_name);
`;

/**
 * Run schema migrations. Applies DDL if schema_version table is missing or outdated.
 */
export function runMigrations(db: Database): void {
    // Check if schema_version table exists
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'").get();

    if (!tableCheck) {
        // Fresh install — apply all DDL
        db.exec(SCHEMA_DDL);
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(CURRENT_SCHEMA_VERSION);
        return;
    }

    // Check current version
    const row = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get() as {
        version: number;
    } | null;

    const currentVersion = row?.version ?? 0;

    // v0 -> v2: Full schema installation
    if (currentVersion < 2) {
        db.exec(SCHEMA_DDL);
        ensureGateResultsAdvisoryColumn(db);
    }

    // v2 -> v3: Add missing indexes for query performance
    if (currentVersion < 3) {
        migrateV2toV3(db);
    }

    // Update version to CURRENT_SCHEMA_VERSION (3)
    db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(CURRENT_SCHEMA_VERSION);
}

function ensureGateResultsAdvisoryColumn(db: Database): void {
    const columns = db.prepare("PRAGMA table_info('gate_results')").all() as Array<{ name?: string }>;
    const hasAdvisory = columns.some((column) => column.name === 'advisory');
    if (!hasAdvisory) {
        db.exec('ALTER TABLE gate_results ADD COLUMN advisory INTEGER DEFAULT 0');
    }
}

/**
 * Migrate from v2 to v3: Add missing indexes for query performance.
 *
 * Indexes added:
 * - idx_phase_evidence_created: For querying evidence by time
 * - idx_runs_created: For querying runs by creation time
 * - idx_events_timestamp: For querying events by timestamp
 * - idx_gate_results_created: For querying gate results by time
 */
function migrateV2toV3(db: Database): void {
    // Get existing tables and indexes
    const existingTables = new Set(
        (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map(
            (t) => t.name,
        ),
    );
    const existingIndexes = new Set(
        (db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>).map(
            (idx) => idx.name,
        ),
    );

    const indexesToAdd = [
        {
            table: 'phase_evidence',
            name: 'idx_phase_evidence_created',
            sql: 'CREATE INDEX idx_phase_evidence_created ON phase_evidence(created_at)',
        },
        { table: 'runs', name: 'idx_runs_created', sql: 'CREATE INDEX idx_runs_created ON runs(created_at)' },
        {
            table: 'events',
            name: 'idx_events_timestamp',
            sql: 'CREATE INDEX idx_events_timestamp ON events(timestamp)',
        },
        {
            table: 'gate_results',
            name: 'idx_gate_results_created',
            sql: 'CREATE INDEX idx_gate_results_created ON gate_results(created_at)',
        },
    ];

    for (const idx of indexesToAdd) {
        // Only create index if table exists and index doesn't
        if (existingTables.has(idx.table) && !existingIndexes.has(idx.name)) {
            db.exec(idx.sql);
        }
    }
}
