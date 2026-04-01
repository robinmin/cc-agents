import { describe, test, expect, beforeAll } from 'bun:test';
import { parseArgs, validateCommand, type ParsedCommand } from '../scripts/cli/commands';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('cli/commands — parseArgs', () => {
    test('parses run command with task ref', () => {
        const result = parseArgs(['run', '0300']);
        expect(result.command).toBe('run');
        expect(result.options.taskRef).toBe('0300');
    });

    test('parses status command', () => {
        const result = parseArgs(['status']);
        expect(result.command).toBe('status');
    });

    test('parses resume command with task ref', () => {
        const result = parseArgs(['resume', '0300']);
        expect(result.command).toBe('resume');
        expect(result.options.taskRef).toBe('0300');
    });

    test('parses undo command with task ref and phase', () => {
        const result = parseArgs(['undo', '0300', 'implement']);
        expect(result.command).toBe('undo');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.phaseName).toBe('implement');
    });

    test('parses report command with task ref', () => {
        const result = parseArgs(['report', '0300']);
        expect(result.command).toBe('report');
        expect(result.options.taskRef).toBe('0300');
    });

    test('parses validate command', () => {
        const result = parseArgs(['validate']);
        expect(result.command).toBe('validate');
    });

    test('parses list command', () => {
        const result = parseArgs(['list']);
        expect(result.command).toBe('list');
    });

    test('parses history command', () => {
        const result = parseArgs(['history']);
        expect(result.command).toBe('history');
    });

    test('parses history command with --preset filter', () => {
        const result = parseArgs(['history', '--preset', 'security-first']);
        expect(result.command).toBe('history');
        expect(result.options.preset).toBe('security-first');
    });

    test('parses history command with --since filter', () => {
        const result = parseArgs(['history', '--since', '2026-01-01']);
        expect(result.command).toBe('history');
        expect(result.options.since).toBe('2026-01-01');
    });

    test('parses history command with --failed filter', () => {
        const result = parseArgs(['history', '--failed']);
        expect(result.command).toBe('history');
        expect(result.options.failed).toBe(true);
    });

    test('parses history command with combined filters', () => {
        const result = parseArgs(['history', '--preset', 'quick', '--failed', '--limit', '5']);
        expect(result.command).toBe('history');
        expect(result.options.preset).toBe('quick');
        expect(result.options.failed).toBe(true);
        expect(result.options.limit).toBe(5);
    });

    test('parses migrate command', () => {
        const result = parseArgs(['migrate']);
        expect(result.command).toBe('migrate');
    });

    test('parses resume approval and rejection flags', () => {
        const approved = parseArgs(['resume', '0300', '--approve']);
        const rejected = parseArgs(['resume', '0300', '--reject']);

        expect(approved.options.approve).toBe(true);
        expect(rejected.options.reject).toBe(true);
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

    test('parses --verbose flag', () => {
        const result = parseArgs(['run', '0300', '--verbose']);
        expect(result.options.verbose).toBe(true);
    });

    test('parses --quiet flag', () => {
        const result = parseArgs(['run', '0300', '--quiet']);
        expect(result.options.quiet).toBe(true);
    });

    test('parses --all flag', () => {
        const result = parseArgs(['status', '--all']);
        expect(result.options.all).toBe(true);
    });

    test('parses --json flag', () => {
        const result = parseArgs(['status', '--json']);
        expect(result.options.json).toBe(true);
    });

    test('parses --evidence flag', () => {
        const result = parseArgs(['inspect', '0300', 'implement', '--evidence']);
        expect(result.options.evidence).toBe(true);
    });

    test('parses --output flag', () => {
        const result = parseArgs(['report', '0300', '--output', './report.md']);
        expect(result.options.output).toBe('./report.md');
    });

    test('parses --channel flag', () => {
        const result = parseArgs(['run', '0300', '--channel', 'codex']);
        expect(result.options.channel).toBe('codex');
    });

    test('parses --phases flag splits into array', () => {
        const result = parseArgs(['run', '0300', '--phases', 'implement,test']);
        expect(result.options.phases).toEqual(['implement', 'test']);
    });

    test('parses --phases flag with single phase still splits', () => {
        const result = parseArgs(['run', '0300', '--phases', 'implement']);
        expect(result.options.phases).toEqual(['implement']);
    });

    test('parses --coverage flag as number', () => {
        const result = parseArgs(['run', '0300', '--coverage', '90']);
        expect(result.options.coverage).toBe(90);
    });

    test('parses --file flag', () => {
        const result = parseArgs(['run', '0300', '--file', './pipeline.yaml']);
        expect(result.options.file).toBe('./pipeline.yaml');
    });

    test('parses migration source directory flags', () => {
        const dirResult = parseArgs(['migrate', '--dir', './legacy']);
        const fromV1Result = parseArgs(['migrate', '--from-v1', './legacy']);

        expect(dirResult.options.dir).toBe('./legacy');
        expect(fromV1Result.options.fromV1).toBe(true);
        expect(fromV1Result.options.dir).toBe('./legacy');
    });

    test('parses multiple flags together', () => {
        const result = parseArgs(['run', '0300', '--dry-run', '--verbose', '--preset', 'test']);
        expect(result.options.dryRun).toBe(true);
        expect(result.options.verbose).toBe(true);
        expect(result.options.preset).toBe('test');
    });

    test('handles empty argv', () => {
        const result = parseArgs([]);
        expect(result.command).toBe('');
        expect(Object.keys(result.options)).toHaveLength(0);
    });

    test('handles only flags without command', () => {
        const result = parseArgs(['--verbose']);
        expect(result.command).toBe('');
        expect(result.options.verbose).toBe(true);
    });

    test('ignores unknown flags', () => {
        const result = parseArgs(['run', '0300', '--unknown-flag', 'value']);
        expect(result.command).toBe('run');
        expect(result.options.taskRef).toBe('0300');
        expect(result.options.unknownFlag).toBeUndefined();
    });
});

describe('cli/commands — validateCommand', () => {
    test('run requires taskRef', () => {
        const cmd: ParsedCommand = { command: 'run', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required argument: task-ref');
    });

    test('run with taskRef is valid', () => {
        const cmd: ParsedCommand = { command: 'run', options: { taskRef: '0300' } };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('resume requires taskRef', () => {
        const cmd: ParsedCommand = { command: 'resume', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required argument: task-ref');
    });

    test('resume with taskRef is valid', () => {
        const cmd: ParsedCommand = { command: 'resume', options: { taskRef: '0300' } };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('undo requires both taskRef and phaseName', () => {
        const cmd: ParsedCommand = { command: 'undo', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required arguments: task-ref and phase');
    });

    test('undo requires phaseName even with taskRef', () => {
        const cmd: ParsedCommand = { command: 'undo', options: { taskRef: '0300' } };
        expect(validateCommand(cmd)).toBe('Missing required arguments: task-ref and phase');
    });

    test('undo with taskRef and phaseName is valid', () => {
        const cmd: ParsedCommand = {
            command: 'undo',
            options: { taskRef: '0300', phaseName: 'implement' },
        };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('report requires taskRef', () => {
        const cmd: ParsedCommand = { command: 'report', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required argument: task-ref');
    });

    test('report with taskRef is valid', () => {
        const cmd: ParsedCommand = { command: 'report', options: { taskRef: '0300' } };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('inspect requires both taskRef and phaseName', () => {
        const cmd: ParsedCommand = { command: 'inspect', options: {} };
        expect(validateCommand(cmd)).toBe('Missing required arguments: task-ref and phase');
    });

    test('status command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'status', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('validate command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'validate', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('list command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'list', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('history command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'history', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('migrate command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'migrate', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('prune command is valid without args', () => {
        const cmd: ParsedCommand = { command: 'prune', options: {} };
        expect(validateCommand(cmd)).toBeNull();
    });

    test('unknown command returns error', () => {
        const cmd: ParsedCommand = { command: 'bogus', options: {} };
        expect(validateCommand(cmd)).toContain('Unknown command');
    });

    test('empty command returns error', () => {
        const cmd: ParsedCommand = { command: '', options: {} };
        expect(validateCommand(cmd)).toContain('Unknown command');
    });

    test('trends is not a valid command', () => {
        const cmd: ParsedCommand = { command: 'trends', options: {} };
        expect(validateCommand(cmd)).toContain('Unknown command');
    });

    test('clear is not a valid command', () => {
        const cmd: ParsedCommand = { command: 'clear', options: {} };
        expect(validateCommand(cmd)).toContain('Unknown command');
    });

    test('validate handles commands without required args', () => {
        const commandsWithTaskRef = [
            { command: 'run', options: { taskRef: 'test' } },
            { command: 'resume', options: { taskRef: 'test' } },
            { command: 'report', options: { taskRef: 'test' } },
        ];

        for (const cmd of commandsWithTaskRef) {
            expect(validateCommand(cmd)).toBeNull();
        }
    });

    test('validate handles commands that need no args', () => {
        const validCommands = ['status', 'validate', 'list', 'history', 'migrate', 'prune'];

        for (const command of validCommands) {
            const cmd: ParsedCommand = { command, options: {} };
            expect(validateCommand(cmd)).toBeNull();
        }
    });
});
