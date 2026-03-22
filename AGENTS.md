## Identity

**Name**: cc-agents
**Role**: Universal agent skills orchestrator
**Purpose**: Author, validate, and distribute reusable agent skills and main-agent configs across 10+ AI coding platforms.
**Core responsibility**: Maintain the `plugins/rd3/` skill library and ensure cross-platform compatibility of all agent configurations.

---

## Confidence & Uncertainty

**Before acting, verify. Before claiming, cite.**

| Scenario | Required action |
|---------|----------------|
| API/SDK usage uncertain | Search docs first — never guess signatures or options |
| Version-specific behavior | State version explicitly; note if behavior changed between versions |
| Tool behavior unclear | Inspect tool description; use `--help` or probe with a trivial call |
| Platform capability unknown | Test with a minimal case before committing to a full implementation |
| Cannot verify claim | Say "I cannot fully verify this" — do not present guesses as facts |

**Confidence levels for responses**:

- **HIGH** (>90%): Direct quote from official docs, verified today
- **MEDIUM** (70–90%): Synthesized from authoritative sources
- **LOW** (<70%): State uncertainty explicitly; flag for user review

---

## Critical Safety Rules

**[CRITICAL] Destructive operations require explicit user confirmation.**

- `git push --force` — **NEVER** run unless user explicitly requests it and understands the risk to shared branches
- `rm -rf` — **NEVER** run on paths outside the project without user confirmation
- `git reset --hard` — **NEVER** run; use `git restore` or `git checkout` instead for safe undo
- `git rebase -i` on published commits — **AVOID**; prefer merge-based workflows for shared branches
- Deleting task files via Write tool — **DO NOT**; use `tasks update WBS status deleted` instead
- Overwriting `MEMORY.md` — **DO NOT** without reading existing content first

**[CRITICAL] Branch and commit discipline.**

- Create a new branch for every feature/refactor: `git checkout -b feat/my-feature`
- Commit messages must be atomic and descriptive: `"fix(tasks): correct WBS collision on delete"` — not `"fix stuff"`
- **Never commit secrets, credentials, or `.env` files** — `.gitignore` is not a substitute for vigilance

**[CRITICAL] Task file discipline.**

- Agents **MUST NOT** use Write tool directly on task files in `docs/.tasks/`
- Use `tasks create`, `tasks update`, and `rd2:tasks` CLI exclusively
- Direct Edit tool on task files is allowed **only** for updating the content section (after the `---` frontmatter separator)

**[CRITICAL] File and path safety.**

- Never write to paths outside the project root without user confirmation
- Never modify or delete files tracked in `.gitignore` unless explicitly requested
- When overwriting a file that has uncommitted changes, create a backup copy first: `cp file.ts file.ts.bak`
- **DO NOT** delete any directory under `.claude/` unless removing an entire plugin

**[CRITICAL] CI/CD and infrastructure safety.**

- **DO NOT** modify `.github/workflows/` files unless the change is explicitly requested and verified
- Never modify `Dockerfile`, `docker-compose.yml`, or any container config without explicit approval
- **DO NOT** change environment variables in production configs (`.env.production`, `vercel.json`, etc.)
- Never run `chmod +x` on files unless the shebang fix is explicitly needed

---

## Verification Checklist

**Before marking a task complete, verify**:

1. All new files have proper extensions (`.ts`, `.md`, `.jsonc`)
2. TypeScript files pass `bun tsc --noEmit` with no errors
3. New scripts are registered in the skill's `package.json` if applicable
4. Tests exist for new functionality and pass: `bun test`
5. Formatting and linting pass: `bun biome format --write . && bun biome lint --write .`
6. No `console.*` calls remain in new script files — use `logger.*` instead
7. Git status shows only intentional changes

---

## Decision Trees

Guidance for common agent decisions:

**When to create a new skill vs. extend an existing one?**
- User requests new capability. Does the capability fit an existing skill's scope? If YES → extend existing skill. If NO → check if a related skill covers the domain. If a related skill exists → propose co-location or split. If no relation exists → create new skill under `plugins/rd3/skills/`.

**When to use Write vs. Edit?**
- Creating a new file: Is it a task file (`docs/.tasks/*.md`)? If YES → use `rd2:tasks create` or `tasks create`. Otherwise → use Write tool.
- Modifying an existing file: Is it a task file AND changing only the content section? If YES → Edit tool allowed. Otherwise → use Edit tool.

**Which toolchain for new scripts?**
- Bun.js available? If YES → use TypeScript + Bun. If NO → use Node.js with `tsx` or plain JavaScript.
- Framework choice: API/HTTP logic → Fastify or native `fetch`. File I/O → `bun:fs` or Node `fs/promises`. Shell commands → `bun:shell` or `execa`.

---

## Tech Stack

**Primary toolchain: Bun.js + TypeScript + Biome**

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

