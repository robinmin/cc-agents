#!/usr/bin/env bun
/**
 * Report Validation Script
 * Ensures research reports meet quality standards before delivery
 */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '../../../scripts/logger';
import { parseCli } from '../../../scripts/libs/cli-args';
import { readFile } from '../../../scripts/utils';
import { ValidationRunner, type ValidationReport } from '../../../scripts/libs/validation-runner';
import {
    CITATION_REF_PATTERN,
    BIBLIOGRAPHY_SECTION_PATTERN,
    findPlaceholders,
    findTruncationPatterns,
    findBibliographyTruncationPatterns,
    extractBibliographySection,
    extractCitationNumbers,
} from '../../../scripts/libs/research-patterns';

class ReportValidator {
    private reportPath: string;
    private content: string;
    private runner = new ValidationRunner();

    constructor(reportPath: string) {
        this.reportPath = reportPath;
        this.content = this.readReport();
    }

    private readReport(): string {
        try {
            return readFile(this.reportPath);
        } catch (e) {
            logger.error(`Cannot read report: ${e}`);
            process.exit(1);
        }
    }

    validate(): ValidationReport {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`VALIDATING REPORT: ${this.reportPath.split('/').pop()}`);
        logger.log(`${'='.repeat(60)}\n`);

        const report = this.runner.runChecks([
            ['Executive Summary', () => this.checkExecutiveSummary()],
            ['Required Sections', () => this.checkRequiredSections()],
            ['Citations', () => this.checkCitations()],
            ['Bibliography', () => this.checkBibliography()],
            ['Placeholder Text', () => this.checkPlaceholders()],
            ['Content Truncation', () => this.checkContentTruncation()],
            ['Word Count', () => this.checkWordCount()],
            ['Source Count', () => this.checkSourceCount()],
            ['Broken Links', () => this.checkBrokenReferences()],
        ]);

