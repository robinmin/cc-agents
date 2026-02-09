---
name: Fix WT Code Quality Improvements
description: |
  Fix medium priority code quality issues: missing JSDoc comments, inconsistent naming conventions, file descriptor leak risks, hardcoded timeout values, inconsistent selector strategies, missing AbortController, inconsistent error types, and incomplete implementations.

priority: P2
status: pending
affected_files:
  - All TypeScript files in plugins/wt/skills/publish-to-*/
  - All utility files in plugins/wt/scripts/
estimated_complexity: medium
---

# 0175. Fix WT Code Quality Improvements

## Background

A comprehensive code review identified 18 medium-priority code quality issues across the `plugins/wt` folder. While not critical, these issues affect code maintainability, developer experience, and long-term code health:

1. **Missing JSDoc comments** - Many functions lack documentation
2. **Inconsistent naming conventions** - Mixed camelCase, snake_case, PascalCase
3. **File descriptor leak risks** - Streams not properly closed
4. **Hardcoded timeout values** - Magic numbers scattered throughout code
5. **Inconsistent selector strategies** - No unified approach to DOM selectors
6. **Missing AbortController** - Operations cannot be cancelled
7. **Inconsistent error types** - Mixed Error, string, and custom error types
8. **Uncompleted implementations** - Placeholder code remains

## Requirements

**Functional Requirements:**

### 1. JSDoc Documentation

- Add JSDoc comments to all exported functions
- Document parameters with @param tags
- Document return types with @returns tags
- Add @throws tags for functions that throw
- Include @example tags for complex functions
- Document interfaces and types

### 2. Naming Convention Standardization

- Use camelCase for variables and functions
- Use PascalCase for classes, interfaces, types
- Use UPPER_SNAKE_CASE for constants
- Rename inconsistent identifiers to match conventions
- Update all references when renaming

### 3. File Descriptor Management

- Ensure all streams are properly closed
- Use try-finally or try-with-resources patterns
- Add cleanup handlers for file handles
- Test for file descriptor leaks

### 4. Configuration Management

- Extract hardcoded timeouts to configuration
- Create constants.ts for magic numbers
- Support environment variable overrides
- Document configuration options

### 5. Selector Strategy Unification

- Create shared selector utilities
- Document selector patterns for each platform
- Add fallback strategies for robustness
- Support multiple selector types (CSS, XPath, test-id)

### 6. Cancellation Support

- Add AbortController to long-running operations
- Support cancellation tokens throughout
- Clean up resources on abort
- Document cancellation behavior

### 7. Error Type Consistency

- Define custom error types
- Use consistent error types across codebase
- Include error codes for programmatic handling
- Add error context and stack traces

### 8. Complete Placeholder Implementations

- Implement TODO placeholders
- Add tests for new implementations
- Document any intentionally unimplemented features

**Non-Functional Requirements:**

- Maintain backward compatibility
- No performance degradation
- Code should be self-documenting with JSDoc

**Acceptance Criteria:**

- [ ] All exported functions have JSDoc comments
- [ ] Naming follows TypeScript conventions consistently
- [ ] All streams properly closed in error cases
- [ ] No hardcoded timeouts (use constants)
- [ ] Selector utilities created and used
- [ ] AbortController supported where applicable
- [ ] Custom error types defined and used
- [ ] All TODO/placeholder implementations completed

## Design

### 1. JSDoc Template

```typescript
/**
 * Brief description of the function.
 *
 * Longer description with usage notes and important details.
 * Can span multiple lines.
 *
 * @param paramName - Description of parameter
 * @param optionalParam - Optional parameter description
 * @returns Description of return value
 * @throws {ErrorType} Description of when this error is thrown
 *
 * @example
 * ```typescript
 * const result = await myFunction('arg', { option: true });
 * console.log(result);
 * ```
 */
export async function myFunction(
  paramName: string,
  optionalParam?: Options
): Promise<Result> {
  // Implementation
}
```

### 2. Constants File

