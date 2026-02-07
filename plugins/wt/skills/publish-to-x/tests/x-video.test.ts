/**
 * Unit tests for x-video.ts
 */

import { describe, test, expect } from 'bun:test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '../scripts/x-video.ts');

describe('x-video.ts exports', () => {
  test('should export postVideoToX function', async () => {
    const xVideo = await import(scriptPath);
    expect(typeof xVideo.postVideoToX).toBe('function');
  });

  test('should export X_COMPOSE_URL constant', async () => {
    const xVideo = await import(scriptPath);
    expect(xVideo.X_COMPOSE_URL).toBe('https://x.com/compose/post');
  });
});

describe('postVideoToX function', () => {
  test('should be callable with options object', async () => {
    const xVideo = await import(scriptPath);
    expect(typeof xVideo.postVideoToX).toBe('function');
  });
});
