# InfoQ Browser Automation - Technical Details

## Implementation Overview

This skill uses Chrome DevTools Protocol (CDP) for browser automation to post articles to InfoQ's contribution platform (xie.infoq.cn).

## Architecture

### Component Structure

```
publish-to-infoq/
├── SKILL.md                          # Skill documentation
├── scripts/
│   ├── infoq-article.ts              # Main article posting script
│   ├── cdp.ts                        # Chrome DevTools Protocol utilities
│   └── infoq-utils.ts                # InfoQ-specific utilities
└── references/
    ├── infoq-api-research.md         # API research findings
    ├── technical-details.md          # This file
    ├── troubleshooting.md            # Troubleshooting guide
    └── usage-examples.md             # Usage examples
```

### Script Interactions

```
infoq-article.ts (CLI)
    ↓
infoq-utils.ts (config, parsing, sanitization)
    ↓
cdp.ts (Chrome CDP utilities)
    ↓
Chrome Browser (xie.infoq.cn)
```

## Chrome DevTools Protocol (CDP)

### Connection Flow

1. **Launch Chrome** with remote debugging port
2. **Connect via WebSocket** to CDP endpoint
3. **Attach to page** target (xie.infoq.cn)
4. **Enable domains**: Page, Runtime, DOM
5. **Execute commands** via CDP protocol

### CDP Commands Used

| Domain | Method | Purpose |
|--------|--------|---------|
| Target | getTargets | List available targets (tabs) |
| Target | attachToTarget | Attach to specific page |
| Page | enable | Enable Page domain |
| Runtime | enable | Enable Runtime domain |
| Runtime | evaluate | Execute JavaScript in page context |
| DOM | enable | Enable DOM domain |
| Input | dispatchMouseEvent | Simulate mouse clicks |
| Input | dispatchKeyEvent | Simulate keyboard events |
| Input | insertText | Insert text into focused element |

### Session Management

```typescript
interface ChromeSession {
  cdp: CdpConnection;      // WebSocket connection to Chrome
  sessionId: string;       // Target session ID
  targetId: string;        // Page target ID
}
```

## DOM Selectors

### Selector Strategy

InfoQ uses multiple possible selectors for each element type, with fallback logic:

```typescript
const INFOQ_SELECTORS = {
  titleInput: [
    'input[placeholder*="标题" i]',      // Chinese placeholder
    'input[placeholder*="title" i]',     // English placeholder
    'input[type="text"][class*="title"]',
    // ... more fallbacks
  ],
  // ... more elements
};
```

### Element Finding

```typescript
async function findElement(
  session: ChromeSession,
  selectors: readonly string[],
  timeoutMs = 5000
): Promise<string> {
  // Try each selector until one works
  // Verify element is visible (offsetParent !== null)
  // Return successful selector
}
```

### Key DOM Elements

| Element | Selectors Used |
|---------|---------------|
| Title Input | `input[placeholder*="标题" i]`, `.article-title-input`, `[name="title"]` |
| Subtitle Input | `input[placeholder*="摘要" i]`, `.summary-input`, `[name="summary"]` |
| Content Editor | `.ProseMirror`, `[contenteditable="true"]`, `.editor-content` |
| Category Select | `select[name="category"]`, `.category-select` |
| Tags Input | `input[placeholder*="标签" i]`, `.tags-input`, `[name="tags"]` |
| Submit Button | `button[type="submit"]`, `button:has-text("提交")`, `.submit-button` |
| Draft Button | `button:has-text("保存草稿")`, `.draft-button` |

## JavaScript Injection

### Sanitization Strategy

All user content is sanitized using `JSON.stringify()` to prevent XSS:

```typescript
export function sanitizeForJavaScript(str: string): string {
  return JSON.stringify(str);
}
```

**Example:**
```javascript
// Input: "Hello 'World'" <script>alert('XSS')</script>
// Output: "Hello 'World'\" <script>alert('XSS')</script>"
```

### Content Insertion

```typescript
await evaluate(session, `
  (function() {
    const el = document.querySelector('${selector}');
    el.value = ${sanitizeForJavaScript(userContent)};

    // Trigger Vue.js reactivity
    const event = new Event('input', { bubbles: true });
    el.dispatchEvent(event);

    return 'success';
  })()
`);
```

## Vue.js SPA Considerations

