/**
 * X Browser - Playwright-based version
 *
 * Fast publishing to X using Playwright with Chromium.
 * This version uses Playwright's native Chromium support for better performance.
 */

import { chromium, type Page } from 'playwright';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

// X-specific utilities from x-utils
import {
  getDefaultProfileDir,
  getAutoSubmitPreference,
  copyImageToClipboard,
} from './x-utils.js';

export const X_COMPOSE_URL = 'https://x.com/compose/post';

// Selectors for X UI elements (with fallbacks for different UI states)
const EDITOR_SELECTORS = [
  '[data-testid="tweetTextarea_0"]',
  '[contenteditable="true"]',
  '.DraftEditor-root',
  '.public-DraftEditor-content',
];

const BUTTON_SELECTORS = [
  '[data-testid="tweetButton"]',
  '[role="button"][tabindex="0"]',
  'button[type="button"]',
];

export interface XPlaywrightOptions {
  text?: string;
  images?: string[];
  submit?: boolean;
  timeoutMs?: number;
  profileDir?: string;
  chromiumPath?: string;
  headless?: boolean;
}

/**
 * Get Playwright Chromium executable path
 *
 * Uses Playwright's built-in cross-platform executable detection.
 * This works on macOS, Windows, and Linux without hardcoded paths.
 */
async function getChromiumPath(): Promise<string | undefined> {
  try {
    // Use Playwright's built-in executable detection
    const executablePath = chromium.executablePath();
    console.log(`[x-playwright] Using Playwright Chromium: ${executablePath}`);
    return executablePath;
  } catch {
    console.log('[x-playwright] Playwright Chromium not found, falling back to system Chrome');
    return undefined;
  }
}

async function copyImage(imagePath: string): Promise<boolean> {
  try {
    const result = spawnSync('osascript', ['-e', `set the clipboard to (read "${imagePath}" as TIFF)`]);
    if (result.status === 0) return true;
  } catch {
    // Fallback
  }
  try {
    await copyImageToClipboard(imagePath);
    return true;
  } catch {
    return false;
  }
}

export async function postToXPlaywright(options: XPlaywrightOptions): Promise<void> {
  const {
    text,
    images = [],
    submit = false,
    timeoutMs = 60_000,
    profileDir = getDefaultProfileDir(),
    headless = false,
  } = options;

  await mkdir(profileDir, { recursive: true });

  const chromiumPath = await getChromiumPath();
  console.log(`[x-playwright] Launching Chromium (${chromiumPath || 'system'}, profile: ${profileDir})`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless,
    executablePath: chromiumPath,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
    ],
    viewport: { width: 1280, height: 900 },
  });

  try {
    const page: Page = await context.newPage();

    console.log('[x-playwright] Navigating to X...');
    await page.goto(X_COMPOSE_URL, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    console.log('[x-playwright] Waiting for editor...');
    let editorFound = false;
    for (const selector of EDITOR_SELECTORS) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        editorFound = true;
        console.log(`[x-playwright] Editor found: ${selector}`);
        break;
      } catch {
        // Try next selector
      }
    }
    if (!editorFound) {
      console.log('[x-playwright] Editor not found. Please log in manually.');
      // Wait longer for manual login
      await page.waitForSelector(EDITOR_SELECTORS[0]!, { timeout: 120_000 }).catch(() => {});
    }

    if (text) {
      console.log('[x-playwright] Typing text...');
      const editor = page.locator(EDITOR_SELECTORS[0]);
      if (await editor.count() > 0) {
        await editor.fill(text);
      } else {
        // Fallback to any available editor
        for (const selector of EDITOR_SELECTORS) {
          const el = page.locator(selector);
          if (await el.count() > 0) {
            await el.fill(text);
            break;
          }
        }
      }
      await page.waitForTimeout(500);
    }

    for (const imagePath of images) {
      if (!fs.existsSync(imagePath)) {
        console.warn(`[x-playwright] Image not found: ${imagePath}`);
        continue;
      }
      console.log(`[x-playwright] Adding image: ${imagePath}`);
      const copied = await copyImage(imagePath);
      if (copied) {
        await page.click('[data-testid="tweetTextarea_0"]');
        await page.waitForTimeout(200);
        await page.keyboard.press('Meta+v');
        await page.waitForTimeout(3000);
      }
    }

    if (submit) {
      console.log('[x-playwright] Submitting post...');
      let buttonClicked = false;
      for (const selector of BUTTON_SELECTORS) {
        try {
          await page.click(selector, { timeout: 5000 });
          buttonClicked = true;
          break;
        } catch {
          // Try next selector
        }
      }
      if (!buttonClicked) {
        // Fallback to first selector
        await page.click(BUTTON_SELECTORS[0], { timeout: 10000 }).catch(() => {});
      }
      await page.waitForTimeout(3000);
      console.log('[x-playwright] Post submitted!');
    } else {
      console.log('[x-playwright] Post composed (preview mode).');
      console.log('[x-playwright] Browser stays open for preview...');
      await page.waitForTimeout(30000);
    }
  } finally {
    await context.close();
  }
}

// CLI
function printUsage(): never {
  console.log(`Post to X (Twitter) using Playwright + Chromium

Usage:
  npx -y bun x-playwright.ts [options] [text]

Options:
  --image <path>   Add image (can be repeated, max 4)
  --submit         Actually post (overrides config)
  --no-submit     Preview only (overrides config)
  --headless      Run in headless mode
  --profile <dir> Chromium profile directory
  --help          Show this help

Examples:
  npx -y bun x-playwright.ts "Hello from Playwright!"
  npx -y bun x-playwright.ts "Check this out" --image ./screenshot.png --submit
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  const images: string[] = [];
  let submit = getAutoSubmitPreference();
  let profileDir: string | undefined;
  let headless = false;
  const textParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--image' && args[i + 1]) {
      images.push(args[++i]!);
    } else if (arg === '--submit') {
      submit = true;
    } else if (arg === '--no-submit') {
      submit = false;
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (arg === '--headless') {
      headless = true;
    } else if (!arg.startsWith('-')) {
      textParts.push(arg);
    }
  }

  const text = textParts.join(' ').trim() || undefined;

  if (!text && images.length === 0) {
    console.error('Error: Provide text or at least one image.');
    process.exit(1);
  }

  await postToXPlaywright({ text, images, submit, profileDir, headless });
}

const isMain = process.argv[1]?.includes('x-playwright.ts');
if (isMain) {
  await main().catch((err) => {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
