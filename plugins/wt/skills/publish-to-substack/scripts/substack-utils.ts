import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ============================================================================
// WT Configuration
// ============================================================================

interface WtConfig {
  version?: string;
  'publish-to-substack'?: {
    profile_dir?: string;
    auto_publish?: boolean;
  };
}

let wtConfigCache: WtConfig | null = null;
let wtConfigCacheTime = 0;
const CONFIG_CACHE_TTL_MS = 60_000; // Cache expires after 1 minute

/**
 * Read WT plugin configuration from ~/.claude/wt/config.jsonc
 * Uses caching with TTL to avoid repeated file reads while allowing updates.
 */
export function readWtConfig(): WtConfig {
  const now = Date.now();

  // Return cached config if still valid
  if (wtConfigCache && (now - wtConfigCacheTime) < CONFIG_CACHE_TTL_MS) {
    return wtConfigCache;
  }

  const configPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    // Read and parse JSONC (allows comments)
    const content = fs.readFileSync(configPath, 'utf-8');

    // Strip comments for JSON parsing
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const parsed = JSON.parse(jsonContent) as WtConfig;

    wtConfigCache = parsed;
    wtConfigCacheTime = now;
    return parsed;
  } catch (error) {
    console.debug('[substack-utils] Failed to read WT config, using defaults:', error);
    return {};
  }
}

/**
 * Expand tilde (~) in file paths to user's home directory
 */
export function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

/**
 * Get default profile directory for Substack browser from WT config
 */
export function getWtProfileDir(): string | undefined {
  const config = readWtConfig();
  const configProfileDir = config['publish-to-substack']?.profile_dir;

  if (configProfileDir) {
    return expandTilde(configProfileDir);
  }

  return undefined;
}

/**
 * Get auto-publish preference from WT config
 * @returns true if auto-publish is enabled (publishes immediately without draft)
 */
export function getAutoPublishPreference(): boolean {
  const config = readWtConfig();
  return config['publish-to-substack']?.auto_publish ?? false;
}

// ============================================================================
// Substack URLs
// ============================================================================

export const SUBSTACK_URLS = {
  home: 'https://substack.com',
  newPost: 'https://substack.com/new',
  publish: 'https://substack.com/publish',
} as const;

/**
 * Get the new post URL for a specific publication
 * @param publicationUrl - Optional publication URL (e.g., "https://yourpublication.substack.com")
 * @returns URL for creating a new post
 */
export function getNewPostUrl(publicationUrl?: string): string {
  if (publicationUrl) {
    // Remove trailing slash and add /new
    const baseUrl = publicationUrl.replace(/\/$/, '');
    return `${baseUrl}/new`;
  }
  return SUBSTACK_URLS.newPost;
}

// ============================================================================
// Markdown/HTML Parsing
// ============================================================================

export interface ParsedArticle {
  title: string;
  content: string;
  subtitle?: string;
  tags?: string[];
}

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
    // Handle array syntax (simple comma-separated or YAML array)
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
  const subtitle = frontmatter.subtitle as string | undefined;
  const tags = frontmatter.tags as string[] | undefined;

  if (!title) {
    throw new Error('Title is required. Add "title: Your Title" to frontmatter or use --title flag.');
  }

  return {
    title,
    content: body,
    subtitle,
    tags,
  };
}

/**
 * Convert markdown to HTML for Substack editor
 * Note: Substack uses ProseMirror, which accepts HTML content
 * This is a simple converter - for production, consider using a proper markdown library
 */
export function markdownToHtml(markdown: string): string {
  // Escape the markdown content for safe JavaScript string embedding
  const escaped = markdown
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');

  // Simple markdown to HTML conversion
  // This will be done in JavaScript, so we return the escaped string
  return escaped;
}

/**
 * Sanitize string for safe embedding in JavaScript code (via JSON.stringify)
 * This prevents XSS attacks when embedding user content into template literals
 */
export function sanitizeForJavaScript(str: string): string {
  // Use JSON.stringify for proper JavaScript string escaping
  // This handles: backticks, quotes, backslashes, newlines, and other special characters
  return JSON.stringify(str);
}
