import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

// ============================================================================
// WT Configuration
// ============================================================================

interface WtConfig {
  version?: string;
  'publish-to-x'?: {
    profile_dir?: string;
    auto_submit?: boolean;
  };
}

let wtConfigCache: WtConfig | null = null;
let wtConfigCacheTime = 0;
const CONFIG_CACHE_TTL_MS = 60_000; // Cache expires after 1 minute

/**
 * Read WT plugin configuration from ~/.claude/wt/config.jsonc
 * Uses caching with TTL to avoid repeated file reads while allowing updates.
 */
export function readWtConfig(): WtConfig {
  const now = Date.now();

  // Return cached config if still valid
  if (wtConfigCache && (now - wtConfigCacheTime) < CONFIG_CACHE_TTL_MS) {
    return wtConfigCache;
  }

  const configPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    // Read and parse JSONC (allows comments)
    const content = fs.readFileSync(configPath, 'utf-8');

    // Strip comments for JSON parsing
    const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
    const parsed = JSON.parse(jsonContent) as WtConfig;

    wtConfigCache = parsed;
    wtConfigCacheTime = now;
    return parsed;
  } catch (error) {
    console.debug('[x-utils] Failed to read WT config, using defaults:', error);
    return {};
  }
}

/**
 * Expand tilde (~) in file paths to user's home directory
 */
function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

export type PlatformCandidates = {
  darwin?: string[];
  win32?: string[];
  default: string[];
};

export const CHROME_CANDIDATES_BASIC: PlatformCandidates = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
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

export function findChromeExecutable(candidates: PlatformCandidates): string | undefined {
  const override = process.env.X_BROWSER_CHROME_PATH?.trim();
  if (override && fs.existsSync(override)) return override;

  for (const candidate of getCandidatesForPlatform(candidates)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function getDefaultProfileDir(): string {
  // Try to read from WT config first
  const config = readWtConfig();
  const configProfileDir = config['publish-to-x']?.profile_dir;

  if (configProfileDir) {
    return expandTilde(configProfileDir);
  }

  // Fall back to default location
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'x-browser-profile');
}

/**
 * Get auto-submit preference from WT config
 * @returns true if auto-submit is enabled (posts immediately without preview)
 */
export function getAutoSubmitPreference(): boolean {
  const config = readWtConfig();
  return config['publish-to-x']?.auto_submit ?? false;
}

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
        console.debug('[x-utils] Message handler error:', error);
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
        : null;
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(message));
    });

    return result as T;
  }

  close(): void {
    try { this.ws.close(); } catch (error) {
      console.debug('[x-utils] WebSocket close error:', error);
    }
  }
}

export function getScriptDir(): string {
  return path.dirname(new URL(import.meta.url).pathname);
}

function runBunScript(scriptPath: string, args: string[]): boolean {
  const result = spawnSync('npx', ['-y', 'bun', scriptPath, ...args], { stdio: 'inherit' });
  return result.status === 0;
}

export function copyImageToClipboard(imagePath: string): boolean {
  const copyScript = path.join(getScriptDir(), 'copy-to-clipboard.ts');
  return runBunScript(copyScript, ['image', imagePath]);
}

export function copyHtmlToClipboard(htmlPath: string): boolean {
  const copyScript = path.join(getScriptDir(), 'copy-to-clipboard.ts');
  return runBunScript(copyScript, ['html', '--file', htmlPath]);
}

export function pasteFromClipboard(targetApp?: string, retries = 3, delayMs = 500): boolean {
  const pasteScript = path.join(getScriptDir(), 'paste-from-clipboard.ts');
  const args = ['--retries', String(retries), '--delay', String(delayMs)];
  if (targetApp) args.push('--app', targetApp);
  return runBunScript(pasteScript, args);
}
