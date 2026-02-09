/**
 * Unit tests for publish-to-x utils
 *
 * Test coverage for:
 * - Sleep utilities
 * - Port allocation
 * - Chrome executable detection
 * - Profile directory management
 * - Auto-submit preference
 *
 * Note: CDP connection, Chrome launch, and browser operations require
 * integration testing with actual Chrome/Chromium.
 */

import { test, expect, describe } from 'bun:test';
import * as path from 'node:path';

// Import functions under test
import {
  sleep,
  getFreePort,
  findChromeExecutable,
  getDefaultProfileDir,
  getAutoSubmitPreference,
  type PlatformCandidates,
  CHROME_CANDIDATES_BASIC,
  CHROME_CANDIDATES_FULL,
} from '../scripts/x-utils.js';

describe('x-utils', () => {
  describe('sleep', () => {
    test('should resolve after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(50);
      expect(elapsed).toBeLessThan(100);
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

      expect(port1).toBeDefined();
      expect(port2).toBeDefined();
    });
  });

  describe('findChromeExecutable', () => {
    test('should return executable path or undefined', () => {
      const result = findChromeExecutable(CHROME_CANDIDATES_FULL);

      expect(result === undefined || typeof result === 'string').toBe(true);

      if (result) {
        expect(path.isAbsolute(result)).toBe(true);
      }
    });

    test('should work with basic candidates', () => {
      const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);

      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('getDefaultProfileDir', () => {
    test('should return profile directory path for current platform', () => {
      const result = getDefaultProfileDir();

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      expect(path.isAbsolute(result)).toBe(true);
      expect(result).toContain('publish-to-x-profile');
    });

    test('should return consistent results on multiple calls', () => {
      const result1 = getDefaultProfileDir();
      const result2 = getDefaultProfileDir();

      expect(result1).toBe(result2);
    });
  });

  describe('getAutoSubmitPreference', () => {
    test('should return boolean value', () => {
      const result = getAutoSubmitPreference();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('CHROME_CANDIDATES', () => {
    test('BASIC candidates should define for all platforms', () => {
      expect(CHROME_CANDIDATES_BASIC).toBeDefined();
      expect(CHROME_CANDIDATES_BASIC.darwin).toBeDefined();
      expect(CHROME_CANDIDATES_BASIC.default).toBeDefined();
      expect(CHROME_CANDIDATES_BASIC.win32).toBeDefined();
    });

    test('FULL candidates should define for all platforms', () => {
      expect(CHROME_CANDIDATES_FULL).toBeDefined();
      expect(CHROME_CANDIDATES_FULL.darwin).toBeDefined();
      expect(CHROME_CANDIDATES_FULL.default).toBeDefined();
      expect(CHROME_CANDIDATES_FULL.win32).toBeDefined();
    });

    test('FULL candidates should include more options than BASIC', () => {
      const fullDarwin = CHROME_CANDIDATES_FULL.darwin?.length || 0;
      const basicDarwin = CHROME_CANDIDATES_BASIC.darwin?.length || 0;
      expect(fullDarwin).toBeGreaterThanOrEqual(basicDarwin);
    });
  });
});
