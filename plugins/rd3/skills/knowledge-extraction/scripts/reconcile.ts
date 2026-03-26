#!/usr/bin/env bun
/**
 * reconcile.ts
 *
 * Core reconciliation engine for multi-source content merge.
 * Takes multiple SourceContent objects, detects conflicts,
 * merges them deterministically, and scores the result.
 *
 * Merge strategy:
 * - Non-conflicting files: taken as-is from the first source
 * - File-level conflicts: section-by-section merge
 * - Section-level conflicts: paragraph-by-paragraph merge with dedup
 * - Paragraph-level conflicts: line-by-line merge with dedup
 * - Line-level conflicts: keep unique lines from all sources
 *
 * Source ordering: alphabetical by source name (case-insensitive) for determinism.
 */

import { logger } from '../../../scripts/logger';
import { detectConflicts } from './detect-conflicts';
import { scoreMergeQuality } from './score-quality';
import type { Conflict, ConflictManifest, ReconciliationResult, SourceContent } from './types';

// ===== Utility Functions =====

/**
 * Sort sources alphabetically by name for deterministic ordering.
 */
function sortSources(sources: SourceContent[]): SourceContent[] {
    return [...sources].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

/**
 * Parse markdown into sections with their headers.
 */
interface Section {
    header: string;
    headerLevel: number;
    content: string;
    raw: string;
}

function parseSections(content: string): Section[] {
    const lines = content.split('\n');
    const sections: Section[] = [];
    let currentHeader = '';
    let currentLevel = 0;
    let currentLines: string[] = [];

    for (const line of lines) {
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            if (currentHeader || currentLines.length > 0) {
                sections.push({
                    header: currentHeader,
                    headerLevel: currentLevel,
                    content: currentLines.join('\n').trim(),
                    raw: currentHeader
                        ? `${'#'.repeat(currentLevel)} ${currentHeader}\n\n${currentLines.join('\n').trim()}`
                        : currentLines.join('\n').trim(),
                });
            }
            currentHeader = headerMatch[2].trim();
            currentLevel = headerMatch[1].length;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    if (currentHeader || currentLines.length > 0) {
        sections.push({
            header: currentHeader,
            headerLevel: currentLevel,
            content: currentLines.join('\n').trim(),
            raw: currentHeader
                ? `${'#'.repeat(currentLevel)} ${currentHeader}\n\n${currentLines.join('\n').trim()}`
                : currentLines.join('\n').trim(),
        });
    }

    return sections;
}

/**
 * Extract unique paragraphs from content, preserving order.
 */
function extractUniqueParagraphs(contents: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const content of contents) {
        const paragraphs = content
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);

        for (const para of paragraphs) {
            const normalized = para.toLowerCase().replace(/\s+/g, ' ');
            if (!seen.has(normalized)) {
                seen.add(normalized);
                result.push(para);
            }
        }
    }

    return result;
}

/**
 * Extract unique lines from multiple content blocks, preserving order.
 */
function extractUniqueLines(contents: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const content of contents) {
        const lines = content.split('\n');
        for (const line of lines) {
            const normalized = line.trim().toLowerCase();
            if (normalized.length === 0) continue;
            if (!seen.has(normalized)) {
                seen.add(normalized);
                result.push(line);
            }
        }
    }

    return result;
}

/**
 * Merge sections from multiple sources by matching section headers.
 * Sections present in only one source are included as-is.
 * Sections present in multiple sources get their paragraphs merged.
 */
function mergeSections(allSections: Section[][]): string {
    const sectionMap: Record<string, Section[]> = {};
    const sectionOrder: string[] = [];

    for (const sections of allSections) {
        for (const section of sections) {
            const key = section.header.toLowerCase().trim() || `__preamble_${sectionOrder.length}`;
            if (!sectionMap[key]) {
                sectionMap[key] = [];
                sectionOrder.push(key);
            }
            sectionMap[key].push(section);
        }
    }

    const mergedParts: string[] = [];

    for (const key of sectionOrder) {
        const sections = sectionMap[key];
        if (sections.length === 1) {
            mergedParts.push(sections[0].raw);
        } else {
            // Multiple sources have this section — merge paragraphs
            const header = sections[0].header;
            const level = sections[0].headerLevel;
            const contents = sections.map((s) => s.content);
            const uniqueParas = extractUniqueParagraphs(contents);

            if (header) {
                mergedParts.push(`${'#'.repeat(level)} ${header}\n\n${uniqueParas.join('\n\n')}`);
            } else {
                mergedParts.push(uniqueParas.join('\n\n'));
            }
        }
    }

    return mergedParts.join('\n\n');
}

// ===== Conflict Resolution =====

/**
 * Resolve a single conflict by merging content from all sources.
 */
