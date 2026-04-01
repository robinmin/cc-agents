/**
 * orchestration-v2 — AcpExecutor
 *
 * Delegates execution to remote agent via `acpx` CLI.
 * Parses NDJSON event stream for resource metrics.
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

export class AcpExecutor implements Executor {
    readonly id: string;
    readonly capabilities: ExecutorCapabilities;
    private readonly agentName: string;

    constructor(agentName: string) {
        this.agentName = agentName;
        this.id = `acp:${agentName}`;
        this.capabilities = {
            parallel: true,
            streaming: true,
            structuredOutput: true,
            channels: [agentName],
            maxConcurrency: 4,
        };
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), req.timeoutMs);

        try {
            const args = this.buildArgs(req);
            logger.info(`[acp:${this.agentName}] Executing: ${req.skill} (phase: ${req.phase})`);

            const proc = Bun.spawn(['acpx', ...args], {
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
            const timedOut = controller.signal.aborted;

            if (exitCode !== 0) {
                logger.error(
                    `[acp:${this.agentName}] Phase ${req.phase} failed (exit ${exitCode}): ${stderr.slice(0, 200)}`,
                );
            }

            const resources = this.parseEventStream(stdout);

            return {
                success: exitCode === 0,
                exitCode,
                stdout: stdout.slice(0, 50_000),
                stderr: stderr.slice(0, 10_000),
                durationMs,
                timedOut,
                ...(resources.length > 0 && { resources }),
            };
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
        try {
            const proc = Bun.spawn(['acpx', '--version'], {
                stdout: 'pipe',
                stderr: 'pipe',
            });
            const exitCode = await proc.exited;
            return {
                healthy: exitCode === 0,
                ...(exitCode !== 0 && { message: 'acpx not found or not working' }),
                lastChecked: new Date(),
            };
        } catch {
            return {
                healthy: false,
                message: 'acpx not available',
                lastChecked: new Date(),
            };
        }
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
        const args = ['run', '--agent', this.agentName, '--skill', req.skill, '--phase', req.phase];

        args.push('--channel', req.channel);

        if (req.prompt) {
            args.push('--prompt', req.prompt);
        }
        if (Object.keys(req.payload).length > 0) {
            args.push('--payload', JSON.stringify(req.payload));
        }
        if (req.feedback) {
            args.push('--feedback', req.feedback);
        }
        if (req.reworkIteration !== undefined) {
            args.push('--rework-iteration', String(req.reworkIteration));
        }
        if (req.reworkMax !== undefined) {
            args.push('--rework-max', String(req.reworkMax));
        }
        if (req.outputSchema) {
            args.push('--output-schema', JSON.stringify(req.outputSchema));
        }

        return args;
    }

    private parseEventStream(output: string): ResourceMetrics[] {
        const resources: ResourceMetrics[] = [];
        for (const line of output.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const event = JSON.parse(trimmed) as Record<string, unknown>;
                if (event.type === 'usage' && typeof event.usage === 'object' && event.usage) {
                    const usage = event.usage as Record<string, unknown>;
                    resources.push({
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
                }
            } catch {
                // Not JSON — skip line
            }
        }
        return resources;
    }
}
