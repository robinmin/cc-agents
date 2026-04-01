/**
 * orchestration-v2 — LocalBunExecutor
 *
 * Runs skill scripts locally via Bun.spawn with AbortController timeout.
 * Extracts resource metrics from stdout JSON or sidecar metrics file.
 */

import type {
    Executor,
    ExecutionRequest,
    ExecutionResult,
    ExecutorCapabilities,
    ExecutorHealth,
    ResourceMetrics,
} from '../model';
import { logger } from '../../../../scripts/logger';

export class LocalBunExecutor implements Executor {
    readonly id = 'local';
    readonly capabilities: ExecutorCapabilities = {
        parallel: false,
        streaming: false,
        structuredOutput: true,
        channels: ['current'],
        maxConcurrency: 1,
    };

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);

        try {
            // Build the command — invoke the skill script
            const args = this.buildArgs(req);
            logger.info(`[local] Executing: bun ${args.join(' ')}`);

            const proc = Bun.spawn(['bun', ...args], {
                stdout: 'pipe',
                stderr: 'pipe',
                cwd: process.cwd(),
                signal: controller.signal,
                env: this.buildEnv(req),
            });

            const exitCode = await proc.exited;
            clearTimeout(timeoutId);

            const stdout = await new Response(proc.stdout).text();
            const stderr = await new Response(proc.stderr).text();
            const durationMs = Date.now() - startTime;

            if (controller.signal.aborted) {
                return {
                    success: false,
                    exitCode: exitCode === 0 ? 1 : exitCode,
                    stderr: stderr || `Phase ${req.phase} timed out after ${req.timeoutMs}ms`,
                    durationMs,
                    timedOut: true,
                };
            }

            // Try to extract structured output from stdout
            let structured: Record<string, unknown> | undefined;
            try {
                const jsonMatch = stdout.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch?.[1]) {
                    structured = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
                }
            } catch {
                // Not JSON — that's fine
            }

            // Extract resource metrics if present
            const resources = this.extractMetrics(stdout);

            // Build result with spread pattern for optional properties
            const result: ExecutionResult = {
                success: exitCode === 0,
                exitCode,
                stdout: stdout.slice(0, 50_000), // Cap at 50KB
                stderr: stderr.slice(0, 10_000), // Cap at 10KB
                ...(structured !== undefined && { structured }),
                durationMs,
                timedOut: false,
                ...(resources !== undefined && { resources }),
            };

            if (!result.success) {
                logger.error(`[local] Phase ${req.phase} failed (exit ${exitCode})`);
            }

            return result;
        } catch (err) {
            clearTimeout(timeoutId);
            const durationMs = Date.now() - startTime;

            if (controller.signal.aborted) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr: `Phase ${req.phase} timed out after ${req.timeoutMs}ms`,
                    durationMs,
                    timedOut: true,
                };
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

    async healthCheck(): Promise<ExecutorHealth> {
        // Local executor is always healthy
        return { healthy: true, lastChecked: new Date() };
    }

    async dispose(): Promise<void> {
        // Nothing to clean up
    }

    /**
     * Build the environment variables for the child process.
     *
     * Sets ORCH_TASK_REF when the runner populates `req.taskRef` from
     * `RunRecord.task_ref`. Omitting taskRef on the request is safe — the
     * env var simply won't be set.
     */
    private buildEnv(req: ExecutionRequest): NodeJS.ProcessEnv {
        return {
            ...process.env,
            ORCH_PHASE: req.phase,
            ORCH_CHANNEL: req.channel,
            ...(req.taskRef && { ORCH_TASK_REF: req.taskRef }),
        };
    }

    private buildArgs(req: ExecutionRequest): string[] {
        const parts = ['run', req.skill];

        // Add payload as JSON env var
        if (Object.keys(req.payload).length > 0) {
            parts.push('--payload', JSON.stringify(req.payload));
        }

        return parts;
    }

    private extractMetrics(stdout: string): ResourceMetrics[] | undefined {
        try {
            // Look for metrics block in output
            const metricsMatch = stdout.match(/<!-- metrics:([\s\S]*?)-->/);
            if (metricsMatch?.[1]) {
                const parsed = JSON.parse(metricsMatch[1]) as ResourceMetrics[];
                return parsed;
            }
        } catch {
            // No metrics found
        }
        return undefined;
    }
}
