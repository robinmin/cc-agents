/**
 * orchestration-v2 — Status display
 *
 * Renders pipeline status as a formatted table or JSON.
 */

import type { RunSummary } from '../state/queries';
import { formatDuration } from '../observability/metrics';

export function formatStatusOutput(summary: RunSummary): string {
    const { run } = summary;
    const lines: string[] = [];
    lines.push(`Run: ${run.task_ref}  Status: ${run.status}`);
    lines.push(`Pipeline: ${run.pipeline_name}  Preset: ${run.preset ?? 'default'}`);
    lines.push(`Duration: ${formatDuration(summary.totalWallMs)}`);
    lines.push('');
    for (const phase of summary.phases) {
        lines.push(`  ${phase.name.padEnd(16)} ${phase.status.padEnd(10)} ${phase.skill}`);
    }
    return lines.join('\n');
}

export function formatStatusJson(summary: RunSummary): string {
    return JSON.stringify(summary, null, 2);
}
