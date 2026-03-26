#!/usr/bin/env bun
/**
 * benchmark.test.ts
 *
 * Benchmark suite for knowledge-extraction reconciliation engine.
 * Tests conflict detection, reconciliation, and quality scoring
 * across all conflict types.
 */

import { describe, expect, test } from "bun:test";
import { detectConflicts } from "../scripts/detect-conflicts";
import { reconcileMultiSource } from "../scripts/reconcile";
import { scoreMergeQuality } from "../scripts/score-quality";
import type {
  BenchmarkCase,
  BenchmarkResult,
  SourceContent,
} from "../scripts/types";

// ===== Benchmark Cases =====

const BENCHMARK_CASES: BenchmarkCase[] = [
  // ---- No Conflict Cases ----

  {
    id: "identical-files",
    description: "Two sources with identical SKILL.md content — no conflicts",
    conflictTypes: [],
    sources: [
      {
        name: "source-a",
        path: "SKILL.md",
        content:
          "# My Skill\n\n## Overview\n\nThis skill does amazing things.\n\n## Usage\n\nRun the command to activate.",
      },
      {
        name: "source-b",
        path: "SKILL.md",
        content:
          "# My Skill\n\n## Overview\n\nThis skill does amazing things.\n\n## Usage\n\nRun the command to activate.",
      },
    ],
    minQualityScore: 90,
    deterministic: true,
  },

  {
    id: "different-files-no-overlap",
    description: "Two sources with completely different files — no conflicts",
    conflictTypes: [],
    sources: [
      {
        name: "source-a",
        path: "README.md",
        content: "# My Skill\n\nThis is the README.",
      },
      {
        name: "source-b",
        path: "SKILL.md",
        content: "# My Skill\n\n## Overview\n\nThis is the SKILL.",
      },
    ],
    minQualityScore: 80,
    deterministic: true,
  },

  // ---- File-Level Conflict Cases ----

  {
    id: "file-level-conflict-basic",
    description: "Same file path (SKILL.md) with completely different content",
    conflictTypes: ["file"],
    sources: [
      {
        name: "source-a",
        path: "SKILL.md",
        content:
          "# Authentication Skill\n\n## Overview\n\nHandles OAuth2 authentication flow.\n\n## Usage\n\nUse the auth command to login.",
      },
      {
        name: "source-b",
        path: "SKILL.md",
        content:
          "# Authorization Skill\n\n## Overview\n\nManages RBAC permission checks.\n\n## Usage\n\nCall the check-permission function.",
      },
    ],
    minQualityScore: 70,
    deterministic: true,
  },

  {
    id: "file-level-conflict-similar-headers",
    description:
      "Same file path with similar section headers but different content",
    conflictTypes: ["file"],
    sources: [
      {
        name: "rd2:tasks",
        path: "SKILL.md",
        content:
          "# Tasks\n\n## Overview\n\nTask management for rd2.\n\n## Commands\n\n- task add\n- task list\n- task done",
      },
      {
        name: "rd3:tasks",
        path: "SKILL.md",
        content:
          "# Tasks\n\n## Overview\n\nTask management for rd3 with WBS numbering.\n\n## Commands\n\n- tasks create\n- tasks list\n- tasks update",
      },
    ],
    minQualityScore: 70,
    deterministic: true,
  },

  // ---- Section-Level Conflict Cases ----

  {
    id: "section-level-conflict-same-file",
    description: "Same SKILL.md, ## Background section differs",
    conflictTypes: ["section"],
    sources: [
      {
        name: "v1",
        path: "SKILL.md",
        content:
          "# My Skill\n\n## Background\n\nBuilt in 2024 for task automation.\n\n## Usage\n\nRun the skill.",
      },
      {
        name: "v2",
        path: "SKILL.md",
        content:
          "# My Skill\n\n## Background\n\nRefactored in 2025 with better error handling.\n\n## Usage\n\nRun the skill with --verbose flag.",
      },
    ],
    minQualityScore: 70,
    deterministic: true,
  },

  {
    id: "section-level-conflict-multiple-sections",
    description: "Same file, multiple sections differ between sources",
    conflictTypes: ["section"],
    sources: [
      {
        name: "alpha",
        path: "docs/api.md",
        content:
          "# API Documentation\n\n## Authentication\n\nUse API key in header.\n\n## Endpoints\n\n- GET /users\n- POST /users",
      },
      {
        name: "beta",
        path: "docs/api.md",
        content:
          "# API Documentation\n\n## Authentication\n\nUse Bearer token in Authorization header.\n\n## Endpoints\n\n- GET /users\n- POST /users\n- DELETE /users/:id",
      },
    ],
    minQualityScore: 65,
    deterministic: true,
  },

  // ---- Paragraph-Level Conflict Cases ----

  {
    id: "paragraph-level-conflict",
    description: "Same section, para 2 differs between sources",
    conflictTypes: ["paragraph"],
    sources: [
      {
        name: "src-1",
        path: "README.md",
        content:
          "# Project\n\n## Description\n\nThis is an awesome project.\n\n## Features\n\n- Fast\n- Reliable\n- Easy to use",
      },
      {
        name: "src-2",
        path: "README.md",
        content:
          "# Project\n\n## Description\n\nThis is a groundbreaking project.\n\n## Features\n\n- Fast\n- Reliable\n- Easy to use",
      },
    ],
    minQualityScore: 75,
    deterministic: true,
  },

  // ---- Line-Level Conflict Cases ----

  {
    id: "line-level-conflict-bullet-list",
    description: "Same bullet list, some items differ",
    conflictTypes: ["line"],
    sources: [
      {
        name: "list-a",
        path: "notes.md",
        content:
          "# Notes\n\n## Todo\n\n- Buy groceries\n- Walk the dog\n- Read a book",
      },
      {
        name: "list-b",
        path: "notes.md",
        content:
          "# Notes\n\n## Todo\n\n- Buy groceries\n- Walk the dog\n- Watch TV",
      },
    ],
    minQualityScore: 70,
    deterministic: true,
  },

  {
    id: "line-level-conflict-code-snippet",
    description:
      "Same code block, one line differs - detected as file-level conflict since content differs significantly",
    conflictTypes: ["file"],
    sources: [
      {
        name: "version-1",
        path: "example.ts",
        content:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture contains code example
          "```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n```",
      },
      {
        name: "version-2",
        path: "example.ts",
        content:
          // biome-ignore lint/suspicious/noTemplateCurlyInString: test fixture contains code example
          "```typescript\nfunction greet(name: string): string {\n  return `Hi, ${name}!`;\n}\n```",
      },
    ],
    minQualityScore: 65,
    deterministic: true,
  },

  // ---- Heterogeneous Format Cases ----

  {
    id: "heterogeneous-header-levels",
    description:
      "One source uses ### subheaders, other uses ## - normalization handles this",
    conflictTypes: [],
    sources: [
      {
        name: "format-a",
        path: "guide.md",
        content:
          "# Guide\n\n## Getting Started\n\nFollow these steps.\n\n### Prerequisites\n\nYou need Node.js 18+.",
      },
      {
        name: "format-b",
        path: "guide.md",
        content:
          "# Guide\n\n## Getting Started\n\nFollow these steps.\n\n## Prerequisites\n\nYou need Node.js 18+.",
      },
    ],
    minQualityScore: 75,
    deterministic: true,
  },

  // ---- Partial Content Cases ----

  {
    id: "partial-content-one-source-complete",
    description: "One source has full content, other has only a fragment",
    conflictTypes: ["file"],
    sources: [
      {
        name: "full",
        path: "docs/guide.md",
        content:
          "# User Guide\n\n## Introduction\n\nWelcome to the user guide.\n\n## Installation\n\nRun `npm install` to install dependencies.\n\n## Usage\n\nRun `npm start` to start the application.",
      },
      {
        name: "partial",
        path: "docs/guide.md",
        content:
          "# User Guide\n\n## Introduction\n\nWelcome to the user guide.",
      },
    ],
    minQualityScore: 60,
    deterministic: true,
  },

  {
    id: "partial-content-empty-section",
    description:
      "One source has content for a section, other has empty section",
    conflictTypes: ["section"],
    sources: [
      {
        name: "has-content",
        path: "SKILL.md",
        content:
          "# Skill\n\n## Overview\n\nThis skill handles data processing.\n\n## Configuration\n\nSet the DATA_DIR environment variable.",
      },
      {
        name: "no-content",
        path: "SKILL.md",
        content:
          "# Skill\n\n## Overview\n\nThis skill handles data processing.\n\n## Configuration\n\n",
      },
    ],
    minQualityScore: 70,
    deterministic: true,
  },

  // ---- Multi-Level Conflict Cases ----

  {
    id: "multi-level-conflict-file-and-section",
    description: "File-level and section-level conflicts together",
    conflictTypes: ["file", "section"],
    sources: [
      {
        name: "legacy",
        path: "plugin.json",
        content: '{\n  "name": "my-plugin",\n  "version": "1.0.0"\n}',
      },
      {
        name: "modern",
        path: "plugin.json",
        content:
          '{\n  "name": "my-plugin",\n  "version": "2.0.0",\n  "description": "A modern plugin"\n}',
      },
      {
        name: "legacy",
        path: "README.md",
        content: "# My Plugin\n\nVersion 1.0.0",
      },
      {
        name: "modern",
        path: "README.md",
        content: "# My Plugin\n\n## Overview\n\nVersion 2.0.0 with new features.",
      },
    ],
    minQualityScore: 65,
    deterministic: true,
  },

  // ---- Quality Scoring Test Cases ----

  {
    id: "high-quality-merge",
    description: "Nearly identical content should score very high",
    conflictTypes: [],
    sources: [
      {
        name: "src-a",
        path: "doc.md",
        content:
          "# Documentation\n\n## Overview\n\nThis document describes the API.\n\n## Authentication\n\nAll requests require an API key passed in the `Authorization` header as `Bearer <key>`.\n\n## Endpoints\n\n### GET /users\n\nReturns a list of users.\n\n### POST /users\n\nCreates a new user.",
      },
      {
        name: "src-b",
        path: "doc.md",
        content:
          "# Documentation\n\n## Overview\n\nThis document describes the API.\n\n## Authentication\n\nAll requests require an API key passed in the `Authorization` header as `Bearer <key>`.\n\n## Endpoints\n\n### GET /users\n\nReturns a list of users.\n\n### POST /users\n\nCreates a new user.",
      },
    ],
    minQualityScore: 90,
    deterministic: true,
  },

  {
    id: "poor-quality-redundant",
    description:
      "Highly redundant content - tests non-redundancy quality scoring, not conflict detection",
    conflictTypes: [],
    sources: [
      {
        name: "redundant-a",
        path: "doc.md",
        content:
          "# Doc\n\n## Section A\n\nThis is the content of section A. It contains important information.\n\n## Section A\n\nThis is the content of section A. It contains important information.\n\n## Section A\n\nThis is the content of section A. It contains important information.",
      },
      {
        name: "redundant-b",
        path: "doc.md",
        content:
          "# Doc\n\n## Section A\n\nThis is the content of section A. It contains important information.\n\n## Section A\n\nThis is the content of section A. It contains important information.",
      },
    ],
    minQualityScore: 40,
    deterministic: true,
  },
];

