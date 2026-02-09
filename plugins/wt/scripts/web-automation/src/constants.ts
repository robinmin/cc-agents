/**
 * Configuration constants for WT web automation
 *
 * Centralizes all timeout values, retry counts, and other magic numbers
 * used across the WT publishing skills. Supports environment variable overrides.
 */

// ============================================================================
// Timeouts (milliseconds)
// ============================================================================

/**
 * Default timeout for network requests (30 seconds)
 */
export const DEFAULT_NETWORK_TIMEOUT = 30000;

/**
 * Default timeout for waiting for DOM elements (10 seconds)
 */
export const DEFAULT_WAIT_TIMEOUT = 10000;

/**
 * Default timeout for page navigation (60 seconds)
 */
export const DEFAULT_NAVIGATION_TIMEOUT = 60000;

/**
 * Default timeout for Chrome DevTools Protocol operations (30 seconds)
 */
export const DEFAULT_CDP_TIMEOUT = 30000;

/**
 * Extended timeout for video upload processing (3 minutes)
 */
export const DEFAULT_VIDEO_UPLOAD_TIMEOUT = 180000;

/**
 * Default timeout for login completion (5 minutes)
 */
export const DEFAULT_LOGIN_TIMEOUT = 300000;

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Default retry count for transient failures
 */
export const DEFAULT_RETRY_COUNT = 3;

/**
 * Default delay between retries in milliseconds (1 second)
 */
export const DEFAULT_RETRY_DELAY = 1000;

/**
 * Exponential backoff multiplier for retries
 */
export const DEFAULT_RETRY_BACKOFF_MULTIPLIER = 2;

// ============================================================================
// File Operations
// ============================================================================

/**
 * Default download chunk size (64KB)
 */
export const DEFAULT_DOWNLOAD_CHUNK_SIZE = 64 * 1024;

/**
 * Maximum file size for uploads (50MB)
 */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Image upload timeout (10 seconds)
 */
export const DEFAULT_IMAGE_UPLOAD_TIMEOUT = 10000;

// ============================================================================
// Browser Configuration
// ============================================================================

/**
 * Default browser viewport width
 */
export const DEFAULT_VIEWPORT_WIDTH = 1280;

/**
 * Default browser viewport height
 */
export const DEFAULT_VIEWPORT_HEIGHT = 900;

/**
 * Default Playwright slowMo setting (milliseconds between actions)
 */
export const DEFAULT_SLOW_MO = 100;

// ============================================================================
// User Agents
// ============================================================================

/**
 * Platform-specific user agent strings
 */
export const USER_AGENTS = {
  /**
   * Generic user agent (cross-platform)
   */
  DEFAULT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  /**
   * Chrome-specific user agent
   */
  CHROME: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

  /**
   * Safari-specific user agent (macOS)
   */
  SAFARI: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
} as const;

// ============================================================================
// Platform Configuration
// ============================================================================

/**
 * Valid theme names for WeChat MP articles
 */
export const VALID_THEMES = ['default', 'grace', 'simple'] as const;

/**
 * Valid image formats for upload
 */
export const VALID_IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;

/**
 * Valid video formats for upload
 */
export const VALID_VIDEO_FORMATS = ['mp4', 'mov', 'webm'] as const;

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get timeout value from environment variable or default
 *
 * @param envVar - Environment variable name
 * @param defaultValue - Default timeout in milliseconds
 * @returns Timeout value in milliseconds
 */
export function getTimeoutFromEnv(envVar: string, defaultValue: number): number {
  const value = process.env[envVar];
  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return defaultValue;

  return parsed;
}

/**
 * Get boolean flag from environment variable
 *
 * @param envVar - Environment variable name
 * @param defaultValue - Default value
 * @returns Boolean value
 */
export function getBooleanFromEnv(envVar: string, defaultValue: boolean): boolean {
  const value = process.env[envVar];
  if (!value) return defaultValue;

  return value.toLowerCase() === 'true' || value === '1';
}
