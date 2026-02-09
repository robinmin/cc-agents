/**
 * Substack Article Publisher (Playwright-based)
 *
 * Post markdown articles to Substack.com using Playwright browser automation.
 * This is the migrated version from CDP to Playwright.
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import { mkdir } from 'node:fs/promises';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';

// Import from common web-automation library
import { getWtConfig, expandTilde } from '@wt/web-automation/config';

import {
  trySelectors,
  buildInputSelectors,
  buildButtonSelectors,
  buildEditorSelectors,
  findByLabel,
  exists,
  isVisible,
} from '@wt/web-automation/selectors';

import {
  pwSleep,
  getDefaultProfileDir,
} from '@wt/web-automation/playwright';

// ============================================================================
// Configuration
// ============================================================================

interface SubstackConfig {
  profile_dir?: string;
  auto_publish?: boolean;
}

const DEFAULT_PROFILE_DIR = path.join(os.homedir(), '.local', 'share', 'substack-browser-profile');

// ============================================================================
// Types
// ============================================================================

export interface ParsedArticle {
  title: string;
  content: string;
  subtitle?: string;
  tags?: string[];
}

export interface PublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  subtitle?: string;
  tags?: string[];
  asDraft?: boolean;
  profileDir?: string;
  publicationUrl?: string;
}

// ============================================================================
// Configuration Functions (using common library)
// ============================================================================

function getSubstackConfig(): SubstackConfig {
  const wtConfig = getWtConfig();
  return (wtConfig['publish-to-substack'] as SubstackConfig) || {};
}

function getProfileDir(): string {
  const config = getSubstackConfig();
  const configDir = config.profile_dir;
  if (configDir) {
    return expandTilde(configDir);
  }
  return DEFAULT_PROFILE_DIR;
}

function getAutoPublishPreference(): boolean {
  const config = getSubstackConfig();
  return config.auto_publish ?? false;
}

// ============================================================================
// Substack Selectors
// ============================================================================

const SUBSTACK_SELECTORS = {
  // Title input field
  titleInput: buildInputSelectors({
    placeholder: 'Title',
    name: 'title',
  }),

  // Subtitle input field
  subtitleInput: [
    'input[placeholder*="subtitle" i]',
    'input[placeholder*="Subtitle" i]',
    'textarea[placeholder*="subtitle" i]',
    '[data-testid="subtitle-input"]',
    '[name="subtitle"]',
  ],

  // Content editor (ProseMirror)
  contentEditor: buildEditorSelectors({
    className: 'ProseMirror',
    contentEditable: true,
  }),

  // Tags input field
  tagsInput: [
    'input[placeholder*="tags" i]',
    'input[placeholder*="Tags" i]',
    '[data-testid="tags-input"]',
    '[name="tags"]',
  ],

  // Publish button
  publishButton: buildButtonSelectors({
    text: 'Publish',
  }),

  // Draft button
  draftButton: [
    'button:has-text("Save as draft")',
    'button:has-text("Save draft")',
    'button:has-text("Draft")',
    '[data-testid="draft-button"]',
    '.draft-button',
  ],

  // Write/New Post button
  writeButton: [
    'a:has-text("Write")',
    'button:has-text("Write")',
    '[data-testid="write-button"]',
    '.write-button',
  ],
} as const;

// ============================================================================
// Article Parsing
// ============================================================================

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
      value = value.slice(1, -1).split(',').map((v) => v.trim()).filter((v) => v);
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body: match[2]! };
}

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

// ============================================================================
// Page Functions
// ============================================================================

/**
 * Get the new post URL for a specific publication
 */
function getNewPostUrl(publicationUrl?: string): string {
  if (publicationUrl) {
    const baseUrl = publicationUrl.replace(/\/$/, '');
    return `${baseUrl}/new`;
  }
  return 'https://substack.com/new';
}

/**
 * Check if user is logged in
 */
async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();

  // If on login page, not logged in
  if (url.includes('/signin') || url.includes('/login')) {
    return false;
  }

  // If on new post page or publication home, likely logged in
  if (url.includes('/new') || url.includes('/publish')) {
    return true;
  }

  // Check for logout button (indicates logged in)
  try {
    const hasLogout = await page.locator('button:has-text("Sign out"), button:has-text("Log out"), button:has-text("Logout")').count() > 0;
    return hasLogout;
  } catch {
    return false;
  }
}

/**
 * Wait for user to complete login
 */
async function waitForLogin(page: Page): Promise<void> {
  console.log('');
  console.log('========================================');
  console.log('LOGIN REQUIRED');
  console.log('========================================');
  console.log('Please log in to Substack in the browser window.');
  console.log('The script will continue automatically');
  console.log('after you complete the login.');
  console.log('========================================');
  console.log('');

  // Wait for navigation to authenticated page
  await page.waitForURL(/\/new|\/publish|substack\.com\/$/, { timeout: 300000 });
  console.log('[substack-pw] Login successful!');
}

/**
 * Wait for editor to be ready
 */
