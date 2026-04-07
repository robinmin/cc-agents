/**
 * Unified acpx-based LLM query library.
 *
 * Provides a single, consistent interface for all LLM query operations across the codebase:
 * - Basic LLM queries with prompt input
 * - File-based prompt input
 * - Structured output parsing (JSON extraction from NDJSON and markdown blocks)
 * - Resource metrics extraction (tokens, latency)
 * - Health checks for acpx availability
 * - Automatic LLM CLI initialization
 *
 * Used by:
 * - orchestration-v1/scripts/executors.ts
 * - orchestration-v2/scripts/executors/acp.ts
 * - verification-chain/scripts/methods/llm.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';

/** Tools the pi agent is allowed to use during skill execution. */
export const ALLOWED_TOOLS = 'Skill,Read,Bash,Edit,Write,Glob,grep,WebSearch,WebFetch';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Options for acpx query operations */
export interface AcpxQueryOptions {
    /** Agent to use. Default: ACPX_AGENT env or "claude" */
    agent?: string;
    /** Path to acpx binary. Default: ACPX_BIN env or "acpx" */
    acpxBin?: string;
    /** Output format. Default: "quiet" for basic queries */
    format?: 'text' | 'json' | 'quiet';
    /** Timeout in milliseconds. Default: 300000 (5 min) */
    timeoutMs?: number;
    /** Allowed tools for skill execution */
    allowedTools?: string;
    /** Additional environment variables */
    env?: Record<string, string>;
    /** Parse structured output from JSON code blocks */
    parseStructured?: boolean;
    /** Extract resource metrics from usage events */
    extractMetrics?: boolean;
    /** Read prompt from file instead of string */
    fromFile?: boolean;
}

/** Result from an acpx query */
export interface AcpxQueryResult {
    /** Whether the query succeeded */
    ok: boolean;
    /** Exit code from acpx */
    exitCode: number;
    /** Standard output */
    stdout: string;
    /** Standard error */
    stderr: string;
    /** Duration in milliseconds (optional, may not be present in legacy results) */
    durationMs?: number;
    /** Whether the query timed out (optional, may not be present in legacy results) */
    timedOut?: boolean;
    /** Extracted structured data (if parseStructured enabled) */
    structured?: Record<string, unknown>;
    /** Extracted resource metrics (if extractMetrics enabled) */
    metrics?: ResourceMetrics[];
}

/** Resource usage metrics from LLM API */
export interface ResourceMetrics {
    model_id: string;
    model_provider: string;
    input_tokens: number;
    output_tokens: number;
    wall_clock_ms: number;
    execution_ms: number;
    cache_read_tokens?: number;
    cache_creation_tokens?: number;
    first_token_ms?: number;
}

// ─── Environment Helpers ──────────────────────────────────────────────────────

/** Environment variable for acpx binary path */
const ENV_ACPX_BIN = 'ACPX_BIN';

/** Environment variable for default agent */
const ENV_ACPX_AGENT = 'ACPX_AGENT';

/** Environment variable for LLM CLI command (legacy) */
const ENV_LLM_CLI_COMMAND = 'LLM_CLI_COMMAND';

/** Get environment variable from process.env (the canonical source in Bun/Node). */
export function getEnv(key: string): string | undefined {
    return process.env[key];
}

/**
 * Get the LLM CLI command for legacy scripts that require it.
 * Falls back to auto-detecting 'pi' binary path.
 *
 * This is provided for backward compatibility. New code should use acpx directly.
 */
export function getLegacyLlmCommand(): string | undefined {
    // First check if explicitly set
    const explicit = process.env[ENV_LLM_CLI_COMMAND];
    if (explicit) return explicit;

    // Fallback: detect 'pi' binary path
    try {
        const result = spawnSync('which', ['pi'], { shell: false });
        if (result.status === 0 && result.stdout) {
            const path = result.stdout.toString().trim();
            if (path && existsSync(path)) {
                return path;
            }
        }
    } catch {
        // Fallback: try common paths
    }
    return undefined;
}

/**
 * Initialize LLM_CLI_COMMAND if not already set.
 * Called automatically by queryLlm() if needed.
 */