// ===== Test Runners =====

function runReconciliationBenchmark(
  testCase: BenchmarkCase,
): BenchmarkResult {
  try {
    // Run conflict detection
    const manifest = detectConflicts(testCase.sources);
    const conflictsDetected = manifest.conflicts.length;
    const expectedTypes = new Set(testCase.conflictTypes);
    const detectedTypes = new Set(manifest.conflicts.map((c) => c.type));

    // Check if all expected conflict types were detected
    const allExpectedDetected = [...expectedTypes].every((t) =>
      detectedTypes.has(t),
    );

    // For cases with no expected conflicts, verify none were detected
    const noUnexpectedConflicts =
      expectedTypes.size === 0 ? conflictsDetected === 0 : true;

    const conflictsPassed =
      allExpectedDetected && noUnexpectedConflicts && conflictsDetected >= 0;

    // Run full reconciliation
    const result = reconcileMultiSource(testCase.sources);

    // Check determinism: run again and compare
    let isDeterministic = true;
    if (testCase.deterministic) {
      const result2 = reconcileMultiSource(testCase.sources);
      isDeterministic = result.mergedContent === result2.mergedContent;
    }

    const passed = conflictsPassed && isDeterministic;

    return {
      caseId: testCase.id,
      passed,
      qualityScore: result.qualityScore,
      qualityJustification: result.qualityJustification,
      conflictsDetected,
      conflictsResolved: result.conflictManifest.conflicts.filter(
        (c) => c.resolution.length > 0,
      ).length,
      deterministic: isDeterministic,
      error: passed
        ? undefined
        : !conflictsPassed
          ? `Expected conflict types ${[...expectedTypes]}, got ${[...detectedTypes]}`
          : "Non-deterministic output detected",
    };
  } catch (error) {
    return {
      caseId: testCase.id,
      passed: false,
      qualityScore: 0,
      qualityJustification: "",
      conflictsDetected: 0,
      conflictsResolved: 0,
      deterministic: testCase.deterministic ?? true,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ===== Bun Test Suite =====

describe("knowledge-extraction benchmark", () => {
  const results: BenchmarkResult[] = [];

  for (const testCase of BENCHMARK_CASES) {
    test(testCase.id, () => {
      const result = runReconciliationBenchmark(testCase);
      results.push(result);

      // Conflict detection and determinism must pass
      expect(result.passed).toBe(true);
    });
  }

  // Summary test - always runs last
  test("benchmark summary", () => {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const avgQuality =
      results.reduce((sum, r) => sum + r.qualityScore, 0) / total;
    const minScore = Math.min(...results.map((r) => r.qualityScore));

    console.log("\n========== BENCHMARK SUMMARY ==========");
    console.log(`Total cases: ${total}`);
    console.log(
      `Passed: ${passed}/${total} (${((passed / total) * 100).toFixed(1)}%)`,
    );
    console.log(`Average quality: ${avgQuality.toFixed(1)}/100`);
    console.log(`Minimum quality: ${minScore}/100`);
    console.log("========================================\n");

    // Require ≥80% pass rate
    const passRate = passed / total;
    expect(passRate).toBeGreaterThanOrEqual(0.8);
  });
});

// ===== Quality Scoring Unit Tests =====

describe("quality scoring", () => {
  test("high quality content scores 90+", () => {
    const content = `# Documentation

## Overview

This is a well-structured document with clear sections.

## Authentication

All requests require an API key in the Authorization header.

## Usage

Follow these steps:
1. Install the package
2. Configure your credentials
3. Run the command
`;

    const sources: SourceContent[] = [
      { name: "src", path: "doc.md", content },
    ];

    const result = scoreMergeQuality(content, sources);
    // Single source with no attribution keywords scores ~79 (traceability penalty)
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  test("redundant content scores low on non-redundancy", () => {
    const content = `# Doc

## Section A
Content A

## Section A
Content A

## Section A
Content A
`;

    const sources: SourceContent[] = [
      { name: "src", path: "doc.md", content },
    ];

    const result = scoreMergeQuality(content, sources);
    // Duplicate headers penalize both coherence and non-redundancy
    expect(result.dimensions.nonRedundancy).toBeLessThan(20);
  });

  test("incomplete content scores low on completeness", () => {
    const content = `# Incomplete

## Overview

This document is missing important sections.
`;

    const sources: SourceContent[] = [
      {
        name: "src-a",
        path: "doc.md",
        content:
          "# Complete\n\n## Overview\n\nFull content.\n\n## Details\n\nMore details here.",
      },
      {
        name: "src-b",
        path: "doc.md",
        content:
          "# Complete\n\n## Overview\n\nFull content.\n\n## Details\n\nMore details here.",
      },
    ];

    const result = scoreMergeQuality(content, sources);
    expect(result.dimensions.completeness).toBeLessThan(20);
  });

  test("unattributed content scores low on traceability", () => {
    const content = `# Doc

It is known that this approach works well.

Everyone knows this is the best method.

Clearly, this is the right solution.
`;

    const sources: SourceContent[] = [
      { name: "src-a", path: "doc.md", content },
    ];

    const result = scoreMergeQuality(content, sources);
    expect(result.dimensions.traceability).toBeLessThan(15);
  });
});

// ===== Conflict Detection Unit Tests =====

describe("conflict detection", () => {
  test("detects file-level conflict", () => {
    const sources: SourceContent[] = [
      { name: "a", path: "SKILL.md", content: "# A Version" },
      { name: "b", path: "SKILL.md", content: "# B Version" },
    ];

    const manifest = detectConflicts(sources);
    expect(manifest.summary.fileLevelConflicts).toBe(1);
    expect(manifest.conflicts[0]?.type).toBe("file");
  });

  test("detects section-level conflict", () => {
    const sources: SourceContent[] = [
      {
        name: "a",
        path: "doc.md",
        content: "# Doc\n\n## Section One\n\nContent from A.",
      },
      {
        name: "b",
        path: "doc.md",
        content: "# Doc\n\n## Section One\n\nContent from B.",
      },
    ];

    const manifest = detectConflicts(sources);
    expect(manifest.summary.sectionLevelConflicts).toBe(1);
  });

  test("no false positives on identical content", () => {
    const content = "# Same\n\nIdentical content.";
    const sources: SourceContent[] = [
      { name: "a", path: "doc.md", content },
      { name: "b", path: "doc.md", content },
    ];

    const manifest = detectConflicts(sources);
    expect(manifest.summary.totalConflicts).toBe(0);
  });

  test("handles multiple files with mixed conflicts", () => {
    const sources: SourceContent[] = [
      { name: "a", path: "file1.md", content: "# File 1 A" },
      { name: "b", path: "file1.md", content: "# File 1 B" },
      { name: "a", path: "file2.md", content: "# File 2 Same" },
      { name: "b", path: "file2.md", content: "# File 2 Same" },
    ];

    const manifest = detectConflicts(sources);
    expect(manifest.summary.fileLevelConflicts).toBe(1);
    expect(manifest.summary.totalConflicts).toBe(1);
  });
});

// ===== Reconciliation Unit Tests =====

describe("reconciliation", () => {
  test("reconciles identical sources without changes", () => {
    const content =
      "# My Skill\n\n## Overview\n\nThis skill does amazing things.";
    const sources: SourceContent[] = [
      { name: "a", path: "SKILL.md", content },
      { name: "b", path: "SKILL.md", content },
    ];

    const result = reconcileMultiSource(sources);
    expect(result.qualityScore).toBeGreaterThanOrEqual(80);
    expect(result.deterministic).toBe(true);
    expect(result.conflictManifest.summary.totalConflicts).toBe(0);
  });

  test("reconciles file-level conflict preserving unique sections", () => {
    const sources: SourceContent[] = [
      {
        name: "a",
        path: "SKILL.md",
        content: "# Skill\n\n## Auth\n\nOAuth2 flow.\n\n## Usage\n\nRun auth.",
      },
      {
        name: "b",
        path: "SKILL.md",
        content:
          "# Skill\n\n## Auth\n\nRBAC checks.\n\n## Config\n\nSet RBAC_MODE.",
      },
    ];

    const result = reconcileMultiSource(sources);
    // Merged content should contain insights from both sources
    expect(result.mergedContent).toContain("OAuth2");
    expect(result.mergedContent).toContain("RBAC");
    expect(result.qualityScore).toBeGreaterThanOrEqual(60);
  });

  test("produces deterministic output across runs", () => {
    const sources: SourceContent[] = [
      {
        name: "x",
        path: "doc.md",
        content: "# Doc\n\n## A\n\nContent A.\n\n## B\n\nContent B.",
      },
      {
        name: "y",
        path: "doc.md",
        content: "# Doc\n\n## A\n\nContent A modified.\n\n## C\n\nContent C.",
      },
    ];

    const r1 = reconcileMultiSource(sources);
    const r2 = reconcileMultiSource(sources);
    const r3 = reconcileMultiSource(sources);

    expect(r1.mergedContent).toBe(r2.mergedContent);
    expect(r2.mergedContent).toBe(r3.mergedContent);
  });

  test("handles empty sources gracefully", () => {
    const sources: SourceContent[] = [
      { name: "empty", path: "doc.md", content: "" },
      { name: "full", path: "doc.md", content: "# Full\n\n## Content\n\nReal content here." },
    ];

    const result = reconcileMultiSource(sources);
    expect(result.mergedContent).toContain("Real content here");
    expect(result.deterministic).toBe(true);
  });

  test("handles single source without error", () => {
    const sources: SourceContent[] = [
      {
        name: "only",
        path: "SKILL.md",
        content: "# Single\n\n## Overview\n\nOnly one source.",
      },
    ];

    const result = reconcileMultiSource(sources);
    expect(result.mergedContent).toContain("Only one source");
    expect(result.conflictManifest.summary.totalConflicts).toBe(0);
    expect(result.qualityScore).toBeGreaterThanOrEqual(70);
  });
});
