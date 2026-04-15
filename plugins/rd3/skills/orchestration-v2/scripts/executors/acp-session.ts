/**
 * orchestration-v2 — ACP Session Executor
 *
 * Persistent session ACP execution for scenarios requiring context carry-over.
 *
 * Execution model:
 *   acpx [--options] pi prompt --session <name> [--ttl N] "<prompt>"
 *
 * Key characteristics:
 * - Session: context carries over between calls
 * - Stateful: session lifecycle must be managed
 * - Persistent: session survives individual turn timeouts
 *
 * USE CASES (when session is appropriate):
 * - Human-guided iterative refinement
 * - Deliberately persistent research/coding conversations
 * - Workflows that need context carry-over and are prepared
 *   to manage queue/session semantics
 *
 * DO NOT USE for ordinary pipeline phase execution.
 * Prefer AcpOneshotExecutor for safe bounded execution.
 */

import type { Executor, ExecutorHealth, ExecutionRequest, ExecutionResult } from '../model';
import type { PhaseExecutorAdapter, ExecutionMode } from './adapter';
import { logger } from '../../../../scripts/logger';
import * as transport from '../integrations/acp/transport';
import * as prompts from '../integrations/acp/prompts';
import { DefaultSessionLifecycle, type SessionConfig } from '../integrations/acp/sessions';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'bun';

/**
 * ACP Session Executor.
 *
 * Uses `prompt --session` for sessioned execution with context carry-over.
 *
 * Session management:
 * - Sessions are created on first use
 * - Session TTL can be configured
 * - Stale sessions are detected and recovered
 * - Sessions must be explicitly closed
 *
 * WARNING: Session execution introduces:
 * - Non-deterministic queue behavior
 * - Potential for session stalls
 * - Complexity in lifecycle management
 *
 * Only use when session semantics are explicitly needed.
 */
export class AcpSessionExecutor implements Executor {
    readonly id: string;
    readonly name: string;
    readonly channels: readonly string[];
    readonly maxConcurrency: number;

    private readonly agentName: string;
    private readonly sessionLifecycle: DefaultSessionLifecycle;
    private readonly defaultSessionTtlSeconds: number;
    readonly skillBaseDir: string;
    private readonly projectRoot: string;

    /**
     * Create a session ACP executor.
     *
     * @param agentName - ACP agent name (e.g., "pi", "codex"). Default: "pi"
     * @param defaultSessionTtlSeconds - Default TTL for sessions. Default: 300 (5 min)
     * @param maxConcurrency - Maximum concurrent executions. Default: 1
     * @param skillBaseDir - Base directory for skills (for testing). Default: project/plugins/rd3/skills
     * @param projectRoot - Project root directory (for testing). Default: cwd
     */
    constructor(agentName = 'pi', defaultSessionTtlSeconds = 300, maxConcurrency = 1, skillBaseDir?: string, projectRoot?: string) {
        this.agentName = agentName;
        this.id = `acp-session:${agentName}`;
        this.name = `ACP Session (${agentName})`;
        this.channels = [`${agentName}:session`, `session:${agentName}`];
        this.maxConcurrency = maxConcurrency;
        this.sessionLifecycle = new DefaultSessionLifecycle();
        this.defaultSessionTtlSeconds = defaultSessionTtlSeconds;
        this.skillBaseDir = skillBaseDir ?? resolve(process.cwd(), 'plugins', 'rd3', 'skills');
        this.projectRoot = projectRoot ?? process.cwd();
    }