function resolveConflict(conflict: Conflict): {
    resolved: string;
    attribution: Record<string, string>;
    resolution: string;
} {
    const snippets = Object.entries(conflict.snippets);
    const attribution: Record<string, string> = {};

    switch (conflict.type) {
        case 'file': {
            // Section-by-section merge of conflicting files
            const allSections = snippets.map(([, content]) => parseSections(content));
            const resolved = mergeSections(allSections);

            for (const [source, content] of snippets) {
                const sections = parseSections(content);
                const sectionNames = sections.map((s) => s.header).filter(Boolean);
                attribution[source] =
                    sectionNames.length > 0
                        ? `Contributed sections: ${sectionNames.join(', ')}`
                        : 'Contributed preamble content';
            }

            return {
                resolved,
                attribution,
                resolution: `Merged ${snippets.length} file versions by section-level reconciliation. Unique paragraphs preserved from all sources.`,
            };
        }

        case 'section': {
            // Paragraph-by-paragraph merge of conflicting sections
            const contents = snippets.map(([, content]) => content);
            const uniqueParas = extractUniqueParagraphs(contents);

            for (const [source, content] of snippets) {
                const paraCount = content.split(/\n\n+/).filter((p) => p.trim().length > 0).length;
                attribution[source] = `Contributed ${paraCount} paragraph(s)`;
            }

            return {
                resolved: uniqueParas.join('\n\n'),
                attribution,
                resolution: `Merged ${snippets.length} section versions. Extracted ${uniqueParas.length} unique paragraphs.`,
            };
        }

        case 'paragraph': {
            // Line-by-line merge of conflicting paragraphs
            const contents = snippets.map(([, content]) => content);
            const uniqueLines = extractUniqueLines(contents);

            for (const [source, content] of snippets) {
                const lineCount = content.split('\n').filter((l) => l.trim().length > 0).length;
                attribution[source] = `Contributed ${lineCount} line(s)`;
            }

            return {
                resolved: uniqueLines.join('\n'),
                attribution,
                resolution: `Merged ${snippets.length} paragraph versions. Extracted ${uniqueLines.length} unique lines.`,
            };
        }

        case 'line': {
            // Keep all unique line variants
            const contents = snippets.map(([, content]) => content);
            const uniqueLines = extractUniqueLines(contents);

            for (const [source, content] of snippets) {
                attribution[source] = `Contributed line: "${content.trim().substring(0, 60)}..."`;
            }

            return {
                resolved: uniqueLines.join('\n'),
                attribution,
                resolution: `Merged ${snippets.length} line variants. Kept ${uniqueLines.length} unique line(s).`,
            };
        }

        default: {
            // Fallback: concatenate all snippets
            const resolved = snippets.map(([, content]) => content).join('\n\n');
            for (const [source] of snippets) {
                attribution[source] = 'Content included verbatim (fallback)';
            }
            return {
                resolved,
                attribution,
                resolution: 'Fallback: concatenated all source content.',
            };
        }
    }
}

// ===== Main Reconciliation =====

/**
 * Reconcile multiple source contents into a single merged document.
 * This is the main entry point for the reconciliation engine.
 */
export function reconcileMultiSource(sources: SourceContent[]): ReconciliationResult {
    const timestamp = new Date().toISOString();
    const sortedSources = sortSources(sources);

    // Step 1: Detect conflicts
    const manifest = detectConflicts(sortedSources);

    // Step 2: Resolve conflicts
    const resolvedConflicts: Conflict[] = [];
    const resolvedContentByFile: Record<string, string> = {};
    const allAttributions: Record<string, string> = {};

    // Process conflicts by file — use highest-level conflict for each file
    const fileConflicts = new Map<string, Conflict>();
    for (const conflict of manifest.conflicts) {
        const existing = fileConflicts.get(conflict.filePath);
        if (!existing || getConflictPriority(conflict.type) > getConflictPriority(existing.type)) {
            fileConflicts.set(conflict.filePath, conflict);
        }
    }

    for (const [filePath, conflict] of fileConflicts) {
        const { resolved, attribution, resolution } = resolveConflict(conflict);

        const resolvedConflict: Conflict = {
            ...conflict,
            resolution,
            attribution,
        };
        resolvedConflicts.push(resolvedConflict);
        resolvedContentByFile[filePath] = resolved;

        for (const [source, desc] of Object.entries(attribution)) {
            allAttributions[source] = allAttributions[source] ? `${allAttributions[source]}; ${desc}` : desc;
        }
    }

    // Step 3: Assemble merged document
    const mergedParts: string[] = [];

    // Add non-conflicting files
    for (const [filePath, sourceContents] of Object.entries(manifest.nonConflictingFiles)) {
        // Take content from first source (alphabetically) for determinism
        const firstSourceName = Object.keys(sourceContents).sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase()),
        )[0];
        if (firstSourceName) {
            const content = sourceContents[firstSourceName];
            mergedParts.push(content);

            if (!allAttributions[firstSourceName]) {
                allAttributions[firstSourceName] = `Contributed ${filePath} (no conflicts)`;
            }
        }
    }

    // Add resolved conflict content
    for (const [, content] of Object.entries(resolvedContentByFile)) {
        mergedParts.push(content);
    }

    const mergedContent = mergedParts.join('\n\n');

    // Step 4: Score quality
    const qualityResult = scoreMergeQuality(mergedContent, sortedSources, allAttributions);

    // Step 5: Assemble result
    const updatedManifest: ConflictManifest = {
        ...manifest,
        conflicts: resolvedConflicts.length > 0 ? resolvedConflicts : manifest.conflicts,
    };

    const warnings = [...qualityResult.warnings];
    if (qualityResult.score < 70) {
        warnings.push('Merge quality is below 70. Manual review is strongly recommended.');
    }

    return {
        mergedContent,
        qualityScore: qualityResult.score,
        qualityJustification: qualityResult.justification,
        conflictManifest: updatedManifest,
        sourceAttributions: allAttributions,
        warnings,
        deterministic: true,
        timestamp,
    };
}