```typescript
// plugins/wt/scripts/web-automation/src/constants.ts

/**
 * Default timeout for network requests (milliseconds)
 */
export const DEFAULT_NETWORK_TIMEOUT = 30000;

/**
 * Default timeout for element waiting (milliseconds)
 */
export const DEFAULT_WAIT_TIMEOUT = 10000;

/**
 * Default timeout for page navigation (milliseconds)
 */
export const DEFAULT_NAVIGATION_TIMEOUT = 60000;

/**
 * Default retry count for transient failures
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * Default delay between retries (milliseconds)
 */
export const DEFAULT_RETRY_DELAY = 1000;

/**
 * Default download chunk size (bytes)
 */
export const DEFAULT_DOWNLOAD_CHUNK_SIZE = 64 * 1024;

/**
 * Platform-specific user agents
 */
export const USER_AGENTS = {
  DEFAULT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  CHROME: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
  SAFARI: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15',
} as const;
```

### 3. Custom Error Types

```typescript
// plugins/wt/scripts/web-automation/src/errors.ts

/**
 * Base error class for all WT automation errors
 */
export class WtAutomationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when network request fails
 */
export class NetworkError extends WtAutomationError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', context);
  }
}

/**
 * Thrown when element cannot be found in DOM
 */
export class ElementNotFoundError extends WtAutomationError {
  constructor(
    message: string,
    public readonly selector: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'ELEMENT_NOT_FOUND', { selector, ...context });
  }
}

/**
 * Thrown when timeout occurs
 */
export class TimeoutError extends WtAutomationError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT', { timeoutMs, ...context });
  }
}

/**
 * Thrown when validation fails
 */
export class ValidationError extends WtAutomationError {
  constructor(
    message: string,
    public readonly field: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
  }
}
```

### 4. Selector Utilities

```typescript
// plugins/wt/scripts/web-automation/src/selectors.ts

/**
 * Selector strategy types
 */
export type SelectorStrategy =
  | 'css'           // CSS selector
  | 'xpath'         // XPath expression
  | 'test-id'       // Test ID attribute
  | 'data-testid'   // data-testid attribute
  | 'aria-label'    // ARIA label
  | 'text';         // Text content

/**
 * Selector configuration
 */
export interface SelectorOptions {
  strategy?: SelectorStrategy;
  timeout?: number;
  visible?: boolean;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
}

/**
 * Create a multi-strategy selector for robust element finding
 *
 * Tries multiple selector strategies in order until one succeeds.
 *
 * @param selectors - Array of selector strings or objects
 * @param options - Selector options
 * @returns Element if found, null otherwise
 *
 * @example
 * ```typescript
 * const button = await trySelectors([
 *   '[data-testid="submit-button"]',
 *   'button[type="submit"]',
 *   '#submit'
 * ], { timeout: 5000 });
 * ```
 */
export async function trySelectors(
  selectors: string[],
  options: SelectorOptions = {}
): Promise<Element | null> {
  const { timeout = 5000, visible = true } = options;

  const startTime = Date.now();

  for (const selector of selectors) {
    try {
      const element = await findElement(selector, {
        timeout: Math.max(0, timeout - (Date.now() - startTime)),
        visible,
      });
      if (element) return element;
    } catch {
      // Try next selector
      continue;
    }
  }

  return null;
}

/**
 * Platform-specific selector builders
 */
export const Selectors = {
  X: {
    tweetButton: '[data-testid="tweetButton"]',
    tweetTextarea: '[data-testid="tweetTextarea_0"]',
  },

  WeChatMP: {
    editorFrame: '#edui1_iframeholder',
    titleInput: '#title',
    submitButton: '.btn-pub',
  },

  Juejin: {
    editor: '.markdown-body',
    publishButton: '.publish-btn',
  },
} as const;
```

### 5. File Descriptor Management

```typescript
// plugins/wt/scripts/web-automation/src/fs.ts

/**
 * Safely write file with automatic cleanup
 *
 * Ensures file handle is closed even on error.
 *
 * @param path - File path
 * @param content - Content to write
 * @param encoding - File encoding
 */
export async function safeWriteFile(
  path: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  let handle: import('node:fs/promises').FileHandle | null = null;

  try {
    handle = await import('node:fs/promises').then(fs => fs.open(path, 'w'));
    await handle.writeFile(content, { encoding });
  } finally {
    await handle?.close();
  }
}

/**
 * Safely read file with automatic cleanup
 */
export async function safeReadFile(
  path: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  let handle: import('node:fs/promises').FileHandle | null = null;

  try {
    handle = await import('node:fs/promises').then(fs => fs.open(path, 'r'));
    const { buffer } = await handle.read();
    return buffer.toString(encoding);
  } finally {
    await handle?.close();
  }
}

/**
 * Process stream with automatic cleanup
 */
export async function processStream(
  stream: import('node:stream').Readable,
  processor: (chunk: Buffer) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    stream.on('data', processor);
    stream.on('end', resolve);
    stream.on('error', reject);

    // Ensure stream is cleaned up
    stream.on('close', () => {
      stream.removeAllListeners();
    });
  });
}
```

