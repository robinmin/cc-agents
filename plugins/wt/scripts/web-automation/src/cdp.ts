/**
 * Chrome DevTools Protocol (CDP) utilities for browser automation
 *
 * This module provides CDP utilities for browser automation across all
 * WT publishing channels (X, Substack, Medium, Juejin, InfoQ, Zenn, Qiita, etc.)
 *
 * @packageDocumentation
 */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import * as net from 'node:net';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

// ============================================================================
// Configuration
// ============================================================================

export interface CdpOptions {
  profileDir?: string;
  chromePath?: string;
  headless?: boolean;
  args?: string[];
  port?: number;
  windowSize?: { width: number; height: number };
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

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Unable to allocate a free TCP port.')));
        return;
      }
      const port = address.port;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

export type PlatformCandidates = {
  darwin?: string[];
  win32?: string[];
  default: string[];
};

export const CHROME_CANDIDATES_FULL: PlatformCandidates = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
};

export const CHROME_CANDIDATES_BASIC: PlatformCandidates = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ],
};

function getCandidatesForPlatform(candidates: PlatformCandidates): string[] {
  if (process.platform === 'darwin' && candidates.darwin?.length) return candidates.darwin;
  if (process.platform === 'win32' && candidates.win32?.length) return candidates.win32;
  return candidates.default;
}

/**
 * Find Chrome executable on the system
 */
export function findChromeExecutable(
  candidates: PlatformCandidates = CHROME_CANDIDATES_FULL,
  envVar?: string
): string | undefined {
  // Check environment variable override first
  const override = envVar ? process.env[envVar]?.trim() : process.env.WT_BROWSER_CHROME_PATH?.trim();
  if (override && fs.existsSync(override)) return override;

  for (const candidate of getCandidatesForPlatform(candidates)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Get default profile directory for WT browser automation
 */
export function getDefaultProfileDir(platform: string = 'wt-browser'): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, `${platform}-profile`);
}

// ============================================================================
// CDP Connection
// ============================================================================

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

/**
 * Wait for Chrome debug port to be ready
 */
