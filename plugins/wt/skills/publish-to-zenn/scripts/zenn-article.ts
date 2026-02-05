import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

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
 * Get publishing method preference
 */
export function getMethodPreference(): 'cli' | 'browser' {
  const config = readWtConfig();
  return config['publish-to-zenn']?.method ?? 'cli';
}

/**
 * Get auto-publish preference
 */
export function getAutoPublishPreference(): boolean {
  const config = readWtConfig();
  return config['publish-to-zenn']?.auto_publish ?? false;
}

/**
 * Get GitHub repository path
 */
export function getGitHubRepo(): string | undefined {
  const config = readWtConfig();
  return config['publish-to-zenn']?.github_repo;
};

// ============================================================================
// Zenn CLI Utilities
// ============================================================================

export const ZENN_URLS = {
  home: 'https://zenn.dev',
  login: 'https://zenn.dev/login',
  githubSetup: 'https://zenn.dev/settings/github',
  articleCreate: 'https://zenn.dev/articles/new',
} as const;

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
// Markdown/HTML Parsing
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
// Git Operations
// ============================================================================

/**
 * Initialize git repository if not already initialized
 */
export async function initGitRepository(repoPath: string): Promise<void> {
  const gitDir = path.join(repoPath, '.git');

  if (fs.existsSync(gitDir)) {
    console.log('[zenn] Git repository already initialized');
    return;
  }

  console.log('[zenn] Initializing git repository...');

  await runCommand(repoPath, 'git', ['init']);
  await runCommand(repoPath, 'git', ['branch', '-M', 'main']);
  await runCommand(repoPath, 'git', ['add', '.']);
  await runCommand(repoPath, 'git', ['commit', '-m', 'Initial commit: Zenn repository initialized']);
}

/**
 * Run git command in directory
 */
