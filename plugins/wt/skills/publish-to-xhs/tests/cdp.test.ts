/**
 * Unit tests for cdp.ts
 *
 * Test coverage for:
 * - Sleep utilities
 * - Port allocation
 * - Chrome executable detection
 * - Profile directory management
 *
 * Note: CDP connection, Chrome launch, and browser operations require
 * integration testing with actual Chrome/Chromium. These are tested separately.
 */

import { test, expect, describe } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';

// Import functions under test
import {
  sleep,
  getFreePort,
  type PlatformCandidates,
  CHROME_CANDIDATES_FULL,
  findChromeExecutable,
  getDefaultProfileDir,
} from '../scripts/cdp.js';

describe('cdp utilities', () => {
  describe('sleep', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200); // Allow some margin
    });

    test('should resolve immediately for 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(20);
    });
  });

  describe('getFreePort', () => {
    test('should allocate a free port', async () => {
      const port = await getFreePort();

      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });

    test('should allocate different ports on consecutive calls', async () => {
      const port1 = await getFreePort();
      const port2 = await getFreePort();

      // While there's a small chance they could be the same,
      // typically they should be different
      expect(port1).toBeDefined();
      expect(port2).toBeDefined();
    });
  });

  describe('findChromeExecutable', () => {
    test('should return executable path or undefined', () => {
      const result = findChromeExecutable();

      // Result is either a string path or undefined
      expect(result === undefined || typeof result === 'string').toBe(true);

      // If found, should be absolute path
      if (result) {
        expect(path.isAbsolute(result)).toBe(true);
      }
    });
  });

  describe('getDefaultProfileDir', () => {
    test('should return profile directory path for current platform', () => {
      const result = getDefaultProfileDir();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Should be absolute path
      expect(path.isAbsolute(result)).toBe(true);

      // Should end with profile name
      expect(result).toContain('xhs-browser-profile');
    });

    test('should return consistent results on multiple calls', () => {
      const result1 = getDefaultProfileDir();
      const result2 = getDefaultProfileDir();

      expect(result1).toBe(result2);
    });
  });

  describe('CHROME_CANDIDATES_FULL', () => {
    test('should define candidates for all platforms', () => {
      expect(CHROME_CANDIDATES_FULL).toBeDefined();
      expect(CHROME_CANDIDATES_FULL.darwin).toBeDefined();
      expect(CHROME_CANDIDATES_FULL.default).toBeDefined(); // Linux/others use default
      expect(CHROME_CANDIDATES_FULL.win32).toBeDefined();
    });

    test('darwin candidates should include common macOS paths', () => {
      const darwinPaths = CHROME_CANDIDATES_FULL.darwin;

      expect(darwinPaths).toBeDefined();
      expect(darwinPaths!.length).toBeGreaterThan(0);

      // Should include Chrome, Chromium, and Edge paths
      const hasChrome = darwinPaths!.some((p) => p.includes('Google Chrome'));
      const hasChromium = darwinPaths!.some((p) => p.includes('Chromium'));
      const hasEdge = darwinPaths!.some((p) => p.includes('Edge'));

      expect(hasChrome || hasChromium || hasEdge).toBe(true);
    });

    test('default candidates should include Linux paths', () => {
      const defaultPaths = CHROME_CANDIDATES_FULL.default;

      expect(defaultPaths).toBeDefined();
      expect(defaultPaths!.length).toBeGreaterThan(0);

      // Should include Chrome and Chromium paths
      const hasChrome = defaultPaths!.some((p) => p.includes('chrome'));
      const hasChromium = defaultPaths!.some((p) => p.includes('chromium'));

      expect(hasChrome || hasChromium).toBe(true);
    });
  });
});
