/**
 * Shared test utilities and mocks for publish-to-qiita tests
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

  const tempDir = await mkdtemp(join(tmpdir(), 'qiita-test-'));
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
tags:
  - JavaScript
  - React
private: false
slide: false
---

# Article Title

This is the article content.`,

  minimal: `---
title: Minimal Article
tags:
  - tag1
---

# Simple Content`,

  noTags: `---
title: No Tags
---

Content`,

  private: `---
title: Private Article
tags:
  - secret
private: true
---

Content`,

  withOrganization: `---
title: Org Article
tags:
  - tag1
organization_url_name: your-org
---

Content`,
};
