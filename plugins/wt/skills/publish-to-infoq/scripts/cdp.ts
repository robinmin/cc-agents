/**
 * Chrome DevTools Protocol (CDP) utilities for InfoQ browser automation
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
// InfoQ-Specific Utilities
// ============================================================================

/**
 * Get default profile directory for InfoQ browser
 */
export function getDefaultProfileDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'infoq-browser-profile');
}

/**
 * Find Chrome executable for InfoQ with platform-specific override
 * Checks INFOQ_BROWSER_CHROME_PATH environment variable first
 */
export function findInfoQChrome(): string | undefined {
  return findChromeExecutable(CHROME_CANDIDATES_FULL, 'INFOQ_BROWSER_CHROME_PATH');
}
