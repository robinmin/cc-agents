import { mkdir } from 'node:fs/promises';
import process from 'node:process';
import { launchChrome, getPageSession, clickElement, evaluate, sleep, getDefaultProfileDir as cdpGetDefaultProfileDir } from './cdp.js';
import { type ChromeSession } from './cdp.js';
import {
  getWtProfileDir,
  getAutoPublishPreference,
  getNewPostUrl,
  parseMarkdownFile,
  markdownToHtml,
  sanitizeForJavaScript,
  type ParsedArticle,
} from './substack-utils.js';

// ============================================================================
// Substack DOM Selectors
// ============================================================================

const SUBSTACK_SELECTORS = {
  // Title input field
  titleInput: [
    'input[placeholder*="Title" i]',
    'input[type="text"][class*="title"]',
    'textarea[placeholder*="Title" i]',
    'h1[contenteditable="true"]',
    '[data-testid="title-input"]',
    '[name="title"]',
  ],

  // Subtitle input field
  subtitleInput: [
    'input[placeholder*="subtitle" i]',
    'input[placeholder*="Subtitle" i]',
    'textarea[placeholder*="subtitle" i]',
    '[data-testid="subtitle-input"]',
    '[name="subtitle"]',
  ],

  // Content editor (ProseMirror)
  contentEditor: [
    '.ProseMirror',
    '[contenteditable="true"][class*="editor"]',
    '[contenteditable="true"][class*="prose"]',
    '[data-testid="editor"]',
    '.editor-content',
  ],

  // Tags input field
  tagsInput: [
    'input[placeholder*="tags" i]',
    'input[placeholder*="Tags" i]',
    '[data-testid="tags-input"]',
    '[name="tags"]',
  ],

  // Publish button
  publishButton: [
    'button[type="submit"]',
    'button:has-text("Publish")',
    'button:has-text("Post")',
    '[data-testid="publish-button"]',
    '.publish-button',
  ],

  // Draft button
  draftButton: [
    'button:has-text("Save as draft")',
    'button:has-text("Save draft")',
    'button:has-text("Draft")',
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
 */
async function waitForPageReady(session: ChromeSession, timeoutMs = 15000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const isReady = await evaluate(
      session,
      `
      (function() {
        return document.readyState === 'complete' &&
               document.querySelector('.ProseMirror, [contenteditable="true"]') !== null;
      })()
      `
    );
    if (isReady) return;
    await sleep(200);
  }

  throw new Error('Page did not load or editor not ready');
}

/**
 * Fill in the title field
 */
async function fillTitle(session: ChromeSession, title: string): Promise<void> {
  console.log('[substack] Filling in title...');

  const selector = await findElement(session, SUBSTACK_SELECTORS.titleInput);

  await evaluate(
    session,
    `
    (function() {
      const el = document.querySelector('${selector}');
      if (!el) throw new Error('Title input not found');

      // Clear existing content
      el.value = '';
      el.textContent = '';

      // Focus the element
      el.focus();

      // Set the value using proper escaping
      el.value = ${sanitizeForJavaScript(title)};

      // Trigger input event
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

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
  console.log('[substack] Filling in subtitle...');

  const start = Date.now();
  const timeoutMs = 3000;

  while (Date.now() - start < timeoutMs) {
    try {
      const selector = await findElement(session, SUBSTACK_SELECTORS.subtitleInput, 1000);

      await evaluate(
        session,
        `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return 'not-found';

          // Clear existing content
          el.value = '';
          el.textContent = '';

          // Focus the element
          el.focus();

          // Set the value using proper escaping
          el.value = ${sanitizeForJavaScript(subtitle)};

          // Trigger input event
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));

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

  console.log('[substack] Subtitle field not found (optional, skipping...)');
}

/**
 * Fill in the content using ProseMirror editor
 */