async function waitForEditor(page: Page): Promise<void> {
  console.log('[substack-pw] Waiting for editor to load...');

  // Wait for ProseMirror or contenteditable editor
  await page.waitForSelector('.ProseMirror, [contenteditable="true"]', {
    state: 'attached',
    timeout: 15000,
  });

  await pwSleep(1000);
  console.log('[substack-pw] Editor ready');
}

/**
 * Fill in the title field
 */
async function fillTitle(page: Page, title: string): Promise<void> {
  console.log('[substack-pw] Filling in title...');

  const result = await trySelectors(page, SUBSTACK_SELECTORS.titleInput, { timeout: 10000 });

  if (!result.found || !result.locator) {
    throw new Error('Title input not found');
  }

  const locator = result.locator;

  // Click to focus
  await locator.click();
  await pwSleep(200);

  // Clear and type
  await locator.fill('');
  await locator.type(title, { delay: 50 });

  await pwSleep(500);
  console.log('[substack-pw] Title filled');
}

/**
 * Fill in the subtitle field (optional)
 */
async function fillSubtitle(page: Page, subtitle: string): Promise<void> {
  console.log('[substack-pw] Filling in subtitle...');

  const result = await trySelectors(page, SUBSTACK_SELECTORS.subtitleInput, { timeout: 5000 });

  if (!result.found || !result.locator) {
    console.log('[substack-pw] Subtitle field not found (optional, skipping...)');
    return;
  }

  const locator = result.locator;

  // Click to focus
  await locator.click();
  await pwSleep(200);

  // Clear and type
  await locator.fill('');
  await locator.type(subtitle, { delay: 50 });

  await pwSleep(500);
  console.log('[substack-pw] Subtitle filled');
}

/**
 * Fill in the content using ProseMirror editor
 */
async function fillContent(page: Page, content: string): Promise<void> {
  console.log('[substack-pw] Filling in content...');

  const result = await trySelectors(page, SUBSTACK_SELECTORS.contentEditor, { timeout: 10000 });

  if (!result.found || !result.locator) {
    throw new Error('Content editor not found');
  }

  const locator = result.locator;
  const selector = result.selector!;

  // Focus the editor
  await locator.click();
  await pwSleep(300);

  // Try multiple methods to insert content
  let inserted = false;

  // Method 1: Try to use ProseMirror API if available
  try {
    await page.evaluate((sel, text) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      // Check if ProseMirror view is available
      const view = (el as any).__view || (window as any).view;

      if (view) {
        // Use ProseMirror transaction
        const transaction = view.state.tr.insert(0, view.state.schema.text(text));
        view.dispatch(transaction);
        return true;
      }

      return false;
    }, selector, content);

    // Check if content was inserted
    const editorText = await locator.evaluate((el) => (el as HTMLElement).textContent || '');
    if (editorText.length > 10) {
      inserted = true;
    }
  } catch {
    // ProseMirror API not available, try other methods
  }

  // Method 2: Use clipboard paste event
  if (!inserted) {
    await page.evaluate((sel, text) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      // Focus the editor
      el.focus();

      // Create DataTransfer for paste
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      dt.setData('text/html', text);

      // Create and dispatch paste event
      const evt = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(evt);

      return true;
    }, selector, content);

    await pwSleep(500);
  }

  // Method 3: Direct innerHTML (fallback)
  if (!inserted) {
    await page.evaluate((sel, text) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      // Convert markdown to simple HTML (preserve paragraphs)
      const html = text
        .split('\n\n')
        .map((para) => {
          if (para.startsWith('#')) {
            // Heading
            const level = para.match(/^#+/)?.[0]?.length || 1;
            const text = para.replace(/^#+\s*/, '');
            return `<h${level}>${text}</h${level}>`;
          }
          return `<p>${para}</p>`;
        })
        .join('\n');

      el.innerHTML = html;
      return true;
    }, selector, content);
  }

  await pwSleep(1000);
  console.log('[substack-pw] Content filled');
}

/**
 * Add tags to the article
 */
async function addTags(page: Page, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[substack-pw] No tags to add...');
    return;
  }

  console.log(`[substack-pw] Setting tags: ${tags.join(', ')}...`);

  const result = await trySelectors(page, SUBSTACK_SELECTORS.tagsInput, { timeout: 5000 });

  if (!result.found || !result.locator) {
    console.log('[substack-pw] Tags input not found (optional, skipping...)');
    return;
  }

  const locator = result.locator;

  for (const tag of tags) {
    // Click to focus
    await locator.click();
    await pwSleep(100);

    // Type the tag
    await locator.type(tag, { delay: 30 });

    // Press Enter to add the tag
    await page.keyboard.press('Enter');
    await pwSleep(300);
  }

  await pwSleep(500);
  console.log('[substack-pw] Tags added');
}

/**
 * Publish the article or save as draft
 */
