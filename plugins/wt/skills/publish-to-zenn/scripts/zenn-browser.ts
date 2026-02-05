import { mkdir } from 'node:fs/promises';
import * as process from 'node:process';
import { launchChrome, getPageSession, clickElement, evaluate, sleep, getDefaultProfileDir as cdpGetDefaultProfileDir } from './cdp.js';
import { type ChromeSession } from './cdp.js';
import {
  getWtProfileDir,
  ZENN_URLS,
  generateSlug,
  parseMarkdownFile,
  sanitizeForJavaScript,
  type ParsedArticle,
} from './zenn-utils.js';

// ============================================================================
// Zenn DOM Selectors
// ============================================================================

const ZENN_SELECTORS = {
  // Title input field
  titleInput: [
    'input[placeholder*="タイトル" i]',
    'input[placeholder*="title" i]',
    'input[type="text"][class*="title"]',
    'textarea[placeholder*="タイトル" i]',
    '[name="title"]',
    '.article-title-input',
    '.title-input',
  ],

  // Subtitle/summary input field (optional)
  subtitleInput: [
    'input[placeholder*="概要" i]',
    'input[placeholder*="summary" i]',
    'textarea[placeholder*="概要" i]',
    '[name="summary"]',
    '.summary-input',
  ],

  // Content editor (Zenn uses markdown editor)
  contentEditor: [
    '.CodeMirror',
    '.editor-content',
    '[contenteditable="true"][class*="editor"]',
    '[data-testid="editor"]',
    '.markdown-editor',
    '.article-editor',
  ],

  // Article type selector
  typeSelect: [
    'select[name="type"]',
    '.article-type-select',
    '[data-testid="article-type"]',
  ],

  // Topics/tags input field
  topicsInput: [
    'input[placeholder*="トピック" i]',
    'input[placeholder*="topics" i]',
    'input[placeholder*="tag" i]',
    '[data-testid="topics-input"]',
    '[name="topics"]',
    '.topics-input',
  ],

  // Publish button
  publishButton: [
    'button[type="submit"]',
    'button:contains("公開")',
    'button:contains("Publish")',
    '[data-testid="publish-button"]',
    '.publish-button',
    '.submit-button',
  ],

  // Draft/Save button
  draftButton: [
    'button:contains("下書き")',
    'button:contains("Draft")',
    'button:contains("保存")',
    '[data-testid="draft-button"]',
    '.draft-button',
    '.save-button',
  ],
} as const;

// ============================================================================
// DOM Helper Functions
// ============================================================================

/**
 * Find an element using multiple possible selectors
 */
async function findElement(session: ChromeSession, selectors: readonly string[], timeoutMs = 5000): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    for (const selector of selectors) {
      try {
        const result = await evaluate(
          session,
          `
          (function() {
            const el = document.querySelector('${selector}');
            if (el && el.offsetParent !== null) {
              return 'found';
            }
            return 'not-found';
          })()
          `
        );
        if (result === 'found') {
          return selector;
        }
      } catch {
        // Selector error, try next one
      }
    }
    await sleep(100);
  }

  throw new Error(`Element not found. Tried selectors: ${selectors.join(', ')}`);
}

/**
 * Wait for page to be fully loaded and editor to be ready
 */
async function waitForPageReady(session: ChromeSession, timeoutMs = 20000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const isReady = await evaluate(
      session,
      `
      (function() {
        return document.readyState === 'complete' &&
               (document.querySelector('.CodeMirror') !== null ||
                document.querySelector('[contenteditable="true"]') !== null ||
                document.querySelector('.editor-content') !== null);
      })()
      `
    );
    if (isReady) return;
    await sleep(200);
  }

  console.log('[zenn] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(session: ChromeSession): Promise<boolean> {
  const currentUrl = await evaluate<string>(session, 'window.location.href');
  console.log(`[zenn] Current URL: ${currentUrl}`);

  // Check if on login page
  if (currentUrl.includes('login')) {
    return false;
  }

  // Check for logged-in indicators
  const isLoggedIn = await evaluate(
    session,
    `
    (function() {
      return document.querySelector('.user-avatar') !== null ||
             document.querySelector('.logout-button') !== null ||
             document.querySelector('[class*="user"]') !== null;
    })()
    `
  );

  return isLoggedIn === true;
}

