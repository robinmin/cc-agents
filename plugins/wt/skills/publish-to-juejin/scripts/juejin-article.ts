import { mkdir } from 'node:fs/promises';
import * as process from 'node:process';
import { launchChrome, getPageSession, clickElement, evaluate, sleep, getDefaultProfileDir as cdpGetDefaultProfileDir } from './cdp.js';
import { type ChromeSession } from './cdp.js';
import {
  getWtProfileDir,
  getAutoPublishPreference,
  getNewArticleUrl,
  parseMarkdownFile,
  sanitizeForJavaScript,
  normalizeCategory,
  type ParsedArticle,
} from './juejin-utils.js';

// ============================================================================
// Juejin DOM Selectors
// ============================================================================

const JUEJIN_SELECTORS = {
  // Title input field
  titleInput: [
    'input[placeholder*="请输入标题" i]',
    'input[placeholder*="title" i]',
    'input[type="text"][class*="title"]',
    'textarea[placeholder*="请输入标题" i]',
    'input[name="title"]',
    '.article-title-input',
    '.title-input',
  ],

  // Subtitle input field (optional)
  subtitleInput: [
    'input[placeholder*="摘要" i]',
    'input[placeholder*="subtitle" i]',
    'textarea[placeholder*="摘要" i]',
    'input[name="subtitle"]',
    '.summary-input',
  ],

  // Content editor (likely rich text or markdown editor)
  contentEditor: [
    '.CodeMirror',
    '.editor-content',
    '[contenteditable="true"][class*="editor"]',
    '[contenteditable="true"][class*="public-DraftEditor-content"]',
    '[data-testid="editor"]',
    '.markdown-editor',
    '.rich-text-editor',
  ],

  // Category selector
  categorySelect: [
    'select[name="category"]',
    '.category-select',
    '[data-testid="category-select"]',
    '.article-category',
    '.category-dropdown',
  ],

  // Tags input field
  tagsInput: [
    'input[placeholder*="标签" i]',
    'input[placeholder*="请输入标签" i]',
    'input[placeholder*="tag" i]',
    '[data-testid="tags-input"]',
    '[name="tags"]',
    '.tags-input',
  ],

  // Publish button
  publishButton: [
    'button[type="submit"]',
    'button:contains("发布")',
    'button:contains("确定")',
    '[data-testid="publish-button"]',
    '.publish-button',
    '.submit-button',
  ],

  // Draft button
  draftButton: [
    'button:contains("保存草稿")',
    'button:contains("存草稿")',
    'button:contains("保存")',
    '[data-testid="draft-button"]',
    '.draft-button',
    '.save-draft-button',
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
                document.querySelector('.editor-content') !== null ||
                document.querySelector('.markdown-editor') !== null);
      })()
      `
    );
    if (isReady) return;
    await sleep(200);
  }

  // If editor not found, still continue - page might be ready with different selectors
  console.log('[juejin] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(session: ChromeSession): Promise<boolean> {
  const currentUrl = await evaluate<string>(session, 'window.location.href');
  console.log(`[juejin] Current URL: ${currentUrl}`);

  // If URL is still homepage and we're supposed to be at editor, not logged in
  if (currentUrl === 'https://juejin.cn/' || currentUrl === 'https://juejin.cn') {
    return false;
  }

  // Check for logged-in indicators
  const isLoggedIn = await evaluate(
    session,
    `
    (function() {
      // Check for user avatar, logout button, or other logged-in indicators
      return document.querySelector('.user-avatar') !== null ||
             document.querySelector('.logout-button') !== null ||
             document.querySelector('[class*="user"]') !== null ||
             document.querySelector('.avatar') !== null;
    })()
    `
  );

  return isLoggedIn === true;
}

/**
 * Fill in the title field
 */
async function fillTitle(session: ChromeSession, title: string): Promise<void> {
  console.log('[juejin] Filling in title...');

  const selector = await findElement(session, JUEJIN_SELECTORS.titleInput);

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
 * Fill in the subtitle field (optional)
 */
async function fillSubtitle(session: ChromeSession, subtitle: string): Promise<void> {
  console.log('[juejin] Filling in subtitle...');

  const start = Date.now();
  const timeoutMs = 3000;

  while (Date.now() - start < timeoutMs) {
    try {
      const selector = await findElement(session, JUEJIN_SELECTORS.subtitleInput, 1000);

      await evaluate(
        session,
        `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return 'not-found';

          // Clear existing content
          el.value = '';
          if (el.textContent) el.textContent = '';

          // Focus the element
          el.focus();

          // Set the value using proper escaping
          el.value = ${sanitizeForJavaScript(subtitle)};

          // Trigger input event
          const event = new Event('input', { bubbles: true });
          el.dispatchEvent(event);

          return 'success';
        })()
        `
      );

      await sleep(500);
      return;
    } catch {
      await sleep(200);
    }
  }

  console.log('[juejin] Subtitle field not found (optional, skipping...)');
}

/**
 * Fill in the content editor
 */
async function fillContent(session: ChromeSession, content: string): Promise<void> {
  console.log('[juejin] Filling in content...');

  const selector = await findElement(session, JUEJIN_SELECTORS.contentEditor);

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

      // Try to use editor's API if available (CodeMirror or similar)
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
 * Set article category
 */
async function setCategory(session: ChromeSession, category?: string): Promise<void> {
  if (!category) {
    console.log('[juejin] No category specified (optional)...');
    return;
  }

  console.log(`[juejin] Setting category: ${category}...`);

  try {
    const selector = await findElement(session, JUEJIN_SELECTORS.categorySelect, 2000);

    await evaluate(
      session,
      `
      (function() {
        const el = document.querySelector('${selector}');
        if (!el) return 'not-found';

        // Set the category value
        el.value = ${sanitizeForJavaScript(category)};

        // Trigger change event
        const event = new Event('change', { bubbles: true });
        el.dispatchEvent(event);

        return 'success';
      })()
      `
    );

    await sleep(500);
  } catch {
    console.log('[juejin] Category selector not found (optional, skipping...)');
  }
}

/**
 * Add tags to the article
 */
async function addTags(session: ChromeSession, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[juejin] No tags to add...');
    return;
  }

  console.log(`[juejin] Setting tags: ${tags.join(', ')}...`);

  try {
    const selector = await findElement(session, JUEJIN_SELECTORS.tagsInput, 2000);

    for (const tag of tags) {
      await evaluate(
        session,
        `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return 'not-found';

          // Focus the element
          el.focus();

          // Type the tag using proper escaping
          el.value = ${sanitizeForJavaScript(tag)};

          // Trigger input event
          const event = new Event('input', { bubbles: true });
          el.dispatchEvent(event);

          // Press Enter to add the tag
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
    console.log('[juejin] Tags input not found (optional, skipping...)');
  }
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(session: ChromeSession, asDraft: boolean): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Publishing';
  console.log(`[juejin] ${action}...`);

  const buttonSelectors = asDraft ? JUEJIN_SELECTORS.draftButton : JUEJIN_SELECTORS.publishButton;

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
    console.log('[juejin] Button click failed, trying keyboard shortcut...');

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
// Main Publishing Workflow
// ============================================================================

