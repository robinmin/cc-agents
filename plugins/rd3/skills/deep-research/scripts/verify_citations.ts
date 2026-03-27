#!/usr/bin/env bun
/**
 * Citation Verification Script
 *
 * Catches fabricated citations by checking:
 * 1. DOI resolution (via doi.org)
 * 2. Basic metadata matching (title similarity, year match)
 * 3. URL accessibility verification
 * 4. Hallucination pattern detection (generic titles, suspicious patterns)
 * 5. Flags suspicious entries for manual review
 *
 * Usage:
 *   bun verify_citations.ts --report [path]
 *   bun verify_citations.ts --report [path] --strict
 */

import { readFileSync } from 'node:fs';
import { logger } from '../../../scripts/logger';

interface BibliographyEntry {
    num: string;
    raw: string;
    year: string | null;
    title: string | null;
    doi: string | null;
    url: string | null;
}

interface VerificationResult {
    num: string;
    status: string;
    issues: string[];
    metadata: Record<string, unknown>;
    verificationMethods: string[];
}

interface DOIResponse {
    title?: string;
    issued?: { 'date-parts'?: number[][] };
    author?: Array<{ family?: string; given?: string }>;
    'container-title'?: string;
}

class CitationVerifier {
    private reportPath: string;
    private strictMode: boolean;
    private content: string;
    private errors: string[] = [];
    private suspiciousPatterns: Array<[RegExp, string]>;

    constructor(reportPath: string, strictMode = false) {
        this.reportPath = reportPath;
        this.strictMode = strictMode;
        this.content = this.readReport();
        this.suspiciousPatterns = [
            // Generic academic-sounding but fake patterns
            [
                /^(A |An |The )?(Study|Analysis|Review|Survey|Investigation) (of|on|into)/i,
                'Generic academic title pattern',
            ],
            [
                /^(Recent|Current|Modern|Contemporary) (Advances|Developments|Trends) in/i,
                "Generic 'advances' title pattern",
            ],
            // Too perfect, templated titles
            [
                /^[A-Z][a-z]+ [A-Z][a-z]+: A (Comprehensive|Complete|Systematic) (Review|Analysis|Guide)$/,
                'Too perfect, templated structure',
            ],
        ];
    }

    private readReport(): string {
        try {
            return readFileSync(this.reportPath, 'utf-8');
        } catch (e) {
            logger.error(`Cannot read report: ${e}`);
            process.exit(1);
        }
    }

    extractBibliography(): BibliographyEntry[] {
        const pattern = /## Bibliography([\s\S]*?)(?=\n## |$)/i;
        const match = this.content.match(pattern);

        if (!match) {
            this.errors.push('No Bibliography section found');
            return [];
        }

        const bibSection = match[1];
        const entries: BibliographyEntry[] = [];
        const lines = bibSection.trim().split('\n');

        let currentEntry: BibliographyEntry | null = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            // Check if starts with citation number [N]
            const matchNum = trimmedLine.match(/^\[(\d+)\]\s+(.+)$/);
            if (matchNum) {
                if (currentEntry) {
                    entries.push(currentEntry);
                }

                const num = matchNum[1];
                const rest = matchNum[2];

                // Try to parse: Author (Year). "Title". Venue. URL
                const yearMatch = rest.match(/\((\d{4})\)/);
                const titleMatch = rest.match(/"([^"]+)"/);
                const doiMatch = rest.match(/doi\.org\/(10\.\S+)/);
                const urlMatch = rest.match(/https?:\/\/[^\s)]+/);

