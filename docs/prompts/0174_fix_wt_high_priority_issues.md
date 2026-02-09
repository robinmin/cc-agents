---
name: Fix WT High Priority Issues
description: |
  Fix high priority issues in WT plugin: missing error handling, fragile relative imports, hardcoded macOS paths, race conditions, XSS protection, inconsistent error logging, memory leaks, and async pattern inconsistencies.

priority: P1
status: pending
affected_files:
  - plugins/wt/skills/publish-to-wechatmp/scripts/md-to-wechat.ts
  - plugins/wt/skills/publish-to-x/scripts/x-playwright.ts
  - plugins/wt/skills/publish-to-x/scripts/x-video.ts
  - plugins/wt/skills/publish-to-wechatmp/scripts/wechat-article-playwright.ts
  - All WT scripts using console.error for logging
estimated_complexity: medium
---

# 0174. Fix WT High Priority Issues

## Background

A comprehensive code review of the `plugins/wt` folder identified 12 high-priority issues that affect code reliability, cross-platform compatibility, and security. These issues include:

1. **Missing error handling** in download functions (md-to-wechat.ts)
2. **Fragile relative import paths** (`../../../scripts/...`)
3. **Hardcoded macOS-only Chromium path** in x-playwright.ts (line 25)
4. **Race condition** in Chrome cleanup (x-video.ts)
5. **Missing input validation/XSS protection** (wechat-article-playwright.ts)
6. **Inconsistent error logging** (1010+ occurrences of console.error)
7. **Memory leak** - event listeners never removed (cdp.ts)
8. **Unused import detection** needed
9. **Inconsistent async patterns** across codebase

## Requirements

**Functional Requirements:**

### 1. Download Error Handling (md-to-wechat.ts)

- Add try-catch around file download operations
- Handle network timeouts gracefully
- Validate URLs before downloading
- Provide meaningful error messages
- Support retry logic for transient failures

### 2. Import Path Consolidation

- Replace relative imports with absolute imports using `@wt/web-automation`
- Update all files using `../../../scripts/` references
- Ensure TypeScript can resolve new import paths

### 3. Cross-Platform Chromium Detection (x-playwright.ts)

- Remove hardcoded macOS path: `/Users/robin/Library/Caches/ms-playwright/...`
- Use Playwright's built-in executable detection
- Support all platforms: macOS, Windows, Linux
- Fall back to system Chrome if Playwright Chromium not found

### 4. Race Condition Fix (x-video.ts)

- Ensure Chrome process cleanup completes before exit
- Use proper async/await for cleanup operations
- Add timeout for cleanup to prevent hanging

### 5. Input Validation & XSS Protection (wechat-article-playwright.ts)

- Sanitize all user-provided content before DOM injection
- Validate theme parameter against whitelist
- Escape HTML special characters in user content
- Use Content Security Policy where applicable

### 6. Consistent Error Logging

- Create shared logging utility (`@wt/web-automation/src/logger.ts`)
- Replace console.error with structured logger
- Support log levels: DEBUG, INFO, WARN, ERROR
- Include timestamps and context
- Support file output for debugging

### 7. Memory Leak Prevention (cdp.ts)

- Remove event listeners on disconnect
- Clear pending requests on connection close
- Use WeakMap for request tracking to prevent retention
- Add cleanup method to CdpConnection class

### 8. Unused Import Detection

- Add ESLint rule for unused imports
- Configure TypeScript to flag unused declarations
- Run automated check in CI/CD

### 9. Async Pattern Consistency

- Standardize on async/await (no Promise chains)
- Ensure all async functions use proper error handling
- Add AbortController support for cancellable operations

**Non-Functional Requirements:**

- All changes must maintain backward compatibility
- Cross-platform support (macOS, Windows, Linux)
- No breaking changes to public APIs
- Performance must not degrade

**Acceptance Criteria:**

