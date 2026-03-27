#!/usr/bin/env bun
/**
 * HTML Report Verification Script
 * Validates that HTML reports are properly generated with all sections from MD
 */

import { readFileSync } from 'node:fs';
import { logger } from '../../../scripts/logger';

interface VerificationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

class HTMLVerifier {
    private htmlPath: string;
    private mdPath: string;
    private errors: string[] = [];
    private warnings: string[] = [];

    constructor(htmlPath: string, mdPath: string) {
        this.htmlPath = htmlPath;
        this.mdPath = mdPath;
    }

    verify(): VerificationResult {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`HTML REPORT VERIFICATION`);
        logger.log(`${'='.repeat(60)}\n`);

        logger.log(`HTML File: ${this.htmlPath}`);
        logger.log(`MD File: ${this.mdPath}\n`);

        // Read files
        let htmlContent: string;
        let mdContent: string;
        try {
            htmlContent = readFileSync(this.htmlPath, 'utf-8');
            mdContent = readFileSync(this.mdPath, 'utf-8');
        } catch (e) {
            this.errors.push(`Failed to read files: ${e}`);
            return { passed: false, errors: this.errors, warnings: this.warnings };
        }

        // Run checks
        this.checkSections(htmlContent, mdContent);
        this.checkNoPlaceholders(htmlContent);
        this.checkNoEmojis(htmlContent);
        this.checkStructure(htmlContent);
        this.checkCitations(htmlContent, mdContent);
        this.checkBibliography(htmlContent, mdContent);

        // Report results
        this.printResults();

        return { passed: this.errors.length === 0, errors: this.errors, warnings: this.warnings };
    }

    private checkSections(html: string, md: string): void {
        // Extract section headings from markdown
        const mdSections = md.match(/^## (.+)$/gm) || [];

        // Extract sections from HTML
        const htmlSections = html.match(/<h2 class="section-title">(.+?)<\/h2>/g) || [];

        // Check for placeholder sections
        const placeholderSections = html.match(/<div class="section">#<\/div>/g) || [];

        if (placeholderSections.length > 0) {
            this.errors.push(
                `Found ${placeholderSections.length} placeholder sections (empty '#' divs) - content not converted properly`,
            );
        }

        // Compare section counts
        if (mdSections.length > htmlSections.length + 1) {
            this.errors.push(
                `Section count mismatch: MD has ${mdSections.length} sections, HTML has only ${htmlSections.length} + bibliography`,
            );
        }

        // Verify Executive Summary is present
        if (md.includes('Executive Summary') && !html.includes('Executive Summary')) {
            this.errors.push('Executive Summary missing from HTML');
        }
    }

    private checkNoPlaceholders(html: string): void {
        const placeholders = [
            '{{TITLE}}',
            '{{DATE}}',
            '{{CONTENT}}',
            '{{BIBLIOGRAPHY}}',
            '{{METRICS_DASHBOARD}}',
            '{{SOURCE_COUNT}}',
            'TODO',
            'TBD',
            'PLACEHOLDER',
            'FIXME',
        ];

        const found: string[] = [];
        for (const placeholder of placeholders) {
            if (html.includes(placeholder)) {
                found.push(placeholder);
            }
        }

        if (found.length > 0) {
            this.errors.push(`Found unreplaced placeholders: ${found.join(', ')}`);
        }
    }

    private checkNoEmojis(html: string): void {
        // Common emoji patterns
        const emojiPattern =
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/u;

        const emojis = html.match(emojiPattern);
        if (emojis && emojis.length > 0) {
            const uniqueEmojis = new Set(emojis);
            this.errors.push(`Found ${emojis.length} emojis in HTML (should be none): ${[...uniqueEmojis].join(' ')}`);
        }
    }

    private checkStructure(html: string): void {
        const requiredElements: Array<[string, string]> = [
            ['<html', 'HTML tag'],
            ['<head', 'head tag'],
            ['<body', 'body tag'],
            ['<title>', 'title tag'],
            ['class="header"', 'header section'],
            ['class="content"', 'content section'],
            ['class="bibliography"', 'bibliography section'],
        ];

        for (const [element, name] of requiredElements) {
            if (!html.includes(element)) {
                this.errors.push(`Missing ${name} in HTML`);
            }
        }

        // Check for unclosed tags
        const openDivs = (html.match(/<div/g) || []).length;
        const closeDivs = (html.match(/<\/div>/g) || []).length;

        if (Math.abs(openDivs - closeDivs) > 2) {
            this.warnings.push(`Possible unclosed divs: ${openDivs} opening tags, ${closeDivs} closing tags`);
        }
    }

    private checkCitations(html: string, md: string): void {
        const mdCitations = new Set(md.match(/\[(\d+)\]/g) || []);

        // Extract citations from HTML (excluding bibliography)
        const htmlContent = html.split('class="bibliography"')[0] || html;
        const htmlCitations = new Set(htmlContent.match(/\[(\d+)\]/g) || []);

        if (mdCitations.size > 0 && htmlCitations.size === 0) {
            this.errors.push('No citations found in HTML content (but present in MD)');
        }

        if (mdCitations.size > htmlCitations.size * 1.5) {
            this.warnings.push(`Fewer citations in HTML (${htmlCitations.size}) than MD (${mdCitations.size})`);
        }
    }

    private checkBibliography(html: string, md: string): void {
        if (md.includes('## Bibliography')) {
            if (!html.includes('class="bibliography"')) {
                this.errors.push('Bibliography section missing from HTML');
            } else if (!html.includes('class="bib-entry"')) {
                this.warnings.push('Bibliography present but entries not properly formatted');
            }
        }
    }

    private printResults(): void {
        logger.log(`\n${'-'.repeat(60)}`);
        logger.log('VERIFICATION RESULTS');
        logger.log(`${'-'.repeat(60)}\n`);

        if (this.errors.length > 0) {
            logger.log(`❌ ERRORS (${this.errors.length}):`);
            for (let i = 0; i < this.errors.length; i++) {
                logger.log(`  ${i + 1}. ${this.errors[i]}`);
            }
            logger.log();
        }

        if (this.warnings.length > 0) {
            logger.log(`⚠️  WARNINGS (${this.warnings.length}):`);
            for (let i = 0; i < this.warnings.length; i++) {
                logger.log(`  ${i + 1}. ${this.warnings[i]}`);
            }
            logger.log();
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            logger.log('✅ All checks passed! HTML report is valid.\n');
        }

        logger.log(`${'-'.repeat(60)}\n`);
    }
}

function main(): void {
    const args = process.argv.slice(2);

    if (args.length < 4 || args[0] === '--help' || args[0] === '-h') {
        logger.log('Usage: verify_html.ts --html <path> --md <path>');
        logger.log('\nExamples:');
        logger.log('  bun verify_html.ts --html report.html --md report.md');
        process.exit(0);
    }

    let htmlPath: string | null = null;
    let mdPath: string | null = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--html') {
            htmlPath = args[i + 1];
        } else if (args[i] === '--md') {
            mdPath = args[i + 1];
        }
    }

    if (!htmlPath || !mdPath) {
        logger.error('Error: both --html and --md arguments are required');
        process.exit(1);
    }

    const verifier = new HTMLVerifier(htmlPath, mdPath);
    const result = verifier.verify();

    process.exit(result.passed ? 0 : 1);
}

main();