                currentEntry = {
                    num,
                    raw: rest,
                    year: yearMatch ? yearMatch[1] : null,
                    title: titleMatch ? titleMatch[1] : null,
                    doi: doiMatch ? doiMatch[1] : null,
                    url: urlMatch ? urlMatch[0] : null,
                };
            } else if (currentEntry) {
                // Multi-line entry, append to raw
                currentEntry.raw += ` ${trimmedLine}`;
            }
        }

        if (currentEntry) {
            entries.push(currentEntry);
        }

        return entries;
    }

    private async verifyDoi(doi: string): Promise<[boolean, Record<string, unknown>]> {
        if (!doi) return [false, {}];

        try {
            const response = await fetch(`https://doi.org/${encodeURIComponent(doi)}`, {
                headers: {
                    Accept: 'application/vnd.citationstyles.csl+json',
                },
            });

            if (response.status === 404) {
                return [false, { error: 'DOI not found (404)' }];
            }

            if (!response.ok) {
                return [false, { error: `HTTP ${response.status}` }];
            }

            const data = (await response.json()) as DOIResponse;

            return [
                true,
                {
                    title: data.title || '',
                    year: data.issued?.['date-parts']?.[0]?.[0] || null,
                    authors: (data.author || []).map((a) => `${a.given || ''} ${a.family || ''}`.trim()),
                    venue: data['container-title'] || '',
                },
            ];
        } catch (e) {
            return [false, { error: String(e) }];
        }
    }

    private async verifyUrl(url: string): Promise<[boolean, string]> {
        if (!url) return [false, 'No URL'];

        try {
            const response = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Research Citation Verifier)',
                },
            });

            if (response.ok) {
                return [true, 'URL accessible'];
            }
            return [false, `HTTP ${response.status}`];
        } catch (e) {
            return [false, `Connection error: ${String(e).slice(0, 50)}`];
        }
    }

    private detectHallucinationPatterns(entry: BibliographyEntry): string[] {
        const issues: string[] = [];
        const title = entry.title || '';

        if (!title) return issues;

        // Check against suspicious patterns
        for (const [pattern, description] of this.suspiciousPatterns) {
            if (pattern.test(title)) {
                issues.push(`Suspicious title pattern: ${description}`);
            }
        }

        // Check for overly generic titles
        const genericWords = ['overview', 'introduction', 'guide', 'handbook', 'manual'];
        if (genericWords.some((word) => title.toLowerCase().includes(word)) && title.split(' ').length < 5) {
            issues.push('Very generic short title');
        }

        // Check for placeholder-like titles
        if (['tbd', 'todo', 'placeholder', 'example'].some((x) => title.toLowerCase().includes(x))) {
            issues.push('Placeholder text in title');
        }

        // Check for inconsistent metadata
        if (entry.year) {
            const year = parseInt(entry.year, 10);
            const currentYear = new Date().getFullYear();
            // Very recent without DOI or URL is suspicious
            if (year >= currentYear - 1 && !entry.doi && !entry.url) {
                issues.push(`Recent year (${year}) with no verification method`);
            }
            // Future year is definitely wrong
            if (year > currentYear) {
                issues.push(`Future year: ${year} (current: ${currentYear})`);
            }
            // Very old with modern phrasing is suspicious
            if (year < 2000 && ['ai', 'llm', 'gpt', 'transformer'].some((word) => title.toLowerCase().includes(word))) {
                issues.push(`Anachronistic: pre-2000 (${year}) citation mentioning modern AI terms`);
            }
        }

        return issues;
    }

    private checkTitleSimilarity(title1: string, title2: string): number {
        if (!title1 || !title2) return 0.0;

        // Normalize: lowercase, remove punctuation, split
        const normalize = (s: string): Set<string> => {
            const normalized = s
                .toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(Boolean);
            return new Set(normalized);
        };

        const words1 = normalize(title1);
        const words2 = normalize(title2);

        if (words1.size === 0 || words2.size === 0) return 0.0;

        const overlap = new Set([...words1].filter((x) => words2.has(x))).size;
        const total = new Set([...words1, ...words2]).size;

        return total > 0 ? overlap / total : 0.0;
    }

    private async verifyEntry(entry: BibliographyEntry): Promise<VerificationResult> {
        const result: VerificationResult = {
            num: entry.num,
            status: 'unknown',
            issues: [],
            metadata: {},
            verificationMethods: [],
        };

        // STEP 1: Run hallucination detection
        const hallucinationIssues = this.detectHallucinationPatterns(entry);
        if (hallucinationIssues.length > 0) {
            result.issues.push(...hallucinationIssues);
            result.status = 'suspicious';
        }

        // STEP 2: Has DOI?
        if (entry.doi) {
            logger.log(`  [${entry.num}] Checking DOI ${entry.doi}...`);
            const [success, metadata] = await this.verifyDoi(entry.doi);

            if (success) {
                result.metadata = metadata;
                result.status = 'verified';
                logger.log('✅');

                // Check title similarity if we have both
                if (entry.title && (metadata.title as string)) {
                    const similarity = this.checkTitleSimilarity(entry.title, metadata.title as string);

                    if (similarity < 0.5) {
                        result.issues.push(`Title mismatch (similarity: ${(similarity * 100).toFixed(1)}%)`);
                        result.status = 'suspicious';
                    }
                }

                // Check year match
                if (entry.year && (metadata.year as number | null)) {
                    if (parseInt(entry.year, 10) !== (metadata.year as number)) {
                        result.issues.push(`Year mismatch: report says ${entry.year}, DOI says ${metadata.year}`);
                        result.status = 'suspicious';
                    }
                }
            } else {
                logger.log(`❌ ${metadata.error || 'Failed'}`);
                result.status = 'unverified';
                result.issues.push(`DOI resolution failed: ${metadata.error || 'unknown'}`);
            }
        }

        // STEP 3: Check URL accessibility
        if (entry.url && result.status !== 'verified') {
            const [urlOk, urlStatus] = await this.verifyUrl(entry.url);
            if (urlOk) {
                result.verificationMethods.push('URL');
                if (['unknown', 'no_doi', 'unverified'].includes(result.status)) {
                    result.status = 'url_verified';
                }
                logger.log(`  [${entry.num}] URL accessible ✅`);
            } else {
                result.issues.push(`URL check failed: ${urlStatus}`);
            }
        }

        // STEP 4: Final fallback - no verification method
        if (!entry.doi && !entry.url) {
            if (!result.issues.some((i) => i.includes('No DOI'))) {
                result.issues.push('No DOI or URL - cannot verify');
            }
            result.status = 'suspicious';
        }

        return result;
    }

    async verifyAll(): Promise<boolean> {
        logger.log(`\n${'='.repeat(60)}`);
        logger.log(`CITATION VERIFICATION: ${this.reportPath.split('/').pop()}`);
        logger.log(`${'='.repeat(60)}\n`);

        const entries = this.extractBibliography();

        if (entries.length === 0) {
            logger.log('❌ No bibliography entries found\n');
            return false;
        }

        logger.log(`Found ${entries.length} citations\n`);

        const results: VerificationResult[] = [];
        for (const entry of entries) {
            const result = await this.verifyEntry(entry);
            results.push(result);

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Summarize
        logger.log(`\n${'='.repeat(60)}`);
        logger.log('VERIFICATION SUMMARY');
        logger.log(`${'='.repeat(60)}\n`);

        const verified = results.filter((r) => r.status === 'verified');
        const urlVerified = results.filter((r) => r.status === 'url_verified');
        const suspicious = results.filter((r) => r.status === 'suspicious');
        const unverified = results.filter((r) => ['unverified', 'no_doi', 'unknown'].includes(r.status));

        logger.log(`DOI Verified: ${verified.length}/${results.length}`);
        logger.log(`URL Verified: ${urlVerified.length}/${results.length}`);
        logger.log(`Suspicious: ${suspicious.length}/${results.length}`);
        logger.log(`Unverified: ${unverified.length}/${results.length}`);
        logger.log();

        if (suspicious.length > 0) {
            logger.log('SUSPICIOUS CITATIONS (Manual Review Needed):');
            for (const r of suspicious) {
                logger.log(`\n  [${r.num}]`);
                for (const issue of r.issues) {
                    logger.log(`    - ${issue}`);
                }
            }
            logger.log();
        }

        if (unverified.length > 0) {
            logger.log('UNVERIFIED CITATIONS (Could not check):');
            for (const r of unverified) {
                logger.log(`  [${r.num}] ${r.issues[0] || 'Unknown'}`);
            }
            logger.log();
        }

        // Decision
        const totalVerified = verified.length + urlVerified.length;

        if (suspicious.length > 0) {
            logger.log('WARNING: Suspicious citations detected');
            if (this.strictMode) {
                logger.log('  STRICT MODE: Failing due to suspicious citations');
                return false;
            }
            logger.log('  (Continuing in non-strict mode)');
        }

        if (this.strictMode && unverified.length > 0) {
            logger.log('STRICT MODE: Unverified citations found');
            return false;
        }

        if (results.length > 0 && totalVerified / results.length < 0.5) {
            logger.log('WARNING: Less than 50% citations verified');
            return true; // Pass with warning
        }

        logger.log('CITATION VERIFICATION PASSED');
        return true;
    }
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        logger.log('Usage: verify_citations.ts --report <path> [--strict]');
        logger.log('\nExamples:');
        logger.log('  bun verify_citations.ts --report report.md');
        logger.log('  bun verify_citations.ts -r report.md --strict');
        logger.log('\nNote: Requires internet connection to check DOIs.');
        logger.log('Uses free DOI resolver - no API key needed.');
        process.exit(0);
    }

    let reportPath: string | null = null;
    let strictMode = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--report' || args[i] === '-r') {
            reportPath = args[i + 1];
        } else if (args[i] === '--strict') {
            strictMode = true;
        }
    }

    if (!reportPath) {
        logger.error('Error: --report argument is required');
        process.exit(1);
    }

    const verifier = new CitationVerifier(reportPath, strictMode);
    const passed = await verifier.verifyAll();

    process.exit(passed ? 0 : 1);
}

main();
