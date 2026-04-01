/**
 * orchestration-v2 — Report output
 *
 * Handles report output formatting and file writing.
 */

import type { ReportFormat } from '../model';
import type { RunSummary } from '../state/queries';
import { Reporter } from '../observability/reporter';
import { logger } from '../../../../scripts/logger';

export function outputReport(summary: RunSummary, format: ReportFormat, outputPath?: string): void {
    const reporter = new Reporter();
    const content = reporter.format(summary, format);

    if (outputPath) {
        Bun.write(outputPath, content);
        logger.info(`Report written to ${outputPath}`);
    } else {
        process.stdout.write(`${content}\n`);
    }
}
