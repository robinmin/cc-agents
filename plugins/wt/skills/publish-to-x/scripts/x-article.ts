import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { convertTablesAndCodeBlocks } from '../../../scripts/web-automation/dist/table-code-converter.js';
import { parseMarkdown } from './md-to-html.js';
import {
  CHROME_CANDIDATES_BASIC,
  CdpConnection,
  findChromeExecutable,
  waitForChromeDebugPort,
} from '../../../scripts/web-automation/dist/browser.js';
import {
  getFreePort,
  pwSleep as sleep,
} from '../../../scripts/web-automation/dist/playwright.js';
import {
  copyHtmlToClipboard,
  copyImageToClipboard,
  getDefaultProfileDir,
  getAutoSubmitPreference,
  pasteFromClipboard,
} from './x-utils.js';

const X_ARTICLES_URL = 'https://x.com/compose/articles';

const I18N_SELECTORS = {
  // Write button (to start a new article)
  writeButton: [
    '[data-testid="empty_state_button_text"]',  // Original
    '[data-testid="btn"]',
    'div[role="button"]:has-text("Write")',
    'div[role="button"][data-testid="btn"]',
    'button:has-text("Write")',
    '[aria-label*="Write" i]',
    // XPath selectors for editor open button
    'xpath://*[@id="react-root"]/div/div/div[2]/main/div/div/div/section[1]/div/div/div[1]/div/div/div/div/div[2]/button/div/svg',
    'xpath://*[@id="react-root"]/div/div/div[2]/main/div/div/div/section[2]/div/div/a',
  ],
  titleInput: [
    'textarea[placeholder="Add a title"]',
    'textarea[placeholder="添加标题"]',
    'textarea[placeholder="タイトルを追加"]',
    'textarea[placeholder="제목 추가"]',
    'textarea[name="Article Title"]',
    'div[contenteditable="true"] div[contenteditable="true"]',  // Nested editor
    '.DraftEditor-editorContainer [contenteditable="true"]',
    // X Articles specific selectors
    '[data-testid="twitter-article-title"]',
    '[data-testid="tweetTextarea"]',  // Some X versions use this
    // Additional fallbacks
    'div[role="textbox"]',
    'input[placeholder*="title" i]',
  ],
  addPhotosButton: [
    '[aria-label="Add photos or video"]',
    '[aria-label="添加照片或视频"]',
    '[aria-label="写真や動画を追加"]',
    '[aria-label="사진 또는 동영상 추가"]',
    '[data-testid="fileInput"]',
    'input[type="file"]',
  ],
  previewButton: [
    'a[href*="/preview"]',
    '[data-testid="previewButton"]',
    'button[aria-label*="preview" i]',
    'button[aria-label*="预览" i]',
    'button[aria-label*="プレビュー" i]',
    'button[aria-label*="미리보기" i]',
    // Additional fallbacks
    'div[role="button"]:has-text("Preview")',
    'div[role="button"]:has-text("预览")',
  ],
  publishButton: [
    '[data-testid="publishButton"]',
    'button[aria-label*="publish" i]',
    'button[aria-label*="发布" i]',
    'button[aria-label*="公開" i]',
    'button[aria-label*="게시" i]',
    // Additional fallbacks
    'div[role="button"]:has-text("Publish")',
    'div[role="button"]:has-text("发布")',
  ],
  saveButton: [
    '[data-testid="saveButton"]',
    'button[aria-label*="Save" i]',
  ],
  editorBody: [
    '.DraftEditor-editorContainer [contenteditable="true"]',
    '.DraftEditor-editorContainer [data-contents="true"]',
    '[contenteditable="true"][data-text="true"]',
    'div[role="textbox"]',
  ],
};

/**
 * Retry helper for transient operations
 */
async function retry<T>(
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
          console.log(`[retry] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`);
        }
        await sleep(delay);
        delay *= backoffMultiplier;
      } else {
        if (verbose && attempt === maxAttempts) {
          console.log(`[retry] All ${maxAttempts} attempts failed`);
        }
        break;
      }
    }
  }

  throw lastError;
}

/**
 * Verify page state with detailed logging
 */
async function verifyPageState(cdp: CdpConnection, sessionId: string, verbose = false): Promise<{
  url: string;
  isLoaded: boolean;
  hasEditor: boolean;
  hasWriteButton: boolean;
  isPreviewPage: boolean;
  isEditPage: boolean;
  title: string;
}> {
  const result = await cdp.send<{ result: { value: any } }>('Runtime.evaluate', {
    expression: `(() => {
      const url = window.location.href;
      const bodyText = document.body?.innerText?.trim().substring(0, 500) || '';
      const hasEditor = !!document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
      const hasWriteButton = !!document.querySelector('[data-testid="empty_state_button_text"]');
      const isPreviewPage = url.includes('/preview');
      const isEditPage = url.includes('/articles/edit/');

      return {
        url,
        bodyText: bodyText.substring(0, 100),
        hasEditor,
        hasWriteButton,
        isPreviewPage,
        isEditPage,
        title: document.title || 'No title',
      };
    })()`,
    returnByValue: true,
  }, { sessionId: sessionId! });

  const state = result.result.value;
  return {
    url: state.url,
    isLoaded: state.bodyText.length > 10 || state.isEditPage,
    hasEditor: state.hasEditor,
    hasWriteButton: state.hasWriteButton,
    isPreviewPage: state.isPreviewPage,
    isEditPage: state.isEditPage,
    title: state.title,
  };
}

