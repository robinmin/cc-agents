# Technical Details: XHS Publishing

## Table of Contents

- [Implementation Overview](#implementation-overview)
- [Architecture](#architecture)
  - [Components](#components)
  - [CDP Session Management](#cdp-session-management)
- [DOM Selectors](#dom-selectors)
  - [Title Input](#title-input)
  - [Content Editor](#content-editor)
  - [Buttons](#buttons)
- [Publishing Workflow](#publishing-workflow)
  - [1. Launch Chrome](#1-launch-chrome)
  - [2. Get Page Session](#2-get-page-session)
  - [3. Check Login Status](#3-check-login-status)
  - [4. Wait for Editor](#4-wait-for-editor)
  - [5. Fill Article Fields](#5-fill-article-fields)
  - [6. Submit Article](#6-submit-article)
- [JavaScript Injection Safety](#javascript-injection-safety)
- [Chrome Profile Management](#chrome-profile-management)
  - [Default Location](#default-location)
  - [Profile Contents](#profile-contents)
  - [Session Persistence](#session-persistence)
- [Platform Support](#platform-support)
  - [macOS](#macos)
  - [Linux](#linux)
  - [Windows](#windows)
- [Error Handling](#error-handling)
  - [Element Not Found](#element-not-found)
  - [Login Timeout](#login-timeout)
  - [Chrome Not Found](#chrome-not-found)
- [Debugging](#debugging)
  - [Enable Debug Logging](#enable-debug-logging)
  - [CDP Logs](#cdp-logs)
  - [Manual Inspection](#manual-inspection)
- [Configuration](#configuration)
  - [WT Config (~/.claude/wt/config.jsonc)](#wt-config-claudewtconfigjsonc)
  - [Environment Variables](#environment-variables)
- [Performance](#performance)
  - [Timing Breakdown](#timing-breakdown)
  - [Total Time](#total-time)

---

## Implementation Overview

The XHS publishing skill uses Chrome DevTools Protocol (CDP) to automate the browser-based publishing workflow on Xiaohongshu.com.

## Architecture

### Components

1. **xhs-article.ts** - Main publishing workflow
2. **xhs-utils.ts** - XHS-specific utilities (config, URLs, parsing)
3. **cdp.ts** - Chrome DevTools Protocol abstraction layer

### CDP Session Management

```
launchChrome()
    -> spawns Chrome with --remote-debugging-port
    -> waits for debug port to be ready
    -> connects via WebSocket

getPageSession()
    -> finds page target by URL pattern
    -> attaches to target
    -> enables required domains (Page, Runtime, DOM)
```

## DOM Selectors

XHS uses dynamic class names and React-style rendering. Multiple fallback selectors are provided for each element type:

### Title Input
```javascript
const XHS_SELECTORS.titleInput = [
  'input[placeholder*="填写标题" i]',
  'input[placeholder*="title" i]',
  'input[type="text"][class*="title"]',
  'textarea[placeholder*="填写标题" i]',
  'input[name="title"]',
  '.article-title-input',
  '.title-input',
];
```

### Content Editor
```javascript
const XHS_SELECTORS.contentEditor = [
  '.CodeMirror',
  '.editor-content',
  '[contenteditable="true"][class*="editor"]',
  '[contenteditable="true"][class*="public-DraftEditor-content"]',
  '[data-testid="editor"]',
  '.markdown-editor',
  '.rich-text-editor',
  '.note-editor',
];
```

### Buttons
```javascript
const XHS_SELECTORS.publishButton = [
  'button[type="submit"]',
  'button:contains("发布")',
  'button:contains("确定")',
  '[data-testid="publish-button"]',
  '.publish-button',
  '.submit-button',
];
```

## Publishing Workflow

### 1. Launch Chrome
```javascript
const { cdp, chrome } = await launchChrome(url, profileDir);
```
- Spawns Chrome/Chromium with user profile
- Enables remote debugging on free port
- Connects via WebSocket to CDP

### 2. Get Page Session
```javascript
const session = await getPageSession(cdp, 'xiaohongshu.com');
```
- Finds page target matching URL pattern
- Attaches to target and gets session ID
- Enables Page, Runtime, and DOM domains

### 3. Check Login Status
```javascript
const isLoggedIn = await checkLoginStatus(session);
```
- Checks current URL
- Looks for logged-in indicators (avatar, logout button)
- Waits for manual login if not authenticated

### 4. Wait for Editor
```javascript
await waitForPageReady(session);
```
- Waits for document.readyState === 'complete'
- Checks for editor elements to be present
- 20 second timeout with 200ms polling

### 5. Fill Article Fields
```javascript
await fillTitle(session, article.title);
await fillSubtitle(session, article.subtitle);
await fillContent(session, article.content);
await setCategory(session, article.category);
await addTags(session, article.tags);
```

Each field fill operation:
1. Finds element using selector fallback
2. Clears existing content
3. Focuses element
4. Sets value with proper escaping
5. Triggers input/change events

### 6. Submit Article
```javascript
const articleUrl = await submitArticle(session, asDraft);
```
- Finds publish or draft button
- Clicks button via CDP
- Falls back to Ctrl/Cmd + S keyboard shortcut
- Waits for navigation/completion
- Returns article URL

## JavaScript Injection Safety

User content is sanitized before injection into the browser context:

```javascript
export function sanitizeForJavaScript(str: string): string {
  return JSON.stringify(str);
}
```

This prevents XSS attacks by properly escaping:
- Backticks
- Quotes (single and double)
- Backslashes
- Newlines and other special characters

## Chrome Profile Management

### Default Location
```
~/.local/share/xhs-browser-profile/
```

### Profile Contents
- Cookies (for session persistence)
- Local storage
- Browser cache
- Extensions and themes

### Session Persistence
Login sessions are stored in the Chrome profile. First run requires manual login via SMS verification. Subsequent runs use the saved session.

## Platform Support

### macOS
```
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
/Applications/Chromium.app/Contents/MacOS/Chromium
```

### Linux
```
/usr/bin/google-chrome
/usr/bin/google-chrome-stable
/usr/bin/chromium
/usr/bin/chromium-browser
/snap/bin/chromium
```

### Windows
```
C:\Program Files\Google\Chrome\Application\chrome.exe
C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
C:\Program Files\Microsoft\Edge\Application\msedge.exe
```

## Error Handling

### Element Not Found
```
Error: Element not found. Tried selectors: ...
```
- All selectors in the fallback list failed
- Element may not be present on the page
- DOM structure may have changed

### Login Timeout
```
Error: Login timeout. Please run the script again after logging in.
```
- 5 minute timeout exceeded
- User did not complete manual login
- Run script again after logging in

### Chrome Not Found
```
Error: Chrome not found. Set XHS_BROWSER_CHROME_PATH env var.
```
- No Chrome installation detected
- Set environment variable to Chrome executable path

## Debugging

### Enable Debug Logging
```bash
DEBUG=xhs:* npx -y bun xhs-article.ts --markdown article.md
```

### CDP Logs
```javascript
console.log('[cdp] Launching Chrome (profile: ${profile})');
console.log('[xhs] Current URL: ${currentUrl}');
```

### Manual Inspection
The script leaves Chrome open after completion for manual inspection. Close Chrome manually when done.

## Configuration

### WT Config (~/.claude/wt/config.jsonc)
```jsonc
{
  "publish-to-xhs": {
    "profile_dir": "~/.local/share/xhs-browser-profile",
    "auto_publish": false
  }
}
```

### Environment Variables
- `XHS_BROWSER_CHROME_PATH` - Override Chrome executable path
- `DEBUG` - Enable debug logging

## Performance

### Timing Breakdown
- Chrome launch: ~2-3 seconds
- CDP connection: ~500ms
- Page load: ~5-10 seconds (network dependent)
- Editor ready: ~2-5 seconds
- Field filling: ~500ms per field
- Submit: ~3-5 seconds

### Total Time
Typical publish time: 15-30 seconds (draft), 20-40 seconds (publish)
