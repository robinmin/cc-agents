#!/usr/bin/env bun
/**
 * detect-conflicts.ts
 *
 * Detects conflicts at multiple granularity levels:
 * - File-level: same path, different content
 * - Section-level: same file, same ## header, different content
 * - Paragraph-level: same section, same paragraph index, different text
 * - Line-level: same paragraph, specific lines differ
 */

import { logger } from '../../../scripts/logger';
import type { SourceContent, Conflict, ConflictManifest } from './types.ts';

// ===== Markdown Parsing =====

interface ParsedSection {
    level: number; // 1 = #, 2 = ##, etc.
    title: string;
    content: string;
    startLine: number;
    endLine: number;
}

interface ParsedFile {
    path: string;
    sourceName: string;
    sections: ParsedSection[];
    fullContent: string;
    paragraphs: {
        section: string;
        index: number;
        content: string;
        lines: string[];
    }[];
}

/**
 * Normalize markdown header levels to a standard form.
 * Handles both ATX-style (# ## ###) headers.
 */
function normalizeHeaders(content: string): string {
    return content.replace(/^###\s+(.+)$/gm, '## $1').replace(/^####\s+(.+)$/gm, '## $1');
}

/**
 * Parse a markdown file into sections and paragraphs.
 * Applies header normalization to handle mixed header levels.
 */
function parseMarkdown(source: SourceContent): ParsedFile {
    const normalizedContent = normalizeHeaders(source.content);
    const lines = normalizedContent.split('\n');
    const sections: ParsedSection[] = [];

    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headerMatch) {
            if (currentSection) {
                currentSection.content = currentContent.join('\n').trim();
                currentSection.endLine = i - 1;
                sections.push(currentSection);
            }

            const level = headerMatch[1].length;
            const title = headerMatch[2].trim();
            currentSection = {
                level,
                title,
                content: '',
                startLine: i,
                endLine: lines.length - 1,
            };
            currentContent = [];
        } else {
            currentContent.push(line);
        }
    }

    if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.endLine = lines.length - 1;
        sections.push(currentSection);
    }

    const paragraphs: ParsedFile['paragraphs'] = [];
    for (const section of sections) {
        const sectionParagraphs = section.content
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0)
            .map((content, index) => ({
                section: section.title,
                index,
                content,
                lines: content.split('\n'),
            }));
        paragraphs.push(...sectionParagraphs);
    }

    return {
        path: source.path,
        sourceName: source.name,
        sections,
        fullContent: normalizedContent,
        paragraphs,
    };
}

/**
 * Compute word-level similarity between two strings (0-1).
 */
function wordSimilarity(a: string, b: string): number {
    const wordsA = new Set(
        a
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2),
    );
    const wordsB = new Set(
        b
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2),
    );
    if (wordsA.size === 0 && wordsB.size === 0) return 1;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Compute character bigram similarity between two strings (0-1).
 * Better for short strings where word filtering loses too much information.
 */
function charBigramSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) {
        return a.toLowerCase() === b.toLowerCase() ? 1 : 0;
    }
    const bigramsA = new Set<string>();
    const bigramsB = new Set<string>();
    for (let i = 0; i < a.length - 1; i++) {
        bigramsA.add(a.slice(i, i + 2).toLowerCase());
    }
    for (let i = 0; i < b.length - 1; i++) {
        bigramsB.add(b.slice(i, i + 2).toLowerCase());
    }
    const intersection = [...bigramsA].filter((bg) => bigramsB.has(bg)).length;
    const union = new Set([...bigramsA, ...bigramsB]).size;
    return union > 0 ? intersection / union : 0;
}

/**
 * Combined similarity that works well for both short and long content.
 */
function combinedSimilarity(a: string, b: string): number {
    // For short content (< 100 chars), give more weight to char similarity
    if (a.length < 100 && b.length < 100) {
        const charSim = charBigramSimilarity(a, b);
        const wordSim = wordSimilarity(a, b);
        return charSim * 0.7 + wordSim * 0.3;
    }
    return wordSimilarity(a, b);
}

/**
 * Detect if two content strings are effectively the same.
 * Uses a lower threshold for short content to avoid false negatives.
 */