- [ ] Download functions have proper error handling with retries
- [ ] All relative imports replaced with `@wt/web-automation` imports
- [ ] Chromium detection works on all platforms
- [ ] Chrome cleanup has no race conditions
- [ ] User input is sanitized before DOM injection
- [ ] Structured logging utility created and used consistently
- [ ] Event listeners properly cleaned up
- [ ] ESLint/TypeScript flag unused imports
- [ ] Async patterns consistent across codebase

## Design

### 1. Download Error Handling

```typescript
// plugins/wt/skills/publish-to-wechatmp/scripts/md-to-wechat.ts

interface DownloadOptions {
  timeout?: number;
  retries?: number;
  userAgent?: string;
}

async function downloadFile(
  url: string,
  destPath: string,
  options: DownloadOptions = {}
): Promise<void> {
  const { timeout = 30000, retries = 3, userAgent = 'Mozilla/5.0' } = options;

  // Validate URL
  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new Error(`Unsupported protocol: ${validatedUrl.protocol}`);
    }
  } catch (err) {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Retry loop
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await downloadWithTimeout(validatedUrl.href, destPath, timeout, userAgent);
      return; // Success
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries - 1) {
        console.warn(`Download attempt ${attempt + 1} failed, retrying...`);
        await sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw new Error(`Failed to download after ${retries} attempts: ${lastError?.message}`);
}
```

### 2. Shared Logging Utility

```typescript
// plugins/wt/scripts/web-automation/src/logger.ts

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  outputFile?: string;
}

export class Logger {
  constructor(
    private readonly context: string,
    private readonly options: LoggerOptions = {}
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = {
      ...meta,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    };
    this.log(LogLevel.ERROR, message, errorMeta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (level < (this.options.level ?? LogLevel.INFO)) return;

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level];
    const prefix = `[${timestamp}] [${levelStr}] [${this.context}]`;

    const logLine = meta
      ? `${prefix} ${message} ${JSON.stringify(meta)}`
      : `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(logLine);
        break;
      case LogLevel.WARN:
        console.warn(logLine);
        break;
      case LogLevel.DEBUG:
        console.debug(logLine);
        break;
      default:
        console.log(logLine);
    }
  }
}

export function createLogger(context: string, options?: LoggerOptions): Logger {
  return new Logger(context, options);
}
```

### 3. Cross-Platform Chromium Detection

```typescript
// plugins/wt/scripts/web-automation/src/playwright.ts

import { chromium } from 'playwright';
import * as os from 'node:os';
import * as path from 'node:path';

export interface BrowserOptions {
  profileDir?: string;
  headless?: boolean;
  chromiumPath?: string;
}

/**
 * Get Playwright Chromium executable path
 *
 * Uses Playwright's built-in executable detection, which works
 * across all platforms (macOS, Windows, Linux).
 */
export async function getChromiumPath(): Promise<string> {
  const executablePath = chromium.executablePath();
  return executablePath;
}

export async function launchBrowser(options: BrowserOptions = {}) {
  const { profileDir, headless = false, chromiumPath } = options;

  const browser = await chromium.launch({
    headless,
    executablePath: chromiumPath ?? await getChromiumPath(),
    args: profileDir ? [`--user-data-dir=${profileDir}`] : undefined,
  });

  return browser;
}
```

### 4. XSS Protection

```typescript
// plugins/wt/scripts/web-automation/src/sanitize.ts

/**
 * HTML escape for XSS protection
 *
 * Escapes HTML special characters to prevent XSS attacks.
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate theme against whitelist
 */
const VALID_THEMES = ['default', 'grace', 'simple'] as const;
export type ValidTheme = typeof VALID_THEMES[number];

export function isValidTheme(theme: string): theme is ValidTheme {
  return VALID_THEMES.includes(theme as ValidTheme);
}

