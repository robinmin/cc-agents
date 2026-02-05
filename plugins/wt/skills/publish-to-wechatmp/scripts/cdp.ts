import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import process from 'node:process';

// Re-export common utilities from wechat-utils
export {
  sleep,
  getFreePort,
  findChromeExecutable,
  getDefaultProfileDir,
  waitForChromeDebugPort,
  CdpConnection,
} from './wechat-utils.js';

// Import types for internal use
import type { CdpConnection as CdpConnectionClass } from './wechat-utils.js';

export interface ChromeSession {
  cdp: CdpConnectionClass;
  sessionId: string;
  targetId: string;
}

export async function launchChrome(url: string, profileDir?: string): Promise<{ cdp: CdpConnectionClass; chrome: ReturnType<typeof spawn> }> {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error('Chrome not found. Set WECHAT_BROWSER_CHROME_PATH env var.');

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

export async function getPageSession(cdp: CdpConnectionClass, urlPattern: string): Promise<ChromeSession> {
  const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
  let pageTarget = targets.targetInfos.find((t) => t.type === 'page' && t.url.includes(urlPattern));

  if (!pageTarget) throw new Error(`Page not found: ${urlPattern}`);

  const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

  await cdp.send('Page.enable', {}, { sessionId });
  await cdp.send('Runtime.enable', {}, { sessionId });
  await cdp.send('DOM.enable', {}, { sessionId });

  return { cdp, sessionId, targetId: pageTarget.targetId };
}

export async function waitForNewTab(cdp: CdpConnectionClass, initialIds: Set<string>, urlPattern: string, timeoutMs = 30_000): Promise<string> {
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
    if (lines[i].length > 0) {
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
