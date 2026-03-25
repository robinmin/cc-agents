/**
 * Shared utilities for rd3:cc-skills scripts
 *
 * Extracted from validate.ts, evaluate.ts, and refine.ts to eliminate duplication.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseMarkdownFrontmatter } from '../../../scripts/markdown-frontmatter';
import type { SkillFrontmatter, SkillResources } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ParsedFrontmatter {
    frontmatter: SkillFrontmatter | null;
    body: string;
    /** Raw original content (same as input) */
    raw: string;
}

// ============================================================================
// Frontmatter Parsing
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content.
 *
 * Returns the parsed frontmatter object, the body (content after frontmatter),
 * and the raw original content string.
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
    const parsed = parseMarkdownFrontmatter(content);
    return {
        frontmatter: parsed.frontmatter as SkillFrontmatter | null,
        body: parsed.body,
        raw: parsed.raw,
    };
}

// ============================================================================
// Resource Discovery
// ============================================================================

/**
 * Discover skill resources (scripts, references, assets) in a skill directory.
 */
export function discoverResources(skillPath: string): SkillResources {
    const resources: SkillResources = {};
    const resourceTypes = ['scripts', 'references', 'assets', 'agents'] as const;

    for (const type of resourceTypes) {
        const resourcePath = join(skillPath, type);
        if (existsSync(resourcePath)) {
            const stat = statSync(resourcePath);
            if (stat.isDirectory()) {
                const files = readdirSync(resourcePath).filter((f: string) => {
                    const filePath = join(resourcePath, f);
                    return statSync(filePath).isFile();
                });
                resources[type] = files;
            }
        }
    }

    return resources;
}
