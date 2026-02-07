/**
 * Unit tests for x-quote.ts
 */

import { describe, test, expect } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '../scripts/x-quote.ts');

describe('x-quote.ts exports', () => {
  test('should export quotePost function', async () => {
    const xQuote = await import(scriptPath);
    expect(typeof xQuote.quotePost).toBe('function');
  });

  test('should export extractTweetUrl function', async () => {
    const xQuote = await import(scriptPath);
    expect(typeof xQuote.extractTweetUrl).toBe('function');
  });
});

describe('extractTweetUrl', () => {
  test('should return normalized URL for x.com URL', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('https://x.com/user/status/1234567890');
    expect(result).toBe('https://x.com/user/status/1234567890');
  });

  test('should return normalized URL for twitter.com URL', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('https://twitter.com/user/status/1234567890');
    expect(result).toBe('https://x.com/user/status/1234567890');
  });

  test('should strip query parameters from URL', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('https://x.com/user/status/1234567890?param=value');
    expect(result).toBe('https://x.com/user/status/1234567890');
  });

  test('should return null for non-tweet URL', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('https://example.com/page');
    expect(result).toBeNull();
  });

  test('should return null for partial URL', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('not-a-url');
    expect(result).toBeNull();
  });

  test('should handle URL without protocol but with valid format', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('x.com/user/status/123');
    expect(result).toBe('x.com/user/status/123');
  });

  test('should handle http protocol', async () => {
    const xQuote = await import(scriptPath);
    const result = xQuote.extractTweetUrl('http://x.com/user/status/123');
    expect(result).toBe('http://x.com/user/status/123');
  });
});
