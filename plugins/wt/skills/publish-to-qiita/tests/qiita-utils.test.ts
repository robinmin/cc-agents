/**
 * Unit tests for qiita-utils.ts
 *
 * Test coverage for:
 * - URL constants
 * - Markdown parsing
 * - API helper functions
 * - Token and configuration functions
 *
 * Note: Config-related functions read from a fixed path and are smoke tested.
 */

import { test, expect, describe } from 'bun:test';

// Import functions under test
import {
  QIITA_URLS,
  parseMarkdownFile,
  buildApiHeaders,
  buildApiPayload,
  parseApiResponse,
  getMethodPreference,
  getDefaultPrivatePreference,
  getAccessToken,
  getOrganizationUrlName,
} from '../scripts/qiita-utils.js';

// Import test helpers
import { createTempMarkdownFile, cleanupTempDir } from './utils/mocks.js';
import * as path from 'node:path';

describe('qiita-utils', () => {
  describe('URL constants', () => {
    test('QIITA_URLS should have all required URLs', () => {
      expect(QIITA_URLS.home).toBe('https://qiita.com');
      expect(QIITA_URLS.login).toBe('https://qiita.com/login');
      expect(QIITA_URLS.tokenNew).toBe('https://qiita.com/settings/tokens/new');
      expect(QIITA_URLS.apiBase).toBe('https://qiita.com/api/v2');
      expect(QIITA_URLS.items).toBe('https://qiita.com/api/v2/items');
    });
  });

  describe('parseMarkdownFile', () => {
    test('should parse markdown with complete frontmatter', async () => {
      const content = `---
title: Test Article
tags: [JavaScript, React]
private: false
slide: false
---

# Article Content

This is the article body.`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);

        expect(result.title).toBe('Test Article');
        expect(result.tags).toEqual(['JavaScript', 'React']);
        expect(result.private).toBe(false);
        expect(result.slide).toBe(false);
        expect(result.content).toContain('# Article Content');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should parse markdown with string tags (YAML array format)', async () => {
      const content = `---
title: Test
tags: [tag1, tag2, tag3]
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when title is missing', async () => {
      const content = `---
tags: [tag1]
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        expect(() => parseMarkdownFile(tempFilePath)).toThrow('Title is required');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when tags are missing', async () => {
      const content = `---
title: Test
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        expect(() => parseMarkdownFile(tempFilePath)).toThrow('Tags are required');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should default private to false when not specified', async () => {
      const content = `---
title: Test
tags: [tag1]
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.private).toBe(false);
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should parse organization_url_name', async () => {
      const content = `---
title: Test
tags: [tag1]
organization_url_name: your-org
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.organization_url_name).toBe('your-org');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should parse tweet option', async () => {
      const content = `---
title: Test
tags: [tag1]
tweet: true
---

Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.tweet).toBe(true);
      } finally {
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe('buildApiHeaders', () => {
    test('should build headers with authorization', () => {
      const headers = buildApiHeaders('test-token');

      expect(headers).toEqual({
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('buildApiPayload', () => {
    test('should build minimal payload', () => {
      const article = {
        title: 'Test Title',
        content: 'Test content',
        tags: ['tag1', 'tag2'],
        private: false,
      };

      const payload = buildApiPayload(article);

      expect(payload).toEqual({
        title: 'Test Title',
        body: 'Test content',
        tags: [{ name: 'tag1' }, { name: 'tag2' }],
        private: false,
      });
    });

    test('should build payload with optional fields', () => {
      const article = {
        title: 'Test Title',
        content: 'Test content',
        tags: ['tag1'],
        private: true,
        slide: true,
        organization_url_name: 'your-org',
        tweet: false,
      };

      const payload = buildApiPayload(article);

      expect(payload).toEqual({
        title: 'Test Title',
        body: 'Test content',
        tags: [{ name: 'tag1' }],
        private: true,
        slide: true,
        organization_url_name: 'your-org',
        tweet: false,
      });
    });

    test('should not include undefined optional fields', () => {
      const article = {
        title: 'Test Title',
        content: 'Test content',
        tags: ['tag1'],
        private: false,
      };

      const payload = buildApiPayload(article);

      expect(payload).not.toHaveProperty('slide');
      expect(payload).not.toHaveProperty('organization_url_name');
      expect(payload).not.toHaveProperty('tweet');
    });
  });

  describe('parseApiResponse', () => {
    test('should parse valid API response', () => {
      const response = {
        id: 'abc123',
        title: 'Test Title',
        url: 'https://qiita.com/abc123',
        rendered_body: '<p>Test</p>',
        body: 'Test',
        private: false,
        slide: false,
        tags: [{ name: 'tag1', versions: [] }],
        created_at: '2024-01-01T00:00:00+09:00',
        updated_at: '2024-01-01T00:00:00+09:00',
        user: {
          id: 'user123',
          name: 'Test User',
          profile_image_url: 'https://example.com/avatar.png',
        },
      };

      const result = parseApiResponse(response);

      expect(result.id).toBe('abc123');
      expect(result.title).toBe('Test Title');
      expect(result.url).toBe('https://qiita.com/abc123');
    });

    test('should throw error for invalid response (no id)', () => {
      const response = {
        title: 'Test',
        url: 'https://example.com',
      };

      expect(() => parseApiResponse(response)).toThrow('API response missing required fields');
    });

    test('should throw error for non-object response', () => {
      expect(() => parseApiResponse(null)).toThrow('Invalid API response');
      expect(() => parseApiResponse('string')).toThrow('Invalid API response');
    });
  });

  describe('configuration functions', () => {
    test('getMethodPreference should return cli or api', () => {
      const result = getMethodPreference();
      expect(result === 'cli' || result === 'api').toBe(true);
    });

    test('getDefaultPrivatePreference should return boolean', () => {
      const result = getDefaultPrivatePreference();
      expect(typeof result).toBe('boolean');
    });

    test('getAccessToken should return string or undefined', () => {
      const result = getAccessToken();
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    test('getOrganizationUrlName should return string or undefined', () => {
      const result = getOrganizationUrlName();
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });
});