export async function waitForChromeDebugPort(
  port: number,
  timeoutMs: number,
  options?: { includeLastError?: boolean }
): Promise<string> {
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const version = await fetchJson<{ webSocketDebuggerUrl?: string }>(`http://127.0.0.1:${port}/json/version`);
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
      lastError = new Error('Missing webSocketDebuggerUrl');
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }

  if (options?.includeLastError && lastError) {
    throw new Error(`Chrome debug port not ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }
  throw new Error('Chrome debug port not ready');
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
}

/**
 * CDP Connection class for communicating with Chrome
 */
export class CdpConnection {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventHandlers = new Map<string, Set<(params: unknown) => void>>();
  private defaultTimeoutMs: number;

  private constructor(ws: WebSocket, options?: { defaultTimeoutMs?: number }) {
    this.ws = ws;
    this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 15_000;

    this.ws.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer);
        const msg = JSON.parse(data) as { id?: number; method?: string; params?: unknown; result?: unknown; error?: { message?: string } };

        if (msg.method) {
          const handlers = this.eventHandlers.get(msg.method);
          if (handlers) handlers.forEach((h) => h(msg.params));
        }

        if (msg.id) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (pending.timer) clearTimeout(pending.timer);
            if (msg.error?.message) pending.reject(new Error(msg.error.message));
            else pending.resolve(msg.result);
          }
        }
      } catch (error) {
        console.debug('[cdp] Message handler error:', error);
      }
    });

    this.ws.addEventListener('close', () => {
      for (const [id, pending] of this.pending.entries()) {
        this.pending.delete(id);
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(new Error('CDP connection closed.'));
      }
    });
  }

  static async connect(url: string, timeoutMs: number, options?: { defaultTimeoutMs?: number }): Promise<CdpConnection> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout.')), timeoutMs);
      ws.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('CDP connection failed.')); });
    });
    return new CdpConnection(ws, options);
  }

  on(method: string, handler: (params: unknown) => void): void {
    if (!this.eventHandlers.has(method)) this.eventHandlers.set(method, new Set());
    this.eventHandlers.get(method)!.add(handler);
  }

  async send<T = unknown>(method: string, params?: Record<string, unknown>, options?: { sessionId?: string; timeoutMs?: number }): Promise<T> {
    const id = ++this.nextId;
    const message: Record<string, unknown> = { id, method };
    if (params) message.params = params;
    if (options?.sessionId) message.sessionId = options.sessionId;

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;

    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, timeoutMs)
        : undefined;
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(message));
    });

    return result as T;
  }

  close(): void {
    try { this.ws.close(); } catch (error) {
      console.debug('[cdp] WebSocket close error:', error);
    }
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ChromeSession {
  cdp: CdpConnection;
  sessionId: string;
  targetId: string;
}

// ============================================================================
// Chrome Launching
// ============================================================================

/**
 * Launch Chrome with remote debugging enabled
 */
export async function launchChrome(
  url: string,
  options: CdpOptions = {}
): Promise<{ cdp: CdpConnection; chrome: ReturnType<typeof spawn>; port: number }> {
  const {
    profileDir = getDefaultProfileDir(),
    chromePath = findChromeExecutable(),
    headless = true,
    args = [],
    port = options.port ?? await getFreePort(),
    windowSize = { width: 1920, height: 1080 },
  } = options;

  const chromeExec = chromePath ?? findChromeExecutable();
  if (!chromeExec) throw new Error('Chrome not found. Set WT_BROWSER_CHROME_PATH env var.');

  await mkdir(profileDir, { recursive: true });

  console.log(`[cdp] Launching Chrome on port ${port} (profile: ${profileDir})`);

  const chromeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    ...(headless ? ['--headless=new'] : []),
    `--window-size=${windowSize.width},${windowSize.height}`,
    url,
    ...args,
  ];

  const chrome = spawn(chromeExec, chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await waitForChromeDebugPort(port, 30_000);
  const cdp = await CdpConnection.connect(wsUrl, 30_000);

  return { cdp, chrome, port };
}

/**
 * Connect to an existing Chrome instance
 */
export async function connectToExisting(port: number): Promise<CdpConnection> {
  console.log(`[cdp] Connecting to existing Chrome on port ${port}...`);
  const wsUrl = await waitForChromeDebugPort(port, 10_000);
  return await CdpConnection.connect(wsUrl, 30_000);
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Get or create a page session for the given URL pattern
 */
export async function getPageSession(
  cdp: CdpConnection,
  urlPattern: string,
  options?: { createIfNotFound?: boolean; url?: string }
): Promise<ChromeSession> {
  const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
  let pageTarget = targets.targetInfos.find((t) => t.type === 'page' && t.url.includes(urlPattern));

  if (!pageTarget && options?.createIfNotFound) {
    // Create a new target
    const { targetId } = await cdp.send<{ targetId: string }>('Target.createTarget', { url: options.url ?? urlPattern });
    pageTarget = { targetId, url: options.url ?? urlPattern, type: 'page' };
  }

  if (!pageTarget) throw new Error(`Page not found: ${urlPattern}`);

  const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

  await cdp.send('Page.enable', {}, { sessionId });
  await cdp.send('Runtime.enable', {}, { sessionId });
  await cdp.send('DOM.enable', {}, { sessionId });

  return { cdp, sessionId, targetId: pageTarget.targetId };
}

/**
 * Wait for a new tab to appear (useful for popups)
 */
export async function waitForNewTab(
  cdp: CdpConnection,
  initialIds: Set<string>,
  urlPattern: string,
  timeoutMs = 30_000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
    const newTab = targets.targetInfos.find(t => t.type === 'page' && !initialIds.has(t.targetId) && t.url.includes(urlPattern));
    if (newTab) return newTab.targetId;
    await sleep(500);
  }
  throw new Error(`New tab not found: ${urlPattern}`);
}

// ============================================================================
// Element Interaction
// ============================================================================

/**
 * Click an element by selector
 */
export async function clickElement(session: ChromeSession, selector: string): Promise<void> {
  const posResult = await session.cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `
      (function() {
        const el = document.querySelector('${selector}');
        if (!el) return 'null';
        el.scrollIntoView({ block: 'center' });
        const rect = el.getBoundingClientRect();
        return JSON.stringify({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      })()
    `,
    returnByValue: true,
  }, { sessionId: session.sessionId });

  if (posResult.result.value === 'null') throw new Error(`Element not found: ${selector}`);
  const pos = JSON.parse(posResult.result.value);

  await session.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 }, { sessionId: session.sessionId });
  await sleep(50);
  await session.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 }, { sessionId: session.sessionId });
}

/**
 * Type text into an element
 */
export async function typeText(session: ChromeSession, selector: string, text: string, options?: { clear?: boolean; delayMs?: number }): Promise<void> {
  const { clear = true, delayMs = 30 } = options ?? {};

  if (clear) {
    // Clear existing value
    await session.cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('${selector}').value = ''`,
    }, { sessionId: session.sessionId });
  }

  // Type new text
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.length > 0) {
      await session.cdp.send('Input.insertText', { text: lines[i] }, { sessionId: session.sessionId });
    }
    if (i < lines.length - 1) {
      await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { sessionId: session.sessionId });
      await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { sessionId: session.sessionId });
    }
    await sleep(delayMs);
  }
}

