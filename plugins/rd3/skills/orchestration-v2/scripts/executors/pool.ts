/**
 * orchestration-v2 — Executor Pool
 *
 * Registry for executors. Routes execution requests to the appropriate
 * executor based on channel or executor ID.
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';
import { LocalBunExecutor } from './local';

export class ExecutorPool {
    private executors: Map<string, Executor> = new Map();
    private readonly defaultId: string;

    constructor() {
        const local = new LocalBunExecutor();
        this.register(local);
        this.defaultId = local.id;
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
            throw new Error('Default executor not found');
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
        const executor = executorId ? this.get(executorId) : this.resolve(req.channel);
        if (!executor) {
            throw new Error(`Executor not found: ${executorId ?? req.channel}`);
        }
        return executor.execute(req);
    }

    async healthCheckAll(): Promise<Map<string, ExecutorHealth>> {
        const results = new Map<string, ExecutorHealth>();
        const seen = new Set<string>();
        for (const executor of this.executors.values()) {
            if (!seen.has(executor.id)) {
                seen.add(executor.id);
                results.set(executor.id, await executor.healthCheck());
            }
        }
        return results;
    }

    async disposeAll(): Promise<void> {
        for (const executor of this.executors.values()) {
            await executor.dispose();
        }
        this.executors.clear();
    }
}
