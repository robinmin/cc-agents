import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { getWtConfig } from '@wt/web-automation/config';

const MEDIUM_API_BASE = 'https://api.medium.com/v1';

interface MediumConfig {
  integration_token?: string;
  default_publish_status?: 'public' | 'draft' | 'unlisted';
}

interface MediumUser {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl: string;
}

interface MediumPostResponse {
  data: {
    id: string;
    title: string;
    authorId: string;
    tags: string[];
    url: string;
    publishStatus: string;
    publishedAt: number | null;
    license: string;
    licenseUrl: string;
  };
}

interface PostOptions {
  title: string;
  content: string;
  contentFormat?: 'html' | 'markdown';
  tags?: string[];
  publishStatus?: 'public' | 'draft' | 'unlisted';
  canonicalUrl?: string;
  license?: string;
  notifyFollowers?: boolean;
  integrationToken?: string;
}

// ============================================================================
// Configuration
// ============================================================================

function getMediumConfig(): MediumConfig {
  const wtConfig = getWtConfig();
  return (wtConfig['publish-to-medium'] as MediumConfig) || {};
}

function getIntegrationToken(): string {
  const envToken = process.env.MEDIUM_INTEGRATION_TOKEN?.trim();
  if (envToken) return envToken;

  const config = getMediumConfig();
  const token = config.integration_token;

  if (!token) {
    throw new Error(
      'Medium integration token not found. Set MEDIUM_INTEGRATION_TOKEN environment variable ' +
      'or add integration_token to ~/.claude/wt/config.jsonc under publish-to-medium section.'
    );
  }

  return token;
}

function getDefaultPublishStatus(): 'public' | 'draft' | 'unlisted' {
  const config = getMediumConfig();
  return config.default_publish_status || 'draft';
}

// ============================================================================
// Medium API
// ============================================================================

