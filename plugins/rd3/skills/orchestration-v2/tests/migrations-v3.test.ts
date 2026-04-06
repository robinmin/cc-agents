import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../scripts/state/migrations';

beforeAll(() => {
    // Suppress logger output during tests
});

describe('migrations v2 to v3', () => {
    let db: Database;

    beforeEach(() => {
        db = new Database(':memory:');
    });

    afterEach(() => {
        db.close();
    });

    test('CURRENT_SCHEMA_VERSION is 3', () => {
        expect(CURRENT_SCHEMA_VERSION).toBe(3);
    });

    test('fresh install creates all indexes including v3 indexes', () => {
        runMigrations(db);

        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as Array<{
            name: string;
        }>;

        const indexNames = indexes.map((idx) => idx.name);

        // Check all expected indexes exist
        expect(indexNames).toContain('idx_phase_evidence_created');
        expect(indexNames).toContain('idx_runs_created');
        expect(indexNames).toContain('idx_events_timestamp');
        expect(indexNames).toContain('idx_gate_results_created');
    });

    test('v2 database gets migrated with new indexes', () => {
        // Simulate v2 database by applying schema without v3 indexes
        db.exec(`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                task_ref TEXT NOT NULL,
                preset TEXT,
                phases_requested TEXT NOT NULL,
                status TEXT NOT NULL,
                config_snapshot JSON NOT NULL,
                pipeline_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS phase_evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                phase_name TEXT NOT NULL,
                rework_iteration INTEGER DEFAULT 0,
                evidence JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Only partial index (missing created_at)
            CREATE INDEX IF NOT EXISTS idx_phase_evidence_run_phase ON phase_evidence(run_id, phase_name);
        `);
        db.prepare('INSERT INTO schema_version (version) VALUES (2)').run();

        // Run migrations
        runMigrations(db);

        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as Array<{
            name: string;
        }>;

        const indexNames = indexes.map((idx) => idx.name);

        // Verify v3 indexes were added
        expect(indexNames).toContain('idx_phase_evidence_created');
        expect(indexNames).toContain('idx_runs_created');

        // Verify old partial index still exists
        expect(indexNames).toContain('idx_phase_evidence_run_phase');
    });

    test('v3 database is not modified', () => {
        // Apply full schema
        db.exec(`
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                task_ref TEXT NOT NULL,
                preset TEXT,
                phases_requested TEXT NOT NULL,
                status TEXT NOT NULL,
                config_snapshot JSON NOT NULL,
                pipeline_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS phase_evidence (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                phase_name TEXT NOT NULL,
                rework_iteration INTEGER DEFAULT 0,
                evidence JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
        db.prepare('INSERT INTO schema_version (version) VALUES (3)').run();

        const indexesBefore = db
            .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
            .all() as Array<{ name: string }>;

        // Run migrations (should be no-op for v3)
        runMigrations(db);

        const indexesAfter = db
            .prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
            .all() as Array<{ name: string }>;

        expect(indexesAfter).toEqual(indexesBefore);
    });

    test('all indexes are created for fresh install', () => {
        runMigrations(db);

        const expectedIndexes = [
            'idx_events_run',
            'idx_events_timestamp',
            'idx_events_type',
            'idx_gate_results_created',
            'idx_phase_evidence_created',
            'idx_phase_evidence_run_phase',
            'idx_phases_status',
            'idx_resource_usage_model',
            'idx_resource_usage_phase',
            'idx_resource_usage_run',
            'idx_runs_created',
            'idx_runs_status',
            'idx_runs_task',
        ];

        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name").all() as Array<{
            name: string;
        }>;

        const indexNames = indexes.map((idx) => idx.name);

        for (const expected of expectedIndexes) {
            expect(indexNames).toContain(expected);
        }
    });
});
