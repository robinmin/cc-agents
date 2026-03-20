/**
 * Shared utilities for rd3:cc-magents scripts
 *
 * Provides markdown parsing, section detection/extraction, serialization,
 * heading normalization, token estimation, file discovery, platform
 * auto-detection, and content sanitization.
 *
 * Key difference from cc-agents utils: Main agent configs are section-based
 * (not frontmatter-based), use flexible headings (per AGENTS.md spec),
 * and support hierarchical config discovery across 23+ platforms.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type {
    MagentHierarchy,
    MagentMetadata,
    MagentPlatform,
    MagentSection,
    SectionCategory,
    UniversalMainAgent,
} from './types';
import { ALL_MAGENT_PLATFORMS, PLATFORM_FILENAMES, PLATFORM_TIERS } from './types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Keyword patterns for auto-detecting section categories.
 * Maps keywords (in heading or content) to SectionCategory.
 */
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: SectionCategory }> = [
    // Identity patterns
    { pattern: /\b(persona|identity|role|who you are|about|overview)\b/i, category: 'identity' },
    // Rules patterns
    { pattern: /\b(rules|constraints|boundaries|do not|never|always|must not|forbidden)\b/i, category: 'rules' },
    // Workflow patterns
    { pattern: /\b(workflow|process|steps|procedure|pipeline|phases?)\b/i, category: 'workflow' },
    // Tools patterns
    { pattern: /\b(tools?|mcp|integrations?|servers?|commands?)\b/i, category: 'tools' },
    // Standards patterns
    { pattern: /\b(standards?|conventions?|formatting|style|coding|lint)\b/i, category: 'standards' },
    // Verification patterns
    { pattern: /\b(verification|anti-hallucination|fact.?check|confidence|citations?)\b/i, category: 'verification' },
    // Memory patterns
    { pattern: /\b(memory|context|history|remember|persistence)\b/i, category: 'memory' },
    // Evolution patterns
    { pattern: /\b(evolution|self.?improv|learning|adaptation|feedback)\b/i, category: 'evolution' },
    // Environment patterns
    { pattern: /\b(environment|setup|platform|system|config(uration)?)\b/i, category: 'environment' },
    // Testing patterns
    { pattern: /\b(test(ing|s)?|coverage|tdd|spec(s)?|assertion)\b/i, category: 'testing' },
    // Output patterns
    { pattern: /\b(output|format|response|template|display)\b/i, category: 'output' },
    // Error handling patterns
    { pattern: /\b(error|fallback|recovery|retry|exception|degradation)\b/i, category: 'error-handling' },
    // Planning patterns
    { pattern: /\b(planning|plan|decompos|breakdown|strategy)\b/i, category: 'planning' },
    // Parallel patterns
    { pattern: /\b(parallel|concurrent|async|simultaneous|batch)\b/i, category: 'parallel' },
];

/**
 * Patterns for detecting potential secrets in content.
 */
const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
    { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}(?=\s|$|")/ },
    { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"][A-Za-z0-9_\-]{20,}['"]/i },
    { name: 'Generic Token', pattern: /(?:token|secret|password)\s*[=:]\s*['"][A-Za-z0-9_\-]{16,}['"]/i },
    { name: 'GitHub Token', pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
    { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_\-.]{20,}/ },
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/ },
    { name: 'OpenAI API Key', pattern: /sk-[A-Za-z0-9]{32,}/ },
    { name: 'Anthropic API Key', pattern: /sk-ant-[A-Za-z0-9_\-]{32,}/ },
    { name: 'Slack Token', pattern: /xox[bprs]-[A-Za-z0-9\-]+/ },
];

/**
 * Patterns for detecting potential prompt injection.
 */
const INJECTION_PATTERNS: RegExp[] = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /disregard\s+(all\s+)?(previous|prior|above)\s+instructions/i,
    /you\s+are\s+now\s+a\s+different/i,
    /new\s+system\s+prompt/i,
    /override\s+system\s+instructions/i,
];

// ============================================================================
// Section Parsing
// ============================================================================

/**
 * Parse markdown content into an array of MagentSection objects.
 *
 * Splits content by headings (# through ######) and preserves
 * the heading text, level, and content for each section.
 * Any content before the first heading is returned as preamble.
 */
export function parseSections(markdown: string): { sections: MagentSection[]; preamble: string } {
    const lines = markdown.split('\n');
    const sections: MagentSection[] = [];
    let preamble = '';
    let currentHeading: string | null = null;
    let currentLevel = 0;
    let currentLines: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

        if (headingMatch) {
            // Save previous section
            if (currentHeading !== null) {
                sections.push({
                    heading: currentHeading,
                    level: currentLevel,
                    content: currentLines.join('\n').trim(),
                });
            } else if (currentLines.length > 0) {
                // Content before first heading is preamble
                preamble = currentLines.join('\n').trim();
            }

            currentHeading = headingMatch[2].trim();
            currentLevel = headingMatch[1].length;
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }

    // Save last section
    if (currentHeading !== null) {
        sections.push({
            heading: currentHeading,
            level: currentLevel,
            content: currentLines.join('\n').trim(),
        });
    } else if (currentLines.length > 0) {
        preamble = currentLines.join('\n').trim();
    }

    return { sections, preamble };
}