### Reactivity Triggers

InfoQ uses Vue.js 2.6.11, which requires proper event triggering:

```typescript
// Trigger input event for v-model
const event = new Event('input', { bubbles: true });
el.dispatchEvent(event);

// Trigger change event for form validation
const changeEvent = new Event('change', { bubbles: true });
el.dispatchEvent(changeEvent);
```

### Page Load Detection

```typescript
async function waitForPageReady(session: ChromeSession): Promise<void> {
  // Wait for Vue.js app to mount
  const isReady = await evaluate(session, `
    (function() {
      return document.readyState === 'complete' &&
             (document.querySelector('.ProseMirror') !== null ||
              document.querySelector('[contenteditable="true"]') !== null);
    })()
  `);
}
```

## Authentication Flow

### Login Detection

```typescript
async function checkLoginStatus(session: ChromeSession): Promise<boolean> {
  const currentUrl = await evaluate<string>(session, 'window.location.href');

  // Redirected to login page
  if (currentUrl.includes('/auth/login')) {
    return false;
  }

  // Check for logged-in indicators
  const isLoggedIn = await evaluate(session, `
    (function() {
      return document.querySelector('.user-avatar') !== null ||
             document.querySelector('.logout-button') !== null;
    })()
  `);

  return isLoggedIn;
}
```

### Session Persistence

Login sessions persist in Chrome profile directory:

```
~/.local/share/infoq-browser-profile/
├── Default/
│   ├── Cookies
│   ├── Local Storage/
│  ── Session Storage/
│   └── ...
```

## Configuration System

### WT Config Reading

```typescript
interface WtConfig {
  'publish-to-infoq'?: {
    profile_dir?: string;
    auto_publish?: boolean;
  };
}

function readWtConfig(): WtConfig {
  const configPath = '~/.claude/wt/config.jsonc';
  // Strip comments (JSONC)
  // Parse JSON
  // Cache with TTL (60 seconds)
}
```

### Profile Directory Resolution

1. **WT config** (`~/.claude/wt/config.jsonc`)
2. **CLI flag** (`--profile <dir>`)
3. **Default** (`~/.local/share/infoq-browser-profile`)

## Markdown Parsing

### Frontmatter Extraction

```typescript
function extractFrontmatter(content: string) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  // Parse YAML-like key: value pairs
  // Handle types: boolean, number, array
}
```

### Supported Frontmatter Fields

```yaml
---
title: Article Title
subtitle: Optional subtitle
category: Architecture
tags: [tag1, tag2, tag3]
---
```

## Error Handling

### Selector Fallback

If a selector fails, try the next one:

```typescript
for (const selector of selectors) {
  try {
    const result = await evaluate(session, `...`);
    if (result === 'found') return selector;
  } catch {
    // Try next selector
  }
}
```

### Timeout Handling

```typescript
const start = Date.now();
while (Date.now() - start < timeoutMs) {
  // Retry logic
}
throw new Error('Element not found');
```

### Login Wait Loop

```typescript
// Wait for manual login (up to 5 minutes)
while (Date.now() - start < 300_000) {
  await sleep(3000);
  if (await checkLoginStatus(session)) break;
}
```

## Platform Support

### Chrome Discovery

```typescript
const CHROME_CANDIDATES = {
  darwin: [
    '/Applications/Google Chrome.app/...',
    '/Applications/Chromium.app/...',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\...',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ],
};
```

### Environment Variable Override

```bash
export INFOQ_BROWSER_CHROME_PATH=/path/to/custom/chrome
```

## Performance Characteristics

| Operation | Typical Duration |
|-----------|-----------------|
| Chrome Launch | 2-3 seconds |
| Page Load | 3-5 seconds |
| Login Check | <1 second |
| Title Fill | 0.5 seconds |
| Content Fill | 1-2 seconds |
| Category/Tags | 0.5 seconds each |
| Submit | 2-3 seconds |

**Total Time:** ~15-20 seconds per article (excluding manual login)

## Security Best Practices

1. **XSS Prevention:** All user content sanitized via `JSON.stringify()`
2. **Path Safety:** Use `path.join()` and absolute paths
3. **Input Validation:** Validate all CLI arguments
4. **Session Isolation:** Separate Chrome profile per platform
5. **No Hardcoded Secrets:** Credentials via manual login only