interface PublishOptions {
  markdownFile?: string;
  title?: string;
  content?: string;
  subtitle?: string;
  category?: string;
  tags?: string[];
  asDraft?: boolean;
  profileDir?: string;
}

/**
 * Publish article to Juejin
 */
export async function publishToJuejin(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[juejin] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      subtitle: options.subtitle,
      category: options.category ? normalizeCategory(options.category) : undefined,
      tags: options.tags,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.subtitle) article.subtitle = options.subtitle;
  if (options.category) article.category = normalizeCategory(options.category);
  if (options.tags) article.tags = options.tags;

  // Determine publish status
  const autoPublish = getAutoPublishPreference();
  const asDraft = options.asDraft ?? !autoPublish;

  console.log(`[juejin] Title: ${article.title}`);
  console.log(`[juejin] Category: ${article.category || '(not set)'}`);
  console.log(`[juejin] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[juejin] Status: ${asDraft ? 'draft' : 'publish'}`);

  // Get profile directory (WT config takes precedence, then CLI option, then default)
  const wtProfileDir = getWtProfileDir();
  const profileDir = options.profileDir ?? wtProfileDir ?? cdpGetDefaultProfileDir();
  await mkdir(profileDir, { recursive: true });

  // Get new article URL
  const newArticleUrl = getNewArticleUrl();
  console.log(`[juejin] Navigating to: ${newArticleUrl}`);

  // Launch Chrome
  console.log(`[juejin] Launching Chrome (profile: ${profileDir})`);
  const { cdp, chrome } = await launchChrome(newArticleUrl, profileDir);

  try {
    // Get page session
    const session = await getPageSession(cdp, 'juejin.cn');

    // Check login status
    console.log('[juejin] Checking login status...');
    const isLoggedIn = await checkLoginStatus(session);

    if (!isLoggedIn) {
      console.log('[juejin] Not logged in. Please log in to your Juejin account.');
      console.log('[juejin] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await sleep(3000);
        const nowLoggedIn = await checkLoginStatus(session);
        if (nowLoggedIn) {
          console.log('[juejin] Login detected! Continuing...');
          break;
        }
        console.log('[juejin] Still waiting for login...');
      }

      if (!isLoggedIn && Date.now() - start >= loginTimeoutMs) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[juejin] Already logged in.');
    }

    // Wait for page to be ready
    console.log('[juejin] Waiting for editor to load...');
    await waitForPageReady(session);

    // Fill in the article
    await fillTitle(session, article.title);

    if (article.subtitle) {
      await fillSubtitle(session, article.subtitle);
    }

    await fillContent(session, article.content);

    if (article.category) {
      await setCategory(session, article.category);
    }

    if (article.tags && article.tags.length > 0) {
      await addTags(session, article.tags);
    }

    // Submit or save as draft
    const articleUrl = await submitArticle(session, asDraft);

    console.log('');
    console.log('[juejin] Article saved successfully!');
    console.log(`[juejin] URL: ${articleUrl}`);
    console.log(`[juejin] Status: ${asDraft ? 'draft' : 'published'}`);

    return articleUrl;
  } finally {
    // Close CDP connection
    cdp.close();
    chrome.kill();
  }
}

