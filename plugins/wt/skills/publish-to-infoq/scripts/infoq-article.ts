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
} from './infoq-utils.js';

// ============================================================================
// InfoQ DOM Selectors
// ============================================================================

const INFOQ_SELECTORS = {
  // Title input field
  titleInput: [
    'input[placeholder*="标题" i]',
    'input[placeholder*="title" i]',
    'input[type="text"][class*="title"]',
    'textarea[placeholder*="标题" i]',
    '[data-testid="title-input"]',
    '[name="title"]',
    '.article-title-input',
    '.title-input',
  ],

  // Subtitle/Summary input field
  subtitleInput: [
    'input[placeholder*="摘要" i]',
    'input[placeholder*="subtitle" i]',
    'textarea[placeholder*="摘要" i]',
    '[data-testid="summary-input"]',
    '[name="summary"]',
    '.summary-input',
  ],

  // Content editor (likely ProseMirror or similar rich text editor)
  contentEditor: [
    '.ProseMirror',
    '[contenteditable="true"][class*="editor"]',
    '[contenteditable="true"][class*="prose"]',
    '[data-testid="editor"]',
    '.editor-content',
    '.article-editor',
    '.rich-text-editor',
  ],

  // Category selector
  categorySelect: [
    'select[name="category"]',
    '.category-select',
    '[data-testid="category-select"]',
    '.article-category',
  ],

  // Tags input field
  tagsInput: [
    'input[placeholder*="标签" i]',
    'input[placeholder*="tags" i]',
    '[data-testid="tags-input"]',
    '[name="tags"]',
    '.tags-input',
  ],

  // Submit/Save button
  submitButton: [
    'button[type="submit"]',
    'button:has-text("提交")',
    'button:has-text("发布")',
    'button:has-text("保存")',
    '[data-testid="submit-button"]',
    '.submit-button',
    '.publish-button',
  ],

  // Draft button
  draftButton: [
    'button:has-text("保存草稿")',
    'button:has-text("Save draft")',
    'button:has-text("草稿")',
    '[data-testid="draft-button"]',
    '.draft-button',
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
 * InfoQ uses Vue.js 2.6.11 SPA, so we need to wait for the app to mount
 */
async function waitForPageReady(session: ChromeSession, timeoutMs = 20000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const isReady = await evaluate(
      session,
      `
      (function() {
        return document.readyState === 'complete' &&
               (document.querySelector('.ProseMirror') !== null ||
                document.querySelector('[contenteditable="true"]') !== null ||
                document.querySelector('.editor') !== null);
      })()
      `
    );
    if (isReady) return;
    await sleep(200);
  }

  // If editor not found, still continue - page might be ready with different selectors
  console.log('[infoq] Editor not detected via standard selectors, continuing anyway...');
}

/**
 * Check if user is logged in
 */
async function checkLoginStatus(session: ChromeSession): Promise<boolean> {
  const currentUrl = await evaluate<string>(session, 'window.location.href');
  console.log(`[infoq] Current URL: ${currentUrl}`);

  // If URL contains /auth/login, user is not logged in
  if (currentUrl.includes('/auth/login')) {
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
  console.log('[infoq] Filling in title...');

  const selector = await findElement(session, INFOQ_SELECTORS.titleInput);

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

      // Trigger Vue.js input event
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
 * Fill in the subtitle/summary field (optional)
 */
async function fillSubtitle(session: ChromeSession, subtitle: string): Promise<void> {
  console.log('[infoq] Filling in subtitle/summary...');

  const start = Date.now();
  const timeoutMs = 3000;

  while (Date.now() - start < timeoutMs) {
    try {
      const selector = await findElement(session, INFOQ_SELECTORS.subtitleInput, 1000);

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

          // Trigger Vue.js input event
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

  console.log('[infoq] Subtitle field not found (optional, skipping...)');
}

/**
 * Fill in the content editor
 */
async function fillContent(session: ChromeSession, content: string): Promise<void> {
  console.log('[infoq] Filling in content...');

  const selector = await findElement(session, INFOQ_SELECTORS.contentEditor);

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

      // Insert content using direct text insertion
      // For ProseMirror or similar editors
      const textContent = ${sanitizeForJavaScript(content)};

      // Try to use editor's API if available
      if (window.view && window.view.state) {
        const view = window.view;
        const transaction = view.state.tr.insert(0, view.state.schema.text(textContent));
        view.dispatch(transaction);
      } else {
        // Fallback: insert text nodes
        el.textContent = textContent;
      }

      // Trigger input event for Vue.js reactivity
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
    console.log('[infoq] No category specified (optional)...');
    return;
  }

  console.log(`[infoq] Setting category: ${category}...`);

  try {
    const selector = await findElement(session, INFOQ_SELECTORS.categorySelect, 2000);

    await evaluate(
      session,
      `
      (function() {
        const el = document.querySelector('${selector}');
        if (!el) return 'not-found';

        // Set the category value
        el.value = ${sanitizeForJavaScript(category)};

        // Trigger change event for Vue.js
        const event = new Event('change', { bubbles: true });
        el.dispatchEvent(event);

        return 'success';
      })()
      `
    );

    await sleep(500);
  } catch {
    console.log('[infoq] Category selector not found (optional, skipping...)');
  }
}

/**
 * Add tags to the article
 */
async function addTags(session: ChromeSession, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[infoq] No tags to add...');
    return;
  }

  console.log(`[infoq] Setting tags: ${tags.join(', ')}...`);

  try {
    const selector = await findElement(session, INFOQ_SELECTORS.tagsInput, 2000);

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
    console.log('[infoq] Tags input not found (optional, skipping...)');
  }
}

/**
 * Submit the article or save as draft
 */
async function submitArticle(session: ChromeSession, asDraft: boolean): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Submitting for review';
  console.log(`[infoq] ${action}...`);

  const buttonSelectors = asDraft ? INFOQ_SELECTORS.draftButton : INFOQ_SELECTORS.submitButton;

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
    console.log('[infoq] Button click failed, trying keyboard shortcut...');

    // Try Ctrl/Cmd + Enter to submit
    const modifiers = process.platform === 'darwin' ? 8 : 4;

    await evaluate(
      session,
      `
      (function() {
        const event = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
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
 * Publish article to InfoQ
 */
export async function publishToInfoQ(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[infoq] Parsing markdown: ${options.markdownFile}`);
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

  console.log(`[infoq] Title: ${article.title}`);
  console.log(`[infoq] Category: ${article.category || '(not set)'}`);
  console.log(`[infoq] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[infoq] Status: ${asDraft ? 'draft' : 'submit'}`);

  // Get profile directory (WT config takes precedence, then CLI option, then default)
  const wtProfileDir = getWtProfileDir();
  const profileDir = options.profileDir ?? wtProfileDir ?? cdpGetDefaultProfileDir();
  await mkdir(profileDir, { recursive: true });

  // Get new article URL
  const newArticleUrl = getNewArticleUrl();
  console.log(`[infoq] Navigating to: ${newArticleUrl}`);

  // Launch Chrome
  console.log(`[infoq] Launching Chrome (profile: ${profileDir})`);
  const { cdp, chrome } = await launchChrome(newArticleUrl, profileDir);

  try {
    // Get page session
    const session = await getPageSession(cdp, 'xie.infoq.cn');

    // Check login status
    console.log('[infoq] Checking login status...');
    const isLoggedIn = await checkLoginStatus(session);

    if (!isLoggedIn) {
      console.log('[infoq] Not logged in. Please log in to your InfoQ account.');
      console.log('[infoq] Waiting for login (manual intervention required)...');

      // Wait for user to log in (check every 3 seconds, timeout 5 minutes)
      const loginTimeoutMs = 300_000;
      const start = Date.now();
      while (Date.now() - start < loginTimeoutMs) {
        await sleep(3000);
        const nowLoggedIn = await checkLoginStatus(session);
        if (nowLoggedIn) {
          console.log('[infoq] Login detected! Continuing...');
          break;
        }
        console.log('[infoq] Still waiting for login...');
      }

      if (!isLoggedIn && Date.now() - start >= loginTimeoutMs) {
        throw new Error('Login timeout. Please run the script again after logging in.');
      }
    } else {
      console.log('[infoq] Already logged in.');
    }

    // Wait for page to be ready
    console.log('[infoq] Waiting for editor to load...');
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
    console.log('[infoq] Article saved successfully!');
    console.log(`[infoq] URL: ${articleUrl}`);
    console.log(`[infoq] Status: ${asDraft ? 'draft' : 'submitted for review'}`);

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
  console.log(`Post articles to InfoQ (xie.infoq.cn) via browser automation

Usage:
  npx -y bun infoq-article.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --subtitle <text>         Article subtitle/summary
  --category <name>         Article category (Architecture, AI, Frontend, etc.)
  --tags <tag1,tag2>        Comma-separated tags
  --submit                  Submit for review (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom Chrome profile directory

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  category: Architecture
  tags: [tag1, tag2, tag3]
  ---

Supported Categories:
  Architecture, AI, Frontend, Operations, Open Source,
  Java, Algorithms, Big Data, Cloud Computing

Examples:
  # Post markdown as draft (default)
  npx -y bun infoq-article.ts --markdown article.md

  # Submit for review
  npx -y bun infoq-article.ts --markdown article.md --submit

  # Post with custom category and tags
  npx -y bun infoq-article.ts --markdown article.md --category AI --tags "llm,gpt,transformers"

First Run Setup:
  1. Run any publish command
  2. Chrome will open with InfoQ login page
  3. Log in to your InfoQ account manually
  4. Session will be saved for subsequent runs

Article Requirements:
  - Word count: 3000-4000 words recommended
  - Review time: ~1 week for editorial feedback
  - Content: Technical depth articles preferred

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-infoq": {
         "profile_dir": "~/.local/share/infoq-browser-profile",
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
    else if (arg === '--submit') asDraft = false;
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

  await publishToInfoQ({
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
