/**
 * Unit tests for substack-utils.ts
 *
 * Test coverage for:
 * - URL constants
 * - URL generation with publication
 * - Markdown parsing
 * - JavaScript sanitization
 * - Configuration functions
 */

import { test, expect, describe } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';

// Import functions under test
import {
  SUBSTACK_URLS,
  getNewPostUrl,
  parseMarkdownFile,
  markdownToHtml,
  sanitizeForJavaScript,
  expandTilde,
  getWtProfileDir,
  getAutoPublishPreference,
} from '../scripts/substack-utils.js';

// Import test helpers
import { createTempMarkdownFile, cleanupTempDir } from './utils/mocks.js';

describe('substack-utils', () => {
  describe('URL constants', () => {
    test('SUBSTACK_URLS should have all required URLs', () => {
      expect(SUBSTACK_URLS.home).toBe('https://substack.com');
      expect(SUBSTACK_URLS.newPost).toBe('https://substack.com/new');
      expect(SUBSTACK_URLS.publish).toBe('https://substack.com/publish');
    });
  });

  describe('getNewPostUrl', () => {
    test('should return default Substack new post URL', () => {
      const url = getNewPostUrl();
      expect(url).toBe('https://substack.com/new');
    });

    test('should return URL with publication URL', () => {
      const publicationUrl = 'https://example.substack.com';
      const url = getNewPostUrl(publicationUrl);
      expect(url).toBe('https://example.substack.com/new');
    });

    test('should remove trailing slash from publication URL', () => {
      const publicationUrl = 'https://example.substack.com/';
      const url = getNewPostUrl(publicationUrl);
      expect(url).toBe('https://example.substack.com/new');
    });

    test('should handle empty publication URL', () => {
      const url = getNewPostUrl('');
      expect(url).toBe('https://substack.com/new');
    });
  });

  describe('sanitizeForJavaScript', () => {
    test('should escape quotes properly', () => {
      expect(sanitizeForJavaScript('Hello "World"')).toBe('"Hello \\"World\\""');
      expect(sanitizeForJavaScript("It's great")).toBe('"It\'s great"');
    });

    test('should escape backslashes', () => {
      expect(sanitizeForJavaScript('path\\to\\file')).toBe('"path\\\\to\\\\file"');
    });

    test('should escape newlines', () => {
      expect(sanitizeForJavaScript('line1\nline2')).toBe('"line1\\nline2"');
    });

    test('should handle Unicode characters', () => {
      expect(sanitizeForJavaScript('中文测试')).toBe('"中文测试"');
      expect(sanitizeForJavaScript('emoji 🎉')).toBe('"emoji 🎉"');
    });

    test('should handle empty string', () => {
      expect(sanitizeForJavaScript('')).toBe('""');
    });
  });

  describe('markdownToHtml', () => {
    test('should escape markdown for JavaScript embedding', () => {
      const markdown = 'Line 1\nLine 2';
      const result = markdownToHtml(markdown);

      expect(typeof result).toBe('string');
      expect(result).toContain('\\n');
    });

    test('should escape quotes in markdown', () => {
      const markdown = '"quoted text"';
      const result = markdownToHtml(markdown);

      expect(result).toContain('\\"');
    });

    test('should escape backslashes in markdown', () => {
      const markdown = 'path\\to\\file';
      const result = markdownToHtml(markdown);

      expect(result).toContain('\\\\');
    });
  });

  describe('parseMarkdownFile', () => {
    test('should parse markdown with frontmatter', async () => {
      const content = `---
title: Test Article
subtitle: Test Subtitle
tags: [tag1, tag2, tag3]
---

# Article Content

This is the article body.`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);

        expect(result.title).toBe('Test Article');
        expect(result.subtitle).toBe('Test Subtitle');
        expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(result.content).toContain('# Article Content');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when title is missing', async () => {
      const content = `---
tags:
  - tag1
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

    test('should parse array tags correctly', async () => {
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

    test('should parse frontmatter with only title', async () => {
      const content = `---
title: Only Title
---

Content here`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.title).toBe('Only Title');
        expect(result.content).toContain('Content here');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });
  });

  describe('expandTilde', () => {
    test('should expand tilde to home directory', () => {
      const result = expandTilde('~/some/path');
      expect(result).toBe(path.join(os.homedir(), 'some/path'));
    });

    test('should not modify paths without tilde', () => {
      const result = expandTilde('/absolute/path');
      expect(result).toBe('/absolute/path');
    });

    test('should handle empty string', () => {
      const result = expandTilde('');
      expect(result).toBe('');
    });
  });

  describe('configuration functions', () => {
    test('getWtProfileDir should return string or undefined', () => {
      const result = getWtProfileDir();
      expect(result === undefined || typeof result === 'string').toBe(true);
    });

    test('getAutoPublishPreference should return boolean', () => {
      const result = getAutoPublishPreference();
      expect(typeof result).toBe('boolean');
    });
  });
});
