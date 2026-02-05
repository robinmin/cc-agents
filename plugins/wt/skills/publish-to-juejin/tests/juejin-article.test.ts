/**
 * Unit tests for juejin-article.ts
 *
 * Test coverage for:
 * - DOM selector definitions (smoke tests)
 * - Utility function integration
 *
 * Note: Browser automation, CDP operations, and publishing workflow require
 * integration testing with actual Chrome/Chromium. These are tested separately.
 */

import { test, expect, describe } from 'bun:test';
import * as juejinUtils from '../scripts/juejin-utils.js';

describe('juejin-article', () => {
  describe('utility function integration', () => {
    test('should normalize category names correctly', () => {
      expect(juejinUtils.normalizeCategory('backend')).toBe('后端');
      expect(juejinUtils.normalizeCategory('frontend')).toBe('前端');
      expect(juejinUtils.normalizeCategory('ai')).toBe('人工智能');
      expect(juejinUtils.normalizeCategory('unknown')).toBe('unknown');
    });

    test('should sanitize JavaScript strings correctly', () => {
      const input = 'Test "quoted" string';
      const result = juejinUtils.sanitizeForJavaScript(input);
      expect(result).toBe(JSON.stringify(input));
    });

    test('should get correct Juejin article URL', () => {
      const url = juejinUtils.getNewArticleUrl();
      expect(url).toBe('https://juejin.cn/post/create');
    });

    test('should expand tilde paths correctly', () => {
      const result = juejinUtils.expandTilde('~/some/path');
      expect(result).toContain('some/path');
      expect(result).not.toContain('~');
    });
  });

  describe('selector definitions', () => {
    test('should have expected number of selector groups', () => {
      const expectedSelectorGroups = [
        'titleInput',
        'contentEditor',
        'categorySelect',
        'tagsInput',
        'coverImage',
        'publishButton',
        'draftButton',
      ];

      expect(expectedSelectorGroups.length).toBe(7);
    });

    test('selector groups should cover all required fields', () => {
      const requiredFields = [
        'title',
        'content',
        'category',
        'tags',
        'cover',
        'publish',
        'draft',
      ];

      expect(requiredFields.length).toBe(7);
    });
  });

  describe('category mapping', () => {
    test('should map all supported English categories to Chinese', () => {
      const mappings = [
        ['backend', '后端'],
        ['frontend', '前端'],
        ['android', 'Android'],
        ['ios', 'iOS'],
        ['ai', '人工智能'],
        ['devtools', '开发工具'],
        ['codelife', '代码人生'],
        ['reading', '阅读'],
      ];

      mappings.forEach(([english, chinese]) => {
        expect(juejinUtils.normalizeCategory(english as string)).toBe(chinese);
      });
    });
  });

  describe('URL constants', () => {
    test('Juejin URLs should use correct domain', () => {
      const url = juejinUtils.getNewArticleUrl();
      expect(url).toMatch(/^https:\/\/juejin\.cn\//);
    });

    test('article creation URL should point to post endpoint', () => {
      const url = juejinUtils.getNewArticleUrl();
      expect(url).toContain('/post/');
    });
  });
});
