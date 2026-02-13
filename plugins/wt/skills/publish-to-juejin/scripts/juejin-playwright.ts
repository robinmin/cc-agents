import { mkdir } from 'node:fs/promises';
import * as process from 'node:process';
import * as path from 'node:path';
import * as os from 'node:os';
import { chromium, type Page } from 'playwright';
import { trySelectors, buildInputSelectors, buildEditorSelectors, buildSelectSelectors, buildButtonSelectors } from '@wt/web-automation/selectors';
import { pwSleep } from '@wt/web-automation/playwright';
import {
  getWtProfileDir,
  getAutoPublishPreference,
  getNewArticleUrl,
  parseMarkdownFile,
  normalizeCategory,
  type ParsedArticle,
} from './juejin-utils.js';

// ============================================================================
// Juejin DOM Selectors (built using common utilities)
// ============================================================================

const JUEJIN_SELECTORS = {
  // Title input field
  titleInput: ['.title-input', 'input[placeholder="输入文章标题..."]', 'input[placeholder*="标题"]', 'input.title-input'],

  // Subtitle input field (optional)
  subtitleInput: buildInputSelectors({
    placeholder: '摘要',
    name: 'subtitle',
  }),

  // Content editor (CodeMirror or rich text editor)
  contentEditor: buildEditorSelectors({
    className: 'CodeMirror',
    contentEditable: true,
  }),

  // Category items in publish popup
  categoryItems: '.category-list .item, .category-item, .item',

  // Tags input field in publish popup
  tagsInput: '.tag-input input, .tag-input',

  // First Publish button (opens popup)
  publishButton: buildButtonSelectors({
    text: '发布',
  }),

  // Final Publish button (in popup)
  confirmPublishButton: buildButtonSelectors({
    text: '确定并发布',
  }),

  // Draft indicator
  draftStatus: ':text("保存成功"), :text("草稿箱")',
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
      const editorResult = await trySelectors(page, JUEJIN_SELECTORS.contentEditor, { timeout: 2000, visible: true });
      if (editorResult.found) {
        console.log('[juejin-pw] Editor ready');
        return;
      }
    } catch {
      // Keep trying
    }
    await pwSleep(500);
  }

  // If editor not found, still continue - page might be ready with different selectors
  console.log('[juejin-pw] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(page: Page): Promise<boolean> {
  const currentUrl = page.url();
  console.log(`[juejin-pw] Current URL: ${currentUrl}`);

  // If URL is still homepage and we're supposed to be at editor, not logged in
  if (currentUrl === 'https://juejin.cn/' || currentUrl === 'https://juejin.cn') {
    return false;
  }

  // If we are on editor page, we are likely logged in
  if (currentUrl.includes('/editor/') || currentUrl.includes('/markdown-editor')) {
    return true;
  }

  // Check for logged-in indicators
  try {
    const isLoggedIn = await page.locator('.user-avatar, .logout-button, [class*="user"], .avatar').first().count() > 0;
    return isLoggedIn;
  } catch {
    return false;
  }
}

/**
 * Fill in the title field
 */
async function fillTitle(page: Page, title: string): Promise<void> {
  console.log('[juejin-pw] Filling in title...');

  const result = await trySelectors(page, JUEJIN_SELECTORS.titleInput, { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Title input not found');
  }

  await result.locator.clear();
  await result.locator.fill(title);
  await pwSleep(500);

  console.log('[juejin-pw] Title filled');
}

/**
 * Fill in the subtitle field (optional)
 */
async function fillSubtitle(page: Page, subtitle: string): Promise<void> {
  console.log('[juejin-pw] Filling in subtitle...');

  const result = await trySelectors(page, JUEJIN_SELECTORS.subtitleInput, { timeout: 3000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[juejin-pw] Subtitle field not found (optional, skipping...)');
    return;
  }

  await result.locator.clear();
  await result.locator.fill(subtitle);
  await pwSleep(500);

  console.log('[juejin-pw] Subtitle filled');
}

/**
 * Fill in the content editor
 */
async function fillContent(page: Page, content: string): Promise<void> {
  console.log('[juejin-pw] Filling in content...');

  const result = await trySelectors(page, JUEJIN_SELECTORS.contentEditor, { timeout: 5000, visible: true });
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
        }
      }, content);
      console.log('[juejin-pw] Content filled using CodeMirror API');
      await pwSleep(1000);
      return;
    }
  } catch {
    // Not CodeMirror, continue with other methods
  }

  // Try contenteditable approach
  try {
    await element.evaluate((el: HTMLElement, text) => {
      el.focus();
      el.textContent = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, content);
    console.log('[juejin-pw] Content filled using contentEditable');
    await pwSleep(1000);
    return;
  } catch {
    // Last resort: use Playwright's fill
    await element.fill(content);
    console.log('[juejin-pw] Content filled using Playwright fill');
    await pwSleep(1000);
  }
}

