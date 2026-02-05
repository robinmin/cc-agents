# Technical Details: publish-to-juejin

## Architecture

The `publish-to-juejin` skill uses Chrome DevTools Protocol (CDP) for browser automation:

```
┌─────────────────────────────────────────────────────────────┐
│                    publish-to-juejin                        │
├─────────────────────────────────────────────────────────────┤
│  juejin-article.ts    →  Main publishing workflow            │
│  juejin-utils.ts      →  Configuration & utilities           │
│  cdp.ts               →  Chrome DevTools Protocol layer      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                           │
│  - Launches with remote debugging                          │
│  - Persists session in profile directory                   │
│  - Interacts with juejin.cn via CDP                         │
└─────────────────────────────────────────────────────────────┘
```

## DOM Selectors

### Title Input

Multiple selector patterns for robustness:

```css
/* Primary selectors */
input[placeholder*="请输入标题" i]
input[type="text"][class*="title"]
textarea[placeholder*="请输入标题" i]

/* Fallback selectors */
input[name="title"]
.article-title-input
.title-input
```

### Subtitle Input (Optional)

```css
input[placeholder*="摘要" i]
textarea[placeholder*="摘要" i]
input[name="subtitle"]
.summary-input
```

### Content Editor

```css
/* CodeMirror (most likely) */
.CodeMirror

/* Rich text editors */
[contenteditable="true"][class*="editor"]
[contenteditable="true"][class*="public-DraftEditor-content"]

/* Generic selectors */
.editor-content
.markdown-editor
.rich-text-editor
```

### Category Selector

```css
select[name="category"]
.category-select
.category-dropdown
```

### Tags Input

```css
input[placeholder*="标签" i]
input[placeholder*="请输入标签" i]
[name="tags"]
.tags-input
```

### Action Buttons

```css
/* Publish button */
button[type="submit"]
.publish-button
.submit-button

/* Draft button */
button:contains("保存草稿")
.draft-button
.save-draft-button
```

## CDP Protocol Usage

### Chrome Launch

```typescript
const chrome = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-blink-features=AutomationControlled',
  '--start-maximized',
  url,
]);
```

### Session Attachment

```typescript
// Connect to WebSocket
const cdp = await CdpConnection.connect(wsUrl, 30_000);

// Attach to page target
const { sessionId } = await cdp.send('Target.attachToTarget', {
  targetId: pageTarget.targetId,
  flatten: true
});

// Enable domains
await cdp.send('Page.enable', {}, { sessionId });
await cdp.send('Runtime.enable', {}, { sessionId });
await cdp.send('DOM.enable', {}, { sessionId });
```

### DOM Interaction

```typescript
// Evaluate JavaScript in page context
const result = await session.cdp.send('Runtime.evaluate', {
  expression: `document.querySelector('${selector}')`,
  returnByValue: true,
}, { sessionId });

// Click element
await session.cdp.send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: pos.x,
  y: pos.y,
  button: 'left',
  clickCount: 1
}, { sessionId });
```

## Session Persistence

Chrome profile directory structure:

```
~/.local/share/juejin-browser-profile/
├── Default/
│   ├── Cookies       # Session cookies
│   ├── Local Storage/
│   ├── Session Storage/
│   └── Preferences
└── ...
```

Session is automatically persisted across runs.

## Category Mapping

Juejin uses Chinese category names:

| English (Input) | Chinese (Juejin) | Category ID |
|-----------------|------------------|-------------|
| backend | 后端 | 6809637767543259168 |
| frontend | 前端 | 6809637769958768653 |
| android | Android | 6809637767037300752 |
| ios | iOS | 6809637759720599553 |
| ai | 人工智能 | 6809637727033307650 |
| devtools | 开发工具 | 6809637769877095977 |
| codelife | 代码人生 | 6809637770794494983 |
| reading | 阅读 | 6809637758488961059 |

## Security Implementation

### XSS Prevention

All user content is sanitized using `JSON.stringify()`:

```typescript
export function sanitizeForJavaScript(str: string): string {
  return JSON.stringify(str);
}
```

This prevents:
- Backtick injection
- Quote escaping issues
- Template literal termination
- Newline/whitespace issues

### Example Vulnerability Prevention

**Vulnerable Code** (DON'T DO THIS):
```typescript
el.value = '${title.replace(/'/g, "\\'")}';  // ❌ Backticks can inject code!
```

**Secure Code** (USED):
```typescript
el.value = ${sanitizeForJavaScript(title)};  // ✅ Proper escaping
```

## Platform Support

| Platform | Chrome Path | Status |
|----------|-------------|--------|
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` | ✅ Supported |
| Linux | `/usr/bin/google-chrome` | ✅ Supported |
| Windows | `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe` | ✅ Supported |

## Environment Variables

- `JUEJIN_BROWSER_CHROME_PATH` - Override Chrome executable path
- `XDG_DATA_HOME` - Override data directory (default: `~/.local/share`)

## Error Handling

| Error | Handling |
|-------|-----------|
| Chrome not found | Throws error with setup instructions |
| Login timeout | Waits 5 minutes for manual login |
| Element not found | Tries multiple selectors, throws if all fail |
| CDP connection timeout | Retries up to 30 seconds |

## Performance Characteristics

| Operation | Typical Duration |
|-----------|------------------|
| Chrome launch | 2-3 seconds |
| Page load | 3-5 seconds |
| Login (with saved session) | Instant (already logged in) |
| Title filling | < 1 second |
| Content filling | 1-2 seconds |
| Category/Tags setting | < 1 second |
| Article submission | 2-3 seconds |

Total time: **~10-15 seconds** per article (with saved session).
