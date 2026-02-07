/**
 * X Platform Utilities
 *
 * X (Twitter) specific utilities for publishing content.
 *
 * Architecture:
 * - WT config utilities
 * - Clipboard/paste operations (re-exported from @wt/web-automation)
 *
 * Usage:
 *   import { readWtConfig, getAutoSubmitPreference, copyImageToClipboard } from './x-utils.js';
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ============================================================================
// WT Configuration
// ============================================================================

interface WtConfig {
  version?: string;
  'publish-to-x'?: {
    profile_dir?: string;
    auto_submit?: boolean;
  };
}

let wtConfigCache: WtConfig | null = null;
let wtConfigCacheTime = 0;
const CONFIG_CACHE_TTL_MS = 60_000; // Cache expires after 1 minute

/**
 * Read WT plugin configuration from ~/.claude/wt/config.jsonc
 * Uses caching with TTL to avoid repeated file reads while allowing updates.
 */
export function readWtConfig(): WtConfig {
  const now = Date.now();

  // Return cached config if still valid
  if (wtConfigCache && (now - wtConfigCacheTime) < CONFIG_CACHE_TTL_MS) {
    return wtConfigCache;
  }

  const configPath = path.join(os.homedir(), '.claude', 'wt', 'config.jsonc');

  try {
    if (!fs.existsSync(configPath)) {
      return {};
    }

    // Read and parse JSONC (allows comments)
    const content = fs.readFileSync(configPath, 'utf-8');

    // Strip comments for JSON parsing
    // First remove comments, then fix trailing commas
    const jsonContent = content
      .replace(/\/\*[\s\S]*?\*\//g, '')   // Remove /* ... */ comments
      .replace(/\s*\/\/.*$/gm, '')         // Remove // ... comments
      .replace(/,\s*([}\]])/g, '$1');      // Remove trailing commas before } or ]
    const parsed = JSON.parse(jsonContent) as WtConfig;

    wtConfigCache = parsed;
    wtConfigCacheTime = now;
    return parsed;
  } catch (error) {
    console.debug('[x-utils] Failed to read WT config, using defaults:', error);
    return {};
  }
}

/**
 * Get auto-submit preference from WT config
 * @returns true if auto-submit is enabled (posts immediately without preview)
 */
export function getAutoSubmitPreference(): boolean {
  const config = readWtConfig();
  return config['publish-to-x']?.auto_submit ?? false;
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
  // Config format: { "publish-to-x": { "profile_dir": "..." } }
  const config = readWtConfig();
  const configProfileDir = (config as Record<string, { profile_dir?: string }>)[skillName]?.profile_dir;

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
