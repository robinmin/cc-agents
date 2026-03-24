/**
 * Shared Best Practice Auto-Fix Functions for rd3 meta skills
 *
 * Used by both cc-agents and cc-skills refine pipelines.
 * Handles deterministic text fixes; fuzzy quality checks are
 * handled by the invoking LLM agent via checklist.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================================
// Types
// ============================================================================

export interface BestPracticeFixResult {
    success: boolean;
    actions: string[];
    content: string;
}

export interface BestPracticeFixOptions {
    /** Label for entity-specific replacements: "This skill helps" or "This agent helps" */
    entityLabel: string;
    /** Remove "Commands Reference" sections (cc-skills only) */
    removeCircularRefs?: boolean;
    /** Remove `/rd3:command-*` slash command references (cc-skills only) */
    removeSlashRefs?: boolean;
    /** Extract long content to references (default: true) */
    extractLongContent?: boolean;
}

interface ExtractedSection {
    title: string;
    content: string;
    referenceFile: string;
    summary: string;
}

// ============================================================================
// Reference File Creation
// ============================================================================

/**
 * Create a reference file with proper frontmatter.
 */
function createReferenceFile(skillDir: string, skillName: string, section: ExtractedSection): string {
    const refDir = join(skillDir, 'references');
    const refPath = join(refDir, section.referenceFile);

    if (!existsSync(refDir)) {
        mkdirSync(refDir, { recursive: true });
    }

    const frontmatter = `---
name: ${section.referenceFile.replace('.md', '')}
description: "${section.summary.replace(/"/g, "'").slice(0, 200)}"
see_also:
  - rd3:${skillName}
---

`;

    // Strip the first heading from content if it duplicates the section title
    // (extracted content starts with ## heading, but we add # heading via template)
    let cleanContent = section.content;
    const firstLine = cleanContent.split('\n')[0];
    if (firstLine === `## ${section.title}`) {
        cleanContent = cleanContent.slice(firstLine.length).trimStart();
    }

    const fileContent = `${frontmatter}# ${section.title}\n\n${cleanContent}\n`;
    writeFileSync(refPath, fileContent, 'utf-8');

    return refPath;
}

/**
 * Infer skill name from directory path or content.
 */
