import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawn } from 'node:child_process';
import * as process from 'node:process';

import {
  getDefaultPrivatePreference,
  getOrganizationUrlName,
  QIITA_URLS,
  parseMarkdownFile,
  type ParsedArticle,
} from './qiita-utils.js';

// ============================================================================
// Qiita CLI Operations
// ============================================================================

/**
 * Install Qiita CLI in repository
 */
export async function installQiitaCli(projectPath: string): Promise<void> {
  const packageJsonPath = path.join(projectPath, 'package.json');

  // Check if qiita-cli is already installed
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.dependencies?.['@qiita/qiita-cli'] || pkg.devDependencies?.['@qiita/qiita-cli']) {
        console.log('[qiita] Qiita CLI already installed');
        return;
      }
    } catch {
      // Continue with installation
    }
  }

  console.log('[qiita] Installing Qiita CLI...');

  await runCommand(projectPath, 'npm', ['install', '@qiita/qiita-cli', '--save-dev']);
}

/**
 * Initialize Qiita CLI in repository
 */
export async function initQiitaCli(projectPath: string): Promise<void> {
  const configPath = path.join(projectPath, 'qiita.config.json');

  if (fs.existsSync(configPath)) {
    console.log('[qiita] Qiita CLI already initialized');
    return;
  }

  console.log('[qiita] Initializing Qiita CLI...');

  await runCommand(projectPath, 'npx', ['qiita', 'init']);
}

/**
 * Login to Qiita
 */
export async function loginQiita(projectPath: string): Promise<void> {
  console.log('[qiita] Logging in to Qiita...');
  console.log('[qiita] Please enter your Qiita access token when prompted.');
  console.log('[qiita] Generate token at: ' + QIITA_URLS.tokenNew);

  await runCommand(projectPath, 'npx', ['qiita', 'login']);
}

/**
 * Create article using Qiita CLI
 */
export async function createArticle(
  projectPath: string,
  articleName: string
): Promise<string> {
  console.log(`[qiita] Creating article: ${articleName}`);

  const args = ['qiita', 'new', articleName];
  await runCommand(projectPath, 'npx', args);

  const articlePath = path.join(projectPath, 'public', `${articleName}.md`);
  return articlePath;
}

/**
 * Update article content
 */
export function updateArticleContent(
  articlePath: string,
  article: ParsedArticle
): void {
  let frontmatter = '---\n';
  frontmatter += `title: ${JSON.stringify(article.title)}\n`;
  frontmatter += `tags:\n`;
  for (const tag of article.tags) {
    frontmatter += `  - ${JSON.stringify(tag)}\n`;
  }
  frontmatter += `private: ${article.private}\n`;
  if (article.slide !== undefined) frontmatter += `slide: ${article.slide}\n`;
  if (article.organization_url_name !== undefined) {
    frontmatter += `organization_url_name: ${JSON.stringify(article.organization_url_name)}\n`;
  }
  frontmatter += `updated_at: ""\n`;
  frontmatter += `id: null\n`;
  frontmatter += '---\n\n';

  const fullContent = frontmatter + article.content;
  fs.writeFileSync(articlePath, fullContent, 'utf-8');
}

/**
 * Publish article
 */
export async function publishArticle(
  projectPath: string,
  articleName: string,
  force = false
): Promise<void> {
  console.log(`[qiita] Publishing article: ${articleName}`);

  const args = ['qiita', 'publish', articleName];
  if (force) args.push('--force');

  await runCommand(projectPath, 'npx', args);
}

/**
 * Start preview server
 */
export async function startPreview(projectPath: string): Promise<void> {
  console.log('[qiita] Starting preview server...');
  console.log('[qiita] Preview will be available at: http://localhost:8888');
  console.log('[qiita] Press Ctrl+C to stop preview');

  await runCommand(projectPath, 'npx', ['qiita', 'preview']);
}

// ============================================================================
// Main Publishing Workflow (CLI Method)
// ============================================================================

interface CliPublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  tags?: string[];
  private?: boolean;
  slide?: boolean;
  organization?: string;
  preview?: boolean;
  force?: boolean;
  projectPath?: string;
}

