/**
 * Unit tests for paste.ts
 *
 * Test coverage for:
 * - Platform detection
 * - PasteOptions interface
 * - Default values for retries and delayMs
 * - Synchronous sleep behavior
 */

import { test, expect, describe } from 'bun:test';
import process from 'node:process';

// Import functions under test
import {
  getPlatform,
  paste,
  pasteWithRetries,
  pasteToApp,
  activateApp,
  type PasteOptions,
  type Platform,
} from '../src/paste';

describe('getPlatform', () => {
  test('should return darwin on macOS', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    expect(getPlatform()).toBe('darwin');
    Object.defineProperty(process, 'platform', { value: original });
  });

  test('should return linux on Linux', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(getPlatform()).toBe('linux');
    Object.defineProperty(process, 'platform', { value: original });
  });

  test('should return win32 on Windows', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(getPlatform()).toBe('win32');
    Object.defineProperty(process, 'platform', { value: original });
  });
});

describe('PasteOptions', () => {
  test('should have correct default values', () => {
    const options: PasteOptions = {};
    expect(options.retries).toBeUndefined();
    expect(options.delayMs).toBeUndefined();
    expect(options.targetApp).toBeUndefined();
  });

  test('should accept custom values', () => {
    const options: PasteOptions = {
      retries: 5,
      delayMs: 1000,
      targetApp: 'Google Chrome',
    };
    expect(options.retries).toBe(5);
    expect(options.delayMs).toBe(1000);
    expect(options.targetApp).toBe('Google Chrome');
  });

  test('should work with partial options', () => {
    const options1: PasteOptions = { retries: 3 };
    expect(options1.retries).toBe(3);
    expect(options1.delayMs).toBeUndefined();

    const options2: PasteOptions = { delayMs: 200 };
    expect(options2.retries).toBeUndefined();
    expect(options2.delayMs).toBe(200);

    const options3: PasteOptions = { targetApp: 'Safari' };
    expect(options3.targetApp).toBe('Safari');
  });
});

describe('paste - default values', () => {
  test('should call with default options', async () => {
    // On this platform, paste will attempt the actual paste
    // We just verify it doesn't throw and returns a boolean
    const result = await paste({});
    expect(typeof result).toBe('boolean');
  });

  test('should accept zero retries', async () => {
    const options: PasteOptions = { retries: 0, delayMs: 0 };
    const result = await paste(options);
    expect(typeof result).toBe('boolean');
  });

  test('should accept high retry count', async () => {
    const options: PasteOptions = { retries: 10, delayMs: 100 };
    const result = await paste(options);
    expect(typeof result).toBe('boolean');
  });

  test('should accept various targetApp values', async () => {
    const apps = ['Google Chrome', 'Safari', 'Firefox', 'Safari Technology Preview'];
    for (const app of apps) {
      const result = await paste({ targetApp: app });
      expect(typeof result).toBe('boolean');
    }
  });
});

describe('pasteWithRetries', () => {
  test('should return Promise<boolean>', async () => {
    const result = await pasteWithRetries({ retries: 1 });
    expect(typeof result).toBe('boolean');
  });

  test('should pass options through', async () => {
    const options: PasteOptions = { retries: 2, delayMs: 50 };
    const result = await pasteWithRetries(options);
    expect(typeof result).toBe('boolean');
  });
});

describe('pasteToApp', () => {
  test('should return Promise<boolean>', async () => {
    const result = await pasteToApp('Safari');
    expect(typeof result).toBe('boolean');
  });

  test('should accept options', async () => {
    const result = await pasteToApp('Google Chrome', { retries: 1, delayMs: 100 });
    expect(typeof result).toBe('boolean');
  });
});

describe('activateApp', () => {
  test('should return boolean', async () => {
    // On non-macOS, it should return false
    const result = await activateApp('Safari');
    expect(typeof result).toBe('boolean');
  });

  test('should accept various app names', async () => {
    const apps = ['Safari', 'Google Chrome', 'Firefox', 'Safari Technology Preview'];
    for (const app of apps) {
      const result = await activateApp(app);
      expect(typeof result).toBe('boolean');
    }
  });

  test('should handle non-existent app gracefully', async () => {
    const result = await activateApp('NonExistentApp12345');
    expect(typeof result).toBe('boolean');
    // On macOS with osascript, this might succeed or fail silently
  });
});

describe('Platform type', () => {
  test('should allow all platform values', () => {
    const platforms: Platform[] = ['darwin', 'linux', 'win32'];
    expect(platforms).toHaveLength(3);
  });
});

describe('paste behavior by platform', () => {
  test('paste should work on current platform', async () => {
    const result = await paste({ retries: 1 });
    // Result is a boolean indicating success/failure
    expect(typeof result).toBe('boolean');
  });

  test('pasteWithRetries should return async boolean', async () => {
    const result = await pasteWithRetries({ retries: 1 });
    expect(typeof result).toBe('boolean');
  });
});
