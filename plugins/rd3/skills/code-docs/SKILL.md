---
name: code-docs
description: "Auto-generate documentation artifacts: JSDoc/TSDoc comments, API reference stubs, task References, and changelog entries. Phase 9 finisher for the 9-phase orchestration pipeline. Persona: Senior Technical Writer."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-27
updated_at: 2026-03-27
platform: rd3
type: technique
tags: [documentation, jsdoc, api-reference, changelog, phase-9]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,gemini,openclaw,opencode,antigravity"
  category: documentation
  interactions:
    - generator
see_also:
  - rd3:request-intake
  - rd3:functional-review
  - rd3:orchestration-dev
---

# rd3:code-docs — Automated Documentation Generation

Auto-generate documentation artifacts from source code using TypeScript compiler API for accurate symbol extraction. Supports JSDoc/TSDoc inline comments, API reference stubs, task References section updates, and conventional changelog entries.

**Key distinction:**
- **`code-docs`** = documentation generation from source (Phase 9)
- **`request-intake`** = requirements elicitation (Phase 1)
- **`functional-review`** = verification against requirements (Phase 8)

## When to Use

**Trigger phrases:** "generate docs", "add documentation", "update jsdoc", "create api reference", "generate changelog", "document"

Load this skill when:
- Finishing implementation and need documentation artifacts
- Updating legacy code without adequate JSDoc
- Generating API reference documentation from TypeScript source
- Creating changelog entries in conventional-changelog format
- Updating task References section with implementation artifacts

Do not use this skill for requirements documentation (use `rd3:request-intake`) or verification (use `rd3:functional-review`).

## Overview

The code-docs skill uses TypeScript compiler API (`ts.createProgram`) for accurate symbol extraction rather than regex-based parsing:

1. **Analyze** source files to extract exported symbols
2. **Filter** symbols that need documentation (skip adequate existing JSDoc)
3. **Generate** documentation per doc_type specification
4. **Validate** output against quality checklist
5. **Persist** documentation artifacts

## Input Schema

```typescript
interface CodeDocsInput {
  task_ref: string;                    // WBS number or path to task file
  source_paths: string[];              // Source files/dirs to document
  doc_types: DocType[];               // What to generate
  style?: 'minimal' | 'comprehensive'; // Detail level (default: comprehensive)
}

type DocType = 'jsdoc' | 'api-ref' | 'task-refs' | 'changelog-entry';
```

### Style Impact per Doc Type

| doc_type | minimal | comprehensive |
|----------|---------|---------------|
| jsdoc | @param + @returns only | @param + @returns + @throws + @example + @see |
| api-ref | Function signatures + one-line descriptions | Full descriptions + examples + type details |
| task-refs | File paths only | File paths + line ranges + descriptions |
| changelog-entry | Type + scope + subject | Type + scope + subject + body + breaking changes |

## Quick Start

```
1. Load task file via task_ref
2. Parse source_paths using TypeScript compiler API
3. For each doc_type:
   - jsdoc: Extract exports, generate/update JSDoc comments
   - api-ref: Generate markdown API reference with TOC
   - task-refs: Update task file References section
   - changelog-entry: Generate conventional-changelog format
4. Validate output against quality checklist
5. Write artifacts to source files or task file
```

## DocType Workflows

### jsdoc

**Goal:** Generate/update JSDoc/TSDoc comments for exported symbols.

```typescript
// Extract exported symbols using TypeScript compiler API
// Use: import * as ts from 'typescript';
// const program = ts.createProgram(sourcePaths, { target: ts.ScriptTarget.ESNext });
// const checker = program.getTypeChecker();
// Walk source file AST with ts.forEachChild to find exported declarations
const symbols = extractExports(sourcePath);

// Filter: skip symbols with adequate existing JSDoc (>50 chars)
const needsDocs = symbols.filter(s => 
  !s.jsdoc || s.jsdoc.length < 50 || isGenericJSDoc(s.jsdoc)
);

// Generate JSDoc for each symbol
for (const symbol of needsDocs) {
  const jsdoc = generateJSDoc(symbol, style);
  // Validate: reject generic descriptions
  if (isGenericDescription(jsdoc)) {
    throw new Error(`Generic JSDoc rejected for ${symbol.name}`);
  }
  // Insert/update JSDoc in source
  insertJSDoc(sourceFile, symbol, jsdoc);
}
```

**JSDoc template:**
```typescript
/**
 * {description - specific, not generic}
 * @param {paramName} {paramType} - {description}
 * @returns {returnType} - {description}
 * @throws {errorType} - {when thrown}
 * @example
 * ```typescript
 * {usage example}
 * ```
 */
```

**Quality rules:**
- Minimum 50 characters of meaningful description
- Reject: "This function does something", "A class that represents..."
- @param/@returns/@throws required for comprehensive style
- @example required for public API functions

### api-ref

**Goal:** Generate markdown API reference with table of contents.

```typescript
// Generate markdown API reference
const toc = generateTOC(symbols);
const sections = symbols.map(s => generateAPISection(s, style));
const reference = `# API Reference\n\n${toc}\n\n${sections.join('\n\n')}`;
```

**API reference template:**
```markdown
# API Reference

## Table of Contents
- [Functions](#functions)
- [Classes](#classes)
- [Types](#types)

## Functions

### functionName

\`\`\`typescript
function functionName(param: ParamType): ReturnType
\`\`\`

{description}

**Parameters:**
- `param` (ParamType): {description}

**Returns:** {description}

**Throws:** {errorType} - {when}

**Example:**
\`\`\`typescript
// {example usage}
\`\`\`
```

### task-refs

**Goal:** Update task file References section with implementation artifacts.

```typescript
// Extract artifact paths from source
const artifacts = discoverArtifacts(sourcePaths);

// Generate References section entry
const refEntry = artifacts.map(a => 
  `- ${a.path} - ${a.type} - ${formatDate(new Date())}`
).join('\n');

// Read task file, find/update References section
updateTaskSection(taskPath, 'References', refEntry);
```

### changelog-entry

**Goal:** Generate entry in conventional-changelog format.

```typescript
// Analyze git diff or source changes
const changes = analyzeChanges(sourcePaths);

// Generate changelog entry
const entry = {
  type: determineChangeType(changes), // feat|fix|docs|refactor|test|chore
  scope: extractScope(changes),       // affected module/component
  subject: summarizeChanges(changes),  // brief description
  breaking: hasBreakingChanges(changes),
};
const formatted = formatChangelogEntry(entry);
```

**Version and date inference:**
- `version`: Read from `package.json` `version` field. Fallback: latest git tag. If neither exists, use `Unreleased`.
- `date`: Current date in YYYY-MM-DD format.

**Conventional changelog format:**
```
## {version} ({date})

### {type}({scope}): {subject}

{description of change}

BREAKING CHANGE: {breaking change description}
```

## Quality Checklist

See `references/quality-checklist.md` for:
- JSDoc rejection criteria (generic descriptions, missing @params)
- API reference completeness standards
- Changelog format requirements

## Integration

**tasks CLI integration:**
```bash
# Generate JSDoc for specific files
rd3:code-docs 0266 --source-paths plugins/rd3/skills/tasks/scripts/ --doc-types jsdoc

# Generate full documentation package
rd3:code-docs 0266 --source-paths src/ --doc-types jsdoc,api-ref,task-refs

# Generate changelog entry
rd3:code-docs 0266 --source-paths src/ --doc-types changelog-entry
```

**Phase integration:**
- Phase 9 of 9-phase orchestration pipeline
- Input feeds from implementation phase artifacts
- Output used by `rd3:functional-review` for traceability
