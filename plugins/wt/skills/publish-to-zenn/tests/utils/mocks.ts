/**
 * Shared test utilities and mocks for publish-to-zenn tests
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

  const tempDir = await mkdtemp(join(tmpdir(), 'zenn-test-'));
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
slug: complete-article
type: tech
emoji: ✅
topics:
  - JavaScript
  - TypeScript
published: true
---

# Article Title

This is the article content.`,

  minimal: `---
title: Minimal Article
type: tech
---

# Simple Content`,

  ideaType: `---
title: Idea Article
type: idea
---

Content.`,

  noFrontmatter: `# Article Without Frontmatter

This article has no frontmatter.`,

  invalidType: `---
title: Invalid Type
type: invalid
---

Content`,
};