function inferSkillName(skillDir: string, content: string): string {
    // Try to get from directory name
    const dirName = skillDir.split('/').pop() || '';

    // Try to extract from frontmatter name field
    const fmMatch = content.match(/^name:\s*([a-z0-9-]+)/m);
    if (fmMatch) {
        return fmMatch[1];
    }

    // Try to extract from first H1 heading
    const h1Match = content.match(/^#\s+[a-z0-9-]+\s+—\s+([a-z0-9-]+)/m);
    if (h1Match) {
        return h1Match[1];
    }

    return dirName;
}

// ============================================================================
// Extraction Candidates
// ============================================================================

interface ExtractionCandidate {
    sectionTitle: string;
    startMatch: RegExp;
    endPattern: string | RegExp;
    referenceFile: string;
    summary: string;
    minLines?: number;
}

/**
 * Standard extraction candidates for rd3 skills.
 * These patterns identify sections that are conventionally reference-level.
 */
const STANDARD_EXTRACTION_CANDIDATES: ExtractionCandidate[] = [
    {
        sectionTitle: 'Quick Reference',
        startMatch: /^## Quick Reference$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'quick-reference.md',
        summary: 'Quick reference tables for common decisions',
    },
    {
        sectionTitle: 'Additional Resources',
        startMatch: /^## Additional Resources$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'external-resources.md',
        summary: 'External links and further reading',
    },
    {
        sectionTitle: 'Extended Examples',
        startMatch: /^## Extended Examples$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'examples.md',
        summary: 'Detailed code examples and patterns',
    },
    {
        sectionTitle: 'Detailed Patterns',
        startMatch: /^## Detailed Patterns$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'detailed-patterns.md',
        summary: 'In-depth pattern descriptions',
    },
    {
        sectionTitle: 'Technology Selection',
        startMatch: /^## Technology Selection$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'technology-selection.md',
        summary: 'Technology comparison tables and recommendations',
    },
    {
        sectionTitle: 'Architecture Decision Records',
        startMatch: /^## Architecture Decision Records \(ADRs\)$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'adr-examples.md',
        summary: 'ADR templates and examples',
        minLines: 20,
    },
    {
        sectionTitle: 'Monitoring Stack',
        startMatch: /^## Monitoring Stack$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'monitoring-stack.md',
        summary: 'Observability stack recommendations',
    },
    {
        sectionTitle: 'Breakdown Checklist',
        startMatch: /^## Breakdown Checklist$/m,
        endPattern: /^## [^#\n].*/m,
        referenceFile: 'checklists.md',
        summary: 'Task decomposition checklists',
        minLines: 10,
    },
];

/**
 * Extract section content between start and end patterns.
 */
function extractSection(
    content: string,
    candidate: ExtractionCandidate,
): { extracted: string; remaining: string } | null {
    const startMatch = content.match(candidate.startMatch);
    if (!startMatch) {
        return null;
    }

    const startIndex = content.indexOf(startMatch[0]);

    // Find the end: next ## heading or end of file
    let endIndex = content.length;
    const afterStart = content.slice(startIndex + startMatch[0].length);

    const endMatch = afterStart.match(candidate.endPattern);
    if (endMatch) {
        endIndex = startIndex + startMatch[0].length + afterStart.indexOf(endMatch[0]);
    }

    const sectionContent = content.slice(startIndex, endIndex).trim();
    const sectionLines = sectionContent.split('\n').length;

    // Skip if below minimum lines threshold
    if (candidate.minLines && sectionLines < candidate.minLines) {
        return null;
    }

    const remaining = `${content.slice(0, startIndex).trimEnd()}\n${content.slice(endIndex)}`;

    return { extracted: sectionContent, remaining };
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Extract long content sections from SKILL.md into references.
 *
 * When SKILL.md exceeds 500 lines, this function identifies sections that
 * are conventionally reference-level (tables, checklists, examples) and
 * extracts them to the references/ subdirectory, replacing them with
 * summaries and links.
 *
 * Extraction candidates (in priority order):
 * 1. "## Quick Reference" sections with large tables
 * 2. "## Additional Resources" with many external links
 * 3. "## Extended Examples" with large code blocks
 * 4. "## Detailed Patterns" sections
 * 5. "## Technology Selection" tables
 * 6. "## Architecture Decision Records" with full examples
 * 7. "## Monitoring Stack" JSON blocks
 * 8. "## Breakdown Checklist" sections
 *
 * Returns actions describing what was extracted.
 */
export function extractToReferences(skillDir: string, content: string): BestPracticeFixResult {
    const actions: string[] = [];
    let fixed = content;
    const extractedSections: ExtractedSection[] = [];

    // Count lines (accounting for frontmatter)
    const lines = content.split('\n').length;
    if (lines < 500) {
        return { success: true, actions: [], content: fixed };
    }

    const skillName = inferSkillName(skillDir, content);

    // Try each standard extraction candidate
    for (const candidate of STANDARD_EXTRACTION_CANDIDATES) {
        const result = extractSection(fixed, candidate);
        if (result?.extracted) {
            const extractedLines = result.extracted.split('\n').length;

            // Only extract if the section has substance
            if (extractedLines < 10) {
                continue;
            }

            extractedSections.push({
                title: candidate.sectionTitle,
                content: result.extracted,
                referenceFile: candidate.referenceFile,
                summary: candidate.summary,
            });

            fixed = result.remaining;
            actions.push(
                `Extracted ## ${candidate.sectionTitle} (${extractedLines} lines) → references/${candidate.referenceFile}`,
            );
        }
    }

    // Also extract large tables (10+ rows) even without section header match
    // This handles inline tables that are part of larger sections
    const tableMatches = fixed.match(/\|[^\n]+\|\n(\|[^\n]+\|\n){10,}/g);
    if (tableMatches) {
        for (const table of tableMatches) {
            const rows = table.trim().split('\n');
            if (rows.length >= 12) {
                // 10+ data rows + header + separator
                actions.push(`Found large table (${rows.length} rows) — consider extracting to reference`);
            }
        }
    }

    // Write extracted sections to reference files
    for (const section of extractedSections) {
        try {
            const refPath = createReferenceFile(skillDir, skillName, section);
            actions.push(`Created ${refPath}`);
        } catch (e) {
            actions.push(`Failed to create reference: ${e}`);
        }
    }

    // Replace extracted sections with summary links in SKILL.md
    if (extractedSections.length > 0) {
        for (const section of extractedSections.reverse()) {
            const summaryBlock = `\nSee [${section.title}](references/${section.referenceFile}) for detailed content.\n`;
            fixed = `${fixed.trimEnd()}\n${summaryBlock}`;
        }
    }

    return {
        success: extractedSections.length > 0,
        actions,
        content: fixed,
    };
}

/**
 * Apply deterministic best-practice fixes to skill/agent content.
 *
 * Fixes applied:
 * 1. Normalize TODO markers (flag for manual review)
 * 2. Convert second-person to imperative form
 * 3. Convert Windows paths to forward slashes
 * 4. Remove circular references (optional, cc-skills)
 * 5. Remove slash command references (optional, cc-skills)
 * 6. Flag long content without section headers
 */
export function applyBestPracticeFixes(content: string, options: BestPracticeFixOptions): BestPracticeFixResult {
    const actions: string[] = [];
    let fixed = content;

    // Fix 1: Flag remaining TODO markers for manual review
    const todoMatches = fixed.match(/\bTODO\b/gi);
    if (todoMatches && todoMatches.length > 0) {
        actions.push(`Found ${todoMatches.length} TODO marker(s) — replace with actual content`);
        // Normalize TODO variants to a consistent format
        fixed = fixed.replace(/\bTODO\b:\s*/gi, 'TODO: ');
        fixed = fixed.replace(/\bTODO\b(?!:)/gi, 'TODO: FIX ME');
    }

    // Fix 2: Convert second-person to imperative form
    const secondPersonReplacements = [
        { pattern: /\bI can help you\b/gi, replacement: options.entityLabel },
        { pattern: /\bI will help you\b/gi, replacement: options.entityLabel },
        { pattern: /\byou can use\b/gi, replacement: 'Use' },
        { pattern: /\byou should\b/gi, replacement: 'Do' },
        { pattern: /\byou need to\b/gi, replacement: 'You must' },
    ];

    for (const { pattern, replacement } of secondPersonReplacements) {
        if (pattern.test(fixed)) {
            actions.push(`Fixed "${pattern.source}" → "${replacement}"`);
            fixed = fixed.replace(pattern, replacement);
        }
    }

    // Fix 3: Convert Windows paths to forward slashes
    const windowsPaths = fixed.match(/[a-zA-Z]:\\[\w\\]+\.?\w*/g);
    if (windowsPaths && windowsPaths.length > 0) {
        const uniquePaths = [...new Set(windowsPaths)];
        for (const path of uniquePaths) {
            const forwardPath = path.replace(/\\/g, '/');
            if (path !== forwardPath) {
                actions.push(`Fixed Windows path: ${path} → ${forwardPath}`);
                fixed = fixed.replace(new RegExp(path.replace(/\\/g, '\\\\'), 'g'), forwardPath);
            }
        }
    }

    // Fix 4: Remove circular references (Commands Reference sections)
    if (options.removeCircularRefs && /^## Commands Reference$/m.test(fixed)) {
        actions.push('Removed "Commands Reference" section');
        fixed = fixed.replace(/^## Commands Reference$\n[\s\S]*?(?=^## |\n## |```\n\n|\n\n---)/m, '\n');
    }

    // Fix 5: Remove slash command references
    if (options.removeSlashRefs && /\/(rd\d+):[a-z-]+\s+/g.test(fixed)) {
        actions.push('Removed slash command references');
        fixed = fixed.replace(/\/(rd\d+):[a-z-]+\s+[^\n]*\n/g, '');
    }

    // Fix 6: Add section headers if content is too long without structure
    if (fixed.length > 2000 && !fixed.includes('## ')) {
        actions.push('Content may need section headers for progressive disclosure (manual review needed)');
    }

    return {
        success: true,
        actions,
        content: fixed,
    };
}
