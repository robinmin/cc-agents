/**
 * orchestration-v2 — ACP Sessioned Executor Adapter
 *
 * Persistent session ACP execution for scenarios requiring context carry-over.
 *
 * Execution model:
 *   acpx [--options] pi prompt --session <name> [--ttl N] "<prompt>"
 *
 * Key characteristics:
 * - Sessioned: context carries over between calls
 * - Stateful: session lifecycle must be managed
 * - Persistent: session survives individual turn timeouts
 *
 * USE CASES (when sessioned is appropriate):
 * - Human-guided iterative refinement
 * - Deliberately persistent research/coding conversations
 * - Workflows that need context carry-over and are prepared
 *   to manage queue/session semantics
 *
 * DO NOT USE for ordinary pipeline phase execution.
 * Prefer AcpStatelessExecutor for safe bounded execution.
 */

import type { PhaseExecutorAdapter, ExecutorHealth, ExecutionMode } from './adapter';
import type { ExecutionRequest, ExecutionResult } from '../model';
import { logger } from '../../../../scripts/logger';
import * as transport from '../integrations/acp/transport';
import * as prompts from '../integrations/acp/prompts';
import { DefaultSessionLifecycle, type SessionConfig } from '../integrations/acp/sessions';

/**
 * ACP Sessioned Executor Adapter.
 *
 * Uses `prompt --session` for sessioned execution with context carry-over.
 *
 * Session management:
 * - Sessions are created on first use
 * - Session TTL can be configured
 * - Stale sessions are detected and recovered
 * - Sessions must be explicitly closed
 *
 * WARNING: Sessioned execution introduces:
 * - Non-deterministic queue behavior
 * - Potential for session stalls
 * - Complexity in lifecycle management
 *
 * Only use when session semantics are explicitly needed.
 */
export class AcpSessionedExecutor implements PhaseExecutorAdapter {
    readonly id: string;
    readonly name: string;
    readonly executionMode: ExecutionMode = 'sessioned';
    readonly channels: readonly string[];

    private readonly agentName: string;
    private readonly sessionLifecycle: DefaultSessionLifecycle;
    private readonly defaultSessionTtlSeconds: number;

    /**
     * Create a sessioned ACP executor.
     *
     * @param agentName - ACP agent name (e.g., "pi", "codex"). Default: "pi"
     * @param defaultSessionTtlSeconds - Default TTL for sessions. Default: 300 (5 min)
     */
    constructor(agentName = 'pi', defaultSessionTtlSeconds = 300) {
        this.agentName = agentName;
        this.id = `acp-sessioned:${agentName}`;
        this.name = `ACP Sessioned (${agentName})`;
        this.channels = [`${agentName}:sessioned`, `sessioned:${agentName}`];
        this.sessionLifecycle = new DefaultSessionLifecycle();
        this.defaultSessionTtlSeconds = defaultSessionTtlSeconds;
    }

    /**
     * Execute a phase using sessioned ACP.
     *
     * Requires session name from request. If no session name is provided,
     * falls back to stateless execution with a warning.
     *
     * Session semantics:
     * - Uses `prompt --session <name>` for execution
     * - Session TTL controls keepalive
     * - Context carries over between calls
     */
    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        const startTime = Date.now();

        // Sessioned execution REQUIRES a session name
        if (!req.session) {
            logger.warn(
                `[${this.id}] Sessioned executor called without session name. ` +
                    'Falling back to stateless execution. ' +
                    'Set session field in ExecutionRequest for sessioned mode.',
            );
            // Fall back to stateless
            return this.executeStateless(req, startTime);
        }

        try {
            // Build prompt using ACP prompt shaping
            const prompt = prompts.buildPromptFromRequest(req);

            // Get TTL from request or use default
            const ttlSeconds = req.sessionTtlSeconds ?? this.defaultSessionTtlSeconds;

            // Ensure session exists
            const sessionConfig: SessionConfig = {
                name: req.session,
                agent: this.agentName,
                ttlSeconds,
            };
            await this.sessionLifecycle.ensure(sessionConfig);

            // Check session health before execution
            const sessionHealth = await this.sessionLifecycle.status(req.session);
            if (!sessionHealth.healthy) {
                if (sessionHealth.state === 'stale') {
                    logger.warn(`[${this.id}] Session ${req.session} is stale, recovering...`);
                    await this.sessionLifecycle.recover(req.session);
                } else {
                    logger.warn(`[${this.id}] Session ${req.session} is ${sessionHealth.state}, proceeding anyway...`);
                }
            }

            // Execute via transport with session
            const result = transport.executeSessioned(prompt, req.timeoutMs, req.session, ttlSeconds, {
                agent: this.agentName,
            });

            // Update session health based on result
            if (!result.success) {
                if (result.timedOut) {
                    await this.sessionLifecycle.markStale(req.session);
                    logger.warn(`[${this.id}] Session ${req.session} marked as stale due to timeout`);
                }
            }

            // Map to ExecutionResult
            return this.mapResult(result, req, startTime);
        } catch (err) {
            const durationMs = Date.now() - startTime;

            // Mark session as stale on unexpected errors
            if (req.session) {
                await this.sessionLifecycle.markStale(req.session);
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
     * Fallback to stateless execution.
     */
    private async executeStateless(req: ExecutionRequest, startTime: number): Promise<ExecutionResult> {
        // Build prompt using ACP prompt shaping
        const prompt = prompts.buildPromptFromRequest(req);

        // Execute via transport (stateless fallback)
        const result = transport.executeStateless(prompt, req.timeoutMs, { agent: this.agentName });

        return this.mapResult(result, req, startTime);
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
 * Session-aware executor that can switch between stateless and sessioned.
 *
 * This executor:
 * - Uses stateless by default
 * - Switches to sessioned when session name is provided
 * - Useful for gradual migration or testing
 *
 * NOTE: This mixes modes in a single executor. For cleaner separation,
 * prefer using separate AcpStatelessExecutor and AcpSessionedExecutor
 * with routing policy to choose between them.
 *
 * @deprecated Use separate adapters with routing policy instead
 */
export class AcpSessionAwareExecutor implements PhaseExecutorAdapter {
    readonly id: string;
    readonly name: string;
    readonly executionMode: ExecutionMode = 'stateless'; // Reports stateless as base mode
    readonly channels: readonly string[];

    private readonly stateless: AcpSessionedExecutor;

    constructor(agentName = 'pi') {
        this.id = `acp:${agentName}`;
        this.name = `ACP (${agentName})`;
        this.channels = [agentName, 'acp', `acp:${agentName}`];
        this.stateless = new AcpSessionedExecutor(agentName);
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        return this.stateless.execute(req);
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return this.stateless.healthCheck();
    }

    async dispose(): Promise<void> {
        await this.stateless.dispose();
    }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a sessioned ACP executor for an agent.
 */
export function createSessionedExecutor(agentName = 'pi', ttlSeconds = 300): PhaseExecutorAdapter {
    return new AcpSessionedExecutor(agentName, ttlSeconds);
}

/**
 * Default sessioned executor for pi agent.
 */
export const DEFAULT_SESSIONED_EXECUTOR = new AcpSessionedExecutor('pi');