        this.runner.printSummary();
        return report;
    }

    private checkExecutiveSummary(): boolean {
        const pattern = /## Executive Summary([\s\S]*?)(?=\n## |$)/i;
        const match = this.content.match(pattern);

        if (!match) {
            this.runner.addError("Missing 'Executive Summary' section");
            return false;
        }

        const summary = match[1].trim();
        const wordCount = summary.split(/\s+/).length;

        if (wordCount > 400) {
            this.runner.addWarning(`Executive summary too long: ${wordCount} words (should be ≤400)`);
        }

        if (wordCount < 50) {
            this.runner.addWarning(`Executive summary too short: ${wordCount} words (should be ≥50)`);
        }

        return true;
    }

    private checkRequiredSections(): boolean {
        const required = [
            'Executive Summary',
            'Introduction',
            'Main Analysis',
            'Synthesis',
            'Limitations',
            'Recommendations',
            'Bibliography',
            'Methodology',
        ];

        const recommended = ['Counterevidence Register', 'Claims-Evidence Table'];

        const missing = required.filter((s) => !new RegExp(`##.*${s}`, 'i').test(this.content));
        if (missing.length > 0) {
            this.runner.addError(`Missing sections: ${missing.join(', ')}`);
            return false;
        }

        const missingRecommended = recommended.filter((s) => !new RegExp(`##.*${s}`, 'i').test(this.content));
        if (missingRecommended.length > 0) {
            this.runner.addWarning(
                `Missing recommended sections (for academic rigor): ${missingRecommended.join(', ')}`,
            );
        }

        return true;
    }

    private checkCitations(): boolean {
        const citations = this.content.match(CITATION_REF_PATTERN) || [];

        if (citations.length === 0) {
            this.runner.addError('No citations found in report');
            return false;
        }

        const uniqueCitations = new Set(citations);

        if (uniqueCitations.size < 10) {
            this.runner.addWarning(`Only ${uniqueCitations.size} unique sources cited (recommended: ≥10)`);
        }

        // Check for consecutive citation numbers
        const citationNums = extractCitationNumbers(this.content);

        if (citationNums.length > 0) {
            const maxCitation = Math.max(...citationNums);
            const expected = new Set(Array.from({ length: maxCitation }, (_, i) => i + 1));
            const missing = [...expected].filter((n) => !uniqueCitations.has(`[${n}]`));

            if (missing.length > 0) {
                this.runner.addWarning(`Non-consecutive citation numbers, missing: ${missing.join(', ')}`);
            }
        }

        return true;
    }

    private checkBibliography(): boolean {
        const bibSection = extractBibliographySection(this.content);

        if (!this.content.match(BIBLIOGRAPHY_SECTION_PATTERN)) {
            this.runner.addError("Missing 'Bibliography' section");
            return false;
        }

        // Check for truncation placeholders
        const bibTruncations = findBibliographyTruncationPatterns(bibSection);
        if (bibTruncations.length > 0) {
            this.runner.addError(`CRITICAL: Bibliography contains truncation placeholder: ${bibTruncations[0]}`);
            this.runner.addError('   This makes the report UNUSABLE - complete bibliography required');
            return false;
        }

        // Count bibliography entries
        const bibEntries = bibSection.match(/^\[(\d+)\]/gm) || [];

        if (bibEntries.length === 0) {
            this.runner.addError('Bibliography has no entries');
            return false;
        }

        // Check citation number continuity
        const bibNums = bibEntries.map((e) => parseInt(e.replace(/\[|\]/g, ''), 10)).sort((a, b) => a - b);

        if (bibNums.length > 0) {
            const expected = Array.from({ length: bibNums[bibNums.length - 1] }, (_, i) => i + 1);
            const missing = expected.filter((n) => !bibNums.includes(n));

            if (missing.length > 0) {
                this.runner.addError(`Bibliography has gaps in numbering: missing ${missing.join(', ')}`);
                return false;
            }
        }

        // Find citations in text
        const textCitations = new Set(this.content.match(CITATION_REF_PATTERN) || []);
        const bibCitations = new Set(bibEntries);

        const missingInBib = [...textCitations].filter((c) => !bibCitations.has(c));

        if (missingInBib.length > 0) {
            this.runner.addError(`Citations missing from bibliography: ${missingInBib.join(', ')}`);
            return false;
        }

        const unused = [...bibCitations].filter((c) => !textCitations.has(c));
        if (unused.length > 0) {
            this.runner.addWarning(`Unused bibliography entries: ${unused.join(', ')}`);
        }

        return true;
    }

    private checkPlaceholders(): boolean {
        const found = findPlaceholders(this.content);

        if (found.length > 0) {
            this.runner.addError(`Found placeholder text: ${found.join(', ')}`);
            return false;
        }

        return true;
    }

    private checkContentTruncation(): boolean {
        const found = findTruncationPatterns(this.content);

        if (found.length > 0) {
            this.runner.addError(`CRITICAL: Content truncation detected: ${found[0]}`);
            this.runner.addError('   Report is INCOMPLETE and UNUSABLE - regenerate with progressive assembly');
            return false;
        }

        return true;
    }

    private checkWordCount(): boolean {
        const wordCount = this.content.split(/\s+/).length;

        if (wordCount < 500) {
            this.runner.addWarning(`Report is very short: ${wordCount} words (consider expanding)`);
        }

        return true;
    }

    private checkSourceCount(): boolean {
        const bibSection = extractBibliographySection(this.content);

        if (!bibSection) {
            return true; // Already caught in bibliography check
        }

        const bibEntries = bibSection.match(/^\[(\d+)\]/gm) || [];
        const sourceCount = new Set(bibEntries).size;

        if (sourceCount < 10) {
            this.runner.addWarning(`Only ${sourceCount} sources (recommended: ≥10)`);
        }

        return true;
    }

    private checkBrokenReferences(): boolean {
        const internalLinks = this.content.match(/\[.*?\]\(\.\/(.*?)\)/g) || [];
        const reportDir = dirname(this.reportPath);

        const broken: string[] = [];
        for (const link of internalLinks) {
            const match = link.match(/\(\.\/(.*?)\)/);
            if (match) {
                const linkPath = match[1].split('#')[0];
                if (linkPath) {
                    const fullPath = join(reportDir, linkPath);
                    if (!existsSync(fullPath)) {
                        broken.push(link);
                    }
                }
            }
        }

        if (broken.length > 0) {
            this.runner.addError(`Broken internal links: ${broken.join(', ')}`);
            return false;
        }

        return true;
    }
}

export type { ValidationReport as ValidationResult };
export { ReportValidator };

function main(): void {
    const { values } = parseCli({
        name: 'validate_report.ts',
        description: 'Validate research report quality before delivery',
        options: {
            report: { type: 'string', short: 'r', required: true },
        },
        examples: [
            'bun validate_report.ts --report report.md',
            'bun validate_report.ts -r ~/.claude/research_output/research_report.md',
        ],
    });

    const validator = new ReportValidator(values.report as string);
    const result = validator.validate();

    process.exit(result.passed ? 0 : 1);
}

if (import.meta.main) {
    main();
}
