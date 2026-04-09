/**
 * orchestration-v2 — MockExecutor
 *
 * Returns canned responses for testing. Supports scripted sequences.
 */

import type { Executor, ExecutionRequest, ExecutionResult, ExecutorHealth } from '../model';

export interface MockResponse {
    readonly result: ExecutionResult;
    readonly matchPhase?: string;
}

export interface MockExecutorOptions {
    readonly delayMs?: number;
    readonly channels?: string[];
}

export class MockExecutor implements Executor {
    readonly id = 'mock';
    readonly name = 'Mock Executor';
    readonly channels: readonly string[];
    readonly maxConcurrency = Number.MAX_SAFE_INTEGER;
    private responses: MockResponse[] = [];
    private callLog: ExecutionRequest[] = [];
    private callIndex = 0;
    private readonly delayMs: number;

    constructor(options?: MockExecutorOptions) {
        this.delayMs = options?.delayMs ?? 0;
        this.channels = options?.channels ?? ['mock'];
    }

    addResponse(response: MockResponse): void {
        this.responses.push(response);
    }

    setResponses(responses: MockResponse[]): void {
        this.responses = responses;
    }

    getCallLog(): ExecutionRequest[] {
        return [...this.callLog];
    }

    reset(): void {
        this.callLog = [];
        this.callIndex = 0;
    }

    async execute(req: ExecutionRequest): Promise<ExecutionResult> {
        this.callLog.push(req);

        if (this.delayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.delayMs));
        }

        // Find matching response by phase, or use sequential responses
        const phaseMatch = this.responses.find((r) => r.matchPhase === req.phase);
        if (phaseMatch) {
            return phaseMatch.result;
        }

        // Sequential responses (only if no phase match found)
        if (phaseMatch === undefined && this.callIndex < this.responses.length) {
            return this.responses[this.callIndex++]?.result ?? defaultResult();
        }

        return defaultResult();
    }

    async healthCheck(): Promise<ExecutorHealth> {
        return { healthy: true, lastChecked: new Date() };
    }

    async dispose(): Promise<void> {
        this.responses = [];
        this.callLog = [];
        this.callIndex = 0;
    }
}

function defaultResult(): ExecutionResult {
    return {
        success: true,
        exitCode: 0,
        durationMs: 100,
        timedOut: false,
    };
}
