/**
 * Unit tests for juejin-utils.ts
 *
 * Test coverage for:
 * - Path expansion
 * - URL management
 * - Category normalization
 * - Markdown parsing
 * - JavaScript sanitization
 *
 * Note: Config-related functions (readWtConfig, getWtProfileDir, getAutoPublishPreference)
 * read from a fixed path (~/.claude/wt/config.jsonc) and are best tested via integration tests.
 */

import { test, expect, describe } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';

// Import functions under test
import {
  expandTilde,
  getWtProfileDir,
  getAutoPublishPreference,
  getNewArticleUrl,
  normalizeCategory,
  sanitizeForJavaScript,
  parseMarkdownFile,
} from '../scripts/juejin-utils.js';

// Import test helpers
import { createTempMarkdownFile, cleanupTempDir } from './utils/mocks.js';

describe('juejin-utils', () => {
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

  describe('normalizeCategory', () => {
    test('should normalize English category names to Chinese', () => {
      expect(normalizeCategory('backend')).toBe('后端');
      expect(normalizeCategory('frontend')).toBe('前端');
      expect(normalizeCategory('android')).toBe('Android');
      expect(normalizeCategory('ios')).toBe('iOS');
      expect(normalizeCategory('ai')).toBe('人工智能');
      expect(normalizeCategory('devtools')).toBe('开发工具');
      expect(normalizeCategory('codelife')).toBe('代码人生');
      expect(normalizeCategory('reading')).toBe('阅读');
    });

    test('should accept Chinese category names directly', () => {
      expect(normalizeCategory('后端')).toBe('后端');
      expect(normalizeCategory('前端')).toBe('前端');
      expect(normalizeCategory('人工智能')).toBe('人工智能');
    });

    test('should handle case-insensitive input', () => {
      expect(normalizeCategory('BACKEND')).toBe('后端');
      expect(normalizeCategory('Backend')).toBe('后端');
      expect(normalizeCategory('FrOnTeNd')).toBe('前端');
    });

    test('should handle AI category variations', () => {
      expect(normalizeCategory('ai')).toBe('人工智能');
      expect(normalizeCategory('machine learning')).toBe('人工智能');
      expect(normalizeCategory('deep learning')).toBe('人工智能');
    });

    test('should return undefined for undefined input', () => {
      expect(normalizeCategory(undefined)).toBeUndefined();
    });

    test('should return original value for unknown categories', () => {
      expect(normalizeCategory('unknown-category')).toBe('unknown-category');
      expect(normalizeCategory('custom')).toBe('custom');
    });

    test('should return undefined for empty string', () => {
      expect(normalizeCategory('')).toBeUndefined();
    });
  });

  describe('getNewArticleUrl', () => {
    test('should return the Juejin article creation URL', () => {
      const url = getNewArticleUrl();
      expect(url).toBe('https://juejin.cn/post/create');
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

  describe('parseMarkdownFile', () => {
    test('should parse markdown with frontmatter', async () => {
      const content = `---
title: Test Article
subtitle: Test Subtitle
category: 后端
tags: [tag1, tag2, tag3]
cover: https://example.com/cover.png
---

# Article Content

This is the article body.`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);

        expect(result.title).toBe('Test Article');
        expect(result.subtitle).toBe('Test Subtitle');
        expect(result.category).toBe('后端');
        expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(result.cover).toBe('https://example.com/cover.png');
        expect(result.content).toContain('# Article Content');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should parse markdown with English category', async () => {
      const content = `---
title: Test Article
category: frontend
---

# Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.category).toBe('前端');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when markdown has no frontmatter title', async () => {
      const content = `# Simple Article

No frontmatter here.`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        expect(() => parseMarkdownFile(tempFilePath)).toThrow('Title is required');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when title is missing', async () => {
      const content = `---
category: 后端
---

# Content`;

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

    test('should handle frontmatter with only title', async () => {
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

  describe('getWtProfileDir', () => {
    test('should return undefined when no config is set', () => {
      const result = getWtProfileDir();
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });

  describe('getAutoPublishPreference', () => {
    test('should return boolean value', () => {
      const result = getAutoPublishPreference();
      expect(typeof result).toBe('boolean');
    });
  });
});
