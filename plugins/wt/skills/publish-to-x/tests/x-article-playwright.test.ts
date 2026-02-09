/**
 * Tests for x-article-playwright.ts
 */

import { describe, test, expect } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Setup __dirname equivalent for ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the module under test
const scriptPath = path.join(__dirname, '../scripts/x-article-playwright.ts');

describe('x-article-playwright', () => {
  test('should import successfully', async () => {
    // Dynamic import to get exports
    const xArticlePw = await import(scriptPath);
    expect(xArticlePw).toBeDefined();
  });

  test('should export publishArticle function', async () => {
    const xArticlePw = await import(scriptPath);
    expect(typeof xArticlePw.publishArticle).toBe('function');
  });
});
