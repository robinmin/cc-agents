/**
 * X (Twitter) Article Publishing - Playwright Implementation
 *
 * Uses Playwright with Chromium directly (no playwright-skill dependency).
 * X Articles: https://x.com/compose/articles
 *
 * Usage:
 *   bun run x-article-playwright.ts <markdown_file> [options]
 *
 * Options:
 *   --title <title>        Override title
 *   --cover <image>        Override cover image
 *   --submit               Actually publish (overrides config)
 *   --no-submit            Draft only (overrides config)
 *   --profile <dir>        Chromium profile directory
 *   --verbose              Enable verbose logging
 */

import { chromium, type Page } from 'playwright';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Local imports
import { parseMarkdown } from './md-to-html.js';
import {
  getAutoSubmitPreference,
  getDefaultProfileDir,
} from './x-utils.js';

// ============================================================================
// Login Detection Utilities (from web-automation)
// ============================================================================

interface LoginDetectionConfig {
  loginUrls?: string[];
  authenticatedUrls?: string[];
  navSelector?: string;
  timeoutMs?: number;
}

const DEFAULT_LOGIN_URLS = ['/login', '/i/flow/login', '/i/flow/signup'];
const DEFAULT_AUTH_URLS = ['/compose/articles', '/compose', '/articles', '/home'];
const DEFAULT_NAV_SELECTOR = 'nav[aria-label="Primary"]';

/**
 * Check if user is logged in based on URL and DOM elements
 */
async function checkLoggedIn(page: Page, config: LoginDetectionConfig = {}): Promise<boolean> {
  const {
    loginUrls = DEFAULT_LOGIN_URLS,
    authenticatedUrls = DEFAULT_AUTH_URLS,
    navSelector = DEFAULT_NAV_SELECTOR,
  } = config;

  const url = page.url();

  // Check for login pages
  for (const loginUrl of loginUrls) {
    if (url.includes(loginUrl)) {
      return false;
    }
  }

  // Check for authenticated pages
  for (const authUrl of authenticatedUrls) {
    if (url.includes(authUrl)) {
      return true;
    }
  }

  // Check for navigation element
  try {
    const hasNav = await page.locator(navSelector).isVisible({ timeout: 3000 });
    if (hasNav) return true;
  } catch {
    // Nav not visible
  }

  return false;
}

/**
 * Wait for login to complete
 */
async function waitForLogin(page: Page, config: LoginDetectionConfig = {}): Promise<void> {
  const { authenticatedUrls = DEFAULT_AUTH_URLS, timeoutMs = 300000 } = config;

  const authPatterns = [...authenticatedUrls.map((u) => u.replace('/', '\\/')), '/home'];

  try {
    await page.waitForURL(new RegExp(authPatterns.join('|')), { timeout: timeoutMs });
    console.log('[x-article-pw] Login successful!');
  } catch {
    throw new Error(`Login timeout (${timeoutMs / 1000}s) - please try again`);
  }
}

/**
 * Handle login flow - detect if login needed and wait for it
 */
