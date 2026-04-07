/**
 * orchestration-v2 — CLI command definitions
 *
 * All command definitions for the orchestrator CLI.
 */

export interface ParsedCommand {
    readonly command: string;
    readonly options: Record<string, unknown>;
    readonly unknownFlags?: readonly string[];
}

const VALID_COMMANDS = [
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
    'events',
    'exec',
] as const;

type ValidCommand = (typeof VALID_COMMANDS)[number];

export function parseArgs(argv: string[]): ParsedCommand {
    const positional: string[] = [];
    const options: Record<string, unknown> = {};
    const unknownFlags: string[] = [];
    let i = 0;

    while (i < argv.length) {
        const arg = argv[i];
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg === '--skip-deps') {
            options.skipDeps = true;
        } else if (arg === '--verbose') {
            options.verbose = true;
        } else if (arg === '--quiet') {
            options.quiet = true;
        } else if (arg === '--state-dir' && argv[i + 1]) {
            options.stateDir = argv[i + 1];
            i++;
        } else if (arg === '--auto') {
            options.auto = true;
        } else if (arg === '--approve') {
            options.approve = true;
        } else if (arg === '--reject') {
            options.reject = true;
        } else if (arg === '--evidence') {
            options.evidence = true;
        } else if (arg === '--format' && argv[i + 1]) {
            options.format = argv[i + 1];
            i++;
        } else if (arg === '--preset' && argv[i + 1]) {
            options.preset = argv[i + 1];
            i++;
        } else if (arg === '--profile' && argv[i + 1]) {
            // Compatibility alias for --preset (deprecated, emits warning in run.ts)
            options.preset = argv[i + 1];
            options.profileDeprecated = true;
            i++;
        } else if (arg === '--channel' && argv[i + 1]) {
            options.channel = argv[i + 1];
            i++;
        } else if (arg.startsWith('--channel=')) {
            options.channel = arg.slice('--channel='.length);
        } else if (arg === '--phases' && argv[i + 1]) {
            options.phases = argv[i + 1].split(',');
            i++;
        } else if ((arg === '--file' || arg === '--pipeline') && argv[i + 1]) {
            options.file = argv[i + 1];
            i++;
        } else if (arg === '--dir' && argv[i + 1]) {
            options.dir = argv[i + 1];
            i++;
        } else if (arg === '--phase' && argv[i + 1]) {
            options.phase = argv[i + 1];
            options.phaseName = argv[i + 1];
            i++;
        } else if (arg === '--from-v1') {
            options.fromV1 = true;
            if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
                options.dir = argv[i + 1];
                i++;
            }
        } else if (arg === '--coverage' && argv[i + 1]) {
            options.coverage = Number(argv[i + 1]);
            i++;
        } else if (arg === '--run' && argv[i + 1]) {
            options.run = argv[i + 1];
            i++;
        } else if (arg === '--type' && argv[i + 1]) {
            options.types = (options.types as string[] | undefined) ?? [];
            (options.types as string[]).push(...argv[i + 1].split(','));
            i++;
        } else if (arg === '--all') {
            options.all = true;
        } else if (arg === '--json') {
            options.json = true;
        } else if ((arg === '--output' || arg === '-o') && argv[i + 1]) {
            options.output = argv[i + 1];
            i++;
        } else if (arg === '--older-than' && argv[i + 1]) {
            options.olderThan = argv[i + 1];
            i++;
        } else if (arg === '--keep-last' && argv[i + 1]) {
            options.keepLast = Number(argv[i + 1]);
            i++;
        } else if ((arg === '--limit' || arg === '--last') && argv[i + 1]) {
            options.limit = Number(argv[i + 1]);
            i++;
        } else if (arg === '--since' && argv[i + 1]) {
            options.since = argv[i + 1];
            i++;
        } else if (arg === '--failed') {
            options.failed = true;
        } else if (arg === '--force') {
            options.force = true;
        } else if (arg === '--schema') {
            options.schema = true;
        } else if (arg.startsWith('-')) {
            unknownFlags.push(arg);
            if (argv[i + 1] && !argv[i + 1].startsWith('-')) {
                i++;
            }
        } else {
            positional.push(arg);
        }
        i++;
    }

    const command = positional[0] ?? '';
    if (positional[1]) options.taskRef = positional[1];
    if (positional[2]) options.phaseName = positional[2];

    return {
        command,
        options,
        ...(unknownFlags.length > 0 && { unknownFlags }),
    };
}

export function validateCommand(cmd: ParsedCommand): string | null {
    const { command, unknownFlags } = cmd;

    if (!VALID_COMMANDS.includes(command as ValidCommand)) {
        return `Unknown command: ${command}. Valid commands: ${VALID_COMMANDS.join(', ')}`;
    }

    if (unknownFlags && unknownFlags.length > 0) {
        const label = unknownFlags.length === 1 ? 'option' : 'options';
        return `Unknown ${label}: ${unknownFlags.join(', ')}`;
    }

    if (command === 'run' && !cmd.options.taskRef) {
        return 'Missing required argument: task-ref';
    }
    if (command === 'resume' && !cmd.options.taskRef) {
        return 'Missing required argument: task-ref';
    }
    if (command === 'report' && !cmd.options.taskRef) {
        return 'Missing required argument: task-ref';
    }
    if (command === 'undo' && (!cmd.options.taskRef || !cmd.options.phaseName)) {
        return 'Missing required arguments: task-ref and phase';
    }
    if (command === 'inspect' && (!cmd.options.taskRef || !cmd.options.phaseName)) {
        return 'Missing required arguments: task-ref and phase';
    }
    if (command === 'events' && !cmd.options.run && !cmd.options.taskRef) {
        return 'Missing required: task-ref or --run <id>';
    }

    return null;
}
