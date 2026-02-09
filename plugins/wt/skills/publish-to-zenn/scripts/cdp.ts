/**
 * Chrome DevTools Protocol (CDP) utilities for Zenn browser automation
 *
 * This module now imports from the shared @wt/web-automation package
 * to avoid code duplication across publishing skills.
 */

import * as os from 'node:os';
import * as path from 'node:path';
import * as process from 'node:process';

// Re-export all CDP utilities from shared module
export {
  sleep,
  getFreePort,
  findChromeExecutable,
  waitForChromeDebugPort,
  CdpConnection,
  launchChrome,
  getPageSession,
  waitForNewTab,
  clickElement,
  typeText,
  pasteFromClipboard,
  evaluate,
  waitForElement,
  getElementText,
  elementExists,
  navigate,
  getCurrentUrl,
  getPageTitle,
  screenshot,
  pressKey,
  sendText,
  scroll,
  retry,
  type ChromeSession,
  type CdpOptions,
  type PlatformCandidates,
  type ScreenshotOptions,
  CHROME_CANDIDATES_FULL,
  CHROME_CANDIDATES_BASIC,
  getDefaultProfileDir as getSharedDefaultProfileDir,
} from '@wt/web-automation/cdp';

// ============================================================================
// Zenn-Specific Utilities
// ============================================================================

/**
 * Get default profile directory for Zenn browser
 */
export function getDefaultProfileDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'zenn-browser-profile');
}

/**
 * Find Chrome executable for Zenn with platform-specific override
 * Checks ZENN_BROWSER_CHROME_PATH environment variable first
 */
export function findZennChrome(): string | undefined {
  return findChromeExecutable(CHROME_CANDIDATES_FULL, 'ZENN_BROWSER_CHROME_PATH');
}
