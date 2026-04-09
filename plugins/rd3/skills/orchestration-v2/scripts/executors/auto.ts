/**
 * orchestration-v2 — Auto Executor
 *
 * Compatibility wrapper for "use the orchestrator default external backend".
 * This is intentionally distinct from the real local executor.
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

    constructor(delegate?: Executor) {
        if (delegate) {
            this.delegate = delegate;
        } else {
            const config = resolveConfig();
            this.delegate = new AcpExecutor(config.defaultChannel);
        }

        this.capabilities = {
            parallel: this.delegate.capabilities.parallel,
            streaming: this.delegate.capabilities.streaming,
            structuredOutput: this.delegate.capabilities.structuredOutput,
            channels: this.channels,
            maxConcurrency: this.delegate.capabilities.maxConcurrency,
        };
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        return this.delegate.execute({ ...req, channel: this.delegate.id });
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return this.delegate.healthCheck();
    }

    async dispose(): Promise<void> {
        await this.delegate.dispose();
    }
}
