/**
 * Unit tests for x-browser.ts
 */

import { describe, test, expect } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '../scripts/x-browser.ts');

describe('x-browser.ts exports', () => {
  test('should export postToX function', async () => {
    const xBrowser = await import(scriptPath);
    expect(typeof xBrowser.postToX).toBe('function');
  });

  test('should export X_COMPOSE_URL constant', async () => {
    const xBrowser = await import(scriptPath);
    expect(xBrowser.X_COMPOSE_URL).toBe('https://x.com/compose/post');
  });
});

describe('postToX function', () => {
  test('should be callable with options object', async () => {
    const xBrowser = await import(scriptPath);
    expect(typeof xBrowser.postToX).toBe('function');
  });
});
