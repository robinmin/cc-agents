/**
 * Input sanitization and XSS protection utilities
 *
 * Provides functions to sanitize user input and prevent XSS attacks.
 * Used when injecting user-provided content into DOM.
 */

/**
 * HTML escape for XSS protection
 *
 * Escapes HTML special characters to prevent XSS attacks.
 * Use this function before injecting user content into HTML.
 *
 * @param unsafe - Potentially unsafe user input
 * @returns HTML-escaped string
 *
 * @example
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = escapeHtml(userInput); // "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;"
 */
export function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Escape HTML attribute value
 *
 * Similar to escapeHtml but optimized for attribute values.
 * Uses entity encoding that works within HTML attribute context.
 */
export function escapeHtmlAttribute(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Valid theme names for WeChat MP articles
 */
const VALID_THEMES = ['default', 'grace', 'simple'] as const;
export type ValidTheme = typeof VALID_THEMES[number];

/**
 * Check if theme string is valid
 *
 * @param theme - Theme name to validate
 * @returns true if theme is valid
 */
export function isValidTheme(theme: string): theme is ValidTheme {
  return VALID_THEMES.includes(theme as ValidTheme);
}

/**
 * Validate and return theme
 *
 * Throws error if theme is not valid.
 *
 * @param theme - Theme name to validate
 * @returns The validated theme name
 * @throws Error if theme is invalid
 */
export function sanitizeTheme(theme: string): ValidTheme {
  if (!isValidTheme(theme)) {
    throw new Error(
      `Invalid theme: ${theme}. Valid themes: ${VALID_THEMES.join(', ')}`
    );
  }
  return theme;
}

/**
 * Alias for sanitizeTheme for backward compatibility
 *
 * @param theme - Theme name to validate
 * @returns The validated theme name
 * @throws Error if theme is invalid
 */
export const validateTheme = sanitizeTheme;

/**
 * Get valid theme with fallback
 *
 * Returns fallback if theme is undefined, otherwise validates and returns theme.
 *
 * @param theme - Theme parameter (may be undefined)
 * @param fallback - Default theme if parameter is undefined
 * @returns Valid theme name
 * @throws Error if theme is invalid (not undefined and not in whitelist)
 */
export function getValidTheme(theme: string | undefined, fallback: ValidTheme = 'default'): ValidTheme {
  if (!theme) {
    return fallback;
  }
  return validateTheme(theme);
}

/**
 * Sanitize URL for use in href/src attributes
 *
 * Ensures URL uses safe protocol (http, https, mailto, tel).
 * Returns javascript: void(0) for unsafe URLs.
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or safe fallback
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    if (!safeProtocols.includes(parsed.protocol)) {
      return 'javascript:void(0)';
    }
    return url;
  } catch {
    return 'javascript:void(0)';
  }
}

/**
 * Strip HTML tags from string
 *
 * Removes all HTML tags, leaving only text content.
 *
 * @param html - String with HTML tags
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Truncate string to maximum length
 *
 * Useful for preventing excessive content length.
 *
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add when truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}