    /**
     * Execute a phase using session ACP.
     *
     * Resolution order:
     * 1. Check for scripts/run.ts → execute via bun spawn
     * 2. Otherwise → SKILL.md via acpx prompt (sessioned or stateless)
     *
     * Session semantics:
     * - Uses `prompt --session <name>` for execution
     * - Session TTL controls keepalive
     * - Context carries over between calls
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        // Check for scripts/run.ts first
        const runScriptPath = this.resolveRunScript(req.skill);
        if (runScriptPath) {
            return this.executeRunScript(req, runScriptPath, startTime);
        }

        // Session execution REQUIRES a session name
        if (!req.session) {
            logger.warn(
                `[${this.id}] Session executor called without session name. ` +
                    'Falling back to stateless ACP execution. ' +
                    'Set session field in ExecutionRequest for session mode.',
            );
            // Fall back to stateless ACP
            return this.executeViaACP(req, startTime, false);
        }

        return this.executeSessionedACP(req, startTime);
    }

    /**
     * Resolve scripts/run.ts path for a skill.
     */
    private resolveRunScript(skillRef: string): string | null {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            return null;
        }
        const runScriptPath = resolve(this.skillBaseDir, skillName, 'scripts', 'run.ts');
        if (existsSync(runScriptPath)) {
            return runScriptPath;
        }
        return null;
    }

    /**
     * Execute scripts/run.ts via bun spawn.
     */
    private async executeRunScript(req: ExecutionRequest, scriptPath: string, startTime: number): Promise<ExecutionResult> {
        const timeoutMs = req.timeoutMs ?? 30 * 60 * 1000;
        const args = this.buildArgs(req);

        logger.info(`[${this.id}] Executing ${req.skill} via scripts/run.ts`);

        try {
            const result = await this.spawnRunScript(scriptPath, args, timeoutMs, req.phase);
            return {
                ...result,
                durationMs: Date.now() - startTime,
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`[${this.id}] scripts/run.ts execution failed for ${req.skill}: ${message}`);
            return {
                success: false,
                exitCode: 1,
                stderr: message,
                durationMs: Date.now() - startTime,
                timedOut: false,
            };
        }
    }

    /**
     * Spawn a skill script and wait for completion.
     */
    private spawnRunScript(
        scriptPath: string,
        args: string[],
        timeoutMs: number,
        phase?: string,
    ): Promise<Omit<ExecutionResult, 'durationMs'>> {
        return new Promise((resolve) => {
            let timedOut = false;

            const proc = spawn({
                cmd: ['bun', scriptPath, ...args],
                cwd: this.projectRoot,
                stdout: 'pipe',
                stderr: 'pipe',
                env: {
                    ...process.env,
                    ORCH_EXECUTOR: this.id,
                    ORCH_PHASE: phase ?? '',
                },
                ...(timeoutMs > 0 ? { timeout: timeoutMs } : {}),
            });

            const readStream = async (stream: ReadableStream<Uint8Array> | undefined): Promise<string> => {
                if (!stream) return '';
                try {
                    return await new Response(stream).text();
                } catch {
                    return '';
                }
            };

            const stdoutPromise = readStream(proc.stdout as unknown as ReadableStream<Uint8Array> | undefined);
            const stderrPromise = readStream(proc.stderr as unknown as ReadableStream<Uint8Array> | undefined);

            const timeoutHandle =
                timeoutMs > 0
                    ? setTimeout(() => {
                          timedOut = true;
                          proc.kill();
                      }, timeoutMs)
                    : undefined;

            proc.exited.then(async (exitCode: number) => {
                if (timeoutHandle) clearTimeout(timeoutHandle);

                const stdout = await stdoutPromise;
                let stderr = await stderrPromise;

                const success = exitCode === 0 && !timedOut;

                if (timedOut) {
                    logger.warn(`[${this.id}] Execution timed out after ${timeoutMs}ms`);
                    stderr = stderr ? `${stderr}\n[TIMEOUT]` : '[TIMEOUT]';
                }

                resolve({
                    success,
                    exitCode: timedOut ? 124 : exitCode,
                    stdout: stdout.slice(0, 4096),
                    stderr: stderr.slice(0, 4096),
                    timedOut,
                });
            });
        });
    }

    /**
     * Build command arguments for skill execution.
     */
    private buildArgs(req: ExecutionRequest): string[] {
        const args: string[] = [];
        if (req.taskRef) args.push('--task-ref', req.taskRef);
        if (req.phase) args.push('--phase', req.phase);
        if (req.reworkIteration !== undefined) args.push('--rework-iteration', String(req.reworkIteration));
        if (req.payload && typeof req.payload === 'object') {
            for (const [key, value] of Object.entries(req.payload)) {
                if (value !== undefined && value !== null) {
                    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                    args.push(`--${key}`, serialized);
                }
            }
        }
        if (req.feedback) args.push('--feedback', req.feedback);
        return args;
    }

    /**
     * Execute via sessioned ACP transport.
     */
    private async executeSessionedACP(req: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
        const timeoutMs = req.timeoutMs ?? 30 * 60 * 1000;
        const ttlSeconds = req.sessionTtlSeconds ?? this.defaultSessionTtlSeconds;
        const session = req.session as string; // Guard: caller ensures session exists

        try {
            const prompt = prompts.buildPromptFromRequest(req);

            // Ensure session exists
            const sessionConfig: SessionConfig = {
                name: session,
                agent: this.agentName,
                ttlSeconds,
            };
            await this.sessionLifecycle.ensure(sessionConfig);

            // Check session health before execution
            const sessionHealth = await this.sessionLifecycle.status(session);
            if (!sessionHealth.healthy) {
                if (sessionHealth.state === 'stale') {
                    logger.warn(`[${this.id}] Session ${session} is stale, recovering...`);
                    await this.sessionLifecycle.recover(session);
                } else {
                    logger.warn(`[${this.id}] Session ${session} is ${sessionHealth.state}, proceeding anyway...`);
                }
            }

            // Execute via transport with session
            const result = transport.executeSessioned(prompt, timeoutMs, session, ttlSeconds, {
                agent: this.agentName,
            });

            // Update session health based on result
            if (!result.success && result.timedOut) {
                await this.sessionLifecycle.markStale(session);
                logger.warn(`[${this.id}] Session ${session} marked as stale due to timeout`);
            }

            return this.mapResult(result, req, startTime);
        } catch (err) {
            const durationMs = Date.now() - startTime;

            if (session) {
                await this.sessionLifecycle.markStale(session);
            }

            return {
                success: false,
                exitCode: 1,
                stderr: err instanceof Error ? err.message : String(err),
                durationMs,
                timedOut: false,
            };
        }
    }

    /**
     * Fallback to stateless ACP execution.
     */
    private async executeViaACP(req: ExecutionRequest, startTime: number, _sessioned = false): Promise<ExecutionResult> {
        try {
            const prompt = prompts.buildPromptFromRequest(req);
            const result = transport.executeStateless(prompt, req.timeoutMs, { agent: this.agentName });
            return this.mapResult(result, req, startTime);
        } catch (err) {
            const durationMs = Date.now() - startTime;
            return {
                success: false,
                exitCode: 1,
                stderr: err instanceof Error ? err.message : String(err),
                durationMs,
                timedOut: false,
            };
        }
    }

    /**
     * Check executor and session health.
     */
    async healthCheck(): Promise<ExecutorHealth> {
        try {
            const { checkAcpxHealth } = await import('../../../../scripts/libs/acpx-query');
            const health = checkAcpxHealth('acpx');

            return {
                healthy: health.healthy,
                ...(health.error && { message: health.error }),
                lastChecked: new Date(),
            };
        } catch (err) {
            return {
                healthy: false,
                message: err instanceof Error ? err.message : 'Health check failed',
                lastChecked: new Date(),
            };
        }
    }

    /**
     * Map transport result to ExecutionResult.
     */
    private mapResult(
        result: transport.AcpTransportResult,
        req: ExecutionRequest,
        _startTime: number,
    ): ExecutionResult {
        if (!result.success) {
            logger.error(
                `[${this.id}] Phase ${req.phase} failed (exit ${result.exitCode}): ${result.stderr.slice(0, 300)}`,
            );
        } else if (result.timedOut) {
            logger.error(`[${this.id}] Phase ${req.phase} timed out after ${req.timeoutMs}ms`);
        }

        return {
            success: result.success,
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
            ...(result.structured && { structured: result.structured }),
            durationMs: result.durationMs,
            timedOut: result.timedOut,
            ...(result.resources && result.resources.length > 0 && { resources: result.resources }),
        };
    }

    /**
     * Dispose of session resources.
     */
    async dispose(): Promise<void> {
        // In a full implementation, this would close all active sessions
        // For now, the DefaultSessionLifecycle handles cleanup internally
    }
}

