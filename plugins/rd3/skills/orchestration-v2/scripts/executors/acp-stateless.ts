/**
 * orchestration-v2 — ACP Stateless Executor Adapter
 *
 * Bounded one-shot ACP execution for ordinary pipeline phases.
 *
 * Execution model:
 *   acpx [--options] pi exec "<prompt>"
 *
 * Key characteristics:
 * - Stateless: no session reuse
 * - Bounded: explicit timeout
 * - Tool-first: agent invokes Skill() immediately
 *
 * This is the safe default for pipeline phase execution.
 * Use AcpSessionedExecutor only when session semantics are explicitly needed.
 */

import type { PhaseExecutorAdapter, ExecutorHealth, ExecutionMode } from './adapter';
import type { ExecutionRequest, ExecutionResult } from '../model';
import { logger } from '../../../../scripts/logger';
import * as transport from '../integrations/acp/transport';
import * as prompts from '../integrations/acp/prompts';

/**
 * ACP Stateless Executor Adapter.
 *
 * Always uses `acpx <agent> exec` for one-shot bounded execution.
 * No session reuse, no context carry-over.
 *
 * This is the recommended adapter for ordinary pipeline phase execution.
 */
export class AcpStatelessExecutor implements PhaseExecutorAdapter {
    readonly id: string;
    readonly name: string;
    readonly executionMode: ExecutionMode = 'stateless';
    readonly channels: readonly string[];

    private readonly agentName: string;

    /**
     * Create a stateless ACP executor.
     *
     * @param agentName - ACP agent name (e.g., "pi", "codex"). Default: "pi"
     */
    constructor(agentName = 'pi') {
        this.agentName = agentName;
        this.id = `acp-stateless:${agentName}`;
        this.name = `ACP Stateless (${agentName})`;
        this.channels = [agentName, 'acp', `acp:${agentName}`];
    }

    /**
     * Execute a phase using stateless ACP.
     *
     * Always uses `exec` mode regardless of request options.
     * Session fields in the request are ignored.
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            // Build prompt using ACP prompt shaping
            const prompt = prompts.buildPromptFromRequest(req);

            // Execute via transport (always stateless)
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
     * No-op dispose (stateless has no resources to clean up).
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
 * Create a stateless ACP executor for an agent.
 */
export function createStatelessExecutor(agentName = 'pi'): PhaseExecutorAdapter {
    return new AcpStatelessExecutor(agentName);
}

/**
 * Default stateless executor for pi agent.
 */
export const DEFAULT_STATELESS_EXECUTOR = new AcpStatelessExecutor('pi');