/**
 * Fill in the title field
 */
async function fillTitle(session: ChromeSession, title: string): Promise<void> {
  console.log('[zenn] Filling in title...');

  const selector = await findElement(session, ZENN_SELECTORS.titleInput);

  await evaluate(
    session,
    `
    (function() {
      const el = document.querySelector('${selector}');
      if (!el) throw new Error('Title input not found');

      // Clear existing content
      el.value = '';
      if (el.textContent) el.textContent = '';

      // Focus the element
      el.focus();

      // Set the value using proper escaping
      el.value = ${sanitizeForJavaScript(title)};

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);

      // Trigger change event
      const changeEvent = new Event('change', { bubbles: true });
      el.dispatchEvent(changeEvent);

      return 'success';
    })()
    `
  );

  await sleep(500);
}

/**
 * Fill in the content editor
 */
async function fillContent(session: ChromeSession, content: string): Promise<void> {
  console.log('[zenn] Filling in content...');

  const selector = await findElement(session, ZENN_SELECTORS.contentEditor);

  await evaluate(
    session,
    `
    (function() {
      const el = document.querySelector('${selector}');
      if (!el) throw new Error('Content editor not found');

      // Focus the editor
      el.focus();

      // Clear existing content
      el.innerHTML = '';
      el.textContent = '';

      // Insert content using direct text insertion
      const textContent = ${sanitizeForJavaScript(content)};

      // Try to use editor's API if available (CodeMirror)
      if (window.editor && window.editor.setValue) {
        window.editor.setValue(textContent);
      } else if (window.view && window.view.state) {
        // ProseMirror-style editor
        const view = window.view;
        const transaction = view.state.tr.insert(0, view.state.schema.text(textContent));
        view.dispatch(transaction);
      } else {
        // Fallback: insert text nodes
        el.textContent = textContent;
      }

      // Trigger input event
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);

      return 'success';
    })()
    `
  );

  await sleep(1000);
}

/**
 * Set article type
 */
async function setType(session: ChromeSession, type: 'tech' | 'idea'): Promise<void> {
  console.log(`[zenn] Setting article type: ${type}...`);

  try {
    const selector = await findElement(session, ZENN_SELECTORS.typeSelect, 2000);

    await evaluate(
      session,
      `
      (function() {
        const el = document.querySelector('${selector}');
        if (!el) return 'not-found';

        // Set the type value
        el.value = ${sanitizeForJavaScript(type)};

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        el.dispatchEvent(event);

        return 'success';
      })()
      `
    );

    await sleep(500);
  } catch {
    console.log('[zenn] Type selector not found (optional, skipping...)');
  }
}

/**
 * Add topics to the article
 */
async function addTopics(session: ChromeSession, topics: string[]): Promise<void> {
  if (topics.length === 0) {
    console.log('[zenn] No topics to add...');
    return;
  }

  console.log(`[zenn] Setting topics: ${topics.join(', ')}...`);

  try {
    const selector = await findElement(session, ZENN_SELECTORS.topicsInput, 2000);

    for (const topic of topics) {
      await evaluate(
        session,
        `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return 'not-found';

          // Focus the element
          el.focus();

          // Type the topic using proper escaping
          el.value = ${sanitizeForJavaScript(topic)};

          // Trigger input event
          const event = new Event('input', { bubbles: true });
          el.dispatchEvent(event);

          // Press Enter to add the topic
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
          });
          el.dispatchEvent(enterEvent);

          return 'success';
        })()
        `
      );

      await sleep(300);
    }

    await sleep(500);
  } catch {
    console.log('[zenn] Topics input not found (optional, skipping...)');
  }
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(session: ChromeSession, published: boolean): Promise<string> {
  const action = published ? 'Publishing' : 'Saving as draft';
  console.log(`[zenn] ${action}...`);

  const buttonSelectors = published ? ZENN_SELECTORS.publishButton : ZENN_SELECTORS.draftButton;

  try {
    const selector = await findElement(session, buttonSelectors, 3000);

    // Click the button
    await clickElement(session, selector);

    // Wait for navigation or completion
    await sleep(3000);

    // Get the current URL (should be the submitted article URL)
    const url = await evaluate<string>(session, 'window.location.href');

    return url as string;
  } catch (error) {
    // If button click failed, try keyboard shortcut
    console.log('[zenn] Button click failed, trying keyboard shortcut...');

    // Try Ctrl/Cmd + S to save/publish
    const modifiers = process.platform === 'darwin' ? 8 : 4;

    await evaluate(
      session,
      `
      (function() {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          code: 'KeyS',
          keyCode: 83,
          ctrlKey: ${modifiers === 4},
          metaKey: ${modifiers === 8},
          bubbles: true
        });
        document.dispatchEvent(event);
        return 'success';
      })()
      `
    );

    await sleep(3000);

    const url = await evaluate<string>(session, 'window.location.href');
    return url as string;
  }
}

// ============================================================================
// Main Publishing Workflow (Browser Method)
// ============================================================================

interface BrowserPublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  slug?: string;
  type?: 'tech' | 'idea';
  emoji?: string;
  topics?: string[];
  published?: boolean;
  profileDir?: string;
}

