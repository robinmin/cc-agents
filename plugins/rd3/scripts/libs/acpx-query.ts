/**
 * Unified acpx-based LLM query library with Antigravity (agy) backend support.
 *
 * Provides a single, consistent interface for all LLM query operations across the codebase:
 * - Basic LLM queries with prompt input
 * - File-based prompt input
 * - Structured output parsing (JSON extraction from NDJSON and markdown blocks)
 * - Resource metrics extraction (tokens, latency)
 * - Health checks for acpx/agy availability
 * - Backend selection via BACKEND environment variable (default: 'acpx')
 *
 * Backend Selection:
 * - BACKEND=acpx (default): Uses acpx CLI for agent execution
 * - BACKEND=antigravity: Uses agy CLI (VSCode Antigravity) for chat execution
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
    /** Signal that terminated the child process, if any */
    signal?: string;
    /** spawnSync/process-level error message, if any */
    errorMessage?: string;
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

/** Environment variable for backend selection: 'acpx' or 'antigravity' */
const ENV_BACKEND = 'BACKEND';

/** Supported backends */
export type Backend = 'acpx' | 'antigravity';

/**
 * Get the current backend selection.
 * Defaults to 'acpx' if BACKEND env var is not set or invalid.
 */
export function getBackend(): Backend {
    const backend = getEnv(ENV_BACKEND);
    if (backend === 'antigravity' || backend === 'agy') {
        return 'antigravity';
    }
    return 'acpx';
}

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

// ─── Antigravity (agy) Adapter ───────────────────────────────────────────────

/** Environment variable for agy binary path */
const ENV_AGY_BIN = 'AGY_BIN';

/** Default path for agy binary */
const DEFAULT_AGY_BIN = 'agy';

/**
 * Get the agy binary path from options or environment.
 */
function getAgyBin(options?: AcpxQueryOptions): string {
    return options?.acpxBin ?? getEnv(ENV_AGY_BIN) ?? DEFAULT_AGY_BIN;
}

/**
 * Build agy chat command arguments.
 *
 * Maps acpx-style query to agy chat:
 * - acpx: acpx <agent> exec <prompt>
 * - agy: agy chat [--mode <mode>] <prompt>
 *
 * @param prompt - The prompt to send
 * @param options - Query options
 * @returns Command array [bin, arg1, arg2, ...]
 */
function buildAgyChatArgs(prompt: string, options?: AcpxQueryOptions): string[] {
    const agyBin = getAgyBin(options);
    const args: string[] = [agyBin, 'chat'];

    // Map agent to agy mode if specified
    const agent = options?.agent ?? getEnv(ENV_ACPX_AGENT);
    if (agent && agent !== 'claude') {
        // Map known agents to agy modes
        const modeMap: Record<string, string> = {
            pi: 'agent',
            codex: 'agent',
            openclaw: 'agent',
            opencode: 'agent',
            gemini: 'agent',
            kilocode: 'agent',
        };
        const mode = modeMap[agent] ?? 'agent';
        args.push('--mode', mode);
    }

    // Add prompt
    args.push(prompt);

    return args;
}

/**
 * Execute an agy chat command and return result.
 * Wraps the agy CLI to provide a compatible interface with acpx.
 *
 * @param command - Command array [bin, arg1, arg2, ...]
 * @param timeoutMs - Timeout in milliseconds
 * @returns AcpxQueryResult compatible result
 */
function execAgyChat(command: string[], timeoutMs?: number): AcpxQueryResult {
    const startTime = Date.now();

    const opts: SpawnSyncOptions = {
        cwd: process.cwd(),
        env: process.env as NodeJS.ProcessEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...(timeoutMs ? { timeout: timeoutMs } : {}),
    };

    const result = spawnSync(command[0], command.slice(1), opts);
    return normalizeSpawnSyncResult(result, startTime);
}

