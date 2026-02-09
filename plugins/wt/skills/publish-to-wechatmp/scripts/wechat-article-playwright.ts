/**
 * WeChat MP Article Playwright Publisher (Enhanced)
 *
 * Post long-form articles to WeChat Official Account via Playwright browser automation.
 * Supports markdown conversion, themes, code block styling, cover image workflow,
 * original setting, reward, collection, and draft/publish workflow.
 *
 * Usage:
 *   npx -y bun wechat-article-playwright.ts --markdown article.md --collection "合集名"
 *   npx -y bun wechat-article-playwright.ts --markdown article.md --original --reward --submit
 */

import { chromium, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { getWtConfig, expandTilde } from '@wt/web-automation/config';

// Import theme validation for security (command injection prevention)
import { getValidTheme } from '@wt/web-automation/sanitize.js';

// ============================================================================
// Configuration & WT Config
// ============================================================================

interface WeChatConfig {
  profile_dir?: string;
  auto_submit?: boolean;
  default_theme?: string;
  author?: string;
  collection?: string;
  enable_original?: boolean;
  enable_reward?: boolean;
}

const WECHAT_MP_URL = 'https://mp.weixin.qq.com/';

function getWeChatConfig(): WeChatConfig {
  const wtConfig = getWtConfig();
  return (wtConfig['publish-to-wechatmp'] as WeChatConfig) || {};
}

function getDefaultProfileDir(): string {
  const config = getWeChatConfig();
  const configProfileDir = config.profile_dir;
  if (configProfileDir) {
    return expandTilde(configProfileDir);
  }
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'wechat-browser-profile');
}

function getAutoSubmitPreference(): boolean {
  const config = getWeChatConfig();
  return config.auto_submit ?? false;
}

function getDefaultThemePreference(): string {
  const config = getWeChatConfig();
  const theme = config.default_theme ?? 'default';
  // Validate theme for security (command injection prevention)
  return getValidTheme(theme);
}

function getAuthorFromConfig(): string {
  const config = getWeChatConfig();
  return config.author ?? '';
}

function getCollectionFromConfig(): string {
  const config = getWeChatConfig();
  return config.collection ?? '';
}

function getOriginalPreference(): boolean {
  const config = getWeChatConfig();
  return config.enable_original ?? false;
}

function getRewardPreference(): boolean {
  const config = getWeChatConfig();
  return config.enable_reward ?? false;
}

// ============================================================================
// Markdown/HTML Parsing
// ============================================================================

interface ParsedMarkdown {
  title: string;
  author: string;
  summary: string;
  coverImage?: string;
  collection?: string;
  htmlPath: string;
  contentImages: Array<{
    placeholder: string;
    localPath: string;
    originalPath: string;
  }>;
}

async function parseMarkdown(markdownPath: string, theme?: string): Promise<ParsedMarkdown> {
  // Validate theme parameter for security (command injection prevention)
  const validTheme = theme ? getValidTheme(theme) : 'default';

  const __filename = import.meta.url ? (import.meta.url.startsWith('file://') ? import.meta.url.slice(7) : import.meta.url) : '';
  const __dirname = __filename ? path.dirname(__filename) : '';
  const mdToWechatScript = path.join(__dirname, 'md-to-wechat.ts');

  const args = ['-y', 'bun', mdToWechatScript, markdownPath];
  if (validTheme) args.push('--theme', validTheme);

  console.log(`[wechat-article-pw] Converting markdown: ${markdownPath}`);

  const result = spawnSync('npx', args, { stdio: ['inherit', 'pipe', 'pipe'] });

  if (result.status !== 0) {
    const stderr = result.stderr?.toString() || '';
    throw new Error(`Failed to parse markdown: ${stderr}`);
  }

  const output = result.stdout.toString();
  return JSON.parse(output) as ParsedMarkdown;
}

function parseHtmlMeta(htmlPath: string): { title: string; author: string; summary: string } {
  const content = fs.readFileSync(htmlPath, 'utf-8');

  let title = '';
  const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) title = titleMatch[1]!;

  let author = '';
  const authorMatch = content.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
  if (authorMatch) author = authorMatch[1]!;

  let summary = '';
  const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) summary = descMatch[1]!;

  if (!summary) {
    const firstPMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
    if (firstPMatch) {
      const text = firstPMatch[1]!.replace(/<[^>]+>/g, '').trim();
      if (text.length > 20) {
        summary = text.length > 120 ? text.slice(0, 117) + '...' : text;
      }
    }
  }

  return { title, author, summary };
}

// ============================================================================
// WeChat MP Selectors
// ============================================================================

const WECHAT_SELECTORS = {
  menuItem: '.new-creation__menu .new-creation__menu-item',
  menuTitle: '.new-creation__menu-title',
  titleInput: '#title',
  authorInput: '#author',
  authorPlaceholder: '[placeholder="请输入作者"]',
  contentEditor: '.ProseMirror',
  summaryInput: '#js_description',
  submitButton: '#js_submit button, button.js_submit, .weui-desktop-btn_primary:has-text("发布"), .weui-desktop-btn_primary:has-text("发表"), button[type="submit"]',
  coverImageUpload: '.js_cover_pic_btn',
  toast: '.weui-desktop-toast',
  // Cover image workflow
  coverArea: '.js_cover_area, .cover-area, [class*="cover"]',
  coverDialog: '.weui-desktop-modal, .imgpicker-modal, [class*="img-picker"]',
  coverUploadBtn: '.js_upload_btn, .upload-btn, [class*="upload"]',
  coverFileInput: '.js_upload_input, input[type="file"]',
  coverImageItem: '.imgpicker-item, .cover-item, [class*="item"]',
  coverNextBtn: '.js_btn_next, .btn-next, button:has-text("下一步"), button:has-text("下一步")',
  coverConfirmBtn: '.js_btn_confirm, .btn-confirm, button:has-text("确认"), button:has-text("确认")',
  // Original setting
  originalCheckbox: '.js_original_radio, [class*="original"]:radio, input[name*="original"], label:has-text("原创"), [class*="original"]:label, .original_checkbox',
  originalConfirmBtn: '.js_btn_original, button:has-text("确认"), button:has-text("确认")',
  // Reward
  rewardBtn: '.js_reward_btn, [class*="reward"]:button, button:has-text("赞赏")',
  rewardConfirmBtn: '.js_btn_reward, button:has-text("确认"), button:has-text("确认")',
  // Collection
  collectionBtn: '.js_collection_btn, [class*="collection"]:button, button:has-text("合集"), button:has-text("未添加")',
  collectionInput: '.js_collection_input, input[name*="collection"], input[placeholder*="合集"]',
  collectionConfirmBtn: '.js_btn_collection, button:has-text("确认"), button:has-text("确认")',
  // Publish workflow
  saveDraftBtn: '.js_save_draft, button:has-text("保存为草稿"), button:has-text("保存草稿")',
  publishBtn: '.js_publish, button:has-text("发表"), button:has-text("发布")',
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
    await page.waitForTimeout(2000);
  }
  return false;
}

// ============================================================================
// Code Block Styling (placeholder - WeChat editor handles automatically)
// ============================================================================

async function styleCodeBlocks(_page: Page): Promise<void> {
  // Code block styling is handled by WeChat editor's clipboard paste
  console.log('[wechat-article-pw] Code blocks handled by WeChat editor');
}