export function initializeLlmEnv(): void {
    if (getEnv(ENV_LLM_CLI_COMMAND)) return; // Already set

    const piPath = getLegacyLlmCommand();
    if (piPath) {
        process.env[ENV_LLM_CLI_COMMAND] = piPath;
    }
}

// ─── Core Query Functions ────────────────────────────────────────────────────

/**
 * Build acpx command arguments.
 */
function buildAcpxArgs(agent: string, subcommand: string, input: string, options: ResolvedOptions): string[] {
    const args: string[] = [];

    // Command: bin first
    args.push(options.acpxBin);

    // Global options (positioned before agent)
    args.push('--format', options.format);

    if (options.timeoutMs) {
        args.push('--timeout', String(Math.max(1, Math.ceil(options.timeoutMs / 1000))));
    }

    if (options.allowedTools) {
        args.push('--allowed-tools', options.allowedTools);
    }

    // Agent subcommand and input
    args.push(agent, subcommand, input);

    return args;
}

/**
 * Build the command array for an acpx exec query.
 * @deprecated Use queryLlm() instead for most use cases.
 */
export function buildAcpxCommand(prompt: string, options?: AcpxQueryOptions): string[] {
    const resolved = resolveOptions(options);
    return buildAcpxArgs(resolved.agent, 'exec', prompt, resolved);
}

/**
 * Build the command array for an acpx exec query reading from a file.
 * @deprecated Use queryLlmFromFile() instead for most use cases.
 */
export function buildAcpxFileCommand(filePath: string, options?: AcpxQueryOptions): string[] {
    const resolved = resolveOptions(options);
    return buildAcpxArgs(resolved.agent, 'exec', `--file=${filePath}`, resolved);
}

interface ResolvedOptions {
    agent: string;
    acpxBin: string;
    format: 'text' | 'json' | 'quiet';
    timeoutMs: number;
    allowedTools: string;
    parseStructured: boolean;
    extractMetrics: boolean;
    env: Record<string, string>;
}

function resolveOptions(options?: AcpxQueryOptions): ResolvedOptions {
    return {
        agent: options?.agent ?? getEnv(ENV_ACPX_AGENT) ?? 'claude',
        acpxBin: options?.acpxBin ?? getEnv(ENV_ACPX_BIN) ?? 'acpx',
        format: options?.format ?? 'quiet',
        timeoutMs: options?.timeoutMs ?? 300_000,
        allowedTools: options?.allowedTools ?? '',
        parseStructured: options?.parseStructured ?? false,
        extractMetrics: options?.extractMetrics ?? false,
        env: options?.env ?? {},
    };
}

/**
 * Execute an acpx command and return raw result.
 * @param command - Command array to execute
 * @param timeout - Timeout in milliseconds (optional)
 */
export function execAcpx(command: string[], timeout?: number): AcpxQueryResult {
    return execAcpxSync(command, timeout);
}

/**
 * Synchronous version of execAcpx using spawnSync.
 */
/**
 * Execute a command synchronously via Node spawnSync (supports timeout).
 */
export function execAcpxSync(command: string[], timeoutMs?: number): AcpxQueryResult {
    const startTime = Date.now();

    const opts: SpawnSyncOptions = {
        cwd: process.cwd(),
        env: process.env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
    };

    const result = spawnSync(command[0], command.slice(1), opts);

    return {
        ok: result.status === 0,
        exitCode: result.status ?? 1,
        stdout: typeof result.stdout === 'string' ? result.stdout : (result.stdout?.toString() ?? ''),
        stderr: typeof result.stderr === 'string' ? result.stderr : (result.stderr?.toString() ?? ''),
        durationMs: Date.now() - startTime,
        timedOut: result.error?.message.includes('timeout') ?? false,
    };
}

/**
 * Execute an LLM CLI command directly (for legacy scripts that need the LLM CLI binary).
 * Uses spawnSync with stdin piped from file to avoid shell expansion issues.
 *
 * @param command - Command array where [0] is the binary/script path and [1..] are args
 *   (e.g. ['/path/to/pi'] or ['/path/to/mock-llm.sh'])
 * @param promptFile - Path to file containing the prompt (read and piped to stdin)
 * @param timeoutMs - Timeout in milliseconds
 */
