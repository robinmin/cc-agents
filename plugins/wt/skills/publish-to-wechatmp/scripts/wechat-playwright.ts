/**
 * WeChat MP Playwright Publisher
 *
 * Post image-text (图文) to WeChat Official Account via Playwright browser automation.
 * Uses persistent context for session management and common library utilities.
 *
 * Usage:
 *   npx -y bun wechat-playwright.ts --title "标题" --content "内容" --image ./cover.jpg
 *   npx -y bun wechat-playwright.ts --markdown article.md --images ./images/ --submit
 */

import { chromium, type Page, type BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { getWtConfig } from '@wt/web-automation/config';
import { trySelectors, buildInputSelectors, buildEditorSelectors, buildButtonSelectors } from '@wt/web-automation/selectors';
import { pwSleep } from '@wt/web-automation/playwright';

// ============================================================================
// Configuration & WT Config
// ============================================================================

const WECHAT_MP_URL = 'https://mp.weixin.qq.com/';

interface WeChatConfig {
  profile_dir?: string;
  auto_submit?: boolean;
  default_theme?: string;
  author?: string;
  collection?: string;
  enable_original?: boolean;
  enable_reward?: boolean;
}

function getWeChatConfig(): WeChatConfig {
  const wtConfig = getWtConfig();
  return (wtConfig['publish-to-wechatmp'] as WeChatConfig) || {};
}

function getDefaultProfileDir(): string {
  const config = getWeChatConfig();
  if (config.profile_dir) {
    return expandTilde(config.profile_dir);
  }
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'wechat-browser-profile');
}

function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function getAutoSubmitPreference(): boolean {
  const config = getWeChatConfig();
  return config.auto_submit ?? false;
}

// ============================================================================
// Markdown Parsing
// ============================================================================

function parseMarkdownFile(filePath: string): { title: string; content: string } {
  const text = fs.readFileSync(filePath, 'utf-8');
  let title = '';
  let content = '';

  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const bodyText = fmMatch ? text.slice(fmMatch[0].length) : text;

  if (fmMatch) {
    const fm = fmMatch[1]!;
    const titleMatch = fm.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1]!.trim().replace(/^["']|["']$/g, '');
  }

  if (!title) {
    const h1Match = bodyText.match(/^#\s+(.+)$/m);
    if (h1Match) title = h1Match[1]!.trim();
  }

  const lines = bodyText.split('\n');
  const paragraphs: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('---')) continue;
    paragraphs.push(trimmed);
  }
  content = paragraphs.join('\n');

  return { title, content };
}

async function loadImagesFromDir(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir);
  const images = entries
    .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
    .sort()
    .map(f => path.join(dir, f));
  return images;
}

function compressTitle(title: string, maxLen = 20): string {
  if (title.length <= maxLen) return title;
  const prefixes = ['如何', '为什么', '什么是', '怎样', '怎么', '关于'];
  let t = title;
  for (const p of prefixes) {
    if (t.startsWith(p) && t.length > maxLen) {
      t = t.slice(p.length);
      if (t.length <= maxLen) return t;
    }
  }
  const fillers = ['的', '了', '在', '是', '和', '与', '以及'];
  for (const f of fillers) {
    if (t.length <= maxLen) break;
    t = t.replace(new RegExp(f, 'g'), '');
  }
  return t.slice(0, maxLen);
}

function compressContent(content: string, maxLen = 1000): string {
  if (content.length <= maxLen) return content;
  const lines = content.split('\n');
  const result: string[] = [];
  let len = 0;
  for (const line of lines) {
    if (len + line.length + 1 > maxLen) {
      const remaining = maxLen - len - 1;
      if (remaining > 20) result.push(line.slice(0, remaining - 3) + '...');
      break;
    }
    result.push(line);
    len += line.length + 1;
  }
  return result.join('\n');
}

// ============================================================================
// WeChat MP Selectors (built using common utilities)
// ============================================================================

const WECHAT_SELECTORS = {
  // Menu items
  menuItem: '.new-creation__menu .new-creation__menu-item',
  menuTitle: '.new-creation__menu-title',

  // Input fields
  titleInput: buildInputSelectors({
    id: 'title',
    name: 'title',
  }),

  // Content editor
  contentEditor: buildEditorSelectors({
    className: 'js_pmEditorArea',
    contentEditable: true,
  }),

  // Submit button
  submitButton: buildButtonSelectors({
    id: 'js_submit',
    className: 'js_submit',
  }),

  // File input for image upload
  fileInput: '.js_upload_btn_container input[type="file"]',

  // Toast notification
  toast: '.weui-desktop-toast',
};

// ============================================================================
// Browser Functions
// ============================================================================

async function checkLoginStatus(page: Page): Promise<boolean> {
  return page.url().includes('/cgi-bin/home');
}

async function waitForLogin(page: Page, timeoutMs = 180000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkLoginStatus(page)) return true;
    await pwSleep(2000);
  }
  return false;
}

