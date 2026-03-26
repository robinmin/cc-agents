#!/usr/bin/env bun
/**
 * scorequality.ts
 *
 * Scores merged content quality across four dimensions:
 * - Coherence (0-25): Does merged text read as one document?
 * - Completeness (0-25): Are all unique insights from all sources preserved?
 * - Non-redundancy (0-25): Are there duplicates, repeats, or contradictions?
 * - Traceability (0-25): Is it clear which source contributed what?
 */

import { logger } from '../../../scripts/logger';
import type { QualityScore, QualityDimensions, SourceContent } from './types';

const MAX_DIMENSION_SCORE = 25;
const WARNING_THRESHOLD = 70;

/**
 * Score coherence: does merged text read as one document?
 */
function scoreCoherence(merged: string): number {
    let score = MAX_DIMENSION_SCORE;
    const lines = merged.split('\n');

    // Check for duplicate section headers
    const headerCounts: Record<string, number> = {};
    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            const title = headerMatch[2].trim().toLowerCase();
            headerCounts[title] = (headerCounts[title] || 0) + 1;
        }
    }
    const duplicateHeaders = Object.values(headerCounts).filter((c) => c > 1).length;
    score -= duplicateHeaders * 5;

    // Check for very short sections (fragmentation indicator)
    const shortSections = merged
        .split(/(?=#{1,6}\s+)/)
        .filter((s) => s.trim().length > 0 && s.trim().length < 50).length;
    score -= Math.min(shortSections * 2, 10);

    // Check for empty sections
    const emptySections = merged.split(/(?=#{1,6}\s+)/).filter((s) => s.trim() === '').length;
    score -= Math.min(emptySections * 3, 10);

    // Excessive transition words suggest incoherence
    const transitionCount =
        (merged.match(/\bbut\b/gi) || []).length +
        (merged.match(/\bhowever\b/gi) || []).length +
        (merged.match(/\bnevertheless\b/gi) || []).length;

    if (transitionCount > 5) score -= 3;

    return Math.max(0, Math.min(MAX_DIMENSION_SCORE, score));
}

/**
 * Score completeness: are all unique insights from all sources preserved?
 */
function scoreCompleteness(
    merged: string,
    sources: SourceContent[],
    conflictAttributions: Record<string, string>,
): number {
    let score = MAX_DIMENSION_SCORE;

    // Check if all sources were mentioned
    const mentionedSources = sources.filter((s) => {
        const nameLower = s.name.toLowerCase();
        return (
            merged.toLowerCase().includes(nameLower) ||
            Object.values(conflictAttributions).some((v) => v.toLowerCase().includes(nameLower))
        );
    });

    const missedSources = sources.length - mentionedSources.length;
    score -= missedSources * 5;

    // Check for placeholder markers
    const placeholderCount =
        (merged.match(/\[TODO\]/gi) || []).length +
        (merged.match(/\[INSERT/gi) || []).length +
        (merged.match(/\[FIXME\]/gi) || []).length +
        (merged.match(/\[placeholder\]/gi) || []).length;

    score -= Math.min(placeholderCount * 3, 15);

    return Math.max(0, Math.min(MAX_DIMENSION_SCORE, score));
}

/**
 * Score non-redundancy: are there duplicates, repeated concepts, or contradictions?
 */
function scoreNonRedundancy(merged: string): number {
    let score = MAX_DIMENSION_SCORE;

    // Check for duplicate paragraphs (exact match)
    const paragraphs = merged
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 50);

    const exactDuplicates: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
        for (let j = i + 1; j < paragraphs.length; j++) {
            if (paragraphs[i] === paragraphs[j]) {
                exactDuplicates.push(paragraphs[i].substring(0, 50));
            }
        }
    }
    score -= Math.min(exactDuplicates.length * 5, 15);

    // Check for near-duplicate section headers
    const lines = merged.split('\n');
    const headers = lines
        .filter((l) => /^#{1,6}\s+/.test(l))
        .map((l) =>
            l
                .replace(/^#+\s+/, '')
                .trim()
                .toLowerCase(),
        );

    const seen = new Set<string>();
    let duplicateHeaderCount = 0;
    for (const h of headers) {
        if (seen.has(h)) duplicateHeaderCount++;
        seen.add(h);
    }
    score -= Math.min(duplicateHeaderCount * 3, 10);

    // Check for repeated phrases
    const words = merged.toLowerCase().split(/\s+/);
    const phraseCounts: Record<string, number> = {};
    for (let i = 0; i < words.length - 9; i++) {
        const phrase = words.slice(i, i + 10).join(' ');
        phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    }
    const repeatedPhrases = Object.values(phraseCounts).filter((c) => c > 1).length;
    score -= Math.min(repeatedPhrases * 2, 10);

    return Math.max(0, Math.min(MAX_DIMENSION_SCORE, score));
}

/**
 * Score traceability: is it clear which source contributed what?
 */
function scoreTraceability(merged: string, conflictAttributions: Record<string, string>): number {
    let score = MAX_DIMENSION_SCORE;

    // Check for source attribution
    const hasAttribution = /source:/i.test(merged) || /according to/i.test(merged) || /from.*\(/i.test(merged);

    if (!hasAttribution) {
        score -= 8;
    }

    // Check for conflict documentation
    const hasConflictNote = /conflict/i.test(merged) || /differ/i.test(merged) || /resolution/i.test(merged);

    if (!hasConflictNote && Object.keys(conflictAttributions).length > 0) {
        score -= 5;
    }

    // Check for vague claims
    const vaguePhrases =
        (merged.match(/\bit is known that\b/gi) || []).length +
        (merged.match(/\bit is generally believed\b/gi) || []).length +
        (merged.match(/\beveryone knows\b/gi) || []).length +
        (merged.match(/\bclearly\b/gi) || []).length +
        (merged.match(/\bobviously\b/gi) || []).length;

    score -= Math.min(vaguePhrases * 2, 10);

    return Math.max(0, Math.min(MAX_DIMENSION_SCORE, score));
}

/**
 * Score merged content quality across all four dimensions.
 */
export function scoreMergeQuality(
    merged: string,
    sources: SourceContent[],
    conflictAttributions: Record<string, string> = {},
): QualityScore {
    const dimensions: QualityDimensions = {
        coherence: scoreCoherence(merged),
        completeness: scoreCompleteness(merged, sources, conflictAttributions),
        nonRedundancy: scoreNonRedundancy(merged),
        traceability: scoreTraceability(merged, conflictAttributions),
    };

    const totalScore =
        dimensions.coherence + dimensions.completeness + dimensions.nonRedundancy + dimensions.traceability;

    const weakDimensions: string[] = [];
    if (dimensions.coherence < 15) weakDimensions.push('coherence');
    if (dimensions.completeness < 15) weakDimensions.push('completeness');
    if (dimensions.nonRedundancy < 15) weakDimensions.push('nonRedundancy');
    if (dimensions.traceability < 15) weakDimensions.push('traceability');

    const warnings: string[] = [];
    if (totalScore < WARNING_THRESHOLD) {
        warnings.push(
            `Quality score ${totalScore}/100 is below threshold (${WARNING_THRESHOLD}). Manual review recommended.`,
        );
    }
    if (dimensions.coherence < 10) {
        warnings.push('Coherence is very low: merged text may be fragmented or contradictory.');
    }
    if (dimensions.completeness < 10) {
        warnings.push('Completeness is low: some source content may have been lost.');
    }
    if (dimensions.nonRedundancy < 10) {
        warnings.push('Non-redundancy is low: significant duplicate content detected.');
    }

    const justification = `Coherence=${dimensions.coherence}/25, Completeness=${dimensions.completeness}/25, NonRedundancy=${dimensions.nonRedundancy}/25, Traceability=${dimensions.traceability}/25.${weakDimensions.length > 0 ? ` Weak areas: ${weakDimensions.join(', ')}.` : ''}`;

    return {
        score: totalScore,
        dimensions,
        justification,
        warnings,
        weakDimensions,
    };
}

// ===== CLI =====

function showHelp(): void {
    logger.log('Usage: score-quality.ts [options]');
    logger.log('');
    logger.log('Options:');
    logger.log('  --help, -h       Show this help message');
    logger.log('  --json           Output as JSON');
    logger.log('  --merged <text>  Merged content to score');
    logger.log('  --sources <json> JSON array of source names');
}

async function main(): Promise<void> {
    const args = Bun.argv.slice(2);
    const showJson = args.includes('--json');
    const showHelpFlag = args.includes('--help') || args.includes('-h');

    if (showHelpFlag) {
        showHelp();
        return;
    }

    const mergedArg = args.find((a: string) => a.startsWith('--merged='));
    const sourcesArg = args.find((a: string) => a.startsWith('--sources='));

    if (!mergedArg) {
        logger.error('--merged is required');
        showHelp();
        process.exit(1);
    }

    const merged = mergedArg.replace('--merged=', '');
    let sources: SourceContent[] = [];

    if (sourcesArg) {
        try {
            const parsed = JSON.parse(sourcesArg.replace('--sources=', ''));
            sources = (Array.isArray(parsed) ? parsed : [parsed]).map((s: unknown) =>
                typeof s === 'string' ? { name: s, path: '', content: '' } : (s as SourceContent),
            );
        } catch {
            logger.error('Failed to parse --sources JSON');
            process.exit(1);
        }
    }

    const result = scoreMergeQuality(merged, sources);

    if (showJson) {
        logger.log(JSON.stringify(result, null, 2));
    } else {
        logger.log(`Quality Score: ${result.score}/100`);
        logger.log(`  Coherence: ${result.dimensions.coherence}/25`);
        logger.log(`  Completeness: ${result.dimensions.completeness}/25`);
        logger.log(`  Non-redundancy: ${result.dimensions.nonRedundancy}/25`);
        logger.log(`  Traceability: ${result.dimensions.traceability}/25`);
        logger.log('');
        logger.log(result.justification);
        if (result.warnings.length > 0) {
            logger.log('');
            for (const warning of result.warnings) {
                logger.warn(warning);
            }
        }
    }
}

if (import.meta.main) {
    await main();
}
