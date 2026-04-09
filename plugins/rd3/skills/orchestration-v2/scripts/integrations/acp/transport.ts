/**
 * orchestration-v2 — ACP Transport Adapter
 *
 * Low-level acpx command execution and output parsing.
 *
 * This module is the boundary between orchestration and acpx CLI.
 * It handles:
 * - Command construction (exec vs prompt --session)
 * - Output parsing (NDJSON events, JSON blocks, metrics)
 * - Error mapping to standardized failure shapes
 *
 * Design: This is a pure transport utility. It should NOT:
 * - Know about routing policy
 * - Make adapter selection decisions
 * - Own session lifecycle (see sessions.ts)
 */

import { execAcpxSync, parseOutput, ALLOWED_TOOLS } from '../../../../../scripts/libs/acpx-query';
import type { AcpxQueryResult, ResourceMetrics } from '../../../../../scripts/libs/acpx-query';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * ACP command mode.
 *
 * - "exec": One-shot bounded execution. No session reuse.
 *   Use for: ordinary pipeline phase execution.
 *
 * - "prompt": Interactive prompt. Can be sessioned or one-shot.
 *   - Without --session: same as exec but with interactive features
 *   - With --session: persistent session with context carry-over
 */
export type AcpCommandMode = 'exec' | 'prompt';

/**
 * ACP execution options.
 */
export interface AcpTransportOptions {
    /** Agent name (e.g., "pi", "codex"). Default: "pi" */
    agent?: string;

    /** Path to acpx binary. Default: "acpx" */
    acpxBin?: string;

    /** Output format. Default: "json" for structured output */
    format?: 'text' | 'json' | 'quiet';

    /** Allowed tools for skill execution. Default: ALLOWED_TOOLS */
    allowedTools?: string;

    /** Non-interactive permissions. Default: "deny" */
    nonInteractivePermissions?: 'allow' | 'deny' | 'prompt';
}

/**
 * ACP transport result (matches ExecutionResult shape).
 */
export interface AcpTransportResult {
    readonly success: boolean;
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;
    readonly structured?: Record<string, unknown>;
    readonly durationMs: number;
    readonly timedOut: boolean;
    readonly resources?: readonly ResourceMetrics[];
}

// ─── Transport Implementation ─────────────────────────────────────────────────

/**
 * Build acpx command arguments.
 *
 * Argument ordering (exec mode):
 *   acpx [global options] <agent> exec [prompt]
 *
 * Argument ordering (prompt mode):
 *   acpx [global options] <agent> prompt [--session <name>] [--ttl N] [prompt]
 *
 * Global options (positioned before the agent):
 *   --format, --allowed-tools, --timeout, --non-interactive-permissions
 *
 * Note: --timeout and --non-interactive-permissions are global options in
 * acpx (v0.1.x). If acpx future-releases move them to agent-specific
 * options they must be repositioned.
 */
export function buildAcpxArgs(
    mode: AcpCommandMode,
    prompt: string,
    options: AcpTransportOptions,
    sessionOptions?: {
        sessionName?: string;
        sessionTtlSeconds?: number;
    },
): string[] {
    const args: string[] = [];

    // Global options — always positioned before the agent subcommand
    args.push('--format', options.format ?? 'json');
    args.push('--allowed-tools', options.allowedTools ?? ALLOWED_TOOLS);
    args.push('--non-interactive-permissions', options.nonInteractivePermissions ?? 'deny');

    // Agent subcommand
    const agent = options.agent ?? 'pi';

    if (mode === 'exec') {
        // One-shot exec
        args.push(agent, 'exec', prompt);
    } else {
        // Prompt mode
        args.push(agent, 'prompt');

        // Session options
        if (sessionOptions?.sessionName) {
            args.push('--session', sessionOptions.sessionName);
            if (sessionOptions.sessionTtlSeconds !== undefined && sessionOptions.sessionTtlSeconds > 0) {
                args.push('--ttl', String(sessionOptions.sessionTtlSeconds));
            }
        }

        args.push(prompt);
    }

    return args;
}

/**
 * Execute acpx command via transport layer.
 *
 * This is the core transport function. It:
 * 1. Builds command arguments
 * 2. Executes via spawnSync
 * 3. Parses output for structured data and metrics
 * 4. Adds failure diagnostics
 *
 * @param mode - Command mode (exec or prompt)
 * @param prompt - Execution prompt
 * @param timeoutMs - Timeout in milliseconds
 * @param options - Transport options
 * @param sessionOptions - Session-specific options (for prompt mode)
 */