export function execLlmCli(command: string[], promptFile: string, timeoutMs = 300_000): AcpxQueryResult {
    const startTime = Date.now();

    const bin = command[0];
    const args = command.slice(1);

    // If the binary is a shell script (.sh) or not executable directly,
    // invoke it through `sh` to avoid ENOENT / permission errors.
    const [effectiveBin, effectiveArgs] = bin.endsWith('.sh') ? ['/bin/sh', [bin, ...args]] : [bin, args];

    const result = spawnSync(effectiveBin, effectiveArgs, {
        cwd: process.cwd(),
        env: process.env,
        input: readFileSync(promptFile, 'utf-8'),
        timeout: timeoutMs,
        encoding: 'utf-8',
    });

    return {
        ok: result.status === 0,
        exitCode: result.status ?? 1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        durationMs: Date.now() - startTime,
        timedOut: result.error?.message.includes('timeout') ?? false,
    };
}

/**
 * Query an LLM via acpx with a prompt string.
 *
 * @param prompt - The prompt to send to the LLM
 * @param options - Query options
 * @returns Query result with optional structured output and metrics
 */
export function queryLlm(prompt: string, options?: AcpxQueryOptions): AcpxQueryResult {
    const resolved = resolveOptions(options);
    const args = buildAcpxArgs(resolved.agent, 'exec', prompt, resolved);
    // buildAcpxArgs already includes the acpx bin as the first element
    const result = execAcpxSync(args, resolved.timeoutMs);

    if (resolved.parseStructured || resolved.extractMetrics) {
        const parsed = parseOutput(result.stdout, resolved.parseStructured, resolved.extractMetrics);
        return { ...result, ...parsed };
    }

    return result;
}

/**
 * Query an LLM via acpx reading prompt from a file.
 *
 * @param filePath - Path to file containing the prompt
 * @param options - Query options
 * @returns Query result with optional structured output and metrics
 */
export function queryLlmFromFile(filePath: string, options?: AcpxQueryOptions): AcpxQueryResult {
    const resolved = resolveOptions(options);
    const args = buildAcpxArgs(resolved.agent, 'exec', `--file=${filePath}`, resolved);
    // buildAcpxArgs already includes the acpx bin as the first element
    const result = execAcpxSync(args, resolved.timeoutMs);

    if (resolved.parseStructured || resolved.extractMetrics) {
        const parsed = parseOutput(result.stdout, resolved.parseStructured, resolved.extractMetrics);
        return { ...result, ...parsed };
    }

    return result;
}

// ─── Testing Exports ────────────────────────────────────────────────────────

/**
 * Resolve options with defaults and env var fallbacks.
 * Exported for testing purposes.
 */
export { resolveOptions };

/**
 * Build acpx command arguments.
 * Exported for testing purposes.
 */
export { buildAcpxArgs };

// ─── Output Parsing ──────────────────────────────────────────────────────────

/**
 * Parse acpx output for structured results and resource metrics.
 *
 * Handles:
 * - NDJSON events (usage, structured, text, tool, done)
 * - Markdown ```json code blocks
 * - Balanced JSON validation
 */
export function parseOutput(
    output: string,
    extractStructured = true,
    extractMetrics = true,
): { structured?: Record<string, unknown>; metrics?: ResourceMetrics[] } {
    let structured: Record<string, unknown> | undefined;
    const metrics: ResourceMetrics[] = [];

    // 1. First pass: extract NDJSON events
    for (const line of output.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
            const event = JSON.parse(trimmed) as Record<string, unknown>;

            if (extractMetrics && event.type === 'usage' && typeof event.usage === 'object') {
                const usage = event.usage as Record<string, unknown>;
                metrics.push({
                    model_id: String(usage.model_id ?? ''),
                    model_provider: String(usage.model_provider ?? ''),
                    input_tokens: Math.floor(Number(usage.input_tokens ?? 0)) || 0,
                    output_tokens: Math.floor(Number(usage.output_tokens ?? 0)) || 0,
                    wall_clock_ms: Math.floor(Number(usage.wall_clock_ms ?? 0)) || 0,
                    execution_ms: Math.floor(Number(usage.execution_ms ?? 0)) || 0,
                    ...(usage.cache_read_tokens != null && {
                        cache_read_tokens: Math.floor(Number(usage.cache_read_tokens)) || 0,
                    }),
                    ...(usage.cache_creation_tokens != null && {
                        cache_creation_tokens: Math.floor(Number(usage.cache_creation_tokens)) || 0,
                    }),
                    ...(usage.first_token_ms != null && {
                        first_token_ms: Math.floor(Number(usage.first_token_ms)) || 0,
                    }),
                });
            } else if (extractStructured && event.type === 'structured' && typeof event.data === 'object') {
                structured = event.data as Record<string, unknown>;
            }
        } catch {
            // Not valid JSON - try markdown block extraction below
        }
    }

    // 2. Second pass: extract JSON from markdown code blocks
    if (extractStructured && structured === undefined) {
        structured = extractFromJsonBlock(output);
    }

    return {
        ...(structured !== undefined && { structured }),
        ...(metrics.length > 0 && { metrics }),
    };
}

