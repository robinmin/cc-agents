/**
 * Playwright utilities for browser automation
 *
 * This module provides Playwright utilities for browser automation across all
 * WT publishing channels (X, Substack, Medium, Juejin, InfoQ, Zenn, Qiita, etc.)
 *
 * Architecture:
 * - TypeScript utilities: Functions imported directly by skills
 * - Script templates: String functions that generate executable JS for Playwright
 *
 * @packageDocumentation
 */

import { spawn, SpawnOptions } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';
import type { Page } from 'playwright';

// ============================================================================
// Configuration Types
// ============================================================================

export interface PlaywrightOptions {
  profileDir?: string;
  headless?: boolean;
  slowMo?: number;
  viewport?: { width: number; height: number };
  args?: string[];
  verbose?: boolean;
}

export interface PlatformConfig {
  name: string;
  envVar?: string;
  defaultProfile?: string;
  baseUrl?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep for specified milliseconds
 */
export function pwSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get a free TCP port
 *
 * Note: Using require() for node:net is intentional and correct here.
 * require() is synchronous and caches the module, so it's safe to use
 * in an async function without await. The alternative would be dynamic
 * import(), but that adds unnecessary complexity for a synchronous operation.
 */
export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    // require() is synchronous and safe to use here
    const server = require('node:net').createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate a free TCP port.')));
        return;
      }
      const port = address.port;
      server.close((err?: NodeJS.ErrnoException) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

/**
 * Get default profile directory for Playwright browser automation
 */
export function getDefaultProfileDir(platform: string = 'wt-browser'): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, `${platform}-profile`);
}

// ============================================================================
// Login Detection Utilities
// ============================================================================

export interface LoginDetectionConfig {
  /** URLs that indicate login is required */
  loginUrls?: string[];
  /** URLs that indicate user is authenticated */
  authenticatedUrls?: string[];
  /** Selector for navigation element (visible when logged in) */
  navSelector?: string;
  /** Timeout for login detection */
  timeoutMs?: number;
}

const DEFAULT_LOGIN_URLS = ['/login', '/i/flow/login', '/i/flow/signup'];
const DEFAULT_AUTH_URLS = ['/compose', '/articles', '/home'];
const DEFAULT_NAV_SELECTOR = 'nav[aria-label="Primary"]';

/**
 * Check if the current page indicates user is logged in
 */
export async function isLoggedIn(
  page: Page,
  config: LoginDetectionConfig = {}
): Promise<boolean> {
  const {
    loginUrls = DEFAULT_LOGIN_URLS,
    authenticatedUrls = DEFAULT_AUTH_URLS,
    navSelector = DEFAULT_NAV_SELECTOR,
  } = config;

  const url = page.url();

  // Check for login pages first
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

  // Check for navigation element (visible when logged in)
  try {
    const hasNav = await page.locator(navSelector).isVisible({ timeout: 3000 });
    if (hasNav) return true;
  } catch {
    // Nav not visible
  }

  return false;
}

/**
 * Wait for user to complete login
 */
export async function waitForLogin(
  page: Page,
  config: LoginDetectionConfig = {}
): Promise<void> {
  const {
    loginUrls = DEFAULT_LOGIN_URLS,
    authenticatedUrls = DEFAULT_AUTH_URLS,
    timeoutMs = 300000, // 5 minutes default
  } = config;

  const authPatterns = [
    ...authenticatedUrls.map((u) => u.replace('/', '\\/')),
    '/home',
  ];

  try {
    await page.waitForURL(new RegExp(authPatterns.join('|')), {
      timeout: timeoutMs,
    });
    console.log('[x-article-pw] Login successful!');
  } catch {
    throw new Error(
      `Login timeout (${timeoutMs / 1000}s) - please try again`
    );
  }
}

/**
 * Handle login flow - detect if login needed and wait for it
 */
export async function handleLogin(
  page: Page,
  targetUrl: string,
  config: LoginDetectionConfig = {}
): Promise<boolean> {
  const { navSelector = DEFAULT_NAV_SELECTOR } = config;

  const loggedIn = await isLoggedIn(page, config);

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
    const targetBase = urlParts[3] || ''; // e.g., 'compose' from 'x.com/compose/articles'
    if (targetBase && !page.url().includes(targetBase)) {
      console.log('[x-article-pw] Navigating to target...');
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  } else {
    console.log('[x-article-pw] Already logged in');
  }

  return loggedIn;
}