async function fillContent(session: ChromeSession, content: string): Promise<void> {
  console.log('[substack] Filling in content...');

  const selector = await findElement(session, SUBSTACK_SELECTORS.contentEditor);

  // Convert markdown to HTML for better compatibility
  const htmlContent = markdownToHtml(content);

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

      // Insert HTML content using ProseMirror API if available
      if (window.view && window.view.state) {
        const view = window.view;
        const transaction = view.state.tr.insert(
          0,
          view.state.schema.text(${sanitizeForJavaScript(content)})
        );
        view.dispatch(transaction);
      } else {
        // Fallback: use innerHTML with proper escaping
        el.innerHTML = ${sanitizeForJavaScript(htmlContent)};
      }

      // Trigger input event
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return 'success';
    })()
    `
  );

  await sleep(1000);
}

/**
 * Add tags to the article
 */
async function addTags(session: ChromeSession, tags: string[]): Promise<void> {
  if (tags.length === 0) {
    console.log('[substack] No tags to add...');
    return;
  }

  console.log(`[substack] Setting tags: ${tags.join(', ')}...`);

  try {
    const selector = await findElement(session, SUBSTACK_SELECTORS.tagsInput);

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
          el.dispatchEvent(new Event('input', { bubbles: true }));

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
    console.log('[substack] Tags input not found (optional, skipping...)');
  }
}

/**
 * Publish the article or save as draft
 */
async function publishArticle(session: ChromeSession, asDraft: boolean): Promise<string> {
  const action = asDraft ? 'Saving as draft' : 'Publishing';
  console.log(`[substack] ${action}...`);

  const buttonSelectors = asDraft ? SUBSTACK_SELECTORS.draftButton : SUBSTACK_SELECTORS.publishButton;

  try {
    const selector = await findElement(session, buttonSelectors);

    // Click the button
    await clickElement(session, selector);

    // Wait for navigation or completion
    await sleep(2000);

    // Get the current URL (should be the published/draft article URL)
    const url = await evaluate<string>(session, 'window.location.href');

    return url as string;
  } catch (error) {
    // If button click failed, try keyboard shortcut
    console.log('[substack] Button click failed, trying keyboard shortcut...');

    // Cmd/Ctrl + Enter to publish (Substack shortcut)
    const modifiers = process.platform === 'darwin' ? 8 : 4; // Cmd on macOS, Ctrl on others

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

    await sleep(2000);

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
  tags?: string[];
  asDraft?: boolean;
  profileDir?: string;
  publicationUrl?: string;
}

/**
 * Publish article to Substack
 */
export async function publishToSubstack(options: PublishOptions): Promise<string> {
  // Parse article
  let article: ParsedArticle;

  if (options.markdownFile) {
    console.log(`[substack] Parsing markdown: ${options.markdownFile}`);
    article = parseMarkdownFile(options.markdownFile);
  } else if (options.title && options.content) {
    article = {
      title: options.title,
      content: options.content,
      subtitle: options.subtitle,
      tags: options.tags,
    };
  } else {
    throw new Error('Error: --markdown is required (or use --title with --content)');
  }

  // Override with CLI options
  if (options.subtitle) article.subtitle = options.subtitle;
  if (options.tags) article.tags = options.tags;

  // Determine publish status
  const autoPublish = getAutoPublishPreference();
  const asDraft = options.asDraft ?? !autoPublish;

  console.log(`[substack] Title: ${article.title}`);
  console.log(`[substack] Tags: ${article.tags?.join(', ') || '(none)'}`);
  console.log(`[substack] Status: ${asDraft ? 'draft' : 'publish'}`);

  // Get profile directory (WT config takes precedence, then CLI option, then default)
  const wtProfileDir = getWtProfileDir();
  const profileDir = options.profileDir ?? wtProfileDir ?? cdpGetDefaultProfileDir();
  await mkdir(profileDir, { recursive: true });

  // Get new post URL
  const newPostUrl = getNewPostUrl(options.publicationUrl);
  console.log(`[substack] Navigating to: ${newPostUrl}`);

  // Launch Chrome
  console.log(`[substack] Launching Chrome (profile: ${profileDir})`);
  const { cdp, chrome } = await launchChrome(newPostUrl, profileDir);

  try {
    // Get page session
    const session = await getPageSession(cdp, 'substack.com');

    // Wait for page to be ready
    console.log('[substack] Waiting for editor to load...');
    await waitForPageReady(session);

    // Fill in the article
    await fillTitle(session, article.title);

    if (article.subtitle) {
      await fillSubtitle(session, article.subtitle);
    }

    await fillContent(session, article.content);

    if (article.tags && article.tags.length > 0) {
      await addTags(session, article.tags);
    }

    // Publish or save as draft
    const articleUrl = await publishArticle(session, asDraft);

    console.log('');
    console.log('[substack] Article saved successfully!');
    console.log(`[substack] URL: ${articleUrl}`);
    console.log(`[substack] Status: ${asDraft ? 'draft' : 'published'}`);

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
  console.log(`Post articles to Substack.com via browser automation

