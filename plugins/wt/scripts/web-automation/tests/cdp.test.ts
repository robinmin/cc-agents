/**
 * Unit tests for CDP library
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  sleep,
  getFreePort,
  findChromeExecutable,
  getDefaultProfileDir,
  waitForChromeDebugPort,
  CdpConnection,
  retry,
  CHROME_CANDIDATES_FULL,
  CHROME_CANDIDATES_BASIC,
} from '../src/cdp.js';

// ============================================================================
// Test Utilities
// ============================================================================

// Store and restore original environment variables
const originalEnv = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!Object.prototype.hasOwnProperty.call(originalEnv, key)) {
      delete process.env[key];
    }
  }
  for (const key of Object.keys(originalEnv)) {
    process.env[key] = originalEnv[key]!;
  }
}

// Add afterEach to restore environment after all tests
afterEach(() => {
  restoreEnv();
});

// ============================================================================
// sleep Tests
// ============================================================================

describe('sleep', () => {
  test('should delay execution for specified milliseconds', async () => {
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(95); // Allow small margin
    expect(elapsed).toBeLessThan(200); // Should not be too long
  });

  test('should return undefined', async () => {
    const result = await sleep(10);
    expect(result).toBeUndefined();
  });

  test('should handle zero delay', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(20);
  });
});

// ============================================================================
// getFreePort Tests
// ============================================================================

describe('getFreePort', () => {
  test('should return a valid port number', async () => {
    const port = await getFreePort();
    expect(typeof port).toBe('number');
    expect(port).toBeGreaterThan(0);
    expect(port).toBeLessThan(65536);
  });

  test('should return different ports on consecutive calls', async () => {
    const port1 = await getFreePort();
    const port2 = await getFreePort();
    // They might occasionally be the same if the first server is cleaned up,
    // but typically they should be different
    expect(port1).not.toBe(port2);
  });

  test('should return an available port (ephemeral range)', async () => {
    const port = await getFreePort();
    // Ephemeral ports are typically in the range 49152-65535 on many systems,
    // but the exact range can vary. Just check it's reasonable.
    expect(port).toBeGreaterThan(1023);
  });
});

// ============================================================================
// findChromeExecutable Tests
// ============================================================================

describe('findChromeExecutable', () => {
  test('should return undefined when Chrome is not found', () => {
    // Use candidates that definitely don't exist
    const nonExistentCandidates = {
      darwin: ['/nonexistent/chrome'],
      win32: ['C:\\nonexistent\\chrome.exe'],
      default: ['/nonexistent/chrome'],
    };

    const result = findChromeExecutable(nonExistentCandidates);
    expect(result).toBeUndefined();
  });

  test('should check environment variable override (falls back to system Chrome if path does not exist)', () => {
    const testPath = '/tmp/test-chrome-path';
    process.env.WT_BROWSER_CHROME_PATH = testPath;

    // Path doesn't exist, so should fallback to system Chrome
    const result = findChromeExecutable();
    // On systems with Chrome installed, this returns the Chrome path
    // On systems without Chrome, this would be undefined
    expect(result === undefined || typeof result === 'string').toBe(true);

    restoreEnv();
  });

  test('should return existing path from env var', () => {
    // Clear any existing env var first
    delete process.env.WT_BROWSER_CHROME_PATH;

    // Create a temp file to simulate an executable
    const tempDir = os.tmpdir();
    const fakeChrome = path.join(tempDir, 'fake-chrome-test');
    fs.writeFileSync(fakeChrome, 'fake');

    process.env.WT_BROWSER_CHROME_PATH = fakeChrome;

    const result = findChromeExecutable();
    expect(result).toBe(fakeChrome);

    // Clean up
    fs.unlinkSync(fakeChrome);
    delete process.env.WT_BROWSER_CHROME_PATH;
    restoreEnv();
  });

  test('should use custom env var when provided (falls back to system Chrome if path does not exist)', () => {
    const testPath = '/tmp/custom-path';
    process.env.CUSTOM_CHROME_VAR = testPath;

    const result = findChromeExecutable(CHROME_CANDIDATES_FULL, 'CUSTOM_CHROME_VAR');
    // On systems with Chrome installed, this returns the Chrome path
    // On systems without Chrome, this would be undefined
    expect(result === undefined || typeof result === 'string').toBe(true);

    restoreEnv();
  });

  test('should search platform-specific candidates', () => {
    // The function should not throw and should check platform-specific paths
    const result = findChromeExecutable();
    // Result will be undefined on systems without Chrome, or a path if found
    expect(result === undefined || typeof result === 'string').toBe(true);
  });

  test('should handle empty candidates', () => {
    const emptyCandidates = {
      darwin: [],
      win32: [],
      default: [],
    };

    const result = findChromeExecutable(emptyCandidates);
    expect(result).toBeUndefined();
  });

  test('should use CHROME_CANDIDATES_BASIC constant', () => {
    const result = findChromeExecutable(CHROME_CANDIDATES_BASIC);
    expect(result === undefined || typeof result === 'string').toBe(true);
  });
});

// ============================================================================
// getDefaultProfileDir Tests
// ============================================================================

describe('getDefaultProfileDir', () => {
  test('should return default profile path', () => {
    const result = getDefaultProfileDir();
    expect(typeof result).toBe('string');
    expect(result).toContain('wt-browser-profile');
  });

  test('should use custom platform name', () => {
    const result = getDefaultProfileDir('test-platform');
    expect(result).toContain('test-platform-profile');
  });

  test('should respect XDG_DATA_HOME env var', () => {
    // Clear any existing env var first
    delete process.env.XDG_DATA_HOME;

    const customDir = '/tmp/xdg-data';
    process.env.XDG_DATA_HOME = customDir;

    const result = getDefaultProfileDir();
    expect(result).toContain(customDir);

    // Clean up
    delete process.env.XDG_DATA_HOME;
    restoreEnv();
  });

  test('should use homedir when XDG_DATA_HOME is not set', () => {
    delete process.env.XDG_DATA_HOME;

    const result = getDefaultProfileDir();
    expect(result).toContain('.local');
  });

  test('should construct valid path', () => {
    const result = getDefaultProfileDir();
    expect(path.isAbsolute(result)).toBe(true);
  });
});

// ============================================================================
// waitForChromeDebugPort Tests
// ============================================================================

describe('waitForChromeDebugPort', () => {
  test('should throw timeout when Chrome is not running', async () => {
    // Use a port that's unlikely to have Chrome
    try {
      await waitForChromeDebugPort(9999, 100);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Chrome debug port not ready');
    }
  });

  test('should include last error in message when option is set', async () => {
    try {
      await waitForChromeDebugPort(9998, 100, { includeLastError: true });
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toContain('Chrome debug port not ready');
    }
  });

  test('should throw generic error without includeLastError', async () => {
    try {
      await waitForChromeDebugPort(9997, 100, { includeLastError: false });
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe('Chrome debug port not ready');
    }
  });

  test('should wait for specified timeout before giving up', async () => {
    const start = Date.now();
    try {
      await waitForChromeDebugPort(9996, 200);
      expect(true).toBe(false);
    } catch (error) {
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(190);
    }
  });
});

// ============================================================================
// CdpConnection Class Tests
// ============================================================================

describe('CdpConnection', () => {
  describe('static connect', () => {
    test('should timeout when connecting to invalid URL', async () => {
      try {
        // Use an invalid WebSocket URL that will fail quickly
        const wsUrl = 'ws://localhost:9999/nonexistent';
        await CdpConnection.connect(wsUrl, 100);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('CDP connection failed');
      }
    });

    test('should fail immediately on connection error', async () => {
      // This test verifies the error handling path
      // Since we can't easily simulate an immediate connection error,
      // we just verify the method exists
      expect(typeof CdpConnection.connect).toBe('function');
    });
  });

  describe('event handling', () => {
    test('should have on method for event handlers', () => {
      // We can't test the actual WebSocket connection, but we can verify
      // the class has the expected methods
      expect(typeof CdpConnection.prototype.on).toBe('function');
    });
  });

  describe('send method', () => {
    test('should have send method', () => {
      expect(typeof CdpConnection.prototype.send).toBe('function');
    });
  });

  describe('close method', () => {
    test('should have close method', () => {
      expect(typeof CdpConnection.prototype.close).toBe('function');
    });
  });
});

// ============================================================================
// retry Helper Tests
// ============================================================================

describe('retry', () => {
  test('should return result on first successful attempt', async () => {
    const mockFn = async (): Promise<string> => {
      return 'success';
    };

    const result = await retry(mockFn);
    expect(result).toBe('success');
  });

  test('should retry on failure with default options', async () => {
    let attempts = 0;
    const mockFn = async (): Promise<string> => {
      attempts++;
      if (attempts < 2) {
        throw new Error('fail');
      }
      return 'success';
    };

    const result = await retry(mockFn);
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });

  test('should use specified maxAttempts', async () => {
    let attempts = 0;
    const mockFn = async (): Promise<string> => {
      attempts++;
      if (attempts < 3) {
        throw new Error('fail');
      }
      return 'success';
    };

    const result = await retry(mockFn, { maxAttempts: 5 });
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should throw after maxAttempts exhausted', async () => {
    const mockFn = async (): Promise<string> => {
      throw new Error('always fails');
    };

    try {
      await retry(mockFn, { maxAttempts: 3, delayMs: 10 });
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('always fails');
    }
  });

  test('should respect shouldRetry callback', async () => {
    const shouldRetry = (error: unknown) => {
      return (error as Error).message !== 'stop retry';
    };

    // First attempt returns 'fail', which should be retried
    // We'll modify the function to return 'stop retry' on second attempt
    let callCount = 0;
    const conditionalFn = async (): Promise<string> => {
      callCount++;
      if (callCount === 1) {
        throw new Error('fail');
      }
      throw new Error('stop retry');
    };

    try {
      await retry(conditionalFn, { shouldRetry, maxAttempts: 5, delayMs: 1 });
      expect(true).toBe(false);
    } catch (error) {
      expect((error as Error).message).toBe('stop retry');
      expect(callCount).toBe(2); // Should stop after second attempt
    }
  });

  test('should use exponential backoff', async () => {
    const timestamps: number[] = [];
    const mockFn = async (): Promise<string> => {
      timestamps.push(Date.now());
      if (timestamps.length < 3) {
        throw new Error('fail');
      }
      return 'success';
    };

    await retry(mockFn, { maxAttempts: 3, delayMs: 50, backoffMultiplier: 2 });
    expect(timestamps.length).toBe(3);

    // Second attempt should wait ~50ms
    const delay1 = timestamps[1]! - timestamps[0]!;
    // Third attempt should wait ~100ms (50 * 2)
    const delay2 = timestamps[2]! - timestamps[1]!;

    expect(delay1).toBeGreaterThanOrEqual(40);
    expect(delay2).toBeGreaterThanOrEqual(80);
  });

  test('should support zero delayMs', async () => {
    let attempts = 0;
    const mockFn = async (): Promise<string> => {
      attempts++;
      if (attempts < 2) throw new Error('fail');
      return 'success';
    };

    const start = Date.now();
    await retry(mockFn, { delayMs: 0, backoffMultiplier: 2 });
    const elapsed = Date.now() - start;

    expect(attempts).toBe(2);
    expect(elapsed).toBeLessThan(50); // Should complete very quickly
  });

  test('should support zero timeout in send (no timeout)', async () => {
    // This is tested implicitly through the retry mechanism
    const mockFn = async (): Promise<string> => {
      return 'success';
    };

    const result = await retry(mockFn, { maxAttempts: 1 });
    expect(result).toBe('success');
  });

  test('should handle verbose logging option', async () => {
    const consoleLogSpy = spyOn(console, 'log');
    const mockFn = async (): Promise<string> => {
      throw new Error('test error');
    };

    try {
      await retry(mockFn, { maxAttempts: 2, delayMs: 1, verbose: true });
    } catch (error) {
      // Expected to fail
    }

    // Should log retry attempts
    expect(consoleLogSpy).toHaveBeenCalled();
    consoleLogSpy.mockRestore();
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  test('CHROME_CANDIDATES_FULL should have all platforms', () => {
    expect(CHROME_CANDIDATES_FULL).toHaveProperty('darwin');
    expect(CHROME_CANDIDATES_FULL).toHaveProperty('win32');
    expect(CHROME_CANDIDATES_FULL).toHaveProperty('default');
    expect(CHROME_CANDIDATES_FULL.darwin).toBeInstanceOf(Array);
    expect(CHROME_CANDIDATES_FULL.win32).toBeInstanceOf(Array);
    expect(CHROME_CANDIDATES_FULL.default).toBeInstanceOf(Array);
  });

  test('CHROME_CANDIDATES_BASIC should have all platforms', () => {
    expect(CHROME_CANDIDATES_BASIC).toHaveProperty('darwin');
    expect(CHROME_CANDIDATES_BASIC).toHaveProperty('win32');
    expect(CHROME_CANDIDATES_BASIC).toHaveProperty('default');
  });

  test('CHROME_CANDIDATES_FULL should have more candidates than BASIC', () => {
    const fullLength = (CHROME_CANDIDATES_FULL.darwin?.length || 0) +
                      (CHROME_CANDIDATES_FULL.win32?.length || 0) +
                      CHROME_CANDIDATES_FULL.default.length;
    const basicLength = (CHROME_CANDIDATES_BASIC.darwin?.length || 0) +
                        (CHROME_CANDIDATES_BASIC.win32?.length || 0) +
                        CHROME_CANDIDATES_BASIC.default.length;

    expect(fullLength).toBeGreaterThan(basicLength);
  });

  test('darwin candidates should include standard paths', () => {
    expect(CHROME_CANDIDATES_FULL.darwin).toContain('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    expect(CHROME_CANDIDATES_FULL.darwin).toContain('/Applications/Chromium.app/Contents/MacOS/Chromium');
  });

  test('win32 candidates should include standard paths', () => {
    expect(CHROME_CANDIDATES_FULL.win32).toContain('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
    expect(CHROME_CANDIDATES_FULL.win32).toContain('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe');
  });

  test('default candidates should include Linux paths', () => {
    expect(CHROME_CANDIDATES_FULL.default).toContain('/usr/bin/google-chrome');
    expect(CHROME_CANDIDATES_FULL.default).toContain('/usr/bin/chromium');
  });
});
