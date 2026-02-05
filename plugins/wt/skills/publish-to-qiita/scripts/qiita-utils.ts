/**
 * Qiita utilities for CLI and API methods
 *
 * This module provides shared utilities for Qiita publishing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ============================================================================
// WT Configuration
// ============================================================================

interface WtConfig {
  version?: string;
  env?: Record<string, string>;
  'publish-to-qiita'?: {
    method?: 'cli' | 'api';
    access_token?: string;
    default_private?: boolean;
    default_slide?: boolean;
    organization_url_name?: string;
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
    console.debug('[qiita] Failed to read WT config, using defaults');
    return {};
  }
}

/**
 * Get method preference
 */
export function getMethodPreference(): 'cli' | 'api' {
  const config = readWtConfig();
  return config['publish-to-qiita']?.method ?? 'cli';
}

/**
 * Get default private preference
 */
export function getDefaultPrivatePreference(): boolean {
  const config = readWtConfig();
  return config['publish-to-qiita']?.default_private ?? false;
}

/**
 * Load environment variables from config.jsonc into process.env
 * This implements the WT plugin pattern where env vars are auto-injected
 */
function loadEnvFromConfig(): void {
  const config = readWtConfig();
  if (config.env) {
    for (const [key, value] of Object.entries(config.env)) {
      if (value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

/**
 * Get Qiita access token
 * Priority: 1) process.env.QIITA_TOKEN, 2) config.jsonc env, 3) deprecated access_token field
 */
export function getAccessToken(): string | undefined {
  // First, load env from config.jsonc (WT pattern)
  loadEnvFromConfig();

  // Priority 1: Environment variable (already set or loaded from config.jsonc env)
  if (process.env.QIITA_TOKEN) {
    return process.env.QIITA_TOKEN;
  }

  // Priority 2: Deprecated access_token field (backward compatibility)
  return readWtConfig()['publish-to-qiita']?.access_token;
}

/**
 * Get organization URL name
 */
export function getOrganizationUrlName(): string | undefined {
  return readWtConfig()['publish-to-qiita']?.organization_url_name;
}

// ============================================================================
// Qiita URLs
// ============================================================================

export const QIITA_URLS = {
  home: 'https://qiita.com',
  login: 'https://qiita.com/login',
  tokenNew: 'https://qiita.com/settings/tokens/new',
  apiBase: 'https://qiita.com/api/v2',
  items: 'https://qiita.com/api/v2/items',
} as const;

// ============================================================================
// Article Types
// ============================================================================

export interface ParsedArticle {
  title: string;
  content: string;
  tags: string[];
  private: boolean;
  slide?: boolean;
  organization_url_name?: string;
  tweet?: boolean;
  id?: string;
  updated_at?: string;
}

// ============================================================================
// Markdown Parsing
// ============================================================================

/**
 * Extract YAML frontmatter from markdown content
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
    // Handle array syntax (YAML block style)
    else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((v: string) => v.trim()).filter((v) => v).map((v: string) => {
      // Remove quotes if present
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
      }
      return v;
    });
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
  const tags = frontmatter.tags as string[] || [];
  const privateArticle = frontmatter.private as boolean | undefined;
  const slide = frontmatter.slide as boolean | undefined;
  const organizationUrlName = frontmatter.organization_url_name as string | undefined;
  const tweet = frontmatter.tweet as boolean | undefined;
  const id = frontmatter.id as string | undefined;
  const updatedAt = frontmatter.updated_at as string | undefined;

  if (!title) {
    throw new Error('Title is required. Add "title: Your Title" to frontmatter or use --title flag.');
  }

  if (!tags || tags.length === 0) {
    throw new Error('Tags are required. Add "tags: ["tag1", "tag2"]" to frontmatter or use --tags flag.');
  }

  return {
    title,
    content: body,
    tags,
    private: privateArticle ?? false,
    slide,
    organization_url_name: organizationUrlName,
    tweet,
    id,
    updated_at: updatedAt,
  };
}

// ============================================================================
// API Request Helpers
// ============================================================================

/**
 * Build API request headers
 */
export function buildApiHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Build API request payload
 */
export function buildApiPayload(article: ParsedArticle): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: article.title,
    body: article.content,
    tags: article.tags.map((name) => ({ name })),
    private: article.private,
  };

  if (article.slide !== undefined) payload.slide = article.slide;
  if (article.organization_url_name !== undefined) payload.organization_url_name = article.organization_url_name;
  if (article.tweet !== undefined) payload.tweet = article.tweet;

  return payload;
}

/**
 * Parse API response
 */
export interface QiitaArticleResponse {
  id: string;
  title: string;
  url: string;
  rendered_body: string;
  body: string;
  private: boolean;
  slide: boolean;
  tags: Array<{ name: string; versions?: string[] }>;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    name: string;
    profile_image_url: string;
  };
  organization_url_name?: string;
}

export function parseApiResponse(response: unknown): QiitaArticleResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid API response');
  }

  const data = response as Record<string, unknown>;

  if (!data.id || !data.url) {
    throw new Error('API response missing required fields');
  }

  return data as unknown as QiitaArticleResponse;
}
