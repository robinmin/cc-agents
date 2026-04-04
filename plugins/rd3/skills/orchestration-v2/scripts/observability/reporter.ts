/**
 * orchestration-v2 - Report generation
 *
 * Generates pipeline reports in table, markdown, JSON, and summary formats.
 */

import type { ReportFormat } from '../model';
import type { RunSummary } from '../state/queries';
import { formatDuration, formatTokenCount } from './metrics';

export class Reporter {
    // biome-ignore lint/complexity/noUselessConstructor: V8 function coverage requires explicit constructor
    constructor() {}

    formatStatusTable(summary: RunSummary): string {
        const lines: string[] = [];
        const { run } = summary;
        const advisoryFailures = (summary.gateResults ?? []).filter((gate) => gate.advisory);

        lines.push(`Run: ${run.task_ref}  Status: ${run.status}`);
        lines.push(`Pipeline: ${run.pipeline_name}  Preset: ${run.preset ?? 'default'}`);

        lines.push('');
        lines.push('Phase             Status       Skill');
        lines.push('──────────────── ────────── ──────────────────────────');

        for (const phase of summary.phases) {
            lines.push(`${phase.name.padEnd(16)} ${phase.status.padEnd(10)} ${phase.skill}`);
        }

        lines.push('');
        lines.push(
            `Duration: ${formatDuration(summary.totalWallMs)}  Tokens: ${formatTokenCount(summary.totalInputTokens + summary.totalOutputTokens)}`,
        );

        if (summary.modelsUsed.length > 0) {
            lines.push(`Models: ${summary.modelsUsed.join(', ')}`);
        }
        if (advisoryFailures.length > 0) {
            lines.push(`Advisories: ${advisoryFailures.length}`);
        }

        return lines.join('\n');
    }

    formatMarkdownReport(summary: RunSummary): string {
        const { run } = summary;
        const lines: string[] = [];

        lines.push(`# Pipeline Report: ${run.task_ref}`);
        lines.push('');
        lines.push(`- **Task Reference:** ${run.task_ref}`);
        lines.push(`- **Run ID:** ${run.id}`);
        lines.push(`- **Status:** ${run.status}`);
        lines.push(`- **Pipeline:** ${run.pipeline_name}`);
        lines.push(`- **Preset:** ${run.preset ?? 'default'}`);
        lines.push(`- **Duration:** ${formatDuration(summary.totalWallMs)}`);
        lines.push(`- **Tokens:** ${formatTokenCount(summary.totalInputTokens + summary.totalOutputTokens)}`);
        lines.push('');

        lines.push('## Phases');
        lines.push('| Phase | Status | Skill |');
        lines.push('|-------|--------|-------|');
        for (const phase of summary.phases) {
            lines.push(`| ${phase.name} | ${phase.status} | ${phase.skill} |`);
        }

        if (summary.modelsUsed.length > 0) {
            lines.push('');
            lines.push('## Models Used');
            lines.push('');
            for (const model of summary.modelsUsed) {
                lines.push(`- ${model}`);
            }
        }

        const advisoryFailures = (summary.gateResults ?? []).filter((gate) => gate.advisory);
        if (advisoryFailures.length > 0) {
            lines.push('');
            lines.push('## Advisory Gate Failures');
            lines.push('');
            for (const gate of advisoryFailures) {
                const checklist = Array.isArray(gate.evidence?.checklist)
                    ? (gate.evidence?.checklist as Array<{ item?: string; passed?: boolean }>)
                    : [];
                const failedItems = checklist
                    .filter((item) => item.passed === false)
                    .map((item) => item.item ?? 'unknown');
                lines.push(`- **${gate.phase_name}** (${gate.step_name})`);
                if (failedItems.length > 0) {
                    lines.push(`  Failed items: ${failedItems.join(', ')}`);
                }
            }
        }

        return lines.join('\n');
    }

    formatJsonReport(summary: RunSummary): string {
        return JSON.stringify(summary, null, 2);
    }

    formatSummary(summary: RunSummary): string {
        const { run } = summary;
        const totalTokens = summary.totalInputTokens + summary.totalOutputTokens;
        const phaseLines = summary.phases.map(
            (p) => `  ${p.name}: ${p.status}${p.rework_iteration > 0 ? ` (rework: ${p.rework_iteration})` : ''}`,
        );
        return [
            `Run ${run.task_ref}: ${run.status}`,
            `  Pipeline: ${run.pipeline_name}  Preset: ${run.preset ?? 'default'}`,
            `  Duration: ${formatDuration(summary.totalWallMs)}  Tokens: ${formatTokenCount(totalTokens)}`,
            `  Phases: ${summary.phases.length} (${summary.phases.filter((p) => p.status === 'completed').length} completed)`,
            ...((summary.gateResults ?? []).filter((gate) => gate.advisory).length > 0
                ? [`  Advisory gates: ${(summary.gateResults ?? []).filter((gate) => gate.advisory).length}`]
                : []),
            ...phaseLines,
            ...(summary.modelsUsed.length > 0 ? [`  Models: ${summary.modelsUsed.join(', ')}`] : []),
        ].join('\n');
    }

    format(summary: RunSummary, fmt: ReportFormat): string {
        switch (fmt) {
            case 'table':
                return this.formatStatusTable(summary);
            case 'markdown':
                return this.formatMarkdownReport(summary);
            case 'json':
                return this.formatJsonReport(summary);
            case 'summary':
                return this.formatSummary(summary);
        }
    }

    formatTrendReport(trend: import('../state/queries').TrendReport): string {
        const lines: string[] = [];
        lines.push(`Pipeline Trends (last ${trend.periodDays} days)`);
        lines.push('  Overall Statistics:');
        lines.push(`    ${trend.totalRuns} runs | ${trend.successRate}% success rate`);

        if (trend.presets.length > 0) {
            lines.push('  By Preset:');
            for (const p of trend.presets) {
                const dur = formatDuration(p.avgDurationMs);
                lines.push(`    ${p.preset} (${p.totalRuns} runs, ${p.successRate}% success, avg ${dur})`);
            }
        }

        return lines.join('\n');
    }
}
