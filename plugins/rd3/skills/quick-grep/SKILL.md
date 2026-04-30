---
name: quick-grep
description: "Strategic code search and rewrite: use 'find function patterns', 'search code structure', 'grep for strings', 'replace with ast-grep' to activate. Ideal for locating code by structure (functions, classes, async patterns) or text (strings, comments, FIXMEs), or when refactoring code with safe AST-based rewrites. Includes prebuilt JavaScript and TypeScript ast-grep rules for common code smells."
license: Apache-2.0
version: 1.0.0
created_at: 2026-03-21
updated_at: 2026-03-21
platform: rd3
tags: [search, ripgrep, ast-grep, refactor, rewrite]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  interactions:
    - tool-wrapper
see_also:
  - rd3:cc-skills
---

## quick-grep

Strategic code search and rewrite skill that selects the optimal tool based on query characteristics.
The bundled `references/rules/*.yml` files are detection-oriented `ast-grep` rules with JavaScript and TypeScript variants in a single YAML file.

## When to Use

- **"find all async functions without error handling"** → ast-grep (structure)
- **"search for console.log in production code"** → ripgrep (text)
- **"find FIXME comments in source files"** → ripgrep (text)
- **"replace all console.log with logger.log"** → ast-grep (rewrite)
- **"count occurrences of function X"** → ripgrep (count)
- **"find classes inheriting from BaseModel"** → ast-grep (structure)

## Quick Start

```bash
# Search with ripgrep (text/regex)
rg "FIXME" -n -C 3

# Search with ast-grep (structure)
sg run --pattern 'async function $F() { $$$ }' --lang javascript

# Rewrite with ast-grep
sg run --pattern 'console.log($$$)' --rewrite 'logger.log($$$)' --lang javascript --interactive
```

### Tools

| Tool | Use When |
|------|----------|
| **ripgrep (rg)** | Literal strings, regex, non-code files (JSON/YAML/MD), quick reconnaissance |
| **ast-grep (sg)** | Code structure (AST), refactoring, syntax-aware patterns, context distinction |
| **native grep** | Fallback when rg unavailable |
| **sed/awk/wc** | Simple text transformations, counting |

### Decision Tree

```
Given a query:
1. Is it code STRUCTURE (AST-based)?
   YES → ast-grep (sg)
   NO  → Continue
2. Is it LITERAL STRING or REGEX?
   YES → ripgrep (rg)
   NO  → Continue
3. Is target NON-CODE (JSON/YAML/MD)?
   YES → ripgrep (rg)
   NO  → Continue
4. Is it QUICK RECONNAISSANCE?
   YES → ripgrep (rg)
   NO  → Default to ripgrep (rg)
```

### Signal Keywords

| Signal | Tool | Examples |
|--------|------|----------|
| structure keywords | sg | "function", "class", "method", "async", "await", "try-catch", "import", "inherit", "constructor" |
| context keywords | sg | "inside class", "before return", "after import", "nested in", "contains" |
| text keywords | rg | "string", "comment", "FIXME", "HACK", "config", "variable name" |
| quick scan | rg | "grep for", "find all", "search", "list all", "count" |
| edit/rewrite | sg | "replace", "refactor", "rename", "change to", "wrap with" |

### Fallback Chain

- rg missing → native grep
- sg missing → rg with regex approximation
- Both missing → native tools (grep/awk/sed/wc)

### Commands

**ripgrep:**
```bash
rg [OPTIONS] PATTERN [FILES...]
# Flags: -g (glob), -t (type), -l (files-with-matches), -n (line-number), -C (context)
```

**ast-grep:**
```bash
sg run --pattern 'PATTERN' --lang LANG [DIR]
sg scan --rule RULE.yml [DIR]
sg run --pattern 'A' --rewrite 'B' --lang LANG
sg scan --rule RULE.yml --files-with-matches
# Rule-based rewrites require a rule file that defines a fix/rewrite payload.
```

### Rewrite Safety

When using sg rewrite:
- Preview detection rules first: `sg scan --rule detect.yml --files-with-matches [DIR]`
- Use `sg run --pattern 'A' --rewrite 'B' --lang LANG --interactive [DIR]` for ad hoc rewrites
- Use `sg scan --rule fix.yml --interactive [DIR]` only when the rule file defines a fix/rewrite payload
- After rewrite, verify changed files manually or with tests
- Roll back with: `git restore --source=HEAD -- [files]`

### Pre-built Rules

Located under this skill's `references/rules/` directory:
- `console-log.yml` — find console.* calls
- `todo-no-error.yml` — find FIXME/HACK comments
- `async-no-trycatch.yml` — find async functions without error handling
- `impure-pipe.yml` — find promise chains without catch
- `hardcoded-secret.yml` — find hardcoded API keys/secrets

Each rule file bundles JavaScript and TypeScript variants so the same command works across JavaScript and TypeScript source files supported by `ast-grep`.
Resolve `$QUICK_GREP_SKILL_DIR` to the installed `quick-grep` skill directory before running these examples from a project root.

```bash
# Use a pre-built rule
sg scan --rule "$QUICK_GREP_SKILL_DIR/references/rules/console-log.yml"

# Preview files affected by a rule
sg scan --rule "$QUICK_GREP_SKILL_DIR/references/rules/console-log.yml" --files-with-matches
```

Use `sg run --pattern ... --rewrite ...` for rewrites unless you have authored a dedicated fix rule.

See `references/rules-format.md` for rule format documentation.
