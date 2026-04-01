/**
 * orchestration-v2 — Resource Metrics
 *
 * Collects and aggregates resource metrics from executor results.
 */

import type { ResourceMetrics, ResourceUsageRecord } from '../model';

export interface ModelUsage {
    readonly input: number;
    readonly output: number;
    readonly calls: number;
}

export interface MetricsSummary {
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly totalCacheReadTokens: number;
    readonly totalCacheCreationTokens: number;
    readonly totalWallClockMs: number;
    readonly totalExecutionMs: number;
    readonly models: ReadonlyMap<string, ModelUsage>;
}

export function aggregateMetrics(metrics: readonly ResourceMetrics[]): MetricsSummary {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCacheReadTokens = 0;
    let totalCacheCreationTokens = 0;
    let totalWallClockMs = 0;
    let totalExecutionMs = 0;
    const models = new Map<string, ModelUsage>();

    for (const m of metrics) {
        totalInputTokens += m.input_tokens;
        totalOutputTokens += m.output_tokens;
        totalCacheReadTokens += m.cache_read_tokens ?? 0;
        totalCacheCreationTokens += m.cache_creation_tokens ?? 0;
        totalWallClockMs += m.wall_clock_ms;
        totalExecutionMs += m.execution_ms;

        const key = `${m.model_provider}/${m.model_id}`;
        const existing = models.get(key);
        if (existing) {
            models.set(key, {
                input: existing.input + m.input_tokens,
                output: existing.output + m.output_tokens,
                calls: existing.calls + 1,
            });
        } else {
            models.set(key, {
                input: m.input_tokens,
                output: m.output_tokens,
                calls: 1,
            });
        }
    }

    return {
        totalInputTokens,
        totalOutputTokens,
        totalCacheReadTokens,
        totalCacheCreationTokens,
        totalWallClockMs,
        totalExecutionMs,
        models,
    };
}

export function metricsToRecord(
    runId: string,
    phaseName: string,
    metrics: ResourceMetrics,
): Omit<ResourceUsageRecord, 'id' | 'recorded_at'> {
    return {
        run_id: runId,
        phase_name: phaseName,
        model_id: metrics.model_id,
        model_provider: metrics.model_provider,
        input_tokens: metrics.input_tokens,
        output_tokens: metrics.output_tokens,
        cache_read_tokens: metrics.cache_read_tokens ?? 0,
        cache_creation_tokens: metrics.cache_creation_tokens ?? 0,
        wall_clock_ms: metrics.wall_clock_ms,
        execution_ms: metrics.execution_ms,
        ...(metrics.first_token_ms != null && { first_token_ms: metrics.first_token_ms }),
    };
}

export function formatTokenCount(count: number): string {
    if (count >= 1_000_000) {
        return `${(count / 1_000_000).toFixed(1)}M`;
    }
    if (count >= 1_000) {
        return `${(count / 1_000).toFixed(1)}K`;
    }
    return String(count);
}

export function formatDuration(ms: number): string {
    if (ms >= 60 * 60 * 1000) {
        const hours = Math.floor(ms / (60 * 60 * 1000));
        const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        return `${hours}h ${mins}m`;
    }
    if (ms >= 60 * 1000) {
        const mins = Math.floor(ms / (60 * 1000));
        const secs = Math.floor((ms % (60 * 1000)) / 1000);
        return `${mins}m ${secs}s`;
    }
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
}
