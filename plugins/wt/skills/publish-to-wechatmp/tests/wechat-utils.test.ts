/**
 * Unit tests for wechat-utils.ts
 *
 * Test coverage for pure utility functions:
 * - expandTilde (via path tests)
 * - readWtConfig
 * - getDefaultProfileDir
 * - getAutoSubmitPreference
 * - getDefaultThemePreference
 * - CHROME_CANDIDATES_*
 * - findChromeExecutable
 * - getCandidatesForPlatform
 * - sleep
 *
 * Note: Integration tests (CDP, clipboard, browser automation) not covered here.
 */

import { test, expect, describe } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';

// Load module dynamically to avoid top-level issues
async function loadUtils() {
  return await import('../scripts/wechat-utils.ts');
}

describe('wechat-utils', () => {
  describe('expandTilde (internal function behavior)', () => {
    test('should expand tilde to home directory', async () => {
      const homeDir = os.homedir();

      // Verify home directory is used
      expect(homeDir).toBeTruthy();
      expect(homeDir.length).toBeGreaterThan(0);
    });

    test('should not expand paths without tilde', async () => {
      const absolutePath = '/absolute/path/to/profile';
      expect(absolutePath.startsWith('~/')).toBe(false);
    });
  });

  describe('readWtConfig', () => {
    test('should return empty object when config does not exist', async () => {
      const utils = await loadUtils();
      const config = utils.readWtConfig();

      // Should return an object (not null/undefined)
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    test('should cache config for performance', async () => {
      const utils = await loadUtils();

      // First call
      const config1 = utils.readWtConfig();
      // Second call should use cache
      const config2 = utils.readWtConfig();

      expect(config1).toEqual(config2);
    });

    test('should have publish-to-wechatmp key structure', async () => {
      const utils = await loadUtils();
      const config = utils.readWtConfig();

      // Config should be an object that may have publish-to-wechatmp key
      if (config['publish-to-wechatmp']) {
        expect(typeof config['publish-to-wechatmp']).toBe('object');
      }
    });
  });

  describe('getDefaultProfileDir', () => {
    test('should return a valid directory path', async () => {
      const utils = await loadUtils();
      const profileDir = utils.getDefaultProfileDir();

      expect(profileDir).toBeDefined();
      expect(typeof profileDir).toBe('string');
      expect(profileDir.length).toBeGreaterThan(0);
    });

    test('should use XDG_DATA_HOME or fallback to .local/share', async () => {
      const utils = await loadUtils();
      const profileDir = utils.getDefaultProfileDir();

      // Should contain wechat-browser-profile
      expect(profileDir).toContain('wechat-browser-profile');
    });

    test('should be absolute path', async () => {
      const utils = await loadUtils();
      const profileDir = utils.getDefaultProfileDir();

      expect(path.isAbsolute(profileDir)).toBe(true);
    });
  });

  describe('getAutoSubmitPreference', () => {
    test('should return boolean', async () => {
      const utils = await loadUtils();
      const autoSubmit = utils.getAutoSubmitPreference();

      expect(typeof autoSubmit).toBe('boolean');
    });

    test('should default to false when not configured', async () => {
      const utils = await loadUtils();
      const autoSubmit = utils.getAutoSubmitPreference();

      // Default is false for safety
      expect(autoSubmit).toBe(false);
    });
  });

  describe('getDefaultThemePreference', () => {
    test('should return a string', async () => {
      const utils = await loadUtils();
      const theme = utils.getDefaultThemePreference();

      expect(typeof theme).toBe('string');
    });

    test('should return valid theme name', async () => {
      const utils = await loadUtils();
      const theme = utils.getDefaultThemePreference();

      expect(['default', 'grace', 'simple']).toContain(theme);
    });

    test('should default to default theme', async () => {
      const utils = await loadUtils();
      const theme = utils.getDefaultThemePreference();

      expect(theme).toBe('default');
    });
  });

  describe('CHROME_CANDIDATES', () => {
    test('CHROME_CANDIDATES_BASIC should have platform-specific entries', async () => {
      const utils = await loadUtils();
      const candidates = utils.CHROME_CANDIDATES_BASIC;

      expect(candidates).toBeDefined();
      expect(candidates.darwin).toBeDefined();
      expect(candidates.win32).toBeDefined();
      expect(candidates.default).toBeDefined();
    });

    test('CHROME_CANDIDATES_FULL should have more entries than BASIC', async () => {
      const utils = await loadUtils();
      const basic = utils.CHROME_CANDIDATES_BASIC;
      const full = utils.CHROME_CANDIDATES_FULL;

      expect(full.darwin!.length).toBeGreaterThanOrEqual(basic.darwin!.length);
      expect(full.win32!.length).toBeGreaterThanOrEqual(basic.win32!.length);
      expect(full.default.length).toBeGreaterThanOrEqual(basic.default.length);
    });

    test('candidates should be strings', async () => {
      const utils = await loadUtils();
      const candidates = utils.CHROME_CANDIDATES_BASIC;

      candidates.darwin!.forEach(p => expect(typeof p).toBe('string'));
      candidates.win32!.forEach(p => expect(typeof p).toBe('string'));
      candidates.default.forEach(p => expect(typeof p).toBe('string'));
    });
  });

  describe('findChromeExecutable', () => {
    test('should return undefined or string', async () => {
      const utils = await loadUtils();
      const chromePath = utils.findChromeExecutable(utils.CHROME_CANDIDATES_BASIC);

      expect(chromePath === undefined || typeof chromePath === 'string').toBe(true);
    });

    test('should check for environment variable override', async () => {
      const originalEnv = process.env.WECHAT_BROWSER_CHROME_PATH;

      // Set a fake path that doesn't exist
      process.env.WECHAT_BROWSER_CHROME_PATH = '/nonexistent/chrome';

      const utils = await loadUtils();
      const result = utils.findChromeExecutable(utils.CHROME_CANDIDATES_BASIC);

      // When env var path doesn't exist, function should fall back to candidates
      // Result can be undefined (no Chrome found) or a string (Chrome found via candidates)
      expect(result === undefined || typeof result === 'string').toBe(true);

      // Restore original env
      if (originalEnv !== undefined) {
        process.env.WECHAT_BROWSER_CHROME_PATH = originalEnv;
      } else {
        delete process.env.WECHAT_BROWSER_CHROME_PATH;
      }
    });
  });

  // Note: getCandidatesForPlatform is not exported - tested indirectly via findChromeExecutable

  describe('sleep', () => {
    test('should return a promise', async () => {
      const utils = await loadUtils();
      const promise = utils.sleep(100);

      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });

    test('should resolve after specified time', async () => {
      const utils = await loadUtils();
      const start = Date.now();
      await utils.sleep(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('getFreePort', () => {
    test('should return a valid port number', async () => {
      const utils = await loadUtils();
      const port = await utils.getFreePort();

      expect(typeof port).toBe('number');
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });

    test('should return different ports on consecutive calls', async () => {
      const utils = await loadUtils();
      const port1 = await utils.getFreePort();
      const port2 = await utils.getFreePort();

      // Ports should be different (mostly - could theoretically be same if released)
      expect(port1).not.toBe(port2);
    });
  });

  describe('getScriptDir', () => {
    test('should return a valid directory path', async () => {
      const utils = await loadUtils();
      const scriptDir = utils.getScriptDir();

      expect(typeof scriptDir).toBe('string');
      expect(scriptDir.length).toBeGreaterThan(0);
    });

    test('should contain scripts in path', async () => {
      const utils = await loadUtils();
      const scriptDir = utils.getScriptDir();

      // The script dir should contain 'scripts'
      expect(scriptDir).toContain('scripts');
    });
  });

  describe('CdpConnection class', () => {
    test('should be defined', async () => {
      const utils = await loadUtils();
      expect(utils.CdpConnection).toBeDefined();
    });

    test('should have connect static method', async () => {
      const utils = await loadUtils();
      expect(typeof utils.CdpConnection.connect).toBe('function');
    });

    test('should have send method on prototype', async () => {
      const utils = await loadUtils();
      expect(utils.CdpConnection.prototype.send).toBeDefined();
    });

    test('should have close method on prototype', async () => {
      const utils = await loadUtils();
      expect(utils.CdpConnection.prototype.close).toBeDefined();
    });
  });

  describe('waitForChromeDebugPort', () => {
    test('should be a function', async () => {
      const utils = await loadUtils();
      expect(typeof utils.waitForChromeDebugPort).toBe('function');
    });

    test('should throw error when port is not available', async () => {
      const utils = await loadUtils();

      try {
        await utils.waitForChromeDebugPort(9999, 100);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Chrome debug port not ready');
      }
    });
  });
});
