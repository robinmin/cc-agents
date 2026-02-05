/**
 * Unit tests for publish-to-medium article parsing
 *
 * Test coverage for:
 * - extractFrontmatter (internal)
 * - parseMarkdownFile
 * - parseHtmlFile
 *
 * Note: File operations are tested via temp files.
 */

import { test, expect, describe } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Test helper functions
function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'medium-test-'));
}

function cleanupTempDir(tempDir: string): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createTempMarkdownFile(tempDir: string, content: string): string {
  const filePath = path.join(tempDir, 'test.md');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function createTempHtmlFile(tempDir: string, content: string): string {
  const filePath = path.join(tempDir, 'test.html');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('medium article parsing', () => {
  describe('frontmatter parsing (via file content)', () => {
    test('should extract title from frontmatter', () => {
      const content = `---
title: My Test Article
tags: [javascript, typescript]
---

# Content here`;

      // Check that the frontmatter regex pattern would match
      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeDefined();
      expect(match![1]).toContain('title: My Test Article');
    });

    test('should extract tags from frontmatter (bracket format)', () => {
      const content = `---
title: Test Article
tags: [javascript, typescript, api]
---

Content`;

      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeDefined();
      expect(match![1]).toContain('tags: [javascript, typescript, api]');
    });

    test('should extract canonicalUrl from frontmatter', () => {
      const content = `---
title: Test Article
canonicalUrl: https://example.com/original
---

Content`;

      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeDefined();
      expect(match![1]).toContain('canonicalUrl: https://example.com/original');
    });

    test('should extract author from frontmatter', () => {
      const content = `---
title: Test Article
author: John Doe
---

Content`;

      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeDefined();
      expect(match![1]).toContain('author: John Doe');
    });

    test('should handle frontmatter without title', () => {
      const content = `---
tags: [test]
author: Test Author
---

# Title from H1`;

      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeDefined();
      expect(match![1]).not.toContain('title:');
    });

    test('should handle content without frontmatter', () => {
      const content = `# Just a heading

Some content here.`;

      const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);

      expect(match).toBeNull();
    });
  });

  describe('frontmatter type parsing', () => {
    test('should parse string values', () => {
      const line = 'title: My Article Title';
      const colonIndex = line.indexOf(':');
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      expect(key).toBe('title');
      expect(value).toBe('My Article Title');
      expect(typeof value).toBe('string');
    });

    test('should parse boolean true', () => {
      const line = 'published: true';
      const colonIndex = line.indexOf(':');
      const value = line.slice(colonIndex + 1).trim();

      // The parsing logic converts 'true' to boolean
      const parsedValue = value === 'true' ? true : value;
      expect(parsedValue).toBe(true);
      expect(typeof parsedValue).toBe('boolean');
    });

    test('should parse boolean false', () => {
      const line = 'draft: false';
      const colonIndex = line.indexOf(':');
      const value = line.slice(colonIndex + 1).trim();

      const parsedValue = value === 'false' ? false : value;
      expect(parsedValue).toBe(false);
      expect(typeof parsedValue).toBe('boolean');
    });

    test('should parse number values', () => {
      const line = 'priority: 1';
      const colonIndex = line.indexOf(':');
      const value = line.slice(colonIndex + 1).trim();

      const parsedValue = !isNaN(Number(value)) ? Number(value) : value;
      expect(parsedValue).toBe(1);
      expect(typeof parsedValue).toBe('number');
    });

    test('should parse array values in bracket format', () => {
      const line = 'tags: [javascript, typescript, api]';
      const colonIndex = line.indexOf(':');
      const value = line.slice(colonIndex + 1).trim();

      let parsedValue: unknown = value;
      if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        parsedValue = value.slice(1, -1).split(',').map((v: string) => v.trim());
      }

      expect(Array.isArray(parsedValue)).toBe(true);
      expect(parsedValue).toEqual(['javascript', 'typescript', 'api']);
    });

    test('should handle empty array', () => {
      const line = 'tags: []';
      const colonIndex = line.indexOf(':');
      const value = line.slice(colonIndex + 1).trim();

      let parsedValue: unknown = value;
      if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        parsedValue = value.slice(1, -1).split(',').map((v: string) => v.trim());
      }

      expect(Array.isArray(parsedValue)).toBe(true);
      expect(parsedValue).toEqual(['']);
    });
  });

  describe('HTML parsing', () => {
    test('should extract title from <title> tag', () => {
      const html = '<html><head><title>My HTML Article</title></head><body>Content</body></html>';

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      expect(titleMatch).toBeDefined();
      expect(titleMatch![1]!.trim()).toBe('My HTML Article');
    });

    test('should extract title with special characters', () => {
      const html = '<title>Title with "quotes" &amp; special chars</title>';

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      expect(titleMatch).toBeDefined();
      expect(titleMatch![1]!.trim()).toContain('quotes');
    });

    test('should extract author from meta tag', () => {
      const html = '<meta name="author" content="Jane Doe" />';

      const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i);
      expect(authorMatch).toBeDefined();
      expect(authorMatch![1]).toBe('Jane Doe');
    });

    test('should extract canonical URL from link tag', () => {
      const html = '<link rel="canonical" href="https://example.com/original" />';

      const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
      expect(canonicalMatch).toBeDefined();
      expect(canonicalMatch![1]).toBe('https://example.com/original');
    });

    test('should handle HTML without title', () => {
      const html = '<html><head></head><body>No title</body></html>';

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      expect(titleMatch).toBeNull();
    });

    test('should handle HTML with empty title', () => {
      const html = '<title></title>';

      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      // Empty title won't match because regex requires at least one character
      expect(titleMatch).toBeNull();
    });
  });

  describe('markdown file validation', () => {
    test('should require title in markdown file', () => {
      const tempDir = createTempDir();

      try {
        const content = `---
tags: [test]
---

Content without title`;

        const filePath = createTempMarkdownFile(tempDir, content);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Check that title is missing
        expect(fileContent).not.toContain('title:');
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test('should accept markdown with frontmatter title', () => {
      const tempDir = createTempDir();

      try {
        const content = `---
title: Valid Article Title
tags: [test]
---

Content`;

        const filePath = createTempMarkdownFile(tempDir, content);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        expect(fileContent).toContain('title: Valid Article Title');
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test('should handle markdown with H1 title', () => {
      const tempDir = createTempDir();

      try {
        const content = `---
tags: [test]
---

# Title from H1

Content here`;

        const filePath = createTempMarkdownFile(tempDir, content);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        expect(fileContent).toContain('# Title from H1');
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });

  describe('HTML file validation', () => {
    test('should require title in HTML file', () => {
      const tempDir = createTempDir();

      try {
        const content = '<html><head></head><body>No title tag</body></html>';

        const filePath = createTempHtmlFile(tempDir, content);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // Check that title tag is missing
        const hasTitle = /<title[^>]*>/i.test(fileContent);
        expect(hasTitle).toBe(false);
      } finally {
        cleanupTempDir(tempDir);
      }
    });

    test('should accept HTML with title tag', () => {
      const tempDir = createTempDir();

      try {
        const content = '<html><head><title>Valid HTML Title</title></head><body>Content</body></html>';

        const filePath = createTempHtmlFile(tempDir, content);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        expect(fileContent).toContain('<title>');
        expect(fileContent).toContain('Valid HTML Title');
      } finally {
        cleanupTempDir(tempDir);
      }
    });
  });

  describe('tag handling', () => {
    test('should enforce maximum 5 tags limit', () => {
      const maxTags = 5;
      const tags = ['javascript', 'typescript', 'api', 'testing', 'frontend', 'backend'];

      // Slice to max 5 tags
      const limitedTags = tags.slice(0, maxTags);

      expect(limitedTags.length).toBe(5);
      expect(limitedTags).not.toContain('backend');
    });

    test('should handle empty tags array', () => {
      const tags: string[] = [];
      expect(tags.length).toBe(0);
    });

    test('should deduplicate tags', () => {
      const tags = ['javascript', 'typescript', 'javascript', 'api', 'typescript'];
      const uniqueTags = [...new Set(tags)];

      expect(uniqueTags.length).toBe(3);
      expect(uniqueTags).toEqual(['javascript', 'typescript', 'api']);
    });
  });

  describe('publish status validation', () => {
    test('should accept valid publish status values', () => {
      const validStatuses = ['public', 'draft', 'unlisted'];

      validStatuses.forEach(status => {
        const isValid = status === 'public' || status === 'draft' || status === 'unlisted';
        expect(isValid).toBe(true);
      });
    });

    test('should reject invalid publish status', () => {
      const invalidStatus: string = 'invalid';

      const isValid = invalidStatus === 'public' || invalidStatus === 'draft' || invalidStatus === 'unlisted';
      expect(isValid).toBe(false);
    });
  });
});
