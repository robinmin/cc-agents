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

export function formatStatusListOutput(summaries: RunSummary[]): string {
    const lines: string[] = [];
    lines.push(`${'RUN ID'.padEnd(20)} ${'TASK'.padEnd(16)} ${'STATUS'.padEnd(12)} ${'PRESET'.padEnd(16)} DURATION`);
    lines.push('-'.repeat(80));
    for (const s of summaries) {
        lines.push(
            `${s.run.id.padEnd(20)} ${s.run.task_ref.padEnd(16)} ${s.run.status.padEnd(12)} ${(s.run.preset ?? 'default').padEnd(16)} ${formatDuration(s.totalWallMs)}`,
        );
    }
    return lines.join('\n');
}

export function formatStatusJson(summary: RunSummary): string {
    return JSON.stringify(summary, null, 2);
}

export function formatStatusListJson(summaries: RunSummary[]): string {
    return JSON.stringify(summaries, null, 2);
}