async function runCommand(cwd: string, cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr}`));
      }
    });
  });
}

/**
 * Commit and push changes to GitHub
 */
export async function commitAndPush(repoPath: string, message: string): Promise<void> {
  console.log('[zenn] Committing changes...');

  await runCommand(repoPath, 'git', ['add', '.']);
  await runCommand(repoPath, 'git', ['commit', '-m', message]);
  console.log('[zenn] Pushing to GitHub...');

  await runCommand(repoPath, 'git', ['push']);
  console.log('[zenn] Push successful! Article will be deployed by Zenn.');
}

// ============================================================================
// Zenn CLI Operations
// ============================================================================

/**
 * Install Zenn CLI in repository
 */
export async function installZennCli(repoPath: string): Promise<void> {
  const packageJsonPath = path.join(repoPath, 'package.json');

  // Check if zenn-cli is already installed
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['zenn-cli'] || pkg.devDependencies?.['zenn-cli']) {
        console.log('[zenn] Zenn CLI already installed');
        return;
      }
    } catch {
      // Continue with installation
    }
  }

  console.log('[zenn] Installing Zenn CLI...');

  await runCommand(repoPath, 'npm', ['init', '--yes']);
  await runCommand(repoPath, 'npm', ['install', 'zenn-cli']);
  await runCommand(repoPath, 'npx', ['zenn', 'init']);
}

/**
 * Create article using Zenn CLI
 */
export async function createArticle(
  repoPath: string,
  slug: string,
  title: string,
  type: 'tech' | 'idea',
  emoji?: string,
): Promise<string> {
  console.log(`[zenn] Creating article: ${title}`);

  const args = ['new:article', '--slug', slug, '--title', title, '--type', type];
  if (emoji) args.push('--emoji', emoji);

  await runCommand(repoPath, 'npx', ['zenn', ...args]);

  const articlePath = path.join(repoPath, 'articles', `${slug}.md`);
  return articlePath;
}

/**
 * Update article content
 */
export function updateArticleContent(articlePath: string, title: string, content: string, frontmatter: Record<string, unknown>): void {
  let frontmatterStr = '---\n';
  frontmatterStr += `title: ${JSON.stringify(title)}\n`;

  // Add frontmatter fields
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      frontmatterStr += `${key}: [${value.map((v) => JSON.stringify(v)).join(', ')}]\n`;
    } else if (typeof value === 'string') {
      frontmatterStr += `${key}: ${JSON.stringify(value)}\n`;
    } else if (typeof value === 'boolean') {
      frontmatterStr += `${key}: ${value}\n`;
    }
  }

  frontmatterStr += '---\n\n';

  const fullContent = frontmatterStr + content;
  fs.writeFileSync(articlePath, fullContent, 'utf-8');
}

// ============================================================================
// Main Publishing Workflow
// ============================================================================

interface PublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  slug?: string;
  type?: 'tech' | 'idea';
  emoji?: string;
  topics?: string[];
  published?: boolean;
  repo?: string;
  method?: 'cli' | 'browser';
  profileDir?: string;
}

/**
 * Publish article to Zenn
 */
export async function publishToZenn(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[zenn] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      type: options.type,
      emoji: options.emoji,
      topics: options.topics,
      published: options.published,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.slug) article.slug = options.slug;
  if (options.type) article.type = options.type;
  if (options.emoji) article.emoji = options.emoji;
  if (options.topics) article.topics = options.topics;
  if (options.published !== undefined) article.published = options.published;

  // Generate slug if not provided
  if (!article.slug) {
    article.slug = generateSlug(article.title);
  }

  // Validate slug
  if (!/^[a-z0-9-_]{12,}$/.test(article.slug)) {
    throw new Error(`Invalid slug: "${article.slug}". Must be lowercase letters, numbers, hyphens, underscores only (min 12 chars)`);
  }

  // Determine publish status
  const autoPublish = getAutoPublishPreference();
  const published = options.published ?? autoPublish;

  // Determine method
  const method = options.method ?? getMethodPreference();

  console.log(`[zenn] Title: ${article.title}`);
  console.log(`[zenn] Type: ${article.type}`);
  console.log(`[zenn] Topics: ${article.topics?.join(', ') || '(none)'}`);
  console.log(`[zenn] Slug: ${article.slug}`);
  console.log(`[zenn] Status: ${published ? 'published' : 'draft'}`);
  console.log(`[zenn] Method: ${method}`);

  if (method === 'browser') {
    // Fallback to browser automation
    console.log('[zenn] Using browser automation method...');

    // Import browser automation script
    const { publishToZennBrowser } = await import('./zenn-browser.js');
    return publishToZennBrowser({
      markdownFile: options.markdownFile,
      title: article.title,
      content: article.content,
      slug: article.slug,
      type: article.type,
      emoji: article.emoji,
      topics: article.topics,
      published,
      profileDir: options.profileDir,
    });
  }

  // CLI Method (default)
  console.log('[zenn] Using Zenn CLI method...');

  // Get repository path
  const repoPath = options.repo ?? getGitHubRepo();
  if (!repoPath) {
    throw new Error('GitHub repository path not specified. Use --repo or add to ~/.claude/wt/config.jsonc');
  }

  // Resolve repository path (expand ~)
  const resolvedRepoPath = repoPath.startsWith('~')
    ? path.join(os.homedir(), repoPath.slice(2))
    : repoPath;

  // Create repository directory if not exists
  if (!fs.existsSync(resolvedRepoPath)) {
    fs.mkdirSync(resolvedRepoPath, { recursive: true });
  }

  // Install Zenn CLI
  await installZennCli(resolvedRepoPath);

  // Initialize git if needed
  await initGitRepository(resolvedRepoPath);

  // Create article
  const articlePath = await createArticle(
    resolvedRepoPath,
    article.slug,
    article.title,
    article.type || 'tech',
    article.emoji
  );

  // Update article content
  updateArticleContent(articlePath, article.title, article.content, {
    type: article.type,
    emoji: article.emoji || '📝',
    topics: article.topics || [],
    published: published,
  });

  console.log(`[zenn] Article created: ${articlePath}`);
  console.log('');
  console.log('[zenn] Next steps:');
  console.log(`  1. Review article: ${articlePath}`);
  console.log(`  2. Make edits if needed`);
  console.log(`  3. Commit and push:`);
  console.log(`$     cd ${resolvedRepoPath}`);
  console.log(`$     git add .`);
  console.log(`$     git commit -m "Add article: ${article.title}"`);
  console.log(`$     git push`);
  console.log('');
  console.log('[zenn] Article will be automatically deployed by Zenn after push!');

  // If auto-publish is enabled, commit and push automatically
  if (published) {
    console.log('[zenn] Auto-publishing...');
    await commitAndPush(resolvedRepoPath, `Add article: ${article.title}`);
  }

  return articlePath;
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Zenn (zenn.dev) via Zenn CLI

Usage:
  npx -y bun zenn-article.ts [options]

Options:
  --markdown <path>         Markdown file (recommended, supports frontmatter)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --slug <text>             Article slug (URL identifier, auto-generated if not set)
  --type <type>             Article type: tech, idea (default: tech)
  --emoji <emoji>           Article emoji (default: 📝)
  --topics <tag1,tag2>       Comma-separated topics
  --published               Publish immediately (default: draft)
  --repo <path>             GitHub repository path (e.g., ~/repos/zenn-articles)
  --method <method>         Force method: cli (default) or browser
  --profile <dir>           Chrome profile directory (browser method only)

Markdown Frontmatter:
  ---
  title: "記事のタイトル"
  emoji: "📝"
  type: "tech" # or "idea"
  topics: ["zenn", "javascript", "vue"]
  published: false
  slug: "your-article-slug"
  ---

Examples:
  # Create article as draft (default)
  npx -y bun zenn-article.ts --markdown article.md

  # Publish immediately
  npx -y bun zenn-article.ts --markdown article.md --published

  # With custom slug and topics
  npx -y zenn-article.ts --markdown article.md --slug my-guide --topics "react,nextjs"

  # Using browser automation method
  npx -y bun zenn-article.ts --markdown article.md --method browser

Setup (One-time):
  1. Create GitHub repository
  2. Connect to Zenn: https://zenn.dev/login
  3. Initialize zenn-cli: npx zenn init

Repository Configuration:
  Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-zenn": {
         "method": "cli",
         "github_repo": "~/repos/zenn-articles",
         "auto_publish": false
       }
     }
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let markdownFile: string | undefined;
  let title: string | undefined;
  let content: string | undefined;
  let slug: string | undefined;
  let type: 'tech' | 'idea' = 'tech';
  let emoji: string | undefined;
  let topics: string[] = [];
  let published: boolean | undefined;
  let repo: string | undefined;
  let method: 'cli' | 'browser' | undefined;
  let profileDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--slug' && args[i + 1]) slug = args[++i];
    else if (arg === '--type' && args[i + 1]) type = args[++i]! as 'tech' | 'idea';
    else if (arg === '--emoji' && args[i + 1]) emoji = args[++i];
    else if (arg === '--topics' && args[i + 1]) {
      const topicStr = args[++i]!;
      topics.push(...topicStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--published') published = true;
    else if (arg === '--draft') published = false;
    else if (arg === '--repo' && args[i + 1]) repo = args[++i];
    else if (arg === '--method' && args[i + 1]) method = args[++i]! as 'cli' | 'browser';
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }

  await publishToZenn({
    markdownFile,
    title,
    content,
    slug,
    type,
    emoji,
    topics,
    published,
    repo,
    method,
    profileDir,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
