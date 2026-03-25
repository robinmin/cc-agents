/**
 * Shared utilities for rd3:cc-agents scripts
 *
 * Provides frontmatter parsing, agent parsing, body analysis,
 * section extraction, markdown generation, and validation helpers
 * used across scaffold, validate, evaluate, refine, and adapt.
 *
 * Key difference from cc-skills utils: Agents have richer body structure
 * (8-section anatomy), tiered templates, and bidirectional parsing.
 * Key difference from cc-commands utils: Agents are directory-based
 * (like skills) with frontmatter that varies by platform.
 */

import { basename } from 'node:path';
import { extractMarkdownHeadings, hasSecondPersonLanguage } from '../../../scripts/markdown-analysis';
import {
    detectUnknownFields,
    parseMarkdownFrontmatter,
    serializeMarkdownFrontmatter,
} from '../../../scripts/markdown-frontmatter';
import type {
    AgentBodyAnalysis,
    AgentPlatform,
    AgentTemplate,
    AgentWeightProfile,
    ParsedAgent,
    UniversalAgent,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedAgentFrontmatter {
    /** Parsed frontmatter object (null if missing or invalid YAML) */
    frontmatter: Record<string, unknown> | null;
    /** Markdown body content (after frontmatter) */
    body: string;
    /** Raw original content */
    raw: string;
    /** Unknown fields found in frontmatter (not in valid set for detected platform) */
    unknownFields: string[];
    /** YAML parse error, if any */
    parseError?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * The 8-section anatomy headings for specialist agents.
 * Used to detect whether an agent body follows the full anatomy.
 */
export const ANATOMY_SECTIONS = [
    'METADATA',
    'PERSONA',
    'PHILOSOPHY',
    'VERIFICATION',
    'COMPETENCIES',
    'PROCESS',
    'RULES',
    'OUTPUT',
] as const;

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse YAML frontmatter from agent markdown content.
 *
 * Returns the parsed frontmatter, body, raw content, and any
 * unknown fields detected relative to the given valid field set.
 */
export function parseFrontmatter(content: string, validFields?: readonly string[]): ParsedAgentFrontmatter {
    const parsed = parseMarkdownFrontmatter(content, { trimBodyWithoutFrontmatter: true });
    const unknownFields = parsed.frontmatter && validFields ? detectUnknownFields(parsed.frontmatter, validFields) : [];

    return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: parsed.raw,
        unknownFields,
        ...(parsed.parseError ? { parseError: parsed.parseError } : {}),
    };
}

/**
 * Serialize frontmatter and body back to a markdown string.
 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>, body: string): string {
    return serializeMarkdownFrontmatter(frontmatter, body);
}

// ============================================================================
// Agent Parsing
// ============================================================================

/**
 * Parse an agent from its file path and content.
 *
 * The agent name is derived from the filename (without extension).
 */
export function parseAgent(filePath: string, content: string, sourcePlatform: AgentPlatform = 'claude'): ParsedAgent {
    const parsed = parseFrontmatter(content);
    const filename = basename(filePath, '.md');

    return {
        frontmatter: parsed.frontmatter,
        body: parsed.body,
        raw: parsed.raw,
        path: filePath,
        filename,
        sourcePlatform,
    };
}

/**
 * Read and parse an agent from disk.
 */
export async function readAgent(
    filePath: string,
    sourcePlatform: AgentPlatform = 'claude',
): Promise<ParsedAgent | null> {
    try {
        const file = Bun.file(filePath);
        if (!(await file.exists())) {
            return null;
        }
        const content = await file.text();
        return parseAgent(filePath, content, sourcePlatform);
    } catch {
        return null;
    }
}

// ============================================================================
// Body Analysis
// ============================================================================

/**
 * Analyze the body content of an agent.
 * Detects sections, 8-section anatomy, rules, output format, etc.
 */
export function analyzeBody(body: string): AgentBodyAnalysis {
    const lines = body.split('\n');

    const sections = extractMarkdownHeadings(body, 3);

    // Detect 8-section anatomy
    const anatomySections: string[] = [];
    const upperSections = sections.map((s) => s.toUpperCase().replace(/^\d+\.\s*/, ''));
    for (const anatomySection of ANATOMY_SECTIONS) {
        if (upperSections.some((s) => s.includes(anatomySection))) {
            anatomySections.push(anatomySection);
        }
    }
    const has8SectionAnatomy = anatomySections.length >= 6; // at least 6 of 8 sections

    // Detect second-person language (ignore code blocks)
    const hasSecondPerson = hasSecondPersonLanguage(lines);

    // Detect skill references
    const referencesSkills =
        /\brd[23]:[a-z0-9-]+\b/.test(body) || /\bSkill\s*\(/.test(body) || /\bskills?\b/i.test(body);

    // Detect rules sections (do/don't lists)
    const hasRules =
        /##\s+.*rules/i.test(body) ||
        (/what i always do/i.test(body) && /what i never do/i.test(body)) ||
        (/\bdo\b/i.test(body) && /\bdon'?t\b/i.test(body) && /- \[/m.test(body));

    // Detect output format section
    const hasOutputFormat = /##\s+.*output\s*(format|template)/i.test(body) || /output format/i.test(body);

    return {
        lineCount: lines.length,
        sections,
        has8SectionAnatomy,
        anatomySections,
        hasSecondPerson,
        referencesSkills,
        hasRules,
        hasOutputFormat,
        contentLength: body.length,
    };
}

// ============================================================================
// Template Tier Detection
// ============================================================================

/**
 * Detect the template tier of an agent based on body length and structure.
 */
export function detectTemplateTier(body: string): AgentTemplate {
    const lines = body.split('\n').length;
    const analysis = analyzeBody(body);

    if (analysis.has8SectionAnatomy || lines > 200) {
        return 'specialist';
    }

    if (lines > 50 || analysis.sections.length >= 3) {
        return 'standard';
    }

    return 'minimal';
}

/**
 * Auto-detect weight profile based on agent body analysis.
 * thin-wrapper: agents that delegate to skills
 * specialist: complex domain expert agents
 */
export function detectWeightProfile(body: string): AgentWeightProfile {
    const analysis = analyzeBody(body);
    const tier = detectTemplateTier(body);

    // Specialist tier always uses specialist profile
    if (tier === 'specialist') {
        return 'specialist';
    }

    // If agent references skills or uses delegation patterns, it's a thin wrapper
    if (analysis.referencesSkills) {
        return 'thin-wrapper';
    }

    // Default to thin-wrapper for minimal/standard agents
    return 'thin-wrapper';
}

// ============================================================================
// Section Extraction
// ============================================================================

/**
 * Extract a markdown section by heading name.
 * Returns the content between the heading and the next heading of same or higher level.
 */
export function extractSection(body: string, sectionName: string): string | null {
    // Match ## or # headings containing the section name
    const pattern = new RegExp(`^(#{1,3})\\s+(?:\\d+\\.\\s*)?${escapeRegex(sectionName)}\\s*$`, 'mi');
    const match = body.match(pattern);
    if (!match || match.index === undefined) return null;

    const headingLevel = match[1].length;
    const startIndex = match.index + match[0].length;
    const rest = body.slice(startIndex);

    // Find the next heading of same or higher level
    const nextHeadingPattern = new RegExp(`^#{1,${headingLevel}}\\s+`, 'm');
    const nextMatch = rest.match(nextHeadingPattern);

    if (nextMatch && nextMatch.index !== undefined) {
        return rest.slice(0, nextMatch.index).trim();
    }

    return rest.trim();
}

/**
 * Extract all top-level sections from a markdown body.
 * Returns a map of section name -> content.
 */
export function extractAllSections(body: string): Map<string, string> {
    const sections = new Map<string, string>();
    const lines = body.split('\n');
    let currentSection: string | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,2})\s+(.+)/);
        if (headingMatch) {
            // Save previous section
            if (currentSection !== null) {
                sections.set(currentSection, currentContent.join('\n').trim());
            }
            currentSection = headingMatch[2].trim();
            currentContent = [];
        } else if (currentSection !== null) {
            currentContent.push(line);
        }
    }

    // Save last section
    if (currentSection !== null) {
        sections.set(currentSection, currentContent.join('\n').trim());
    }

    return sections;
}