/**
 * Serialize an array of MagentSection objects back to markdown.
 */
export function serializeSections(sections: MagentSection[], preamble?: string): string {
    const parts: string[] = [];

    if (preamble?.trim()) {
        parts.push(preamble.trim());
        parts.push('');
    }

    for (const section of sections) {
        const hashes = '#'.repeat(section.level);
        parts.push(`${hashes} ${section.heading}`);
        parts.push('');
        if (section.content.trim()) {
            parts.push(section.content.trim());
            parts.push('');
        }
    }

    return `${parts.join('\n').trim()}\n`;
}

// ============================================================================
// Section Classification
// ============================================================================

/**
 * Auto-detect the category of a section based on its heading and content.
 *
 * Uses keyword matching against the heading first (more reliable),
 * then falls back to content analysis for ambiguous headings.
 */
export function detectSectionCategory(heading: string, content: string): SectionCategory {
    // Check heading first (higher confidence)
    for (const { pattern, category } of CATEGORY_PATTERNS) {
        if (pattern.test(heading)) {
            return category;
        }
    }

    // Fall back to content analysis (first 500 chars for performance)
    const contentSample = content.slice(0, 500);
    for (const { pattern, category } of CATEGORY_PATTERNS) {
        if (pattern.test(contentSample)) {
            return category;
        }
    }

    return 'custom';
}

/**
 * Classify all sections in an array with their detected categories.
 * Modifies sections in place and returns the same array.
 */
export function classifySections(sections: MagentSection[]): MagentSection[] {
    for (const section of sections) {
        if (!section.category) {
            section.category = detectSectionCategory(section.heading, section.content);
        }
    }
    return sections;
}

// ============================================================================
// Token Estimation
// ============================================================================

/**
 * Estimate the token count of a text string.
 * Uses word count * 1.3 as a rough approximation.
 */
export function estimateTokens(text: string): number {
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    return Math.ceil(wordCount * 1.3);
}

// ============================================================================
// Platform Detection
// ============================================================================

/**
 * Auto-detect which platform a file belongs to based on its path and content.
 *
 * Detection priority:
 * 1. File path/name matching (most reliable)
 * 2. Content analysis (fallback for ambiguous files)
 */
export function detectPlatform(filePath: string, _content?: string): MagentPlatform | null {
    const fileName = basename(filePath);
    const lowerPath = filePath.toLowerCase();

    // Direct filename matching
    if (fileName === 'AGENTS.md' || fileName === '.agents.md' || fileName === 'agents.md') {
        return 'agents-md';
    }
    if (fileName === 'CLAUDE.md' || lowerPath.includes('.claude/claude.md')) {
        return 'claude-md';
    }
    if (fileName === 'GEMINI.md' || lowerPath.includes('.gemini/gemini.md')) {
        return 'gemini-md';
    }
    if (fileName === '.cursorrules') {
        return 'cursorrules';
    }
    if (fileName === '.windsurfrules') {
        return 'windsurfrules';
    }
    if (lowerPath.includes('.zed/rules') || lowerPath.includes('.zed\\rules')) {
        return 'zed-rules';
    }
    if (fileName === 'opencode.md' || lowerPath.includes('.opencode/')) {
        return 'opencode-rules';
    }
    if (fileName === '.aider.conf.yml') {
        return 'aider';
    }
    if (lowerPath.includes('.codex/') || fileName === 'codex.md') {
        return 'codex';
    }
    if (lowerPath.includes('copilot-instructions.md')) {
        return 'vscode-instructions';
    }
    if (lowerPath.includes('.warp/')) {
        return 'warp';
    }
    if (lowerPath.includes('.roo/') || lowerPath.includes('.roocode/')) {
        return 'roocode';
    }
    if (lowerPath.includes('.amp/')) {
        return 'amp';
    }

    return null;
}

// ============================================================================
// File Discovery
// ============================================================================

/**
 * Discover all agent config files in a project directory.
 *
 * Scans for known platform config file paths and returns
 * found files with their detected platform.
 */
export function discoverAgentConfigs(rootDir: string): Array<{ path: string; platform: MagentPlatform }> {
    const found: Array<{ path: string; platform: MagentPlatform }> = [];
    const resolvedRoot = resolve(rootDir);

    for (const platform of ALL_MAGENT_PLATFORMS) {
        if (platform === 'generic') continue; // Skip generic, it's a fallback

        const filenames = PLATFORM_FILENAMES[platform];
        for (const filename of filenames) {
            const fullPath = join(resolvedRoot, filename);
            try {
                if (existsSync(fullPath) && statSync(fullPath).isFile()) {
                    found.push({ path: fullPath, platform });
                }
            } catch {
                // Skip inaccessible files
            }
        }
    }

    return found;
}

// ============================================================================
// Heading Normalization
// ============================================================================