/**
 * Query an LLM via agy chat.
 *
 * This is the Antigravity backend implementation that wraps the agy CLI.
 *
 * @param prompt - The prompt to send
 * @param options - Query options
 * @returns Query result
 */
export function queryLlmAgy(prompt: string, options?: AcpxQueryOptions): AcpxQueryResult {
    const resolved = resolveOptions(options);
    const args = buildAgyChatArgs(prompt, resolved);

    const result = execAgyChat(args, resolved.timeoutMs);

    // agy chat output is plain text, not structured
    // Parse if requested but note agy doesn't emit JSON events
    if (resolved.parseStructured || resolved.extractMetrics) {
        const parsed = parseOutput(result.stdout, resolved.parseStructured, resolved.extractMetrics);
        return { ...result, ...parsed };
    }

    return result;
}

/**
 * Query an LLM via agy chat with prompt from file.
 *
 * @param filePath - Path to file containing the prompt
 * @param options - Query options
 * @returns Query result
 */
export function queryLlmFromFileAgy(filePath: string, options?: AcpxQueryOptions): AcpxQueryResult {
    // agy chat doesn't support --file flag like acpx
    // Read file and pass content directly
    try {
        const content = readFileSync(filePath, 'utf-8');
        return queryLlmAgy(content, options);
    } catch (err) {
        return {
            ok: false,
            exitCode: 1,
            stdout: '',
            stderr: err instanceof Error ? `Failed to read file: ${err.message}` : 'Failed to read file',
            durationMs: 0,
            timedOut: false,
        };
    }
}

/**
 * Health check for agy CLI.
 */
export function checkAgyHealth(agyBin?: string): { healthy: boolean; version?: string; error?: string } {
    const bin = agyBin ?? getEnv(ENV_AGY_BIN) ?? DEFAULT_AGY_BIN;

    try {
        const result = spawnSync(bin, ['--version'], { shell: false });
        if (result.status === 0) {
            const version = new TextDecoder().decode(result.stdout).trim();
            return { healthy: true, version };
        }
        return {
            healthy: false,
            error: `agy exited with code ${result.status}`,
        };
    } catch (err) {
        return {
            healthy: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        };
    }
}

/**
 * Run slash command via agy.
 *
 * Note: agy does not support slash commands directly.
 * This function returns a graceful "not supported" response.
 *
 * @param slashCommand - Claude Code style slash command
 * @param _options - Execution options (ignored for agy)
 * @returns Error result indicating not supported
 */
export function runSlashCommandAgy(_slashCommand: string, _options?: RunSlashCommandOptions): AcpxQueryResult {
    return {
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'Slash commands are not supported by agy. Use acpx backend for slash command execution.',
        durationMs: 0,
        timedOut: false,
    };
}

/**
 * Get transformed slash command preview for agy.
 *
 * Returns a message indicating slash commands are not supported.
 */
export function transformSlashCommandAgy(_slashCommand: string): string {
    return 'Slash commands are not supported by agy';
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
    return normalizeSpawnSyncResult(result, startTime);
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
    return normalizeSpawnSyncResult(result, startTime);
}

function normalizeSpawnSyncResult(result: ReturnType<typeof spawnSync>, startTime: number): AcpxQueryResult {
    const stdout = typeof result.stdout === 'string' ? result.stdout : (result.stdout?.toString() ?? '');
    const stderr = typeof result.stderr === 'string' ? result.stderr : (result.stderr?.toString() ?? '');
    const errorMessage = result.error instanceof Error ? result.error.message : undefined;
    const signal = result.signal ?? undefined;

    return {
        ok: result.status === 0,
        exitCode: result.status ?? 1,
        stdout,
        stderr: appendProcessDiagnostics(stderr, errorMessage, signal),
        durationMs: Date.now() - startTime,
        timedOut: isSpawnTimeout(result.error),
        ...(signal && { signal }),
        ...(errorMessage && { errorMessage }),
    };
}

