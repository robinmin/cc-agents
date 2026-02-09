---
name: Fix WT Critical - CDP Code Duplication
description: |
  Fix critical code duplication issue: CdpConnection class is duplicated across 5 files (juejin, infoq, zenn, xhs, substack) with ~230 lines each. Extract to shared library.

priority: P0
status: pending
affected_files:
  - plugins/wt/skills/publish-to-juejin/scripts/cdp.ts
  - plugins/wt/skills/publish-to-infoq/scripts/cdp.ts
  - plugins/wt/skills/publish-to-zenn/scripts/cdp.ts
  - plugins/wt/skills/publish-to-xhs/scripts/cdp.ts
  - plugins/wt/skills/publish-to-substack/scripts/cdp.ts
  - plugins/wt/scripts/web-automation/src/cdp.ts (new)
estimated_complexity: medium
---

# 0171. Fix WT Critical - CDP Code Duplication

## Background

The `CdpConnection` class and CDP utilities are currently duplicated across 5 different publishing skill folders:

- `plugins/wt/skills/publish-to-juejin/scripts/cdp.ts` (~230 lines)
- `plugins/wt/skills/publish-to-infoq/scripts/cdp.ts` (~230 lines)
- `plugins/wt/skills/publish-to-zenn/scripts/cdp.ts` (~230 lines)
- `plugins/wt/skills/publish-to-xhs/scripts/cdp.ts` (~230 lines)
- `plugins/wt/skills/publish-to-substack/scripts/cdp.ts` (~230 lines)

Each file contains identical implementations of:
- `sleep()` utility
- `getFreePort()` utility
- `findChromeExecutable()` with platform-specific candidates
- `CdpConnection` class with connect/disconnect/evaluate methods
- Chrome launch and WebSocket connection logic

This duplication causes:
1. **Maintenance burden**: Bug fixes need to be applied 5 times
2. **Inconsistency risk**: Files may drift apart over time
3. **Code bloat**: ~1,150 lines of duplicated code
4. **Testing complexity**: Same code needs testing in 5 locations

## Requirements

**Functional Requirements:**

1. **Create Shared CDP Module**
   - Create `plugins/wt/scripts/web-automation/src/cdp.ts` with shared CDP utilities
   - Export `CdpConnection` class
   - Export utility functions: `sleep()`, `getFreePort()`, `findChromeExecutable()`
   - Support platform-specific Chrome path detection
   - Support environment variable overrides for each platform

2. **Update Platform-Specific Files**
   - Replace duplicate implementations with imports from shared module
   - Keep platform-specific environment variable names:
     - `JUEJIN_BROWSER_CHROME_PATH`
     - `INFOQ_BROWSER_CHROME_PATH`
     - `ZENN_BROWSER_CHROME_PATH`
     - `XHS_BROWSER_CHROME_PATH`
     - `SUBSTACK_BROWSER_CHROME_PATH`
   - Add `getPlatformChromeEnv()` function for custom env var lookup

3. **Maintain Backward Compatibility**
   - All existing imports must continue to work
   - No API changes to public interfaces
   - Existing code using these modules should not break

4. **Add JSDoc Documentation**
   - Document `CdpConnection` class methods
   - Document utility functions
   - Include usage examples

**Non-Functional Requirements:**

- Module must be importable as ES module from node: protocol
- Must work across all platforms: macOS (darwin), Windows (win32), Linux (default)
- Must handle missing Chrome gracefully (return undefined or throw clear error)
- Must support persistent profile directories for session management

**Acceptance Criteria:**

- [ ] Shared `plugins/wt/scripts/web-automation/src/cdp.ts` created with all CDP utilities
- [ ] `CdpConnection` class exported with connect/disconnect/evaluate methods
- [ ] Utility functions exported: sleep, getFreePort, findChromeExecutable
- [ ] All 5 platform-specific files updated to import from shared module
- [ ] Each platform retains its custom environment variable for Chrome path override
- [ ] Total lines of code reduced by at least 900 lines (5 files × 180 lines avg)
- [ ] No TypeScript compilation errors
- [ ] All existing functionality preserved (backward compatibility)

## Design

**Shared Module Structure:**