/**
 * Paste from clipboard
 */
export async function pasteFromClipboard(session: ChromeSession): Promise<void> {
  const modifiers = process.platform === 'darwin' ? 4 : 2;
  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'v', code: 'KeyV', modifiers, windowsVirtualKeyCode: 86 }, { sessionId: session.sessionId });
  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'v', code: 'KeyV', modifiers, windowsVirtualKeyCode: 86 }, { sessionId: session.sessionId });
}

/**
 * Wait for an element to appear
 */
export async function waitForElement(session: ChromeSession, selector: string, timeoutMs = 10_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await session.cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
      expression: `!!document.querySelector('${selector}')`,
      returnByValue: true,
    }, { sessionId: session.sessionId });

    if (result.result.value) return;

    await sleep(100);
  }
  throw new Error(`Element not found after ${timeoutMs}ms: ${selector}`);
}

/**
 * Get element text content
 */
export async function getElementText(session: ChromeSession, selector: string): Promise<string> {
  const result = await session.cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `document.querySelector('${selector}')?.textContent || ''`,
    returnByValue: true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

/**
 * Check if element exists
 */
export async function elementExists(session: ChromeSession, selector: string): Promise<boolean> {
  const result = await session.cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
    expression: `!!document.querySelector('${selector}')`,
    returnByValue: true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

// ============================================================================
// Navigation & Page State
// ============================================================================

/**
 * Navigate to a URL
 */
export async function navigate(session: ChromeSession, url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeoutMs?: number }): Promise<void> {
  await session.cdp.send('Page.navigate', { url }, { sessionId: session.sessionId });

  // Wait for page load
  const waitUntil = options?.waitUntil ?? 'load';
  const timeoutMs = options?.timeoutMs ?? 30_000;

  await sleep(1000); // Initial wait

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await session.cdp.send<{ result: { value: { loaderId?: string; status?: string } } }>('Page.getFrameTree', {}, { sessionId: session.sessionId });

      const status = result.result.value?.loaderId ? 'ready' : result.result.value?.status;

      if (waitUntil === 'load' && status === 'ready') return;
      if (waitUntil === 'domcontentloaded' && status === 'ready') return;

      await sleep(500);
    } catch {
      // Page might still be loading, continue waiting
      await sleep(500);
    }
  }
}

/**
 * Get current page URL
 */