// ============================================================================
// Markdown Generation Helpers
// ============================================================================

/**
 * Generate a YAML frontmatter block for a Claude Code agent.
 */
export function generateClaudeFrontmatter(agent: UniversalAgent): Record<string, unknown> {
    const fm: Record<string, unknown> = {
        name: agent.name,
        description: agent.description,
    };

    if (agent.tools?.length) fm.tools = agent.tools;
    if (agent.disallowedTools?.length) fm.disallowedTools = agent.disallowedTools;
    if (agent.model) fm.model = agent.model;
    if (agent.maxTurns !== undefined) fm.maxTurns = agent.maxTurns;
    if (agent.permissionMode) fm.permissionMode = agent.permissionMode;
    if (agent.skills?.length) fm.skills = agent.skills;
    if (agent.mcpServers?.length) fm.mcpServers = agent.mcpServers;
    if (agent.hooks && Object.keys(agent.hooks).length > 0) fm.hooks = agent.hooks;
    if (agent.memory) fm.memory = agent.memory;
    if (agent.background !== undefined) fm.background = agent.background;
    if (agent.isolation) fm.isolation = agent.isolation;
    if (agent.color) fm.color = agent.color;

    return fm;
}

/**
 * Generate a complete markdown agent file from UAM.
 */
export function generateAgentMarkdown(frontmatter: Record<string, unknown>, body: string): string {
    return serializeFrontmatter(frontmatter, body);
}

// ============================================================================
// Name Normalization
// ============================================================================

/**
 * Normalize an agent name to hyphen-case.
 * Converts camelCase, PascalCase, snake_case to lowercase-hyphen-case.
 */
export function normalizeAgentName(name: string): string {
    return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[_\s]+/g, '-')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Validate an agent name format.
 * Must be lowercase hyphen-case: [a-z0-9-]+
 */
export function isValidAgentName(name: string): boolean {
    return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(name) && !name.includes('--');
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
