/**
 * orchestration-v2 — AutoExecutor
 *
 * Thin wrapper that resolves the configured default execution channel and
 * delegates to AcpExecutor. This is the canonical "auto" channel executor.
 *
 * Compatibility:
 *   - "auto" is the canonical alias for "use the configured default channel"
 *   - "current" remains a deprecated compatibility alias for the same behavior
 *
 * Architecture:
 *   AutoExecutor  →  resolves default channel from config
 *                 →  AcpExecutor(channel)  →  acpx <agent> exec "<prompt>"
 *
 * The distinction from AcpExecutor:
 *   - AcpExecutor is constructed with an explicit channel (e.g., "pi", "codex")
 *   - AutoExecutor loads the config to determine the channel, then delegates
 *
 * Config: ~/.config/orchestrator/config.yaml
 *   default_channel: pi
 *   executor_channels: [pi, codex, ...]
 *
 * For testing: pass a MockExecutor as the delegate to avoid real acpx calls.
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorCapabilities, ExecutorHealth } from '../model';
import { AcpExecutor } from './acp';
import { resolveConfig } from '../config/config';
import type { ExecutionMode, PhaseExecutorAdapter } from './adapter';

export class AutoExecutor implements Executor, PhaseExecutorAdapter {
    readonly id = 'auto';
    readonly name = 'Auto Executor';
    readonly executionMode: ExecutionMode = 'stateless';
    readonly channels = ['auto', 'current'] as const;
    readonly capabilities: ExecutorCapabilities;
    private readonly delegate: Executor;

    /**
     * @param delegate - Executor to delegate to. Defaults to AcpExecutor(config.defaultChannel).
     *                   Tests can inject a MockExecutor to avoid real acpx calls.
     */
    constructor(delegate?: Executor) {
        if (delegate) {
            this.delegate = delegate;
        } else {
            const config = resolveConfig();
            this.delegate = new AcpExecutor(config.defaultChannel);
        }

        // 'auto' is the canonical channel alias for the configured default backend.
        // 'current' remains registered as a compatibility alias.
        this.capabilities = {
            parallel: this.delegate.capabilities.parallel,
            streaming: this.delegate.capabilities.streaming,
            structuredOutput: this.delegate.capabilities.structuredOutput,
            channels: this.channels,
            maxConcurrency: this.delegate.capabilities.maxConcurrency,
        };
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        // Override channel to the real executor id so ORCH_CHANNEL env var is accurate.
        // req.channel may be 'auto' or the deprecated 'current' alias, but the subprocess
        // is actually running on this.delegate.id (e.g. 'acp:pi').
        return this.delegate.execute({ ...req, channel: this.delegate.id });
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return this.delegate.healthCheck();
    }

    async dispose(): Promise<void> {
        await this.delegate.dispose();
    }
}

export { AutoExecutor as LocalExecutor };
