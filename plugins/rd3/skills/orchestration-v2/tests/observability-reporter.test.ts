import { describe, test, expect, beforeAll } from 'bun:test';
import { Reporter } from '../scripts/observability/reporter';
import type { RunSummary, TrendReport } from '../scripts/state/queries';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

function createMockSummary(overrides: Partial<RunSummary> = {}): RunSummary {
    return {
        run: {
            id: 'run-test-123',
            task_ref: 'TASK-001',
            phases_requested: 'implement,test,deploy',
            status: 'COMPLETED',
            config_snapshot: {},
            pipeline_name: 'default',
            created_at: new Date('2024-01-15T10:00:00Z'),
            updated_at: new Date('2024-01-15T11:30:00Z'),
        },
        phases: [
            {
                run_id: 'run-test-123',
                name: 'implement',
                status: 'completed',
                skill: 'rd3:code-implement',
                started_at: new Date('2024-01-15T10:00:00Z'),
                completed_at: new Date('2024-01-15T10:45:00Z'),
                rework_iteration: 0,
            },
            {
                run_id: 'run-test-123',
                name: 'test',
                status: 'completed',
                skill: 'rd3:sys-testing',
                started_at: new Date('2024-01-15T10:45:00Z'),
                completed_at: new Date('2024-01-15T11:15:00Z'),
                rework_iteration: 1,
            },
            {
                run_id: 'run-test-123',
                name: 'deploy',
                status: 'completed',
                skill: 'rd3:deployment',
                started_at: new Date('2024-01-15T11:15:00Z'),
                completed_at: new Date('2024-01-15T11:30:00Z'),
                rework_iteration: 0,
            },
        ],
        totalInputTokens: 5000,
        totalOutputTokens: 3000,
        totalWallMs: 5400000, // 1.5 hours
        modelsUsed: ['openai/gpt-4', 'anthropic/claude-3'],
        ...overrides,
    };
}

function createMockTrendReport(overrides: Partial<TrendReport> = {}): TrendReport {
    return {
        periodDays: 30,
        totalRuns: 25,
        successes: 21,
        successRate: 84,
        presets: [
            {
                preset: 'quick',
                totalRuns: 15,
                successes: 14,
                successRate: 90,
                avgDurationMs: 1800000, // 30 minutes
            },
            {
                preset: 'full',
                totalRuns: 10,
                successes: 7,
                successRate: 75,
                avgDurationMs: 7200000, // 2 hours
            },
        ],
        ...overrides,
    };
}

