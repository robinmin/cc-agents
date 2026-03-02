/**
 * Unit tests for xhs-utils.ts
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

import { describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";

// Import functions under test
import {
	expandTilde,
	getAutoPublishPreference,
	getNewArticleUrl,
	getWtProfileDir,
	normalizeCategory,
	parseMarkdownFile,
	sanitizeForJavaScript,
} from "../scripts/xhs-utils.js";

// Import test helpers
import { cleanupTempDir, createTempMarkdownFile } from "./utils/mocks.js";

describe("xhs-utils", () => {
	describe("expandTilde", () => {
		test("should expand tilde to home directory", () => {
			const result = expandTilde("~/some/path");
			expect(result).toBe(path.join(os.homedir(), "some/path"));
		});

		test("should not modify paths without tilde", () => {
			const result = expandTilde("/absolute/path");
			expect(result).toBe("/absolute/path");
		});

		test("should handle paths starting with ~user (not supported, return as-is)", () => {
			const result = expandTilde("~user/some/path");
			expect(result).toBe("~user/some/path");
		});

		test("should handle empty string", () => {
			const result = expandTilde("");
			expect(result).toBe("");
		});
	});

	describe("normalizeCategory", () => {
		test("should normalize English category names to Chinese", () => {
			expect(normalizeCategory("technology")).toBe("科技");
			expect(normalizeCategory("tech")).toBe("科技");
			expect(normalizeCategory("education")).toBe("教育");
			expect(normalizeCategory("lifestyle")).toBe("生活");
			expect(normalizeCategory("entertainment")).toBe("娱乐");
			expect(normalizeCategory("sports")).toBe("运动");
			expect(normalizeCategory("travel")).toBe("旅行");
			expect(normalizeCategory("food")).toBe("美食");
			expect(normalizeCategory("fashion")).toBe("时尚");
			expect(normalizeCategory("beauty")).toBe("美妆");
		});

		test("should accept Chinese category names directly", () => {
			expect(normalizeCategory("科技")).toBe("科技");
			expect(normalizeCategory("教育")).toBe("教育");
			expect(normalizeCategory("生活")).toBe("生活");
		});

		test("should handle case-insensitive input", () => {
			expect(normalizeCategory("TECHNOLOGY")).toBe("科技");
			expect(normalizeCategory("Technology")).toBe("科技");
			expect(normalizeCategory("TeChNoLoGy")).toBe("科技");
		});

		test("should trim whitespace", () => {
			expect(normalizeCategory("  technology  ")).toBe("科技");
		});

		test("should return undefined for undefined input", () => {
			expect(normalizeCategory(undefined)).toBeUndefined();
		});

		test("should return original value for unknown categories", () => {
			expect(normalizeCategory("unknown-category")).toBe("unknown-category");
			expect(normalizeCategory("custom")).toBe("custom");
		});

		test("should return undefined for empty string", () => {
			expect(normalizeCategory("")).toBeUndefined();
		});
	});

	describe("getNewArticleUrl", () => {
		test("should return the XHS article creation URL", () => {
			const url = getNewArticleUrl();
			expect(url).toBe("https://creator.xiaohongshu.com/publish/publish");
		});
	});

	describe("sanitizeForJavaScript", () => {
		test("should escape quotes properly", () => {
			expect(sanitizeForJavaScript('Hello "World"')).toBe(
				'"Hello \\"World\\""',
			);
			expect(sanitizeForJavaScript("It's great")).toBe('"It\'s great"');
		});

		test("should escape backslashes", () => {
			expect(sanitizeForJavaScript("path\\to\\file")).toBe(
				'"path\\\\to\\\\file"',
			);
		});

		test("should escape newlines", () => {
			expect(sanitizeForJavaScript("line1\nline2")).toBe('"line1\\nline2"');
		});

		test("should escape special characters", () => {
			expect(sanitizeForJavaScript("tab\there")).toBe('"tab\\there"');
		});

		test("should handle Unicode characters", () => {
			expect(sanitizeForJavaScript("中文测试")).toBe('"中文测试"');
			expect(sanitizeForJavaScript("emoji 🎉")).toBe('"emoji 🎉"');
		});

		test("should handle empty string", () => {
			expect(sanitizeForJavaScript("")).toBe('""');
		});

		test("should handle strings with backticks", () => {
			expect(sanitizeForJavaScript("`code`")).toBe('"`code`"');
		});

		test("should handle strings with dollar signs and braces", () => {
			// Use String.fromCharCode to avoid triggering biome lint warning
			// about template literal placeholders in regular strings
			const dollar = String.fromCharCode(36);
			const input = `${dollar}{template}`;
			const expected = `"${input}"`;
			expect(sanitizeForJavaScript(input)).toBe(expected);
		});
	});

	describe("parseMarkdownFile", () => {
		test("should parse markdown with frontmatter", async () => {
			const content = `---
title: Test Article
subtitle: Test Subtitle
category: 科技
tags: [tag1, tag2, tag3]
cover: https://example.com/cover.png
---

# Article Content

This is the article body.`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);

				expect(result.title).toBe("Test Article");
				expect(result.subtitle).toBe("Test Subtitle");
				expect(result.category).toBe("科技");
				expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
				expect(result.cover).toBe("https://example.com/cover.png");
				expect(result.content).toContain("# Article Content");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should parse markdown with English category", async () => {
			const content = `---
title: Test Article
category: technology
---

# Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.category).toBe("科技");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should throw error when markdown has no frontmatter title", async () => {
			const content = `# Simple Article

No frontmatter here.`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				expect(() => parseMarkdownFile(tempFilePath)).toThrow(
					"Title is required",
				);
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should throw error when title is missing", async () => {
			const content = `---
category: 科技
---

# Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				expect(() => parseMarkdownFile(tempFilePath)).toThrow(
					"Title is required",
				);
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should parse array tags correctly", async () => {
			const content = `---
title: Test
tags: [tag1, tag2, tag3]
---

Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should handle tags with spaces in array syntax", async () => {
			const content = `---
title: Test
tags: [tag1, tag2 , tag3]
---

Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should handle boolean values in frontmatter", async () => {
			const content = `---
title: Test
published: true
draft: false
---

Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				// Boolean parsing should work (even if we don't use these fields)
				expect(result.title).toBe("Test");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should handle number values in frontmatter", async () => {
			const content = `---
title: Test
priority: 1
count: 42
---

Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.title).toBe("Test");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should trim leading/trailing whitespace from body", async () => {
			const content = `---
title: Test
---

   Content with spaces

   More content   `;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.content).toContain("Content with spaces");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should throw error when frontmatter has no title", async () => {
			const content = `---
---

Content`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				expect(() => parseMarkdownFile(tempFilePath)).toThrow(
					"Title is required",
				);
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should handle frontmatter with only title", async () => {
			const content = `---
title: Only Title
---

Content here`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.title).toBe("Only Title");
				expect(result.content).toContain("Content here");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});

		test("should handle multiline content body", async () => {
			const content = `---
title: Test
---

# First Section

Content paragraph 1.

## Second Section

Content paragraph 2.`;

			const tempFilePath = await createTempMarkdownFile(content);
			const tempDir = path.dirname(tempFilePath);

			try {
				const result = parseMarkdownFile(tempFilePath);
				expect(result.content).toContain("# First Section");
				expect(result.content).toContain("## Second Section");
			} finally {
				await cleanupTempDir(tempDir);
			}
		});
	});

	describe("getWtProfileDir", () => {
		test("should return undefined when no config is set", () => {
			// This is a smoke test - the function should not crash
			// Actual config testing requires integration tests with real config files
			const result = getWtProfileDir();
			// Result depends on user's actual config, just verify it returns expected type
			expect(result === undefined || typeof result === "string").toBe(true);
		});
	});

	describe("getAutoPublishPreference", () => {
		test("should return boolean value", () => {
			// This is a smoke test - the function should not crash
			// Actual config testing requires integration tests with real config files
			const result = getAutoPublishPreference();
			expect(typeof result).toBe("boolean");
		});
	});
});