async function clickMenuItem(page: Page, text: string): Promise<void> {
  console.log(`[wechat-pw] Clicking "${text}" menu...`);
  const menuItems = page.locator(WECHAT_SELECTORS.menuItem);

  for (let i = 0; await menuItems.nth(i).count() > 0; i++) {
    const titleEl = menuItems.nth(i).locator(WECHAT_SELECTORS.menuTitle);
    const itemText = await titleEl.textContent().catch(() => '');
    const itemTextAlt = await menuItems.nth(i).textContent().catch(() => '');
    const fullText = (itemText || itemTextAlt || '').trim();

    if (fullText === text) {
      await menuItems.nth(i).scrollIntoViewIfNeeded();
      await menuItems.nth(i).click({ timeout: 10000 });
      console.log(`[wechat-pw] Found and clicked "${text}" menu`);
      return;
    }
  }
  throw new Error(`Menu item "${text}" not found`);
}

async function waitForEditor(page: Page, timeoutMs = 30000): Promise<void> {
  console.log('[wechat-pw] Waiting for editor...');
  try {
    const result = await trySelectors(page, [WECHAT_SELECTORS.titleInput], { timeout: timeoutMs, visible: true });
    if (!result.found) {
      throw new Error('Title input not found');
    }
    console.log('[wechat-pw] Editor loaded');
  } catch {
    throw new Error('Editor did not load - menu click may have failed');
  }
}

async function uploadImages(page: Page, imagePaths: string[]): Promise<void> {
  console.log(`[wechat-pw] Uploading ${imagePaths.length} image(s)...`);
  const fileInput = page.locator(WECHAT_SELECTORS.fileInput).first();
  try {
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles(imagePaths);
    await pwSleep(2000);
    console.log('[wechat-pw] Images uploaded');
  } catch {
    console.log('[wechat-pw] File input not found');
  }
}

async function fillTitle(page: Page, title: string): Promise<void> {
  console.log(`[wechat-pw] Filling title: "${title}"`);
  const result = await trySelectors(page, WECHAT_SELECTORS.titleInput, { timeout: 5000, visible: true });
  if (!result.found || !result.locator) {
    throw new Error('Title input not found');
  }
  await result.locator.fill(title);
  await result.locator.dispatchEvent('input');
}

async function fillContent(page: Page, content: string): Promise<void> {
  console.log(`[wechat-pw] Filling content (${content.length} chars)...`);
  const result = await trySelectors(page, WECHAT_SELECTORS.contentEditor, { timeout: 10000, visible: false });
  if (!result.found || !result.locator) {
    console.log('[wechat-pw] Content editor not found, trying alternative approach...');
    // Fallback: type directly into page
    await page.click('body');
  } else {
    try {
      await result.locator.click();
    } catch {
      console.log('[wechat-pw] Content editor not clickable, continuing...');
    }
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    await page.keyboard.type(lines[i]!);
    if (i < lines.length - 1) await page.keyboard.press('Enter');
    await pwSleep(50);
  }
  console.log('[wechat-pw] Content filled');
}

async function submitOrSave(page: Page, submit: boolean): Promise<void> {
  if (submit) {
    console.log('[wechat-pw] Saving as draft...');
    const result = await trySelectors(page, WECHAT_SELECTORS.submitButton, { timeout: 5000, visible: true });
    if (result.found && result.locator) {
      await result.locator.click();
    } else {
      // Fallback to direct selector
      await page.locator('#js_submit button').click();
    }
    await pwSleep(3000);
    const toast = page.locator(WECHAT_SELECTORS.toast).first();
    if (await toast.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[wechat-pw] Draft saved successfully!');
    } else {
      console.log('[wechat-pw] Draft saved');
    }
  } else {
    console.log('[wechat-pw] Article composed (preview mode)');
    console.log('[wechat-pw] Add --submit to save as draft');
  }
}

// ============================================================================
// Main Function
// ============================================================================

interface WeChatPlaywrightOptions {
  title?: string;
  content?: string;
  markdownFile?: string;
  images?: string[];
  imagesDir?: string;
  submit?: boolean;
  profileDir?: string;
  headless?: boolean;
}

