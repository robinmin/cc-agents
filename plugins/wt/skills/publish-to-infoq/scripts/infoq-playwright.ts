import { mkdir } from 'node:fs/promises';
import * as process from 'node:process';
import * as path from 'node:path';
import * as os from 'node:os';
import { chromium, type Page } from 'playwright';
import { trySelectors, buildInputSelectors, buildEditorSelectors, buildSelectSelectors, buildButtonSelectors } from '@wt/web-automation/selectors';
import { pwSleep } from '@wt/web-automation/playwright';
import { copyHtmlToClipboard } from '@wt/web-automation/clipboard';
import { marked } from 'marked';
import {
  getWtProfileDir,
  getAutoPublishPreference,
  getNewArticleUrl,
  parseMarkdownFile,
  normalizeCategory,
  type ParsedArticle,
} from './infoq-utils.js';

// ============================================================================
// InfoQ DOM Selectors (built using common utilities)
// ============================================================================

const INFOQ_SELECTORS = {
  // Title input field
  titleInput: buildInputSelectors({
    placeholder: '标题',
    type: 'text',
  }),

  // Subtitle/Summary input field
  subtitleInput: buildInputSelectors({
    placeholder: '摘要',
    name: 'summary',
  }),

  // Content editor (ProseMirror or similar rich text editor)
  contentEditor: buildEditorSelectors({
    className: 'ProseMirror',
    contentEditable: true,
  }),

  // Category selector
  categorySelect: buildSelectSelectors({
    name: 'category',
    className: 'category',
  }),

  // Tags input field
  tagsInput: buildInputSelectors({
    placeholder: '标签',
    name: 'tags',
  }),

  // Submit/Save button
  submitButton: buildButtonSelectors({
    text: '提交',
  }),

  // Draft button
  draftButton: buildButtonSelectors({
    text: '保存草稿',
  }),
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wait for page to be fully loaded and editor to be ready
 * InfoQ uses Vue.js 2.6.11 SPA, so we need to wait for the app to mount
 */
async function waitForPageReady(page: Page, timeoutMs = 20000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      // Check if any editor is present
      const editorResult = await trySelectors(page, INFOQ_SELECTORS.contentEditor, { timeout: 2000, visible: true });
      if (editorResult.found) {
        console.log('[infoq-pw] Editor ready');
        return;
      }
    } catch {
      // Keep trying
    }
    await pwSleep(500);
  }

  // If editor not found, still continue - page might be ready with different selectors
  console.log('[infoq-pw] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  console.log(`[infoq-pw] Current URL: ${currentUrl}`);

  // If URL contains /auth/login, user is not logged in
  if (currentUrl.includes('/auth/login')) {
    return false;
  }

  // If we are on editor page, we are likely logged in
  if (currentUrl.includes('/write') || currentUrl.includes('/article/create') || currentUrl.includes('/publish')) {
    return true;
  }

  // Check for logged-in indicators
  try {
    // Only check the header/account area for login status to avoid false positives from page content
    const accountArea = page.locator('.header .account, .nav-right .account, header .user-info, .header .avatar');

    // Presence of avatar or user-specific elements in the account area
    const hasUserIndicator = await accountArea.locator('.user-avatar, [class*="avatar"], .user-info, [class*="user"], img').first().isVisible();
    if (hasUserIndicator) {
      // One more check: make sure "登录" text is NOT the only thing in account area
      const loginText = await accountArea.locator(':text("登录")').first().isVisible();
      if (!loginText) {
        console.log('[infoq-pw] User indicator found in header (avatar/info)');
        return true;
      }
    }

    // Explicit check for "登录" or "Sign in" in the account area
    const hasLoginButton = await accountArea.locator(':text("登录"), :text("注册"), :text("Sign in")').first().isVisible();
    if (hasLoginButton) {
      return false;
    }

    // If we've reached here and saw NO login button, but did see an account area, we might be logged in
    const isAccountAreaPresent = await accountArea.first().isVisible();
    if (isAccountAreaPresent) {
      // Final check: if we see "写点什么" and NO "登录", we are likely in
      const writeBtnPresent = await page.locator(':text("写点什么")').first().isVisible();
      if (writeBtnPresent) {
        return true;
      }
    }
  } catch (e) {
    console.log(`[infoq-pw] Error checking login status: ${e}`);
  }
  return false;
}

