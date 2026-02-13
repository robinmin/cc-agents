import { mkdir } from 'node:fs/promises';
import * as process from 'node:process';
import * as path from 'node:path';
import * as os from 'node:os';
import { chromium, type Page } from 'playwright';
import { trySelectors, buildInputSelectors, buildEditorSelectors, buildSelectSelectors, buildButtonSelectors } from '@wt/web-automation/selectors';
import { pwSleep } from '@wt/web-automation/playwright';
import {
  getWtProfileDir,
  ZENN_URLS,
  generateSlug,
  parseMarkdownFile,
  type ParsedArticle,
} from './zenn-utils.js';

// ============================================================================
// Zenn DOM Selectors (built using common utilities)
// ============================================================================

const ZENN_SELECTORS = {
  // Title input field
  titleInput: buildInputSelectors({
    placeholder: 'タイトル',
    type: 'text',
  }),

  // Content editor (Zenn uses markdown editor)
  contentEditor: buildEditorSelectors({
    className: 'CodeMirror',
    contentEditable: true,
  }),

  // Article type selector
  typeSelect: buildSelectSelectors({
    name: 'type',
    className: 'article-type',
  }),

  // Topics/tags input field
  topicsInput: buildInputSelectors({
    placeholder: 'トピック',
    name: 'topics',
  }),

  // Publish button
  publishButton: buildButtonSelectors({
    text: '公開',
    type: 'submit',
  }),

  // Draft/Save button
  draftButton: buildButtonSelectors({
    text: '下書き',
  }),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for page to be fully loaded and editor to be ready
 */
async function waitForPageReady(page: Page, timeoutMs = 20000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      // Check if any editor is present
      const editorResult = await trySelectors(page, ZENN_SELECTORS.contentEditor, { timeout: 2000, visible: true });
      if (editorResult.found) {
        console.log('[zenn-pw] Editor ready');
        return;
      }
    } catch {
      // Keep trying
    }
    await pwSleep(500);
  }

  console.log('[zenn-pw] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  console.log(`[zenn-pw] Current URL: ${currentUrl}`);

  // Check if on login page
  if (currentUrl.includes('login')) {
    return false;
  }

  // Check for logged-in indicators
  try {
    const isLoggedIn = await page.locator('.user-avatar, .logout-button, [class*="user"]').first().count() > 0;
    return isLoggedIn;
  } catch {
    return false;
  }
}

/**
 * Fill in the title field
 */
