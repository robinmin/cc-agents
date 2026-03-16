/**
 * Shared utilities for rd3:cc-skills scripts
 *
 * Extracted from validate.ts, evaluate.ts, and refine.ts to eliminate duplication.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
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
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!fmMatch) {
        return { frontmatter: null, body: content, raw: content };
    }

    const yamlContent = fmMatch[1];
    const body = content.slice(fmMatch[0].length).trim();

    try {
        const frontmatter = YAML.parse(yamlContent) as SkillFrontmatter;
        return { frontmatter, body, raw: content };
    } catch {
        return { frontmatter: null, body, raw: content };
    }
}

// ============================================================================
// Resource Discovery
// ============================================================================

/**
 * Discover skill resources (scripts, references, assets) in a skill directory.
 */
export function discoverResources(skillPath: string): SkillResources {
    const resources: SkillResources = {};
    const resourceTypes = ['scripts', 'references', 'assets'] as const;

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
