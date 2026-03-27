#!/usr/bin/env bun
/**
 * HTML Report Verification Script
 * Validates that HTML reports are properly generated with all sections from MD
 */

import { logger } from '../../../scripts/logger';
import { parseCli } from '../../../scripts/libs/cli-args';
import { readFile } from '../../../scripts/utils';
import { ValidationRunner, type ValidationReport } from '../../../scripts/libs/validation-runner';
import { PLACEHOLDER_STRINGS, CITATION_REF_PATTERN } from '../../../scripts/libs/research-patterns';

class HTMLVerifier {
    private htmlPath: string;
    private mdPath: string;
    private runner = new ValidationRunner();

    constructor(htmlPath: string, mdPath: string) {
        this.htmlPath = htmlPath;
        this.mdPath = mdPath;
    }

    verify(): ValidationReport {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`HTML REPORT VERIFICATION`);
        logger.log(`${'='.repeat(60)}\n`);

        logger.log(`HTML File: ${this.htmlPath}`);
        logger.log(`MD File: ${this.mdPath}\n`);

        // Read files
        let htmlContent: string;
        let mdContent: string;
        try {
            htmlContent = readFile(this.htmlPath);
            mdContent = readFile(this.mdPath);
        } catch (e) {
            this.runner.addError(`Failed to read files: ${e}`);
            return this.runner.getReport();
        }

        // Run checks
        this.checkSections(htmlContent, mdContent);
        this.checkNoPlaceholders(htmlContent);
        this.checkNoEmojis(htmlContent);
        this.checkStructure(htmlContent);
        this.checkCitations(htmlContent, mdContent);
        this.checkBibliography(htmlContent, mdContent);

        // Report results
        this.runner.printSummary();

        return this.runner.getReport();
    }

    private checkSections(html: string, md: string): void {
        // Extract section headings from markdown
        const mdSections = md.match(/^## (.+)$/gm) || [];

        // Extract sections from HTML
        const htmlSections = html.match(/<h2 class="section-title">(.+?)<\/h2>/g) || [];

        // Check for placeholder sections
        const placeholderSections = html.match(/<div class="section">#<\/div>/g) || [];

        if (placeholderSections.length > 0) {
            this.runner.addError(
                `Found ${placeholderSections.length} placeholder sections (empty '#' divs) - content not converted properly`,
            );
        }

        // Compare section counts
        if (mdSections.length > htmlSections.length + 1) {
            this.runner.addError(
                `Section count mismatch: MD has ${mdSections.length} sections, HTML has only ${htmlSections.length} + bibliography`,
            );
        }

        // Verify Executive Summary is present
        if (md.includes('Executive Summary') && !html.includes('Executive Summary')) {
            this.runner.addError('Executive Summary missing from HTML');
        }
    }

    private checkNoPlaceholders(html: string): void {
        // Template variable placeholders (HTML-specific)
        const templateVars = ['{{TITLE}}', '{{DATE}}', '{{CONTENT}}', '{{BIBLIOGRAPHY}}', '{{METRICS_DASHBOARD}}', '{{SOURCE_COUNT}}'];
        // Combine with shared placeholder strings
        const allPlaceholders = [...templateVars, ...PLACEHOLDER_STRINGS.filter((p) => !p.startsWith('['))];

        const found = allPlaceholders.filter((p) => html.includes(p));
        if (found.length > 0) {
            this.runner.addError(`Found unreplaced placeholders: ${found.join(', ')}`);
        }
    }

    private checkNoEmojis(html: string): void {
        // Common emoji patterns
        const emojiPattern =
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}]/u;

        const emojis = html.match(emojiPattern);
        if (emojis && emojis.length > 0) {
            const uniqueEmojis = new Set(emojis);
            this.runner.addError(`Found ${emojis.length} emojis in HTML (should be none): ${[...uniqueEmojis].join(' ')}`);
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
                this.runner.addError(`Missing ${name} in HTML`);
            }
        }

        // Check for unclosed tags
        const openDivs = (html.match(/<div/g) || []).length;
        const closeDivs = (html.match(/<\/div>/g) || []).length;

        if (Math.abs(openDivs - closeDivs) > 2) {
            this.runner.addWarning(`Possible unclosed divs: ${openDivs} opening tags, ${closeDivs} closing tags`);
        }
    }

    private checkCitations(html: string, md: string): void {
        const mdCitations = new Set(md.match(CITATION_REF_PATTERN) || []);

        // Extract citations from HTML (excluding bibliography)
        const htmlContent = html.split('class="bibliography"')[0] || html;
        const htmlCitations = new Set(htmlContent.match(CITATION_REF_PATTERN) || []);

        if (mdCitations.size > 0 && htmlCitations.size === 0) {
            this.runner.addError('No citations found in HTML content (but present in MD)');
        }

        if (mdCitations.size > htmlCitations.size * 1.5) {
            this.runner.addWarning(`Fewer citations in HTML (${htmlCitations.size}) than MD (${mdCitations.size})`);
        }
    }

    private checkBibliography(html: string, md: string): void {
        if (md.includes('## Bibliography')) {
            if (!html.includes('class="bibliography"')) {
                this.runner.addError('Bibliography section missing from HTML');
            } else if (!html.includes('class="bib-entry"')) {
                this.runner.addWarning('Bibliography present but entries not properly formatted');
            }
        }
    }

}

export { HTMLVerifier };

function main(): void {
    const { values } = parseCli({
        name: 'verify_html.ts',
        description: 'Validate HTML reports match source markdown',
        options: {
            html: { type: 'string', required: true },
            md: { type: 'string', required: true },
        },
        examples: ['bun verify_html.ts --html report.html --md report.md'],
    });

    const verifier = new HTMLVerifier(values.html as string, values.md as string);
    const result = verifier.verify();

    process.exit(result.passed ? 0 : 1);
}

if (import.meta.main) {
    main();
}