function isEffectivelySame(a: string, b: string, threshold = 0.85): boolean {
    if (a === b) return true;
    // For short content (< 200 chars), use stricter threshold to avoid false matches
    if (a.length < 200 && b.length < 200) {
        return combinedSimilarity(a, b) >= 0.95;
    }
    return combinedSimilarity(a, b) >= threshold;
}

// ===== Conflict Detection =====

let conflictCounter = 0;

function nextConflictId(): string {
    return `conflict-${++conflictCounter}`;
}

/**
 * Detect all conflicts across multiple source contents.
 */
export function detectConflicts(sources: SourceContent[]): ConflictManifest {
    conflictCounter = 0;

    const parsedSources = sources.map((s) => parseMarkdown(s));

    const conflicts: Conflict[] = [];
    const conflictsByFile: Record<string, string[]> = {};
    const nonConflictingFiles: Record<string, Record<string, string>> = {};

    // Initialize nonConflictingFiles
    for (const parsed of parsedSources) {
        if (!nonConflictingFiles[parsed.path]) {
            nonConflictingFiles[parsed.path] = {};
        }
        nonConflictingFiles[parsed.path][parsed.sourceName] = parsed.fullContent;
    }

    // File-level conflict detection: group by path, detect conflicts within each path group
    const byPath: Record<string, SourceContent[]> = {};
    for (const source of sources) {
        if (!byPath[source.path]) byPath[source.path] = [];
        byPath[source.path].push(source);
    }

    for (const [filePath, pathSources] of Object.entries(byPath)) {
        if (pathSources.length < 2) continue; // Need at least 2 sources to have a conflict

        const allSame = pathSources.every((s) => isEffectivelySame(s.content, pathSources[0].content));

        if (!allSame) {
            const conflict: Conflict = {
                id: nextConflictId(),
                type: 'file',
                location: filePath,
                filePath,
                sources: pathSources.map((s) => s.name),
                snippets: Object.fromEntries(pathSources.map((s) => [s.name, s.content])),
                resolution: '',
                attribution: {},
            };
            conflicts.push(conflict);

            if (!conflictsByFile[conflict.filePath]) {
                conflictsByFile[conflict.filePath] = [];
            }
            conflictsByFile[conflict.filePath].push(conflict.id);

            // Remove from nonConflictingFiles since it's conflicting
            delete nonConflictingFiles[conflict.filePath];
        }
    }

    // Section-level conflict detection: only within same file path
    const sectionIndex: Record<string, { source: ParsedFile; section: ParsedSection }[]> = {};

    for (const parsed of parsedSources) {
        for (const section of parsed.sections) {
            // Key includes both file path and section title
            const key = `${parsed.path}:${section.title.toLowerCase().trim()}`;
            if (!sectionIndex[key]) sectionIndex[key] = [];
            sectionIndex[key].push({ source: parsed, section });
        }
    }

    for (const [, sectionEntries] of Object.entries(sectionIndex)) {
        if (sectionEntries.length < 2) continue;

        // Only detect conflict if sources have same file path
        const filePaths = new Set(sectionEntries.map((e) => e.source.path));
        if (filePaths.size > 1) continue; // Different paths, skip

        const contents = sectionEntries.map((e) => e.section.content);
        const allSectionsSame = contents.every((c) => isEffectivelySame(c, contents[0]));

        if (!allSectionsSame) {
            const conflict: Conflict = {
                id: nextConflictId(),
                type: 'section',
                location: `## ${sectionEntries[0].section.title}`,
                filePath: sectionEntries[0].source.path,
                sources: sectionEntries.map((e) => e.source.sourceName),
                snippets: Object.fromEntries(sectionEntries.map((e) => [e.source.sourceName, e.section.content])),
                resolution: '',
                attribution: {},
            };
            conflicts.push(conflict);

            if (!conflictsByFile[conflict.filePath]) {
                conflictsByFile[conflict.filePath] = [];
            }
            conflictsByFile[conflict.filePath].push(conflict.id);
        }
    }

    // Paragraph-level conflict detection: only within same file path
    const paragraphIndex: Record<
        string,
        { source: ParsedFile; paragraphIndex: number; paragraph: ParsedFile['paragraphs'][0] }[]
    > = {};

    for (const parsed of parsedSources) {
        for (const para of parsed.paragraphs) {
            // Key includes file path to ensure we only compare within same file
            const key = `${parsed.path}:${para.section.toLowerCase()}:para-${para.index}`;
            if (!paragraphIndex[key]) paragraphIndex[key] = [];
            paragraphIndex[key].push({
                source: parsed,
                paragraphIndex: para.index,
                paragraph: para,
            });
        }
    }

    for (const [, entries] of Object.entries(paragraphIndex)) {
        if (entries.length < 2) continue;

        // Only detect conflict if sources have same file path
        const filePaths = new Set(entries.map((e) => e.source.path));
        if (filePaths.size > 1) continue; // Different paths, skip

        const contents = entries.map((e) => e.paragraph.content);
        const allParasSame = contents.every((c) => isEffectivelySame(c, contents[0]));

        if (!allParasSame) {
            const conflict: Conflict = {
                id: nextConflictId(),
                type: 'paragraph',
                location: `${entries[0].paragraph.section}:para-${entries[0].paragraph.index}`,
                filePath: entries[0].source.path,
                sources: entries.map((e) => e.source.sourceName),
                snippets: Object.fromEntries(entries.map((e) => [e.source.sourceName, e.paragraph.content])),
                resolution: '',
                attribution: {},
            };
            conflicts.push(conflict);

            if (!conflictsByFile[conflict.filePath]) {
                conflictsByFile[conflict.filePath] = [];
            }
            conflictsByFile[conflict.filePath].push(conflict.id);
        }
    }

    // Line-level conflict detection
    for (const [, entries] of Object.entries(paragraphIndex)) {
        if (entries.length < 2) continue;

        const firstLines = entries[0].paragraph.lines;
        for (let lineIdx = 0; lineIdx < firstLines.length; lineIdx++) {
            const lineContents = entries.map((e) => e.paragraph.lines[lineIdx] ?? '');
            const allLinesSame = lineContents.every((l) => l === lineContents[0] || l.trim() === '');

            if (!allLinesSame) {
                const conflict: Conflict = {
                    id: nextConflictId(),
                    type: 'line',
                    location: `${entries[0].paragraph.section}:para-${entries[0].paragraph.index}:line-${lineIdx + 1}`,
                    filePath: 'SKILL.md',
                    sources: entries.map((e) => e.source.sourceName),
                    snippets: Object.fromEntries(
                        entries.map((e) => [e.source.sourceName, e.paragraph.lines[lineIdx] ?? '']),
                    ),
                    resolution: '',
                    attribution: {},
                };
                conflicts.push(conflict);

                if (!conflictsByFile[conflict.filePath]) {
                    conflictsByFile[conflict.filePath] = [];
                }
                conflictsByFile[conflict.filePath].push(conflict.id);
            }
        }
    }

    return {
        conflicts,
        conflictsByFile,
        nonConflictingFiles,
        summary: {
            totalConflicts: conflicts.length,
            fileLevelConflicts: conflicts.filter((c) => c.type === 'file').length,
            sectionLevelConflicts: conflicts.filter((c) => c.type === 'section').length,
            paragraphLevelConflicts: conflicts.filter((c) => c.type === 'paragraph').length,
            lineLevelConflicts: conflicts.filter((c) => c.type === 'line').length,
            sources: sources.map((s) => s.name),
        },
    };
}

// ===== CLI =====

function showHelp(): void {
    logger.log('Usage: detect-conflicts.ts [options]');
    logger.log('');
    logger.log('Options:');
    logger.log('  --help, -h     Show this help message');
    logger.log('  --json         Output as JSON');
    logger.log('  --sources      JSON array of {name,path,content} objects');
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

    const manifest = detectConflicts(sources);

    if (showJson) {
        logger.log(JSON.stringify(manifest, null, 2));
    } else {
        logger.log(`Detected ${manifest.summary.totalConflicts} conflict(s):`);
        logger.log(`  File-level: ${manifest.summary.fileLevelConflicts}`);
        logger.log(`  Section-level: ${manifest.summary.sectionLevelConflicts}`);
        logger.log(`  Paragraph-level: ${manifest.summary.paragraphLevelConflicts}`);
        logger.log(`  Line-level: ${manifest.summary.lineLevelConflicts}`);
        logger.log('');
        for (const conflict of manifest.conflicts) {
            logger.log(`  [${conflict.type}] ${conflict.location}`);
        }
    }
}

if (import.meta.main) {
    await main();
}