async function mediumApi<T = unknown>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
  const url = `${MEDIUM_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Medium API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return response.json() as T;
}

export async function getUser(token?: string): Promise<MediumUser> {
  const authToken = token || getIntegrationToken();
  const result = await mediumApi<{ data: MediumUser }>('/me', authToken);
  return result.data;
}

export async function createPost(userId: string, options: PostOptions): Promise<MediumPostResponse> {
  const token = options.integrationToken || getIntegrationToken();
  const publishStatus = options.publishStatus || getDefaultPublishStatus();

  const payload = {
    title: options.title,
    contentFormat: options.contentFormat || 'markdown',
    content: options.content,
    tags: options.tags || [],
    publishStatus,
    ...(options.canonicalUrl && { canonicalUrl: options.canonicalUrl }),
    ...(options.license && { license: options.license }),
    ...(options.notifyFollowers !== undefined && { notifyFollowers: options.notifyFollowers }),
  };

  console.log(`[medium] Creating post: "${options.title}"`);
  console.log(`[medium] Publish status: ${publishStatus}`);
  console.log(`[medium] Tags: ${payload.tags.join(', ') || '(none)'}`);
  console.log(`[medium] Content format: ${payload.contentFormat}`);

  return await mediumApi<MediumPostResponse>(
    `/users/${userId}/posts`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

// ============================================================================
// Markdown/HTML Parsing
// ============================================================================

interface ParsedArticle {
  title: string;
  content: string;
  author?: string;
  tags?: string[];
  canonicalUrl?: string;
}

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
    // Handle array syntax (simple comma-separated)
    else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map((v: string) => v.trim());
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2]! };
}

function parseMarkdownFile(filePath: string): ParsedArticle {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = extractFrontmatter(content);

  const title = (frontmatter.title as string) || '';
  const author = frontmatter.author as string | undefined;
  const tags = frontmatter.tags as string[] | undefined;
  const canonicalUrl = frontmatter.canonicalUrl as string | undefined;

  if (!title) {
    throw new Error('Title is required. Add "title: Your Title" to frontmatter or use --title flag.');
  }

  return {
    title,
    content: body,
    author,
    tags,
    canonicalUrl,
  };
}

function parseHtmlFile(filePath: string): ParsedArticle {
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract title from <title> tag
  const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1]!.trim() : '';

  // Extract meta tags
  const authorMatch = content.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
  const author = authorMatch ? authorMatch[1]! : undefined;

  const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1]! : undefined;

  if (!title) {
    throw new Error('Title is required. Add a <title> tag to your HTML or use --title flag.');
  }

  return {
    title,
    content,
    author,
    canonicalUrl,
  };
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Medium.com via API

Usage:
  npx -y bun publish-to-medium.ts [options]

Options:
  --title <text>            Article title (auto-extracted from markdown/html)
  --content <text>          Article content (use with --title)
  --markdown <path>         Markdown file to post (recommended)
  --html <path>             HTML file to post
  --tags <tag1,tag2>        Comma-separated tags (max 5)
  --status <status>         Publish status: public, draft, unlisted
  --canonical-url <url>     Canonical URL for original content
  --license <license>       License: all-rights-reserved, cc-40-by, etc.
  --notify-followers        Notify followers (default: false)
  --token <token>           Medium integration token (overrides config)

Markdown Frontmatter:
  ---
  title: Article Title
  tags: [tag1, tag2, tag3]
  canonicalUrl: https://example.com
  author: Author Name
  ---

Examples:
  # Post markdown file as draft (default)
  npx -y bun publish-to-medium.ts --markdown article.md

  # Post as public
  npx -y bun publish-to-medium.ts --markdown article.md --status public

  # Post with custom tags
  npx -y bun publish-to-medium.ts --markdown article.md --tags "javascript,typescript,api"

  # Post HTML file
  npx -y bun publish-to-medium.ts --html article.html --status public

  # Post with title and content directly
  npx -y bun publish-to-medium.ts --title "My Title" --content "# Hello World\\n\\nThis is my article."

Setup:
  1. Get integration token: https://medium.com/me/settings
  2. Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-medium": {
         "integration_token": "your_token_here",
         "default_publish_status": "draft"
       }
     }
  3. Or set environment variable: MEDIUM_INTEGRATION_TOKEN
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let title: string | undefined;
  let content: string | undefined;
  let markdownFile: string | undefined;
  let htmlFile: string | undefined;
  const tags: string[] = [];
  let publishStatus: 'public' | 'draft' | 'unlisted' | undefined;
  let canonicalUrl: string | undefined;
  let license: string | undefined;
  let notifyFollowers = false;
  let integrationToken: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--html' && args[i + 1]) htmlFile = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map(t => t.trim()).filter(t => t));
    }
    else if (arg === '--status' && args[i + 1]) {
      const status = args[++i]!;
      if (status !== 'public' && status !== 'draft' && status !== 'unlisted') {
        throw new Error(`Invalid status: ${status}. Must be: public, draft, or unlisted`);
      }
      publishStatus = status;
    }
    else if (arg === '--canonical-url' && args[i + 1]) canonicalUrl = args[++i];
    else if (arg === '--license' && args[i + 1]) license = args[++i];
    else if (arg === '--notify-followers') notifyFollowers = true;
    else if (arg === '--token' && args[i + 1]) integrationToken = args[++i];
  }

  // Validate input
  if (!markdownFile && !htmlFile && !title) {
    throw new Error('Error: --title is required (or use --markdown/--html)');
  }
  if (!markdownFile && !htmlFile && !content) {
    throw new Error('Error: --content, --markdown, or --html is required');
  }

  // Use config defaults
  if (publishStatus === undefined) {
    publishStatus = getDefaultPublishStatus();
  }

  // Parse article from file or use direct content
  let parsed: ParsedArticle;

  if (markdownFile) {
    console.log(`[medium] Parsing markdown: ${markdownFile}`);
    parsed = parseMarkdownFile(markdownFile);
  } else if (htmlFile) {
    console.log(`[medium] Parsing HTML: ${htmlFile}`);
    parsed = parseHtmlFile(htmlFile);
  } else {
    parsed = {
      title: title || '',
      content: content || '',
    };
  }

  // Override with CLI options
  if (title) parsed.title = title;
  if (canonicalUrl) parsed.canonicalUrl = canonicalUrl;

  // Merge tags (CLI tags take precedence and are added to file tags)
  const allTags = [...new Set([...(parsed.tags || []), ...tags])].slice(0, 5);

  console.log(`[medium] Title: ${parsed.title}`);
  console.log(`[medium] Tags: ${allTags.join(', ') || '(none)'}`);
  console.log(`[medium] Status: ${publishStatus}`);

  // Get user info
  console.log('[medium] Fetching user info...');
  const user = await getUser(integrationToken);
  console.log(`[medium] Authenticated as: ${user.name} (@${user.username})`);

  // Create post
  const response = await createPost(user.id, {
    title: parsed.title,
    content: parsed.content,
    contentFormat: markdownFile || (!htmlFile && content?.startsWith('#')) ? 'markdown' : 'html',
    tags: allTags,
    publishStatus,
    canonicalUrl: parsed.canonicalUrl,
    license,
    notifyFollowers,
    integrationToken,
  });

  console.log('');
  console.log('[medium] Post created successfully!');
  console.log(`[medium] Post ID: ${response.data.id}`);
  console.log(`[medium] URL: ${response.data.url}`);
  console.log(`[medium] Status: ${response.data.publishStatus}`);

  if (response.data.publishedAt) {
    const publishedDate = new Date(response.data.publishedAt);
    console.log(`[medium] Published at: ${publishedDate.toISOString()}`);
  } else {
    console.log('[medium] Draft saved. Publish it at: ' + response.data.url.replace(/\/$/, '') + '/edit');
  }
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