### 6. AbortController Integration

```typescript
// plugins/wt/scripts/web-automation/src/async.ts

/**
 * Options for cancellable operations
 */
export interface CancellableOptions {
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Create timeout with abort support
 *
 * @param ms - Timeout in milliseconds
 * @param signal - Optional abort signal
 * @returns Promise that rejects on timeout or abort
 */
export function createTimeout(
  ms: number,
  signal?: AbortSignal
): Promise<never> {
  return new Promise((_, reject) => {
    const timeout = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${ms}ms`, ms));
    }, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Operation was aborted'));
    }, { once: true });
  });
}

/**
 * Race with timeout and abort
 *
 * @param promise - The promise to race
 * @param options - Timeout and abort options
 * @returns The promise result or throws timeout/abort error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: CancellableOptions = {}
): Promise<T> {
  const { signal, timeout = 30000 } = options;

  if (signal?.aborted) {
    throw new Error('Operation was aborted');
  }

  return Promise.race([
    promise,
    createTimeout(timeout, signal),
  ]);
}
```

## Plan

**Phase 1: Create Shared Utilities**
- [ ] Create `plugins/wt/scripts/web-automation/src/constants.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/errors.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/selectors.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/fs.ts`
- [ ] Create `plugins/wt/scripts/web-automation/src/async.ts`

**Phase 2: Add JSDoc Documentation**
- [ ] Add JSDoc to all exported functions in cdp.ts
- [ ] Add JSDoc to all exported functions in paste.ts
- [ ] Add JSDoc to all exported functions in playwright.ts
- [ ] Add JSDoc to all skill-specific scripts

**Phase 3: Standardize Naming**
- [ ] Audit all variables and functions for naming issues
- [ ] Rename to follow TypeScript conventions
- [ ] Update all references

**Phase 4: Replace Hardcoded Values**
- [ ] Replace hardcoded timeouts with constants
- [ ] Replace magic numbers with named constants
- [ ] Add environment variable support for overrides

**Phase 5: Add AbortController Support**
- [ ] Add signal parameter to long-running functions
- [ ] Implement abort handlers
- [ ] Add cleanup on abort

**Phase 6: Use Custom Error Types**
- [ ] Replace generic Error with custom types
- [ ] Add error codes to all errors
- [ ] Include context in error objects

**Phase 7: Fix File Descriptor Leaks**
- [ ] Audit all file operations
- [ ] Add proper cleanup handlers
- [ ] Test for file descriptor leaks

**Phase 8: Complete Placeholder Implementations**
- [ ] Find all TODO/FIXME comments
- [ ] Implement or remove placeholder code
- [ ] Add tests for new implementations

**Phase 9: Testing**
- [ ] Verify JSDoc renders correctly in IDE
- [ ] Test error handling with custom error types
- [ ] Test AbortController cancellation
- [ ] Verify file descriptor cleanup

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Constants | plugins/wt/scripts/web-automation/src/constants.ts | This task | 2026-02-07 |
| Errors | plugins/wt/scripts/web-automation/src/errors.ts | This task | 2026-02-07 |
| Selectors | plugins/wt/scripts/web-automation/src/selectors.ts | This task | 2026-02-07 |
| File System | plugins/wt/scripts/web-automation/src/fs.ts | This task | 2026-02-07 |
| Async Utilities | plugins/wt/scripts/web-automation/src/async.ts | This task | 2026-02-07 |

## References

- [Task 0174](/docs/prompts/0174_fix_wt_high_priority_issues.md) - High priority fixes
- [JSDoc Documentation](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) - TypeScript JSDoc reference
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html) - Best practices
- [AbortController API](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - MDN documentation
