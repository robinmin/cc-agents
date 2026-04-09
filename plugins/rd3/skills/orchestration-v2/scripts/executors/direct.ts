/**
 * orchestration-v2 — Direct Executor Adapter
 *
 * True local/direct execution using Bun spawn APIs.
 * This is the default executor for ordinary pipeline phases.
 *
 * Design principles:
 * - No ACP/acpx dependency — runs skill scripts directly
 * - Bounded execution with explicit timeout
 * - Normalized ExecutionResult output for consistency with other adapters
 * - Suitable as the orchestrator default executor
 *
 * Execution model:
 *   bun run <skill-script> --task-ref <task> --phase <phase> [--options]
 *
 * This adapter replaces the misleading ACP-backed "local" executor.
 */

import type { PhaseExecutorAdapter, ExecutorHealth } from './adapter';
import type { ExecutionRequest, ExecutionResult, ExecutorCapabilities } from '../model';
import { logger } from '../../../../scripts/logger';
import { resolve } from 'node:path';
import { spawn } from 'bun';

// ─── Adapter ID Constants ─────────────────────────────────────────────────────

export const DIRECT_ADAPTER_ID = 'direct';
export const DIRECT_ADAPTER_NAME = 'Direct Executor (Bun spawn)';

// ─── Direct Executor Adapter ──────────────────────────────────────────────────

/**
 * Direct executor adapter using Bun spawn APIs.
 *
 * Executes skill scripts directly via Bun subprocess without ACP/acpx.
 * This is the default orchestrator executor for ordinary phase execution.
 */
export class DirectExecutor implements PhaseExecutorAdapter {
    readonly id = DIRECT_ADAPTER_ID;
    readonly name = DIRECT_ADAPTER_NAME;
    readonly executionMode: 'stateless' = 'stateless';
    readonly channels = [DIRECT_ADAPTER_ID, 'direct', 'local'] as const;
    readonly capabilities: ExecutorCapabilities = {
        parallel: false, // Direct execution is sequential
        streaming: false, // We capture stdout/stderr after completion
        structuredOutput: false, // Direct executor doesn't support structured output
        channels: [DIRECT_ADAPTER_ID, 'direct', 'local'],
        maxConcurrency: 1,
    };

    private readonly skillBaseDir: string;
    private readonly projectRoot: string;

    /**
     * Create a direct executor.
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

        try {
            const skillScript = this.resolveSkillScript(req.skill);
            if (!skillScript) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr: `Skill not found: ${req.skill}. No script resolved at expected path.`,
                    durationMs: Date.now() - startTime,
                    timedOut: false,
                };
            }

            // Build the command arguments
            const args = this.buildArgs(req);

            // Execute via Bun spawn
            const result = await this.spawnSkill(skillScript, args, timeoutMs);

            return {
                ...result,
                durationMs: Date.now() - startTime,
            };
        } catch (err) {
            const durationMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);

            logger.error(`[direct] Execution failed for ${req.skill}: ${message}`);

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
     * Health check for direct executor.
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
     * No-op dispose — direct executor has no persistent resources.
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
     * - plugins/{plugin}/skills/{skill}/scripts/run.ts
     * - plugins/{plugin}/skills/{skill}/index.ts
     */
    private resolveSkillScript(skillRef: string): string | null {
        const [plugin, skillName] = skillRef.split(':');
        if (!plugin || !skillName) {
            logger.warn(`[direct] Invalid skill ref format: ${skillRef}`);
            return null;
        }

        // Try scripts/run.ts first (standard skill entry point)
        const scriptPath = resolve(this.skillBaseDir, plugin, skillName, 'scripts', 'run.ts');
        const { existsSync } = require('node:fs');
        if (existsSync(scriptPath)) {
            return scriptPath;
        }

        // Fall back to index.ts
        const indexPath = resolve(this.skillBaseDir, plugin, skillName, 'index.ts');
        if (existsSync(indexPath)) {
            return indexPath;
        }

        // Fall back to main skill file
        const skillPath = resolve(this.skillBaseDir, plugin, skillName, 'SKILL.md');
        if (existsSync(skillPath)) {
            // For SKILL.md files, we need to use the skill runner
            return resolve(this.skillBaseDir, plugin, skillName);
        }

        logger.warn(`[direct] Skill script not found for ${skillRef}`);
        logger.warn(`[direct] Looked in: ${scriptPath}`);
        return null;
    }

    /**
     * Build command arguments for skill execution.
     */
    private buildArgs(req: ExecutionRequest): string[] {
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
    ): Promise<Omit<ExecutionResult, 'durationMs'>> {
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const proc = spawn({
                cmd: ['bun', scriptPath, ...args],
                cwd: this.projectRoot,
                stdout: 'pipe',
                stderr: 'pipe',
                env: {
                    ...process.env,
                    ORCH_EXECUTOR: this.id,
                    ORCH_PHASE: args[2] ?? '', // phase arg if present
                },
                ...(timeoutMs > 0 ? { timeout: timeoutMs } : {}),
            });

            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                proc.kill();
            }, timeoutMs);

            // Collect stdout - proc.stdout is a ReadableStream<Uint8Array>
            const stdoutStream = proc.stdout as unknown as ReadableStream<Uint8Array> | undefined;
            if (stdoutStream) {
                const reader = stdoutStream.getReader();
                reader
                    .read()
                    .then(async function readChunk(): Promise<void> {
                        const { done, value } = await reader.read();
                        if (done) return;
                        stdout += new TextDecoder().decode(value);
                        readChunk();
                    })
                    .catch(() => {}); // Ignore read errors
            }

            // Collect stderr
            const stderrStream = proc.stderr as unknown as ReadableStream<Uint8Array> | undefined;
            if (stderrStream) {
                const reader = stderrStream.getReader();
                reader
                    .read()
                    .then(async function readChunk(): Promise<void> {
                        const { done, value } = await reader.read();
                        if (done) return;
                        stderr += new TextDecoder().decode(value);
                        readChunk();
                    })
                    .catch(() => {}); // Ignore read errors
            }

            // Wait for completion
            proc.exited.then((exitCode: number) => {
                clearTimeout(timeoutHandle);

                const success = exitCode === 0 && !timedOut;

                if (timedOut) {
                    logger.warn(`[direct] Execution timed out after ${timeoutMs}ms`);
                    stderr = stderr
                        ? `${stderr}\n[TIMEOUT] Execution exceeded ${timeoutMs}ms`
                        : `[TIMEOUT] Execution exceeded ${timeoutMs}ms`;
                }

                if (!success && !timedOut) {
                    logger.error(`[direct] Execution failed with exit code ${exitCode}`);
                    if (stderr) {
                        logger.error(`[direct] stderr: ${stderr.slice(0, 500)}`);
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
 * Default direct executor instance.
 */
export const DEFAULT_DIRECT_EXECUTOR = new DirectExecutor();

/**
 * Create a direct executor for a specific skill base directory.
 */
export function createDirectExecutor(skillBaseDir?: string, projectRoot?: string): PhaseExecutorAdapter {
    return new DirectExecutor(skillBaseDir, projectRoot);
}