// ============================================================================
// CLI
// ============================================================================

function printUsage(): never {
  console.log(`Post articles to Juejin (稀土掘金) via browser automation

Usage:
  npx -y bun juejin-article.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --subtitle <text>         Article subtitle/summary
  --category <name>         Article category (后端, 前端, Android, iOS, 人工智能, etc.)
  --tags <tag1,tag2>        Comma-separated tags
  --publish                 Publish immediately (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom Chrome profile directory

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  category: 前端
  tags: [tag1, tag2, tag3]
  cover: https://example.com/cover.png
  ---

Supported Categories:
  后端 (Backend), 前端 (Frontend), Android, iOS, 人工智能 (AI),
  开发工具 (DevTools), 代码人生 (Code Life), 阅读 (Reading)

Examples:
  # Post markdown as draft (default)
  npx -y bun juejin-article.ts --markdown article.md

  # Publish immediately
  npx -y bun juejin-article.ts --markdown article.md --publish

  # Post with custom category and tags
  npx -y bun juejin-article.ts --markdown article.md --category 前端 --tags "vue,react"

First Run Setup:
  1. Run any publish command
  2. Chrome will open with Juejin login page
  3. Log in with your phone number and SMS verification code
  4. Session will be saved for subsequent runs

Article Requirements:
  - Content: Original technical articles preferred
  - Language: Chinese (Simplified) primarily
  - Quality: Well-structured, code examples encouraged

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-juejin": {
         "profile_dir": "~/.local/share/juejin-browser-profile",
         "auto_publish": false
       }
     }
`);
  process.exit(0);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) printUsage();

  let markdownFile: string | undefined;
  let title: string | undefined;
  let content: string | undefined;
  let subtitle: string | undefined;
  let category: string | undefined;
  let tags: string[] = [];
  let asDraft: boolean | undefined;
  let profileDir: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--subtitle' && args[i + 1]) subtitle = args[++i];
    else if (arg === '--category' && args[i + 1]) category = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--publish') asDraft = false;
    else if (arg === '--draft') asDraft = true;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }

  await publishToJuejin({
    markdownFile,
    title,
    content,
    subtitle,
    category,
    tags,
    asDraft,
    profileDir,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