export async function getCurrentUrl(session: ChromeSession): Promise<string> {
  const result = await session.cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `window.location.href`,
    returnByValue: true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

/**
 * Get page title
 */
export async function getPageTitle(session: ChromeSession): Promise<string> {
  const result = await session.cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `document.title`,
    returnByValue: true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

// ============================================================================
// Screenshots
// ============================================================================

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 0-100 for jpeg/webp
  clip?: { x: number; y: number; width: number; height: number; scale: number };
  fullPage?: boolean;
}

/**
 * Capture a screenshot
 */
export async function screenshot(session: ChromeSession, options: ScreenshotOptions = {}): Promise<Buffer> {
  const {
    format = 'png',
    quality = 95,
    clip,
    fullPage = false,
  } = options;

  if (fullPage) {
    // Get page dimensions
    const metrics = await session.cdp.send<{ result: { value: { contentSize: number } } }>('Page.getLayoutMetrics', {}, { sessionId: session.sessionId });
    const contentSize = metrics.result.value.contentSize;

    // Capture full page
    const { data } = await session.cdp.send<{ data: string }>('Page.captureScreenshot', {
      format,
      quality,
      clip: {
        x: 0,
        y: 0,
        width: Math.ceil(contentSize),
        height: Math.ceil(contentSize),
        scale: 1,
      },
    }, { sessionId: session.sessionId });

    return Buffer.from(data, 'base64');
  }

  const { data } = await session.cdp.send<{ data: string }>('Page.captureScreenshot', {
    format,
    quality,
    ...(clip ? { clip } : {}),
  }, { sessionId: session.sessionId });

  return Buffer.from(data, 'base64');
}

// ============================================================================
// Evaluation
// ============================================================================

/**
 * Evaluate JavaScript in the page context
 */
export async function evaluate<T = unknown>(session: ChromeSession, expression: string, options?: { returnByValue?: boolean; awaitPromise?: boolean }): Promise<T> {
  const result = await session.cdp.send<{ result: { value: T } }>('Runtime.evaluate', {
    expression,
    returnByValue: options?.returnByValue ?? true,
    awaitPromise: options?.awaitPromise ?? false,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

/**
 * Execute a JavaScript function in the page context
 */
export async function evaluateFunction<T = unknown>(
  session: ChromeSession,
  func: () => T,
  options?: { returnByValue?: boolean }
): Promise<T> {
  const funcStr = func.toString();
  const result = await session.cdp.send<{ result: { value: T } }>('Runtime.evaluate', {
    expression: `(${funcStr})()`,
    returnByValue: options?.returnByValue ?? true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}

// ============================================================================
// Input Simulation
// ============================================================================

/**
 * Press a keyboard key
 */
export async function pressKey(session: ChromeSession, key: string, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }): Promise<void> {
  const modifiersValue = (modifiers?.ctrl ? 2 : 0) | (modifiers?.shift ? 1 : 0) | (modifiers?.alt ? 4 : 0) | (modifiers?.meta ? 8 : 0);

  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key, modifiers: modifiersValue }, { sessionId: session.sessionId });
  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, modifiers: modifiersValue }, { sessionId: session.sessionId });
}

/**
 * Send a sequence of key presses
 */
export async function sendText(session: ChromeSession, text: string): Promise<void> {
  await session.cdp.send('Input.insertText', { text }, { sessionId: session.sessionId });
}

/**
 * Scroll the page
 */
export async function scroll(session: ChromeSession, options?: { x?: number; y?: number; pixels?: number }): Promise<void> {
  if (options?.pixels !== undefined) {
    await session.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 0,
      y: 0,
      deltaX: 0,
      deltaY: options.pixels,
    }, { sessionId: session.sessionId });
  } else {
    const { x = 0, y = 0 } = options ?? {};
    await session.cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x,
      y,
      deltaX: 0,
      deltaY: 100,
    }, { sessionId: session.sessionId });
  }
}

// ============================================================================
// Retry Helper
// ============================================================================

export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
    verbose?: boolean;
  } = {}
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
          console.log(`[cdp:retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        }
        await sleep(delay);
        delay *= backoffMultiplier;
      } else {
        if (verbose && attempt === maxAttempts) {
          console.log(`[cdp:retry] All ${maxAttempts} attempts failed`);
        }
        break;
      }
    }
  }

  throw lastError;
}
