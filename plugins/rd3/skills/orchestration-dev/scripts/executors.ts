import { execAcpx } from '../../../scripts/libs/acpx-query';

export type NormalizedExecutionChannel =
    | 'current'
    | 'claude'
    | 'codex'
    | 'openclaw'
    | 'opencode'
    | 'antigravity'
    | 'pi';
export type ExecutorBackend = 'local-child' | 'acp';

export interface ExecutionRequest {
    channel: string;
    cwd: string;
    timeout_ms?: number;
    command?: string;
    prompt?: string;
    metadata?: Record<string, unknown>;
}

export interface ExecutionResult {
    status: 'completed' | 'failed' | 'paused';
    backend: ExecutorBackend;
    normalized_channel: NormalizedExecutionChannel;
    stdout?: string;
    stderr?: string;
    exit_code?: number;
    command?: string[];
    error?: string;
    structured_output?: Record<string, unknown>;
}

export interface Executor {
    backend: ExecutorBackend;
    execute(request: ExecutionRequest): Promise<ExecutionResult>;
}

interface LocalCommandExecutorOptions {
    runCommand?: (cmd: string, cwd: string, timeoutMs?: number) => ExecutionResult;
}

interface AcpExecutorOptions {
    acpxExec?: typeof execAcpx;
    acpxBin?: string;
}

function defaultLocalRunner(cmd: string, cwd: string, timeoutMs?: number): ExecutionResult {
    const result = Bun.spawnSync({
        cmd: ['zsh', '-lc', cmd],
        cwd,
        env: process.env,
        stdout: 'pipe',
        stderr: 'pipe',
        ...(timeoutMs !== undefined ? { timeout: timeoutMs } : {}),
    });

    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);

    return {
        status: result.exitCode === 0 ? 'completed' : 'failed',
        backend: 'local-child',
        normalized_channel: 'current',
        stdout,
        stderr,
        exit_code: result.exitCode,
        command: ['zsh', '-lc', cmd],
        ...(result.exitCode === 0
            ? {}
            : { error: stderr || stdout || `Command failed with exit code ${result.exitCode}` }),
    };
}

const KNOWN_CHANNELS = new Set<NormalizedExecutionChannel>([
    'current',
    'claude',
    'codex',
    'openclaw',
    'opencode',
    'antigravity',
    'pi',
]);

export function normalizeExecutionChannel(channel?: string): NormalizedExecutionChannel {
    if (!channel || channel === 'current') {
        return 'current';
    }

    if (channel === 'claude-code') {
        return 'claude';
    }

    if (KNOWN_CHANNELS.has(channel as NormalizedExecutionChannel)) {
        return channel as NormalizedExecutionChannel;
    }

    throw new Error(`Unknown execution channel: "${channel}". Valid channels: ${[...KNOWN_CHANNELS].join(', ')}`);
}

export class LocalCommandExecutor implements Executor {
    readonly backend = 'local-child' as const;
    private readonly runCommand: NonNullable<LocalCommandExecutorOptions['runCommand']>;

    constructor(options: LocalCommandExecutorOptions = {}) {
        this.runCommand = options.runCommand ?? defaultLocalRunner;
    }

    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        if (!request.command) {
            return {
                status: 'failed',
                backend: this.backend,
                normalized_channel: 'current',
                error: 'Local command executor requires request.command',
            };
        }

        return this.runCommand(request.command, request.cwd, request.timeout_ms);
    }
}

export class AcpExecutor implements Executor {
    readonly backend = 'acp' as const;
    private readonly acpxExec: typeof execAcpx;
    private readonly acpxBin: string;

    constructor(options: AcpExecutorOptions = {}) {
        this.acpxExec = options.acpxExec ?? execAcpx;
        this.acpxBin = options.acpxBin ?? 'acpx';
    }

    async execute(request: ExecutionRequest): Promise<ExecutionResult> {
        const normalizedChannel = normalizeExecutionChannel(request.channel);
        if (normalizedChannel === 'current') {
            return {
                status: 'failed',
                backend: this.backend,
                normalized_channel: normalizedChannel,
                error: 'ACP executor requires a non-current channel',
            };
        }

        if (!request.prompt) {
            return {
                status: 'failed',
                backend: this.backend,
                normalized_channel: normalizedChannel,
                error: 'ACP executor requires request.prompt',
            };
        }

        const command = [this.acpxBin, '--format', 'quiet', normalizedChannel, 'exec', request.prompt];
        const result = this.acpxExec(command, request.timeout_ms);

        return {
            status: result.ok ? 'completed' : 'failed',
            backend: this.backend,
            normalized_channel: normalizedChannel,
            stdout: result.stdout,
            stderr: result.stderr,
            exit_code: result.exitCode,
            command,
            ...(result.ok
                ? {}
                : { error: result.stderr || result.stdout || `ACP request failed with exit code ${result.exitCode}` }),
        };
    }
}

export function createExecutorForChannel(
    channel?: string,
    options: {
        local?: LocalCommandExecutorOptions;
        acp?: AcpExecutorOptions;
    } = {},
): Executor {
    const normalizedChannel = normalizeExecutionChannel(channel);
    if (normalizedChannel === 'current') {
        return new LocalCommandExecutor(options.local);
    }

    return new AcpExecutor(options.acp);
}