interface ArticleOptions {
  markdownPath: string;
  coverImage?: string;
  title?: string;
  submit?: boolean;
  profileDir?: string;
  chromePath?: string;
  useExisting?: boolean;  // Connect to existing Chrome instead of launching new
  debugPort?: number;     // Custom debug port (default: try to find or use 9222)
  retryAttempts?: number; // Number of retry attempts for transient failures (default: 3)
  verbose?: boolean;      // Enable verbose logging for debugging
  // Table and code block conversion options
  convertTables?: boolean;     // Convert tables to images (default: false)
  formatCodeBlocks?: boolean;  // Format code blocks for X (default: false)
}

export async function publishArticle(options: ArticleOptions): Promise<void> {
  const {
    markdownPath,
    submit = false,
    profileDir = getDefaultProfileDir(),
    retryAttempts = 3,
    verbose = false,
    convertTables = false,
    formatCodeBlocks = false,
  } = options;

  if (verbose) {
    console.log('[x-article] Verbose logging enabled');
  }

  // Preprocess markdown: convert tables and code blocks
  let markdownToParse = markdownPath;
  const tempDir = path.join(os.tmpdir(), 'x-article-images');
  await mkdir(tempDir, { recursive: true });

  // Check if markdown contains tables or code blocks
  const markdownContent = fs.readFileSync(markdownPath, 'utf-8');
  const hasTables = /^\|.+?\|.*$/m.test(markdownContent);
  const hasCodeBlocks = /```[\s\S]*?```/.test(markdownContent);

  if (verbose) {
    console.log(`[x-article] Content analysis: tables=${hasTables}, code blocks=${hasCodeBlocks}`);
  }

  // Preprocess if needed (without CDP - uses text-based table representation)
  if ((convertTables && hasTables) || (formatCodeBlocks && hasCodeBlocks)) {
    console.log('[x-article] Preprocessing markdown (tables/code blocks)...');
    const converted = await convertTablesAndCodeBlocks(markdownContent, {
      outputDir: tempDir,
      renderTables: false, // Use text-based tables for now (CDP rendering requires connection)
      formatCodeBlocks,
      verbose,
    });

    // Write converted markdown to temp file
    markdownToParse = path.join(tempDir, 'converted.md');
    fs.writeFileSync(markdownToParse, converted.markdown, 'utf-8');

    console.log(`[x-article] Preprocessed: ${converted.tables.length} tables, ${converted.codeBlocks.length} code blocks`);
  }

  console.log('[x-article] Parsing markdown...');
  const parsed = await parseMarkdown(markdownToParse, {
    title: options.title,
    coverImage: options.coverImage,
  });

  console.log(`[x-article] Title: ${parsed.title}`);
  console.log(`[x-article] Cover: ${parsed.coverImage ?? 'none'}`);
  console.log(`[x-article] Content images: ${parsed.contentImages.length}`);

  // Save HTML to temp file
  const htmlPath = path.join(os.tmpdir(), 'x-article-content.html');
  await writeFile(htmlPath, parsed.html, 'utf-8');
  console.log(`[x-article] HTML saved to: ${htmlPath}`);

  const chromePath = options.chromePath ?? findChromeExecutable(CHROME_CANDIDATES_BASIC);
  if (!chromePath) throw new Error('Chrome not found');

  let port = options.debugPort;
  let chrome: ReturnType<typeof spawn> | null = null;
  let weLaunchedChrome = false; // Track if we launched Chrome (for cleanup)

  // Enhanced connection logic with retry
  const connectWithRetry = async (): Promise<{ port: number; sessionId: string; cdp: CdpConnection }> => {
    const maxRetries = retryAttempts;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (options.useExisting) {
          // Try to connect to existing Chrome instance
          console.log('[x-article] Looking for existing Chrome with remote debugging...');

          // Try common debug ports
          const commonPorts = port ? [port] : [9222, 9223, 9224, 9225];
          let connected = false;

          for (const tryPort of commonPorts) {
            console.log(`[x-article] Trying port ${tryPort}...`);
            try {
              // Quick test if port is listening (increased timeout for slower connections)
              const response = await fetch(`http://localhost:${tryPort}/json/version`, {
                signal: AbortSignal.timeout(5000),
              });

              const data = await response.json();
              if (data.webSocketDebuggerUrl) {
                port = tryPort;
                connected = true;
                console.log(`[x-article] Found existing Chrome on port ${port}`);
                break;
              }
            } catch {
              // Port not available, try next
            }
          }

          if (!connected || port === undefined) {
            throw new Error('No existing Chrome with debugging found');
          }
        } else {
          // Launch new Chrome instance
          await mkdir(profileDir, { recursive: true });
          port = port ?? await getFreePort();
          weLaunchedChrome = true;

          console.log(`[x-article] Launching Chrome on port ${port}...`);
          chrome = spawn(chromePath, [
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${profileDir}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-blink-features=AutomationControlled',
            '--start-maximized',
            X_ARTICLES_URL,
          ], { stdio: 'ignore' });
        }

        // At this point, port must be defined
        if (port === undefined) {
          throw new Error('Failed to determine Chrome debug port');
        }

        if (verbose) console.log(`[x-article] Connecting to Chrome on port ${port}...`);
        const wsUrl = await waitForChromeDebugPort(port, 30_000);
        const cdpConn = await CdpConnection.connect(wsUrl, 30_000, { defaultTimeoutMs: 30_000 });

        // Get page target with retry
        const targets = await cdpConn.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets');
        let pageTarget = targets.targetInfos.find((t) => t.type === 'page' && t.url.includes('x.com'));

        if (!pageTarget) {
          const { targetId } = await cdpConn.send<{ targetId: string }>('Target.createTarget', { url: X_ARTICLES_URL });
          pageTarget = { targetId, url: X_ARTICLES_URL, type: 'page' };
        }

        const { sessionId: sessId } = await cdpConn.send<{ sessionId: string }>('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });

        await cdpConn.send('Page.enable', {}, { sessionId: sessId });
        await cdpConn.send('Runtime.enable', {}, { sessionId: sessId });
        await cdpConn.send('DOM.enable', {}, { sessionId: sessId });

        if (verbose) console.log(`[x-article] Connected successfully. Session ID: ${sessId}`);

        return { port, sessionId: sessId, cdp: cdpConn };
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(1.5, attempt - 1);
          console.log(`[x-article] Connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
          await sleep(delay);
        } else {
          console.error(`[x-article] All ${maxRetries} connection attempts failed`);
          throw lastError;
        }
      }
    }

    throw lastError;
  };

  let cdp: CdpConnection | null = null;
  let sessionId: string | null = null;

  try {
    // Connect with retry logic
    const connection = await connectWithRetry();
    cdp = connection.cdp;
    sessionId = connection.sessionId;

    if (verbose) {
      const state = await verifyPageState(cdp, sessionId, true);
      console.log('[x-article] Initial page state:', state);
    }

    // Navigate to compose page if not already there
    const initialState = await verifyPageState(cdp, sessionId, false);
    const needsNavigation =
      initialState.url === 'about:blank' ||
      !initialState.url.includes('x.com/compose/articles') &&
      !initialState.url.includes('/articles/edit/');

    if (needsNavigation) {
      console.log(`[x-article] Navigating to ${X_ARTICLES_URL}...`);
      await cdp.send('Page.navigate', { url: X_ARTICLES_URL }, { sessionId: sessionId! });
      // Wait for navigation to complete
      await sleep(3000);
    }

    console.log('[x-article] Waiting for page to load (this may take 10-20 seconds)...');

    // Enhanced page load detection with retry
    const waitForPageLoad = async (maxWaitMs = 45_000): Promise<boolean> => {
      return retry(async () => {
        const start = Date.now();
        let lastBodyText = '';
        let noProgressCount = 0;
        const maxNoProgress = 10; // Stop if no progress for 5 seconds

        while (Date.now() - start < maxWaitMs) {
          const check = await cdp!.send<{ result: { value: { bodyText: string; url: string } } }>('Runtime.evaluate', {
            expression: `(() => {
              const bodyText = document.body?.innerText?.trim().substring(0, 500) || '';
              const url = window.location.href;
              return { bodyText, url };
            })()`,
            returnByValue: true,
          }, { sessionId: sessionId! });

          const info = check.result.value;
          const currentBodyText = info.bodyText;

          // Check for progress
          if (currentBodyText.length > lastBodyText.length) {
            lastBodyText = currentBodyText;
            noProgressCount = 0;
          } else {
            noProgressCount++;
          }

          // If we have actual body text (not just "no body text") or we're on an edit page
          if (info.bodyText && info.bodyText !== 'no body text' && info.bodyText.length > 10) {
            console.log(`[x-article] Page loaded! URL: ${info.url}`);
            console.log(`[x-article] Body text preview: ${info.bodyText.substring(0, 100)}...`);
            return true;
          }
          // If we're on an edit page, consider it loaded even if body text is minimal
          if (info.url.includes('/articles/edit/')) {
            console.log(`[x-article] On edit page: ${info.url}`);
            return true;
          }

          // Check for no progress condition
          if (noProgressCount > maxNoProgress) {
            if (verbose) {
              console.log(`[x-article] No progress for 5 seconds, current body text length: ${currentBodyText.length}`);
            }
            // If we're on a valid X URL with some content, consider it loaded
            if (info.url.includes('x.com') && currentBodyText.length > 5) {
              console.log(`[x-article] Page has minimal content but continuing...`);
              return true;
            }
            throw new Error('No page load progress detected');
          }

          await sleep(500);
        }

        throw new Error('Page load timeout');
      }, {
        maxAttempts: 1, // Retry happens inside the loop via no-progress detection
        delayMs: 1000,
        verbose,
      });
    };

    const pageLoaded = await waitForPageLoad();
    if (!pageLoaded) {
      // Try to get current state for better error reporting
      const state = await verifyPageState(cdp!, sessionId!, verbose);
      console.log('[x-article] Page did not load properly. Current state:', state);

      // Provide helpful suggestions based on state
      if (!state.isLoaded && !state.isEditPage) {
        console.log('[x-article] Suggestions:');
        console.log('  1. Ensure you are logged in to X');
        console.log('  2. Check network connection');
        console.log('  3. Try navigating manually to: ' + X_ARTICLES_URL);
        console.log('[x-article] Keeping browser open for 30 seconds for manual check...');
        await sleep(30_000);
      }
      throw new Error('Page did not load');
    }

    // Check if we're on a preview page - navigate back to edit mode
    const urlCheck = await cdp!.send<{ result: { value: string } }>('Runtime.evaluate', {
      expression: `window.location.href`,
      returnByValue: true,
    }, { sessionId: sessionId! });

    const currentUrl = urlCheck.result.value;
    if (currentUrl.includes('/preview')) {
      console.log('[x-article] On preview page, navigating back to edit mode...');
      await cdp!.send('Page.navigate', { url: currentUrl.replace('/preview', '') }, { sessionId: sessionId! });
      await sleep(3000);
    }

    // Check if we're on an edit page without editor - navigate back to compose page
    if (currentUrl.includes('/articles/edit/')) {
      // Check if editor exists on this page
      const editorCheck = await cdp!.send<{ result: { value: { hasEditor: boolean; hasWriteButton: boolean } } }>('Runtime.evaluate', {
        expression: `(() => {
          const hasEditor = !!document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
          const hasWriteButton = !!document.querySelector('[data-testid="empty_state_button_text"]');
          return { hasEditor, hasWriteButton };
        })()`,
        returnByValue: true,
      }, { sessionId: sessionId! });

      const { hasEditor, hasWriteButton } = editorCheck.result.value;
      if (!hasEditor && !hasWriteButton) {
        console.log('[x-article] On edit page without editor, navigating to compose page...');
        await cdp!.send('Page.navigate', { url: X_ARTICLES_URL }, { sessionId: sessionId! });
        await sleep(3000);
      }
    }

    // Debug: Dump all clickable elements to find the Write button
    console.log('[x-article] Scanning for clickable elements...');
    const elementScan = await cdp!.send<{ result: { value: string } }>('Runtime.evaluate', {
      expression: `(() => {
        const result = {
          buttons: [],
          divsWithRoleButton: [],
          links: [],
          dataTestIds: [],
        };

        // Get all buttons
        document.querySelectorAll('button').forEach((btn, i) => {
          if (i < 20) { // Limit output
            result.buttons.push({
              tag: 'BUTTON',
              text: btn.textContent?.trim().substring(0, 50),
              ariaLabel: btn.getAttribute('aria-label'),
              dataTestId: btn.getAttribute('data-testid'),
              class: btn.className,
            });
          }
        });

        // Get all divs with role="button"
        document.querySelectorAll('div[role="button"]').forEach((div, i) => {
          if (i < 20) {
            result.divsWithRoleButton.push({
              tag: 'DIV[role=button]',
              text: div.textContent?.trim().substring(0, 50),
              ariaLabel: div.getAttribute('aria-label'),
              dataTestId: div.getAttribute('data-testid'),
              class: div.className,
            });
          }
        });

        // Get all links
        document.querySelectorAll('a').forEach((a, i) => {
          if (i < 10) {
            result.links.push({
              tag: 'A',
              text: a.textContent?.trim().substring(0, 50),
              href: a.getAttribute('href'),
            });
          }
        });

        // Get all elements with data-testid containing "write" or "button"
        document.querySelectorAll('[data-testid]').forEach((el) => {
          const testId = el.getAttribute('data-testid')?.toLowerCase() || '';
          if (testId.includes('write') || testId.includes('button') || testId.includes('article')) {
            result.dataTestIds.push({
              tag: el.tagName,
              testId: el.getAttribute('data-testid'),
              text: el.textContent?.trim().substring(0, 50),
            });
          }
        });

        return JSON.stringify(result, null, 2);
      })()`,
      returnByValue: true,
    }, { sessionId: sessionId! });
    console.log('[x-article] Element scan results:');
    console.log(elementScan.result.value);

    // Wait for and click "create" button
    const waitForElement = async (selector: string, timeoutMs = 60_000): Promise<boolean> => {
      const start = Date.now();
      const isXPath = selector.startsWith('xpath:');
      const actualSelector = isXPath ? selector.substring(6) : selector;

      // Build appropriate check expression based on selector type
      const checkExpression = isXPath
        ? `!!document.evaluate('${actualSelector}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue`
        : `!!document.querySelector('${selector}')`;

      while (Date.now() - start < timeoutMs) {
        const result = await cdp!.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: checkExpression,
          returnByValue: true,
        }, { sessionId: sessionId! });
        if (result.result.value) return true;
        await sleep(500);
      }
      return false;
    };

    // Debug: Log current page URL and some info
    const pageInfo = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
      expression: `(() => {
        return {
          url: window.location.href,
          title: document.title,
          hasWriteButton: !!document.querySelector('[data-testid="empty_state_button_text"]'),
          hasTitleInput: !!document.querySelector('textarea[placeholder*="title" i]'),
          hasContentEditable: !!document.querySelector('[contenteditable="true"]'),
          bodyText: document.body?.innerText?.substring(0, 200) || 'no body text',
        };
      })()`,
      returnByValue: true,
    }, { sessionId: sessionId! });
    console.log('[x-article] Current page:', pageInfo.result.value);

    // Check if we're on the articles list page (has Write button)
    console.log('[x-article] Looking for Write button...');
    let writeButtonClicked = false;

    // Try each write button selector
    for (const selector of I18N_SELECTORS.writeButton) {
      const isXPath = selector.startsWith('xpath:');
      const actualSelector = isXPath ? selector.substring(6) : selector;

      if (await waitForElement(selector, 2000)) {
        console.log(`[x-article] Found Write button with selector: ${selector}`);

        // Use appropriate selection method based on selector type
        const clickExpression = isXPath
          ? `document.evaluate('${actualSelector}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.click()`
          : `document.querySelector('${selector}')?.click()`;

        await cdp.send('Runtime.evaluate', {
          expression: clickExpression,
        }, { sessionId: sessionId! });
        await sleep(2000);
        writeButtonClicked = true;
        break;
      }
    }

    if (!writeButtonClicked) {
      console.log('[x-article] No Write button found, might already be on editor page');
    }

    // Wait for editor (title textarea) - try each selector
    console.log('[x-article] Waiting for editor...');
    let editorFound = false;
    for (const selector of I18N_SELECTORS.titleInput) {
      if (await waitForElement(selector, 5000)) {
        console.log(`[x-article] Found editor with selector: ${selector}`);
        editorFound = true;
        break;
      }
    }

    // Fallback: try any contenteditable element
    if (!editorFound) {
      console.log('[x-article] Title input not found, trying contenteditable fallback...');
      const contentEditableFound = await waitForElement('[contenteditable="true"]', 10_000);
      if (contentEditableFound) {
        console.log('[x-article] Found contenteditable element, continuing...');
        editorFound = true;
      }
    }

    if (!editorFound) {
      console.log('[x-article] Editor not found. Please ensure you have X Premium and are logged in.');
      console.log('[x-article] Keeping browser open for 60 seconds for manual check...');
      await sleep(60_000);
      throw new Error('Editor not found');
    }

    // Upload cover image
    if (parsed.coverImage) {
      console.log('[x-article] Uploading cover image...');

      // Click "Add photos or video" button
      const addPhotosSelectors = JSON.stringify(I18N_SELECTORS.addPhotosButton);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${addPhotosSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.click(); return true; }
          }
          return false;
        })()`,
      }, { sessionId: sessionId! });
      await sleep(500);

      // Use file input directly
      const { root } = await cdp.send<{ root: { nodeId: number } }>('DOM.getDocument', {}, { sessionId: sessionId! });
      const { nodeId } = await cdp.send<{ nodeId: number }>('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: '[data-testid="fileInput"], input[type="file"][accept*="image"]',
      }, { sessionId: sessionId! });

      if (nodeId) {
        await cdp.send('DOM.setFileInputFiles', {
          nodeId,
          files: [parsed.coverImage],
        }, { sessionId: sessionId! });
        console.log('[x-article] Cover image file set');

        // Wait for Apply button to appear and click it
        console.log('[x-article] Waiting for Apply button...');
        const applyFound = await waitForElement('[data-testid="applyButton"]', 15_000);
        if (applyFound) {
          await cdp.send('Runtime.evaluate', {
            expression: `document.querySelector('[data-testid="applyButton"]')?.click()`,
          }, { sessionId: sessionId! });
          console.log('[x-article] Cover image applied');
          await sleep(1000);
        } else {
          console.log('[x-article] Apply button not found, continuing...');
        }
      }
    }

    // Fill title using keyboard input
    if (parsed.title) {
      console.log('[x-article] Filling title...');

      // Focus title input
      const titleInputSelectors = JSON.stringify(I18N_SELECTORS.titleInput);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${titleInputSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) { el.focus(); return true; }
          }
          return false;
        })()`,
      }, { sessionId: sessionId! });
      await sleep(200);

      // Type title character by character using insertText
      await cdp.send('Input.insertText', { text: parsed.title }, { sessionId: sessionId! });
      await sleep(300);

      // Tab out to trigger save
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, { sessionId: sessionId! });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }, { sessionId: sessionId! });
      await sleep(500);
    }

    // Insert HTML content
    console.log('[x-article] Inserting content...');

    // Read HTML content
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    // Focus on DraftEditor body
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const editor = document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
        if (editor) {
          editor.focus();
          editor.click();
          return true;
        }
        return false;
      })()`,
    }, { sessionId: sessionId! });
    await sleep(300);

    // Method 1: Simulate paste event with HTML data
    console.log('[x-article] Attempting to insert HTML via paste event...');
    await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
      expression: `(() => {
        const editor = document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
        if (!editor) return false;

        const html = ${JSON.stringify(htmlContent)};

        // Create a paste event with HTML data
        const dt = new DataTransfer();
        dt.setData('text/html', html);
        dt.setData('text/plain', html.replace(/<[^>]*>/g, ''));

        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });

        editor.dispatchEvent(pasteEvent);
        return true;
      })()`,
      returnByValue: true,
    }, { sessionId: sessionId! });

    await sleep(1000);

    // Check if content was inserted
    const contentCheck = await cdp.send<{ result: { value: number } }>('Runtime.evaluate', {
      expression: `document.querySelector('.DraftEditor-editorContainer [data-contents="true"]')?.innerText?.length || 0`,
      returnByValue: true,
    }, { sessionId: sessionId! });

    if (contentCheck.result.value > 50) {
      console.log(`[x-article] Content inserted successfully (${contentCheck.result.value} chars)`);
    } else {
      console.log('[x-article] Paste event may not have worked, trying insertHTML...');

      // Method 2: Use execCommand insertHTML
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const editor = document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
          if (!editor) return false;
          editor.focus();
          document.execCommand('insertHTML', false, ${JSON.stringify(htmlContent)});
          return true;
        })()`,
      }, { sessionId: sessionId! });

      await sleep(1000);

      // Check again
      const check2 = await cdp.send<{ result: { value: number } }>('Runtime.evaluate', {
        expression: `document.querySelector('.DraftEditor-editorContainer [data-contents="true"]')?.innerText?.length || 0`,
        returnByValue: true,
      }, { sessionId: sessionId! });

      if (check2.result.value > 50) {
        console.log(`[x-article] Content inserted via execCommand (${check2.result.value} chars)`);
      } else {
        console.log('[x-article] Auto-insert failed. HTML copied to clipboard - please paste manually (Cmd+V)');
        copyHtmlToClipboard(htmlPath);
        // Wait for manual paste
        console.log('[x-article] Waiting 30s for manual paste...');
        await sleep(30_000);
      }
    }

    // Insert content images (reverse order to maintain positions)
    if (parsed.contentImages.length > 0) {
      console.log('[x-article] Inserting content images...');

      // First, check what placeholders exist in the editor
      const editorContent = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
        expression: `document.querySelector('.DraftEditor-editorContainer [data-contents="true"]')?.innerText || ''`,
        returnByValue: true,
      }, { sessionId: sessionId! });

      console.log('[x-article] Checking for placeholders in content...');
      for (const img of parsed.contentImages) {
        if (editorContent.result.value.includes(img.placeholder)) {
          console.log(`[x-article] Found: ${img.placeholder}`);
        } else {
          console.log(`[x-article] NOT found: ${img.placeholder}`);
        }
      }

      // Process images in sequential order (1, 2, 3, ...)
      const sortedImages = [...parsed.contentImages].sort((a, b) => a.blockIndex - b.blockIndex);

      for (let i = 0; i < sortedImages.length; i++) {
        const img = sortedImages[i]!;
        console.log(`[x-article] [${i + 1}/${sortedImages.length}] Inserting image at placeholder: ${img.placeholder}`);

        // Helper to select placeholder with retry
        const selectPlaceholder = async (maxRetries = 3): Promise<boolean> => {
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            // Find, scroll to, and select the placeholder text in DraftEditor
            await cdp!.send('Runtime.evaluate', {
              expression: `(() => {
                const editor = document.querySelector('.DraftEditor-editorContainer [data-contents="true"]');
                if (!editor) return false;

                const placeholder = ${JSON.stringify(img.placeholder)};

                // Search through all text nodes in the editor
                const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null, false);
                let node;

                while ((node = walker.nextNode())) {
                  const text = node.textContent || '';
                  const idx = text.indexOf(placeholder);
                  if (idx !== -1) {
                    // Found the placeholder - scroll to it first
                    const parentElement = node.parentElement;
                    if (parentElement) {
                      parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    // Select it
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + placeholder.length);
                    const sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                    return true;
                  }
                }
                return false;
              })()`,
            }, { sessionId: sessionId! });

            // Wait for scroll and selection to settle
            await sleep(800);

            // Verify selection matches the placeholder
            const selectionCheck = await cdp!.send<{ result: { value: string } }>('Runtime.evaluate', {
              expression: `window.getSelection()?.toString() || ''`,
              returnByValue: true,
            }, { sessionId: sessionId! });

            const selectedText = selectionCheck.result.value.trim();
            if (selectedText === img.placeholder) {
              console.log(`[x-article] Selection verified: "${selectedText}"`);
              return true;
            }

            if (attempt < maxRetries) {
              console.log(`[x-article] Selection attempt ${attempt} got "${selectedText}", retrying...`);
              await sleep(500);
            } else {
              console.warn(`[x-article] Selection failed after ${maxRetries} attempts, got: "${selectedText}"`);
            }
          }
          return false;
        };

        // Try to select the placeholder
        const selected = await selectPlaceholder(3);
        if (!selected) {
          console.warn(`[x-article] Skipping image - could not select placeholder: ${img.placeholder}`);
          continue;
        }

        console.log(`[x-article] Copying image: ${path.basename(img.localPath)}`);

        // Copy image to clipboard
        if (!copyImageToClipboard(img.localPath)) {
          console.warn(`[x-article] Failed to copy image to clipboard`);
          continue;
        }

        // Wait for clipboard to be fully ready
        await sleep(1000);

        // Delete placeholder by pressing Backspace (more reliable than Enter for replacing selection)
        console.log(`[x-article] Deleting placeholder...`);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, { sessionId: sessionId! });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, { sessionId: sessionId! });

        // Wait and verify placeholder is deleted
        await sleep(500);

        // Check that placeholder is no longer in editor
        const afterDelete = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
          expression: `(() => {
            const editor = document.querySelector('.DraftEditor-editorContainer [data-contents="true"]');
            if (!editor) return true;
            return !editor.innerText.includes(${JSON.stringify(img.placeholder)});
          })()`,
          returnByValue: true,
        }, { sessionId: sessionId! });

        if (!afterDelete.result.value) {
          console.warn(`[x-article] Placeholder may not have been deleted, trying again...`);
          // Try selecting and deleting again
          await selectPlaceholder(1);
          await sleep(300);
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, { sessionId: sessionId! });
          await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 }, { sessionId: sessionId! });
          await sleep(500);
        }

        // Focus editor to ensure cursor is in position
        await cdp.send('Runtime.evaluate', {
          expression: `(() => {
            const editor = document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
            if (editor) editor.focus();
          })()`,
        }, { sessionId: sessionId! });
        await sleep(300);

        // Paste image using paste script (activates Chrome, sends real keystroke)
        console.log(`[x-article] Pasting image...`);
        if (pasteFromClipboard('Google Chrome', 5, 1000)) {
          console.log(`[x-article] Image pasted: ${path.basename(img.localPath)}`);
        } else {
          console.warn(`[x-article] Failed to paste image after retries`);
        }

        // Wait for image to upload
        console.log(`[x-article] Waiting for upload...`);
        await sleep(5000);
      }

      console.log('[x-article] All images processed.');
    }

    // Before preview: blur editor to trigger save
    console.log('[x-article] Triggering content save...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        // Blur editor to trigger any pending saves
        const editor = document.querySelector('.DraftEditor-editorContainer [contenteditable="true"]');
        if (editor) {
          editor.blur();
        }
        // Also click elsewhere to ensure focus is lost
        document.body.click();
      })()`,
    }, { sessionId: sessionId! });
    await sleep(1500);

    // Click Preview button
    console.log('[x-article] Opening preview...');
    const previewSelectors = JSON.stringify(I18N_SELECTORS.previewButton);
    const previewClicked = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
      expression: `(() => {
        const selectors = ${previewSelectors};
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) { el.click(); return true; }
        }
        return false;
      })()`,
      returnByValue: true,
    }, { sessionId: sessionId! });

    if (previewClicked.result.value) {
      console.log('[x-article] Preview opened');
      await sleep(3000);
    } else {
      console.log('[x-article] Preview button not found');
    }

    // Check for publish button
    if (submit) {
      console.log('[x-article] Publishing...');
      const publishSelectors = JSON.stringify(I18N_SELECTORS.publishButton);
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const selectors = ${publishSelectors};
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && !el.disabled) { el.click(); return true; }
          }
          return false;
        })()`,
      }, { sessionId: sessionId! });
      await sleep(3000);
      console.log('[x-article] Article published!');
    } else {
      console.log('[x-article] Article composed (draft mode).');
      console.log('[x-article] Browser remains open for manual review.');
    }

  } finally {
    // Clean up temp HTML file
    try {
      if (fs.existsSync(htmlPath)) {
        fs.unlinkSync(htmlPath);
        console.log('[x-article] Cleaned up temp file:', htmlPath);
      }
    } catch (error) {
      console.debug('[x-article] Failed to clean up temp file:', error);
    }

    // Disconnect CDP but keep browser open
    if (cdp) {
      cdp.close();
    }
    // Don't kill Chrome - let user review and close manually
  }
}