export function executeAcpxTransport(
    mode: AcpCommandMode,
    prompt: string,
    timeoutMs: number,
    options: AcpTransportOptions,
    sessionOptions?: {
        sessionName?: string;
        sessionTtlSeconds?: number;
    },
): AcpTransportResult {
    const startTime = Date.now();

    // Build command with timeout as global option
    const timeoutArg = ['--timeout', String(Math.max(1, Math.ceil(timeoutMs / 1000)))];
    const args = [...timeoutArg, ...buildAcpxArgs(mode, prompt, options, sessionOptions)];

    // Prepend acpx binary (buildAcpxArgs doesn't include it)
    const command = [options.acpxBin ?? 'acpx', ...args];

    // Execute
    const result = execAcpxSync(command, timeoutMs);
    const durationMs = Date.now() - startTime;

    // Parse output
    const { structured, metrics } = parseOutput(result.stdout, true, true);

    // Add diagnostics on failure
    const stderr = addTransportDiagnostics(mode, result, options, sessionOptions, timeoutMs);

    return {
        success: result.ok,
        exitCode: result.exitCode,
        stdout: result.stdout.slice(0, 50_000),
        stderr: stderr.slice(0, 10_000),
        ...(structured !== undefined && { structured }),
        durationMs,
        timedOut: result.timedOut ?? false,
        ...(metrics && metrics.length > 0 && { resources: metrics }),
    };
}

/**
 * Execute stateless ACP transport (exec mode).
 *
 * This is the safe default for ordinary pipeline phase execution.
 * No session reuse, bounded execution.
 */
export function executeStateless(
    prompt: string,
    timeoutMs: number,
    options?: Partial<AcpTransportOptions>,
): AcpTransportResult {
    return executeAcpxTransport('exec', prompt, timeoutMs, {
        agent: 'pi',
        format: 'json',
        ...options,
    });
}

/**
 * Execute sessioned ACP transport (prompt --session mode).
 *
 * Use only when session semantics are explicitly needed.
 * Session lifecycle must be managed separately (see sessions.ts).
 */
export function executeSessioned(
    prompt: string,
    timeoutMs: number,
    sessionName: string,
    sessionTtlSeconds?: number,
    options?: Partial<AcpTransportOptions>,
): AcpTransportResult {
    const sessionOptions: { sessionName: string; sessionTtlSeconds?: number } = { sessionName };
    if (sessionTtlSeconds !== undefined) {
        sessionOptions.sessionTtlSeconds = sessionTtlSeconds;
    }
    return executeAcpxTransport(
        'prompt',
        prompt,
        timeoutMs,
        {
            agent: 'pi',
            format: 'json',
            ...options,
        },
        sessionOptions,
    );
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────

/**
 * Add transport-level diagnostics to stderr on failure.
 *
 * This helps debugging by including:
 * - Command mode
 * - Timeout settings
 * - Session info (if applicable)
 * - Signal/error info
 */
function addTransportDiagnostics(
    mode: AcpCommandMode,
    result: AcpxQueryResult,
    options: AcpTransportOptions,
    sessionOptions: { sessionName?: string; sessionTtlSeconds?: number } | undefined,
    timeoutMs: number,
): string {
    const baseStderr = result.stderr ?? '';

    // Only add diagnostics on failure
    if (result.ok && !result.timedOut) {
        return baseStderr;
    }

    const commandPreview = [
        'acpx',
        '--format json',
        '--allowed-tools [configured]',
        `--timeout ${Math.max(1, Math.ceil(timeoutMs / 1000))}`,
        '--non-interactive-permissions deny',
        options.agent ?? 'pi',
        mode === 'exec' ? 'exec' : 'prompt [--session <name>]',
        '<prompt>',
    ].join(' ');

    const diagnostics = [
        'acpx transport diagnostics:',
        `mode: ${mode}`,
        `agent: ${options.agent ?? 'pi'}`,
        `timeout_ms: ${timeoutMs}`,
        `timed_out: ${String(result.timedOut ?? false)}`,
        `exit_code: ${result.exitCode}`,
        ...(sessionOptions?.sessionName ? [`session: ${sessionOptions.sessionName}`] : []),
        ...(sessionOptions?.sessionTtlSeconds ? [`session_ttl_seconds: ${sessionOptions.sessionTtlSeconds}`] : []),
        ...(result.signal ? [`signal: ${result.signal}`] : []),
        ...(result.errorMessage ? [`spawn_error: ${result.errorMessage}`] : []),
        `command: ${commandPreview}`,
    ].join('\n');

    if (!baseStderr) {
        return diagnostics;
    }
    if (baseStderr.includes('acpx transport diagnostics:')) {
        return baseStderr;
    }
    return `${baseStderr.replace(/\s+$/u, '')}\n${diagnostics}`;
}
