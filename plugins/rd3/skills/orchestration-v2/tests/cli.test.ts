import { describe, test, expect, beforeAll } from 'bun:test';
import { parseArgs, validateCommand } from '../scripts/cli/commands';
import { Reporter } from '../scripts/observability/reporter';
import { aggregateMetrics, formatDuration, formatTokenCount } from '../scripts/observability/metrics';
import type { RunSummary } from '../scripts/state/queries';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('parseArgs', () => {
    test('parses run command with task ref', () => {
        const result = parseArgs(['run', '0300']);
        expect(result.command).toBe('run');
        expect(result.options.taskRef).toBe('0300');
    });

    test('parses --preset flag', () => {
        const result = parseArgs(['run', '0300', '--preset', 'security-first']);
        expect(result.options.preset).toBe('security-first');
    });

    test('parses --format flag', () => {
        const result = parseArgs(['report', '0300', '--format', 'json']);
        expect(result.options.format).toBe('json');
    });

    test('parses --dry-run flag', () => {
        const result = parseArgs(['run', '0300', '--dry-run']);
        expect(result.options.dryRun).toBe(true);
    });

    test('parses --auto flag', () => {
        const result = parseArgs(['run', '0300', '--auto']);
        expect(result.options.auto).toBe(true);
    });

    test('handles empty argv', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('');
    });
});

describe('validateCommand', () => {
    test('run requires taskRef', () => {
        expect(validateCommand({ command: 'run', options: {} })).toBe('Missing required argument: task-ref');
    });

    test('resume requires taskRef', () => {
        expect(validateCommand({ command: 'resume', options: {} })).toBe('Missing required argument: task-ref');
    });

    test('unknown command returns error', () => {
        expect(validateCommand({ command: 'bogus', options: {} })).toContain('Unknown command');
    });

    test('status command is valid without args', () => {
        expect(validateCommand({ command: 'status', options: {} })).toBeNull();
    });

    test('run with taskRef is valid', () => {
        expect(validateCommand({ command: 'run', options: { taskRef: '0300' } })).toBeNull();
    });
});

describe('formatDuration', () => {
    test('formats milliseconds', () => {
        expect(formatDuration(500)).toBe('500ms');
    });

    test('formats seconds', () => {
        expect(formatDuration(1500)).toBe('1.5s');
    });

    test('formats minutes and seconds', () => {
        expect(formatDuration(125_000)).toBe('2m 5s');
    });

    test('formats hours and minutes', () => {
        expect(formatDuration(3_720_000)).toBe('1h 2m');
    });
});

describe('formatTokenCount', () => {
    test('formats small numbers', () => {
        expect(formatTokenCount(500)).toBe('500');
    });

    test('formats thousands', () => {
        expect(formatTokenCount(1500)).toBe('1.5K');
    });

    test('formats millions', () => {
        expect(formatTokenCount(1_500_000)).toBe('1.5M');
    });
});

describe('aggregateMetrics', () => {
    test('aggregates empty array', () => {
        const result = aggregateMetrics([]);
        expect(result.totalInputTokens).toBe(0);
        expect(result.totalOutputTokens).toBe(0);
        expect(result.models.size).toBe(0);
    });

    test('aggregates single metric', () => {
        const result = aggregateMetrics([
            {
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 100,
                output_tokens: 50,
                wall_clock_ms: 5000,
                execution_ms: 4500,
            },
        ]);
        expect(result.totalInputTokens).toBe(100);
        expect(result.totalOutputTokens).toBe(50);
        expect(result.models.size).toBe(1);
    });

    test('aggregates multiple models', () => {
        const result = aggregateMetrics([
            {
                model_id: 'gpt-4',
                model_provider: 'openai',
                input_tokens: 100,
                output_tokens: 50,
                wall_clock_ms: 5000,
                execution_ms: 4500,
            },
            {
                model_id: 'claude-3',
                model_provider: 'anthropic',
                input_tokens: 200,
                output_tokens: 80,
                wall_clock_ms: 6000,
                execution_ms: 5500,
            },
        ]);
        expect(result.totalInputTokens).toBe(300);
        expect(result.models.size).toBe(2);
    });
});

describe('Reporter', () => {
    const mockSummary: RunSummary = {
        run: {
            id: 'run-test',
            task_ref: '0300',
            phases_requested: 'intake,arch',
            status: 'COMPLETED',
            config_snapshot: {},
            pipeline_name: 'default',
        },
        phases: [
            {
                run_id: 'run-test',
                name: 'intake',
                status: 'completed',
                skill: 'rd3:request-intake',
                rework_iteration: 0,
            },
            {
                run_id: 'run-test',
                name: 'arch',
                status: 'completed',
                skill: 'rd3:backend-architect',
                rework_iteration: 0,
            },
        ],
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalWallMs: 120_000,
        modelsUsed: ['openai/gpt-4'],
    };

    test('formatSummary produces output', () => {
        const reporter = new Reporter();
        const result = reporter.formatSummary(mockSummary);
        expect(result).toContain('0300');
        expect(result).toContain('COMPLETED');
    });

    test('formatJsonReport produces valid JSON', () => {
        const reporter = new Reporter();
        const result = reporter.formatJsonReport(mockSummary);
        const parsed = JSON.parse(result) as RunSummary;
        expect(parsed.run.task_ref).toBe('0300');
    });

    test('formatMarkdownReport produces markdown', () => {
        const reporter = new Reporter();
        const result = reporter.formatMarkdownReport(mockSummary);
        expect(result).toContain('# Pipeline Report');
        expect(result).toContain('| Phase |');
    });

    test('formatStatusTable produces table', () => {
        const reporter = new Reporter();
        const result = reporter.formatStatusTable(mockSummary);
        expect(result).toContain('0300');
        expect(result).toContain('intake');
    });
});

test('metricsToRecord maps metrics to usage record', () => {
    const { metricsToRecord } = require('../scripts/observability/metrics.js');
    const record = metricsToRecord('run-1', 'implement', {
        model_id: 'gpt-4',
        model_provider: 'openai',
        input_tokens: 100,
        output_tokens: 50,
        wall_clock_ms: 5000,
        execution_ms: 4500,
        cache_read_tokens: 10,
        cache_creation_tokens: 5,
        first_token_ms: 200,
    });
    expect(record.run_id).toBe('run-1');
    expect(record.phase_name).toBe('implement');
    expect(record.input_tokens).toBe(100);
    expect(record.cache_read_tokens).toBe(10);
    expect(record.first_token_ms).toBe(200);
});
