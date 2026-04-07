/**
 * Gate analytics tests
 */

import { describe, expect, test, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Queries } from '../scripts/state/queries';

describe('Gate Analytics Queries', () => {
    let db: Database;
    let queries: Queries;

    beforeEach(() => {
        db = new Database(':memory:');
        db.exec(`
            CREATE TABLE runs (
                id TEXT PRIMARY KEY,
                task_ref TEXT NOT NULL,
                preset TEXT,
                phases_requested TEXT NOT NULL,
                status TEXT NOT NULL,
                config_snapshot TEXT NOT NULL,
                pipeline_name TEXT NOT NULL,
                created_at TEXT,
                updated_at TEXT
            );

            CREATE TABLE gate_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                phase_name TEXT NOT NULL,
                step_name TEXT NOT NULL,
                checker_method TEXT NOT NULL,
                passed INTEGER NOT NULL,
                advisory INTEGER,
                evidence TEXT,
                duration_ms INTEGER,
                created_at TEXT NOT NULL
            );

            INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at)
            VALUES
                ('run-1', '0327', 'standard', 'planning,implement,review', 'COMPLETED', '{}', 'default', datetime('now', '-5 days')),
                ('run-2', '0328', 'standard', 'planning,implement,review', 'FAILED', '{}', 'default', datetime('now', '-3 days')),
                ('run-3', '0329', 'complex', 'planning,design,implement,review,testing', 'COMPLETED', '{}', 'default', datetime('now', '-1 days'));
        `);
        queries = new Queries(db);
    });

    describe('getGateFailureAnalytics', () => {
        test('returns empty analytics when no gate results exist', async () => {
            const result = await queries.getGateFailureAnalytics(30);
            expect(result.totalGates).toBe(0);
            expect(result.blockingFails).toBe(0);
            expect(result.advisoryFails).toBe(0);
            expect(result.phases).toHaveLength(0);
        });

        test('counts blocking and advisory failures correctly', async () => {
            // Add gate results
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, advisory, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 1, 0, datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, 0, datetime('now', '-3 days')),
                    ('run-2', 'implement', 'auto-gate#2', 'llm', 0, 0, datetime('now', '-3 days')),
                    ('run-3', 'review', 'auto-gate', 'llm', 1, 0, datetime('now', '-1 days')),
                    ('run-3', 'review', 'auto-gate', 'llm', 0, 1, datetime('now', '-1 days'));
            `);

            const result = await queries.getGateFailureAnalytics(30);
            expect(result.totalGates).toBe(5);
            expect(result.blockingFails).toBe(2);
            expect(result.advisoryFails).toBe(1);
        });

        test('groups stats by phase', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, advisory, duration_ms, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 1, 0, 1000, datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, 0, 2000, datetime('now', '-3 days')),
                    ('run-3', 'review', 'auto-gate', 'llm', 1, 0, 500, datetime('now', '-1 days'));
            `);

            const result = await queries.getGateFailureAnalytics(30);
            expect(result.phases).toHaveLength(2);

            const implementPhase = result.phases.find((p) => p.phaseName === 'implement');
            expect(implementPhase?.totalGates).toBe(2);
            expect(implementPhase?.passedGates).toBe(1);
            expect(implementPhase?.failedGates).toBe(1);
            expect(implementPhase?.avgDurationMs).toBe(1500);
        });

        test('filters by time period', async () => {
            // Use explicit timestamps for reliable filtering
            const now = new Date();
            const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
            const older = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString();

            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 0, '${recent}'),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, '${older}');
            `);

            // 30 days should only include recent failures
            const result = await queries.getGateFailureAnalytics(30);
            expect(result.totalGates).toBe(1);
        });
    });

    describe('getChecklistFailureStats', () => {
        test('extracts checklist failures from evidence', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, evidence, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 0,
                     '{"checklist":[{"item":"no-console","passed":false},{"item":"no-any","passed":false}]}',
                     datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0,
                     '{"checklist":[{"item":"no-console","passed":false},{"item":"tests-pass","passed":true}]}',
                     datetime('now', '-3 days'));
            `);

            const result = await queries.getChecklistFailureStats(10, 30);
            expect(result).toHaveLength(2);

            const noConsole = result.find((s) => s.item === 'no-console');
            expect(noConsole?.failureCount).toBe(2);

            const noAny = result.find((s) => s.item === 'no-any');
            expect(noAny?.failureCount).toBe(1);
        });

        test('limits results by specified limit', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, evidence, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 0,
                     '{"checklist":[{"item":"item-1","passed":false},{"item":"item-2","passed":false}]}',
                     datetime('now', '-5 days'));
            `);

            const result = await queries.getChecklistFailureStats(1, 30);
            expect(result).toHaveLength(1);
            expect(result[0].failureCount).toBeGreaterThanOrEqual(1);
        });

        test('handles malformed evidence gracefully', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, evidence, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 0, 'not-json', datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, NULL, datetime('now', '-3 days'));
            `);

            const result = await queries.getChecklistFailureStats(10, 30);
            expect(result).toHaveLength(0);
        });
    });

    describe('getReworkStats', () => {
        test('tracks first-try vs rework passes', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 1, datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, datetime('now', '-3 days')),
                    ('run-2', 'implement', 'auto-gate#2', 'llm', 1, datetime('now', '-3 days')),
                    ('run-3', 'review', 'auto-gate', 'llm', 1, datetime('now', '-1 days'));
            `);

            const result = await queries.getReworkStats(30);
            const implement = result.find((r) => r.phaseName === 'implement');
            expect(implement?.totalAttempts).toBe(2);
            expect(implement?.passesOnFirstTry).toBe(1);
            expect(implement?.passesAfterRework).toBe(1);
            expect(implement?.reworkRate).toBe(50);
        });

        test('calculates rework rate percentage', async () => {
            db.exec(`
                INSERT INTO gate_results (run_id, phase_name, step_name, checker_method, passed, created_at)
                VALUES
                    ('run-1', 'implement', 'auto-gate', 'llm', 1, datetime('now', '-5 days')),
                    ('run-2', 'implement', 'auto-gate', 'llm', 0, datetime('now', '-3 days')),
                    ('run-2', 'implement', 'auto-gate#2', 'llm', 1, datetime('now', '-3 days')),
                    ('run-3', 'implement', 'auto-gate', 'llm', 0, datetime('now', '-1 days')),
                    ('run-3', 'implement', 'auto-gate#2', 'llm', 0, datetime('now', '-1 days')),
                    ('run-3', 'implement', 'auto-gate#3', 'llm', 1, datetime('now', '-1 days'));
            `);

            const result = await queries.getReworkStats(30);
            const implement = result.find((r) => r.phaseName === 'implement');
            expect(implement?.totalAttempts).toBe(3);
            expect(implement?.passesOnFirstTry).toBe(1);
            expect(implement?.passesAfterRework).toBe(2);
            expect(implement?.reworkRate).toBe(67); // 2/3 rounds to 67%
        });

        test('returns empty when no gate passes exist', async () => {
            const result = await queries.getReworkStats(30);
            expect(result).toHaveLength(0);
        });
    });
});
