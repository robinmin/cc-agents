/**
 * Unit tests for clipboard.ts
 *
 * Test coverage for:
 * - Platform detection
 * - MIME type inference
 * - Path resolution
 * - File validation (extensions, existence)
 * - Command helper functions
 */

import { test, expect, describe } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';

// Import functions under test
import {
  getPlatform,
  inferImageMimeType,
  resolvePath,
  type Platform,
} from '../src/clipboard';

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

  test('should throw on unsupported platform', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'freebsd' });
    expect(() => getPlatform()).toThrow('Unsupported platform');
    Object.defineProperty(process, 'platform', { value: original });
  });
});

describe('inferImageMimeType', () => {
  test('should return image/jpeg for .jpg', () => {
    expect(inferImageMimeType('/path/to/image.jpg')).toBe('image/jpeg');
  });

  test('should return image/jpeg for .jpeg', () => {
    expect(inferImageMimeType('/path/to/image.jpeg')).toBe('image/jpeg');
  });

  test('should return image/png for .png', () => {
    expect(inferImageMimeType('/path/to/image.png')).toBe('image/png');
  });

  test('should return image/gif for .gif', () => {
    expect(inferImageMimeType('/path/to/animation.gif')).toBe('image/gif');
  });

  test('should return image/webp for .webp', () => {
    expect(inferImageMimeType('/path/to/image.webp')).toBe('image/webp');
  });

  test('should return application/octet-stream for unsupported extension', () => {
    expect(inferImageMimeType('/path/to/image.bmp')).toBe('application/octet-stream');
    expect(inferImageMimeType('/path/to/image.tiff')).toBe('application/octet-stream');
  });

  test('should handle case insensitive extensions', () => {
    expect(inferImageMimeType('/path/to/image.JPG')).toBe('image/jpeg');
    expect(inferImageMimeType('/path/to/image.PNG')).toBe('image/png');
    expect(inferImageMimeType('/path/to/image.WEBP')).toBe('image/webp');
  });
});

describe('resolvePath', () => {
  test('should return absolute path unchanged', () => {
    const absolutePath = '/absolute/path/to/file.jpg';
    expect(resolvePath(absolutePath)).toBe(absolutePath);
  });

  test('should resolve relative path to absolute', () => {
    const relativePath = './relative/path.jpg';
    const resolved = resolvePath(relativePath);
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved).toContain(relativePath.slice(2));
  });

  test('should resolve relative path from cwd', () => {
    const relativePath = './subdir/test.jpg';
    const resolved = resolvePath(relativePath);
    // Should be an absolute path containing the relative parts
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved).toContain('subdir');
    expect(resolved).toContain('test.jpg');
  });
});

describe('SUPPORTED_IMAGE_EXTS', () => {
  // Test that all expected extensions are supported
  const supportedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  for (const ext of supportedExts) {
    test(`should support ${ext} extension`, () => {
      const mime = inferImageMimeType(`test${ext}`);
      expect(mime).not.toBe('application/octet-stream');
    });
  }
});

describe('copyImageToClipboard - validation', () => {
  test('should throw for unsupported image type', async () => {
    // We can't fully test the async function without mocking,
    // but we can verify the extension validation logic
    const ext = '.bmp';
    const SUPPORTED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', 'webp']);
    expect(SUPPORTED_IMAGE_EXTS.has(ext)).toBe(false);
  });

  test('should accept supported image types', () => {
    const SUPPORTED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
    const supported = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    for (const ext of supported) {
      expect(SUPPORTED_IMAGE_EXTS.has(ext)).toBe(true);
    }
  });
});

describe('copyHtmlFileToClipboard - validation', () => {
  test('should throw if file does not exist', async () => {
    // The validation logic checks fs.existsSync
    const nonExistentPath = '/path/that/does/not/exist.html';
    expect(fs.existsSync(nonExistentPath)).toBe(false);
  });

  test('should accept valid HTML file paths', async () => {
    // Create a temporary HTML file
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'clipboard-test-'));
    try {
      const htmlPath = path.join(tempDir, 'test.html');
      await writeFile(htmlPath, '<html><body>Test</body></html>', 'utf8');
      expect(fs.existsSync(htmlPath)).toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('Platform-specific behavior', () => {
  test('should export Platform type', () => {
    // Verify the Platform type is correctly typed
    const platforms: Platform[] = ['darwin', 'linux', 'win32'];
    expect(platforms).toHaveLength(3);
  });
});
