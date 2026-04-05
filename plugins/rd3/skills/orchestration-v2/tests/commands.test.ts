import { describe, test, expect, beforeAll } from 'bun:test';
import { parseArgs, validateCommand, type ParsedCommand } from '../scripts/cli/commands';
import { setGlobalSilent } from '../../../scripts/logger';

beforeAll(() => {
    setGlobalSilent(true);
});

describe('parseArgs', () => {
    describe('basic command parsing', () => {
        test('parses single command', () => {
            const result = parseArgs(['status']);
            expect(result.command).toBe('status');
            expect(result.options).toEqual({});
        });

        test('parses command with task ref', () => {
            const result = parseArgs(['run', '0300']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('0300');
        });

        test('parses command with task ref and phase', () => {
            const result = parseArgs(['inspect', '0300', 'arch']);
            expect(result.command).toBe('inspect');
            expect(result.options.taskRef).toBe('0300');
            expect(result.options.phaseName).toBe('arch');
        });

        test('handles empty argv', () => {
            const result = parseArgs([]);
            expect(result.command).toBe('');
            expect(result.options).toEqual({});
        });

        test('handles command only', () => {
            const result = parseArgs(['list']);
            expect(result.command).toBe('list');
            expect(result.options).toEqual({});
        });
    });

    describe('boolean flags', () => {
        test('parses --dry-run flag', () => {
            const result = parseArgs(['run', '0300', '--dry-run']);
            expect(result.options.dryRun).toBe(true);
        });

        test('parses --verbose flag', () => {
            const result = parseArgs(['status', '--verbose']);
            expect(result.options.verbose).toBe(true);
        });

        test('parses --quiet flag', () => {
            const result = parseArgs(['status', '--quiet']);
            expect(result.options.quiet).toBe(true);
        });

        test('parses --auto flag', () => {
            const result = parseArgs(['run', '0300', '--auto']);
            expect(result.options.auto).toBe(true);
        });

        test('parses --all flag', () => {
            const result = parseArgs(['history', '--all']);
            expect(result.options.all).toBe(true);
        });

        test('parses --json flag', () => {
            const result = parseArgs(['report', '0300', '--json']);
            expect(result.options.json).toBe(true);
        });

        test('parses multiple boolean flags', () => {
            const result = parseArgs(['run', '0300', '--dry-run', '--verbose', '--auto']);
            expect(result.options.dryRun).toBe(true);
            expect(result.options.verbose).toBe(true);
            expect(result.options.auto).toBe(true);
        });
    });

    describe('value flags', () => {
        test('parses --format flag', () => {
            const result = parseArgs(['report', '0300', '--format', 'json']);
            expect(result.options.format).toBe('json');
        });

        test('parses --preset flag', () => {
            const result = parseArgs(['run', '0300', '--preset', 'security-first']);
            expect(result.options.preset).toBe('security-first');
        });

        test('parses --channel flag', () => {
            const result = parseArgs(['run', '0300', '--channel', 'staging']);
            expect(result.options.channel).toBe('staging');
        });

        test('parses --phases flag with single phase', () => {
            const result = parseArgs(['run', '0300', '--phases', 'intake']);
            expect(result.options.phases).toEqual(['intake']);
        });

        test('parses --phases flag with multiple phases', () => {
            const result = parseArgs(['run', '0300', '--phases', 'intake,arch,implement']);
            expect(result.options.phases).toEqual(['intake', 'arch', 'implement']);
        });

        test('parses --file flag', () => {
            const result = parseArgs(['validate', '--file', 'pipeline.yaml']);
            expect(result.options.file).toBe('pipeline.yaml');
        });

        test('parses --phase flag', () => {
            const result = parseArgs(['inspect', '0300', '--phase', 'arch']);
            expect(result.options.phase).toBe('arch');
        });

        test('parses --coverage flag', () => {
            const result = parseArgs(['report', '0300', '--coverage', '85']);
            expect(result.options.coverage).toBe(85);
        });

        test('parses --output flag', () => {
            const result = parseArgs(['report', '0300', '--output', 'report.json']);
            expect(result.options.output).toBe('report.json');
        });

        test('parses multiple value flags', () => {
            const result = parseArgs(['run', '0300', '--preset', 'test', '--format', 'json', '--channel', 'dev']);
            expect(result.options.preset).toBe('test');
            expect(result.options.format).toBe('json');
            expect(result.options.channel).toBe('dev');
        });
    });

    describe('edge cases and error conditions', () => {
        test('records unknown flags without corrupting positional parsing', () => {
            const result = parseArgs(['run', '0300', '--unknown-flag', '--verbose']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('0300');
            expect(result.options.verbose).toBe(true);
            expect(result.unknownFlags).toEqual(['--unknown-flag']);
        });

        test('handles value flag without value at end of args', () => {
            const result = parseArgs(['run', '0300', '--format']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('0300');
            expect(result.options).not.toHaveProperty('format');
        });

        test('handles value flag with empty string value', () => {
            const result = parseArgs(['run', '0300', '--format', '']);
            expect(result.options).not.toHaveProperty('format');
        });

        test('handles multiple unknown flags', () => {
            const result = parseArgs(['run', '0300', '--unknown1', '--unknown2', '--verbose']);
            expect(result.command).toBe('run');
            expect(result.options.verbose).toBe(true);
            expect(result.unknownFlags).toEqual(['--unknown1', '--unknown2']);
        });

        test('handles positional args beyond task ref and phase', () => {
            const result = parseArgs(['inspect', '0300', 'arch', 'extra1', 'extra2']);
            expect(result.command).toBe('inspect');
            expect(result.options.taskRef).toBe('0300');
            expect(result.options.phaseName).toBe('arch');
            // Extra positional args are ignored
        });

        test('handles flags mixed with positional args', () => {
            const result = parseArgs(['--verbose', 'run', '--dry-run', '0300', '--format', 'json', 'arch']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('0300');
            expect(result.options.phaseName).toBe('arch');
            expect(result.options.verbose).toBe(true);
            expect(result.options.dryRun).toBe(true);
            expect(result.options.format).toBe('json');
        });

        test('handles numeric task refs', () => {
            const result = parseArgs(['run', '123']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('123');
        });

        test('handles special character task refs', () => {
            const result = parseArgs(['run', 'task-ref_123.456']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('task-ref_123.456');
        });

        test('handles phases with commas but no splitting for non-phases flag', () => {
            const result = parseArgs(['run', 'task,with,commas']);
            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('task,with,commas');
        });

        test('parses coverage with invalid number string', () => {
            const result = parseArgs(['report', '0300', '--coverage', 'invalid']);
            expect(result.options.coverage).toBeNaN();
        });

        test('parses coverage with decimal number', () => {
            const result = parseArgs(['report', '0300', '--coverage', '85.5']);
            expect(result.options.coverage).toBe(85.5);
        });
    });

    describe('complex combinations', () => {
        test('full command with all possible flags', () => {
            const result = parseArgs([
                'run',
                'task-123',
                'phase-name',
                '--dry-run',
                '--verbose',
                '--auto',
                '--format',
                'json',
                '--preset',
                'security',
                '--channel',
                'prod',
                '--phases',
                'intake,arch',
                '--file',
                'config.yaml',
                '--phase',
                'implement',
                '--coverage',
                '90',
                '--all',
                '--json',
                '--output',
                'results.txt',
            ]);

            expect(result.command).toBe('run');
            expect(result.options.taskRef).toBe('task-123');
            expect(result.options.phaseName).toBe('phase-name');
            expect(result.options.dryRun).toBe(true);
            expect(result.options.verbose).toBe(true);
            expect(result.options.auto).toBe(true);
            expect(result.options.format).toBe('json');
            expect(result.options.preset).toBe('security');
            expect(result.options.channel).toBe('prod');
            expect(result.options.phases).toEqual(['intake', 'arch']);
            expect(result.options.file).toBe('config.yaml');
            expect(result.options.phase).toBe('implement');
            expect(result.options.coverage).toBe(90);
            expect(result.options.all).toBe(true);
            expect(result.options.json).toBe(true);
            expect(result.options.output).toBe('results.txt');
        });
    });
});

describe('validateCommand', () => {
    describe('valid commands without arguments', () => {
        const validCommandsWithoutArgs = ['status', 'validate', 'list', 'history', 'prune', 'migrate'];

        validCommandsWithoutArgs.forEach((command) => {
            test(`${command} is valid without arguments`, () => {
                const result = validateCommand({ command, options: {} });
                expect(result).toBeNull();
            });
        });
    });

    describe('commands requiring taskRef', () => {
        const commandsRequiringTaskRef = ['run', 'resume', 'report'];

        commandsRequiringTaskRef.forEach((command) => {
            test(`${command} requires taskRef`, () => {
                const result = validateCommand({ command, options: {} });
                expect(result).toBe('Missing required argument: task-ref');
            });

            test(`${command} is valid with taskRef`, () => {
                const result = validateCommand({ command, options: { taskRef: '0300' } });
                expect(result).toBeNull();
            });

            test(`${command} is valid with taskRef and additional options`, () => {
                const result = validateCommand({
                    command,
                    options: {
                        taskRef: '0300',
                        verbose: true,
                        format: 'json',
                    },
                });
                expect(result).toBeNull();
            });
        });
    });

    describe('commands requiring taskRef and phaseName', () => {
        const commandsRequiringBoth = ['undo', 'inspect'];

        commandsRequiringBoth.forEach((command) => {
            test(`${command} requires both taskRef and phaseName`, () => {
                const result = validateCommand({ command, options: {} });
                expect(result).toBe('Missing required arguments: task-ref and phase');
            });

            test(`${command} requires phaseName even with taskRef`, () => {
                const result = validateCommand({ command, options: { taskRef: '0300' } });
                expect(result).toBe('Missing required arguments: task-ref and phase');
            });

            test(`${command} requires taskRef even with phaseName`, () => {
                const result = validateCommand({ command, options: { phaseName: 'arch' } });
                expect(result).toBe('Missing required arguments: task-ref and phase');
            });

            test(`${command} is valid with both taskRef and phaseName`, () => {
                const result = validateCommand({
                    command,
                    options: {
                        taskRef: '0300',
                        phaseName: 'arch',
                    },
                });
                expect(result).toBeNull();
            });

            test(`${command} is valid with required args and additional options`, () => {
                const result = validateCommand({
                    command,
                    options: {
                        taskRef: '0300',
                        phaseName: 'arch',
                        verbose: true,
                        dryRun: true,
                    },
                });
                expect(result).toBeNull();
            });
        });
    });

    describe('invalid commands', () => {
        test('unknown command returns error', () => {
            const result = validateCommand({ command: 'unknown', options: {} });
            expect(result).toContain('Unknown command: unknown');
            expect(result).toContain(
                'Valid commands: init, run, resume, status, report, validate, list, history, undo, inspect, prune, migrate',
            );
        });

        test('empty command returns error', () => {
            const result = validateCommand({ command: '', options: {} });
            expect(result).toContain('Unknown command: ');
            expect(result).toContain('Valid commands:');
        });

        test('case sensitive command validation', () => {
            const result = validateCommand({ command: 'RUN', options: { taskRef: '0300' } });
            expect(result).toContain('Unknown command: RUN');
        });

        test('similar but invalid command names', () => {
            const invalidCommands = ['runs', 'statuses', 'reporting', 'validation'];

            invalidCommands.forEach((command) => {
                const result = validateCommand({ command, options: {} });
                expect(result).toContain(`Unknown command: ${command}`);
            });
        });
    });

    describe('edge cases', () => {
        test('handles undefined options', () => {
            const cmd: ParsedCommand = { command: 'status', options: {} };
            const result = validateCommand(cmd);
            expect(result).toBeNull();
        });

        test('rejects unknown flags on otherwise valid commands', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: '0300' },
                unknownFlags: ['--preste'],
            });
            expect(result).toBe('Unknown option: --preste');
        });

        test('handles null values in options', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: null },
            });
            expect(result).toBe('Missing required argument: task-ref');
        });

        test('handles undefined values in options', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: undefined },
            });
            expect(result).toBe('Missing required argument: task-ref');
        });

        test('handles empty string taskRef', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: '' },
            });
            expect(result).toBe('Missing required argument: task-ref');
        });

        test('handles empty string phaseName', () => {
            const result = validateCommand({
                command: 'undo',
                options: {
                    taskRef: '0300',
                    phaseName: '',
                },
            });
            expect(result).toBe('Missing required arguments: task-ref and phase');
        });

        test('handles whitespace-only taskRef', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: '   ' },
            });
            // Current implementation treats whitespace as truthy
            expect(result).toBeNull();
        });

        test('handles special characters in taskRef', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: 'task-123_abc.def' },
            });
            expect(result).toBeNull();
        });

        test('handles numeric taskRef', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: 123 },
            });
            expect(result).toBeNull();
        });

        test('handles boolean taskRef (truthy)', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: true },
            });
            expect(result).toBeNull();
        });

        test('handles boolean taskRef (falsy)', () => {
            const result = validateCommand({
                command: 'run',
                options: { taskRef: false },
            });
            expect(result).toBe('Missing required argument: task-ref');
        });
    });

    describe('all valid commands enumeration', () => {
        const allValidCommands = [
            'init',
            'run',
            'resume',
            'status',
            'report',
            'validate',
            'list',
            'history',
            'undo',
            'inspect',
            'prune',
            'migrate',
        ];

        allValidCommands.forEach((command) => {
            test(`${command} is recognized as valid command`, () => {
                // Create appropriate options based on command requirements
                let options = {};
                if (['run', 'resume', 'report'].includes(command)) {
                    options = { taskRef: 'test-task' };
                } else if (['undo', 'inspect'].includes(command)) {
                    options = { taskRef: 'test-task', phaseName: 'test-phase' };
                }

                const result = validateCommand({ command, options });
                expect(result).toBeNull();
            });
        });
    });
});
