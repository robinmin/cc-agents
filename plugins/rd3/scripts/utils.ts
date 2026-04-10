/**
 * Shared utilities for rd3 plugin
 *
 * Common file operations, path handling, and validation helpers
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from './fs';
import { basename, dirname, join, resolve } from 'node:path';
import { parseMarkdownFrontmatter, serializeMarkdownFrontmatter } from './markdown-frontmatter';

// ============================================================================
// Types
// ============================================================================

export interface SkillFrontmatter {
    name: string;
    description: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface ParsedSkill {
    frontmatter: SkillFrontmatter;
    body: string;
    raw: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

export const MAX_SKILL_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_SKILL_MD_LINES = 500;

export const ALLOWED_RESOURCE_TYPES = ['scripts', 'references', 'assets'] as const;
export type ResourceType = (typeof ALLOWED_RESOURCE_TYPES)[number];

export const SKILL_FILE_NAME = 'SKILL.md';

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Normalize a skill name to lowercase hyphen-case
 */
export function normalizeSkillName(name: string): string {
    let normalized = name.trim().toLowerCase();
    normalized = normalized.replace(/[^a-z0-9]+/g, '-');
    normalized = normalized.replace(/^-+|-+$/g, '');
    normalized = normalized.replace(/-{2,}/g, '-');
    return normalized;
}

/**
 * Convert hyphenated skill name to Title Case
 */
export function titleCaseSkillName(name: string): string {
    return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Check if a string is a valid skill name
 */
export function isValidSkillName(name: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!name || name.length === 0) {
        errors.push('Skill name cannot be empty');
        return { valid: false, errors, warnings };
    }

    const normalized = normalizeSkillName(name);

    if (normalized.length > MAX_SKILL_NAME_LENGTH) {
        errors.push(`Skill name exceeds maximum length (${normalized.length}/${MAX_SKILL_NAME_LENGTH})`);
    }

    if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
        errors.push('Skill name must start with a letter and contain only lowercase letters, digits, and hyphens');
    }

    if (normalized !== name) {
        warnings.push(`Skill name will be normalized to '${normalized}'`);
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// File System Utilities
// ============================================================================

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(path: string): void {
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
}

/**
 * Check if a path exists
 */
export function pathExists(path: string): boolean {
    return existsSync(path);
}

/**
 * Read a file as string
 */
export function readFile(path: string): string {
    return readFileSync(path, 'utf-8');
}

/**
 * Write a string to a file, creating directories if needed
 */
export function writeFile(path: string, content: string): void {
    ensureDir(dirname(path));
    writeFileSync(path, content, 'utf-8');
}

/**
 * List files in a directory
 */
export function listFiles(dir: string, pattern?: RegExp): string[] {
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir);
    return files.filter((f) => !pattern || pattern.test(f));
}

/**
 * Check if path is a directory
 */
export function isDirectory(path: string): boolean {
    if (!existsSync(path)) return false;
    return statSync(path).isDirectory();
}

/**
 * Check if path is a file
 */
export function isFile(path: string): boolean {
    if (!existsSync(path)) return false;
    return statSync(path).isFile();
}

// ============================================================================
// YAML/Markdown Parsing
// ============================================================================

/**
 * Parse YAML frontmatter from markdown content.
 * Delegates to the shared `markdown-frontmatter` module.
 */
export function parseFrontmatter(content: string): ParsedSkill | null {
    const parsed = parseMarkdownFrontmatter(content);
    if (!parsed.frontmatter) {
        return null;
    }
    const fm = parsed.frontmatter;
    return {
        frontmatter: {
            name: (fm.name as string) || '',
            description: (fm.description as string) || '',
            ...fm,
        } as SkillFrontmatter,
        body: parsed.body,
        raw: parsed.raw,
    };
}

/**
 * Generate YAML frontmatter string.
 * Delegates to the shared `markdown-frontmatter` module.
 */
export function generateFrontmatter(frontmatter: SkillFrontmatter): string {
    const { name, description, metadata, ...rest } = frontmatter;
    const record: Record<string, unknown> = {
        name,
        description,
        ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
        ...rest,
    };
    // Use serializeMarkdownFrontmatter with an empty body, then strip the trailing newlines
    return serializeMarkdownFrontmatter(record, '').trimEnd();
}

/**
 * Validate a parsed skill frontmatter
 */
export function validateFrontmatter(frontmatter: SkillFrontmatter): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!frontmatter.name || frontmatter.name.trim() === '') {
        errors.push("Missing required field: 'name'");
    } else {
        if (frontmatter.name.length > MAX_SKILL_NAME_LENGTH) {
            errors.push(`'name' exceeds maximum length (${frontmatter.name.length}/${MAX_SKILL_NAME_LENGTH})`);
        }
        if (!/^[a-z][a-z0-9-]*$/.test(frontmatter.name)) {
            errors.push("'name' must be lowercase hyphen-case starting with a letter");
        }
    }

    if (!frontmatter.description || frontmatter.description.trim() === '') {
        errors.push("Missing required field: 'description'");
    } else {
        if (frontmatter.description.length > MAX_DESCRIPTION_LENGTH) {
            warnings.push(
                `'description' exceeds recommended length (${frontmatter.description.length}/${MAX_DESCRIPTION_LENGTH})`,
            );
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Path Resolution
// ============================================================================

/**
 * Resolve a skill path relative to a base directory
 */
export function resolveSkillPath(skillName: string, basePath: string): string {
    return resolve(basePath, skillName);
}

/**
 * Get the skill name from a directory path
 */
export function getSkillNameFromPath(skillPath: string): string {
    return basename(skillPath);
}

/**
 * Get the SKILL.md path for a skill directory
 */
export function getSkillMdPath(skillPath: string): string {
    return join(skillPath, SKILL_FILE_NAME);
}

// ============================================================================
// Resource Handling
// ============================================================================

/**
 * Parse resource types from comma-separated string
 */
export function parseResourceTypes(resources?: string): ResourceType[] {
    if (!resources) return [];

    const types = resources
        .split(',')
        .map((r) => r.trim() as ResourceType)
        .filter((r) => ALLOWED_RESOURCE_TYPES.includes(r));

    // Remove duplicates while preserving order
    return [...new Set(types)];
}

/**
 * Validate resource types string
 */
export function validateResourceTypes(resources?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!resources) return { valid: true, errors, warnings };

    const types = resources.split(',').map((r) => r.trim());
    const invalid = types.filter((r) => r && !ALLOWED_RESOURCE_TYPES.includes(r as ResourceType));

    if (invalid.length > 0) {
        errors.push(`Unknown resource type(s): ${invalid.join(', ')}`);
        errors.push(`   Allowed: ${ALLOWED_RESOURCE_TYPES.join(', ')}`);
    }

    return { valid: errors.length === 0, errors, warnings };
}
