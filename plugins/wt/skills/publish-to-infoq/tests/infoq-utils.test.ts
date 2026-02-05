/**
 * Unit tests for infoq-utils.ts
 *
 * Test coverage for:
 * - URL constants
 * - Category normalization
 * - Markdown parsing
 * - JavaScript sanitization
 * - Configuration functions
 */

import { test, expect, describe } from 'bun:test';
import * as os from 'node:os';
import * as path from 'node:path';

// Import functions under test
import {
  INFOQ_URLS,
  INFOQ_CATEGORIES,
  getNewArticleUrl,
  normalizeCategory,
  parseMarkdownFile,
  sanitizeForJavaScript,
  expandTilde,
  getWtProfileDir,
  getAutoPublishPreference,
} from '../scripts/infoq-utils.js';

// Import test helpers
import { createTempMarkdownFile, cleanupTempDir } from './utils/mocks.js';

describe('infoq-utils', () => {
  describe('URL constants', () => {
    test('INFOQ_URLS should have all required URLs', () => {
      expect(INFOQ_URLS.home).toBe('https://xie.infoq.cn');
      expect(INFOQ_URLS.login).toBe('https://xie.infoq.cn/auth/login');
      expect(INFOQ_URLS.newArticle).toBe('https://xie.infoq.cn/article/create');
    });
  });

  describe('INFOQ_CATEGORIES', () => {
    test('should have all expected categories', () => {
      expect(INFOQ_CATEGORIES.architecture).toBe('Architecture');
      expect(INFOQ_CATEGORIES.ai).toBe('AI');
      expect(INFOQ_CATEGORIES.frontend).toBe('Frontend');
      expect(INFOQ_CATEGORIES.operations).toBe('Operations');
      expect(INFOQ_CATEGORIES.opensource).toBe('Open Source');
      expect(INFOQ_CATEGORIES.java).toBe('Java');
      expect(INFOQ_CATEGORIES.algorithms).toBe('Algorithms');
      expect(INFOQ_CATEGORIES.bigdata).toBe('Big Data');
      expect(INFOQ_CATEGORIES.cloud).toBe('Cloud Computing');
    });
  });

  describe('getNewArticleUrl', () => {
    test('should return the InfoQ article creation URL', () => {
      const url = getNewArticleUrl();
      expect(url).toBe('https://xie.infoq.cn/article/create');
    });
  });

  describe('normalizeCategory', () => {
    test('should normalize English category names to InfoQ format', () => {
      expect(normalizeCategory('architecture')).toBe('Architecture');
      expect(normalizeCategory('ai')).toBe('AI');
      expect(normalizeCategory('ml')).toBe('AI');
      expect(normalizeCategory('machine learning')).toBe('AI');
      expect(normalizeCategory('artificial intelligence')).toBe('AI');
      expect(normalizeCategory('frontend')).toBe('Frontend');
      expect(normalizeCategory('operations')).toBe('Operations');
      expect(normalizeCategory('ops')).toBe('Operations');
      expect(normalizeCategory('devops')).toBe('Operations');
      expect(normalizeCategory('opensource')).toBe('Open Source');
      expect(normalizeCategory('open source')).toBe('Open Source');
      expect(normalizeCategory('java')).toBe('Java');
      expect(normalizeCategory('algorithms')).toBe('Algorithms');
      expect(normalizeCategory('bigdata')).toBe('Big Data');
      expect(normalizeCategory('big data')).toBe('Big Data');
      expect(normalizeCategory('cloud')).toBe('Cloud Computing');
      expect(normalizeCategory('cloud computing')).toBe('Cloud Computing');
    });

    test('should accept InfoQ category names directly', () => {
      expect(normalizeCategory('Architecture')).toBe('Architecture');
      expect(normalizeCategory('AI')).toBe('AI');
      expect(normalizeCategory('Open Source')).toBe('Open Source');
    });

    test('should handle case-insensitive input', () => {
      expect(normalizeCategory('AI')).toBe('AI');
      expect(normalizeCategory('ai')).toBe('AI');
      expect(normalizeCategory('Ai')).toBe('AI');
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
category: ai
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
        expect(result.category).toBe('AI');
        expect(result.tags).toEqual(['tag1', 'tag2', 'tag3']);
        expect(result.content).toContain('# Article Content');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should parse markdown with AI category variations', async () => {
      const content = `---
title: Test Article
category: machine learning
---

# Content`;

      const tempFilePath = await createTempMarkdownFile(content);
      const tempDir = path.dirname(tempFilePath);

      try {
        const result = parseMarkdownFile(tempFilePath);
        expect(result.category).toBe('AI');
      } finally {
        await cleanupTempDir(tempDir);
      }
    });

    test('should throw error when title is missing', async () => {
      const content = `---
category: ai
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
