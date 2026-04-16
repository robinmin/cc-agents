/**
 * orchestration-v2 — ACP Oneshot Executor
 *
 * Bounded one-shot ACP execution for ordinary pipeline phases.
 *
 * Execution model:
 *   acpx [--options] pi exec "<prompt>"
 *
 * Key characteristics:
 * - Oneshot: no session reuse
 * - Bounded: explicit timeout
 * - Tool-first: agent invokes Skill() immediately
 *
 * This is the safe default for pipeline phase execution.
 * Use AcpSessionExecutor only when session semantics are explicitly needed.
 */

import type { Executor, ExecutorHealth, ExecutionRequest, ExecutionResult } from '../model';
import { logger } from '../../../../scripts/logger';
import * as transport from '../integrations/acp/transport';
import * as prompts from '../integrations/acp/prompts';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'bun';

/**
 * ACP Oneshot Executor.
 *
 * Always uses `acpx <agent> exec` for one-shot bounded execution.
 * No session reuse, no context carry-over.
 *
 * This is the recommended executor for ordinary pipeline phase execution.
 */
export class AcpOneshotExecutor implements Executor {
    readonly id: string;
    readonly name: string;
    readonly channels: readonly string[];
    readonly maxConcurrency: number;

    private readonly agentName: string;
    readonly skillBaseDir: string;
    private readonly projectRoot: string;

    /**
     * Create a oneshot ACP executor.
     *
     * @param agentName - ACP agent name (e.g., "pi", "codex"). Default: "pi"
     * @param maxConcurrency - Maximum concurrent executions. Default: 4
     * @param skillBaseDir - Base directory for skills (for testing). Default: project/plugins/rd3/skills
     * @param projectRoot - Project root directory (for testing). Default: cwd
     */
    constructor(agentName = 'pi', maxConcurrency = 4, skillBaseDir?: string, projectRoot?: string) {
        this.agentName = agentName;
        this.id = `acp-oneshot:${agentName}`;
        this.name = `ACP Oneshot (${agentName})`;
        this.channels = [agentName, 'acp', `acp:${agentName}`];
        this.maxConcurrency = maxConcurrency;
        this.skillBaseDir = skillBaseDir ?? resolve(process.cwd(), 'plugins', 'rd3', 'skills');
        this.projectRoot = projectRoot ?? process.cwd();
    }

    /**
     * Execute a phase using oneshot ACP.
     *
     * Resolution order:
     * 1. Check for scripts/run.ts → execute via bun spawn
     * 2. Otherwise → SKILL.md via acpx exec (always ACP, SKILL.md is prompt content)
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        // Check for scripts/run.ts first
        const runScriptPath = this.resolveRunScript(req.skill);
        if (runScriptPath) {
            return this.executeRunScript(req, runScriptPath, startTime);
        }

        // Always use ACP transport (SKILL.md is the prompt content)
        return this.executeViaACP(req, startTime);
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
    private async executeRunScript(
        req: ExecutionRequest,
        scriptPath: string,
        startTime: number,
    ): Promise<ExecutionResult> {
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
     * Execute via ACP transport (SKILL.md fallback).
     */
    private async executeViaACP(req: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
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
     * Check if acpx is available.
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
     * No-op dispose (oneshot has no resources to clean up).
     */
    async dispose(): Promise<void> {
        // Nothing to clean up
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
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a oneshot ACP executor for an agent.
 */
export function createOneshotExecutor(agentName = 'pi', maxConcurrency = 4): Executor {
    return new AcpOneshotExecutor(agentName, maxConcurrency);
}

/**
 * Default oneshot executor for pi agent.
 */
export const DEFAULT_ONESHOT_EXECUTOR = new AcpOneshotExecutor('pi');