// ─── Session-Aware Executor ──────────────────────────────────────────────────

/**
 * Session-aware executor that can switch between stateless and session.
 *
 * This executor:
 * - Uses stateless by default
 * - Switches to session when session name is provided
 * - Useful for gradual migration or testing
 *
 * NOTE: This mixes modes in a single executor. For cleaner separation,
 * prefer using separate AcpOneshotExecutor and AcpSessionExecutor
 * with routing policy to choose between them.
 *
 * @deprecated Use separate executors with routing policy instead
 */
export class AcpSessionAwareExecutor implements PhaseExecutorAdapter {
    readonly id: string;
    readonly name: string;
    readonly executionMode: ExecutionMode = 'stateless'; // Reports stateless as base mode
    readonly channels: readonly string[];

    private readonly session: AcpSessionExecutor;

    constructor(agentName = 'pi') {
        this.id = `acp:${agentName}`;
        this.name = `ACP (${agentName})`;
        this.channels = [agentName, 'acp', `acp:${agentName}`];
        this.session = new AcpSessionExecutor(agentName);
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        return this.session.execute(req);
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return this.session.healthCheck();
    }

    async dispose(): Promise<void> {
        await this.session.dispose();
    }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a session ACP executor for an agent.
 */
export function createSessionExecutor(agentName = 'pi', ttlSeconds = 300, maxConcurrency = 1): Executor {
    return new AcpSessionExecutor(agentName, ttlSeconds, maxConcurrency);
}

/**
 * Default session executor for pi agent.
 */
export const DEFAULT_SESSION_EXECUTOR = new AcpSessionExecutor('pi');