/**
 * Publish article to Zenn using browser automation
 */
export async function publishToZennBrowser(options: BrowserPublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[zenn] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      type: options.type,
      emoji: options.emoji,
      topics: options.topics,
      published: options.published,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.slug) article.slug = options.slug;
  if (options.type) article.type = options.type;
  if (options.emoji) article.emoji = options.emoji;
  if (options.topics) article.topics = options.topics;
  if (options.published !== undefined) article.published = options.published;

  // Generate slug if not provided
  if (!article.slug) {
    article.slug = generateSlug(article.title);
  }

  // Determine publish status
  const published = options.published ?? false;

  console.log(`[zenn] Title: ${article.title}`);
  console.log(`[zenn] Type: ${article.type}`);
  console.log(`[zenn] Topics: ${article.topics?.join(', ') || '(none)'}`);
  console.log(`[zenn] Slug: ${article.slug}`);
  console.log(`[zenn] Status: ${published ? 'published' : 'draft'}`);

  // Get profile directory
  const wtProfileDir = getWtProfileDir();
  const profileDir = options.profileDir ?? wtProfileDir ?? cdpGetDefaultProfileDir();
  await mkdir(profileDir, { recursive: true });

  // Navigate to Zenn article creation page
  const articleUrl = ZENN_URLS.articleCreate;
  console.log(`[zenn] Navigating to: ${articleUrl}`);

  // Launch Chrome
  console.log(`[zenn] Launching Chrome (profile: ${profileDir})`);
  const { cdp, chrome } = await launchChrome(articleUrl, profileDir);

  try {
    // Get page session
    const session = await getPageSession(cdp, 'zenn.dev');

    // Check login status
    console.log('[zenn] Checking login status...');
    const isLoggedIn = await checkLoginStatus(session);

    if (!isLoggedIn) {
      console.log('[zenn] Not logged in. Please log in to your Zenn account.');
      console.log('[zenn] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await sleep(3000);
        const nowLoggedIn = await checkLoginStatus(session);
        if (nowLoggedIn) {
          console.log('[zenn] Login detected! Continuing...');
          break;
        }
        console.log('[zenn] Still waiting for login...');
      }

      if (!isLoggedIn && Date.now() - start >= loginTimeoutMs) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[zenn] Already logged in.');
    }

    // Wait for page to be ready
    console.log('[zenn] Waiting for editor to load...');
    await waitForPageReady(session);

    // Fill in the article
    await fillTitle(session, article.title);

    await fillContent(session, article.content);

    if (article.type) {
      await setType(session, article.type);
    }

    if (article.topics && article.topics.length > 0) {
      await addTopics(session, article.topics);
    }

    // Submit or save as draft
    const resultUrl = await submitArticle(session, published);

    console.log('');
    console.log('[zenn] Article saved successfully!');
    console.log(`[zenn] URL: ${resultUrl}`);
    console.log(`[zenn] Status: ${published ? 'published' : 'draft'}`);

    return resultUrl;
  } finally {
    // Close CDP connection
    cdp.close();
    chrome.kill();
  }
}