/**
 * Extract JSON from markdown ```json code blocks.
 */
export function extractFromJsonBlock(output: string): Record<string, unknown> | undefined {
    const fenceOpen = '```json';
    const fenceClose = '```';

    const openIdx = output.indexOf(fenceOpen);
    if (openIdx === -1) return undefined;

    const contentStart = openIdx + fenceOpen.length;
    const closeIdx = output.indexOf(fenceClose, contentStart);
    if (closeIdx === -1) return undefined;

    const raw = output.slice(contentStart, closeIdx);
    const candidate = extractFirstBalancedJsonObject(raw);

    if (!candidate.startsWith('{') || !candidate.endsWith('}')) {
        return undefined;
    }

    // Validate JSON is complete (balanced braces)
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < candidate.length; i++) {
        const ch = candidate[i] as string;
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
    }
    if (depth !== 0) return undefined;

    try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        if (Object.keys(parsed).length > 0) return parsed;
    } catch {
        // Not valid JSON
    }
    return undefined;
}

/**
 * Extract the first balanced JSON object from a string.
 */
export function extractFirstBalancedJsonObject(s: string): string {
    const trimmed = s.trimStart();
    const start = trimmed.indexOf('{');
    if (start === -1) return '';

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < trimmed.length; i++) {
        const ch = trimmed[i] as string;
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') {
            depth--;
            if (depth === 0) return trimmed.slice(start, i + 1);
        }
    }

    return '';
}

// ─── Slash Command Execution ─────────────────────────────────────────────────

/**
 * Supported execution channels for slash command execution.
 * These are the channels that work reliably via acpx exec.
 */
export type ExecutionChannel = 'claude-code' | 'pi' | 'codex' | 'gemini' | 'kilocode' | 'openclaw' | 'opencode';

/**
 * Validates if a channel name is a supported ExecutionChannel.
 */
export function isExecutionChannel(channel: string): channel is ExecutionChannel {
    return ['claude-code', 'pi', 'codex', 'gemini', 'kilocode', 'openclaw', 'opencode'].includes(channel);
}

/**
 * Options for runSlashCommand.
 */
export interface RunSlashCommandOptions {
    /** Execution channel (agent). Default: 'claude-code' */
    channel?: ExecutionChannel;
    /** Timeout in milliseconds. Default: 300000 (5 min) */
    timeoutMs?: number;
    /** Allowed tools for skill execution. Default: ALLOWED_TOOLS */
    allowedTools?: string;
}

/**
 * Translation map: transforms Claude Code style slash commands to channel-specific formats.
 *
 * Claude Code style: /rd3:dev-fixall "args"
 * - claude-code: /rd3:dev-fixall "args" (pass through)
 * - pi:          /skill:rd3-dev-fixall "args" (replace rd3: with skill:rd3-)
 * - codex:       $rd3-dev-fixall "args" (replace rd3: with $rd3-, remove leading /)
 * - others:      pass through (unverified but assume same as claude-code)
 */
