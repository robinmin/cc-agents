#!/usr/bin/env bun
/**
 * Report Validation Script
 * Ensures research reports meet quality standards before delivery
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { logger } from '../../../scripts/logger';

interface ValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

class ReportValidator {
    private reportPath: string;
    private content: string;
    private errors: string[] = [];
    private warnings: string[] = [];

    constructor(reportPath: string) {
        this.reportPath = reportPath;
        this.content = this.readReport();
    }

    private readReport(): string {
        try {
            return readFileSync(this.reportPath, 'utf-8');
        } catch (e) {
            logger.error(`Cannot read report: ${e}`);
            process.exit(1);
        }
    }

    validate(): ValidationResult {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`VALIDATING REPORT: ${this.reportPath.split('/').pop()}`);
        logger.log(`${'='.repeat(60)}\n`);

        const checks: Array<[string, () => boolean]> = [
            ['Executive Summary', () => this.checkExecutiveSummary()],
            ['Required Sections', () => this.checkRequiredSections()],
            ['Citations', () => this.checkCitations()],
            ['Bibliography', () => this.checkBibliography()],
            ['Placeholder Text', () => this.checkPlaceholders()],
            ['Content Truncation', () => this.checkContentTruncation()],
            ['Word Count', () => this.checkWordCount()],
            ['Source Count', () => this.checkSourceCount()],
            ['Broken Links', () => this.checkBrokenReferences()],
        ];

        for (const [checkName, checkFunc] of checks) {
            logger.log(`⏳ Checking: ${checkName}...`);
            const passed = checkFunc();
            logger.log(passed ? '✅ PASS' : '❌ FAIL');
        }

        this.printSummary();

        return {
            passed: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings,
        };
    }

    private checkExecutiveSummary(): boolean {
        const pattern = /## Executive Summary([\s\S]*?)(?=\n## |$)/i;
        const match = this.content.match(pattern);

        if (!match) {
            this.errors.push("Missing 'Executive Summary' section");
            return false;
        }

        const summary = match[1].trim();
        const wordCount = summary.split(/\s+/).length;

        if (wordCount > 400) {
            this.warnings.push(`Executive summary too long: ${wordCount} words (should be ≤400)`);
        }

        if (wordCount < 50) {
            this.warnings.push(`Executive summary too short: ${wordCount} words (should be ≥50)`);
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

        const missing: string[] = [];
        for (const section of required) {
            if (!new RegExp(`##.*${section}`, 'i').test(this.content)) {
                missing.push(section);
            }
        }

        if (missing.length > 0) {
            this.errors.push(`Missing sections: ${missing.join(', ')}`);
            return false;
        }

        const missingRecommended: string[] = [];
        for (const section of recommended) {
            if (!new RegExp(`##.*${section}`, 'i').test(this.content)) {
                missingRecommended.push(section);
            }
        }

        if (missingRecommended.length > 0) {
            this.warnings.push(`Missing recommended sections (for academic rigor): ${missingRecommended.join(', ')}`);
        }

        return true;
    }

    private checkCitations(): boolean {
        const citations = this.content.match(/\[(\d+)\]/g) || [];

        if (citations.length === 0) {
            this.errors.push('No citations found in report');
            return false;
        }

        const uniqueCitations = new Set(citations);

        if (uniqueCitations.size < 10) {
            this.warnings.push(`Only ${uniqueCitations.size} unique sources cited (recommended: ≥10)`);
        }

        // Check for consecutive citation numbers
        const citationNums = Array.from(uniqueCitations)
            .map((c) => parseInt(c.replace(/\[|\]/g, ''), 10))
            .sort((a, b) => a - b);

        if (citationNums.length > 0) {
            const maxCitation = Math.max(...citationNums);
            const expected = new Set(Array.from({ length: maxCitation }, (_, i) => i + 1));
            const missing = [...expected].filter((n) => !uniqueCitations.has(`[${n}]`));

            if (missing.length > 0) {
                this.warnings.push(`Non-consecutive citation numbers, missing: ${missing.join(', ')}`);
            }
        }

        return true;
    }

    private checkBibliography(): boolean {
        const pattern = /## Bibliography([\s\S]*?)(?=\n## |$)/i;
        const match = this.content.match(pattern);

        if (!match) {
            this.errors.push("Missing 'Bibliography' section");
            return false;
        }

        const bibSection = match[1];

        // Check for truncation placeholders
        const truncationPatterns: Array<[RegExp, string]> = [
            [/\[\d+-\d+\]/, 'Citation range (e.g., [8-75])'],
            [/Additional.*citations/i, 'Phrase "Additional citations"'],
            [/would be included/i, 'Phrase "would be included"'],
            [/\[\.\.\.continue/i, 'Pattern "[...continue"'],
            [/\[Continue with/i, 'Pattern "[Continue with"'],
            [/(?<![\w&)])etc\.(?!\w)/, 'Standalone "etc."'],
            [/and so on/i, 'Phrase "and so on"'],
        ];

        for (const [regex, description] of truncationPatterns) {
            if (regex.test(bibSection)) {
                this.errors.push(`⚠️ CRITICAL: Bibliography contains truncation placeholder: ${description}`);
                this.errors.push('   This makes the report UNUSABLE - complete bibliography required');
                return false;
            }
        }

        // Count bibliography entries
        const bibEntries = bibSection.match(/^\[(\d+)\]/gm) || [];

        if (bibEntries.length === 0) {
            this.errors.push('Bibliography has no entries');
            return false;
        }

        // Check citation number continuity
        const bibNums = bibEntries.map((e) => parseInt(e.replace(/\[|\]/g, ''), 10)).sort((a, b) => a - b);

        if (bibNums.length > 0) {
            const expected = Array.from({ length: bibNums[bibNums.length - 1] }, (_, i) => i + 1);
            const missing = expected.filter((n) => !bibNums.includes(n));

            if (missing.length > 0) {
                this.errors.push(`Bibliography has gaps in numbering: missing ${missing.join(', ')}`);
                return false;
            }
        }

        // Find citations in text
        const textCitations = new Set(this.content.match(/\[(\d+)\]/g) || []);
        const bibCitations = new Set(bibEntries);

        const missingInBib = [...textCitations].filter((c) => !bibCitations.has(c));

        if (missingInBib.length > 0) {
            this.errors.push(`Citations missing from bibliography: ${missingInBib.join(', ')}`);
            return false;
        }

        const unused = [...bibCitations].filter((c) => !textCitations.has(c));
        if (unused.length > 0) {
            this.warnings.push(`Unused bibliography entries: ${unused.join(', ')}`);
        }

        return true;
    }

    private checkPlaceholders(): boolean {
        const placeholders = [
            'TBD',
            'TODO',
            'FIXME',
            'XXX',
            '[citation needed]',
            '[needs citation]',
            '[placeholder]',
            '[TODO]',
            '[TBD]',
        ];

        const found: string[] = [];
        for (const placeholder of placeholders) {
            if (this.content.includes(placeholder)) {
                found.push(placeholder);
            }
        }

        if (found.length > 0) {
            this.errors.push(`Found placeholder text: ${found.join(', ')}`);
            return false;
        }

        return true;
    }

    private checkContentTruncation(): boolean {
        const truncationPatterns: Array<[RegExp, string]> = [
            [/Content continues/i, 'Phrase "Content continues"'],
            [/Due to length/i, 'Phrase "Due to length"'],
            [/would continue/i, 'Phrase "would continue"'],
            [/\[Sections \d+-\d+/i, 'Pattern "[Sections X-Y"'],
            [/Additional sections/i, 'Phrase "Additional sections"'],
            [/comprehensive.*word document that continues/i, 'Pattern "comprehensive...document that continues"'],
        ];

        for (const [regex, description] of truncationPatterns) {
            if (regex.test(this.content)) {
                this.errors.push(`⚠️ CRITICAL: Content truncation detected: ${description}`);
                this.errors.push('   Report is INCOMPLETE and UNUSABLE - regenerate with progressive assembly');
                return false;
            }
        }

        return true;
    }

    private checkWordCount(): boolean {
        const wordCount = this.content.split(/\s+/).length;

        if (wordCount < 500) {
            this.warnings.push(`Report is very short: ${wordCount} words (consider expanding)`);
        }

        return true;
    }

    private checkSourceCount(): boolean {
        const pattern = /## Bibliography([\s\S]*?)(?=\n## |$)/i;
        const match = this.content.match(pattern);

        if (!match) {
            return true; // Already caught in bibliography check
        }

        const bibSection = match[1];
        const bibEntries = bibSection.match(/^\[(\d+)\]/gm) || [];
        const sourceCount = new Set(bibEntries).size;

        if (sourceCount < 10) {
            this.warnings.push(`Only ${sourceCount} sources (recommended: ≥10)`);
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
            this.errors.push(`Broken internal links: ${broken.join(', ')}`);
            return false;
        }

        return true;
    }

    private printSummary(): void {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`VALIDATION SUMMARY`);
        logger.log(`${'='.repeat(60)}\n`);

        if (this.errors.length > 0) {
            logger.log(`❌ ERRORS (${this.errors.length}):`);
            for (const error of this.errors) {
                logger.log(`   • ${error}`);
            }
            logger.log();
        }

        if (this.warnings.length > 0) {
            logger.log(`⚠️  WARNINGS (${this.warnings.length}):`);
            for (const warning of this.warnings) {
                logger.log(`   • ${warning}`);
            }
            logger.log();
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            logger.log('✅ ALL CHECKS PASSED - Report meets quality standards!\n');
        } else if (this.errors.length === 0) {
            logger.log('✅ VALIDATION PASSED (with warnings)\n');
        } else {
            logger.log('❌ VALIDATION FAILED - Please fix errors before delivery\n');
        }
    }
}

function main(): void {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        logger.log('Usage: validate_report.ts --report <path>');
        logger.log('       validate_report.ts -r <path>');
        logger.log('\nExamples:');
        logger.log('  bun validate_report.ts --report report.md');
        logger.log('  bun validate_report.ts -r ~/.claude/research_output/research_report.md');
        process.exit(0);
    }

    let reportPath: string | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--report' || args[i] === '-r') {
            reportPath = args[i + 1];
            break;
        }
    }

    if (!reportPath) {
        logger.error('Error: --report argument is required');
        process.exit(1);
    }

    const validator = new ReportValidator(reportPath);
    const result = validator.validate();

    process.exit(result.passed ? 0 : 1);
}

export type { ValidationResult };
export { ReportValidator };

if (import.meta.main) {
    main();
}
