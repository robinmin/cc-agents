/**
 * orchestration-v2 — Subprocess Executor
 *
 * Explicit Bun-subprocess execution using Bun spawn APIs.
 *
 * Design principles:
 * - No ACP/acpx dependency — runs skill scripts directly
 * - Bounded execution with explicit timeout
 * - Normalized ExecutionResult output for consistency with other executors
 * - Suitable as the orchestrator default executor
 *
 * Execution model:
 *   bun run <skill-script> --task-ref <task> --phase <phase> [--options]
 *
 * Use this when a phase needs subprocess isolation or does not support
 * in-process inline execution.
 */

import type { Executor, ExecutorHealth, ExecutionRequest, ExecutionResult } from '../model';
import { logger } from '../../../../scripts/logger';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'bun';
import { executeStateless as executeAcpTransport } from '../integrations/acp/transport';
import { buildPromptFromRequest } from '../integrations/acp/prompts';

// ─── Executor ID Constants ────────────────────────────────────────────────────

export const SUBPROCESS_EXECUTOR_ID = 'subprocess';
export const SUBPROCESS_EXECUTOR_NAME = 'Subprocess Executor (Bun spawn)';

// ─── Subprocess Executor ──────────────────────────────────────────────────────

/**
 * Subprocess executor using Bun spawn APIs.
 *
 * Executes skill scripts directly via Bun subprocess without ACP/acpx where
 * possible. SKILL-only packages fall back to the generic prompt transport so
 * common rd3 presets still have a runnable path.
 *
 * Implements the unified `Executor` interface (not PhaseExecutorAdapter).
 */
export class SubprocessExecutor implements Executor {
    readonly id = SUBPROCESS_EXECUTOR_ID;
    readonly name = SUBPROCESS_EXECUTOR_NAME;
    readonly channels = [SUBPROCESS_EXECUTOR_ID] as const;
    readonly maxConcurrency = 1;

    readonly skillBaseDir: string;
    private readonly projectRoot: string;

    /**
     * Create a subprocess executor.
     *
     * @param skillBaseDir - Base directory for skill scripts (default: project/plugins/rd3/skills)
     * @param projectRoot - Project root directory (default: cwd)
     */
    constructor(skillBaseDir?: string, projectRoot?: string) {
        this.skillBaseDir = skillBaseDir ?? resolve(process.cwd(), 'plugins', 'rd3', 'skills');
        this.projectRoot = projectRoot ?? process.cwd();
    }