/**
 * Publish article to Qiita using Qiita CLI
 */
export async function publishToQiitaCli(options: CliPublishOptions): Promise<string> {
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

  // Get organization from config if not specified
  if (!article.organization_url_name) {
    article.organization_url_name = getOrganizationUrlName();
  }

  // Get default private preference
  if (options.private === undefined) {
    article.private = getDefaultPrivatePreference();
  }

  console.log(`[qiita] Title: ${article.title}`);
  console.log(`[qiita] Tags: ${article.tags.join(', ')}`);
  console.log(`[qiita] Private: ${article.private}`);
  console.log(`[qiita] Slide: ${article.slide ?? false}`);

  // Get project path
  const projectPath = options.projectPath ?? process.cwd();

  // Create project directory if not exists
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  // Install Qiita CLI
  await installQiitaCli(projectPath);

  // Initialize Qiita CLI
  await initQiitaCli(projectPath);

  // Login (check if already logged in)
  const configPath = path.join(os.homedir(), '.config', 'qiita-cli');
  const hasToken = fs.existsSync(configPath);

  if (!hasToken) {
    await loginQiita(projectPath);
  } else {
    console.log('[qiita] Already logged in.');
  }

  // Generate article name from title
  const articleName = article.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);

  // Create article
  const articlePath = await createArticle(projectPath, articleName);

  // Update article content
  updateArticleContent(articlePath, article);

  console.log(`[qiita] Article created: ${articlePath}`);

  // Preview if requested
  if (options.preview) {
    await startPreview(projectPath);
    return articlePath;
  }

  // Publish article
  await publishArticle(projectPath, articleName, options.force);

  console.log('');
  console.log('[qiita] Article published successfully!');
  console.log('[qiita] Check your Qiita dashboard to view the article.');
  console.log(`[qiita] Article file: ${articlePath}`);

  return articlePath;
}

// ============================================================================
// Command Helpers
// ============================================================================

/**
 * Run command in directory
 */
async function runCommand(cwd: string, cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use 'pipe' for stderr to capture it
    const proc = spawn(cmd, args, { cwd, stdio: ['inherit', 'inherit', 'pipe'] });
    let stderr = '';

    proc.stderr?.on('data', (data) => { stderr += data; });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} ${args.join(' ')} failed: ${stderr}`));
      }
    });
  });
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Qiita (qiita.com) via Qiita CLI

Usage:
  npx -y bun qiita-article.ts [options]

Options:
  --markdown <path>         Markdown file (recommended, supports YAML frontmatter)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --tags <tag1,tag2>         Comma-separated tags (required)
  --private                  Limited-sharing article (default: public)
  --public                   Public article
  --slide                    Enable slide mode
  --organization <org>       Organization URL name
  --preview                  Start preview server instead of publishing
  --force                    Force publish (overwrite remote)
  --project <path>           Project directory (default: current directory)

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
  # Create article as public (default)
  npx -y bun qiita-article.ts --markdown article.md

  # Create limited-sharing article
  npx -y bun qiita-article.ts --markdown article.md --private

  # Preview before publishing
  npx -y bun qiita-article.ts --markdown article.md --preview

  # With custom tags
  npx -y bun qiita-article.ts --markdown article.md --tags "python,fastapi"

Setup (One-time):
  1. Generate Qiita access token: https://qiita.com/settings/tokens/new
     - Check: read_qiita (読み取り)
     - Check: write_qiita (書き込み)
  2. Install Qiita CLI: npm install @qiita/qiita-cli --save-dev
  3. Initialize: npx qiita init
  4. Login: npx qiita login
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
  let preview = false;
  let force = false;
  let projectPath: string | undefined;

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
    else if (arg === '--preview') preview = true;
    else if (arg === '--force') force = true;
    else if (arg === '--project' && args[i + 1]) projectPath = args[++i];
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

  await publishToQiitaCli({
    markdownFile,
    title,
    content,
    tags,
    private: privateArticle,
    slide,
    organization,
    preview,
    force,
    projectPath,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
