/**
 * Paste Utilities - Cross-platform
 *
 * Send real paste keystroke (Cmd+V / Ctrl+V) to bypass CDP synthetic event detection.
 * Supports:
 * - macOS: AppleScript
 * - Linux: xdotool (X11) and ydotool (Wayland)
 * - Windows: PowerShell
 *
 * Usage:
 *   import { paste, pasteWithRetries } from '@wt/web-automation/paste';
 */

import { spawnSync } from 'node:child_process';
import process from 'node:process';

// ============================================================================
// Constants
// ============================================================================

export type Platform = 'darwin' | 'linux' | 'win32';

export function getPlatform(): Platform {
  if (process.platform === 'darwin') return 'darwin';
  if (process.platform === 'linux') return 'linux';
  if (process.platform === 'win32') return 'win32';
  throw new Error(`Unsupported platform: ${process.platform}`);
}

// ============================================================================
// Async Sleep (for retries)
// ============================================================================

/**
 * Asynchronous sleep with proper cleanup
 */
async function sleepAsync(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep with timeout guard - never blocks indefinitely
 */
async function sleepWithTimeout(ms: number): Promise<void> {
  // Clamp to reasonable maximum to prevent indefinite blocking
  const clampedMs = Math.min(ms, 30000);
  await sleepAsync(clampedMs);
}

// ============================================================================
// macOS Implementation (AppleScript)
// ============================================================================

export interface PasteOptions {
  retries?: number;
  delayMs?: number;
  targetApp?: string;
}

/**
 * Activate an application on macOS with retry logic and error handling
 */
export async function activateApp(appName: string, options: { retries?: number; delayMs?: number } = {}): Promise<boolean> {
  if (getPlatform() !== 'darwin') {
    console.error(`[paste] activateApp is only supported on macOS`);
    return false;
  }

  const { retries = 3, delayMs = 500 } = options;

  // Validate appName
  if (!appName || typeof appName !== 'string') {
    console.error(`[paste] Invalid appName provided: ${appName}`);
    return false;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    const script = `
      tell application "${appName}"
        activate
        delay 0.5
      end tell

      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        if frontApp is not "${appName}" then
          tell application "${appName}" to activate
          delay 0.3
        end if
      end tell
    `;

    try {
      const result = spawnSync('osascript', ['-e', script], { stdio: 'pipe' });

      if (result.status === 0) {
        console.log(`[paste] Activated app: ${appName}`);
        return true;
      }

      const stderr = result.stderr?.toString().trim();
      if (stderr && !stderr.includes('error')) {
        console.error(`[paste] osascript error (attempt ${attempt}/${retries}): ${stderr}`);
      }

      if (attempt < retries) {
        console.log(`[paste] Retrying activateApp in ${delayMs}ms...`);
        await sleepAsync(delayMs);
      }
    } catch (error) {
      console.error(`[paste] activateApp error (attempt ${attempt}/${retries}): ${error instanceof Error ? error.message : error}`);
      if (attempt < retries) {
        await sleepAsync(delayMs);
      }
    }
  }

  // Final fallback: try to launch the app directly
  try {
    const fallbackResult = spawnSync('osascript', ['-e', `tell application "${appName}" to launch`], { stdio: 'pipe' });
    if (fallbackResult.status === 0) {
      console.log(`[paste] Fallback: launched ${appName} via launch command`);
      await sleepAsync(1000);
      return true;
    }
  } catch (fallbackError) {
    console.error(`[paste] Fallback activation also failed: ${fallbackError}`);
  }

  console.error(`[paste] Failed to activate app: ${appName} after ${retries} attempts`);
  return false;
}

async function pasteMac(retries: number, delayMs: number, targetApp?: string): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    const script = targetApp
      ? `
        tell application "${targetApp}"
          activate
        end tell
        delay 0.3
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `
      : `
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `;

    const result = spawnSync('osascript', ['-e', script], { stdio: 'pipe' });
    if (result.status === 0) {
      return true;
    }

    const stderr = result.stderr?.toString().trim();
    if (stderr) {
      console.error(`[paste] osascript error: ${stderr}`);
    }

    if (i < retries - 1) {
      console.error(`[paste] Attempt ${i + 1}/${retries} failed, retrying in ${delayMs}ms...`);
      await sleepAsync(delayMs);
    }
  }
  return false;
}

// ============================================================================
// Linux Implementation (xdotool / ydotool)
// ============================================================================

async function pasteLinux(retries: number, delayMs: number): Promise<boolean> {
  const tools = [
    { cmd: 'xdotool', args: ['key', 'ctrl+v'] },
    { cmd: 'ydotool', args: ['key', 'ctrl+v'] }, // Use key name syntax for ydotool
  ];

  for (const tool of tools) {
    const which = spawnSync('which', [tool.cmd], { stdio: 'pipe' });
    if (which.status !== 0) continue;

    for (let i = 0; i < retries; i++) {
      const result = spawnSync(tool.cmd, tool.args, { stdio: 'pipe' });
      if (result.status === 0) {
        return true;
      }
      if (i < retries - 1) {
        console.error(`[paste] Attempt ${i + 1}/${retries} failed, retrying in ${delayMs}ms...`);
        await sleepAsync(delayMs);
      }
    }
  }

  console.error('[paste] No supported tool found. Install xdotool (X11) or ydotool (Wayland).');
  return false;
}

// ============================================================================
// Windows Implementation (PowerShell)
// ============================================================================

async function pasteWindows(retries: number, delayMs: number): Promise<boolean> {
  const ps = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.SendKeys]::SendWait("^v")
  `;

  for (let i = 0; i < retries; i++) {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], { stdio: 'pipe' });
    if (result.status === 0) {
      return true;
    }
    if (i < retries - 1) {
      console.error(`[paste] Attempt ${i + 1}/${retries} failed, retrying in ${delayMs}ms...`);
      await sleepAsync(delayMs);
    }
  }
  return false;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send paste keystroke to the frontmost application
 */
export async function paste(options: PasteOptions = {}): Promise<boolean> {
  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 500;
  const targetApp = options.targetApp;

  const platform = getPlatform();
  switch (platform) {
    case 'darwin':
      return await pasteMac(retries, delayMs, targetApp);
    case 'linux':
      return await pasteLinux(retries, delayMs);
    case 'win32':
      return await pasteWindows(retries, delayMs);
  }
}

/**
 * Send paste keystroke with retries
 */
export async function pasteWithRetries(options: PasteOptions = {}): Promise<boolean> {
  return paste(options);
}

/**
 * Activate an application and send paste
 */
export async function pasteToApp(appName: string, options: PasteOptions = {}): Promise<boolean> {
  if (getPlatform() !== 'darwin') {
    console.error(`[paste] activateApp is only supported on macOS`);
    return paste(options);
  }

  const retries = options.retries ?? 3;
  const delayMs = options.delayMs ?? 500;

  const activated = await activateApp(appName, { retries: 3, delayMs: 500 });
  if (!activated) {
    console.error(`[paste] Failed to activate app: ${appName}`);
    return false;
  }

  return pasteMac(retries, delayMs, appName);
}