describe('observability/reporter — Reporter', () => {
    test('formatSummary produces readable output', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.formatSummary(summary);

        expect(result).toContain('TASK-001');
        expect(result).toContain('COMPLETED');
        expect(result).toContain('default');
        expect(result).toContain('implement');
        expect(result).toContain('test');
        expect(result).toContain('deploy');
        expect(result).toContain('8.0K'); // Total tokens in compact notation (5000 + 3000)
        expect(result).toContain('1h 30m'); // Duration formatting
    });

    test('formatSummary handles failed run', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            run: {
                ...createMockSummary().run,
                status: 'FAILED',
            },
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'implement',
                    status: 'failed',
                    skill: 'rd3:code-implement',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    completed_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 2,
                },
            ],
        });

        const result = reporter.formatSummary(summary);

        expect(result).toContain('FAILED');
        expect(result).toContain('failed');
        expect(result).toContain('rework: 2');
    });

    test('formatSummary handles paused run', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            run: {
                ...createMockSummary().run,
                status: 'PAUSED',
            },
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'implement',
                    status: 'completed',
                    skill: 'rd3:code-implement',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    completed_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 0,
                },
                {
                    run_id: 'run-test-123',
                    name: 'test',
                    status: 'running',
                    skill: 'rd3:sys-testing',
                    started_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 0,
                },
            ],
        });

        const result = reporter.formatSummary(summary);

        expect(result).toContain('PAUSED');
        expect(result).toContain('running');
    });

    test('formatJsonReport produces valid JSON', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.formatJsonReport(summary);

        const parsed = JSON.parse(result) as RunSummary;
        expect(parsed.run.task_ref).toBe('TASK-001');
        expect(parsed.phases).toHaveLength(3);
        expect(parsed.totalInputTokens).toBe(5000);
        expect(parsed.modelsUsed).toContain('openai/gpt-4');
    });

    test('formatJsonReport handles special characters', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'test',
                    status: 'failed',
                    skill: 'rd3:sys-testing',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    completed_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 0,
                    error_message: 'Error with "quotes" and \nNewlines',
                },
            ],
        });

        const result = reporter.formatJsonReport(summary);

        expect(() => JSON.parse(result)).not.toThrow();
        const parsed = JSON.parse(result);
        expect(parsed.phases[0].error_message).toContain('quotes');
    });

    test('formatMarkdownReport produces valid markdown', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.formatMarkdownReport(summary);

        expect(result).toContain('# Pipeline Report');
        expect(result).toContain('**Task Reference:**');
        expect(result).toContain('TASK-001');
        expect(result).toContain('**Status:**');
        expect(result).toContain('COMPLETED');
        expect(result).toContain('## Phases');
        expect(result).toContain('| Phase |');
        expect(result).toContain('| implement |');
        expect(result).toContain('| test |');
        expect(result).toContain('| deploy |');
        expect(result).toContain('## Models Used');
        expect(result).toContain('8.0K'); // Total tokens in compact notation
    });

    test('formatMarkdownReport handles empty phases', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            phases: [],
        });

        const result = reporter.formatMarkdownReport(summary);

        expect(result).toContain('# Pipeline Report');
        expect(result).toContain('## Phases');
        expect(result).toContain('| Phase | Status | Skill |');
        expect(result).toContain('|-------|--------|-------|');
    });

    test('formatMarkdownReport escapes markdown characters', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            run: {
                ...createMockSummary().run,
                task_ref: 'TASK-001_with*special#chars',
            },
        });

        const result = reporter.formatMarkdownReport(summary);

        expect(result).toContain('TASK-001_with*special#chars');
    });

    test('formatStatusTable produces tabular output', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.formatStatusTable(summary);

        expect(result).toContain('TASK-001');
        expect(result).toContain('COMPLETED');
        expect(result).toContain('implement');
        expect(result).toContain('test');
        expect(result).toContain('deploy');
        expect(result).toContain('1h 30m');

        // Should be formatted as a table (contains borders or separators)
        expect(result.split('\n').length).toBeGreaterThan(1);
    });

    test('formatStatusTable handles single phase', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'implement',
                    status: 'completed',
                    skill: 'rd3:code-implement',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    completed_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 0,
                },
            ],
        });

        const result = reporter.formatStatusTable(summary);

        expect(result).toContain('implement');
        expect(result).not.toContain('test');
    });

    test('formatTrendReport produces readable trend analysis', () => {
        const reporter = new Reporter();
        const trends = createMockTrendReport();

        const result = reporter.formatTrendReport(trends);

        expect(result).toContain('Pipeline Trends');
        expect(result).toContain('Overall Statistics');
        expect(result).toContain('25 runs');
        expect(result).toContain('84%'); // Success rate
        expect(result).toContain('2h 0m'); // Average duration for full preset (7200000ms)
        expect(result).toContain('By Preset');
        expect(result).toContain('quick');
        expect(result).toContain('full');
        expect(result).toContain('90%');
        expect(result).toContain('75%');
    });

    test('formatTrendReport handles no preset breakdown', () => {
        const reporter = new Reporter();
        const trends = createMockTrendReport({
            presets: [],
        });

        const result = reporter.formatTrendReport(trends);

        expect(result).toContain('Overall Statistics');
        expect(result).toContain('25 runs');
        expect(result).not.toContain('By Preset');
    });

    test('formatTrendReport handles zero runs', () => {
        const reporter = new Reporter();
        const trends = createMockTrendReport({
            totalRuns: 0,
            successes: 0,
            successRate: 0,
            presets: [],
        });

        const result = reporter.formatTrendReport(trends);

        expect(result).toContain('0 runs');
        expect(result).toContain('0%');
    });

    test('handles unicode and emoji characters', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'test-🚀',
                    status: 'completed',
                    skill: 'rd3:测试-skill',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    completed_at: new Date('2024-01-15T10:30:00Z'),
                    rework_iteration: 0,
                },
            ],
        });

        const markdownResult = reporter.formatMarkdownReport(summary);
        const jsonResult = reporter.formatJsonReport(summary);

        expect(markdownResult).toContain('test-🚀');
        expect(markdownResult).toContain('rd3:测试-skill');

        const parsed = JSON.parse(jsonResult);
        expect(parsed.phases[0].name).toBe('test-🚀');
        expect(parsed.phases[0].skill).toBe('rd3:测试-skill');
    });

    test('formatSummary handles missing optional fields', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            phases: [
                {
                    run_id: 'run-test-123',
                    name: 'implement',
                    status: 'completed',
                    skill: 'rd3:code-implement',
                    started_at: new Date('2024-01-15T10:00:00Z'),
                    rework_iteration: 0,
                },
            ],
        });

        const result = reporter.formatSummary(summary);

        expect(result).toContain('implement');
        expect(result).toContain('completed');
        // Should not crash on missing completed_at
    });

    test('formatMarkdownReport handles very long duration', () => {
        const reporter = new Reporter();
        const summary = createMockSummary({
            totalWallMs: 25200000, // 7 hours
        });

        const result = reporter.formatMarkdownReport(summary);

        expect(result).toContain('7h 0m');
    });

    test('all format methods return strings', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();
        const trends = createMockTrendReport();

        expect(typeof reporter.formatSummary(summary)).toBe('string');
        expect(typeof reporter.formatJsonReport(summary)).toBe('string');
        expect(typeof reporter.formatMarkdownReport(summary)).toBe('string');
        expect(typeof reporter.formatStatusTable(summary)).toBe('string');
        expect(typeof reporter.formatTrendReport(trends)).toBe('string');
    });

    test('format() dispatches to table formatter', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.format(summary, 'table');

        expect(result).toContain('TASK-001');
        expect(result).toContain('────────────────');
    });

    test('format() dispatches to markdown formatter', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.format(summary, 'markdown');

        expect(result).toContain('# Pipeline Report');
    });

    test('format() dispatches to json formatter', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.format(summary, 'json');

        expect(() => JSON.parse(result)).not.toThrow();
    });

    test('format() dispatches to summary formatter', () => {
        const reporter = new Reporter();
        const summary = createMockSummary();

        const result = reporter.format(summary, 'summary');

        expect(result).toContain('Run TASK-001');
    });
});
