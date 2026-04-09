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

    /**
     * Create a oneshot ACP executor.
     *
     * @param agentName - ACP agent name (e.g., "pi", "codex"). Default: "pi"
     * @param maxConcurrency - Maximum concurrent executions. Default: 4
     */
    constructor(agentName = 'pi', maxConcurrency = 4) {
        this.agentName = agentName;
        this.id = `acp-oneshot:${agentName}`;
        this.name = `ACP Oneshot (${agentName})`;
        this.channels = [agentName, 'acp', `acp:${agentName}`];
        this.maxConcurrency = maxConcurrency;
    }

    /**
     * Execute a phase using oneshot ACP.
     *
     * Always uses `exec` mode regardless of request options.
     * Session fields in the request are ignored.
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            // Build prompt using ACP prompt shaping
            const prompt = prompts.buildPromptFromRequest(req);

            // Execute via transport (always stateless/oneshot)
            const result = transport.executeStateless(prompt, req.timeoutMs, { agent: this.agentName });

            // Map to ExecutionResult
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
