/**
 * Shared test utilities and mocks for publish-to-juejin tests
 */

/**
 * Test helper to create temp markdown files
 */
export async function createTempMarkdownFile(
  content: string,
  filename = 'test-article.md',
): Promise<string> {
  const { writeFile } = await import('node:fs/promises');
  const { mkdtemp } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');

  const tempDir = await mkdtemp(join(tmpdir(), 'juejin-test-'));
  const filePath = join(tempDir, filename);
  await writeFile(filePath, content, 'utf-8');

  return filePath;
}

/**
 * Test helper to cleanup temp files
 */
export async function cleanupTempDir(dirPath: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  await rm(dirPath, { recursive: true, force: true });
}

/**
 * Sample markdown fixtures
 */
export const SAMPLE_MARKDOWN = {
  complete: `---
title: Complete Article
subtitle: Test Subtitle
category: backend
tags: [tag1, tag2, tag3]
cover: https://example.com/cover.png
---

# Article Title

This is the article content.`,

  minimal: `---
title: Minimal Article
---

# Simple Content`,

  noFrontmatter: `# Article Without Frontmatter

This article has no frontmatter.`,

  englishCategory: `---
title: English Category
category: frontend
---

Content.`,

  emptyTags: `---
title: Empty Tags
tags: []
---

Content.`,
};

/**
 * Sample parsed article results
 */
export const SAMPLE_PARSED_ARTICLES = {
  complete: {
    title: 'Complete Article',
    subtitle: 'Test Subtitle',
    category: '后端',
    tags: ['tag1', 'tag2', 'tag3'],
    cover: 'https://example.com/cover.png',
    content: '\n# Article Title\n\nThis is the article content.',
  },

  minimal: {
    title: 'Minimal Article',
    content: '\n# Simple Content',
  },

  noFrontmatter: {
    title: '',
    content: '\n# Article Without Frontmatter\n\nThis article has no frontmatter.',
  },
};
