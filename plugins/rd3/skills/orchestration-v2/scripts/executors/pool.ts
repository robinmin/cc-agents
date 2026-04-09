/**
 * orchestration-v2 — Executor Pool
 *
 * Registry for executors. Routes execution requests to the appropriate
 * executor based on channel or executor ID.
 *
 * Channel resolution:
 *   - 'auto'     → AutoExecutor (uses default_channel from config)
 *   - 'current'  → AutoExecutor (deprecated compatibility alias)
 *   - 'pi'       → AcpExecutor('pi')
 *   - 'codex'     → AcpExecutor('codex')
 *   - ... (any registered channel → AcpExecutor(channel))
 *
 * Config: ~/.config/orchestrator/config.yaml
 *   executor_channels: [pi, codex, ...]
 *   default_channel: pi
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';
import { resolveConfig } from '../config/config';
import { logger } from '../../../../scripts/logger';
import { AutoExecutor } from './local';
import { AcpExecutor } from './acp';
import type { PhaseExecutorAdapter, ExecutionRoutingPolicy } from './adapter';
import { buildAcpAdapterId, loadRoutingPolicy, materializePolicyChannels } from '../routing/policy';
import { AcpStatelessExecutor } from './acp-stateless';
import { AcpSessionedExecutor } from './acp-sessioned';

export class ExecutorPool {
    private executors: Map<string, Executor> = new Map();
    private readonly defaultId: string;
    private readonly configuredChannels: readonly string[];
    private routingPolicy: ExecutionRoutingPolicy;
    private adapters: Map<string, PhaseExecutorAdapter> = new Map();
    private useAdapters = true;

    constructor() {
        // AutoExecutor is always registered for the canonical 'auto' alias
        // and the deprecated 'current' compatibility alias.
        const auto = new AutoExecutor();
        this.register(auto);
        this.adapters.set(auto.id, auto);
        this.adapters.set('local', auto);
        this.defaultId = auto.id;

        // Register AcpExecutor for each configured channel (legacy mode)
        const config = resolveConfig();
        this.configuredChannels = config.executorChannels;
        this.routingPolicy = materializePolicyChannels(
            loadRoutingPolicy(buildAcpAdapterId(config.defaultChannel, 'stateless')),
            this.configuredChannels,
        );
        for (const channel of config.executorChannels) {
            const acp = new AcpExecutor(channel);
            this.register(acp);
        }

        // Also register new adapter-mode executors
        this.registerAdapters(config.executorChannels);
    }

    /**
     * Register adapter-mode executors.
     */
    private registerAdapters(channels: readonly string[]): void {
        for (const channel of channels) {
            const stateless = new AcpStatelessExecutor(channel);
            this.adapters.set(stateless.id, stateless);

            const sessioned = new AcpSessionedExecutor(channel);
            this.adapters.set(sessioned.id, sessioned);
        }
    }

    /**
     * Enable adapter mode with routing policy.
     */
    enableAdapterMode(policy?: ExecutionRoutingPolicy): void {
        this.useAdapters = true;
        if (policy) {
            this.routingPolicy = materializePolicyChannels(policy, this.configuredChannels);
        }
    }

    /**
     * Disable adapter mode and fall back to legacy channel resolution.
     */
    disableAdapterMode(): void {
        this.useAdapters = false;
    }

    /**
     * Get current routing policy.
     */
    getRoutingPolicy(): ExecutionRoutingPolicy {
        return this.routingPolicy;
    }

    register(executor: Executor): void {
        for (const channel of executor.capabilities.channels) {
            this.executors.set(channel, executor);
        }
        this.executors.set(executor.id, executor);
    }

    get(id: string): Executor | undefined {
        return this.executors.get(id);
    }

    getDefault(): Executor {
        const executor = this.executors.get(this.defaultId);
        if (!executor) {
            throw new Error(`Default executor not found: ${this.defaultId}`);
        }
        return executor;
    }

    list(): Executor[] {
        const seen = new Set<string>();
        const result: Executor[] = [];
        for (const executor of this.executors.values()) {
            if (!seen.has(executor.id)) {
                seen.add(executor.id);
                result.push(executor);
            }
        }
        return result;
    }

    resolve(channel: string): Executor {
        const executor = this.executors.get(channel);
        if (!executor) {
            throw new Error(`No executor registered for channel: ${channel}`);
        }
        return executor;
    }

    has(channel: string): boolean {
        return this.executors.has(channel);
    }

    async execute(req: ExecutionRequest, executorId?: string): Promise<ExecutionResult> {
        // If explicit executor ID provided, use it directly.
        if (executorId) {
            const adapter = this.adapters.get(executorId);
            if (adapter) {
                return adapter.execute(req);
            }
            const executor = this.get(executorId);
            if (!executor) {
                throw new Error(`Executor not found: ${executorId}`);
            }
            return executor.execute(req);
        }
        // If adapter mode enabled, use routing policy
        if (this.useAdapters) {
            return this.executeWithPolicy(req);
        }
        // Legacy channel resolution
        const executor = this.resolve(req.channel);
        if (!executor) {
            throw new Error(`Executor not found: ${req.channel}`);
        }
        return executor.execute(req);
    }
    /**
     * Execute using routing policy to select adapter.
     */
    private async executeWithPolicy(req: ExecutionRequest): Promise<ExecutionResult> {
        const { routePhase } = await import('../routing/policy');
        const decision = routePhase(this.routingPolicy, req.phase, req.channel);
        const adapter = this.adapters.get(decision.adapterId);
        if (!adapter) {
            // Fall back to legacy mode
            logger.warn(`[pool] Adapter ${decision.adapterId} not found, falling back to legacy mode`);
            const executor = this.resolve(req.channel);
            if (!executor) {
                throw new Error(`Executor not found: ${req.channel}`);
            }
            return executor.execute(req);
        }
        return adapter.execute(req);
    }

    async healthCheckAll(): Promise<Map<string, ExecutorHealth>> {
        const results = new Map<string, ExecutorHealth>();
        const seenExecutorIds = new Set<string>();
        for (const executor of this.executors.values()) {
            if (!seenExecutorIds.has(executor.id)) {
                seenExecutorIds.add(executor.id);
                results.set(executor.id, await executor.healthCheck());
            }
        }
        const seenAdapterIds = new Set<string>();
        for (const [adapterId, adapter] of this.adapters.entries()) {
            if (seenAdapterIds.has(adapterId) || results.has(adapterId)) {
                continue;
            }
            seenAdapterIds.add(adapterId);
            results.set(adapterId, await adapter.healthCheck());
        }
        return results;
    }

    async disposeAll(): Promise<void> {
        const disposed = new Set<Executor | PhaseExecutorAdapter>();
        for (const executor of this.executors.values()) {
            if (disposed.has(executor)) {
                continue;
            }
            disposed.add(executor);
            await executor.dispose();
        }
        for (const adapter of this.adapters.values()) {
            if (disposed.has(adapter)) {
                continue;
            }
            disposed.add(adapter);
            await adapter.dispose();
        }
        this.executors.clear();
        this.adapters.clear();
    }
}
