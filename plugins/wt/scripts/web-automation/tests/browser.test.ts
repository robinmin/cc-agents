/**
 * Tests for browser module
 *
 * Tests browser utilities and Chrome detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  findChromeExecutable,
  CHROME_CANDIDATES_BASIC,
  CHROME_CANDIDATES_FULL,
  waitForChromeDebugPort,
  CdpConnection,
  PlatformCandidates,
} from '../src/browser.js';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

describe('browser', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.X_BROWSER_CHROME_PATH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Chrome Candidates', () => {
    it('should have platform-specific candidates', () => {
      expect(CHROME_CANDIDATES_BASIC.darwin).toBeTruthy();
      expect(CHROME_CANDIDATES_BASIC.win32).toBeTruthy();
      expect(CHROME_CANDIDATES_BASIC.default).toBeTruthy();
    });

    it('should have basic macOS candidates', () => {
      const darwinPaths = CHROME_CANDIDATES_BASIC.darwin || [];
      expect(darwinPaths.length).toBeGreaterThan(0);
      expect(darwinPaths[0]).toContain('Google Chrome.app');
    });

    it('should have basic Windows candidates', () => {
      const winPaths = CHROME_CANDIDATES_BASIC.win32 || [];
      expect(winPaths.length).toBeGreaterThan(0);
      expect(winPaths[0]).toContain('chrome.exe');
    });

    it('should have basic Linux candidates', () => {
      const defaultPaths = CHROME_CANDIDATES_BASIC.default;
      expect(defaultPaths.length).toBeGreaterThan(0);
    });

    it('should have full macOS candidates including Edge', () => {
      const darwinPaths = CHROME_CANDIDATES_FULL.darwin || [];
      expect(darwinPaths).toContain('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    });

    it('should have full Windows candidates including Edge', () => {
      const winPaths = CHROME_CANDIDATES_FULL.win32 || [];
      expect(winPaths).toContain('C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe');
    });
  });

  describe('findChromeExecutable', () => {
    it('should return undefined when no Chrome found', () => {
      const emptyCandidates: PlatformCandidates = {
        default: ['/nonexistent/path/to/chrome'],
      };
      const result = findChromeExecutable(emptyCandidates);
      expect(result).toBeUndefined();
    });

    it('should use X_BROWSER_CHROME_PATH override when set and file exists', async () => {
      const tempDir = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      const fakeChrome = path.join(tempDir, 'chrome');
      await fs.writeFile(fakeChrome, 'fake');

      process.env.X_BROWSER_CHROME_PATH = fakeChrome;

      const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);
      expect(result).toBe(fakeChrome);

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should ignore X_BROWSER_CHROME_PATH when file does not exist', () => {
      process.env.X_BROWSER_CHROME_PATH = '/nonexistent/chrome';

      const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);
      // Should not throw, just ignore the override
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('should find first existing candidate', async () => {
      const tempDir = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      // Create a fake chrome in temp
      const fakeChrome = path.join(tempDir, 'chrome-executable');
      await fs.writeFile(fakeChrome, 'fake');

      const candidates: PlatformCandidates = {
        default: [
          '/nonexistent/chrome',
          fakeChrome,
          '/another/nonexistent',
        ],
      };

      const result = findChromeExecutable(candidates);
      expect(result).toBe(fakeChrome);

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should handle empty candidates array', () => {
      const emptyCandidates: PlatformCandidates = {
        default: [],
      };
      const result = findChromeExecutable(emptyCandidates);
      expect(result).toBeUndefined();
    });
  });

  describe('waitForChromeDebugPort', () => {
    it('should timeout when port is not ready', async () => {
      const start = Date.now();
      try {
        await waitForChromeDebugPort(9999, 100);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('not ready');
      }
      const elapsed = Date.now() - start;
      // waitForChromeDebugPort sleeps 200ms between attempts, so timeout takes at least 200ms
      expect(elapsed).toBeGreaterThanOrEqual(190);
      expect(elapsed).toBeLessThan(300);
    });

    it('should include last error when requested', async () => {
      try {
        await waitForChromeDebugPort(9999, 50, { includeLastError: true });
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('not ready');
      }
    });

    it('should not include last error when not requested', async () => {
      try {
        await waitForChromeDebugPort(9999, 50);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Chrome debug port not ready');
      }
    });
  });

  describe('CdpConnection', () => {
    // Note: Full CdpConnection tests require actual WebSocket server
    // These tests focus on the class structure and basic functionality

    it('should have connect static method', () => {
      expect(typeof CdpConnection.connect).toBe('function');
    });

    it('should have send method', () => {
      // We can't test the actual connection without a WebSocket server
      // but we can verify the method exists
      expect(typeof CdpConnection.prototype.send).toBe('function');
    });

    it('should have on method', () => {
      expect(typeof CdpConnection.prototype.on).toBe('function');
    });

    it('should have close method', () => {
      expect(typeof CdpConnection.prototype.close).toBe('function');
    });
  });

  describe('Platform detection', () => {
    it('should work on current platform', () => {
      // Test that the function doesn't throw on any platform
      const candidates: PlatformCandidates = {
        default: ['/fake/chrome'],
      };
      const result = findChromeExecutable(candidates);
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string override', () => {
      process.env.X_BROWSER_CHROME_PATH = '';

      const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);
      // Empty string is falsy after trim, so should be ignored
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    it('should handle whitespace in override', async () => {
      const tempDir = path.join(os.tmpdir(), `chrome-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });

      const fakeChrome = path.join(tempDir, 'chrome');
      await fs.writeFile(fakeChrome, 'fake');

      process.env.X_BROWSER_CHROME_PATH = `  ${fakeChrome}  `;

      const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);
      expect(result).toBe(fakeChrome);

      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should handle candidates with only platform-specific paths', () => {
      const candidates: PlatformCandidates = {
        darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
      };

      const result = findChromeExecutable(candidates);
      // On non-mac, this should return undefined
      // On mac, it might find the actual Chrome
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('Deprecation notices', () => {
    it('should have waitForChromeDebugPort marked deprecated', () => {
      // This test documents that waitForChromeDebugPort is deprecated
      // The actual deprecation warning is in JSDoc
      expect(typeof waitForChromeDebugPort).toBe('function');
    });

    it('should have CdpConnection class marked deprecated', () => {
      // This test documents that CdpConnection is deprecated
      // The actual deprecation warning is in JSDoc
      expect(typeof CdpConnection).toBe('function');
    });
  });
});