export function sanitizeTheme(theme: string): ValidTheme {
  if (!isValidTheme(theme)) {
    throw new Error(`Invalid theme: ${theme}. Valid themes: ${VALID_THEMES.join(', ')}`);
  }
  return theme;
}
```

### 5. Memory Leak Prevention

```typescript
// plugins/wt/scripts/web-automation/src/cdp.ts (updated)

export class CdpConnection {
  private ws: import('node:net').Socket | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();
  private eventHandlers: Map<string, Set<Function>> = new Map();

  // ... existing methods ...

  /**
   * Disconnect from Chrome DevTools Protocol
   *
   * Cleans up all resources including event listeners and pending requests.
   */
  disconnect(): void {
    // Remove all event listeners
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.end();
      this.ws = null;
    }

    // Reject all pending requests
    for (const [id, { reject }] of this.pendingRequests) {
      reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    // Clear event handlers
    this.eventHandlers.clear();
  }

  /**
   * Register event handler with automatic cleanup
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    if (this.ws) {
      this.ws.on(event, handler);
    }
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    if (this.ws) {
      this.ws.off(event, handler);
    }
  }
}
```

## Plan

**Phase 1: Create Shared Utilities**
- [ ] Create `plugins/wt/scripts/web-automation/src/logger.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/sanitize.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/playwright.ts`

**Phase 2: Fix Download Error Handling**
- [ ] Add try-catch to downloadFile function
- [ ] Add URL validation
- [ ] Add retry logic with exponential backoff
- [ ] Add timeout handling

**Phase 3: Fix Import Paths**
- [ ] Scan for all relative imports using `../../../`
- [ ] Replace with `@wt/web-automation` imports
- [ ] Update TypeScript path mapping if needed

**Phase 4: Fix Chromium Detection**
- [ ] Remove hardcoded macOS path from x-playwright.ts
- [ ] Use Playwright's executablePath() function
- [ ] Test on multiple platforms

**Phase 5: Fix Race Conditions**
- [ ] Add proper async/await to Chrome cleanup
- [ ] Add timeout for cleanup operations
- [ ] Ensure cleanup completes before exit

**Phase 6: Add XSS Protection**
- [ ] Sanitize user input in wechat-article-playwright.ts
- [ ] Validate theme parameter
- [ ] Escape HTML special characters

**Phase 7: Replace Error Logging**
- [ ] Replace console.error with Logger
- [ ] Add context to all log statements
- [ ] Remove @ts-expect-error where no longer needed

**Phase 8: Fix Memory Leaks**
- [ ] Update CdpConnection disconnect() method
- [ ] Add event handler cleanup
- [ ] Clear pending requests on disconnect

**Phase 9: Enable Unused Import Detection**
- [ ] Configure ESLint rule for unused imports
- [ ] Enable TypeScript noUnusedLocals
- [ ] Run detection and fix issues

**Phase 10: Standardize Async Patterns**
- [ ] Convert Promise chains to async/await
- [ ] Add AbortController support
- [ ] Ensure consistent error handling

**Phase 11: Testing**
- [ ] Test download with invalid URL
- [ ] Test download with network timeout
- [ ] Test on macOS, Windows, Linux
- [ ] Test XSS with malicious input
- [ ] Test logging output format

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Logger Utility | plugins/wt/scripts/web-automation/src/logger.ts | This task | 2026-02-07 |
| Sanitize Utility | plugins/wt/scripts/web-automation/src/sanitize.ts | This task | 2026-02-07 |
| Playwright Utility | plugins/wt/scripts/web-automation/src/playwright.ts | This task | 2026-02-07 |
| Updated CDP | plugins/wt/scripts/web-automation/src/cdp.ts | This task | 2026-02-07 |
| Updated Scripts | Various skill scripts | This task | 2026-02-07 |

## References

- [Task 0171](/docs/prompts/0171_fix_wt_critical_cdp_code_duplication.md) - Related CDP task
- [Task 0173](/docs/prompts/0173_fix_wt_critical_package_dependency_path.md) - Workspace configuration
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) - XSS prevention guidelines
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) - Error handling patterns
