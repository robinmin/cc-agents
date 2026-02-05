# Browser Automation Implementation

Technical documentation for the browser automation fallback method using Chrome DevTools Protocol (CDP).

## Overview

The browser automation method is a fallback when:
- GitHub integration is not available
- Zenn CLI cannot be installed
- User prefers direct browser interaction

## Architecture

```
zenn-browser.ts
    ├── CDP Connection (cdp.ts)
    │   ├── Chrome launch and management
    │   ├── WebSocket communication
    │   └── Session management
    ├── DOM Interaction
    │   ├── Element selection
    │   ├── Form filling
    │   └── Click events
    └── Zenn-specific Logic
        ├── Article editor detection
        ├── Content insertion
        └── Publishing workflow
```

## Chrome DevTools Protocol (CDP)

### Connection Class

The `CdpConnection` class manages WebSocket communication with Chrome:

```typescript
export class CdpConnection {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, PendingRequest>();

  async send<T>(method: string, params?: Record<string, unknown>): Promise<T>
  on(method: string, handler: (params: unknown) => void): void
  close(): void
}
```

### Launching Chrome

```typescript
const { cdp, chrome } = await launchChrome(url, profileDir);
```

**Process**:
1. Find Chrome executable
2. Allocate free debug port
3. Launch Chrome with remote debugging
4. Wait for debug port to be ready
5. Connect via WebSocket

### Session Management

```typescript
const session = await getPageSession(cdp, 'zenn.dev');
```

**Session includes**:
- `cdp`: CDP connection
- `sessionId`: Target session ID
- `targetId`: Chrome target identifier

## DOM Selectors

### Selector Fallback Arrays

Zenn's DOM can change, so we use fallback selectors:

```typescript
const ZENN_SELECTORS = {
  titleInput: [
    'input[placeholder*="タイトル" i]',
    'input[placeholder*="title" i]',
    'input[type="text"][class*="title"]',
    // ... more fallbacks
  ],
  contentEditor: [
    '.CodeMirror',
    '.editor-content',
    '[contenteditable="true"][class*="editor"]',
    // ... more fallbacks
  ]
};
```

### Element Finding

```typescript
async function findElement(session: ChromeSession, selectors: readonly string[]): Promise<string> {
  // Try each selector until one works
  for (const selector of selectors) {
    const result = await evaluate(session, `document.querySelector('${selector}')`);
    if (result === 'found') return selector;
  }
  throw new Error('Element not found');
}
```

## Form Interaction

### Title Input