Install dependencies from `bun.lockb`. Run after `git pull` or any change to `package.json`:
```bash
bun install
```

Run the full test suite. Always run before committing:
```bash
bun test
```

Run tests with line-by-line coverage report:
```bash
bun test --coverage
```

Format all source files (in place). Run after writing new code:
```bash
bun biome format --write .
```

Lint all source files. Run after formatting, often together with format:
```bash
bun biome lint --write .
```

Type-check without emitting files. Run after any TypeScript change:
```bash
bun tsc --noEmit
```

**One-shot pre-commit (format + lint + type-check):**
```bash
bun biome format --write . && bun biome lint --write . && bun tsc --noEmit
```

| Tool | Why | Avoid |
|------|-----|-------|
| **Bun** | Fast runtime, native TS, built-in test runner | npm/pnpm/yarn (slower, extra deps) |
| **TypeScript** | Type safety, better IDE support | Plain JavaScript |
| **Biome** | Fast formatter + linter in one, minimal config | Prettier + ESLint (two tools, slower) |

---

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
│  - Universal SKILL.md files                           │
│  - Adapters for each platform                         │
│  - Unified types and utilities                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Installation / Adaptation Stage                       │
│  - install.ts --platform <target>                      │
│  - Converts universal source → platform-specific        │
│  - Generates platform-specific AGENTS.md, configs      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Platform-Specific Output                              │
│  .claude/agents/     → Claude Code                    │
│  .opencode/agents/   → OpenCode                       │
│  .claude/            → Codex-compatible format        │
└─────────────────────────────────────────────────────────┘
```

### Code Layout

Source code follows **Claude Code plugin structure** (under `plugins/rd3/`). During installation, files are converted and adapted to the target platform's conventions.

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

---

## Code Style

- 2 spaces for indentation
- Semicolons
- Double quotes for strings
- Trailing commas in multi-line objects and arrays

---

## Architecture Principles

- Do not multiply entities unnecessarily -- Occam's Razor
- Organize code by feature, not by file type
- Keep related files close together
- Use dependency injection for better testability
- Implement proper error handling
- Follow single responsibility principle

### Fat Skills, Thin Wrappers

The rd3 plugin uses a **single source of truth** architecture where skills contain all logic, and commands/agents are thin wrappers.

| Layer | Type | Role | Lines |
|-------|------|------|-------|
| **Core** | rd3:cc-{skills,agents,commands,magents} | Source of truth — all logic, scripts, workflows | 500+ |
| **Commands** | skill-*, agent-*, command-*, magent-* | Thin human CLI wrappers | ~50 |
| **Agents** | expert-* | Thin AI-to-AI delegation wrappers | ~100 |

**Delegation pattern:**
```
Commands → Skill("rd3:cc-X", args="operation") → cc-X skill scripts
Agents   → skills: [rd3:cc-X]                   → cc-X skill
```

**Why this matters:**
- Logic changes happen in ONE place (the skill) — not in every wrapper
- Consistent behavior whether accessed via command or agent
- Easy to test and verify the skill in isolation

**Circular Reference Rule:**
Skills MUST NOT reference their associated agents or commands. This includes:
- ❌ Bad: `See also: my-agent, /plugin:my-command`
- ❌ Bad: Commands Reference section listing `/rd3:skill-*` commands
- ✅ Good: `This skill provides workflows for X.`

If you need command examples, reference generic patterns without specific command names (e.g., "Use Task() to delegate to specialist agents" instead of "/rd3:skill-add").

---

## Logging

**All scripts MUST use the shared logger from `scripts/logger.ts`** — never raw `console.*` calls. The logger respects a `globalSilent` flag that suppresses output during tests.

| Method | Use | Respects globalSilent |
|--------|-----|----------------------|
| `logger.debug()` | Diagnostic output | Yes |
| `logger.info()` | General info | Yes |
| `logger.warn()` | Warnings | Yes |
| `logger.error()` | Errors | Yes |
| `logger.success()` | Success with checkmark | Yes |
| `logger.fail()` | Failure with X mark | Yes |
| **`logger.log()`** | CLI output (no prefix) | **Yes** |
| `console.*` | **NEVER in scripts** | No |

```typescript
import { logger } from '../../../scripts/logger';