async function publishArticle(page: Page, asDraft: boolean): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Publishing';
  console.log(`[substack-pw] ${action}...`);

  const buttonSelectors = asDraft ? SUBSTACK_SELECTORS.draftButton : SUBSTACK_SELECTORS.publishButton;

  const result = await trySelectors(page, buttonSelectors, { timeout: 10000 });

  if (!result.found || !result.locator) {
    // If button not found, try keyboard shortcut
    console.log('[substack-pw] Button not found, trying keyboard shortcut...');

    // Cmd/Ctrl + Enter to publish (Substack shortcut)
    if (process.platform === 'darwin') {
      await page.keyboard.press('Meta+Enter');
    } else {
      await page.keyboard.press('Control+Enter');
    }
  } else {
    // Click the button
    await result.locator.click();
  }

  // Wait for navigation or completion
  await pwSleep(3000);

  // Get the current URL (should be the published/draft article URL)
  const url = page.url();

  return url;
}

// ============================================================================
// Main Publishing Workflow
// ============================================================================

/**
 * Publish article to Substack using Playwright
 */
export async function publishToSubstack(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[substack-pw] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      subtitle: options.subtitle,
      tags: options.tags,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.subtitle) article.subtitle = options.subtitle;
  if (options.tags) article.tags = options.tags;

  // Determine publish status
  const autoPublish = getAutoPublishPreference();
  const asDraft = options.asDraft ?? !autoPublish;

  console.log(`[substack-pw] Title: ${article.title}`);
  console.log(`[substack-pw] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[substack-pw] Status: ${asDraft ? 'draft' : 'publish'}`);

  // Get profile directory
  const profileDir = options.profileDir ?? getProfileDir();
  await mkdir(profileDir, { recursive: true });

  // Get new post URL
  const newPostUrl = getNewPostUrl(options.publicationUrl);
  console.log(`[substack-pw] Navigating to: ${newPostUrl}`);

  // Launch Playwright browser
  console.log(`[substack-pw] Launching browser (profile: ${profileDir})`);
  console.log('[substack-pw] Using Playwright bundled Chromium');

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 100,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-extensions',
    ],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to new post page
    await page.goto(newPostUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Check login status
    const loggedIn = await isLoggedIn(page);

    if (!loggedIn) {
      await waitForLogin(page);

      // Navigate to new post page again if needed
      if (!page.url().includes('/new')) {
        await page.goto(newPostUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      }
    } else {
      console.log('[substack-pw] Already logged in');
    }

    // Wait for editor
    await waitForEditor(page);

    // Fill in the article
    await fillTitle(page, article.title);

    if (article.subtitle) {
      await fillSubtitle(page, article.subtitle);
    }

    await fillContent(page, article.content);

    if (article.tags && article.tags.length > 0) {
      await addTags(page, article.tags);
    }

    // Publish or save as draft
    const articleUrl = await publishArticle(page, asDraft);

    console.log('');
    console.log('[substack-pw] Article saved successfully!');
    console.log(`[substack-pw] URL: ${articleUrl}`);
    console.log(`[substack-pw] Status: ${asDraft ? 'draft' : 'published'}`);

    return articleUrl;
  } catch (error) {
    console.error('[substack-pw] Error:', error instanceof Error ? error.message : String(error));

    // Take screenshot for debugging
    try {
      const screenshotPath = '/tmp/substack-error.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[substack-pw] Error screenshot saved: ${screenshotPath}`);
    } catch {
      // Screenshot failed
    }

    throw error;
  } finally {
    // Keep browser open for user to verify
    console.log('');
    console.log('[substack-pw] Browser window remains open for review.');
    console.log('[substack-pw] Press Ctrl+C to close.');

    // Wait for user to close
    await new Promise(() => {}); // Never resolve, wait for Ctrl+C

    // Close context (when script is terminated)
    await context.close();
  }
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Substack.com via Playwright browser automation

Usage:
  npx -y bun substack-playwright.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --tags <tag1,tag2>        Comma-separated tags
  --subtitle <text>         Article subtitle
  --publish                 Publish as public (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom browser profile directory
  --publication <url>       Substack publication URL

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  tags: [tag1, tag2, tag3]
  ---

Examples:
  # Post markdown as draft (default)
  npx -y bun substack-playwright.ts --markdown article.md

  # Publish immediately
  npx -y bun substack-playwright.ts --markdown article.md --publish

  # Post with custom tags
  npx -y bun substack-playwright.ts --markdown article.md --tags "javascript,typescript,api"

  # Post with title and content directly
  npx -y bun substack-playwright.ts --title "My Title" --content "# Hello World\\n\\nThis is my article."

First Run Setup:
  1. Run any publish command
  2. Browser will open with Substack login page
  3. Log in to your Substack account manually
  4. Session will be saved for subsequent runs

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-substack": {
         "profile_dir": "~/.local/share/substack-browser-profile",
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
  let subtitle: string | undefined;
  let tags: string[] = [];
  let asDraft: boolean | undefined;
  let profileDir: string | undefined;
  let publicationUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--subtitle' && args[i + 1]) subtitle = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--publish') asDraft = false;
    else if (arg === '--draft') asDraft = true;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
    else if (arg === '--publication' && args[i + 1]) publicationUrl = args[++i];
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }

  await publishToSubstack({
    markdownFile,
    title,
    content,
    subtitle,
    tags,
    asDraft,
    profileDir,
    publicationUrl,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
