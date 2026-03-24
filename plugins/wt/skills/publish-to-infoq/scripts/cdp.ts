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
    CdpConnection,
    type CdpOptions,
    CHROME_CANDIDATES_BASIC,
    CHROME_CANDIDATES_FULL,
    type ChromeSession,
    clickElement,
    elementExists,
    evaluate,
    findChromeExecutable,
    getCurrentUrl,
    getDefaultProfileDir as getSharedDefaultProfileDir,
    getElementText,
    getFreePort,
    getPageSession,
    getPageTitle,
    launchChrome,
    navigate,
    type PlatformCandidates,
    pasteFromClipboard,
    pressKey,
    retry,
    type ScreenshotOptions,
    screenshot,
    scroll,
    sendText,
    sleep,
    typeText,
    waitForChromeDebugPort,
    waitForElement,
    waitForNewTab,
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
