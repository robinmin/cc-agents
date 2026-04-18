import { describe, expect, test } from "bun:test";
import { generateTransferMarkdown, slugify } from "../scripts/template";
import type { TransferDocument, TransferReason } from "../scripts/types";

describe("transfer template", () => {
  const minimalDoc: TransferDocument = {
    description: "Continue implementing auth module refactor",
    goal: "Refactor authentication module to use new token system",
    progress: "Completed token generation, middleware updated",
    sourceCodeChanges: [
      { file: "src/auth/token.ts", status: "modified", insertions: 50, deletions: 20 },
    ],
    reason: "token_limit" as TransferReason,
    recommendation: "Next agent should continue with middleware integration and tests",
    generatedAt: "2026-04-17 10:30:00",
    environment: undefined,
    relatedFiles: undefined,
    taskFile: undefined,
  };

  test("generates valid markdown", () => {
    const markdown = generateTransferMarkdown(minimalDoc);
    expect(markdown).toContain("# Transfer Document");
    expect(markdown).toContain("## Description");
    expect(markdown).toContain("## Goal");
    expect(markdown).toContain("## Reason");
    expect(markdown).toContain("## Recommendation");
  });

  test("includes source code changes table", () => {
    const markdown = generateTransferMarkdown(minimalDoc);
    expect(markdown).toContain("| File | Status | Changes |");
    expect(markdown).toContain("src/auth/token.ts");
    expect(markdown).toContain("modified");
    expect(markdown).toContain("+50 / -20");
  });

  test("handles empty source code changes", () => {
    const doc = { ...minimalDoc, sourceCodeChanges: [] };
    const markdown = generateTransferMarkdown(doc);
    expect(markdown).toContain("*No source code changes detected.*");
  });

  test("includes environment if present", () => {
    const doc = { ...minimalDoc, environment: "Node.js 20, Bun 1.1" };
    const markdown = generateTransferMarkdown(doc);
    expect(markdown).toContain("## Environment");
    expect(markdown).toContain("Node.js 20, Bun 1.1");
  });

  test("includes related files if present", () => {
    const doc = { ...minimalDoc, relatedFiles: ["src/auth/token.ts", "src/auth/middleware.ts"] };
    const markdown = generateTransferMarkdown(doc);
    expect(markdown).toContain("## Related Files");
    expect(markdown).toContain("src/auth/token.ts");
    expect(markdown).toContain("src/auth/middleware.ts");
  });

  test("includes reason", () => {
    const markdown = generateTransferMarkdown(minimalDoc);
    expect(markdown).toContain("## Reason");
    expect(markdown).toContain("token_limit");
  });
});

describe("slugify", () => {
  test("converts to lowercase", () => {
    expect(slugify("Auth Module Refactor")).toBe("auth-module-refactor");
  });

  test("replaces spaces with hyphens", () => {
    expect(slugify("continue implementing auth")).toBe("continue-implementing-auth");
  });

  test("removes special characters", () => {
    expect(slugify("fix: auth module!")).toBe("fix-auth-module");
  });

  test("limits length to 50 characters", () => {
    const long = "a".repeat(60);
    expect(slugify(long).length).toBe(50);
  });

  test("removes leading/trailing hyphens", () => {
    expect(slugify("  transfer  ")).toBe("transfer");
  });
});