async function handleLoginFlow(page: Page, targetUrl: string, config: LoginDetectionConfig = {}): Promise<boolean> {
  const { navSelector = DEFAULT_NAV_SELECTOR } = config;

  const loggedIn = await checkLoggedIn(page, config);

  if (!loggedIn) {
    console.log('');
    console.log('========================================');
    console.log('LOGIN REQUIRED');
    console.log('========================================');
    console.log('Please log in to the browser window.');
    console.log('The script will continue automatically');
    console.log('after you complete the login.');
    console.log('========================================');
    console.log('');

    await waitForLogin(page, config);

    // Navigate to target if needed
    const urlParts = targetUrl.split('/');
    const targetBase = urlParts[3] || '';
    if (targetBase && !page.url().includes(targetBase)) {
      console.log('[x-article-pw] Navigating to target...');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  } else {
    console.log('[x-article-pw] Already logged in');
  }

  return loggedIn;
}

// URLs
const X_ARTICLES_URL = 'https://x.com/compose/articles';

// I18N selectors for X Articles
const SELECTORS = {
  writeButton: [
    '[data-testid="empty_state_button_text"]',
    '[data-testid="btn"]',
    'div[role="button"]:has-text("Write")',
    'button:has-text("Write")',
    '[aria-label*="Write" i]',
  ],
  titleInput: [
    'textarea[placeholder="Add a title"]',
    '[data-testid="twitter-article-title"]',
    'textarea[name="Article Title"]',
    '.DraftEditor-editorContainer [contenteditable="true"]',
  ],
  editorBody: [
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.DraftEditor-editorContainer [data-contents="true"]',
    '[contenteditable="true"][data-text="true"]',
    'div[role="textbox"]',
  ],
  addPhotosButton: [
    '[data-testid="addPhotoButton"]',
    '[data-testid="fileInput"]',
    'button[aria-label*="Add photos" i]',
    'button[aria-label*="添加照片" i]',
    'div[role="button"]:has-text("Add photos")',
    'div[role="button"]:has-text("添加照片")',
  ],
  fileInput: [
    '[data-testid="fileInput"]',
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ],
  previewButton: [
    '[data-testid="previewButton"]',
    'button[aria-label*="preview" i]',
    'div[role="button"]:has-text("Preview")',
  ],
  publishButton: [
    '[data-testid="publishButton"]',
    'button[aria-label*="publish" i]',
    'button[aria-label*="发布" i]',
    'button[aria-label*="公開" i]',
    'button[aria-label*="게시" i]',
    'button:has-text("Publish")',
    'button:has-text("发布")',
    // X/Twitter specific
    '[data-testid="tweetButton"]',
    '[data-testid="Tweet"]',
  ],
};

interface ArticleOptions {
  title?: string;
  cover?: string;
  submit?: boolean;
  profileDir?: string;
  verbose?: boolean;
  chromiumPath?: string;
}

// Playwright-installed Chromium paths
const CHROMIUM_PATHS = [
  '/Users/robin/Library/Caches/ms-playwright/chromium-1187/chrome-mac/Chromium.app/Contents/MacOS/Chromium',
];

async function findWorkingChromium(): Promise<string | undefined> {
  for (const chromiumPath of CHROMIUM_PATHS) {
    if (fs.existsSync(chromiumPath)) {
      console.log(`[x-article-pw] Found Chromium: ${chromiumPath}`);
      return chromiumPath;
    }
  }
  console.log('[x-article-pw] No explicit Chromium found, using system default');
  return undefined;
}

async function findSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element && await element.isVisible()) {
        return selector;
      }
    } catch {
      // Ignore
    }
  }
  return null;
}

/**
 * Handle confirmation dialogs that may appear after clicking Publish
 */
async function handleConfirmationDialog(page: Page): Promise<boolean> {
  console.log('[x-article-pw] Checking for confirmation dialog...');

  // Method 1: JavaScript to find any visible modal/overlay
  interface ModalInfo {
    selector: string;
    text: string;
    buttonTexts: string[];
    hasPublish: boolean;
    hasConfirm: boolean;
  }

  const modalInfo: ModalInfo | null = await page.evaluate(() => {
    // Look for various dialog patterns
    const selectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[aria-modal="true"]',
      '.r-1d2f490', // X backdrop
      '[data-testid="confirmationDialog"]',
      '[data-testid="publishConfirmation"]',
      '.css-175oi2z', // Common X class
      '.r-18bj6bj', // Modal content
      'div[class*="Modal"]',
      'div[class*="modal"]',
    ];

    let foundModal: ModalInfo | null = null;
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const style = window.getComputedStyle(el);
        const isActuallyVisible = style.display !== 'none' && style.visibility !== 'hidden';

        if (isVisible && isActuallyVisible) {
          const text = el.textContent?.substring(0, 200) || '';
          const buttons = el.querySelectorAll('button, [role="button"], div[role="button"]');
          const buttonTexts = Array.from(buttons).map(b => b.textContent?.trim()).filter(Boolean);

          foundModal = {
            selector: sel,
            text: text,
            buttonTexts: buttonTexts,
            hasPublish: buttonTexts.some(t => t?.toLowerCase().includes('publish') || t?.toLowerCase().includes('发布')),
            hasConfirm: buttonTexts.some(t => t?.toLowerCase().includes('confirm') || t?.toLowerCase().includes('确认') || t?.toLowerCase().includes('post')),
          };
          break;
        }
      }
    }

    return foundModal;
  });

  if (modalInfo) {
    console.log(`[x-article-pw] Found modal with selector: ${modalInfo.selector}`);
    console.log(`[x-article-pw] Modal buttons: ${modalInfo.buttonTexts.join(', ')}`);

    // Look for confirm/publish button in the dialog
    const confirmBtnSelectors = [
      '[role="dialog"] button:has-text("Publish")',
      '[role="dialog"] button:has-text("Post")',
      '[role="dialog"] button:has-text("发布")',
      '[role="dialog"] button:has-text("确认")',
      '[role="dialog"] button:has-text("Confirm")',
      '[role="alertdialog"] button:has-text("Publish")',
      '[data-testid*="confirm"]',
      '[data-testid*="publish"]',
      'button:has-text("Publish"):visible',
      'button:has-text("确认"):visible',
    ];

    for (const sel of confirmBtnSelectors) {
      try {
        const btn = await page.$(sel);
        if (btn && await btn.isVisible()) {
          console.log(`[x-article-pw] Clicking confirm button: ${sel}`);
          await btn.click({ force: true });
          await page.waitForTimeout(3000);
          return true;
        }
      } catch {
        // Ignore
      }
    }

    // If no specific button found, try Enter key
    console.log('[x-article-pw] No confirm button found, trying Enter key...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    return true;
  }

  console.log('[x-article-pw] No visible modal found via JavaScript');
  return false;
}