Usage:
  npx -y bun substack-article.ts [options]

Options:
  --markdown <path>         Markdown file to post (recommended)
  --title <text>            Article title (auto-extracted from markdown)
  --content <text>          Article content (use with --title)
  --tags <tag1,tag2>        Comma-separated tags
  --subtitle <text>         Article subtitle
  --publish                 Publish as public (default: draft)
  --draft                   Save as draft (overrides auto_publish config)
  --profile <dir>           Custom Chrome profile directory
  --publication <url>       Substack publication URL

Markdown Frontmatter:
  ---
  title: Article Title
  subtitle: Optional subtitle
  tags: [tag1, tag2, tag3]
  ---

Examples:
  # Post markdown as draft (default)
  npx -y bun substack-article.ts --markdown article.md

  # Publish immediately
  npx -y bun substack-article.ts --markdown article.md --publish

  # Post with custom tags
  npx -y bun substack-article.ts --markdown article.md --tags "javascript,typescript,api"

  # Post with title and content directly
  npx -y bun substack-article.ts --title "My Title" --content "# Hello World\\n\\nThis is my article."

First Run Setup:
  1. Run any publish command
  2. Chrome will open with Substack login page
  3. Log in to your Substack account manually
  4. Session will be saved for subsequent runs

Setup:
  Optional: Add to ~/.claude/wt/config.jsonc:
     {
       "publish-to-substack": {
         "profile_dir": "~/.local/share/substack-browser-profile",
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
  let tags: string[] = [];
  let asDraft: boolean | undefined;
  let profileDir: string | undefined;
  let publicationUrl: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === '--markdown' && args[i + 1]) markdownFile = args[++i];
    else if (arg === '--title' && args[i + 1]) title = args[++i];
    else if (arg === '--content' && args[i + 1]) content = args[++i];
    else if (arg === '--subtitle' && args[i + 1]) subtitle = args[++i];
    else if (arg === '--tags' && args[i + 1]) {
      const tagStr = args[++i]!;
      tags.push(...tagStr.split(',').map((t) => t.trim()).filter((t) => t));
    }
    else if (arg === '--publish') asDraft = false;
    else if (arg === '--draft') asDraft = true;
    else if (arg === '--profile' && args[i + 1]) profileDir = args[++i];
    else if (arg === '--publication' && args[i + 1]) publicationUrl = args[++i];
  }

  // Validate input
  if (!markdownFile && !title) {
    throw new Error('Error: --title is required (or use --markdown)');
  }
  if (!markdownFile && !content) {
    throw new Error('Error: --content is required when using --title');
  }

  await publishToSubstack({
    markdownFile,
    title,
    content,
    subtitle,
    tags,
    asDraft,
    profileDir,
    publicationUrl,
  });
}

await main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
