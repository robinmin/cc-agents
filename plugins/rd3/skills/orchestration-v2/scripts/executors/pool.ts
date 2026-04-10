/**
 * orchestration-v2 — Executor Pool
 *
 * Registry for executors. Routes execution requests to the appropriate
 * executor based on channel or executor ID.
 *
 * Execution modes (clean vocabulary):
 *   - 'inline'             → InlineExecutor (in-process execution)
 *   - 'subprocess'         → SubprocessExecutor (explicit Bun subprocess)
 *   - 'acp-oneshot:<ch>'   → AcpOneshotExecutor (one-shot ACP execution)
 *   - 'acp-session:<ch>'   → AcpSessionExecutor (sessioned ACP execution)
 *
 * Legacy aliases (accepted, normalized with deprecation warning):
 *   - 'local' → 'inline'
 *   - 'direct' → 'subprocess'
 *   - 'auto' → 'inline'
 *   - 'current' → 'inline'
 *   - 'acp-stateless:<ch>' → 'acp-oneshot:<ch>'
 *   - 'acp-sessioned:<ch>' → 'acp-session:<ch>'
 *
 * Default: 'inline' (InlineExecutor) for interactive workflows.
 * Use 'subprocess' for explicit subprocess isolation.
 * Use ACP adapters for external channel execution.
 *
 * Config: ~/.config/orchestrator/config.yaml
 *   executor_channels: [pi, codex, ...]
 *   default_channel: pi
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';
import { normalizeExecutorId } from '../model';
import { resolveConfig } from '../config/config';
import { logger } from '../../../../scripts/logger';
import type { ExecutionRoutingPolicy } from './adapter';
import { ACP_ONESHOT_PATTERN, ADAPTER_INLINE, ADAPTER_SUBPROCESS } from './adapter';
import { loadRoutingPolicy, materializePolicyChannels } from '../routing/policy';
import { AcpOneshotExecutor } from './acp-oneshot';
import { AcpSessionExecutor } from './acp-session';
import { SubprocessExecutor } from './subprocess';
import { InlineExecutor } from './inline';

export class ExecutorPool {
    private registry: Map<string, Executor> = new Map();
    private readonly defaultId = 'inline';
    private readonly configuredChannels: readonly string[];
    private routingPolicy: ExecutionRoutingPolicy;

    constructor() {
        // InlineExecutor is the in-process executor and the interactive default.
        const inline = new InlineExecutor();
        this.register(inline);

        // SubprocessExecutor is the explicit Bun subprocess executor.
        const subprocess = new SubprocessExecutor();
        this.register(subprocess);

        // Load config and register ACP executors for each configured channel.
        const config = resolveConfig();
        this.configuredChannels = config.executorChannels;
        this.routingPolicy = materializePolicyChannels(loadRoutingPolicy(inline.id), this.configuredChannels);

        for (const channel of config.executorChannels) {
            const oneshot = new AcpOneshotExecutor(channel);
            this.register(oneshot);

            const session = new AcpSessionExecutor(channel);
            this.register(session);
        }
    }

    /**
     * Get current routing policy.
     */
    getRoutingPolicy(): ExecutionRoutingPolicy {
        return this.routingPolicy;
    }

    register(executor: Executor): void {
        for (const channel of executor.channels) {
            this.registry.set(channel, executor);
        }
        this.registry.set(executor.id, executor);
    }

    get(id: string): Executor | undefined {
        const normalized = normalizeExecutorId(id);
        return this.registry.get(normalized) ?? this.registry.get(id);
    }

    getDefault(): Executor {
        const executor = this.registry.get(this.defaultId);
        if (executor !== undefined) {
            return executor;
        }
        throw new Error(`Default executor not found: ${this.defaultId}`);
    }

    list(): Executor[] {
        const seen = new Set<string>();
        const result: Executor[] = [];
        for (const executor of this.registry.values()) {
            if (!seen.has(executor.id)) {
                seen.add(executor.id);
                result.push(executor);
            }
        }
        return result;
    }

    resolve(channel: string): Executor {
        const normalized = normalizeExecutorId(channel);
        const executor = this.registry.get(normalized) ?? this.registry.get(channel);
        if (!executor) {
            throw new Error(`No executor registered for channel: ${channel}`);
        }
        return executor;
    }

    has(channel: string): boolean {
        const normalized = normalizeExecutorId(channel);
        return this.registry.has(normalized) || this.registry.has(channel);
    }

    async execute(req: ExecutionRequest, executorId?: string): Promise<ExecutionResult> {
        // If explicit executor ID provided, use it directly.
        if (executorId) {
            const normalized = normalizeExecutorId(executorId);
            const executor = this.registry.get(normalized) ?? this.registry.get(executorId);
            if (!executor) {
                throw new Error(`Executor not found: ${executorId}`);
            }
            return executor.execute(req);
        }

        // Use routing policy for channel resolution
        return this.executeWithPolicy(req);
    }

    /**
     * Execute using routing policy to select executor.
     * Session-aware: when req.session is present, routes to sessioned ACP executor.
     */
    private async executeWithPolicy(req: ExecutionRequest): Promise<ExecutionResult> {
        const explicitLocalExecutor = this.resolveExplicitLocalExecutor(req.channel);
        if (explicitLocalExecutor) {
            return this.executeResolved(req, explicitLocalExecutor.id);
        }

        if (!this.isKnownPolicyChannel(req.channel)) {
            throw new Error(`No executor registered for channel: ${req.channel}`);
        }

        const { routePhase } = await import('../routing/policy');
        const decision = routePhase(this.routingPolicy, req.phase, req.channel);
        return this.executeResolved(req, decision.adapterId);
    }

    private async executeResolved(req: ExecutionRequest, adapterId: string): Promise<ExecutionResult> {
        // Session-aware executor selection: if request has session, route to sessioned variant
        let executorId = adapterId;
        if (req.session) {
            const match = ACP_ONESHOT_PATTERN.exec(executorId);
            if (match) {
                const channel = match[1];
                executorId = `acp-session:${channel}`;
                logger.info(`[pool] Session "${req.session}" detected — routing to ${executorId}`);
            }
            if (executorId === ADAPTER_SUBPROCESS) {
                return {
                    success: false,
                    exitCode: 1,
                    stderr:
                        'The subprocess executor does not support --session. ' +
                        'Use inline mode or an explicit ACP session executor instead.',
                    durationMs: 0,
                    timedOut: false,
                };
            }
        }

        const executor = this.registry.get(executorId);
        if (!executor) {
            throw new Error(`Executor not found: ${executorId}`);
        }
        return executor.execute(req);
    }

    private resolveExplicitLocalExecutor(channel: string): Executor | undefined {
        const normalized = normalizeExecutorId(channel);
        if (normalized !== ADAPTER_INLINE && normalized !== ADAPTER_SUBPROCESS) {
            return undefined;
        }

        // 'auto' and 'current' must fall through to policy routing (not resolve to
        // a specific executor). Check the original value since normalizeExecutorId
        // already maps them to ADAPTER_INLINE.
        if (channel === 'auto' || channel === 'current') {
            return undefined;
        }

        return this.registry.get(normalized) ?? this.registry.get(channel);
    }

    private isKnownPolicyChannel(channel: string): boolean {
        if (channel === 'auto' || channel === 'current') {
            return true;
        }

        if (this.configuredChannels.includes(channel)) {
            return true;
        }

        return this.routingPolicy.channelOverrides?.[channel] !== undefined;
    }

    async healthCheckAll(): Promise<Map<string, ExecutorHealth>> {
        const results = new Map<string, ExecutorHealth>();
        const seen = new Set<string>();
        for (const executor of this.registry.values()) {
            if (!seen.has(executor.id)) {
                seen.add(executor.id);
                results.set(executor.id, await executor.healthCheck());
            }
        }
        return results;
    }

    async disposeAll(): Promise<void> {
        const disposed = new Set<Executor>();
        for (const executor of this.registry.values()) {
            if (disposed.has(executor)) {
                continue;
            }
            disposed.add(executor);
            await executor.dispose();
        }
        this.registry.clear();
    }
}