async function waitForArticleEditor(page: Page, timeoutMs = 30000): Promise<void> {
  console.log('[wechat-article-pw] Waiting for article editor...');
  try {
    await page.locator(WECHAT_SELECTORS.titleInput).waitFor({ state: 'visible', timeout: timeoutMs });
    console.log('[wechat-article-pw] Article editor loaded');
  } catch {
    throw new Error('Article editor did not load');
  }
}

async function fillTitle(page: Page, title: string): Promise<void> {
  console.log(`[wechat-article-pw] Filling title: "${title}"`);
  await page.fill(WECHAT_SELECTORS.titleInput, title);
  await page.locator(WECHAT_SELECTORS.titleInput).dispatchEvent('input');
}

async function fillAuthor(page: Page, author: string): Promise<void> {
  if (!author) {
    console.log('[wechat-article-pw] No author specified, skipping...');
    return;
  }
  console.log(`[wechat-article-pw] Filling author: "${author}"`);

  // Debug screenshot
  await page.screenshot({ path: '/tmp/wechat_author_before.png' }).catch(() => {});

  // Strategy 1: Find input by placeholder text
  const byPlaceholder = page.locator('input[placeholder*="作者"]');
  const placeholderCount = await byPlaceholder.count();
  console.log(`[wechat-article-pw] Found ${placeholderCount} input(s) with "作者" placeholder`);

  for (let i = 0; i < placeholderCount; i++) {
    const input = byPlaceholder.nth(i);
    try {
      const isVisible = await input.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        await input.fill(author);
        console.log(`[wechat-article-pw] Author filled via placeholder (index ${i})`);
        await page.screenshot({ path: '/tmp/wechat_author_after.png' }).catch(() => {});
        return;
      }
    } catch {
      continue;
    }
  }

  // Strategy 2: Find by label "作者" and get associated input
  const authorLabel = page.locator('text=作者');
  const labelCount = await authorLabel.count();
  console.log(`[wechat-article-pw] Found ${labelCount} label(s) with "作者"`);

  for (let i = 0; i < labelCount; i++) {
    const label = authorLabel.nth(i);
    try {
      const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        // Try to find associated input
        const inputId = await label.getAttribute('for');
        if (inputId) {
          const input = page.locator(`#${inputId}`);
          if (await input.count() > 0) {
            await input.fill(author);
            console.log(`[wechat-article-pw] Author filled via label for (index ${i})`);
            await page.screenshot({ path: '/tmp/wechat_author_after.png' }).catch(() => {});
            return;
          }
        }
        // Try parent input
        const parentInput = label.locator('../input');
        if (await parentInput.count() > 0) {
          await parentInput.first().fill(author);
          console.log(`[wechat-article-pw] Author filled via parent input (index ${i})`);
          await page.screenshot({ path: '/tmp/wechat_author_after.png' }).catch(() => {});
          return;
        }
      }
    } catch {
      continue;
    }
  }

  // Strategy 3: Look for any visible text input
  const allInputs = page.locator('input[type="text"]:visible');
  const inputCount = await allInputs.count();
  console.log(`[wechat-article-pw] Found ${inputCount} visible text input(s)`);

  for (let i = 0; i < inputCount; i++) {
    const input = allInputs.nth(i);
    try {
      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      if (placeholder && (placeholder.includes('作者') || placeholder.includes('请输入'))) {
        await input.fill(author);
        console.log(`[wechat-article-pw] Author filled via text input (index ${i})`);
        await page.screenshot({ path: '/tmp/wechat_author_after.png' }).catch(() => {});
        return;
      }
    } catch {
      continue;
    }
  }

  console.log('[wechat-article-pw] Could not find author input, skipping...');
  await page.screenshot({ path: '/tmp/wechat_author_after.png' }).catch(() => {});
}

// Final author fill - called after all dialogs to ensure it persists
async function fillAuthorFinal(page: Page, author: string): Promise<void> {
  if (!author) {
    console.log('[wechat-article-pw] No author to fill finally');
    return;
  }
  console.log(`[wechat-article-pw] Final author fill: "${author}"`);

  // Debug screenshot before
  await page.screenshot({ path: '/tmp/wechat_author_final_before.png' }).catch(() => {});

  // Find all visible text inputs and try to fill author
  const allInputs = page.locator('input[type="text"], input:not([type])');
  const inputCount = await allInputs.count();
  console.log(`[wechat-article-pw] Found ${inputCount} total input(s)`);

  for (let i = 0; i < inputCount; i++) {
    const input = allInputs.nth(i);
    try {
      const isVisible = await input.isVisible({ timeout: 500 }).catch(() => false);
      if (!isVisible) continue;

      const placeholder = await input.getAttribute('placeholder').catch(() => '');
      const name = await input.getAttribute('name').catch(() => '');
      const id = await input.getAttribute('id').catch(() => '');

      // Check if this is the author field
      const isAuthorField = (
        (placeholder && (placeholder.includes('作者') || placeholder.includes('author'))) ||
        (name && (name.includes('author') || name.includes('Author'))) ||
        (id && (id.includes('author') || id.includes('Author')))
      );

      if (isAuthorField) {
        await input.fill(author);
        console.log(`[wechat-article-pw] Author filled finally (index ${i})`);
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/wechat_author_final_after.png' }).catch(() => {});
        return;
      }
    } catch {
      continue;
    }
  }

  // Fallback: try to find by parent label text "作者"
  const authorLabels = page.locator('text=作者');
  const labelCount = await authorLabels.count();
  for (let i = 0; i < labelCount; i++) {
    const label = authorLabels.nth(i);
    try {
      const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
      if (!isVisible) continue;

      // Look for sibling or parent input
      const parent = await label.locator('..').first();
      const siblingInput = parent.locator('input[type="text"], input:not([type])').first();
      if (await siblingInput.count() > 0) {
        await siblingInput.fill(author);
        console.log(`[wechat-article-pw] Author filled via sibling (index ${i})`);
        await page.waitForTimeout(500);
        await page.screenshot({ path: '/tmp/wechat_author_final_after.png' }).catch(() => {});
        return;
      }
    } catch {
      continue;
    }
  }

  console.log('[wechat-article-pw] Could not fill author finally');
}

async function fillSummary(page: Page, summary: string): Promise<void> {
  if (!summary) return;
  console.log(`[wechat-article-pw] Filling summary: "${summary}"`);
  await page.fill(WECHAT_SELECTORS.summaryInput, summary);
  await page.locator(WECHAT_SELECTORS.summaryInput).dispatchEvent('input');
}

// ============================================================================
// Cover Image Workflow
// ============================================================================