/**
 * Normalize heading levels in a section array.
 *
 * Shifts all heading levels so that the minimum level becomes targetBase.
 * For example, if sections have levels [2, 3, 4] and targetBase is 1,
 * they become [1, 2, 3].
 */
export function normalizeHeadingLevel(sections: MagentSection[], targetBase = 1): MagentSection[] {
    if (sections.length === 0) return sections;

    const minLevel = Math.min(...sections.map((s) => s.level));
    const shift = targetBase - minLevel;

    if (shift === 0) return sections;

    return sections.map((s) => ({
        ...s,
        level: Math.max(1, Math.min(6, s.level + shift)),
    }));
}

// ============================================================================
// Metadata Extraction
// ============================================================================

/**
 * Extract metadata from content.
 *
 * Supports two formats:
 * 1. YAML frontmatter (--- delimited)
 * 2. HTML comment metadata (<!-- key: value -->)
 */
export function extractMetadata(content: string): { metadata: MagentMetadata | null; body: string } {
    // Try YAML frontmatter first
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
        try {
            // Dynamic import would be needed for YAML, use simple parsing
            const metadata = parseSimpleYaml(fmMatch[1]);
            const body = content.slice(fmMatch[0].length).trim();
            return { metadata: metadata as MagentMetadata, body };
        } catch {
            // Fall through to comment metadata
        }
    }

    // Try HTML comment metadata
    const commentMatch = content.match(/^<!--\s*([\s\S]*?)\s*-->/);
    if (commentMatch) {
        const metadata = parseSimpleYaml(commentMatch[1]);
        const body = content.slice(commentMatch[0].length).trim();
        return { metadata: metadata as MagentMetadata, body };
    }

    return { metadata: null, body: content };
}

/**
 * Simple YAML-like key: value parser for metadata.
 * Does not handle nested objects or arrays -- just flat key-value pairs.
 */
function parseSimpleYaml(text: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = text.split('\n');

    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z_-]+)\s*:\s*(.+?)\s*$/);
        if (match) {
            const key = match[1];
            let value: unknown = match[2];

            // Parse booleans
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            // Parse numbers
            else if (/^\d+$/.test(value as string)) value = Number.parseInt(value as string, 10);
            // Strip quotes
            else if (typeof value === 'string' && /^['"](.*)['"]$/.test(value)) {
                value = value.slice(1, -1);
            }

            result[key] = value;
        }
    }

    return result;
}

// ============================================================================
// Content Sanitization
// ============================================================================

/**
 * Scan content for potential prompt injection patterns.
 * Returns an array of detected injection attempts (empty if clean).
 */
export function detectInjectionPatterns(content: string): string[] {
    const detected: string[] = [];

    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(content)) {
            detected.push(`Potential prompt injection: ${pattern.source}`);
        }
    }

    return detected;
}

/**
 * Scan content for potential embedded secrets.
 * Returns an array of detected secret types (empty if clean).
 */
export function detectSecrets(content: string): string[] {
    const detected: string[] = [];

    // Skip code blocks (secrets in examples are OK to document)
    const nonCodeContent = removeCodeBlocks(content);

    for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(nonCodeContent)) {
            detected.push(`Potential ${name} detected`);
        }
    }

    return detected;
}

// ============================================================================
// UMAM Construction
// ============================================================================

/**
 * Build a UniversalMainAgent from raw file content.
 *
 * This is the primary entry point for parsing any main agent config.
 * It extracts metadata, parses sections, classifies them, and
 * assembles the UMAM model.
 */
export function buildUMAM(content: string, filePath: string, platform?: MagentPlatform): UniversalMainAgent {
    const detectedPlatform = platform ?? detectPlatform(filePath) ?? 'agents-md';
    const { metadata, body } = extractMetadata(content);
    const { sections, preamble } = parseSections(body);
    const classified = classifySections(sections);

    const result: UniversalMainAgent = {
        sourcePath: filePath,
        sourceFormat: detectedPlatform,
        sections: classified,
        estimatedTokens: estimateTokens(content),
        rawContent: content,
    };
    if (metadata) result.metadata = metadata;
    if (preamble) result.preamble = preamble;
    return result;
}

/**
 * Detect hierarchy level from file path.
 */
export function detectHierarchy(filePath: string): MagentHierarchy {
    const lowerPath = filePath.toLowerCase();

    // Global: in home directory config
    if (lowerPath.includes('/home/') || lowerPath.includes('/users/')) {
        if (lowerPath.includes('/.claude/') || lowerPath.includes('/.gemini/')) {
            return 'global';
        }
    }

    // Directory: has subdirectory indicators
    if (lowerPath.includes('/src/') || lowerPath.includes('/lib/') || lowerPath.includes('/packages/')) {
        return 'directory';
    }

    // Default: project level
    return 'project';
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Remove fenced code blocks from content.
 * Used to avoid false positives when scanning for secrets/patterns.
 */
function removeCodeBlocks(content: string): string {
    return content.replace(/```[\s\S]*?```/g, '');
}
