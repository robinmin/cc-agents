/**
 * Chrome DevTools Protocol (CDP) utilities for XHS browser automation
 *
 * This module now imports from the shared @wt/web-automation package
 * to avoid code duplication across publishing skills.
 */

import * as os from "node:os";
import * as path from "node:path";
import * as process from "node:process";

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
} from "@wt/web-automation/cdp";

// ============================================================================
// XHS-Specific Utilities
// ============================================================================

/**
 * Get default profile directory for XHS browser
 */
export function getDefaultProfileDir(): string {
	const base =
		process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
	return path.join(base, "xhs-browser-profile");
}

/**
 * Find Chrome executable for XHS with platform-specific override
 * Checks XHS_BROWSER_CHROME_PATH environment variable first
 */
export function findXhsChrome(): string | undefined {
	return findChromeExecutable(
		CHROME_CANDIDATES_FULL,
		"XHS_BROWSER_CHROME_PATH",
	);
}