function appendProcessDiagnostics(stderr: string, errorMessage?: string, signal?: string): string {
    const diagnostics: string[] = [];
    if (errorMessage) {
        diagnostics.push(`spawn_error: ${errorMessage}`);
    }
    if (signal) {
        diagnostics.push(`signal: ${signal}`);
    }
    if (diagnostics.length === 0) {
        return stderr;
    }
    if (!stderr) {
        return diagnostics.join('\n');
    }
    return `${stderr.replace(/\s+$/u, '')}\n${diagnostics.join('\n')}`;
}

function isSpawnTimeout(error: Error | undefined): boolean {
    if (!error) {
        return false;
    }
    const message = error.message.toLowerCase();
    const code =
        typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code?: unknown }).code)
            : '';
    return code === 'ETIMEDOUT' || message.includes('timed out') || message.includes('timeout');
}

/**
 * Query an LLM via acpx or agy with a prompt string.
 *
 * Backend selection is determined by the BACKEND environment variable:
 * - BACKEND=acpx (default): Uses acpx CLI
 * - BACKEND=antigravity: Uses agy CLI (Antigravity/VSCode)
 *
 * @param prompt - The prompt to send to the LLM
 * @param options - Query options
 * @returns Query result with optional structured output and metrics
 */
export function queryLlm(prompt: string, options?: AcpxQueryOptions): AcpxQueryResult {
    const backend = getBackend();

    if (backend === 'antigravity') {
        return queryLlmAgy(prompt, options);
    }

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
 * Query an LLM via acpx or agy reading prompt from a file.
 *
 * Backend selection is determined by the BACKEND environment variable:
 * - BACKEND=acpx (default): Uses acpx CLI
 * - BACKEND=antigravity: Uses agy CLI (reads file and passes content)
 *
 * @param filePath - Path to file containing the prompt
 * @param options - Query options
 * @returns Query result with optional structured output and metrics
 */
export function queryLlmFromFile(filePath: string, options?: AcpxQueryOptions): AcpxQueryResult {
    const backend = getBackend();

    if (backend === 'antigravity') {
        return queryLlmFromFileAgy(filePath, options);
    }

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

/**
 * Build agy chat command arguments.
 * Exported for testing purposes.
 */
export { buildAgyChatArgs };

/**
 * Execute an agy chat command.
 * Exported for testing purposes.
 */
export { execAgyChat };

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
    /**
     * Session name for persistent session execution.
     * If provided, uses `prompt --session <name>` for session reuse.
     * If not provided, uses `exec` (one-shot, no session reuse).
     */
    session?: string;
    /**
     * Session TTL in seconds. Only used when session is provided.
     * Keeps the session alive for this duration after the command completes.
     * Default: 300 (5 minutes).
     */
    sessionTtlSeconds?: number;
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
    pi: (cmd: string) => cmd.replace('rd3:', 'skill:rd3-'),
    codex: (cmd: string) => cmd.replace('rd3:', '$rd3-').replace(/^\//, ''),
    gemini: (cmd: string) => cmd,
    kilocode: (cmd: string) => cmd,
    openclaw: (cmd: string) => cmd,
    opencode: (cmd: string) => cmd,
};

/**
 * List of valid execution channels for error messages.
 */
const VALID_CHANNELS: ExecutionChannel[] = ['claude-code', 'pi', 'codex', 'gemini', 'kilocode', 'openclaw', 'opencode'];

/**
 * Execute a slash command via acpx or agy on a specified channel.
 *
 * Transforms Claude Code style slash commands to channel-specific formats:
 * - claude-code: /rd3:dev-fixall → /rd3:dev-fixall (pass through)
 * - pi:          /rd3:dev-fixall → /skill:rd3-dev-fixall
 * - codex:       /rd3:dev-fixall → $rd3-dev-fixall
 * - others:      /rd3:dev-fixall → /rd3:dev-fixall (pass through)
 *
 * If options.session is provided, uses persistent session mode (prompt --session <name>).
 * Otherwise uses one-shot mode (exec).
 *
 * Note: When using BACKEND=antigravity, slash commands are not supported
 * and will return an error indicating this limitation.
 *
 * @param slashCommand - Claude Code style slash command (e.g., "/rd3:dev-fixall \"bun run test\"")
 * @param options - Execution options (channel, timeout, allowedTools, session, sessionTtlSeconds)
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

    // Check backend selection - agy doesn't support slash commands
    const backend = getBackend();
    if (backend === 'antigravity') {
        return runSlashCommandAgy(slashCommand, options);
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
    const sessionName = options?.session;
    const timeoutMs = options?.timeoutMs ?? 300_000;

    // Build acpx options
    const acpxOptions: AcpxQueryOptions = {
        agent: channel,
        format: 'quiet',
        timeoutMs,
        allowedTools: options?.allowedTools ?? ALLOWED_TOOLS,
    };

    // If session is provided, use prompt --session mode for session reuse
    if (sessionName) {
        return queryLlmSession(sessionName, transformedCommand, acpxOptions, options?.sessionTtlSeconds);
    }

    // Otherwise use exec mode (one-shot)
    return queryLlm(transformedCommand, acpxOptions);
}

/**
 * Execute a prompt via acpx using a persistent session.
 * This enables session reuse for faster subsequent calls.
 *
 * @param sessionName - Session name or ID to use
 * @param prompt - The prompt to send
 * @param options - acpx options
 * @param ttlSeconds - Session TTL in seconds (keeps session alive)
 * @returns AcpxQueryResult with stdout/stderr/exitCode
 */
function queryLlmSession(
    sessionName: string,
    prompt: string,
    options: AcpxQueryOptions,
    ttlSeconds?: number,
): AcpxQueryResult {
    const timeout = options.timeoutMs ?? 300_000;
    const acpxBin = options.acpxBin ?? getEnv('ACPX_BIN') ?? 'acpx';
    const agent = options.agent ?? 'claude';

    // Build prompt command: acpx --format quiet [--timeout N] [--ttl N] <agent> prompt --session <name> <prompt>
    const args: string[] = [acpxBin, '--format', 'quiet'];
    if (timeout < 86400_000) {
        args.push('--timeout', String(Math.ceil(timeout / 1000)));
    }
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
        args.push('--ttl', String(ttlSeconds));
    }
    args.push(agent, 'prompt', '--session', sessionName, prompt);
    return execAcpxSync(args, timeout);
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
        throw new TypeError(`Invalid execution channel: "${channel}". Valid channels: ${VALID_CHANNELS.join(', ')}`);
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

/**
 * Health check result for both backends.
 */
export interface HealthCheck {
    backend: Backend;
    healthy: boolean;
    version?: string | undefined;
    error?: string | undefined;
}

/**
 * Check health of the current backend.
 *
 * Uses the backend selected by BACKEND environment variable:
 * - BACKEND=acpx (default): Checks acpx health
 * - BACKEND=antigravity: Checks agy health
 *
 * @param options - Optional binary paths
 * @returns Health check result
 */
export function checkHealth(options?: { acpxBin?: string; agyBin?: string }): HealthCheck {
    const backend = getBackend();

    if (backend === 'antigravity') {
        const health = checkAgyHealth(options?.agyBin);
        return {
            backend: 'antigravity',
            healthy: health.healthy,
            version: health.version,
            error: health.error,
        };
    }

    const health = checkAcpxHealth(options?.acpxBin);
    return {
        backend: 'acpx',
        healthy: health.healthy,
        version: health.version,
        error: health.error,
    };
}

/**
 * Unified health check for both backends.
 *
 * @returns Object with health status for both acpx and agy
 */
export function checkAllBackendsHealth(): {
    acpx: AcpxHealth;
    agy: { healthy: boolean; version?: string | undefined; error?: string | undefined };
} {
    return {
        acpx: checkAcpxHealth(),
        agy: checkAgyHealth(),
    };
}