async function fillTitle(page: Page, title: string): Promise<void> {
  console.log('[zenn-pw] Filling in title...');

  const result = await trySelectors(page, ZENN_SELECTORS.titleInput, { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Title input not found');
  }

  await result.locator.clear();
  await result.locator.fill(title);
  await pwSleep(500);

  console.log('[zenn-pw] Title filled');
}

/**
 * Fill in the content editor
 */
async function fillContent(page: Page, content: string): Promise<void> {
  console.log('[zenn-pw] Filling in content...');

  const result = await trySelectors(page, ZENN_SELECTORS.contentEditor, { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Content editor not found');
  }

  // Try to fill content using different methods based on editor type
  const element = result.locator;

  // First try with CodeMirror editor
  try {
    const isCodeMirror = await element.locator('.CodeMirror-code').count() > 0;
    if (isCodeMirror) {
      // Use CodeMirror's API
      await page.evaluate((text) => {
        if ((window as any).editor && (window as any).editor.setValue) {
          (window as any).editor.setValue(text);
        } else {
          // Fallback if editor global is not available
          const cm = document.querySelector('.CodeMirror') as any;
          if (cm && cm.CodeMirror) cm.CodeMirror.setValue(text);
        }
      }, content);
      console.log('[zenn-pw] Content filled using CodeMirror API');
      await pwSleep(1000);
      return;
    }
  } catch {
    // Not CodeMirror, continue with other methods
  }

  // Try contenteditable approach with HTML if possible
  try {
    // If we have markdown, we might want to convert to simple HTML for contenteditable
    // But for Zenn, it's usually a markdown editor, so text content is fine.
    // We use innerText to preserve line breaks better than textContent
    await element.evaluate((el: HTMLElement, text) => {
      el.focus();
      if (el.tagName === 'DIV' && el.getAttribute('contenteditable') === 'true') {
        el.innerText = text;
      } else {
        el.textContent = text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, content);
    console.log('[zenn-pw] Content filled using contentEditable (innerText)');
    await pwSleep(1000);
    return;
  } catch (e) {
    console.log(`[zenn-pw] contentEditable fill failed: ${e}. Trying Playwright fill...`);
    // Last resort: use Playwright's fill
    await element.fill(content);
    console.log('[zenn-pw] Content filled using Playwright fill');
    await pwSleep(1000);
  }
}

/**
 * Set article type
 */
async function setType(page: Page, type: 'tech' | 'idea'): Promise<void> {
  console.log(`[zenn-pw] Setting article type: ${type}...`);

  const result = await trySelectors(page, ZENN_SELECTORS.typeSelect, { timeout: 2000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[zenn-pw] Type selector not found (optional, skipping...)');
    return;
  }

  try {
    await result.locator.selectOption({ label: type });
    console.log('[zenn-pw] Type set');
    await pwSleep(500);
  } catch {
    console.log('[zenn-pw] Failed to set type (optional, skipping...)');
  }
}

/**
 * Add topics to the article
 */
async function addTopics(page: Page, topics: string[]): Promise<void> {
  if (topics.length === 0) {
    console.log('[zenn-pw] No topics to add...');
    return;
  }

  console.log(`[zenn-pw] Setting topics: ${topics.join(', ')}...`);

  const result = await trySelectors(page, ZENN_SELECTORS.topicsInput, { timeout: 2000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[zenn-pw] Topics input not found (optional, skipping...)');
    return;
  }

  const input = result.locator;

  for (const topic of topics) {
    try {
      await input.clear();
      await input.fill(topic);
      await pwSleep(300);

      // Press Enter to add the topic
      await input.press('Enter');
      await pwSleep(300);
    } catch {
      console.log(`[zenn-pw] Failed to add topic: ${topic}`);
    }
  }

  console.log('[zenn-pw] Topics added');
  await pwSleep(500);
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(page: Page, published: boolean): Promise<string> {
  const action = published ? 'Publishing' : 'Saving as draft';
  console.log(`[zenn-pw] ${action}...`);

  const buttonSelectors = published ? ZENN_SELECTORS.publishButton : ZENN_SELECTORS.draftButton;

  try {
    const result = await trySelectors(page, buttonSelectors, { timeout: 3000, visible: true });
    if (!result.found || !result.locator) {
      throw new Error('Button not found');
    }

    await result.locator.click();
    await pwSleep(3000);

    // Get the current URL (should be the submitted article URL)
    const url = page.url();
    return url;
  } catch (error) {
    // If button click failed, try keyboard shortcut
    console.log('[zenn-pw] Button click failed, trying keyboard shortcut...');

    // Try Ctrl/Cmd + S to save/publish
    const keyCombo = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(keyCombo);
    await pwSleep(3000);

    const url = page.url();
    return url;
  }
}

// ============================================================================
// Main Publishing Workflow (Browser Method)
// ============================================================================

interface BrowserPublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  slug?: string;
  type?: 'tech' | 'idea';
  emoji?: string;
  topics?: string[];
  published?: boolean;
  profileDir?: string;
}

/**
 * Publish article to Zenn using browser automation (Playwright)
 */
export async function publishToZennPlaywright(options: BrowserPublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[zenn-pw] Parsing markdown: ${options.markdownFile}`);
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

  // Determine publish status
  const published = options.published ?? false;

  console.log(`[zenn-pw] Title: ${article.title}`);
  console.log(`[zenn-pw] Type: ${article.type}`);
  console.log(`[zenn-pw] Topics: ${article.topics?.join(', ') || '(none)'}`);
  console.log(`[zenn-pw] Slug: ${article.slug}`);
  console.log(`[zenn-pw] Status: ${published ? 'published' : 'draft'}`);

  // Get profile directory
  const wtProfileDir = getWtProfileDir();
  const defaultProfileDir = path.join(os.homedir(), '.local', 'share', 'zenn-browser-profile');
  const profileDir = options.profileDir ?? wtProfileDir ?? defaultProfileDir;
  await mkdir(profileDir, { recursive: true });

  // Navigate to Zenn article creation page
  const articleUrl = ZENN_URLS.articleCreate;
  console.log(`[zenn-pw] Navigating to: ${articleUrl}`);

  // Launch browser with Playwright
  console.log(`[zenn-pw] Launching browser (profile: ${profileDir})`);
  console.log('[zenn-pw] Using Playwright bundled Chromium');

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 100,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to home first to ensure we are on a valid page
    await page.goto(ZENN_URLS.home, { waitUntil: 'networkidle' });

    // Check login status
    console.log('[zenn-pw] Checking login status...');
    let isLoggedIn = await checkLoginStatus(page);

    if (!isLoggedIn) {
      console.log('[zenn-pw] Not logged in. Please log in to your Zenn account.');
      console.log('[zenn-pw] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await pwSleep(3000);
        const nowLoggedIn = await checkLoginStatus(page);
        if (nowLoggedIn) {
          console.log('[zenn-pw] Login detected! Continuing...');
          isLoggedIn = true;
          break;
        }
        console.log('[zenn-pw] Still waiting for login...');
      }

      if (!isLoggedIn) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[zenn-pw] Already logged in.');
    }

    // Reach the editor by clicking "投稿する" (Post) button
    console.log('[zenn-pw] Navigating to editor via "投稿する" button...');
    const postBtn = await page.locator(':text("投稿する"), .post-button').first();
    if (await postBtn.isVisible()) {
      await postBtn.click();
      await pwSleep(2000);

      // Look for "文章を公表する" (Publish Article) or similar in the dropdown
      const newArticleLink = await page.locator(':text("文章を執筆する"), [href="/articles/new"], [href*="/articles/new"]').first();
      if (await newArticleLink.isVisible()) {
        await newArticleLink.click();
        await pwSleep(3000);
      } else {
        // Just try direct navigation as fallback
        await page.goto(articleUrl, { waitUntil: 'networkidle' });
      }
    } else {
      // Just try direct navigation as fallback
      await page.goto(articleUrl, { waitUntil: 'networkidle' });
    }

    // Wait for page to be ready
    console.log('[zenn-pw] Waiting for editor to load...');
    await waitForPageReady(page);

    // Fill in the article
    await fillTitle(page, article.title);

    await fillContent(page, article.content);

    if (article.type) {
      await setType(page, article.type);
    }

    if (article.topics && article.topics.length > 0) {
      await addTopics(page, article.topics);
    }

    // Submit or save as draft
    const resultUrl = await submitArticle(page, published);

    console.log('');
    console.log('[zenn-pw] Article saved successfully!');
    console.log(`[zenn-pw] URL: ${resultUrl}`);
    console.log(`[zenn-pw] Status: ${published ? 'published' : 'draft'}`);
    console.log('[zenn-pw] Browser window remains open for review.');
    console.log('[zenn-pw] Press Ctrl+C to close.');

    // Keep browser open for manual review
    await new Promise(() => { }); // Never resolve

    return resultUrl;
  } catch (error) {
    // Take screenshot on error for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(profileDir, `error-${timestamp}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[zenn-pw] Error screenshot saved: ${screenshotPath}`);
    } catch {
      // Screenshot failed, ignore
    }

    throw error;
  } finally {
    // Note: We don't close the context to allow manual review
    // User can close the browser manually with Ctrl+C
  }
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Zenn via browser automation (Playwright)

Usage:
  bun run zenn-playwright.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title
  --content <text>          Article content
  --slug <text>             Article slug
  --type <tech|idea>        Article type
  --topics <topic1,topic2>  Comma-separated topics
  --publish                 Publish immediately (default: draft)
  --draft                   Save as draft
  --profile <dir>           Custom browser profile directory
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
  let type: 'tech' | 'idea' | undefined;
  let topics: string[] = [];
  let published: boolean | undefined;
  let profileDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--slug' && args[i + 1]) slug = args[++i];
    else if (arg === '--type' && args[i + 1]) type = args[++i] as any;
    else if (arg === '--topics' && args[i + 1]) {
      const topicStr = args[++i]!;
      topics.push(...topicStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--publish') published = true;
    else if (arg === '--draft') published = false;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
  }

  await publishToZennPlaywright({
    markdownFile,
    title,
    content,
    slug,
    type,
    topics,
    published,
    profileDir,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
