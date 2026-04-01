import { describe, test, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { Queries } from '../scripts/state/queries';
import { Reporter } from '../scripts/observability/reporter';
import { SCHEMA_DDL, CURRENT_SCHEMA_VERSION } from '../scripts/state/migrations';
import type { TrendReport } from '../scripts/state/queries';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('Queries.getTrends', () => {
    let db: Database;
    let queries: Queries;

    beforeEach(() => {
        db = new Database(':memory:');
        db.exec(SCHEMA_DDL);
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(CURRENT_SCHEMA_VERSION);
        queries = new Queries(db);
    });

    afterEach(() => {
        db.close();
    });

    function seedRun(id: string, taskRef: string, preset: string, status: string, createdAt: string): void {
        db.prepare(
            "INSERT INTO runs (id, task_ref, preset, phases_requested, status, config_snapshot, pipeline_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'default', ?, ?)",
        ).run(id, taskRef, preset, 'intake,implement,test', status, '{}', createdAt, createdAt);
    }

    test('returns empty trends for no runs', async () => {
        const trend = await queries.getTrends(30);
        expect(trend.totalRuns).toBe(0);
        expect(trend.successRate).toBe(0);
        expect(trend.presets.length).toBe(0);
    });

    test('computes overall success rate', async () => {
        seedRun('r1', '0100', 'simple', 'COMPLETED', new Date().toISOString());
        seedRun('r2', '0101', 'simple', 'COMPLETED', new Date().toISOString());
        seedRun('r3', '0102', 'standard', 'FAILED', new Date().toISOString());

        const trend = await queries.getTrends(30);
        expect(trend.totalRuns).toBe(3);
        expect(trend.successRate).toBe(67);
    });

    test('breaks down by preset', async () => {
        seedRun('r1', '0100', 'simple', 'COMPLETED', new Date().toISOString());
        seedRun('r2', '0101', 'simple', 'COMPLETED', new Date().toISOString());
        seedRun('r3', '0102', 'standard', 'FAILED', new Date().toISOString());

        const trend = await queries.getTrends(30);
        expect(trend.presets.length).toBe(2);

        const simple = trend.presets.find((p) => p.preset === 'simple');
        expect(simple).toBeDefined();
        expect(simple?.totalRuns).toBe(2);
        expect(simple?.successRate).toBe(100);

        const standard = trend.presets.find((p) => p.preset === 'standard');
        expect(standard).toBeDefined();
        expect(standard?.totalRuns).toBe(1);
        expect(standard?.successRate).toBe(0);
    });

    test('excludes runs outside the time window', async () => {
        const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        seedRun('r1', '0100', 'simple', 'COMPLETED', oldDate);
        seedRun('r2', '0101', 'simple', 'COMPLETED', new Date().toISOString());

        const trend = await queries.getTrends(30);
        expect(trend.totalRuns).toBe(1);
    });
});

describe('Reporter.formatTrendReport', () => {
    test('formats trend report with presets', () => {
        const reporter = new Reporter();
        const trend: TrendReport = {
            periodDays: 30,
            totalRuns: 47,
            successes: 40,
            successRate: 85,
            presets: [
                { preset: 'simple', totalRuns: 20, successes: 18, successRate: 90, avgDurationMs: 720_000 },
                { preset: 'standard', totalRuns: 15, successes: 13, successRate: 87, avgDurationMs: 1_680_000 },
                { preset: 'complex', totalRuns: 12, successes: 9, successRate: 75, avgDurationMs: 2_880_000 },
            ],
        };

        const result = reporter.formatTrendReport(trend);
        expect(result).toContain('Trends (last 30 days)');
        expect(result).toContain('47 runs');
        expect(result).toContain('85% success rate');
        expect(result).toContain('simple');
        expect(result).toContain('standard');
        expect(result).toContain('complex');
    });

    test('formats trend report with no presets', () => {
        const reporter = new Reporter();
        const trend: TrendReport = {
            periodDays: 7,
            totalRuns: 0,
            successes: 0,
            successRate: 0,
            presets: [],
        };

        const result = reporter.formatTrendReport(trend);
        expect(result).toContain('0 runs');
        expect(result).toContain('0% success rate');
        expect(result).not.toContain('By preset');
    });
});