/**
 * Get conflict priority (higher = more severe, should be resolved at that level).
 */
function getConflictPriority(type: string): number {
    switch (type) {
        case 'file':
            return 4;
        case 'section':
            return 3;
        case 'paragraph':
            return 2;
        case 'line':
            return 1;
        default:
            return 0;
    }
}

// ===== CLI =====

function showHelp(): void {
    logger.log('Usage: reconcile.ts [options]');
    logger.log('');
    logger.log('Options:');
    logger.log('  --help, -h     Show this help message');
    logger.log('  --json         Output as JSON');
    logger.log('  --sources      JSON array of {name,path,content} objects');
    logger.log('  --summary      Show summary only (no merged content)');
    logger.log('');
    logger.log('Pipe JSON to stdin or use --sources= flag.');
}

async function readStdin(): Promise<string> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of Bun.stdin.stream()) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString();
}

async function main(): Promise<void> {
    const args = Bun.argv.slice(2);
    const showJson = args.includes('--json');
    const showHelpFlag = args.includes('--help') || args.includes('-h');
    const summaryOnly = args.includes('--summary');

    if (showHelpFlag) {
        showHelp();
        return;
    }

    let sources: SourceContent[] = [];

    const sourcesArg = args.find((a) => a.startsWith('--sources='));
    if (sourcesArg) {
        try {
            sources = JSON.parse(sourcesArg.replace('--sources=', ''));
        } catch {
            logger.error('Failed to parse --sources JSON');
            process.exit(1);
        }
    } else {
        try {
            const stdin = await readStdin();
            if (stdin.trim()) {
                sources = JSON.parse(stdin);
            }
        } catch {
            logger.error('Failed to parse stdin as JSON');
            process.exit(1);
        }
    }

    if (sources.length === 0) {
        logger.error('No sources provided. Use --sources= or pipe JSON to stdin.');
        showHelp();
        process.exit(1);
    }

    const result = reconcileMultiSource(sources);

    if (showJson) {
        if (summaryOnly) {
            const summary = {
                qualityScore: result.qualityScore,
                qualityJustification: result.qualityJustification,
                conflictsSummary: result.conflictManifest.summary,
                sourceAttributions: result.sourceAttributions,
                warnings: result.warnings,
                deterministic: result.deterministic,
                timestamp: result.timestamp,
            };
            logger.log(JSON.stringify(summary, null, 2));
        } else {
            logger.log(JSON.stringify(result, null, 2));
        }
    } else {
        logger.log('=== Reconciliation Result ===');
        logger.log(`Quality Score: ${result.qualityScore}/100`);
        logger.log(`Justification: ${result.qualityJustification}`);
        logger.log(`Deterministic: ${result.deterministic}`);
        logger.log(`Conflicts detected: ${result.conflictManifest.summary.totalConflicts}`);
        logger.log(`  File-level: ${result.conflictManifest.summary.fileLevelConflicts}`);
        logger.log(`  Section-level: ${result.conflictManifest.summary.sectionLevelConflicts}`);
        logger.log(`  Paragraph-level: ${result.conflictManifest.summary.paragraphLevelConflicts}`);
        logger.log(`  Line-level: ${result.conflictManifest.summary.lineLevelConflicts}`);

        if (result.warnings.length > 0) {
            logger.log('');
            logger.log('Warnings:');
            for (const w of result.warnings) {
                logger.warn(`  ${w}`);
            }
        }

        if (!summaryOnly) {
            logger.log('');
            logger.log('=== Merged Content ===');
            logger.log(result.mergedContent);
        }
    }
}

if (import.meta.main) {
    await main();
}