```typescript
async function fillTitle(session: ChromeSession, title: string): Promise<void> {
  const selector = await findElement(session, ZENN_SELECTORS.titleInput);

  await evaluate(session, `
    (function() {
      const el = document.querySelector('${selector}');
      el.value = '';
      el.focus();
      el.value = ${sanitizeForJavaScript(title)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    })()
  `);
}
```

**Security**: Uses `sanitizeForJavaScript()` to prevent XSS attacks.

### Content Editor

```typescript
async function fillContent(session: ChromeSession, content: string): Promise<void> {
  const selector = await findElement(session, ZENN_SELECTORS.contentEditor);

  await evaluate(session, `
    (function() {
      const el = document.querySelector('${selector}');
      el.focus();
      el.innerHTML = '';
      el.textContent = '';

      // Try CodeMirror API first
      if (window.editor && window.editor.setValue) {
        window.editor.setValue(${sanitizeForJavaScript(content)});
      }
      // Fallback to direct text insertion
      else {
        el.textContent = ${sanitizeForJavaScript(content)};
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
}
```

### Topics/Tags

```typescript
async function addTopics(session: ChromeSession, topics: string[]): Promise<void> {
  const selector = await findElement(session, ZENN_SELECTORS.topicsInput);

  for (const topic of topics) {
    await evaluate(session, `
      (function() {
        const el = document.querySelector('${selector}');
        el.focus();
        el.value = ${sanitizeForJavaScript(topic)};
        el.dispatchEvent(new Event('input', { bubbles: true }));

        // Press Enter to add topic
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
        });
        el.dispatchEvent(enterEvent);
      })()
    `);
    await sleep(300);
  }
}
```

## Session Persistence

### Profile Directory

```typescript
const profileDir = getWtProfileDir() ?? getDefaultProfileDir();
// Default: ~/.local/share/zenn-browser-profile
```

**Profile stores**:
- Login session cookies
- Authentication tokens
- Browser preferences
- Form autofill data

### First Run

On first run, user must manually log in:

1. Chrome opens at Zenn login page
2. Script waits for login detection
3. User completes login manually
4. Script detects login and continues

### Subsequent Runs

Session is preserved from previous login:
- No need to log in again
- Direct article creation
- Faster execution

## Security Considerations

### XSS Prevention

All user input is sanitized before injection:

```typescript
export function sanitizeForJavaScript(str: string): string {
  return JSON.stringify(str);
}
```

**This prevents**:
- Script injection from article content
- DOM manipulation attacks
- Cookie theft via malicious content

### Input Validation

```typescript
// Validate slug format
if (!/^[a-z0-9-_]{12,}$/.test(article.slug)) {
  throw new Error('Invalid slug format');
}

// Validate article type
if (type !== 'tech' && type !== 'idea') {
  throw new Error('Invalid type');
}
```

## Error Handling

### Element Not Found

```typescript
try {
  const selector = await findElement(session, ZENN_SELECTORS.titleInput);
} catch (error) {
  console.error('Title input not found, Zenn may have changed its DOM');
  throw error;
}
```

### Login Timeout

```typescript
const loginTimeoutMs = 300_000; // 5 minutes
while (Date.now() - start < loginTimeoutMs) {
  if (await checkLoginStatus(session)) {
    console.log('Login detected!');
    break;
  }
  await sleep(3000);
}

if (Date.now() - start >= loginTimeoutMs) {
  throw new Error('Login timeout');
}
```

### Navigation Errors

```typescript
try {
  await clickElement(session, publishButtonSelector);
} catch (error) {
  // Fallback to keyboard shortcut
  const modifiers = process.platform === 'darwin' ? 8 : 4;
  await evaluate(session, `
    (function() {
      const event = new KeyboardEvent('keydown', {
        key: 's', code: 'KeyS', keyCode: 83,
        ctrlKey: ${modifiers === 4},
        metaKey: ${modifiers === 8},
        bubbles: true
      });
      document.dispatchEvent(event);
    })()
  `);
}
```

## DOM Detection

### Editor Ready Check

```typescript
async function waitForPageReady(session: ChromeSession): Promise<void> {
  while (Date.now() - start < timeoutMs) {
    const isReady = await evaluate(session, `
      (function() {
        return document.readyState === 'complete' &&
               (document.querySelector('.CodeMirror') !== null ||
                document.querySelector('[contenteditable="true"]') !== null);
      })()
    `);
    if (isReady) return;
    await sleep(200);
  }
}
```

### Login Status Detection

```typescript
async function checkLoginStatus(session: ChromeSession): Promise<boolean> {
  // Check if on login page
  const currentUrl = await evaluate<string>(session, 'window.location.href');
  if (currentUrl.includes('login')) return false;

  // Check for logged-in indicators
  const isLoggedIn = await evaluate(session, `
    (function() {
      return document.querySelector('.user-avatar') !== null ||
             document.querySelector('.logout-button') !== null;
    })()
  `);

  return isLoggedIn === true;
}
```

## Platform Considerations

### Chrome Path Detection

```typescript
const CHROME_CANDIDATES_FULL = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ],
};
```

### Keyboard Modifiers

```typescript
const modifiers = process.platform === 'darwin' ? 8 : 4;
// 8 = metaKey (macOS Cmd)
// 4 = ctrlKey (Windows/Linux)
```

## Performance Optimization

### Sleep Intervals

```typescript
await sleep(500);   // After form fill
await sleep(1000);  // After content insertion
await sleep(300);   // Between topics
await sleep(3000);  // After submit
```

**Rationale**:
- Allow DOM to update
- Wait for event handlers
- Prevent race conditions
- Ensure actions complete

### Connection Timeout

```typescript
const wsUrl = await waitForChromeDebugPort(port, 30_000);
const cdp = await CdpConnection.connect(wsUrl, 30_000);
```

**30 seconds** allows for:
- Chrome startup time
- Extension loading
- Page initialization

## Troubleshooting

### Chrome Not Found

**Error**: `Chrome not found. Set ZENN_BROWSER_CHROME_PATH env var.`

**Solution**:
```bash
export ZENN_BROWSER_CHROME_PATH="/path/to/chrome"
```

### Session Lost

**Symptoms**: Asked to log in again

**Solution**:
```bash
# Remove old profile
rm -rf ~/.local/share/zenn-browser-profile

# Run script again - will create new profile
```

### Elements Not Found

**Error**: `Element not found. Tried selectors: [...]`

**Solution**:
- Zenn may have updated its DOM
- Update selectors in `ZENN_SELECTORS`
- Check browser DevTools for current selectors

### Connection Timeout

**Error**: `Chrome debug port not ready`

**Solution**:
- Close existing Chrome instances
- Check if another process is using the debug port
- Try a different port (auto-allocated)

## See Also

- [Troubleshooting Guide](troubleshooting.md)
- [Zenn CLI Guide](zenn-cli-guide.md)
- [CDP Documentation](https://chromedevtools.github.io/devtools-protocol/)