    /**
     * Execute a phase using direct Bun subprocess execution.
     *
     * Resolution order for skill script:
     * 1. Check for skill-specific script in plugins/{plugin}/skills/{skill}/scripts/run.ts
     * 2. Fall back to generic skill runner
     *
     * The skill string format is "plugin:skill-name" (e.g., "rd3:code-implement-common").
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();
        const timeoutMs = req.timeoutMs ?? 30 * 60 * 1000; // Default 30 minutes

        if (req.session) {
            return {
                success: false,
                exitCode: 1,
                stderr: 'Subprocess execution does not support --session. Use inline mode for in-process work or an explicit ACP channel/adapter for sessioned execution.',
                durationMs: Date.now() - startTime,
                timedOut: false,
            };
        }

        try {
            const resolved = this.resolveSkillScript(req.skill);
            if (!resolved) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr: `Skill not found: ${req.skill}. No script resolved at expected path.`,
                    durationMs: Date.now() - startTime,
                    timedOut: false,
                };
            }

            // SKILL-only package: use ACP transport fallback
            if (resolved.type === 'skill-only') {
                return this.executeSkillOnly(req);
            }

            // Build the command arguments
            const args = this.buildArgs(req);

            // Execute via Bun spawn
            const result = await this.spawnSkill(resolved.path, args, timeoutMs, req.phase);

            return {
                ...result,
                durationMs: Date.now() - startTime,
            };
        } catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);

            logger.error(`[subprocess] Execution failed for ${req.skill}: ${message}`);

            return {
                success: false,
                exitCode: 1,
                stderr: message,
                durationMs,
                timedOut: false,
            };
        }
    }

    /**
     * Health check for subprocess executor.
     *
     * Always healthy if Bun is available (which it must be for the orchestrator to run).
     */
    async healthCheck(): Promise<ExecutorHealth> {
        try {
            // Check that Bun is available
            const proc = spawn({
                cmd: ['bun', '--version'],
                stdout: 'pipe',
                stderr: 'pipe',
            });

            const exitCode = await proc.exited;

            if (exitCode === 0) {
                return {
                    healthy: true,
                    lastChecked: new Date(),
                };
            }

            return {
                healthy: false,
                message: 'Bun is not available or not working',
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
     * No-op dispose — subprocess executor has no persistent resources.
     */
    async dispose(): Promise<void> {
        // Nothing to clean up
    }

    /**
     * Resolve the skill script path from a skill reference string.
     *
     * Format: "plugin:skill-name" (e.g., "rd3:code-implement-common")
     *
     * Resolution:
     * - scripts/run.ts → { type: 'script', path: ... }
     * - index.ts → { type: 'script', path: ... }
     * - SKILL.md only → { type: 'skill-only' } (fallback to ACP)
     * - not found → null
     */
    resolveSkillScript(skillRef: string): { type: 'script'; path: string } | { type: 'skill-only' } | null {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            logger.warn(`[subprocess] Invalid skill ref format: ${skillRef}`);
            return null;
        }

        // skillBaseDir already includes the plugin path (e.g. plugins/rd3/skills),
        // so only append skillName to avoid double-nesting.
        const scriptPath = resolve(this.skillBaseDir, skillName, 'scripts', 'run.ts');
        if (existsSync(scriptPath)) {
            return { type: 'script', path: scriptPath };
        }

        // Fall back to index.ts
        const indexPath = resolve(this.skillBaseDir, skillName, 'index.ts');
        if (existsSync(indexPath)) {
            return { type: 'script', path: indexPath };
        }

        // Check for SKILL.md (SKILL-only package)
        const skillPath = resolve(this.skillBaseDir, skillName, 'SKILL.md');
        if (existsSync(skillPath)) {
            // SKILL-only package: no runnable script, will use ACP fallback
            return { type: 'skill-only' };
        }

        logger.warn(`[subprocess] Skill not found: ${skillRef}`);
        logger.warn(`[subprocess] Looked in: ${scriptPath}`);
        return null;
    }

    /**
     * Execute a SKILL-only phase via ACP transport fallback.
     *
     * When a skill has no runnable script (SKILL.md only), we delegate to
     * ACP transport to invoke the skill via Skill() tool invocation.
     */
    private async executeSkillOnly(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();
        const timeoutMs = req.timeoutMs ?? 30 * 60 * 1000;

        logger.info(`[subprocess] SKILL-only package ${req.skill} — falling back to ACP transport`);

        try {
            const prompt = buildPromptFromRequest(req);
            const result = executeAcpTransport(prompt, timeoutMs);

            return {
                success: result.success,
                exitCode: result.exitCode,
                stdout: result.stdout?.slice(0, 50_000),
                stderr: result.stderr?.slice(0, 10_000),
                ...(result.structured && { structured: result.structured }),
                durationMs: Date.now() - startTime,
                timedOut: result.timedOut,
                ...(result.resources && result.resources.length > 0 && { resources: result.resources }),
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error(`[subprocess] SKILL-only ACP fallback failed for ${req.skill}: ${message}`);
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
     * Build command arguments for skill execution.
     */
    buildArgs(req: ExecutionRequest): string[] {
        const args: string[] = [];

        // Task reference
        if (req.taskRef) {
            args.push('--task-ref', req.taskRef);
        }

        // Phase name
        if (req.phase) {
            args.push('--phase', req.phase);
        }

        // Rework iteration (if present)
        if (req.reworkIteration !== undefined) {
            args.push('--rework-iteration', String(req.reworkIteration));
        }

        // Payload entries as key=value
        if (req.payload && typeof req.payload === 'object') {
            for (const [key, value] of Object.entries(req.payload)) {
                if (value !== undefined && value !== null) {
                    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                    args.push(`--${key}`, serialized);
                }
            }
        }

        // Feedback for rework
        if (req.feedback) {
            args.push('--feedback', req.feedback);
        }

        return args;
    }

    /**
     * Spawn a skill script and wait for completion.
     *
     * @param scriptPath - Path to the skill script
     * @param args - Command line arguments
     * @param timeoutMs - Timeout in milliseconds
     */
    private async spawnSkill(
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

            const stdoutStream = proc.stdout as unknown as ReadableStream<Uint8Array> | undefined;
            const stderrStream = proc.stderr as unknown as ReadableStream<Uint8Array> | undefined;

            // Single helper to read a subprocess stream. Replaces per-call
            // .catch(() => '') arrows so V8 function coverage counts one
            // function instead of two.
            const readStream = async (stream: ReadableStream<Uint8Array> | undefined): Promise<string> => {
                if (!stream) return '';
                try {
                    return await new Response(stream).text();
                } catch {
                    return '';
                }
            };

            const stdoutPromise = readStream(stdoutStream);
            const stderrPromise = readStream(stderrStream);

            // Manual timeout as backup to Bun's native timeout. The native timeout
            // handles the actual kill, but this ensures timedOut is set synchronously
            // with the kill even if proc.exited fires before the flag is observed.
            const timeoutHandle =
                timeoutMs > 0
                    ? setTimeout(() => {
                          timedOut = true;
                          proc.kill();
                      }, timeoutMs)
                    : undefined;

            proc.exited.then(async (exitCode: number) => {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }

                const stdout = await stdoutPromise;
                let stderr = await stderrPromise;

                const success = exitCode === 0 && !timedOut;

                if (timedOut) {
                    logger.warn(`[subprocess] Execution timed out after ${timeoutMs}ms`);
                    stderr = stderr
                        ? `${stderr}\n[TIMEOUT] Execution exceeded ${timeoutMs}ms`
                        : `[TIMEOUT] Execution exceeded ${timeoutMs}ms`;
                }

                if (!success && !timedOut) {
                    logger.error(`[subprocess] Execution failed with exit code ${exitCode}`);
                    if (stderr) {
                        logger.error(`[subprocess] stderr: ${stderr.slice(0, 500)}`);
                    }
                }

                resolve({
                    success,
                    exitCode: timedOut ? 124 : exitCode, // 124 is standard timeout exit code
                    stdout: stdout.slice(0, 4096),
                    stderr: stderr.slice(0, 4096),
                    timedOut,
                });
            });
        });
    }
}

// ─── Factory Exports ──────────────────────────────────────────────────────────

/**
 * Default subprocess executor instance.
 */
export const DEFAULT_SUBPROCESS_EXECUTOR = new SubprocessExecutor();

/**
 * Create a subprocess executor for a specific skill base directory.
 */
export function createSubprocessExecutor(skillBaseDir?: string, projectRoot?: string): Executor {
    return new SubprocessExecutor(skillBaseDir, projectRoot);
}