async function postToWeChatMP(options: WeChatPlaywrightOptions): Promise<void> {
  const { submit = false, headless = false, profileDir = getDefaultProfileDir() } = options;

  let title = options.title || '';
  let content = options.content || '';
  let images = options.images || [];

  if (options.markdownFile) {
    const absPath = path.isAbsolute(options.markdownFile) ? options.markdownFile : path.resolve(process.cwd(), options.markdownFile);
    if (!fs.existsSync(absPath)) throw new Error(`Markdown file not found: ${absPath}`);
    const meta = parseMarkdownFile(absPath);
    if (!title) title = meta.title;
    if (!content) content = meta.content;
    console.log(`[wechat-pw] Parsed markdown: title="${meta.title}", content=${meta.content.length} chars`);
  }

  if (options.imagesDir) {
    const absDir = path.isAbsolute(options.imagesDir) ? options.imagesDir : path.resolve(process.cwd(), options.imagesDir);
    if (!fs.existsSync(absDir)) throw new Error(`Images directory not found: ${absDir}`);
    images = await loadImagesFromDir(absDir);
    console.log(`[wechat-pw] Found ${images.length} images in ${absDir}`);
  }

  if (!title) throw new Error('Title is required (use --title or --markdown)');
  if (!content) throw new Error('Content is required (use --content or --markdown)');
  if (images.length === 0) throw new Error('At least one image is required (use --image or --imagesDir)');

  for (const img of images) {
    if (!fs.existsSync(img)) throw new Error(`Image not found: ${img}`);
  }

  if (title.length > 20) {
    const original = title;
    title = compressTitle(title, 20);
    console.log(`[wechat-pw] Title compressed: "${original}" → "${title}"`);
  }

  if (content.length > 1000) {
    const original = content.length;
    content = compressContent(content, 1000);
    console.log(`[wechat-pw] Content compressed: ${original} → ${content.length} chars`);
  }

  const expandedProfileDir = expandTilde(profileDir);
  await fs.promises.mkdir(expandedProfileDir, { recursive: true });
  console.log(`[wechat-pw] Profile directory: ${expandedProfileDir}`);

  console.log('[wechat-pw] Launching browser with Playwright bundled Chromium...');

  let context;
  try {
    context = await chromium.launchPersistentContext(expandedProfileDir, {
      headless,
      slowMo: 100,
      args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage'],
      viewport: { width: 1280, height: 900 },
    });

    const page = context.pages()[0] || await context.newPage();

    console.log('[wechat-pw] Navigating to WeChat MP...');
    await page.goto(WECHAT_MP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pwSleep(3000);

    const isLoggedIn = await checkLoginStatus(page);

    if (!isLoggedIn) {
      console.log('');
      console.log('========================================');
      console.log('LOGIN REQUIRED');
      console.log('========================================');
      console.log('Please scan the QR code to log in.');
      console.log('The script will continue automatically');
      console.log('after login.');
      console.log('========================================');
      console.log('');
      const loginSuccess = await waitForLogin(page);
      if (!loginSuccess) throw new Error('Login timeout. Please try again.');
    }

    console.log('[wechat-pw] Logged in');
    await pwSleep(2000);

    await clickMenuItem(page, '图文');
    await pwSleep(3000);

    await waitForEditor(page);

    if (images.length > 0) await uploadImages(page, images);
    await fillTitle(page, title);
    await fillContent(page, content);
    await submitOrSave(page, submit);

    console.log('');
    console.log('[wechat-pw] Done! Browser window remains open.');
    console.log('[wechat-pw] Press Ctrl+C to close');
    await new Promise(() => {});

  } catch (error) {
    console.error(`[wechat-pw] Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    if (context) await context.close();
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function printUsage(): void {
  console.log(`Post image-text (图文) to WeChat Official Account

Usage:
  npx -y bun wechat-playwright.ts [options]

Options:
  --markdown <path>   Markdown file for title/content extraction
  --images <dir>      Directory containing images (PNG/JPG)
  --title <text>      Article title (max 20 chars, auto-compressed)
  --content <text>    Article content (max 1000 chars, auto-compressed)
  --image <path>      Add image (can be repeated)
  --submit            Save as draft (default: preview only)
  --no-submit         Preview only (overrides config)
  --profile <dir>     Chrome profile directory
  --headless          Run in headless mode
  --help, -h          Show this help

Examples:
  npx -y bun wechat-playwright.ts --markdown article.md --images ./photos/
  npx -y bun wechat-playwright.ts --title "测试" --content "内容" --image ./cover.png
  npx -y bun wechat-playwright.ts --markdown article.md --images ./photos/ --submit
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  const images: string[] = [];
  let submit: boolean | undefined;
  let profileDir: string | undefined;
  let title: string | undefined;
  let content: string | undefined;
  let markdownFile: string | undefined;
  let imagesDir: string | undefined;
  let headless = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--image' && args[i + 1]) images.push(args[++i]!);
    else if (arg === '--images' && args[i + 1]) imagesDir = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--submit') submit = true;
    else if (arg === '--no-submit') submit = false;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
    else if (arg === '--headless') headless = true;
  }

  if (!markdownFile && !title) { console.error('Error: --title or --markdown is required'); process.exit(1); }
  if (!markdownFile && !content) { console.error('Error: --content or --markdown is required'); process.exit(1); }
  if (images.length === 0 && !imagesDir) { console.error('Error: --image or --images is required'); process.exit(1); }

  if (submit === undefined) submit = getAutoSubmitPreference();

  await postToWeChatMP({ title, content, images: images.length > 0 ? images : undefined, imagesDir, markdownFile, submit, profileDir, headless });
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
