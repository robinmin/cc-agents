/**
 * Unit tests for qiita-article.ts
 *
 * Test coverage for:
 * - Smoke tests for exported functions
 * - CLI interface validation
 *
 * Note: CLI execution requires integration tests with actual Qiita API.
 */

import { test, expect, describe } from 'bun:test';
import * as qiitaUtils from '../scripts/qiita-utils.js';

describe('qiita-article', () => {
  describe('utility function integration', () => {
    test('should parse markdown with tags correctly', async () => {
      const content = `---
title: Test
tags: [JavaScript, TypeScript]
---

Content`;

      const { writeFile } = await import('node:fs/promises');
      const { mkdtemp } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const { rm } = await import('node:fs/promises');

      const tempDir = await mkdtemp(join(tmpdir(), 'qiita-test-'));
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, content, 'utf-8');

      try {
        const result = qiitaUtils.parseMarkdownFile(filePath);
        expect(result.title).toBe('Test');
        expect(result.tags).toEqual(['JavaScript', 'TypeScript']);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should require tags in frontmatter', async () => {
      const content = `---
title: Test
---

Content`;

      const { writeFile } = await import('node:fs/promises');
      const { mkdtemp } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const { rm } = await import('node:fs/promises');

      const tempDir = await mkdtemp(join(tmpdir(), 'qiita-test-'));
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, content, 'utf-8');

      try {
        expect(() => qiitaUtils.parseMarkdownFile(filePath)).toThrow('Tags are required');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('should throw error when tags are empty', async () => {
      const content = `---
title: Test
tags: []
---

Content`;

      const { writeFile } = await import('node:fs/promises');
      const { mkdtemp } = await import('node:fs/promises');
      const { join } = await import('node:path');
      const { tmpdir } = await import('node:os');
      const { rm } = await import('node:fs/promises');

      const tempDir = await mkdtemp(join(tmpdir(), 'qiita-test-'));
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, content, 'utf-8');

      try {
        expect(() => qiitaUtils.parseMarkdownFile(filePath)).toThrow('Tags are required');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('API helpers', () => {
    test('should build API headers correctly', () => {
      const headers = qiitaUtils.buildApiHeaders('test-token');
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    test('should build API payload correctly', () => {
      const article = {
        title: 'Test',
        content: 'Content',
        tags: ['tag1', 'tag2'],
        private: false,
      };

      const payload = qiitaUtils.buildApiPayload(article);
      expect(payload.title).toBe('Test');
      expect(payload.tags).toEqual([{ name: 'tag1' }, { name: 'tag2' }]);
    });
  });

  describe('URL constants', () => {
    test('Qiita URLs should use correct domain', () => {
      expect(qiitaUtils.QIITA_URLS.home).toBe('https://qiita.com');
      expect(qiitaUtils.QIITA_URLS.apiBase).toBe('https://qiita.com/api/v2');
    });
  });
});
