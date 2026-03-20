# Project Overview

## General Guidelines

- Use TypeScript for all new code
- Follow consistent naming conventions
- Write self-documenting code with clear variable and function names
- Prefer composition over inheritance
- Use meaningful comments for complex business logic

## Tech Stack

**This project uses Bun.js + TypeScript + Biome as the standard toolchain.**

### Runtime & Package Manager: Bun.js

- Use `bun` for all scripts, tests, and package management
- **DO NOT use** `npm`, `pnpm`, or `yarn`
- Bun is faster and provides native TypeScript support, testing, and bundling

### Language: TypeScript

- Use TypeScript for all new code
- Strict mode is recommended
- Provide proper type annotations for function parameters and return types

### Formatting & Linting: Biome

- Use Biome for formatting and linting
- **DO NOT use** Prettier, ESLint, or other separate tools
- Biome provides fast, integrated formatting and linting in a single tool

### Running Commands

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Format and lint
bun biome format --write .
bun biome lint --write .

# Check types
bun tsc --noEmit
```

### Why These Tools

| Tool | Why | Avoid |
|------|-----|-------|
| **Bun** | Fast runtime, native TS, built-in test runner | npm/pnpm/yarn (slower, extra deps) |
| **TypeScript** | Type safety, better IDE support | Plain JavaScript |
| **Biome** | Fast formatter + linter in one, minimal config | Prettier + ESLint (two tools, slower) |

## Project Purpose

This is a **multi-platform agent skills framework** — a collection of reusable agent skills, commands, and tools that work across multiple AI coding platforms.

### Target Platforms

The `cc-` prefix means **Core Components** — platform-agnostic building blocks that adapt to various AI coding assistants:

| Platform | Status | Notes |
|----------|--------|-------|
| Claude Code | Primary | Main development target, follows Claude Code plugin structure |
| Codex | Supported | OpenAI Codex / OpenAI CLI |
| OpenCode | Supported | OpenCode CLI |
| OpenClaw | Supported | OpenClaw CLI |
| Antigravity | Supported | Anthropic Antigravity |
| PI | Supported | PI CLI |

### Architecture: One Source, Many Platforms

```
┌─────────────────────────────────────────────────────────┐
│  Source Code (Claude Code Plugin Layout)               │
│  plugins/rd3/skills/                                  │
│  - Universal SKILL.md files                            │
│  - Adapters for each platform                          │
│  - Unified types and utilities                         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Installation / Adaptation Stage                        │
│  - install.ts --platform <target>                     │
│  - Converts universal source → platform-specific        │
│  - Generates platform-specific AGENTS.md, configs     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Platform-Specific Output                              │
│  .claude/agents/     → Claude Code                   │
│  .opencode/agents/   → OpenCode                      │
│  .claude/            → Codex-compatible format        │
└─────────────────────────────────────────────────────────┘
```

### Code Layout

Source code follows **Claude Code plugin structure** (under `plugins/rd3/`). During installation, files are converted and adapted to the target platform's conventions. This ensures:

- Single source of truth for agent skills
- Platform-specific optimizations via adapters
- Consistent development experience for contributors

### Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| **rd** | Abandoned | Original plugin rd is no longer maintained |
| **rd2** | Legacy | Still functional but superseded by rd3 |
| **rd3** | Active | Current development focus |

All new development targets rd3. The migration from rd2 to rd3 includes:
- Standardized logging with `globalSilent` for test output
- Consistent use of shared logger across all scripts
- Cleaner separation of universal vs platform-specific code

## Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Use trailing commas in multi-line objects and arrays

## Architecture Principles

- Organize code by feature, not by file type
- Keep related files close together
- Use dependency injection for better testability
- Implement proper error handling
- Follow single responsibility principle

## Logging and Console Output

**Critical**: All scripts MUST use the shared logger from `scripts/logger.ts` instead of raw `console.*` methods.

### Why This Matters

The shared logger supports a `globalSilent` flag that suppresses all output during testing. Raw `console.*` calls bypass this flag, causing unwanted output to appear during test runs (between dots in `bun test --reporter=dots`).

### Logger Methods

| Method | Use Case | Respects globalSilent |
|--------|----------|----------------------|
| `logger.debug()` | Debug-level diagnostic output | Yes |
| `logger.info()` | General informational messages | Yes |
| `logger.warn()` | Warning messages | Yes |
| `logger.error()` | Error messages | Yes |
| `logger.success()` | Success messages with checkmark | Yes |
| `logger.fail()` | Failure messages with X mark | Yes |
| **`logger.log()`** | **CLI output (no prefix/timestamp)** | **Yes** |
| `console.log()` | **NEVER use in scripts** | No |

### Correct Usage

```typescript
import { logger } from '../../../scripts/logger';

// For CLI output (help text, reports, formatted tables)
logger.log('Usage: my-script.ts [options]');
logger.log(`Result: ${result}`);

// For informational messages
logger.info('Processing file:', filePath);

// For error conditions
logger.error('Failed to process file');
```

### Wrong (Causes Test Output Issues)

```typescript
// NEVER do this in scripts:
console.log('Usage: my-script.ts [options]');
console.log(`Result: ${result}`);
console.error('Failed to process file');
```

### Test Suppression

When running tests, call `setGlobalSilent(true)` in test `beforeEach` to suppress all logger output:

```typescript
import { setGlobalSilent } from '../../../scripts/logger';

beforeEach(() => {
    setGlobalSilent(true);
});

afterEach(() => {
    setGlobalSilent(false);
});
```

### Finding Violations

To find raw `console.*` calls that should be `logger.*`:

```bash
grep -rn 'console\.\(log\|debug\|info\|warn\|error\)(' plugins/rd3/skills/*/scripts/*.ts
```