```typescript
// plugins/wt/scripts/web-automation/src/cdp.ts

/**
 * Chrome DevTools Protocol (CDP) utilities for browser automation
 *
 * This module provides shared CDP utilities used by multiple publishing skills.
 */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import * as net from 'node:net';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';

// ============================================================================
// Shared Utilities
// ============================================================================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(): Promise<number> {
  // Implementation...
}

export type PlatformCandidates = {
  darwin?: string[];
  win32?: string[];
  default: string[];
};

export const CHROME_CANDIDATES_FULL: PlatformCandidates = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ],
  default: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ],
};

function getCandidatesForPlatform(candidates: PlatformCandidates): string[] {
  if (process.platform === 'darwin' && candidates.darwin?.length) return candidates.darwin;
  if (process.platform === 'win32' && candidates.win32?.length) return candidates.win32;
  return candidates.default;
}

/**
 * Find Chrome executable path for the current platform
 *
 * @param envVarName - Optional environment variable name for custom Chrome path
 * @param candidates - Optional platform-specific path candidates
 * @returns Chrome executable path or undefined if not found
 */
export function findChromeExecutable(
  envVarName?: string,
  candidates: PlatformCandidates = CHROME_CANDIDATES_FULL
): string | undefined {
  // Check environment override first
  if (envVarName) {
    const override = process.env[envVarName]?.trim();
    if (override && fs.existsSync(override)) return override;
  }

  // Check platform candidates
  for (const candidate of getCandidatesForPlatform(candidates)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

// ============================================================================
// CdpConnection Class
// ============================================================================

export interface CdpConnectionOptions {
  port?: number;
  host?: string;
  timeout?: number;
}

/**
 * Chrome DevTools Protocol connection wrapper
 *
 * Provides methods to connect to Chrome via CDP, evaluate JavaScript,
 * and manage the connection lifecycle.
 */
export class CdpConnection {
  private ws: import('node:net').Socket | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  constructor(
    private readonly port: number,
    private readonly host: string = '127.0.0.1',
    private readonly timeout: number = 30000
  ) {}

  /**
   * Connect to Chrome DevTools Protocol via WebSocket
   */
  async connect(): Promise<void> {
    // Implementation...
  }

  /**
   * Disconnect from Chrome DevTools Protocol
   */
  disconnect(): void {
    // Implementation...
  }

  /**
   * Evaluate JavaScript in the current page context
   */
  async evaluate(expression: string): Promise<any> {
    // Implementation...
  }

  // ... other methods
}
```

**Platform-Specific File Updates:**

```typescript
// plugins/wt/skills/publish-to-juejin/scripts/cdp.ts

/**
 * Chrome DevTools Protocol (CDP) utilities for Juejin browser automation
 *
 * This module now imports from the shared @wt/web-automation package
 * to avoid code duplication across publishing skills.
 */

export {
  sleep,
  getFreePort,
  findChromeExecutable,
  CdpConnection,
  type CdpConnectionOptions,
} from '@wt/web-automation/src/cdp.js';

/**
 * Get default profile directory for Juejin browser
 */
export function getDefaultProfileDir(): string {
  const base = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(base, 'juejin-browser-profile');
}

/**
 * Find Chrome executable for Juejin with platform-specific override
 */
export function findJuejinChrome(): string | undefined {
  return findChromeExecutable('JUEJIN_BROWSER_CHROME_PATH');
}
```

## Plan

**Phase 1: Create Shared Module**
- [ ] Create `plugins/wt/scripts/web-automation/src/cdp.ts`
- [ ] Implement `sleep()` utility
- [ ] Implement `getFreePort()` utility
- [ ] Implement `findChromeExecutable()` with env var support
- [ ] Implement `CdpConnection` class with all methods
- [ ] Add JSDoc documentation to all exports

**Phase 2: Update Platform-Specific Files**
- [ ] Update `plugins/wt/skills/publish-to-juejin/scripts/cdp.ts`
- [ ] Update `plugins/wt/skills/publish-to-infoq/scripts/cdp.ts`
- [ ] Update `plugins/wt/skills/publish-to-zenn/scripts/cdp.ts`
- [ ] Update `plugins/wt/skills/publish-to-xhs/scripts/cdp.ts`
- [ ] Update `plugins/wt/skills/publish-to-substack/scripts/cdp.ts`

**Phase 3: Testing**
- [ ] Verify no TypeScript compilation errors
- [ ] Test Chrome path detection on macOS
- [ ] Test CDP connection with each platform
- [ ] Verify backward compatibility with existing code

**Phase 4: Cleanup**
- [ ] Run TypeScript compiler to verify no errors
- [ ] Check for any remaining duplicated code
- [ ] Update documentation if needed

## Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Shared Module | plugins/wt/scripts/web-automation/src/cdp.ts | This task | 2026-02-07 |
| Updated Files | 5 platform-specific cdp.ts files | This task | 2026-02-07 |

## References

- [Task 0170](/docs/prompts/0170_adapt_publish-to-wechatmp_with_playwright.md) - Related Playwright adaptation
- [Existing juejin cdp.ts](/plugins/wt/skills/publish-to-juejin/scripts/cdp.ts) - Source for shared implementation
- [CDP Documentation](https://chromedevtools.github.io/devtools-protocol/) - Chrome DevTools Protocol reference