function printUsage(): never {
  console.log(`Publish Markdown article to X (Twitter) Articles

Usage:
  npx -y bun x-article.ts <markdown_file> [options]

Options:
  --title <title>        Override title
  --cover <image>        Override cover image
  --submit               Actually publish (overrides config)
  --no-submit            Draft only (overrides config)
  --profile <dir>        Chrome profile directory
  --use-existing         Connect to existing Chrome (must have --remote-debugging-port)
  --debug-port <port>    Chrome debug port (default: auto-detect or 9222)
  --retry-attempts <n>   Number of retry attempts for transient failures (default: 3)
  --convert-tables       Convert markdown tables to X-friendly format (default: true)
  --no-tables            Skip table conversion
  --format-code          Format code blocks for X Articles (default: true)
  --no-code              Skip code block formatting
  --verbose              Enable verbose logging for debugging
  --help                 Show this help

Table & Code Block Conversion:
  X Articles doesn't natively support markdown tables or code blocks.
  This tool automatically converts:
  - Tables → ASCII art tables or images (future)
  - Code blocks → Bordered text blocks with language indicators

To use existing Chrome:
  1. Start Chrome with: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
  2. Login to X and navigate to https://x.com/compose/articles
  3. Run: npx -y bun x-article.ts article.md --use-existing

Markdown frontmatter:
  ---
  title: My Article Title
  cover_image: /path/to/cover.jpg
  ---

Example:
  npx -y bun x-article.ts article.md
  npx -y bun x-article.ts article.md --cover ./hero.png
  npx -y bun x-article.ts article.md --submit
  npx -y bun x-article.ts article.md --use-existing
  npx -y bun x-article.ts article.md --verbose
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
  }

  let markdownPath: string | undefined;
  let title: string | undefined;
  let coverImage: string | undefined;
  let submit = getAutoSubmitPreference(); // Default from config
  let profileDir: string | undefined;
  let useExisting = false;
  let debugPort: number | undefined;
  let retryAttempts = 3;
  let convertTables = false;
  let formatCodeBlocks = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--title' && args[i + 1]) {
      title = args[++i];
    } else if (arg === '--cover' && args[i + 1]) {
      coverImage = args[++i];
    } else if (arg === '--submit') {
      submit = true; // Explicit flag overrides config
    } else if (arg === '--no-submit') {
      submit = false; // Allow override to disable auto-submit
    } else if (arg === '--profile' && args[i + 1]) {
      profileDir = args[++i];
    } else if (arg === '--use-existing') {
      useExisting = true;
    } else if (arg === '--debug-port' && args[i + 1]) {
      debugPort = parseInt(args[++i]!, 10);
    } else if (arg.startsWith('--debug-port=')) {
      // Handle --debug-port=54042 format
      const portStr = arg.split('=')[1];
      if (portStr) {
        debugPort = parseInt(portStr, 10);
      }
    } else if (arg === '--retry-attempts' && args[i + 1]) {
      retryAttempts = parseInt(args[++i]!, 10);
    } else if (arg === '--convert-tables') {
      convertTables = true;
    } else if (arg === '--no-tables') {
      convertTables = false;
    } else if (arg === '--format-code') {
      formatCodeBlocks = true;
    } else if (arg === '--no-code') {
      formatCodeBlocks = false;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (!arg.startsWith('-')) {
      markdownPath = arg;
    }
  }

  if (!markdownPath) {
    console.error('Error: Markdown file path required');
    process.exit(1);
  }

  if (!fs.existsSync(markdownPath)) {
    console.error(`Error: File not found: ${markdownPath}`);
    process.exit(1);
  }

  await publishArticle({
    markdownPath,
    title,
    coverImage,
    submit,
    profileDir,
    useExisting,
    debugPort,
    retryAttempts,
    convertTables,
    formatCodeBlocks,
    verbose,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
