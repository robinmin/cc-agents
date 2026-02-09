/**
 * Custom error types for WT web automation
 *
 * Provides consistent error types across all WT publishing skills
 * with error codes for programmatic handling and context for debugging.
 */

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all WT automation errors
 *
 * All custom errors extend this class to provide consistent error handling
 * with error codes and contextual information.
 *
 * @example
 * ```typescript
 * throw new WtAutomationError('Something went wrong', 'CUSTOM_CODE', { url, attempt });
 * ```
 */
export class WtAutomationError extends Error {
  /**
   * Create a new WT automation error
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param context - Additional context for debugging
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * Get full error details as JSON
   *
   * Useful for logging and error reporting.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack,
    };
  }
}

// ============================================================================
// Network Errors
// ============================================================================

/**
 * Thrown when network request fails
 *
 * Used for HTTP requests, downloads, and other network operations.
 */
export class NetworkError extends WtAutomationError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', { statusCode, ...context });
  }
}

/**
 * Network timeout error - extends NetworkError
 */
export class NetworkTimeoutError extends NetworkError {
  readonly timeoutMs: number;

  constructor(
    message: string,
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    // Pass undefined for statusCode, then override code
    super(message, undefined, { timeoutMs, ...context });
    this.timeoutMs = timeoutMs;
    // Override error code
    Object.defineProperty(this, 'code', {
      value: 'NETWORK_TIMEOUT',
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}

// ============================================================================
// DOM/Browser Errors
// ============================================================================

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
 * Thrown when timeout occurs while waiting for element or page state
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
 * Thrown when browser fails to launch
 */
export class BrowserLaunchError extends WtAutomationError {
  constructor(
    message: string,
    public readonly executablePath?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'BROWSER_LAUNCH_ERROR', { executablePath, ...context });
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Thrown when input validation fails
 */
export class ValidationError extends WtAutomationError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', { field, value, ...context });
  }
}

/**
 * Thrown when URL validation fails
 */
export class UrlValidationError extends ValidationError {
  constructor(
    url: string,
    reason: string = 'Invalid URL',
    context?: Record<string, unknown>
  ) {
    super(`${reason}: ${url}`, 'url', url, context);
    // Use INVALID_URL code via parent constructor
    Object.defineProperty(this, 'code', {
      value: 'INVALID_URL',
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}

/**
 * Thrown when file validation fails
 */
export class FileValidationError extends ValidationError {
  constructor(
    filePath: string,
    reason: string = 'Invalid file',
    code: string = 'INVALID_FILE',
    context?: Record<string, unknown>
  ) {
    // Call parent constructor with proper ValidationError signature: (message, field, value?, context?)
    // We pass the code as the 'value' parameter temporarily
    super(`${reason}: ${filePath}`, 'file', code, context);
    // Override the code property to be at the top level (not inside field)
    Object.defineProperty(this, 'code', {
      value: code,
      writable: false,
      enumerable: true,
      configurable: true,
    });
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Thrown when authentication fails
 */
export class AuthenticationError extends WtAutomationError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(message, 'AUTHENTICATION_ERROR', context);
  }
}

/**
 * Thrown when login times out
 */
export class LoginTimeoutError extends AuthenticationError {
  readonly timeoutMs: number;

  constructor(
    timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(`Login timeout after ${timeoutMs}ms`, { timeoutMs, ...context });
    this.timeoutMs = timeoutMs;
    // Override code
    Object.defineProperty(this, 'code', {
      value: 'LOGIN_TIMEOUT',
      writable: false,
      enumerable: true,
      configurable: false,
    });
  }
}

// ============================================================================
// Upload/Content Errors
// ============================================================================

/**
 * Thrown when content upload fails
 */
export class UploadError extends WtAutomationError {
  constructor(
    message: string,
    public readonly filePath?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'UPLOAD_ERROR', { filePath, ...context });
  }
}

/**
 * Thrown when file size exceeds limit
 */
export class FileSizeError extends FileValidationError {
  readonly maxSize: number;
  readonly actualSize: number;

  constructor(
    filePath: string,
    maxSize: number,
    actualSize: number,
    context?: Record<string, unknown>
  ) {
    const reason = `File size ${(actualSize / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
    super(filePath, reason, 'FILE_TOO_LARGE', { maxSize, actualSize, ...context });
    this.maxSize = maxSize;
    this.actualSize = actualSize;
  }
}

/**
 * Thrown when file format is not supported
 */
export class FileFormatError extends FileValidationError {
  readonly allowedFormats: readonly string[];

  constructor(
    filePath: string,
    allowedFormats: readonly string[],
    context?: Record<string, unknown>
  ) {
    const ext = filePath.split('.').pop() || 'unknown';
    const reason = `File format ".${ext}" not supported. Allowed: ${allowedFormats.join(', ')}`;
    super(filePath, reason, 'INVALID_FORMAT', { allowedFormats, ...context });
    this.allowedFormats = allowedFormats;
  }
}

// ============================================================================
// Error Helper Functions
// ============================================================================

/**
 * Check if an error is a WT automation error
 *
 * @param err - Error to check
 * @returns True if error is an instance of WtAutomationError
 */
export function isWtAutomationError(err: unknown): err is WtAutomationError {
  return err instanceof WtAutomationError;
}

/**
 * Get error code from any error
 *
 * @param err - Error to extract code from
 * @returns Error code or 'UNKNOWN' if not a WT error
 */
export function getErrorCode(err: unknown): string {
  if (isWtAutomationError(err)) {
    return err.code;
  }
  return 'UNKNOWN';
}

/**
 * Get error context from any error
 *
 * @param err - Error to extract context from
 * @returns Error context or undefined
 */
export function getErrorContext(err: unknown): Record<string, unknown> | undefined {
  if (isWtAutomationError(err)) {
    return err.context;
  }
  return undefined;
}

/**
 * Wrap unknown error in a WT automation error
 *
 * Useful for catching and re-throwing errors with proper context.
 *
 * @param err - Original error
 * @param code - Error code for wrapped error
 * @param message - New error message (optional)
 * @returns WT automation error
 */
export function wrapError(
  err: unknown,
  code: string,
  message?: string
): WtAutomationError {
  if (isWtAutomationError(err)) {
    return err;
  }

  const originalMessage = err instanceof Error ? err.message : String(err);
  const newMessage = message || originalMessage;

  return new WtAutomationError(newMessage, code, {
    originalError: originalMessage,
    originalStack: err instanceof Error ? err.stack : undefined,
  });
}
