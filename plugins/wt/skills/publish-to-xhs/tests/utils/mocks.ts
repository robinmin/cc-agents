/**
 * Shared test utilities and mocks for publish-to-xhs tests
 */

/**
 * Mock file system operations
 */
export class MockFileSystem {
  private files = new Map<string, string>();

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  getFile(path: string): string | undefined {
    return this.files.get(path);
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  clear(): void {
    this.files.clear();
  }
}

/**
 * Mock WT configuration
 */
export interface MockWtConfig {
  version?: string;
  'publish-to-xhs'?: {
    profile_dir?: string;
    auto_publish?: boolean;
  };
}

export function createMockConfigContent(config: MockWtConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Sample markdown fixtures
 */
export const SAMPLE_MARKDOWN = {
  complete: `---
title: Complete Article
subtitle: Test Subtitle
category: technology
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

  chineseCategory: `---
title: 中文文章
category: 科技
tags: [编程, 测试]
---

# 中文内容`,

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
    category: '科技',
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

  const tempDir = await mkdtemp(join(tmpdir(), 'xhs-test-'));
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
 * Mock CDP session
 */
export interface MockCdpSession {
  cdp: {
    send: jest.Mock;
    close: jest.Mock;
  };
  sessionId: string;
  targetId: string;
}

export function createMockCdpSession(sessionId = 'test-session', targetId = 'test-target'): MockCdpSession {
  const mockSend = jest.fn().mockResolvedValue({ result: { value: 'mock-result' } });
  const mockClose = jest.fn();

  return {
    cdp: {
      send: mockSend,
      close: mockClose,
    },
    sessionId,
    targetId,
  };
}

/**
 * Wait for async operations
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry helper for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 100,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await delay(delayMs);
      }
    }
  }

  throw lastError!;
}

/**
 * Test helper to create temp config files
 * Returns the path to the temp config file
 */
export async function createTempConfigFile(
  content: string,
  filename = 'config.jsonc',
): Promise<{ tempDir: string; configPath: string }> {
  const { writeFile } = await import('node:fs/promises');
  const { mkdtemp } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');

  const tempDir = await mkdtemp(join(tmpdir(), 'xhs-config-test-'));
  const configPath = join(tempDir, filename);
  await writeFile(configPath, content, 'utf-8');

  return { tempDir, configPath };
}
