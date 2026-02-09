/**
 * X Platform Utilities
 *
 * X (Twitter) specific utilities for publishing content.
 *
 * Architecture:
 * - WT config utilities (using @wt/web-automation)
 * - Clipboard/paste operations (re-exported from @wt/web-automation)
 *
 * Usage:
 *   import { getWtConfig, getAutoSubmitPreference, copyImageToClipboard } from './x-utils.js';
 */

import path from 'node:path';
import os from 'node:os';
import { getWtConfig } from '@wt/web-automation/config';

// ============================================================================
// WT Configuration
// ============================================================================

interface XConfig {
  profile_dir?: string;
  auto_submit?: boolean;
}

/**
 * Get X (Twitter) config from WT config
 */
function getXConfig(): XConfig {
  const wtConfig = getWtConfig();
  return (wtConfig['publish-to-x'] as XConfig) || {};
}

/**
 * Get auto-submit preference from WT config
 * @returns true if auto-submit is enabled (posts immediately without preview)
 */
export function getAutoSubmitPreference(): boolean {
  const config = getXConfig();
  return config.auto_submit ?? false;
}

/**
 * Get default profile directory for browser automation
 *
 * Architecture:
 * - Reads from ~/.claude/wt/config.jsonc → {skillName}.profile_dir
 * - Supports: publish-to-x, publish-to-infoq, publish-to-medium, etc.
 * - Falls back to {XDG_DATA_HOME}/{skillName}-profile
 *
 * @param skillName - The skill/agent name (e.g., 'publish-to-x', 'publish-to-infoq')
 * @returns Profile directory path
 */
export function getDefaultProfileDir(skillName: string = 'publish-to-x'): string {
  // Try to read from WT config
  const wtConfig = getWtConfig();
  const configProfileDir = (wtConfig[skillName] as { profile_dir?: string } | undefined)?.profile_dir;

  if (configProfileDir) {
    // Expand tilde in path
    if (configProfileDir.startsWith('~/')) {
      return path.join(os.homedir(), configProfileDir.slice(2));
    }
    return configProfileDir;
  }

  // Fall back to default location
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, `${skillName}-profile`);
}

// ============================================================================
// Clipboard & Paste Operations (re-exported from @wt/web-automation)
// ============================================================================

export {
  copyImageToClipboard,
  copyHtmlFileToClipboard,
  copyHtmlToClipboard,
  inferImageMimeType,
} from '../../../scripts/web-automation/dist/clipboard.js';

export {
  CHROME_CANDIDATES_BASIC,
  CHROME_CANDIDATES_FULL,
  findChromeExecutable,
} from '../../../scripts/web-automation/dist/browser.js';

export {
  pwSleep as sleep,
  getFreePort,
} from '../../../scripts/web-automation/dist/playwright.js';

export {
  paste,
  pasteWithRetries,
  pasteToApp,
} from '../../../scripts/web-automation/dist/paste.js';

// Legacy wrapper for backward compatibility
export function pasteFromClipboard(targetApp?: string, retries = 3, delayMs = 500): boolean {
  return paste({ targetApp, retries, delayMs });
}
