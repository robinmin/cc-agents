/**
 * Shared utilities for rd3 plugin
 *
 * Common file operations, path handling, and validation helpers
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

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
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): ParsedSkill | null {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!match) {
        return null;
    }

    const rawFrontmatter = match[1];
    const body = match[2];

    // Simple YAML parsing for basic structures
    const frontmatter: SkillFrontmatter = {
        name: '',
        description: '',
    };

    const lines = rawFrontmatter.split('\n');
    let inMetadata = false;
    let metadataObj: Record<string, unknown> = {};

    for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Handle nested metadata
        if (inMetadata && line.startsWith('  ')) {
            const nestedMatch = line.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
            if (nestedMatch) {
                metadataObj[nestedMatch[1]] = parseYamlValue(nestedMatch[2]);
            }
            continue;
        }

        inMetadata = false;

        // Parse key: value
        const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (kvMatch) {
            const key = kvMatch[1];
            const value = kvMatch[2];

            if (key === 'metadata') {
                inMetadata = true;
                metadataObj = {};
                continue;
            }

            const parsedValue = parseYamlValue(value);

            if (key === 'name' || key === 'description') {
                frontmatter[key] = typeof parsedValue === 'string' ? parsedValue : String(parsedValue);
            } else {
                frontmatter[key] = parsedValue;
            }
        }
    }

    if (Object.keys(metadataObj).length > 0) {
        frontmatter.metadata = metadataObj;
    }

    return {
        frontmatter,
        body,
        raw: content,
    };
}

/**
 * Parse a YAML value (string, number, boolean, quoted string)
 */
function parseYamlValue(value: string): unknown {
    // Handle empty value
    if (!value || value.trim() === '') {
        return '';
    }

    // Handle quoted strings
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }

    // Handle booleans
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Handle numbers
    const num = Number(value);
    if (!Number.isNaN(num)) return num;

    // Return as string
    return value;
}

/**
 * Generate YAML frontmatter string
 */
export function generateFrontmatter(frontmatter: SkillFrontmatter): string {
    const lines: string[] = ['---'];

    // Required fields first
    lines.push(`name: ${frontmatter.name}`);
    lines.push(`description: ${frontmatter.description}`);

    // Metadata block
    if (frontmatter.metadata && Object.keys(frontmatter.metadata).length > 0) {
        lines.push('metadata:');
        for (const [key, value] of Object.entries(frontmatter.metadata)) {
            lines.push(`  ${key}: ${formatYamlValue(value)}`);
        }
    }

    // Other fields
    for (const [key, value] of Object.entries(frontmatter)) {
        if (key === 'name' || key === 'description' || key === 'metadata') continue;
        lines.push(`${key}: ${formatYamlValue(value)}`);
    }

    lines.push('---');
    return lines.join('\n');
}

/**
 * Format a value for YAML output
 */
function formatYamlValue(value: unknown): string {
    if (typeof value === 'string') {
        // Quote if contains special characters
        if (value.includes(':') || value.includes('#') || value.includes('\n')) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }

    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (value === null || value === undefined) return '""';

    return String(value);
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