const SLASH_COMMAND_TRANSFORMS: Record<ExecutionChannel, (cmd: string) => string> = {
    'claude-code': (cmd: string) => cmd,
    'pi': (cmd: string) => cmd.replace('rd3:', 'skill:rd3-'),
    'codex': (cmd: string) => cmd.replace('rd3:', '$rd3-').replace(/^\//, ''),
    'gemini': (cmd: string) => cmd,
    'kilocode': (cmd: string) => cmd,
    'openclaw': (cmd: string) => cmd,
    'opencode': (cmd: string) => cmd,
};

/**
 * List of valid execution channels for error messages.
 */
const VALID_CHANNELS: ExecutionChannel[] = [
    'claude-code',
    'pi',
    'codex',
    'gemini',
    'kilocode',
    'openclaw',
    'opencode',
];

/**
 * Execute a slash command via acpx on a specified channel.
 *
 * Transforms Claude Code style slash commands to channel-specific formats:
 * - claude-code: /rd3:dev-fixall → /rd3:dev-fixall (pass through)
 * - pi:          /rd3:dev-fixall → /skill:rd3-dev-fixall
 * - codex:       /rd3:dev-fixall → $rd3-dev-fixall
 * - others:      /rd3:dev-fixall → /rd3:dev-fixall (pass through)
 *
 * @param slashCommand - Claude Code style slash command (e.g., "/rd3:dev-fixall \"bun run test\"")
 * @param options - Execution options (channel, timeout, allowedTools)
 * @returns AcpxQueryResult with stdout/stderr/exitCode
 * @throws TypeError if channel is invalid or slashCommand is empty
 */
export function runSlashCommand(slashCommand: string, options?: RunSlashCommandOptions): AcpxQueryResult {
    // Validate slash command
    if (!slashCommand || slashCommand.trim().length === 0) {
        return {
            ok: false,
            exitCode: 1,
            stdout: '',
            stderr: 'Empty slash command provided',
            durationMs: 0,
            timedOut: false,
        };
    }

    // Resolve channel with default
    const channel: ExecutionChannel = options?.channel ?? 'claude-code';

    // Validate channel
    if (!isExecutionChannel(channel)) {
        const error = new TypeError(
            `Invalid execution channel: "${channel}". Valid channels: ${VALID_CHANNELS.join(', ')}`,
        );
        return {
            ok: false,
            exitCode: 1,
            stdout: '',
            stderr: error.message,
            durationMs: 0,
            timedOut: false,
        };
    }

    // Transform command for channel
    const transformedCommand = SLASH_COMMAND_TRANSFORMS[channel](slashCommand.trim());

    // Build acpx exec options
    const execOptions: AcpxQueryOptions = {
        agent: channel,
        format: 'quiet',
        timeoutMs: options?.timeoutMs ?? 300_000,
        allowedTools: options?.allowedTools ?? ALLOWED_TOOLS,
    };

    // Execute via queryLlm
    return queryLlm(transformedCommand, execOptions);
}

/**
 * Get the transformed slash command for a channel without executing.
 * Useful for --dry-run preview.
 *
 * @param slashCommand - Claude Code style slash command
 * @param channel - Target execution channel
 * @returns Transformed slash command string
 * @throws TypeError if channel is invalid
 */
export function transformSlashCommand(slashCommand: string, channel: ExecutionChannel): string {
    if (!isExecutionChannel(channel)) {
        throw new TypeError(
            `Invalid execution channel: "${channel}". Valid channels: ${VALID_CHANNELS.join(', ')}`,
        );
    }
    return SLASH_COMMAND_TRANSFORMS[channel](slashCommand.trim());
}

// ─── Health Check ────────────────────────────────────────────────────────────

/** Health check result for acpx */
export interface AcpxHealth {
    healthy: boolean;
    version?: string;
    error?: string;
}

/**
 * Check if acpx is available and working.
 */
export function checkAcpxHealth(acpxBin?: string): AcpxHealth {
    const bin = acpxBin ?? getEnv(ENV_ACPX_BIN) ?? 'acpx';

    try {
        const result = spawnSync(bin, ['--version'], { shell: false });
        if (result.status === 0) {
            const version = new TextDecoder().decode(result.stdout).trim();
            return { healthy: true, version };
        }
        return {
            healthy: false,
            error: `acpx exited with code ${result.status}`,
        };
    } catch (err) {
        return {
            healthy: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}