/**
 * Fill in the title field
 */
async function fillTitle(page: Page, title: string): Promise<void> {
  console.log('[infoq-pw] Filling in title...');

  const result = await trySelectors(page, [
    'input[placeholder="标题"]',
    'input[placeholder*="标题"]',
    '.title-input',
    'input.title',
    '.article-title input'
  ], { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Title input not found');
  }

  await result.locator.clear();
  await result.locator.fill(title);
  await pwSleep(500);

  console.log('[infoq-pw] Title filled');
}

/**
 * Fill in the subtitle/summary field (optional)
 */
async function fillSubtitle(page: Page, subtitle: string): Promise<void> {
  console.log('[infoq-pw] Filling in subtitle/summary...');

  const result = await trySelectors(page, INFOQ_SELECTORS.subtitleInput, { timeout: 3000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[infoq-pw] Subtitle field not found (optional, skipping...)');
    return;
  }

  await result.locator.clear();
  await result.locator.fill(subtitle);
  await pwSleep(500);

  console.log('[infoq-pw] Subtitle filled');
}

/**
 * Fill in the content editor
 */
async function fillContent(page: Page, content: string): Promise<void> {
  console.log('[infoq-pw] Filling in content...');

  const result = await trySelectors(page, INFOQ_SELECTORS.contentEditor, { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Content editor not found');
  }

  const element = result.locator;

  // Method 1: HTML Clipboard Pasting (Best for rich editors)
  try {
    console.log('[infoq-pw] Attempting to fill content via HTML clipboard pasting...');
    const html = await marked.parse(content);
    await copyHtmlToClipboard(html);

    await element.scrollIntoViewIfNeeded();
    await element.click();
    await pwSleep(500);

    // Paste using keyboard shortcut
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+v`);

    console.log('[infoq-pw] Content pasted from clipboard');
    await pwSleep(2000); // Wait for paste processing

    // Verify paste result
    const textLength = await element.evaluate(el => el.textContent?.length || 0);
    if (textLength > 20) {
      console.log(`[infoq-pw] Successfully pasted ${textLength} characters`);
      return;
    }
    console.log('[infoq-pw] Clipboard paste produced minimal content, trying fallbacks...');
  } catch (e) {
    console.log(`[infoq-pw] Clipboard paste failed: ${e}`);
  }

  // Method 2: ProseMirror editor API
  try {
    await element.evaluate((el: HTMLElement, text) => {
      el.focus();
      // Try to use ProseMirror's API
      if ((window as any).view && (window as any).view.state) {
        const view = (window as any).view;
        const transaction = view.state.tr.insert(0, view.state.schema.text(text));
        view.dispatch(transaction);
      } else {
        // Fallback: direct text content
        el.textContent = text;
      }
      // Trigger input event for Vue.js reactivity
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, content);
    console.log('[infoq-pw] Content filled using ProseMirror approach');
    await pwSleep(1000);
    return;
  } catch {
    // Last resort: use Playwright's fill
    await element.fill(content);
    console.log('[infoq-pw] Content filled using Playwright fill');
    await pwSleep(1000);
  }
}

/**
 * Set article category
 */
async function setCategory(page: Page, category?: string): Promise<void> {
  if (!category) {
    console.log('[infoq-pw] No category specified (optional)...');
    return;
  }

  console.log(`[infoq-pw] Setting category: ${category}...`);

  const result = await trySelectors(page, INFOQ_SELECTORS.categorySelect, { timeout: 2000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[infoq-pw] Category selector not found (optional, skipping...)');
    return;
  }

  try {
    await result.locator.selectOption({ label: category });
    console.log('[infoq-pw] Category set');
    await pwSleep(500);
  } catch {
    console.log('[infoq-pw] Failed to set category (optional, skipping...)');
  }
}

/**
 * Add tags to the article
 */
async function addTags(page: Page, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[infoq-pw] No tags to add...');
    return;
  }

  console.log(`[infoq-pw] Setting tags: ${tags.join(', ')}...`);

  const result = await trySelectors(page, INFOQ_SELECTORS.tagsInput, { timeout: 2000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[infoq-pw] Tags input not found (optional, skipping...)');
    return;
  }

  const input = result.locator;

  for (const tag of tags) {
    try {
      await input.clear();
      await input.fill(tag);
      await pwSleep(300);

      // Press Enter to add the tag
      await input.press('Enter');
      await pwSleep(300);
    } catch {
      console.log(`[infoq-pw] Failed to add tag: ${tag}`);
    }
  }

  console.log('[infoq-pw] Tags added');
  await pwSleep(500);
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(page: Page, asDraft: boolean): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Submitting for review';
  console.log(`[infoq-pw] ${action}...`);

  const buttonSelectors = asDraft ? INFOQ_SELECTORS.draftButton : INFOQ_SELECTORS.submitButton;

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
    console.log('[infoq-pw] Button click failed, trying keyboard shortcut...');

    // Try Ctrl/Cmd + Enter to submit
    const keyCombo = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter';
    await page.keyboard.press(keyCombo);
    await pwSleep(3000);

    const url = page.url();
    return url;
  }
}

// ============================================================================
// Main Publishing Workflow
// ============================================================================

interface PublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  subtitle?: string;
  category?: string;
  tags?: string[];
  asDraft?: boolean;
  profileDir?: string;
}

/**
 * Publish article to InfoQ
 */
export async function publishToInfoQ(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[infoq-pw] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      subtitle: options.subtitle,
      category: options.category ? normalizeCategory(options.category) : undefined,
      tags: options.tags,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.subtitle) article.subtitle = options.subtitle;
  if (options.category) article.category = normalizeCategory(options.category);
  if (options.tags) article.tags = options.tags;

  // Determine publish status
  const autoPublish = getAutoPublishPreference();
  const asDraft = options.asDraft ?? !autoPublish;

  console.log(`[infoq-pw] Title: ${article.title}`);
  console.log(`[infoq-pw] Category: ${article.category || '(not set)'}`);
  console.log(`[infoq-pw] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[infoq-pw] Status: ${asDraft ? 'draft' : 'submit'}`);

  // Get profile directory
  const wtProfileDir = getWtProfileDir();
  const defaultProfileDir = path.join(os.homedir(), '.local', 'share', 'infoq-browser-profile');
  const profileDir = options.profileDir ?? wtProfileDir ?? defaultProfileDir;
  await mkdir(profileDir, { recursive: true });

  // Get new article URL
  const newArticleUrl = getNewArticleUrl();
  console.log(`[infoq-pw] Navigating to: ${newArticleUrl}`);

  // Launch browser with Playwright
  console.log(`[infoq-pw] Launching browser (profile: ${profileDir})`);
  console.log('[infoq-pw] Using Playwright bundled Chromium');

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 100,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
  });

  let page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to editor
    await page.goto(newArticleUrl, { waitUntil: 'networkidle' });

    // Check login status
    console.log('[infoq-pw] Checking login status...');
    const isLoggedIn = await checkLoginStatus(page);

    if (!isLoggedIn) {
      console.log('[infoq-pw] Not logged in. Please log in to your InfoQ account.');
      console.log('[infoq-pw] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await pwSleep(3000);
        const nowLoggedIn = await checkLoginStatus(page);
        if (nowLoggedIn) {
          console.log('[infoq-pw] Login detected! Continuing...');
          break;
        }
        console.log('[infoq-pw] Still waiting for login...');
      }

      if (!isLoggedIn && Date.now() - start >= loginTimeoutMs) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[infoq-pw] Already logged in.');
    }

    // Wait for page to be ready (Vue.js SPA needs time to mount)
    console.log('[infoq-pw] Waiting for editor to load...');
    await waitForPageReady(page);

    // If we are on a known page but NOT the editor, try clicking "Write" button
    let currentUrl = page.url();
    if (!currentUrl.includes('/write') && !currentUrl.includes('/article/create')) {
      console.log('[infoq-pw] Not on editor page, attempting to click "Write" button...');

      const writeBtnResult = await trySelectors(page, [
        '.write-btn',
        ':text("写点什么")',
        ':text("立即创作")',
        '.account .writing',
        '.account .btn-write'
      ], { timeout: 10000, visible: true });

      if (writeBtnResult.found && writeBtnResult.locator) {
        console.log('[infoq-pw] Clicking "Write" button');
        await writeBtnResult.locator.click();
        await page.waitForTimeout(3000);

        // Refresh URL after click
        currentUrl = page.url();

        // Check if a new tab opened
        const pages = page.context().pages();
        if (pages.length > 1) {
          console.log('[infoq-pw] Multiple pages detected, switching to newest...');
          page = pages[pages.length - 1]!;
          await page.bringToFront();
        }

        await waitForPageReady(page);
      } else {
        console.log('[infoq-pw] "Write" button not found, trying direct navigation to possible URLs...');
        const possibleUrls = [
          'https://xie.infoq.cn/write',
          'https://xie.infoq.cn/write/article/new',
          'https://xie.infoq.cn/article/create'
        ];

        for (const url of possibleUrls) {
          console.log(`[infoq-pw] Trying direct navigation to: ${url}`);
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
          if (page.url().includes('write') || page.url().includes('create')) {
            console.log(`[infoq-pw] Successfully reached editor: ${page.url()}`);
            break;
          }
        }
      }
    }

    // Fill in the article
    await fillTitle(page, article.title);

    if (article.subtitle) {
      await fillSubtitle(page, article.subtitle);
    }

    await fillContent(page, article.content);

    if (article.category) {
      await setCategory(page, article.category);
    }

    if (article.tags && article.tags.length > 0) {
      await addTags(page, article.tags);
    }

    // Submit or save as draft
    const articleUrl = await submitArticle(page, asDraft);

    console.log('');
    console.log('[infoq-pw] Article saved successfully!');
    console.log(`[infoq-pw] URL: ${articleUrl}`);
    console.log(`[infoq-pw] Status: ${asDraft ? 'draft' : 'submitted for review'}`);
    console.log('[infoq-pw] Browser window remains open for review.');
    console.log('[infoq-pw] Press Ctrl+C to close.');

    // Keep browser open for manual review
    await new Promise(() => { }); // Never resolve

    return articleUrl;
  } catch (error) {
    // Take screenshot on error for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(profileDir, `error-${timestamp}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[infoq-pw] Error screenshot saved: ${screenshotPath}`);
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
  console.log(`Post articles to InfoQ (xie.infoq.cn) via browser automation (Playwright)

Usage:
  npx -y bun infoq-playwright.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --subtitle <text>         Article subtitle/summary
  --category <name>         Article category (Architecture, AI, Frontend, etc.)
  --tags <tag1,tag2>        Comma-separated tags
  --submit                  Submit for review (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom browser profile directory

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  category: Architecture
  tags: [tag1, tag2, tag3]
  ---

Supported Categories:
  Architecture, AI, Frontend, Operations, Open Source,
  Java, Algorithms, Big Data, Cloud Computing

Examples:
  # Post markdown as draft (default)
  npx -y bun infoq-playwright.ts --markdown article.md

  # Submit for review
  npx -y bun infoq-playwright.ts --markdown article.md --submit

  # Post with custom category and tags
  npx -y bun infoq-playwright.ts --markdown article.md --category AI --tags "llm,gpt,transformers"

First Run Setup:
  1. Run any publish command
  2. Browser will open with InfoQ login page
  3. Log in to your InfoQ account manually
  4. Session will be saved for subsequent runs

Article Requirements:
  - Word count: 3000-4000 words recommended
  - Review time: ~1 week for editorial feedback
  - Content: Technical depth articles preferred

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-infoq": {
         "profile_dir": "~/.local/share/infoq-browser-profile",
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
  let category: string | undefined;
  let tags: string[] = [];
  let asDraft: boolean | undefined;
  let profileDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--subtitle' && args[i + 1]) subtitle = args[++i];
    else if (arg === '--category' && args[i + 1]) category = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--submit') asDraft = false;
    else if (arg === '--draft') asDraft = true;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }

  await publishToInfoQ({
    markdownFile,
    title,
    content,
    subtitle,
    category,
    tags,
    asDraft,
    profileDir,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