/**
 * Set article category
 */
async function setCategory(page: Page, category?: string): Promise<void> {
  if (!category) {
    return;
  }

  console.log(`[juejin-pw] Setting category: ${category}...`);

  try {
    const item = page.locator(`.category-list .item:has-text("${category}")`).first();
    await item.waitFor({ state: 'visible', timeout: 5000 });
    await item.click();
    console.log('[juejin-pw] Category set');
    await pwSleep(500);
  } catch (err) {
    console.log(`[juejin-pw] Failed to set category: ${category}. Error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Add tags to the article
 */
async function addTags(page: Page, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[juejin-pw] No tags to add...');
    return;
  }

  console.log(`[juejin-pw] Setting tags: ${tags.join(', ')}...`);

  const inputResult = await trySelectors(page, [JUEJIN_SELECTORS.tagsInput], { timeout: 2000, visible: true });
  if (!inputResult.found || !inputResult.locator) {
    console.log('[juejin-pw] Tags input not found (optional, skipping...)');
    return;
  }

  const input = inputResult.locator;

  for (const tag of tags) {
    try {
      await input.fill(tag);
      await pwSleep(300);

      // Press Enter to add the tag
      await input.press('Enter');
      await pwSleep(500);
    } catch {
      console.log(`[juejin-pw] Failed to add tag: ${tag}`);
    }
  }

  console.log('[juejin-pw] Tags added');
  await pwSleep(500);
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(page: Page, asDraft: boolean, article: ParsedArticle): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Publishing';
  console.log(`[juejin-pw] ${action}...`);

  if (asDraft) {
    console.log('[juejin-pw] Waiting for autosave...');
    await pwSleep(5000); // Give time for autosave

    // Check if "保存成功" appears
    const saved = await page.locator(':text("保存成功")').count() > 0;
    if (saved) {
      console.log('[juejin-pw] Draft saved successfully via autosave');
    } else {
      console.log('[juejin-pw] Autosave not detected, trying Ctrl+S...');
      const keyCombo = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(keyCombo);
      await pwSleep(3000);
    }
    return page.url();
  }

  // Two-step publish process
  try {
    // 1. Click first "发布" button
    const result = await trySelectors(page, JUEJIN_SELECTORS.publishButton, { timeout: 3000, visible: true });
    if (!result.found || !result.locator) {
      throw new Error('First Publish button not found');
    }
    await result.locator.click();
    await pwSleep(2000);

    // 2. Set Category and Tags in popup
    if (article.category) {
      await setCategory(page, article.category);
    }
    if (article.tags && article.tags.length > 0) {
      await addTags(page, article.tags);
    }

    // 3. Click final "确定并发布" button
    const finalResult = await trySelectors(page, JUEJIN_SELECTORS.confirmPublishButton, { timeout: 3000, visible: true });
    if (!finalResult.found || !finalResult.locator) {
      throw new Error('Final Publish button not found');
    }
    await finalResult.locator.click();
    await pwSleep(5000);

    return page.url();
  } catch (error) {
    console.log(`[juejin-pw] Publish failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
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
 * Publish article to Juejin
 */
export async function publishToJuejin(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[juejin-pw] Parsing markdown: ${options.markdownFile}`);
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

  console.log(`[juejin-pw] Title: ${article.title}`);
  console.log(`[juejin-pw] Category: ${article.category || '(not set)'}`);
  console.log(`[juejin-pw] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[juejin-pw] Status: ${asDraft ? 'draft' : 'publish'}`);

  // Get profile directory
  const wtProfileDir = getWtProfileDir();
  const defaultProfileDir = path.join(os.homedir(), '.local', 'share', 'juejin-browser-profile');
  const profileDir = options.profileDir ?? wtProfileDir ?? defaultProfileDir;
  await mkdir(profileDir, { recursive: true });

  // Get new article URL
  const newArticleUrl = getNewArticleUrl();
  console.log(`[juejin-pw] Navigating to: ${newArticleUrl}`);

  // Launch browser with Playwright
  console.log(`[juejin-pw] Launching browser (profile: ${profileDir})`);
  console.log('[juejin-pw] Using Playwright bundled Chromium');

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 100,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1280, height: 900 },
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to editor
    await page.goto(newArticleUrl, { waitUntil: 'networkidle' });

    // Check login status
    console.log('[juejin-pw] Checking login status...');
    const isLoggedIn = await checkLoginStatus(page);

    if (!isLoggedIn) {
      console.log('[juejin-pw] Not logged in. Please log in to your Juejin account.');
      console.log('[juejin-pw] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await pwSleep(3000);
        const nowLoggedIn = await checkLoginStatus(page);
        if (nowLoggedIn) {
          console.log('[juejin-pw] Login detected! Continuing...');
          break;
        }
        console.log('[juejin-pw] Still waiting for login...');
      }

      if (!isLoggedIn && Date.now() - start >= loginTimeoutMs) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[juejin-pw] Already logged in.');
    }

    // Wait for page to be ready
    console.log('[juejin-pw] Waiting for editor to load...');
    await waitForPageReady(page);

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
    const articleUrl = await submitArticle(page, asDraft, article);

    console.log('');
    console.log('[juejin-pw] Article saved successfully!');
    console.log(`[juejin-pw] URL: ${articleUrl}`);
    console.log(`[juejin-pw] Status: ${asDraft ? 'draft' : 'published'}`);
    console.log('[juejin-pw] Browser window remains open for review.');
    console.log('[juejin-pw] Press Ctrl+C to close.');

    // Keep browser open for manual review
    await new Promise(() => { }); // Never resolve

    return articleUrl;
  } catch (error) {
    // Take screenshot on error for debugging
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(profileDir, `error-${timestamp}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[juejin-pw] Error screenshot saved: ${screenshotPath}`);
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
  console.log(`Post articles to Juejin (稀土掘金) via browser automation (Playwright)

Usage:
  npx -y bun juejin-playwright.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --subtitle <text>         Article subtitle/summary
  --category <name>         Article category (后端, 前端, Android, iOS, 人工智能, etc.)
  --tags <tag1,tag2>        Comma-separated tags
  --publish                 Publish immediately (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom browser profile directory

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  category: 前端
  tags: [tag1, tag2, tag3]
  cover: https://example.com/cover.png
  ---

Supported Categories:
  后端, 前端, Android, iOS, 人工智能 (AI),
  开发工具 (DevTools), 代码人生 (Code Life), 阅读 (Reading)

Examples:
  # Post markdown as draft (default)
  npx -y bun juejin-playwright.ts --markdown article.md

  # Publish immediately
  npx -y bun juejin-playwright.ts --markdown article.md --publish

  # Post with custom category and tags
  npx -y bun juejin-playwright.ts --markdown article.md --category 前端 --tags "vue,react"

First Run Setup:
  1. Run any publish command
  2. Browser will open with Juejin login page
  3. Log in with your phone number and SMS verification code
  4. Session will be saved for subsequent runs

Article Requirements:
  - Content: Original technical articles preferred
  - Language: Chinese (Simplified) primarily
  - Quality: Well-structured, code examples encouraged

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-juejin": {
         "profile_dir": "~/.local/share/juejin-browser-profile",
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
    else if (arg === '--publish') asDraft = false;
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

  await publishToJuejin({
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
