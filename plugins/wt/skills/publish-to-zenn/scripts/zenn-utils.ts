/**
 * Zenn utilities for CLI and browser automation
 *
 * This module provides shared utilities for Zenn publishing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ============================================================================
// WT Configuration
// ============================================================================

interface WtConfig {
  version?: string;
  'publish-to-zenn'?: {
    method?: 'cli' | 'browser';
    github_repo?: string;
    auto_publish?: boolean;
    profile_dir?: string;
  };
}

/**
 * Read WT plugin configuration from ~/.claude/wt/config.jsonc
 */
export function readWtConfig(): WtConfig {
  const configPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    return JSON.parse(jsonContent) as WtConfig;
  } catch {
    console.debug('[zenn] Failed to read WT config, using defaults');
    return {};
  }
}

/**
 * Get WT profile directory for browser automation
 */
export function getWtProfileDir(): string | undefined {
  const config = readWtConfig();
  return config['publish-to-zenn']?.profile_dir;
}

// ============================================================================
// Zenn URLs
// ============================================================================

export const ZENN_URLS = {
  home: 'https://zenn.dev',
  login: 'https://zenn.dev/login',
  githubSetup: 'https://zenn.dev/settings/github',
  articleCreate: 'https://zenn.dev/articles/new',
} as const;

// ============================================================================
// Article Types
// ============================================================================

export interface ParsedArticle {
  title: string;
  content: string;
  slug?: string;
  type?: 'tech' | 'idea';
  emoji?: string;
  topics?: string[];
  published?: boolean;
  cover?: string;
}

// ============================================================================
// Markdown Parsing
// ============================================================================

/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = match[1]!.split('\n');
  const frontmatter: Record<string, unknown> = {};

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: unknown = line.slice(colonIndex + 1).trim();

    // Handle boolean and number types
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (!isNaN(Number(value))) value = Number(value);
    // Handle array syntax
    else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((v: string) => v.trim()).filter((v) => v);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2]! };
}

/**
 * Parse markdown file and extract article data
 */
export function parseMarkdownFile(filePath: string): ParsedArticle {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = extractFrontmatter(content);

  const title = (frontmatter.title as string) || '';
  const slug = frontmatter.slug as string | undefined;
  const type = (frontmatter.type as string) || 'tech';
  const emoji = frontmatter.emoji as string | undefined;
  const topics = frontmatter.topics as string[] | undefined;
  const published = frontmatter.published as boolean | undefined;
  const cover = frontmatter.cover as string | undefined;

  if (!title) {
    throw new Error('Title is required. Add "title: Your Title" to frontmatter or use --title flag.');
  }

  // Validate type
  if (type !== 'tech' && type !== 'idea') {
    throw new Error(`Invalid type: ${type}. Must be 'tech' or 'idea'.`);
  }

  return {
    title,
    content: body,
    slug,
    type: type as 'tech' | 'idea',
    emoji,
    topics,
    published,
    cover,
  };
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  // Transliterate to ASCII (basic implementation)
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '-') // Remove special chars
    .replace(/\s+/g, '-') // Spaces to hyphens
    .replace(/-+/g, '-') // Multiple hyphens to single
    .trim();

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // Ensure minimum length (Zenn requires 12 characters)
  if (slug.length < 12) {
    // Add timestamp or random suffix
    const timestamp = Date.now().toString(36);
    slug = slug + '-' + timestamp;
  }

  // Limit to reasonable length
  if (slug.length > 100) {
    slug = slug.substring(0, 100);
  }

  return slug;
}

// ============================================================================
// JavaScript String Sanitization (XSS Prevention)
// ============================================================================

/**
 * Sanitize a string for safe insertion into JavaScript code
 *
 * Uses JSON.stringify() which properly escapes:
 * - Backslashes and quotes
 * - Control characters (newlines, tabs, etc.)
 * - Unicode characters
 * - Prevents XSS attacks from malicious content
 */
export function sanitizeForJavaScript(str: string): string {
  return JSON.stringify(str);
}