/**
 * Navigate to URL with login detection
 */
export async function navigateWithLogin(
  page: Page,
  url: string,
  config: LoginDetectionConfig = {}
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Small delay for page to stabilize
  await pwSleep(2000);

  // Check if we need to handle login
  await handleLogin(page, url, config);
}

// ============================================================================
// Script Execution
// ============================================================================

/**
 * Execute a Playwright script using the playwright-skill
 */
export async function runPlaywrightScript(
  scriptPath: string,
  options: { verbose?: boolean; cwd?: string } = {}
): Promise<string> {
  const { verbose = false, cwd = getPlaywrightSkillDir() } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn(
      'node',
      ['run.js', scriptPath],
      {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'] as SpawnOptions['stdio'],
      } as SpawnOptions
    );

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      stdout += output;
      if (verbose) process.stdout.write(output);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      stderr += output;
      if (verbose) process.stderr.write(output);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Playwright script exited with code ${code}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Get the playwright-skill directory
 * Dynamically discovers the latest version
 */
export function getPlaywrightSkillDir(): string {
  const baseDir = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'playwright-skill');

  if (!fs.existsSync(baseDir)) {
    throw new Error(`Playwright skill cache not found at ${baseDir}`);
  }

  // Find all versions and use the latest
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const versions: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      versions.push(entry.name);
    }
  }

  if (versions.length === 0) {
    throw new Error('No playwright-skill versions found');
  }

  // Sort versions semantically (latest first)
  versions.sort((a, b) => {
    const va = a.split('.').map(Number);
    const vb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const diff = (vb[i] ?? 0) - (va[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  const latestVersion = versions[0]!;
  const skillDir = path.join(baseDir, 'playwright-skill', latestVersion, 'skills', 'playwright-skill');

  if (!fs.existsSync(skillDir)) {
    throw new Error(`Playwright skill directory not found: ${skillDir}`);
  }

  return skillDir;
}

// ============================================================================
// Script Template: Browser Launch
// ============================================================================

/**
 * Generate browser launch script with persistent context
 */
export function generateLaunchScript(options: {
  profileDir: string;
  headless?: boolean;
  slowMo?: number;
  args?: string[];
  viewport?: { width: number; height: number };
  url?: string;
  verbose?: boolean;
}): string {
  const {
    profileDir,
    headless = false,
    slowMo = 100,
    args = [],
    viewport = { width: 1280, height: 900 },
    url,
    verbose = false,
  } = options;

  return `
const { chromium } = require('playwright');
const fs = require('fs');

const PROFILE_DIR = ${JSON.stringify(profileDir)};
const HEADLESS = ${headless};
const SLOW_MO = ${slowMo};
const VERBOSE = ${verbose};
const VIEWPORT = ${JSON.stringify(viewport)};
const ARGS = ${JSON.stringify(args)};
${url ? `const INITIAL_URL = ${JSON.stringify(url)};` : ''}

function log(...args) {
  if (VERBOSE) console.log('[pw]', ...args);
}

function logError(...args) {
  console.error('[pw:error]', ...args);
}

(async () => {
  // Ensure profile directory exists
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
    log('Created profile directory:', PROFILE_DIR);
  }

  log('Launching browser with persistent context...');
  log('Profile:', PROFILE_DIR);

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      slowMo: SLOW_MO,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        ...ARGS,
      ],
      viewport: VIEWPORT,
    });
  } catch (launchError) {
    const error = launchError instanceof Error ? launchError : new Error(String(launchError));
    logError('Browser launch failed:', error.message);
    logError('Profile directory:', PROFILE_DIR);

    // Provide helpful error messages for common issues
    if (error.message.includes('Executable path')) {
      logError('Chromium executable not found. Please install Chromium browser.');
      logError('On macOS: brew install chromium');
      logError('On Ubuntu/Debian: sudo apt install chromium');
      logError('On Windows: Install Chrome or Chromium browser');
    } else if (error.message.includes('EBUSY') || error.message.includes('in use')) {
      logError('Profile directory is locked or in use. Close other browser instances.');
    } else if (error.message.includes('ENOSPC') || error.message.includes('space')) {
      logError('Insufficient disk space for browser profile.');
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      logError('Permission denied. Check profile directory permissions.');
    }

    throw new Error('Failed to launch browser: ' + error.message);
  }

  const page = context.pages()[0] || await context.newPage();
${url ? `
  await page.goto(INITIAL_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  log('Navigated to:', INITIAL_URL);
` : ''}

  // Export for external use
  global.__PW_CONTEXT__ = context;
  global.__PW_PAGE__ = page;

  log('Browser ready');
})();
`;
}

// ============================================================================
// Script Template: Login Detection & Handling
// ============================================================================

/**
 * Generate login detection and handling script
 */
export function generateLoginDetectionScript(options: {
  loginUrls: string[];
  authenticatedUrls: string[];
  navSelector?: string;
  timeoutMs?: number;
  verbose?: boolean;
}): string {
  const {
    loginUrls,
    authenticatedUrls,
    navSelector = 'nav[aria-label="Primary"]',
    timeoutMs = 300000, // 5 minutes
    verbose = false,
  } = options;

  return `
const { chromium } = require('playwright');
const fs = require('fs');

const LOGIN_URLS = ${JSON.stringify(loginUrls)};
const AUTH_URLS = ${JSON.stringify(authenticatedUrls)};
const NAV_SELECTOR = ${JSON.stringify(navSelector)};
const TIMEOUT_MS = ${timeoutMs};
const VERBOSE = ${verbose};

function log(...args) {
  if (VERBOSE) console.log('[pw:login]', ...args);
}

/**
 * Check if user is logged in
 */
async function isLoggedIn(page) {
  const url = page.url();

  // Check for login pages
  for (const loginUrl of LOGIN_URLS) {
    if (url.includes(loginUrl)) {
      return false;
    }
  }

  // Check for authenticated pages
  for (const authUrl of AUTH_URLS) {
    if (url.includes(authUrl)) {
      return true;
    }
  }

  // Check for navigation element (visible when logged in)
  try {
    const hasNav = await page.locator(NAV_SELECTOR).isVisible({ timeout: 3000 });
    if (hasNav) return true;
  } catch (e) {
    // Nav not visible
  }

  return false;
}

/**
 * Wait for login to complete
 */
async function waitForLogin(page, timeoutMs = TIMEOUT_MS) {
  log('Waiting for login...');
  log('Timeout:', timeoutMs, 'ms');

  try {
    await page.waitForURL(
      new RegExp(AUTH_URLS.map(u => u.replace('/', '\\\\/')).join('|') + '|' + '/home'),
      { timeout: timeoutMs }
    );

    // If redirected to home, navigate to target
    if (page.url().includes('/home')) {
      log('Login successful, on home page');
    } else {
      log('Login successful');
    }

    return true;
  } catch (e) {
    throw new Error('Login timeout (' + (timeoutMs / 1000) + 's) - please try again');
  }
}

/**
 * Main login handler
 */
async function handleLogin(page, targetUrl) {
  const loggedIn = await isLoggedIn(page);

  if (!loggedIn) {
    console.log('');
    console.log('========================================');
    console.log('LOGIN REQUIRED');
    console.log('========================================');
    console.log('Please log in to the browser window.');
    console.log('The script will continue automatically');
    console.log('after you complete the login.');
    console.log('(Timeout: ' + (TIMEOUT_MS / 1000) + ' minutes)');
    console.log('========================================');
    console.log('');

    await waitForLogin(page);

    // If we need to go to a specific URL
    if (targetUrl && page.url() !== targetUrl) {
      log('Navigating to target:', targetUrl);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
  } else {
    log('Already logged in');
  }

  return true;
}

global.__PW_IS_LOGGED_IN__ = isLoggedIn;
global.__PW_WAIT_FOR_LOGIN__ = waitForLogin;
global.__PW_HANDLE_LOGIN__ = handleLogin;
`;
}

// ============================================================================
// Script Template: Element Interaction
// ============================================================================

/**
 * Generate element interaction helpers
 */
export function generateElementHelpersScript(options: {
  selectors?: Record<string, string[]>;
  verbose?: boolean;
}): string {
  const { selectors = {}, verbose = false } = options;

  return `
const { chromium } = require('playwright');

const SELECTORS = ${JSON.stringify(selectors)};
const VERBOSE = ${verbose};

function log(...args) {
  if (VERBOSE) console.log('[pw:element]', ...args);
}

/**
 * Try multiple selectors and return the first visible match
 */
async function trySelectors(page, selectorList, timeout = 5000) {
  for (const sel of selectorList) {
    try {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: Math.min(timeout, 2000) }).catch(() => false);
      if (visible) {
        log('Found element:', sel);
        return { found: true, selector: sel, element: el };
      }
    } catch (e) {
      // Try next selector
    }
  }
  return { found: false, selector: null, element: null };
}

/**
 * Get a selector, checking both custom and I18N variants
 */
function getSelector(key, i18nVariants = []) {
  if (SELECTORS[key]) return SELECTORS[key];
  return i18nVariants;
}

/**
 * Click an element
 */
async function clickElement(page, selector, options = {}) {
  const { timeout = 10000, scrollIntoView = true } = options;

  const result = await trySelectors(page, Array.isArray(selector) ? selector : [selector], timeout);

  if (!result.found) {
    throw new Error('Element not found: ' + (Array.isArray(selector) ? selector.join(', ') : selector));
  }

  if (scrollIntoView) {
    await result.element.scrollIntoViewIfNeeded();
  }

  await result.element.click();
  log('Clicked:', result.selector);
  return result;
}

/**
 * Type text into an element
 */
async function typeText(page, selector, text, options = {}) {
  const { timeout = 10000, delay = 50, clear = true } = options;

  const result = await trySelectors(page, Array.isArray(selector) ? selector : [selector], timeout);

  if (!result.found) {
    throw new Error('Element not found: ' + (Array.isArray(selector) ? selector.join(', ') : selector));
  }

  if (clear) {
    await result.element.clear();
  }

  await result.element.type(text, { delay });
  log('Typed', text.length, 'characters into:', result.selector);
  return result;
}

/**
 * Fill a textarea or contenteditable
 */
async function fillContent(page, selector, content, options = {}) {
  const { timeout = 10000 } = options;

  const result = await trySelectors(page, Array.isArray(selector) ? selector : [selector], timeout);

  if (!result.found) {
    throw new Error('Element not found: ' + (Array.isArray(selector) ? selector.join(', ') : selector));
  }

  // For contenteditable elements
  await page.evaluate((sel, txt) => {
    const el = document.querySelector(sel);
    if (el) {
      el.focus();
      el.innerHTML = txt;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, result.selector, content);

  log('Filled content into:', result.selector);
  return result;
}

/**
 * Upload files
 */
async function uploadFiles(page, selector, filePaths, options = {}) {
  const { timeout = 10000 } = options;

  const result = await trySelectors(page, Array.isArray(selector) ? selector : [selector], timeout);

  if (!result.found) {
    throw new Error('Element not found: ' + (Array.isArray(selector) ? selector.join(', ') : selector));
  }

  await result.element.setInputFiles(filePaths);
  log('Uploaded files:', filePaths.join(', '));
  return result;
}

/**
 * Check if element exists
 */
async function elementExists(page, selector, options = {}) {
  const { timeout = 5000 } = options;

  const result = await trySelectors(page, Array.isArray(selector) ? selector : [selector], timeout);
  return result.found;
}

/**
 * Wait for element to appear
 */
async function waitForElement(page, selector, options = {}) {
  const { timeout = 30000, state = 'visible' } = options;

  try {
    const locator = page.locator(Array.isArray(selector) ? selector[0] : selector).first();
    await locator.waitFor({ state, timeout });
    log('Element appeared:', selector);
    return true;
  } catch (e) {
    log('Element not found:', selector);
    return false;
  }
}

// Export functions
global.__PW_TRY_SELECTORS__ = trySelectors;
global.__PW_CLICK__ = clickElement;
global.__PW_TYPE__ = typeText;
global.__PW_FILL__ = fillContent;
global.__PW_UPLOAD__ = uploadFiles;
global.__PW_EXISTS__ = elementExists;
global.__PW_WAIT__ = waitForElement;
global.__PW_GET_SELECTOR__ = getSelector;
`;
}

// ============================================================================
// Script Template: Content Insertion
// ============================================================================

/**
 * Generate content insertion helpers
 */
export function generateContentInsertionScript(options: {
  verbose?: boolean;
}): string {
  const { verbose = false } = options;

  return `
const { chromium } = require('playwright');

const VERBOSE = ${verbose};

function log(...args) {
  if (VERBOSE) console.log('[pw:content]', ...args);
}

/**
 * Insert HTML content via clipboard paste event
 */
async function insertHtmlViaPaste(page, selector, html, options = {}) {
  const { timeout = 10000 } = options;

  await page.evaluate((sel, htmlContent) => {
    const editor = document.querySelector(sel);
    if (!editor) return false;

    const dt = new DataTransfer();
    dt.setData('text/html', htmlContent);
    dt.setData('text/plain', htmlContent.replace(/<[^>]*>/g, ''));

    const evt = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    editor.dispatchEvent(evt);
    return true;
  }, selector, html);

  log('Inserted HTML via paste');
  return true;
}

/**
 * Insert HTML via execCommand (fallback)
 */
async function insertHtmlViaExec(page, selector, html) {
  await page.evaluate((sel, htmlContent) => {
    const editor = document.querySelector(sel);
    if (editor) {
      editor.focus();
      document.execCommand('insertHTML', false, htmlContent);
    }
  }, selector, html);

  log('Inserted HTML via execCommand');
  return true;
}

/**
 * Insert HTML with fallback chain
 */
async function insertHtml(page, selector, html, options = {}) {
  const { timeout = 10000, fallback = true } = options;

  // Try paste event first
  await insertHtmlViaPaste(page, selector, html, { timeout });

  // Check if content was inserted
  const contentLen = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? (el.innerText || '').length : 0;
  }, selector);

  if (contentLen < 50 && fallback) {
    log('Paste may have failed, trying execCommand...');
    await insertHtmlViaExec(page, selector, html);
  }

  log('Content inserted');
  return true;
}

/**
 * Read HTML from file and insert
 */
async function insertHtmlFromFile(page, selector, filePath, options = {}) {
  const fs = require('fs');
  const html = fs.readFileSync(filePath, 'utf-8');
  log('Read', html.length, 'chars from:', filePath);
  return await insertHtml(page, selector, html, options);
}

// Export functions
global.__PW_INSERT_HTML__ = insertHtml;
global.__PW_INSERT_HTML_PASTE__ = insertHtmlViaPaste;
global.__PW_INSERT_HTML_EXEC__ = insertHtmlViaExec;
global.__PW_INSERT_HTML_FILE__ = insertHtmlFromFile;
`;
}

// ============================================================================
// Script Template: I18N Selectors
// ============================================================================

export interface I18NSelectors {
  writeButton?: string[];
  titleInput?: string[];
  editorBody?: string[];
  fileInput?: string[];
  applyButton?: string[];
  previewButton?: string[];
  publishButton?: string[];
  [key: string]: string[] | undefined;
}

/**
 * Generate I18N-aware selector helpers
 */
export function generateI18NSelectorsScript(selectors: I18NSelectors): string {
  const SELECTORS = JSON.stringify(selectors, null, 2);

  return `
const SELECTORS = ${SELECTORS};

/**
 * Get all variants for a selector key
 */
function getI18NSelectors(key) {
  return SELECTORS[key] || [];
}

/**
 * Get first available selector for a key
 */
async function getFirstVisibleSelector(page, key, timeout = 5000) {
  const variants = getI18NSelectors(key);
  if (!variants || variants.length === 0) {
    return null;
  }

  for (const sel of variants) {
    try {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: Math.min(timeout, 2000) }).catch(() => false);
      if (visible) {
        return sel;
      }
    } catch (e) {
      // Try next
    }
  }
  return null;
}

/**
 * Check if any variant of a selector exists
 */
async function hasI18NSelectors(page, key, timeout = 3000) {
  const variant = await getFirstVisibleSelector(page, key, timeout);
  return variant !== null;
}

global.__PW_I18N_GET__ = getI18NSelectors;
global.__PW_I18N_FIRST__ = getFirstVisibleSelector;
global.__PW_I18N_HAS__ = hasI18NSelectors;
`;
}

// ============================================================================
// Script Template: Retry Helper
// ============================================================================

/**
 * Generate retry helper script
 */
export function generateRetryScript(options: {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  verbose?: boolean;
}): string {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    verbose = false,
  } = options;

  return `
const { chromium } = require('playwright');

const MAX_ATTEMPTS = ${maxAttempts};
const DELAY_MS = ${delayMs};
const BACKOFF_MULTIPLIER = ${backoffMultiplier};
const VERBOSE = ${verbose};

function log(...args) {
  if (VERBOSE) console.log('[pw:retry]', ...args);
}

/**
 * Retry a function with exponential backoff
 */
async function retry(fn, options = {}) {
  const {
    maxAttempts = MAX_ATTEMPTS,
    delayMs = DELAY_MS,
    backoffMultiplier = BACKOFF_MULTIPLIER,
    shouldRetry = () => true,
    verbose = VERBOSE,
  } = options;

  let lastError;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && shouldRetry(error)) {
        if (verbose) {
          log('Attempt', attempt + '/' + maxAttempts, 'failed, retrying in', delay + 'ms...');
        }
        await new Promise(r => setTimeout(r, delay));
        delay *= backoffMultiplier;
      } else {
        if (verbose && attempt === maxAttempts) {
          log('All', maxAttempts, 'attempts failed');
        }
        break;
      }
    }
  }

  throw lastError;
}

global.__PW_RETRY__ = retry;
`;
}

// ============================================================================
// Script Template: Complete Publishing Script
// ============================================================================

export interface PublishingScriptOptions {
  profileDir: string;
  url: string;
  selectors: I18NSelectors;
  htmlFilePath?: string;
  htmlContent?: string;
  title?: string;
  coverImage?: string;
  contentImages?: Array<{ placeholder: string; localPath: string; blockIndex: number }>;
  submit?: boolean;
  verbose?: boolean;
  loginTimeoutMs?: number;
}

/**
 * Generate a complete publishing script with all features
 */
export function generatePublishingScript(options: PublishingScriptOptions): string {
  const {
    profileDir,
    url,
    selectors,
    htmlFilePath,
    htmlContent,
    title,
    coverImage,
    contentImages = [],
    submit = false,
    verbose = false,
    loginTimeoutMs = 300000,
  } = options;

  // Build content loading code
  let contentLoadingCode = '';
  if (htmlFilePath) {
    contentLoadingCode = `
  // Read HTML from file
  const htmlContent = fs.readFileSync(${JSON.stringify(htmlFilePath)}, 'utf-8');
  log('HTML content length:', htmlContent.length, 'chars');`;
  } else if (htmlContent) {
    contentLoadingCode = `
  const htmlContent = ${JSON.stringify(htmlContent)};`;
  }

  // Build content images code
  const imagesCode = contentImages.length > 0 ? `
  // Content images to insert
  const contentImages = ${JSON.stringify(contentImages)};
  if (contentImages.length > 0) {
    console.log('[pw] Note:', contentImages.length, 'content image(s) detected');
    for (const img of contentImages) {
      console.log('[pw]   -', img.placeholder, '->', img.localPath.split('/').pop());
    }
  }` : '';

  // Build cover image code
  const coverCode = coverImage ? `
  // Upload cover image
  if (${JSON.stringify(coverImage)}) {
    console.log('[pw] Uploading cover image...');
    const coverResult = await trySelectors(page, SELECTORS.fileInput || [], 5000);
    if (coverResult.found) {
      await coverResult.element.setInputFiles(${JSON.stringify(coverImage)});
      await page.waitForTimeout(2000);

      // Click Apply button if present
      const applyResult = await trySelectors(page, SELECTORS.applyButton || [], 15000);
      if (applyResult.found) {
        await applyResult.element.click();
        console.log('[pw] Cover image applied');
        await page.waitForTimeout(5000);
      }
    } else {
      console.log('[pw] File input not found, skipping cover image');
    }
  }` : '';

  // Build title code
  const titleCode = title ? `
  // Fill title
  const titleText = ${JSON.stringify(title)};
  if (titleText) {
    console.log('[pw] Filling title...');
    const titleResult = await trySelectors(page, SELECTORS.titleInput || [], 5000);
    if (titleResult.found) {
      await titleResult.element.click();
      await page.waitForTimeout(500);
      await titleResult.element.type(titleText, { delay: 50 });
      await page.waitForTimeout(500);
      // Tab to move focus to content area
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1000);
    } else {
      console.log('[pw] Title input not found');
    }
  }` : '';

  // Build submit code
  const submitCode = submit ? `
    // Publish
    console.log('[pw] Publishing...');
    const publishResult = await trySelectors(page, SELECTORS.publishButton || [], 5000);
    if (publishResult.found) {
      await publishResult.element.click();
      await page.waitForTimeout(3000);
      console.log('[pw] Article published!');
    } else {
      console.log('[pw] Publish button not found');
    }` : `
    // Draft mode - keep browser open
    console.log('[pw] Article composed (draft mode)');
    console.log('[pw] Browser remains open for review');
    console.log('[pw] Press Ctrl+C to close');
    await page.waitForTimeout(300000);`;

  return `
const { chromium } = require('playwright');
const fs = require('fs');

const PROFILE_DIR = ${JSON.stringify(profileDir)};
const URL = ${JSON.stringify(url)};
const SUBMIT = ${submit};
const VERBOSE = ${verbose};
const SELECTORS = ${JSON.stringify(selectors)};
const LOGIN_TIMEOUT_MS = ${loginTimeoutMs};

function log(...args) {
  if (VERBOSE) console.log('[pw]', ...args);
}

(async () => {
  // Ensure profile directory exists
  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  console.log('[pw] Launching browser with persistent profile...');
  console.log('[pw] Profile:', PROFILE_DIR);

  let context;
  try {
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      slowMo: 100,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-extensions',
      ],
      viewport: { width: 1280, height: 900 },
    });
  } catch (launchError) {
    const error = launchError instanceof Error ? launchError : new Error(String(launchError));
    console.error('[pw:error] Browser launch failed:', error.message);
    console.error('[pw:error] Profile directory:', PROFILE_DIR);

    // Provide helpful error messages for common issues
    if (error.message.includes('Executable path')) {
      console.error('[pw:error] Chromium executable not found. Please install Chromium browser.');
      console.error('[pw:error] On macOS: brew install chromium');
      console.error('[pw:error] On Ubuntu/Debian: sudo apt install chromium');
      console.error('[pw:error] On Windows: Install Chrome or Chromium browser');
    } else if (error.message.includes('EBUSY') || error.message.includes('in use')) {
      console.error('[pw:error] Profile directory is locked or in use. Close other browser instances.');
    } else if (error.message.includes('ENOSPC') || error.message.includes('space')) {
      console.error('[pw:error] Insufficient disk space for browser profile.');
    } else if (error.message.includes('EACCES') || error.message.includes('permission')) {
      console.error('[pw:error] Permission denied. Check profile directory permissions.');
    }

    throw new Error('Failed to launch browser: ' + error.message);
  }

  const page = context.pages()[0] || await context.newPage();

  try {
    // Navigate
    console.log('[pw] Navigating to', URL);
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Check login
    const loginUrls = ['/login', '/i/flow/login', '/i/flow/signup'];
    const authUrls = ['/compose/articles', '/articles/edit'];
    const isLoggedIn = !loginUrls.some(u => page.url().includes(u)) &&
                       (authUrls.some(u => page.url().includes(u)) ||
                        await page.locator('nav[aria-label="Primary"]').isVisible({ timeout: 3000 }).catch(() => false));

    if (!isLoggedIn) {
      console.log('');
      console.log('========================================');
      console.log('LOGIN REQUIRED');
      console.log('========================================');
      console.log('Please log in to the browser window.');
      console.log('The script will continue automatically');
      console.log('(Timeout:', LOGIN_TIMEOUT_MS / 60000, 'minutes)');
      console.log('========================================');
      console.log('');

      try {
        await page.waitForURL(
          /compose\\/|articles\\/|home/,
          { timeout: LOGIN_TIMEOUT_MS }
        );
        console.log('[pw] Login successful!');
      } catch (e) {
        throw new Error('Login timeout - please try again');
      }
    } else {
      console.log('[pw] Already logged in');
    }

    // Helper: try selectors
    async function trySelectors(selectorList, timeout = 5000) {
      for (const sel of selectorList) {
        try {
          const el = page.locator(sel).first();
          const visible = await el.isVisible({ timeout: Math.min(timeout, 2000) }).catch(() => false);
          if (visible) {
            return { found: true, selector: sel, element: el };
          }
        } catch (e) {}
      }
      return { found: false, selector: null, element: null };
    }

    // Navigate to articles if needed
    if (page.url().includes('/home')) {
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // Wait for page ready
    await page.waitForTimeout(2000);

    // Click Write button if on list page
    const writeResult = await trySelectors(SELECTORS.writeButton || [], 5000);
    if (writeResult.found) {
      console.log('[pw] Clicking Write button...');
      await writeResult.element.click();
      await page.waitForTimeout(3000);
    }
${coverCode}
${titleCode}

    // Read HTML${contentLoadingCode}
${imagesCode}

    // Wait for editor
    console.log('[pw] Waiting for content editor...');
    await page.waitForTimeout(2000);

    // Find and fill content
    const editorResult = await trySelectors(SELECTORS.editorBody || [], 10000);
    if (!editorResult.found) {
      throw new Error('Content editor not found');
    }

    // Focus editor
    await page.evaluate((sel) => {
      const editor = document.querySelector(sel);
      if (editor) { editor.click(); editor.focus(); }
    }, editorResult.selector);
    await page.waitForTimeout(500);

    // Insert content
    if (htmlContent) {
      console.log('[pw] Inserting content...');
      await page.evaluate((sel, html) => {
        const editor = document.querySelector(sel);
        if (!editor) return;

        const dt = new DataTransfer();
        dt.setData('text/html', html);
        dt.setData('text/plain', html.replace(/<[^>]*>/g, ''));

        const evt = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt,
        });
        editor.dispatchEvent(evt);
      }, editorResult.selector, htmlContent);

      await page.waitForTimeout(2000);

      // Check insertion
      const contentLen = await page.evaluate(() => {
        const el = document.querySelector('.DraftEditor-editorContainer [data-contents="true"]');
        return el ? (el.innerText || '').length : 0;
      });

      if (contentLen < 50) {
        console.log('[pw] Auto-insert may have failed. Please paste manually (Cmd+V).');
        await page.waitForTimeout(30000);
      } else {
        console.log('[pw] Content inserted (' + contentLen + ' chars)');
      }
    }

    // Preview
    console.log('[pw] Opening preview...');
    const previewResult = await trySelectors(SELECTORS.previewButton || [], 5000);
    if (previewResult.found) {
      await previewResult.element.click();
      await page.waitForTimeout(3000);
      console.log('[pw] Preview opened');
    }

    // Publish or draft
${submitCode}

  } catch (error) {
    console.error('[pw] Error:', error.message);
    try {
      await page.screenshot({ path: '/tmp/pw-error.png', fullPage: true });
      console.log('[pw] Error screenshot: /tmp/pw-error.png');
    } catch (e) {}
    throw error;
  } finally {
    await context.close();
  }
})();
`;
}

// ============================================================================
// Retry Utility (TypeScript Side)
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  verbose?: boolean;
}

/**
 * Retry a function with exponential backoff (TypeScript side)
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
    verbose = false,
  } = options;

  let lastError: unknown;
  let delay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && shouldRetry(error)) {
        if (verbose) {
          console.log(`[pw:retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        }
        await pwSleep(delay);
        delay *= backoffMultiplier;
      } else {
        if (verbose && attempt === maxAttempts) {
          console.log(`[pw:retry] All ${maxAttempts} attempts failed`);
        }
        break;
      }
    }
  }

  throw lastError;
}