/**
 * Close any modal dialogs or overlay elements that might block interactions
 */
async function closeAnyModals(page: Page): Promise<void> {
  const modalSelectors = [
    '[data-testid="modal"]',
    '[role="dialog"]',
    '.r-1d2f490', // X layers backdrop
    '[aria-modal="true"]',
    // Dismiss buttons
    '[data-testid="dismiss"]',
    '[data-testid="closeButton"]',
    'button[aria-label*="Close" i]',
    'button[aria-label*="关闭" i]',
    'div[role="button"]:has-text("Close")',
    'div[role="button"]:has-text("关闭")',
    'div[role="button"]:has-text("Cancel")',
    'div[role="button"]:has-text("取消")',
  ];

  for (const selector of modalSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn && await btn.isVisible()) {
        console.log(`[x-article-pw] Closing modal: ${selector}`);
        await btn.click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch {
      // Ignore
    }
  }
}

/**
 * Handle image editor modal with Apply/Confirm button
 */
async function handleImageEditor(page: Page): Promise<void> {
  // X has an image editor modal with Apply button
  const applyButtonSelectors = [
    '[data-testid="imageEditorApplyButton"]',
    '[data-testid="applyButton"]',
    'button[aria-label*="Apply" i]',
    'button[aria-label*="确认" i]',
    'button[aria-label*="确定" i]',
    'button:has-text("Apply")',
    'button:has-text("确认")',
    'button:has-text("确定")',
    'div[role="button"]:has-text("Apply")',
    'div[role="button"]:has-text("确认")',
    'div[role="button"]:has-text("确定")',
  ];

  for (const selector of applyButtonSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn && await btn.isVisible()) {
        console.log(`[x-article-pw] Clicking Apply button: ${selector}`);
        await btn.click({ force: true });
        await page.waitForTimeout(1000);
        return; // Successfully handled
      }
    } catch {
      // Ignore
    }
  }

  // If no Apply button found, try pressing Escape
  console.log('[x-article-pw] No Apply button found, trying Escape...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

export async function publishArticle(
  markdownPath: string,
  options: ArticleOptions = {}
): Promise<void> {
  const {
    title: titleOverride,
    cover: coverPath,
    submit = false,
    profileDir = getDefaultProfileDir('publish-to-x'),
    verbose = false,
  } = options;

  // Parse markdown
  if (!fs.existsSync(markdownPath)) {
    throw new Error(`Markdown file not found: ${markdownPath}`);
  }

  const parsed = await parseMarkdown(markdownPath);

  const title = titleOverride || parsed.title || 'Untitled';
  const cover = coverPath || parsed.coverImage;
  const content = parsed.html;

  if (verbose) {
    console.log(`[x-article-pw] Title: ${title}`);
    console.log(`[x-article-pw] Cover: ${cover}`);
    console.log(`[x-article-pw] Content length: ${content.length} chars`);
  }

  await mkdir(profileDir, { recursive: true });

  const chromiumPath = await findWorkingChromium();
  console.log(`[x-article-pw] Launching Chromium (${chromiumPath || 'system'}, profile: ${profileDir})`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    executablePath: chromiumPath,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page: Page = await context.newPage();

    // Navigate to articles page with login detection
    console.log('[x-article-pw] Navigating to X Articles...');
    await page.goto(X_ARTICLES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Check login status and handle login if needed
    const loginConfig = {
      loginUrls: ['/login', '/i/flow/login', '/i/flow/signup'],
      authenticatedUrls: ['/compose/articles', '/articles', '/home'],
      navSelector: 'nav[aria-label="Primary"]',
      timeoutMs: 300000, // 5 minutes
    };

    const loggedIn = await checkLoggedIn(page, loginConfig);
    if (!loggedIn) {
      console.log('[x-article-pw] Login required, waiting for user to login...');
      await handleLoginFlow(page, X_ARTICLES_URL, loginConfig);
    } else {
      console.log('[x-article-pw] Already logged in');
    }

    // Navigate to articles page again after login
    await page.goto(X_ARTICLES_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Click Write button
    console.log('[x-article-pw] Looking for Write button...');
    const writeBtn = await findSelector(page, SELECTORS.writeButton);
    if (writeBtn) {
      await page.click(writeBtn);
      await page.waitForTimeout(2000);
    }

    // Enter title
    console.log('[x-article-pw] Entering title...');
    console.log(`[x-article-pw] DEBUG: Title to insert: "${title}"`);

    // Try different selectors for title
    const titleSelectors = [
      'textarea[placeholder*="Add a title" i]',
      '[data-testid*="title"]',
      'textarea[name*="title" i]',
      '.DraftEditor-titleContainer textarea',
      '[role="textbox"][aria-label*="title" i]',
    ];

    let titleFilled = false;
    for (const selector of titleSelectors) {
      const el = await page.$(selector);
      if (el && await el.isVisible()) {
        console.log(`[x-article-pw] Filling title using: ${selector}`);
        await el.fill('');
        await page.waitForTimeout(200);
        await el.fill(title);
        await page.waitForTimeout(500);

        // Verify
        const value = await el.evaluate((el: HTMLInputElement) => el.value);
        console.log(`[x-article-pw] Title after fill: "${value}"`);

        if (value === title) {
          titleFilled = true;
          console.log('[x-article-pw] Title filled successfully!');
          break;
        }
      }
    }

    if (!titleFilled) {
      // Try the original selectors as fallback
      const titleInput = await findSelector(page, SELECTORS.titleInput);
      if (titleInput) {
        console.log(`[x-article-pw] Trying fallback selector: ${titleInput}`);
        const el = await page.$(titleInput);
        if (el) {
          await el.fill('');
          await page.waitForTimeout(200);
          await el.fill(title);
          await page.waitForTimeout(500);
        }
      }
    }

    // Verify title persists after image upload
    console.log('[x-article-pw] Verifying title after initial fill...');
    await page.waitForTimeout(1000);
    for (const selector of titleSelectors) {
      const el = await page.$(selector);
      if (el) {
        const value = await el.evaluate((el: HTMLInputElement) => el.value);
        if (value && value !== title) {
          console.log(`[x-article-pw] WARNING: Title changed to "${value}" after operations!`);
        }
      }
    }

    // Upload cover image if provided
    if (cover) {
      const coverPathAbs = path.resolve(path.dirname(markdownPath), cover || '');
      if (fs.existsSync(coverPathAbs)) {
        console.log('[x-article-pw] Uploading cover image...');

        // Directly set files on the file input (no need to click first)
        // File inputs are typically hidden and should be used with setInputFiles
        const fileInput = await findSelector(page, SELECTORS.fileInput);
        if (fileInput) {
          console.log(`[x-article-pw] Setting cover image: ${coverPathAbs}`);
          await page.locator(fileInput).setInputFiles(coverPathAbs);
          await page.waitForTimeout(3000);
          console.log('[x-article-pw] Cover image uploaded');

          // Handle image editor modal with Apply button
          await handleImageEditor(page);

          // Close any remaining modals
          await closeAnyModals(page);
          await page.waitForTimeout(1000);
        } else {
          console.log('[x-article-pw] File input not found');
        }
      } else {
        console.log(`[x-article-pw] Cover image not found: ${coverPathAbs}`);
      }
    }

    // Insert content via clipboard paste (handles HTML better)
    console.log('[x-article-pw] Inserting content...');
    const editorBody = await findSelector(page, SELECTORS.editorBody);

    if (editorBody) {
      // Close any modals first
      await closeAnyModals(page);
      await page.waitForTimeout(500);

      // Focus the editor with force to bypass overlays
      try {
        await page.click(editorBody, { force: true, timeout: 5000 });
      } catch {
        // If click fails, try with force
        await page.click(editorBody, { force: true });
      }
      await page.waitForTimeout(500);

      // Method 1: Paste using clipboard event with HTML
      try {
        const htmlContent = content;

        console.log(`[x-article-pw] DEBUG: Original content length: ${content.length} chars`);
        console.log(`[x-article-pw] DEBUG: Original content preview: ${content.substring(0, 200)}...`);

        // Dispatch paste event with HTML content
        await page.evaluate((args: { selector: string; html: string }) => {
          const el = document.querySelector(args.selector) as HTMLElement;
          if (el) {
            const dt = new DataTransfer();
            dt.setData('text/html', args.html);
            dt.setData('text/plain', args.html.replace(/<[^>]*>/g, ''));

            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: dt,
            });
            el.dispatchEvent(pasteEvent);
          }
        }, { selector: editorBody, html: htmlContent });

        await page.waitForTimeout(2000);

        // Check what actually got inserted
        const insertedInfo = await page.evaluate((sel) => {
          const el = document.querySelector(sel) as HTMLElement;
          if (!el) return { innerHTML: '', innerText: '', fullText: '' };
          const fullText = el.innerText || '';
          return {
            innerHTML: el.innerHTML || '',
            innerText: fullText,
            fullText: fullText,
            // Check for key sections
            hasIntro: fullText.includes('引言'),
            hasConclusion: fullText.includes('结论'),
            hasReferences: fullText.includes('参考来源'),
            hasPM2: fullText.includes('PM2'),
            hasLaunchd: fullText.includes('launchd'),
            endsWithExpected: fullText.trim().endsWith('参考来源') || fullText.trim().endsWith('参考'),
            children: el.children?.length || 0,
          };
        }, editorBody);

        console.log(`[x-article-pw] DEBUG: Inserted HTML length: ${insertedInfo.innerHTML.length} chars`);
        console.log(`[x-article-pw] DEBUG: Inserted text length: ${insertedInfo.innerText.length} chars`);
        console.log(`[x-article-pw] DEBUG: Child elements: ${insertedInfo.children}`);
        console.log(`[x-article-pw] DEBUG: Section checks:`);
        console.log(`[x-article-pw] DEBUG:   - Has 引言 (Intro): ${insertedInfo.hasIntro}`);
        console.log(`[x-article-pw] DEBUG:   - Has 结论 (Conclusion): ${insertedInfo.hasConclusion}`);
        console.log(`[x-article-pw] DEBUG:   - Has 参考来源 (References): ${insertedInfo.hasReferences}`);
        console.log(`[x-article-pw] DEBUG:   - Has PM2: ${insertedInfo.hasPM2}`);
        console.log(`[x-article-pw] DEBUG:   - Has launchd: ${insertedInfo.hasLaunchd}`);
        console.log(`[x-article-pw] DEBUG: Text preview (first 200): ${insertedInfo.innerText.substring(0, 200)}...`);
        console.log(`[x-article-pw] DEBUG: Text preview (last 100): ...${insertedInfo.innerText.slice(-100)}`);

        const contentLength = insertedInfo.innerText.length;
        console.log(`[x-article-pw] Content after paste attempt: ${contentLength} chars`);

        if (contentLength < 100) {
          console.log("[x-article-pw] Paste didn't work, trying execCommand...");

          // Method 2: Try insertHTML
          await page.evaluate((args: { selector: string; html: string }) => {
            const el = document.querySelector(args.selector) as HTMLElement;
            if (el) {
              el.focus();
              document.execCommand('insertHTML', false, args.html);
            }
          }, { selector: editorBody, html: content });

          await page.waitForTimeout(1000);

          const contentLength2 = await page.evaluate((sel) => {
            const el = document.querySelector(sel) as HTMLElement;
            return el ? (el.innerText || '').length : 0;
          }, editorBody);

          console.log(`[x-article-pw] Content after insertHTML: ${contentLength2} chars`);
        }
      } catch (e) {
        console.log(`[x-article-pw] Content insertion error: ${e}`);
      }
    } else {
      console.log('[x-article-pw] Editor body not found');
    }

    if (submit) {
      console.log('[x-article-pw] Publishing article...');

      // Close any modals first
      await closeAnyModals(page);
      await page.waitForTimeout(500);

      // Debug: List all visible buttons on the page
      console.log('[x-article-pw] Debug: Scanning for publish buttons...');
      const allButtons = await page.$$('button, div[role="button"], [role="button"]');
      for (const btn of allButtons) {
        try {
          const text = await btn.textContent();
          const isVisible = await btn.isVisible();
          if (isVisible && text && text.trim().length > 0) {
            console.log(`[x-article-pw] Button: "${text.trim()}" - visible: ${isVisible}`);
          }
        } catch {
          // Ignore
        }
      }

      // Find the publish button and check its state
      const publishBtnLocator = page.locator('button:has-text("Publish"), [data-testid="publishButton"]');
      const publishBtnCount = await publishBtnLocator.count();

      if (publishBtnCount > 0) {
        const publishBtn = publishBtnLocator.first();
        const isEnabled = await publishBtn.isEnabled();
        const isVisible = await publishBtn.isVisible();
        const buttonText = await publishBtnLocator.first().textContent();

        console.log(`[x-article-pw] Publish button found: count=${publishBtnCount}, enabled=${isEnabled}, visible=${isVisible}`);
        console.log(`[x-article-pw] Publish button text: ${buttonText}`);

        // Debug: Check what's wrong with the form
        console.log('[x-article-pw] Debug: Checking form validation...');

        // Check for error messages or validation warnings
        const errorSelectors = [
          '[data-testid*="error"]',
          '[data-testid*="warning"]',
          '[data-testid*="alert"]',
          '.r-1d2f490', // Error banners
          '[role="alert"]',
          '[aria-live]'
        ];

        for (const selector of errorSelectors) {
          const el = await page.$(selector);
          if (el && await el.isVisible()) {
            const text = await el.textContent();
            console.log(`[x-article-pw] Error/Warning element (${selector}): ${text?.substring(0, 100)}`);
          }
        }

        // Check title field state
        const titleInput = await page.$('textarea[placeholder*="Add a title"], [data-testid*="title"]');
        if (titleInput) {
          const titleValue = await titleInput.evaluate((el: HTMLInputElement) => el.value);
          console.log(`[x-article-pw] Title value: "${titleValue}"`);
        }

        // Check content editor state
        const editor = await page.$('[contenteditable="true"][data-testid="composer"]');
        if (editor) {
          const editorText = await editor.evaluate((el: HTMLElement) => el.innerText);
          console.log(`[x-article-pw] Editor text length: ${editorText.length} chars`);
          console.log(`[x-article-pw] Editor preview: ${editorText.substring(0, 100)}...`);
        }

        // Check for disabled attribute
        const disabledAttr = await publishBtnLocator.getAttribute('disabled');
        console.log(`[x-article-pw] Publish button disabled attr: ${disabledAttr}`);

        // Get URL before publish
        const urlBefore = page.url();
        console.log(`[x-article-pw] URL: ${urlBefore}`);

        // FINAL ATTEMPT: Fill title again right before publishing
        console.log('[x-article-pw] Final attempt: filling title before publish...');
        for (const selector of titleSelectors) {
          const el = await page.$(selector);
          if (el && await el.isVisible()) {
            await el.fill('');
            await page.waitForTimeout(200);
            await el.fill(title);
            await page.waitForTimeout(500);
            const newValue = await el.evaluate((el: HTMLInputElement) => el.value);
            console.log(`[x-article-pw] Title re-filled: "${newValue}"`);
            break;
          }
        }

        // Wait for X to validate and enable publish button
        console.log('[x-article-pw] Waiting for publish button to enable...');
        await page.waitForTimeout(3000);

        // Check button state again
        const publishBtnNow = await page.locator('button:has-text("Publish"), [data-testid="publishButton"]');
        const isEnabledNow = await publishBtnNow.isEnabled();
        console.log(`[x-article-pw] Publish button enabled after wait: ${isEnabledNow}`);

        if (isEnabledNow) {
          console.log('[x-article-pw] Publish button is ENABLED - clicking to publish!');

          // Take screenshot before clicking for debugging
          await page.screenshot({ path: '/tmp/x-before-publish.png' });
          console.log('[x-article-pw] Screenshot saved: /tmp/x-before-publish.png');

          // Method 1: Regular click
          try {
            await publishBtnNow.click({ timeout: 5000 });
            console.log('[x-article-pw] Method 1: Regular click done');
          } catch (e) {
            console.log('[x-article-pw] Regular click failed, trying JavaScript...');
          }

          await page.waitForTimeout(2000);

          // Handle potential confirmation dialog
          await handleConfirmationDialog(page);
          await page.waitForTimeout(2000);

          // Check if URL changed
          let url = page.url();
          if (!url.includes('/edit/')) {
            console.log('[x-article-pw] Article published successfully!');
          } else {
            console.log('[x-article-pw] URL still on edit page, trying JavaScript click...');

            // Method 2: JavaScript click
            await page.evaluate(() => {
              // Use textContent to find the button (native JS doesn't support :has-text)
              const buttons = document.querySelectorAll('button');
              for (const btn of buttons) {
                if (btn.textContent && btn.textContent.includes('Publish')) {
                  (btn as HTMLButtonElement).click();
                  break;
                }
              }
            });
            await page.waitForTimeout(3000);

            await handleConfirmationDialog(page);
            await page.waitForTimeout(2000);

            url = page.url();
            if (!url.includes('/edit/')) {
              console.log('[x-article-pw] Article published via JavaScript click!');
            } else {
              console.log('[x-article-pw] Trying event dispatch click...');

              // Method 3: Dispatch click event
              await page.evaluate(() => {
                const buttons = document.querySelectorAll('button');
                for (const btn of buttons) {
                  if (btn.textContent && btn.textContent.includes('Publish')) {
                    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
                    btn.dispatchEvent(event);
                    break;
                  }
                }
              });
              await page.waitForTimeout(3000);

              await handleConfirmationDialog(page);
              await page.waitForTimeout(2000);

              url = page.url();
              if (!url.includes('/edit/')) {
                console.log('[x-article-pw] Article published via event dispatch!');
              }
            }
          }

          // Take final screenshot
          await page.screenshot({ path: '/tmp/x-after-publish.png' });
          console.log(`[x-article-pw] Final URL: ${page.url()}`);
          console.log('[x-article-pw] Screenshot saved: /tmp/x-after-publish.png');

          if (!page.url().includes('/edit/')) {
            console.log('[x-article-pw] SUCCESS: Article published!');
          } else {
            console.log('[x-article-pw] WARNING: URL unchanged after all click methods');
            console.log('[x-article-pw] Browser open for manual verification...');
          }
        } else {
          console.log('[x-article-pw] Publish button still disabled');
          console.log('[x-article-pw] Browser open for manual intervention...');
        }
      } else {
        console.log('[x-article-pw] Publish button not found!');
      }

      await page.waitForTimeout(30000);
    } else {
      console.log('[x-article-pw] Article composed (draft mode).');
      console.log('[x-article-pw] Browser stays open for preview...');
      await page.waitForTimeout(60000);
    }
  } finally {
    await context.close();
  }
}

// CLI
function printUsage(): never {
  console.log(`Publish Markdown article to X (Twitter) Articles - Playwright Implementation

Usage:
  bun run x-article-playwright.ts <markdown_file> [options]

Options:
  --title <title>        Override title
  --cover <image>        Override cover image
  --submit               Actually publish (overrides config)
  --no-submit            Draft only (overrides config)
  --profile <dir>        Chromium profile directory
  --verbose              Enable verbose logging

Example:
  bun run x-article-playwright.ts article.md
  bun run x-article-playwright.ts article.md --cover ./hero.png --submit
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let markdownPath: string | undefined;
  let titleOverride: string | undefined;
  let coverPath: string | undefined;
  let submit = getAutoSubmitPreference();
  let profileDir: string | undefined;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) {
      titleOverride = args[++i];
    } else if (arg === '--cover' && args[i + 1]) {
      coverPath = args[++i];
    } else if (arg === '--submit') {
      submit = true;
    } else if (arg === '--no-submit') {
      submit = false;
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (!arg.startsWith('-')) {
      markdownPath = arg;
    }
  }

  if (!markdownPath) {
    console.error('Error: Markdown file required');
    process.exit(1);
  }

  await publishArticle(markdownPath, {
    title: titleOverride,
    cover: coverPath,
    submit,
    profileDir,
    verbose,
  });
}

const isMain = process.argv[1]?.includes('x-article-playwright.ts');
if (isMain) {
  await main().catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