async function uploadCoverImageWorkflow(page: Page, coverPath: string): Promise<void> {
  console.log(`[wechat-article-pw] Cover image workflow: ${coverPath}`);

  // Debug: Take screenshot before cover workflow
  await page.screenshot({ path: '/tmp/wechat_cover_1_before.png' }).catch(() => {});

  // Step 1: Click cover area or button
  console.log('[wechat-article-pw] Step 1: Opening cover selection...');

  // Try multiple cover selectors
  const coverSelectors = [
    '.js_cover_area',
    '.cover-area',
    '[class*="cover"]',
    '.js_cover_pic_btn',
    '.cover_pic_btn',
    // Look for any button/area related to cover
    '[class*="cover"]:button',
    '[class*="cover"]:div',
  ];

  for (const selector of coverSelectors) {
    const el = page.locator(selector).first();
    if (await el.count() > 0) {
      try {
        const isVisible = await el.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          await el.click();
          console.log(`[wechat-article-pw] Clicked cover via: ${selector}`);
          await page.waitForTimeout(2000);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Debug: Take screenshot after clicking cover
  await page.screenshot({ path: '/tmp/wechat_cover_2_after_click.png' }).catch(() => {});

  // Step 2: Upload file - find any file input in dialog or page
  console.log('[wechat-article-pw] Step 2: Uploading cover image...');
  const fileInputs = page.locator('input[type="file"]');
  const inputCount = await fileInputs.count();
  console.log(`[wechat-article-pw] Found ${inputCount} file input(s)`);

  if (inputCount > 0) {
    await fileInputs.first().setInputFiles(coverPath);
    console.log('[wechat-article-pw] File uploaded');
  } else {
    console.log('[wechat-article-pw] No file input found');
  }
  await page.waitForTimeout(3000);

  // Debug: Take screenshot after upload
  await page.screenshot({ path: '/tmp/wechat_cover_3_after_upload.png' }).catch(() => {});

  // Step 3: Select the uploaded image from library
  console.log('[wechat-article-pw] Step 3: Selecting image from library...');
  const coverItems = page.locator('.imgpicker-item, .cover-item, [class*="item"]');
  const itemCount = await coverItems.count();
  console.log(`[wechat-article-pw] Found ${itemCount} image(s) in library`);

  if (itemCount > 0) {
    // Click on the first image that looks like a newly uploaded one (typically first)
    await coverItems.first().click();
    await page.waitForTimeout(1500);
    console.log('[wechat-article-pw] Image selected');
  }

  // Debug: Take screenshot after selecting
  await page.screenshot({ path: '/tmp/wechat_cover_4_after_select.png' }).catch(() => {});

  // Step 4: Look for any visible "确定" or "确认" button
  console.log('[wechat-article-pw] Step 4: Looking for confirmation buttons...');

  // Try all possible button selectors
  const allButtons = page.locator('button, .weui-desktop-btn_primary, a[class*="btn"]');
  const btnCount = await allButtons.count();
  console.log(`[wechat-article-pw] Found ${btnCount} button(s) total`);

  // Print visible buttons for debugging
  for (let i = 0; i < btnCount; i++) {
    const btn = allButtons.nth(i);
    try {
      const text = await btn.textContent({ timeout: 500 }).catch(() => '');
      const isVisible = await btn.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible && text && text.trim()) {
        console.log(`[wechat-article-pw] Button ${i}: "${text.trim()}"`);
      }
    } catch {
      continue;
    }
  }

  // Click any visible "确定" or "确认" button
  const confirmSelectors = [
    '.weui-desktop-btn_primary:has-text("确定")',
    '.weui-desktop-btn_primary:has-text("确认")',
    'button:has-text("确定")',
    'button:has-text("确认")',
    '[class*="btn"]:has-text("确定")',
    '[class*="btn"]:has-text("确认")',
  ];

  for (const selector of confirmSelectors) {
    const btn = page.locator(selector).first();
    if (await btn.count() > 0) {
      try {
        const isVisible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
        if (isVisible) {
          const text = await btn.textContent({ timeout: 500 }).catch(() => '') || '';
          await btn.click();
          console.log(`[wechat-article-pw] Clicked: "${text.trim()}" via ${selector}`);
          await page.waitForTimeout(2000);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Debug: Take screenshot after confirmation attempt
  await page.screenshot({ path: '/tmp/wechat_cover_5_final.png' }).catch(() => {});

  console.log('[wechat-article-pw] Cover image workflow completed');
}

// ============================================================================
// Original Setting (原创)
// Find "原创" label, then click the VALUE hyperlink next to it ("未声明")
// ============================================================================

async function setOriginal(page: Page, author: string): Promise<void> {
  console.log('[wechat-article-pw] Setting original (原创)...');

  // Debug screenshot
  await page.screenshot({ path: '/tmp/wechat_original_1_before.png' }).catch(() => {});

  // Strategy: Find the clickable "未声明" or "已声明" element directly
  // These are the value elements that can be clicked to open the original dialog
  let clicked = false;

  // First try: Find "未声明" or "已声明" text elements directly
  // These are the clickable values in the 原创 row
  const valueTexts = ['未声明', '已声明'];

  for (const valueText of valueTexts) {
    const valueElements = page.locator(`text=${valueText}`);
    const count = await valueElements.count();
    console.log(`[wechat-article-pw] Found ${count} element(s) with "${valueText}" text`);

    for (let i = 0; i < count && !clicked; i++) {
      const el = valueElements.nth(i);
      try {
        const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Check if this is the right one - it should be near "原创" label
          // Try to find "原创" nearby
          const nearOriginal = await el.locator('xpath=./preceding::*[contains(text(), "原创")]').count();
          const parentHasOriginal = await el.locator('xpath=./ancestor::*[contains(text(), "原创")]').count();

          if (nearOriginal > 0 || parentHasOriginal > 0) {
            console.log(`[wechat-article-pw] Found 原创 value "${valueText}" (verified nearby)`);
            await el.evaluate((e: Element) => (e as HTMLElement).click());
            clicked = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }
    if (clicked) break;
  }

  // Fallback: Original approach - find "原创" label then find sibling
  if (!clicked) {
    const originalLabels = page.locator('text=原创');
    const labelCount = await originalLabels.count();
    console.log(`[wechat-article-pw] Found ${labelCount} element(s) with "原创" text (fallback)`);

    for (let i = 0; i < labelCount && !clicked; i++) {
      const label = originalLabels.nth(i);
      try {
        const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Look for 未声明/已声明 in following siblings
          for (let sibIdx = 1; sibIdx <= 5; sibIdx++) {
            const nextSibling = label.locator(`xpath=./following-sibling::*[${sibIdx}]`);
            const siblingTextRaw = await nextSibling.textContent({ timeout: 500 }).catch(() => '');
            const siblingText = siblingTextRaw?.replace(/\s+/g, ' ').trim() || '';
            console.log(`[wechat-article-pw] Sibling ${sibIdx} text after 原创: "${siblingText}"`);

            if (siblingText.includes('未声明') || siblingText.includes('已声明')) {
              await nextSibling.evaluate((e: Element) => (e as HTMLElement).click());
              console.log(`[wechat-article-pw] Clicked 原创 value: "${siblingText}"`);
              clicked = true;
              break;
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  if (!clicked) {
    console.log('[wechat-article-pw] Could not find 原创, skipping...');
    return;
  }

  // Dialog is now open - need to complete the original declaration
  console.log('[wechat-article-pw] Original dialog opened, completing declaration...');
  await page.waitForTimeout(1500);

  // Debug screenshot after dialog opens
  await page.screenshot({ path: '/tmp/wechat_original_2_dialog.png' }).catch(() => {});

  // Step 1: Select 声明类型 (文字原创, 转载原创, etc.)
  // Look for radio buttons or clickable elements for declaration type
  const declarationTypes = ['文字原创', '转载原创', '翻译原创'];
  let typeSelected = false;

  for (const type of declarationTypes) {
    const typeElements = page.locator(`text=${type}`);
    const count = await typeElements.count();
    for (let i = 0; i < count && !typeSelected; i++) {
      const el = typeElements.nth(i);
      try {
        const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Check if this is in a radio/option context (check parent or nearby)
          await el.evaluate((e: Element) => (e as HTMLElement).click());
          console.log(`[wechat-article-pw] Selected declaration type: ${type}`);
          typeSelected = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (typeSelected) break;
  }

  await page.waitForTimeout(500);

  // Step 1b: Fill the author field in the popup if present
  // Look for author input in the popup dialog
  const authorInputSelectors = [
    'input[placeholder*="作者"]',
    'input[class*="author"]',
    'input[class*="writer"]',
    ':text("作者") >> xpath=following::input[1]'
  ];

  for (const selector of authorInputSelectors) {
    const authorInput = page.locator(selector);
    try {
      const count = await authorInput.count();
      if (count > 0) {
        const isVisible = await authorInput.first().isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          const currentValue = await authorInput.first().inputValue().catch(() => '');
          if (!currentValue || currentValue.trim() === '') {
            await authorInput.first().fill(author);
            console.log(`[wechat-article-pw] Author filled in popup: "${author}"`);
          } else {
            console.log(`[wechat-article-pw] Author already filled in popup: "${currentValue}"`);
          }
          break;
        }
      }
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(300);

  // Step 2: Check the agreement checkbox
  // Look for "我已阅读并同意《微信公众平台原创声明及相关功能使用协议》"
  let agreementChecked = false;

  // First, find the label containing the agreement text
  const agreementLabel = page.locator('label:has-text("我已阅读并同意"), label:has-text("同意《微信公众平台原创声明及相关功能使用协议》")');
  const labelCount = await agreementLabel.count();
  console.log(`[wechat-article-pw] Found ${labelCount} agreement label(s)`);

  for (let i = 0; i < labelCount && !agreementChecked; i++) {
    const label = agreementLabel.nth(i);
    try {
      const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        // Look for checkbox inside this label
        const checkbox = label.locator('input[type="checkbox"]');
        const checkboxCount = await checkbox.count();
        console.log(`[wechat-article-pw] Found ${checkboxCount} checkbox(es) in agreement label`);

        if (checkboxCount > 0) {
          // Check if already checked
          const isChecked = await checkbox.first().isChecked().catch(() => false);
          if (!isChecked) {
            await checkbox.first().evaluate((e: Element) => {
              (e as HTMLInputElement).click();
            });
            console.log(`[wechat-article-pw] Checked agreement checkbox`);
          } else {
            console.log(`[wechat-article-pw] Agreement checkbox already checked`);
          }
          agreementChecked = true;
          break;
        }

        // Also try clicking the label itself
        await label.evaluate((e: Element) => (e as HTMLElement).click());
        console.log(`[wechat-article-pw] Clicked agreement label`);
        agreementChecked = true;
        break;
      }
    } catch {
      continue;
    }
  }

  // Alternative: Look for any unchecked checkbox in the dialog
  if (!agreementChecked) {
    // Look for all checkboxes in the dialog area (near "确定" button)
    const dialogCheckboxes = page.locator('.weui-desktop-dialog input[type="checkbox"]:not(:checked), .weui-desktop-modal input[type="checkbox"]:not(:checked), [class*="dialog"] input[type="checkbox"]:not(:checked)');
    const dialogCheckboxCount = await dialogCheckboxes.count();
    console.log(`[wechat-article-pw] Found ${dialogCheckboxCount} unchecked checkbox(es) in dialog`);

    if (dialogCheckboxCount > 0) {
      await dialogCheckboxes.first().evaluate((e: Element) => {
        (e as HTMLInputElement).click();
      });
      console.log(`[wechat-article-pw] Checked first unchecked checkbox in dialog`);
      agreementChecked = true;
    }
  }

  await page.waitForTimeout(500);

  // Step 3: Leave dialog open for user to manually click confirm
  console.log('[wechat-article-pw] ⚠️  Original dialog opened - please manually click "确定" to confirm');
  await page.waitForTimeout(1000);

  console.log('[wechat-article-pw] Original (原创) completed');
  await page.waitForTimeout(500);
}

// ============================================================================
// Original Source Setting (创作来源)
// Find "创作来源" label, then click the VALUE hyperlink next to it ("未添加")
// Then in dialog, select "无需声明"
// ============================================================================

async function setOriginalSource(page: Page): Promise<void> {
  console.log('[wechat-article-pw] Setting original source (创作来源)...');

  // Debug screenshot
  await page.screenshot({ path: '/tmp/wechat_source_1_before.png' }).catch(() => {});

  // Strategy: Find "创作来源" label, then find the VALUE hyperlink after it
  // Pattern: [label "创作来源"] [value "未添加" (clickable)]
  let clicked = false;

  // Find the 创作来源 label
  const sourceLabels = page.locator('text=创作来源');
  const labelCount = await sourceLabels.count();
  console.log(`[wechat-article-pw] Found ${labelCount} element(s) with "创作来源" text`);

  for (let i = 0; i < labelCount && !clicked; i++) {
    const label = sourceLabels.nth(i);
    try {
      const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        // Look for the VALUE element after "创作来源"
        const nextSibling = label.locator('xpath=./following-sibling::*[1]');
        const siblingText = await nextSibling.textContent({ timeout: 500 }).catch(() => '');
        console.log(`[wechat-article-pw] Sibling text after 创作来源 (${i}): "${siblingText}"`);

        if (siblingText?.includes('未添加') || siblingText?.includes('已添加')) {
          // This is the value element - click it to open dialog
          await nextSibling.evaluate((e: Element) => (e as HTMLElement).click());
          console.log(`[wechat-article-pw] Clicked 创作来源 value: "${siblingText}"`);
          clicked = true;
          break;
        }

        // Also try the parent
        const parent = label.locator('..').first();
        const parentText = await parent.textContent({ timeout: 500 }).catch(() => '');
        if (parentText) {
          const valueInParent = parent.locator('text=未添加, text=已添加').first();
          if (await valueInParent.count() > 0) {
            await valueInParent.evaluate((e: Element) => (e as HTMLElement).click());
            console.log(`[wechat-article-pw] Clicked 创作来源 value in parent`);
            clicked = true;
            break;
          }
        }
      }
    } catch {
      continue;
    }
  }

  if (!clicked) {
    console.log('[wechat-article-pw] 创作来源 dialog not found, skipping...');
    return;
  }

  // Debug screenshot after clicking 未添加
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/wechat_source_2_after_notadd.png' }).catch(() => {});

  // Step 2: In the dialog, select "无需声明"
  console.log('[wechat-article-pw] Step 2: Selecting "无需声明"...');
  let declClicked = false;

  // Look for "无需声明" option in the dialog
  const noDeclLabels = page.locator('text=无需声明');
  const declCount = await noDeclLabels.count();
  console.log(`[wechat-article-pw] Found ${declCount} element(s) with "无需声明"`);

  for (let i = 0; i < declCount && !declClicked; i++) {
    const el = noDeclLabels.nth(i);
    try {
      const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        // Check if this is a checkbox or label
        const parent = el.locator('..').first();

        // Look for checkbox in parent or sibling
        const checkboxInParent = parent.locator('input[type="checkbox"]');
        if (await checkboxInParent.count() > 0) {
          await checkboxInParent.first().evaluate((e: Element) => (e as HTMLElement).click());
          console.log(`[wechat-article-pw] Checkbox for 无需声明 clicked`);
          declClicked = true;
          break;
        }

        // Try clicking the label itself (might be a radio/checkbox)
        await el.evaluate((e: Element) => (e as HTMLElement).click());
        console.log(`[wechat-article-pw] 无需声明 clicked`);
        declClicked = true;
        break;
      }
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(1000);

  // Debug screenshot after selecting 无需声明
  await page.screenshot({ path: '/tmp/wechat_source_3_after_select.png' }).catch(() => {});

  // Step 3: Click "确认" button
  console.log('[wechat-article-pw] Step 3: Clicking "确认"...');
  const confirmBtn = page.locator('.weui-desktop-modal button:has-text("确认"), button:has-text("确认")').first();
  if (await confirmBtn.count() > 0) {
    try {
      await confirmBtn.waitFor({ state: 'visible', timeout: 2000 });
      await confirmBtn.click({ force: true });
      console.log('[wechat-article-pw] Clicked "确认"');
      // Wait for dialog to close
      await page.waitForTimeout(1000);
      await confirmBtn.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {
        console.log('[wechat-article-pw] Note: Source dialog may still be visible');
      });
    } catch {
      console.log('[wechat-article-pw] Confirm button not clickable');
    }
  } else {
    console.log('[wechat-article-pw] No confirm button found');
  }

  await page.waitForTimeout(500);

  // Debug screenshot final
  await page.screenshot({ path: '/tmp/wechat_source_4_final.png' }).catch(() => {});

  console.log('[wechat-article-pw] Original source set to "无需声明"');
}

// ============================================================================
// Reward Setting (赞赏)
// Find "赞赏" label, then click the VALUE hyperlink next to it ("未开启")
// Note: Reward can only be enabled after 原创 is enabled
// ============================================================================

async function enableReward(page: Page): Promise<void> {
  console.log('[wechat-article-pw] Enabling reward (赞赏)...');

  // Debug screenshot
  await page.screenshot({ path: '/tmp/wechat_reward_1_before.png' }).catch(() => {});

  // Strategy: Find the clickable "未开启" or "已开启" element directly
  // These are the value elements that can be clicked to enable reward
  let clicked = false;

  // First try: Find "未开启" or "已开启" text elements directly
  const valueTexts = ['未开启', '已开启'];

  for (const valueText of valueTexts) {
    const valueElements = page.locator(`text=${valueText}`);
    const count = await valueElements.count();
    console.log(`[wechat-article-pw] Found ${count} element(s) with "${valueText}" text`);

    for (let i = 0; i < count && !clicked; i++) {
      const el = valueElements.nth(i);
      try {
        const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Check if this is the right one - it should be near "赞赏" label
          const nearReward = await el.locator('xpath=./preceding::*[contains(text(), "赞赏")]').count();
          const parentHasReward = await el.locator('xpath=./ancestor::*[contains(text(), "赞赏")]').count();

          if (nearReward > 0 || parentHasReward > 0) {
            console.log(`[wechat-article-pw] Found 赞赏 value "${valueText}" (verified nearby)`);
            await el.evaluate((e: Element) => (e as HTMLElement).click());
            clicked = true;
            break;
          }
        }
      } catch {
        continue;
      }
    }
    if (clicked) break;
  }

  // Fallback: Original approach - find "赞赏" label then find sibling
  if (!clicked) {
    const rewardLabels = page.locator('text=赞赏');
    const labelCount = await rewardLabels.count();
    console.log(`[wechat-article-pw] Found ${labelCount} element(s) with "赞赏" text (fallback)`);

    for (let i = 0; i < labelCount && !clicked; i++) {
      const label = rewardLabels.nth(i);
      try {
        const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Look for 未开启/已开启 in following siblings
          for (let sibIdx = 1; sibIdx <= 5; sibIdx++) {
            const nextSibling = label.locator(`xpath=./following-sibling::*[${sibIdx}]`);
            const siblingTextRaw = await nextSibling.textContent({ timeout: 500 }).catch(() => '');
            const siblingText = siblingTextRaw?.replace(/\s+/g, ' ').trim() || '';
            console.log(`[wechat-article-pw] Sibling ${sibIdx} text after 赞赏: "${siblingText}"`);

            if (siblingText.includes('未开启') || siblingText.includes('已开启')) {
              await nextSibling.evaluate((e: Element) => (e as HTMLElement).click());
              console.log(`[wechat-article-pw] Clicked 赞赏 value: "${siblingText}"`);
              clicked = true;
              break;
            }
          }
        }
      } catch {
        continue;
      }
    }
  }

  // Debug screenshot after clicking
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/wechat_reward_2_after.png' }).catch(() => {});

  if (!clicked) {
    console.log('[wechat-article-pw] Could not find 赞赏, skipping...');
    return;
  }

  // Dialog is now open - need to enable the reward feature
  console.log('[wechat-article-pw] Reward dialog opened, enabling feature...');
  await page.waitForTimeout(1000);

  // Debug screenshot after dialog opens
  await page.screenshot({ path: '/tmp/wechat_reward_2_dialog.png' }).catch(() => {});

  // Step 1: Look for "我已开启赞赏功能" checkbox and check it
  let enabled = false;

  // Try to find the enable checkbox
  const enableTexts = ['我已开启赞赏功能', '赞赏码', '现金打赏'];
  for (const text of enableTexts) {
    const elements = page.locator(`text=${text}`);
    const count = await elements.count();
    for (let i = 0; i < count && !enabled; i++) {
      const el = elements.nth(i);
      try {
        const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          // Try clicking this element or looking for a checkbox nearby
          const parent = el.locator('..').first();
          const checkboxInParent = parent.locator('input[type="checkbox"], input[type="radio"]');
          if (await checkboxInParent.count() > 0) {
            await checkboxInParent.first().evaluate((e: Element) => (e as HTMLElement).click());
            console.log(`[wechat-article-pw] Enabled reward via checkbox near "${text}"`);
            enabled = true;
            break;
          }
          // Or click the label itself
          await el.evaluate((e: Element) => (e as HTMLElement).click());
          console.log(`[wechat-article-pw] Clicked "${text}"`);
          enabled = true;
          break;
        }
      } catch {
        continue;
      }
    }
    if (enabled) break;
  }

  // Alternative: Look for toggle/switch elements
  if (!enabled) {
    const toggles = page.locator('.weui-desktop-switch, .weui-switch, [class*="switch"], [class*="toggle"]');
    const toggleCount = await toggles.count();
    console.log(`[wechat-article-pw] Found ${toggleCount} toggle(s)`);
    for (let i = 0; i < toggleCount && !enabled; i++) {
      const el = toggles.nth(i);
      try {
        const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
        if (isVisible) {
          await el.evaluate((e: Element) => (e as HTMLElement).click());
          console.log('[wechat-article-pw] Enabled reward via toggle');
          enabled = true;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Step 2: Click confirm button if present
  await page.waitForTimeout(500);
  // Look for confirm button within dialog containers - more specific selectors
  const confirmSelectors = [
    // Button with class "weui-desktop-btn_primary" that contains "确定"
    '.weui-desktop-dialog .weui-desktop-btn_primary:has-text("确定")',
    '.weui-desktop-modal .weui-desktop-btn_primary:has-text("确定")',
    // Any button class "btn_primary" with "确定"
    '.btn_primary:has-text("确定")',
    // Green button with "确定"
    'button.weui-desktop-btn_primary:has-text("确定")',
    // Fallback to generic but try to find within dialog
    '.weui-desktop-dialog button:has-text("确定")',
    '.weui-desktop-modal button:has-text("确定")',
  ];

  let confirmClicked = false;
  for (const selector of confirmSelectors) {
    const confirmBtn = page.locator(selector);
    const count = await confirmBtn.count();
    if (count > 0) {
      try {
        await confirmBtn.first().waitFor({ state: 'visible', timeout: 2000 });
        // Try multiple click methods
        try {
          await confirmBtn.first().click({ timeout: 5000 });
        } catch {
          try {
            await confirmBtn.first().evaluate((e: Element) => (e as HTMLElement).click());
          } catch {
            const handle = await confirmBtn.first().elementHandle();
            if (handle) {
              await page.evaluate((el: any) => el.click(), handle);
            }
          }
        }
        console.log(`[wechat-article-pw] Reward dialog confirmed via: ${selector}`);
        confirmClicked = true;
        break;
      } catch {
        continue;
      }
    }
  }

  if (!confirmClicked) {
    console.log('[wechat-article-pw] Warning: Could not click reward confirm button');
  }

  // Wait for dialog to close
  await page.waitForTimeout(1500);

  // Verify the reward value was saved (should show "已开启" instead of "未开启")
  let rewardSaved = false;
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(500);
    // Check if "已开启" text is now visible near 赞赏 label
    const enabledElements = page.locator('text=已开启');
    const count = await enabledElements.count();
    for (let j = 0; j < count; j++) {
      const el = enabledElements.nth(j);
      const isVisible = await el.isVisible().catch(() => false);
      if (isVisible) {
        // Check if it's near 赞赏
        const nearReward = await el.locator('xpath=./preceding::*[contains(text(), "赞赏")]').count();
        if (nearReward > 0) {
          console.log('[wechat-article-pw] Reward value verified: 已开启');
          rewardSaved = true;
          break;
        }
      }
    }
    if (rewardSaved) break;
    console.log(`[wechat-article-pw] Waiting for reward value to save... (${i + 1}/5)`);
  }

  if (!rewardSaved) {
    console.log('[wechat-article-pw] Warning: Reward value may not have been saved');
  }

  // Debug screenshot after completing
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/wechat_reward_3_after.png' }).catch(() => {});

  console.log('[wechat-article-pw] Reward (赞赏) completed');
  await page.waitForTimeout(500);
}

// ============================================================================
// Collection Setting (合集)
// Find "合集" label, then click the VALUE hyperlink next to it ("未添加")
// ============================================================================

async function setCollection(page: Page, collection: string): Promise<void> {
  if (!collection) {
    console.log('[wechat-article-pw] No collection specified, skipping...');
    return;
  }

  console.log(`[wechat-article-pw] Setting collection: ${collection}`);

  // Debug screenshot
  await page.screenshot({ path: '/tmp/wechat_collection_1_before.png' }).catch(() => {});

  // Strategy: Find "合集" label, then find the VALUE hyperlink after it
  // Pattern: [label "合集"] [value "未添加" (clickable)]
  let clicked = false;

  // Find the 合集 label
  const collectionLabels = page.locator('text=合集');
  const labelCount = await collectionLabels.count();
  console.log(`[wechat-article-pw] Found ${labelCount} element(s) with "合集" text`);

  for (let i = 0; i < labelCount && !clicked; i++) {
    const label = collectionLabels.nth(i);
    try {
      const isVisible = await label.isVisible({ timeout: 500 }).catch(() => false);
      if (isVisible) {
        // Look for the VALUE element after "合集"
        const nextSibling = label.locator('xpath=./following-sibling::*[1]');
        const siblingTextRaw = await nextSibling.textContent({ timeout: 500 }).catch(() => '');
        const siblingText = siblingTextRaw?.replace(/\s+/g, ' ').trim() || '';
        console.log(`[wechat-article-pw] Sibling text after 合集 (${i}): "${siblingText}"`);

        // Look for 未添加, 已添加, 未声明, 已声明, 未开启, 已开启 patterns
        if (siblingText.includes('未添加') || siblingText.includes('已添加') ||
            siblingText.includes('未声明') || siblingText.includes('已声明') ||
            siblingText.includes('未开启') || siblingText.includes('已开启')) {
          // This is the value element - click it
          await nextSibling.evaluate((e: Element) => (e as HTMLElement).click());
          console.log(`[wechat-article-pw] Clicked 合集 value: "${siblingText}"`);
          clicked = true;
          break;
        }

        // Also try the parent
        const parent = label.locator('..').first();
        const parentTextRaw = await parent.textContent({ timeout: 500 }).catch(() => '');
        const parentText = parentTextRaw?.replace(/\s+/g, ' ').trim() || '';
        if (parentText) {
          const valueInParent = parent.locator('text=未添加, text=已添加').first();
          if (await valueInParent.count() > 0) {
            await valueInParent.evaluate((e: Element) => (e as HTMLElement).click());
            console.log(`[wechat-article-pw] Clicked 合集 value in parent`);
            clicked = true;
            break;
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Debug screenshot after clicking
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/wechat_collection_2_dialog.png' }).catch(() => {});

  if (!clicked) {
    console.log('[wechat-article-pw] Collection dialog not found, skipping...');
    return;
  }

  await page.waitForTimeout(1000);

  // Input collection name in the dialog
  console.log(`[wechat-article-pw] Entering collection name: ${collection}`);

  const inputSelectors = [
    'input[placeholder*="合集"]',
    'input[name*="collection"]',
    'input[placeholder*="输入"]',
    'input[placeholder*="请输"]',
    'input[placeholder*="系列"]',
    'textarea',
    'input[type="text"]',
  ];

  for (const selector of inputSelectors) {
    const input = page.locator(selector);
    const count = await input.count();
    if (count > 0) {
      // Find a visible input
      for (let i = 0; i < count; i++) {
        const el = input.nth(i);
        try {
          const isVisible = await el.isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            await el.fill(collection);
            console.log(`[wechat-article-pw] Collection name entered via: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
      break;
    }
  }

  await page.waitForTimeout(500);

  // Debug screenshot after entering
  await page.screenshot({ path: '/tmp/wechat_collection_3_after.png' }).catch(() => {});

  // Leave dialog open for user to manually click confirm
  console.log('[wechat-article-pw] ⚠️  Collection dialog opened - please manually click "确认" to confirm');
  await page.waitForTimeout(1000);
}

// ============================================================================
// HTML Content Insertion
// ============================================================================

async function insertHtmlContent(page: Page, htmlPath: string): Promise<void> {
  console.log(`[wechat-article-pw] Reading HTML content: ${htmlPath}`);

  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  console.log(`[wechat-article-pw] HTML content length: ${htmlContent.length} chars`);

  const editor = page.locator(WECHAT_SELECTORS.contentEditor).first();
  await editor.click();
  await page.waitForTimeout(500);

  console.log('[wechat-article-pw] Inserting HTML content...');
  await page.evaluate(({ sel, html }) => {
    const editorEl = document.querySelector(sel);
    if (!editorEl) return;

    const dt = new DataTransfer();
    dt.setData('text/html', html);
    dt.setData('text/plain', html.replace(/<[^>]*>/g, ''));

    const evt = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    editorEl.dispatchEvent(evt);
  }, { sel: WECHAT_SELECTORS.contentEditor, html: htmlContent });

  await page.waitForTimeout(2000);
  console.log('[wechat-article-pw] HTML content inserted');
}

// ============================================================================
// Content Images (Placeholder - requires copy-to-clipboard script)
// ============================================================================

async function insertContentImages(
  page: Page,
  contentImages: Array<{ placeholder: string; localPath: string }>
): Promise<void> {
  if (contentImages.length === 0) return;
  console.log(`[wechat-article-pw] Inserting ${contentImages.length} content image(s)...`);

  for (let i = 0; i < contentImages.length; i++) {
    const img = contentImages[i]!;
    console.log(`[wechat-article-pw] [${i + 1}/${contentImages.length}] ${img.placeholder}: ${path.basename(img.localPath)}`);
    console.log(`[wechat-article-pw] Note: Content image replacement requires copy-to-clipboard script`);
    await page.waitForTimeout(500);
  }
  console.log('[wechat-article-pw] Content images logged (manual insertion required)');
}

// ============================================================================
// Publish Workflow (Save Draft -> Publish with User QR)
// ============================================================================

async function saveDraft(page: Page): Promise<void> {
  console.log('[wechat-article-pw] Saving as draft...');

  const saveBtn = page.locator(WECHAT_SELECTORS.saveDraftBtn).first();
  try {
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(3000);
    console.log('[wechat-article-pw] Draft saved');
  } catch {
    console.log('[wechat-article-pw] Save draft button not found, trying submit button...');
    await page.locator(WECHAT_SELECTORS.submitButton).click();
    await page.waitForTimeout(3000);
  }
}

async function publishArticle(page: Page): Promise<void> {
  console.log('[wechat-article-pw] Preparing to publish...');

  // Try multiple selectors for publish button
  const publishSelectors = [
    'button:has-text("发表")',
    'button:has-text("发布")',
    '.js_publish',
    '#js_submit button',
    '.weui-desktop-btn_primary',
    'button[type="submit"]',
  ];

  let published = false;
  for (const selector of publishSelectors) {
    const publishBtn = page.locator(selector).first();
    try {
      const count = await publishBtn.count();
      if (count > 0) {
        await publishBtn.waitFor({ state: 'visible', timeout: 3000 });
        await publishBtn.click({ force: true });
        console.log(`[wechat-article-pw] Publish clicked via: ${selector}`);
        published = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!published) {
    console.log('[wechat-article-pw] Publish button not found, article saved as draft');
    return;
  }

  await page.waitForTimeout(3000);

  // Check for QR code dialog
  const qrDialog = page.locator('.weui-desktop-modal, [class*="qrcode"], [class*="QR"], .qr_code_dialog');
  if (await qrDialog.count() > 0) {
    console.log('[wechat-article-pw] QR code dialog detected');
    console.log('');
    console.log('========================================');
    console.log('QR CODE REQUIRED FOR PUBLISHING');
    console.log('========================================');
    console.log('Please scan the QR code to publish.');
    console.log('The script will complete after confirmation.');
    console.log('========================================');
    console.log('');

    await page.waitForTimeout(30000);
  }

  // Check for "无需声明并发表" button (appears if 创作来源 not set)
  console.log('[wechat-article-pw] Checking for 创作来源 dialog...');
  const noSourceBtn = page.locator('button:has-text("无需声明并发表"), .weui-desktop-btn_primary:has-text("无需声明")').first();
  if (await noSourceBtn.count() > 0) {
    try {
      await noSourceBtn.waitFor({ state: 'visible', timeout: 2000 });
      console.log('[wechat-article-pw] Clicking "无需声明并发表"...');
      await noSourceBtn.click({ force: true });
      await page.waitForTimeout(2000);
    } catch {
      console.log('[wechat-article-pw] No 创作来源 dialog found');
    }
  }

  // Check for confirmation dialog
  const confirmBtn = page.locator('button:has-text("确认"), button:has-text("确定")').first();
  if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('[wechat-article-pw] Confirmation dialog detected');
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }

  console.log('[wechat-article-pw] Article published');
}

// ============================================================================
// Main Function
// ============================================================================

interface ArticleOptions {
  title?: string;
  content?: string;
  htmlFile?: string;
  markdownFile?: string;
  theme?: string;
  author?: string;
  summary?: string;
  coverImage?: string;
  collection?: string;
  images?: string[];
  original?: boolean;
  reward?: boolean;
  submit?: boolean;
  profileDir?: string;
  headless?: boolean;
}

async function postArticle(options: ArticleOptions): Promise<void> {
  const {
    submit = false,
    headless = false,
    profileDir = getDefaultProfileDir(),
    original = getOriginalPreference(),
    reward = getRewardPreference(),
    collection: optionCollection = '',
  } = options;

  // Get collection from options or config
  const effectiveCollection = optionCollection || getCollectionFromConfig() || '';

  let effectiveTitle = options.title || '';
  let effectiveAuthor = options.author || '';
  let effectiveSummary = options.summary || '';
  let effectiveCoverImage = options.coverImage || '';
  let effectiveHtmlFile = options.htmlFile;
  let contentImages: Array<{ placeholder: string; localPath: string }> = [];

  if (options.markdownFile) {
    const absPath = path.isAbsolute(options.markdownFile)
      ? options.markdownFile
      : path.resolve(process.cwd(), options.markdownFile);

    if (!fs.existsSync(absPath)) throw new Error(`Markdown file not found: ${absPath}`);

    const parsed = await parseMarkdown(absPath, options.theme);
    effectiveTitle = effectiveTitle || parsed.title;
    effectiveAuthor = effectiveAuthor || parsed.author;
    effectiveSummary = effectiveSummary || parsed.summary;
    effectiveCoverImage = effectiveCoverImage || (parsed.coverImage ? path.isAbsolute(parsed.coverImage) ? parsed.coverImage : path.resolve(path.dirname(absPath), parsed.coverImage) : '');
    effectiveHtmlFile = parsed.htmlPath;
    contentImages = parsed.contentImages.map((img) => ({
      placeholder: img.placeholder,
      localPath: img.localPath,
    }));

    console.log(`[wechat-article-pw] Title: ${effectiveTitle || '(empty)'}`);
    console.log(`[wechat-article-pw] Author: ${effectiveAuthor || '(empty)'}`);
    console.log(`[wechat-article-pw] Cover image: ${effectiveCoverImage || '(empty)'}`);
    console.log(`[wechat-article-pw] Collection: ${effectiveCollection || '(empty)'}`);
    console.log(`[wechat-article-pw] Original: ${original}`);
    console.log(`[wechat-article-pw] Reward: ${reward}`);
    console.log(`[wechat-article-pw] Content images: ${contentImages.length}`);
  } else if (options.htmlFile && fs.existsSync(options.htmlFile)) {
    console.log(`[wechat-article-pw] Parsing HTML: ${options.htmlFile}`);
    const meta = parseHtmlMeta(options.htmlFile);
    effectiveTitle = effectiveTitle || meta.title;
    effectiveAuthor = effectiveAuthor || meta.author;
    effectiveSummary = effectiveSummary || meta.summary;
    effectiveHtmlFile = options.htmlFile;
    console.log(`[wechat-article-pw] Title: ${effectiveTitle || '(empty)'}`);
    console.log(`[wechat-article-pw] Author: ${effectiveAuthor || '(empty)'}`);
  }

  if (effectiveTitle.length > 64) {
    throw new Error(`Title too long: ${effectiveTitle.length} chars (max 64)`);
  }
  if (!effectiveHtmlFile && !options.content) {
    throw new Error('Either --content, --html, or --markdown is required');
  }

  const expandedProfileDir = expandTilde(profileDir);
  await fs.promises.mkdir(expandedProfileDir, { recursive: true });
  console.log(`[wechat-article-pw] Profile directory: ${expandedProfileDir}`);
  console.log('[wechat-article-pw] Using Playwright bundled Chromium');

  let context: import('playwright').BrowserContext | null = null;
  try {
    console.log('[wechat-article-pw] Launching browser...');
    // Use Playwright's bundled Chromium with persistent context
    context = await chromium.launchPersistentContext(expandedProfileDir, {
      headless,
      slowMo: 50,
      args: ['--disable-blink-features=AutomationControlled', '--disable-dev-shm-usage', '--disable-extensions'],
      viewport: { width: 1280, height: 900 },
    });

    const page = context.pages()[0] || await context.newPage();

    console.log('[wechat-article-pw] Navigating to WeChat MP...');
    await page.goto(WECHAT_MP_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

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

    console.log('[wechat-article-pw] Logged in');
    await page.waitForTimeout(2000);

    // Navigate directly to new article editor
    console.log('[wechat-article-pw] Navigating to new article editor...');
    const currentUrl = page.url();
    const tokenMatch = currentUrl.match(/token=([^&]+)/);
    const token = tokenMatch ? tokenMatch[1] : '';
    const editorUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&appmsgid=&type=81&token=${token}`;
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);

    // Wait for article editor to be ready
    await waitForArticleEditor(page);

    // Fill title
    if (effectiveTitle) await fillTitle(page, effectiveTitle);

    // Fill author from config or options
    const finalAuthor = effectiveAuthor || getAuthorFromConfig();
    if (finalAuthor) await fillAuthor(page, finalAuthor);

    // Upload cover image with full workflow
    if (effectiveCoverImage && fs.existsSync(effectiveCoverImage)) {
      await uploadCoverImageWorkflow(page, effectiveCoverImage);
    }

    // Insert HTML content
    if (effectiveHtmlFile && fs.existsSync(effectiveHtmlFile)) {
      await insertHtmlContent(page, effectiveHtmlFile);
      if (contentImages.length > 0) {
        await insertContentImages(page, contentImages);
      }
    } else if (options.content) {
      const editor = page.locator(WECHAT_SELECTORS.contentEditor).first();
      await editor.click();
      await page.keyboard.type(options.content);
    }

    // Fill summary
    if (effectiveSummary) await fillSummary(page, effectiveSummary);

    // Set original if enabled
    if (original) {
      await setOriginal(page, effectiveAuthor || '');
      // Set original source to avoid confirmation popup
      await setOriginalSource(page);
    }

    // Enable reward if enabled
    if (reward) {
      await enableReward(page);
    }

    // Set collection if specified
    if (effectiveCollection) {
      await setCollection(page, effectiveCollection);
    }

    if (submit) {
      // First save as draft
      await saveDraft(page);

      // Then publish (may require QR)
      await publishArticle(page);

      console.log('');
      console.log('========================================');
      console.log('PUBLISHING COMPLETED');
      console.log('========================================');
      // Final: Fill author (after all dialogs to avoid being cleared)
      if (options.author) {
        await fillAuthorFinal(page, options.author);
      }

    } else {
      console.log('[wechat-article-pw] Article composed (preview mode)');
      console.log('[wechat-article-pw] Add --submit to publish');
      console.log('[wechat-article-pw] Add --original to mark as original');
      console.log('[wechat-article-pw] Add --reward to enable reward');
      console.log('[wechat-article-pw] Add --collection "合集名" to set collection');
    }

    // Take final screenshot of the article
    console.log('');
    console.log('[wechat-article-pw] Taking final screenshot...');
    await page.screenshot({ path: '/tmp/wechat_article_final.png', fullPage: true }).catch(() => {});
    console.log('[wechat-article-pw] Final screenshot saved: /tmp/wechat_article_final.png');

    console.log('');
    console.log('[wechat-article-pw] Done! Browser window remains open.');
    console.log('[wechat-article-pw] Press Ctrl+C to close');
    await new Promise(() => {});

  } catch (error) {
    console.error(`[wechat-article-pw] Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    if (context) await context.close();
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

function printUsage(): void {
  console.log(`Post article to WeChat Official Account (Enhanced)

Usage:
  npx -y bun wechat-article-playwright.ts [options]

Options:
  --title <text>       Article title (auto-extracted from markdown)
  --content <text>     Article content (use with --image)
  --html <path>        HTML file to paste (alternative to --content)
  --markdown <path>    Markdown file to convert and post (recommended)
  --theme <name>       Theme for markdown (default, grace, simple)
  --author <name>      Author name (defaults to config "publish-to-wechatmp.author")
  --summary <text>     Article summary/description
  --cover <path>       Cover image path
  --collection <name>   Collection name (合集)
  --original           Mark as original (原创)
  --reward             Enable reward (赞赏)
  --image <path>       Content image (repeatable, only with --content)
  --submit             Submit/publish article (default: preview only)
  --no-submit          Preview only (overrides config)
  --profile <dir>      Chrome profile directory
  --headless           Run in headless mode
  --help, -h          Show this help

Configuration (~/.claude/wt/config.jsonc):
{
  "publish-to-wechatmp": {
    "author": "冰原奔狼",
    "collection": "合集名",
    "enable_original": true,
    "enable_reward": false
  }
}

Examples:
  # Preview article
  npx -y bun wechat-article-playwright.ts --markdown article.md

  # Publish with all features
  npx -y bun wechat-article-playwright.ts --markdown article.md --original --reward --collection "系列名称" --submit

  # Publish with author from config
  npx -y bun wechat-article-playwright.ts --markdown article.md --submit
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  const images: string[] = [];
  let title: string | undefined;
  let content: string | undefined;
  let htmlFile: string | undefined;
  let markdownFile: string | undefined;
  let theme: string | undefined;
  let author: string | undefined;
  let summary: string | undefined;
  let coverImage: string | undefined;
  let collection: string | undefined;
  let original = false;
  let reward = false;
  let submit: boolean | undefined;
  let profileDir: string | undefined;
  let headless = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--html' && args[i + 1]) htmlFile = args[++i];
    else if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--theme' && args[i + 1]) theme = args[++i];
    else if (arg === '--author' && args[i + 1]) author = args[++i];
    else if (arg === '--summary' && args[i + 1]) summary = args[++i];
    else if (arg === '--cover' && args[i + 1]) coverImage = args[++i];
    else if (arg === '--collection' && args[i + 1]) collection = args[++i];
    else if (arg === '--image' && args[i + 1]) images.push(args[++i]!);
    else if (arg === '--original') original = true;
    else if (arg === '--reward') reward = true;
    else if (arg === '--submit') submit = true;
    else if (arg === '--no-submit') submit = false;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
    else if (arg === '--headless') headless = true;
  }

  // Validate theme parameter from command line for security (command injection prevention)
  if (theme) {
    try {
      theme = getValidTheme(theme);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error: ${errorMsg}`);
      process.exit(1);
    }
  }

  if (!markdownFile && !htmlFile && !title) {
    console.error('Error: --title is required (or use --markdown/--html)');
    process.exit(1);
  }
  if (!markdownFile && !htmlFile && !content) {
    console.error('Error: --content, --html, or --markdown is required');
    process.exit(1);
  }

  if (submit === undefined) submit = getAutoSubmitPreference();
  if (theme === undefined) theme = getDefaultThemePreference();

  await postArticle({
    title, content, htmlFile, markdownFile, theme, author, summary, coverImage, collection,
    images, original, reward, submit, profileDir, headless,
  });
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
