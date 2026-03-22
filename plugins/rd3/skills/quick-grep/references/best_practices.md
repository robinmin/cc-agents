# ast-grep Best Practices

**Description:** Best practices for using `ast-grep` (`sg`) — structural code search and refactoring. For tool selection guidance, see `decision-tree.md`.

> **Tool Selection Reminder:** Use `sg` when code **structure** matters (functions, classes, nesting, AST nodes). Use `rg` for literal strings, regex, comments, and non-code files. See `decision-tree.md` for the full decision tree.

## Table of Contents

- [1. Tool Selection Strategy](#1-tool-selection-strategy)
- [2. When NOT to Use ast-grep](#2-when-not-to-use-ast-grep)
- [3. CLI Execution Standards](#3-cli-execution-standards)
- [4. Pattern Discovery & Matching](#4-pattern-discovery--matching)
- [5. Iterative Rule Development](#5-iterative-rule-development)
- [6. Refactoring Workflow (OODA Loop)](#6-refactoring-workflow-ooda-loop)
- [7. Complex Rule Construction (YAML)](#7-complex-rule-construction-yaml)
- [8. Common Pitfalls](#8-common-pitfalls)
- [9. Ripgrep (rg) Best Practices](#9-ripgrep-rg-best-practices)

## 1. Tool Selection Strategy

**Use `sg` (ast-grep) when:**
- Query involves code structure (functions, classes, methods)
- You need to match syntax patterns (async/await, try-catch)
- Context matters (code inside loops, inside classes)
- You need safe rewriting with AST validation

**Use `rg` (ripgrep) when:**
- Searching for literal strings or regex patterns
- Searching comments, TODOs, or FIXMEs
- Searching non-code files (JSON, YAML, Markdown)
- Doing quick reconnaissance ("what files mention X")

**Validation:** **ALWAYS** verify a pattern matches expected code before applying a rewrite.

## 2. When NOT to Use ast-grep

- **Regex on nested brackets:** ast-grep patterns cannot match nested bracket depths with regex. Use `sg` for structure, not regex on structure.
- **Simple string search:** If you just need `grep -r "TODO"`, use `rg "TODO"` instead.
- **Non-AST files:** ast-grep parses code. For JSON/YAML/Markdown, use `rg`.
- **Speed over precision:** For large quick scans, `rg` is faster than `sg`.

## 3. CLI Execution Standards

- **JSON Output:** Always use `--json` to ensure machine-readable output.
  - _Command:_ `ast-grep run --pattern '...' --json`
- **Language Flag:** Always specify `--lang` to prevent parsing errors.
  - _Example:_ `ast-grep run --lang python...`
- **Scope:** Restrict search scope to specific directories when possible to reduce token usage.
  - _Example:_ `ast-grep run... src/components/`
- **Debug Query Formats:** Use `--debug-query` to inspect AST structure:
  - `--debug-query=ast`: Named nodes only
  - `--debug-query=cst`: All nodes including punctuation
  - `--debug-query=pattern`: How ast-grep interprets your pattern
  - `--debug-query=sexp`: S-expression format for detailed analysis

## 4. Pattern Discovery & Matching

- **Dump AST First:** If unsure of the node type, use `--debug-query=ast` on a snippet to see the tree structure.
- **Object Patterns:** Use object-style patterns for context.
  - _Bad:_ `pattern: '$A.map($B)'` (Ambiguous)
  - _Good:_ `{ pattern: '$A.map($B)', kind: 'call_expression' }` (Precise)
- **Meta-Variables:**
  - `$VAR`: Matches a single named node.
  - `$$VAR`: Matches node including unnamed/anonymous nodes (e.g., punctuation).
  - `$$$VARS`: Matches zero or more nodes (lazy matching, stops when next node matches).
  - `$_VAR`: Non-capturing/anonymous variable (each occurrence can match different content).
- **Pattern Strictness:** Control matching precision with `strictness`:
  - `cst`: All nodes must match (strictest)
  - `smart`: Default - skips unnamed nodes in target
  - `ast`: Only named AST nodes
  - `relaxed`: Named nodes, ignores comments/unnamed
  - `signature`: Flexible function signature matching
- **Constraints:** Use strict constraints to filter common noise (e.g., ignoring test files).

## 5. Iterative Rule Development

When writing complex ast-grep rules:

1. **Break down** user queries into smaller parts
2. **Identify** sub-rules for matching
3. **Combine** using relational or composite rules
4. **Revise** by removing unmatching parts
5. **Test** iteratively against example code

**Tip:** Start with a loose pattern, then narrow down. If 0 results, the pattern is wrong — not the code.

## 6. Refactoring Workflow (OODA Loop)

1.  **Observe:** Run a search pattern (`ast-grep run -p '...'`) to see what matches.
2.  **Refine:** Add rules or constraints (`inside`, `has`) to narrow down false positives.
3.  **Preview:** Run with `--rewrite` and `--interactive` to review each change individually.
4.  **Apply:** Once verified, run with `--rewrite '...' --update-all` to apply all changes.

**Interactive Mode Options:**
- `y`: Accept this change
- `n`: Skip this change
- `e`: Edit the replacement
- `q`: Quit session

## 7. Complex Rule Construction (YAML)

For queries too complex for CLI flags, generate a temporary rule file (`temp-rule.yml`):

- **Logical Composition:** Use `all`, `any`, and `not` for multi-condition logic.
- **Relational Anchors:** Use `inside` (ancestor) and `has` (descendant) to define scope.
- **Recursion Control:** Choose appropriate `stopBy` strategy:
  - `stopBy: end`: Search entire subtree (most common for complete traversal)
  - `stopBy: neighbor`: Search only immediate siblings (position-specific)
  - `stopBy: <RuleObject>`: Stop at nodes matching specific rule (bounded search)

## 8. Common Pitfalls

- **Do Not Use Regex for Logic:** Never use regex to parse nested brackets or block scopes.
- **Respect Context:** Do not split code chunks by lines; preserve full function/class bodies found by `ast-grep`.
- **Hallucination Check:** If `ast-grep` returns 0 results, assume the pattern is wrong, not that the code doesn't exist. Re-run with a looser pattern (e.g., just the function name) to verify.
- **StdIn Hang:** Don't use `--stdin` in TTY terminals unless you're actually piping input - it will hang waiting for input.
- **Metavariable Confusion:** Remember `$VAR` ≠ `$$$VAR` - use the right type for your matching needs.

## 9. Ripgrep (rg) Best Practices

**Common Flags:**
- `-g '*.toml'` — include files matching glob; `-g '!*.toml'` excludes
- `-t rust` / `-trust` — include/exclude file types
- `--hidden` / `-.` — search hidden files
- `--only-matching` / `-o` — show only matching portion
- `-F` — treat pattern as literal string (no regex)
- `--replace FAST` / `-r` — replace matched text in output

**Performance Tips:**
- Recursive search is default — specify directories to narrow scope
- `-uu` for hidden files + ignored files (progressive: `-u` → `-uu` → `-uuu` for binary)
- Use `--no-mmap` for consistent binary file detection (small perf cost)

**Advanced Patterns:**
- `-P` for PCRE2 features (lookbehind, backreferences)
- Multiline with `-U` flag: `rg -U "function.*{.*}"`

**Things to Avoid:**
- Binary files with `-a`/`--text` — may emit control characters
- Glob order matters — blacklist glob after include glob can block all files
- Quote glob patterns: `rg "clap" -g '*.toml'` not `-g *.toml`
