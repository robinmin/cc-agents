import * as process from 'node:process';

import {
  getAccessToken,
  QIITA_URLS,
  parseMarkdownFile,
  buildApiHeaders,
  buildApiPayload,
  parseApiResponse,
  type ParsedArticle,
} from './qiita-utils.js';

// ============================================================================
// Qiita API v2 Operations
// ============================================================================

/**
 * Create article via Qiita API v2
 */
export async function createArticleViaApi(
  accessToken: string,
  article: ParsedArticle
): Promise<string> {
  console.log('[qiita] Publishing via API v2...');
  console.log(`[qiita] Title: ${article.title}`);
  console.log(`[qiita] Tags: ${article.tags.join(', ')}`);
  console.log(`[qiita] Private: ${article.private}`);
  console.log(`[qiita] Slide: ${article.slide ?? false}`);

  const payload = buildApiPayload(article);
  const headers = buildApiHeaders(accessToken);

  const response = await fetch(QIITA_URLS.items, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const result = parseApiResponse(data);

  console.log('');
  console.log('[qiita] Article published successfully!');
  console.log(`[qiita] URL: ${result.url}`);
  console.log(`[qiita] ID: ${result.id}`);

  return result.url;
}

/**
 * Update existing article via Qiita API v2
 */
export async function updateArticleViaApi(
  accessToken: string,
  articleId: string,
  article: ParsedArticle
): Promise<string> {
  console.log(`[qiita] Updating article: ${articleId}`);

  const payload = buildApiPayload(article);
  const headers = buildApiHeaders(accessToken);

  const response = await fetch(`${QIITA_URLS.items}/${articleId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  const result = parseApiResponse(data);

  console.log('[qiita] Article updated successfully!');
  console.log(`[qiita] URL: ${result.url}`);

  return result.url;
}

// ============================================================================
// Main Publishing Workflow (API Method)
// ============================================================================

interface ApiPublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  tags?: string[];
  private?: boolean;
  slide?: boolean;
  organization?: string;
  token?: string;
  articleId?: string;
  update?: boolean;
}

/**
 * Publish article to Qiita using Qiita API v2
 */
export async function publishToQiitaApi(options: ApiPublishOptions): Promise<string> {
  // Get access token
  const accessToken = options.token ?? getAccessToken();
  if (!accessToken) {
    throw new Error(
      'Qiita access token not found. Set QIITA_TOKEN environment variable ' +
      'or add to ~/.claude/wt/config.jsonc\n' +
      'Generate token at: ' + QIITA_URLS.tokenNew
    );
  }

  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[qiita] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    if (!options.tags || options.tags.length === 0) {
      throw new Error('Tags are required. Use --tags flag.');
    }
    article = {
      title: options.title,
      content: options.content,
      tags: options.tags,
      private: options.private ?? false,
      slide: options.slide,
      organization_url_name: options.organization,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content and --tags)');
  }

  // Override with CLI options
  if (options.private !== undefined) article.private = options.private;
  if (options.slide !== undefined) article.slide = options.slide;
  if (options.organization !== undefined) article.organization_url_name = options.organization;

  // Update or create
  if (options.update && options.articleId) {
    return await updateArticleViaApi(accessToken, options.articleId, article);
  } else {
    return await createArticleViaApi(accessToken, article);
  }
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Qiita (qiita.com) via Qiita API v2

Usage:
  npx -y bun qiita-api.ts [options]

Options:
  --markdown <path>         Markdown file (recommended, supports YAML frontmatter)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --tags <tag1,tag2>         Comma-separated tags (required)
  --private                  Limited-sharing article (default: public)
  --public                   Public article
  --slide                    Enable slide mode
  --organization <org>       Organization URL name
  --token <token>            Qiita access token
  --article-id <id>         Article ID (for updates)
  --update                   Update existing article

Environment Variables:
  QIITA_TOKEN               Qiita access token (alternative to --token)

Markdown Frontmatter (YAML):
  ---
  title: "記事のタイトル"
  tags:
    - "JavaScript"
    - "React"
  private: false
  slide: false
  organization_url_name: "your-org"
  ---

Examples:
  # Publish new article
  npx -y bun qiita-api.ts --markdown article.md

  # With explicit token
  npx -y bun qiita-api.ts --markdown article.md --token YOUR_TOKEN

  # Update existing article
  npx -y bun qiita-api.ts --article-id abc123 --markdown article.md --update

  # Publish limited-sharing article
  npx -y bun qiita-api.ts --markdown article.md --private

Setup:
  1. Generate Qiita access token: https://qiita.com/settings/tokens/new
     - Check: read_qiita (読み取り)
     - Check: write_qiita (書き込み)
  2. Set QIITA_TOKEN environment variable:
     export QIITA_TOKEN="your_token_here"
  3. Or add to ~/.claude/wt/config.jsonc
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let markdownFile: string | undefined;
  let title: string | undefined;
  let content: string | undefined;
  let tags: string[] = [];
  let privateArticle: boolean | undefined;
  let slide: boolean | undefined;
  let organization: string | undefined;
  let token: string | undefined;
  let articleId: string | undefined;
  let update = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--private') privateArticle = true;
    else if (arg === '--public') privateArticle = false;
    else if (arg === '--slide') slide = true;
    else if (arg === '--organization' && args[i + 1]) organization = args[++i];
    else if (arg === '--token' && args[i + 1]) token = args[++i];
    else if (arg === '--article-id' && args[i + 1]) articleId = args[++i];
    else if (arg === '--update') update = true;
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }
  if (!markdownFile && (!tags || tags.length === 0)) {
    throw new Error('Error: --tags is required (or use --markdown)');
  }
  if (update && !articleId) {
    throw new Error('Error: --article-id is required when using --update');
  }

  await publishToQiitaApi({
    markdownFile,
    title,
    content,
    tags,
    private: privateArticle,
    slide,
    organization,
    token,
    articleId,
    update,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