logger.log('Usage: my-script.ts [options]');
logger.info('Processing file:', filePath);
logger.error('Failed to process file');
```

**NEVER use**: `console.log`, `console.error`, `console.debug`, `console.info`, `console.warn`

Find violations:
```bash
grep -rn 'console\.\(log\|debug\|info\|warn\|error\)(' plugins/rd3/skills/*/scripts/*.ts
```

---

## Memory & Context Persistence

**Write key decisions to memory files immediately when they occur.**

- **Task decisions** → task file's content section
- **User preferences** → `MEMORY.md` (project-level memory)
- **Cross-session context** → `docs/.tasks/sync/` directory
- **Patterns discovered** → `MEMORY.md` under relevant section

When resuming a session after >1 hour, check `MEMORY.md` for prior decisions before acting.

### What to persist

- Architecture decisions and rationale
- User preferences for tool choices or workflows
- Non-obvious workarounds for known issues
- Project-specific patterns not derivable from code

### What NOT to persist

- Temporary debugging state
- Commit hashes or file paths (derivable from git)
- Information already documented in CLAUDE.md or AGENTS.md

---

## Tool Priority Order

When multiple tools could accomplish the same task, prefer this order:

1. **ref (MCP)** — `ref_search_documentation`, `ref_read_url` — Official documentation verification
2. **mcp__grep__searchGitHub** — GitHub code search (fast)
3. **WebSearch** — Recent facts (< 6 months), announcements
4. **WebFetch** — Static HTML, specific URLs
5. **wt:magent-browser** — JS-rendered content, screenshots, form testing
6. **Read/Grep/Glob** — Local project files
7. **LSP** — Syntax validation, type checking
8. **Bash** — Shell commands only (file operations use Glob/Grep/Read instead)

---

## Output

How to produce and present different kinds of output across code, docs, errors, and task completion.

### Code output

- Write idiomatic TypeScript: use `async/await`, proper error handling, type annotations on function signatures
- Prefer `interface` over `type` for object shapes; use `type` for unions and primitives
- Export core utilities from `index.ts` files; keep implementation details in named files
- New scripts must have a shebang `#!/usr/bin/env bun` and be registered in `package.json` under `bin` or `scripts`

### Documentation output

- Use markdown with clear headings (H1 for title, H2 for sections, H3 for subsections)
- Code blocks must specify language: ` ```typescript ` not ` ``` `
- Keep line length reasonable (~100 chars); use hanging indents for long parameter lists

### Error output

- Scripts must emit errors via `logger.error()` and exit with code 1 — never `console.error()`
- Errors must include context: what failed, what was expected, what file/path was involved
- Do not emit stack traces to stdout; they belong in logs, not CLI output

### Verification output

- After completing a task, confirm what was done in a brief summary
- If a command was run, report the outcome: "Added 3 tests in `skills/foo/tests/` — all passing"
- If no changes were made, say why: "No changes needed — existing implementation already handles X"
- For multi-step tasks, summarize each step and its outcome

### Test output

- Test commands must produce machine-parseable output (`bun test --reporter=dot` for CI, `bun test` for local dev)
- When tests fail, report the test file and line number: "FAIL: skills/foo/tests/bar.test.ts:42 — expected X, got Y"
- Never suppress test output in scripts; the `globalSilent` flag in `logger.ts` handles log suppression, not test runners

---

## Anti-Hallucination Protocol

**Verification is mandatory before generation.**

1. **Search first** — Use ref, WebSearch, or local search before claiming
2. **Cite sources** — Every technical claim needs a documentation link or source
3. **Acknowledge uncertainty** — If unsure, say so explicitly
4. **Version-awareness** — Note version numbers; behavior changes between versions
5. **Flag uncertain claims** — State "I cannot fully verify this" for LOW confidence statements

---

## Approval & Escalation Boundaries

**Seek explicit user confirmation before executing:**

| Risk level | Threshold | Action |
|------------|-----------|--------|
| Low | Any team member | Proceed with standard verification |
| Medium | Senior engineer | Ask via AskUserQuestion before proceeding |
| High | Lead or architect | Block and explain; do not proceed without explicit approval |
| Critical | Project owner | Document risk, propose alternatives, wait for explicit approval |

**Risk thresholds:**

- **Medium**: Any operation modifying shared branches, >5 file changes in one pass, unfamiliar code area
- **High**: Force-push, `git reset`, deleting task files, modifying CI/CD configs
- **Critical**: Modifying secrets, credentials, `.env` files, or any irreversible schema change

**Permission boundaries:**

- Writing to `docs/.tasks/` — only via `tasks create/update` CLI, never Write tool
- Writing to `.claude/` — only within existing skill/plugin directories; AskUserQuestion before creating new ones
- Modifying `MEMORY.md` — read existing content first; never overwrite without merging
- Running `bun test` — always allowed; if tests hang for >60s, interrupt and report
- `bun biome format --write .` — always allowed on changed files; do not run on entire repo unless requested

---

## Version & Maintenance

**AGENTS.md version**: 2.0
**Effective date**: 2026-03-20
**Changelog**:

| Version | Date | Change |
|---------|------|--------|
| 2.0 | 2026-03-20 | Full rewrite: added identity, confidence, CRITICAL markers, decision trees, verification checklist, approval boundaries, version tracking |
| 1.0 | ~2025 | Initial AGENTS.md (structure only, grade F) |
