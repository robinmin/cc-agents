/**
 * Chrome DevTools Protocol (CDP) utilities for XHS browser automation
 *
 * This module provides CDP utilities for browser automation. While similar to
 * the utilities in publish-to-substack, publish-to-infoq, and publish-to-wechatmp,
 * this is a standalone implementation to avoid runtime path resolution issues.
 */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import * as net from 'node:net';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

// ============================================================================
// Shared Utilities
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

function getCandidatesForPlatform(candidates: PlatformCandidates): string[] {
  if (process.platform === 'darwin' && candidates.darwin?.length) return candidates.darwin;
  if (process.platform === 'win32' && candidates.win32?.length) return candidates.win32;
  return candidates.default;
}

export function findChromeExecutable(candidates: PlatformCandidates = CHROME_CANDIDATES_FULL): string | undefined {
  const override = process.env.XHS_BROWSER_CHROME_PATH?.trim();
  if (override && fs.existsSync(override)) return override;

  for (const candidate of getCandidatesForPlatform(candidates)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Get default profile directory for XHS browser
 */
export function getDefaultProfileDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'xhs-browser-profile');
}

async function fetchJson<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function waitForChromeDebugPort(
  port: number,
  timeoutMs: number,
  options?: { includeLastError?: boolean },
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

// ============================================================================
// CDP Connection Class
// ============================================================================

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

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
        // Silent error in message handler - may occur during shutdown
        console.debug('[cdp] Message handler error:', error);
      }
    });

    this.ws.addEventListener('close', () => {
      for (const [id, pending] of Array.from(this.pending.entries())) {
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
        : null;
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
// CDP Session Management
// ============================================================================

export interface ChromeSession {
  cdp: CdpConnection;
  sessionId: string;
  targetId: string;
}

export async function launchChrome(url: string, profileDir?: string): Promise<{ cdp: CdpConnection; chrome: ReturnType<typeof spawn> }> {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error('Chrome not found. Set XHS_BROWSER_CHROME_PATH env var.');

  const profile = profileDir ?? getDefaultProfileDir();
  await mkdir(profile, { recursive: true });

  const port = await getFreePort();
  console.log(`[cdp] Launching Chrome (profile: ${profile})`);

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-blink-features=AutomationControlled',
    '--start-maximized',
    url,
  ], { stdio: 'ignore' });

  const wsUrl = await waitForChromeDebugPort(port, 30_000);
  const cdp = await CdpConnection.connect(wsUrl, 30_000);

  return { cdp, chrome };
}

export async function getPageSession(cdp: CdpConnection, urlPattern: string): Promise<ChromeSession> {
  const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
  let pageTarget = targets.targetInfos.find((t) => t.type === 'page' && t.url.includes(urlPattern));

  if (!pageTarget) throw new Error(`Page not found: ${urlPattern}`);

  const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

  await cdp.send('Page.enable', {}, { sessionId });
  await cdp.send('Runtime.enable', {}, { sessionId });
  await cdp.send('DOM.enable', {}, { sessionId });

  return { cdp, sessionId, targetId: pageTarget.targetId };
}

export async function waitForNewTab(cdp: CdpConnection, initialIds: Set<string>, urlPattern: string, timeoutMs = 30_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
    const newTab = targets.targetInfos.find(t => t.type === 'page' && !initialIds.has(t.targetId) && t.url.includes(urlPattern));
    if (newTab) return newTab.targetId;
    await sleep(500);
  }
  throw new Error(`New tab not found: ${urlPattern}`);
}

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

export async function typeText(session: ChromeSession, text: string): Promise<void> {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.length > 0) {
      await session.cdp.send('Input.insertText', { text: lines[i] }, { sessionId: session.sessionId });
    }
    if (i < lines.length - 1) {
      await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { sessionId: session.sessionId });
      await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { sessionId: session.sessionId });
    }
    await sleep(30);
  }
}

export async function pasteFromClipboard(session: ChromeSession): Promise<void> {
  const modifiers = process.platform === 'darwin' ? 4 : 2;
  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'v', code: 'KeyV', modifiers, windowsVirtualKeyCode: 86 }, { sessionId: session.sessionId });
  await session.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'v', code: 'KeyV', modifiers, windowsVirtualKeyCode: 86 }, { sessionId: session.sessionId });
}

export async function evaluate<T = unknown>(session: ChromeSession, expression: string): Promise<T> {
  const result = await session.cdp.send<{ result: { value: T } }>('Runtime.evaluate', {
    expression,
    returnByValue: true,
  }, { sessionId: session.sessionId });
  return result.result.value;
}
