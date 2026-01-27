# Agent Skills Best Practices for Structural Code Search & Refactoring

**Description:** Instructions for using the `ast-grep` CLI (`sg`) to perform structure-aware code search and refactoring. Use this over standard `grep` for any query involving syntax, nesting, or scope.

## Table of Contents

- [1. Tool Selection Strategy](#1-tool-selection-strategy)
- [2. CLI Execution Standards](#2-cli-execution-standards)
- [3. Pattern Discovery & Matching](#3-pattern-discovery--matching)
- [4. Refactoring Workflow (OODA Loop)](#4-refactoring-workflow-ooda-loop)
- [5. Complex Rule Construction (YAML)](#5-complex-rule-construction-yaml)
- [6. Common Pitfalls](#6-common-pitfalls)

## 1. Tool Selection Strategy

- **Syntax/Structure:** **ALWAYS** use `ast-grep` for searching logic (e.g., "function calls inside loops," "classes inheriting from X," "try/catch blocks").
- **Strings/Comments:** Use `ripgrep` (`rg`) for finding literal strings, comments, or TODOs.
- **Files:** Use `fd` for finding file paths.
- **Validation:** **ALWAYS** verify a pattern matches expected code before applying a rewrite.

## 2. CLI Execution Standards

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

## 3. Pattern Discovery & Matching

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

## 4. Refactoring Workflow (OODA Loop)

1.  **Observe:** Run a search pattern (`ast-grep run -p '...'`) to see what matches.
2.  **Refine:** Add rules or constraints (`inside`, `has`) to narrow down false positives.
3.  **Preview:** Run with `--rewrite` and `--interactive` to review each change individually.
4.  **Apply:** Once verified, run with `--rewrite '...' --update-all` to apply all changes.

**Interactive Mode Options:**
- `y`: Accept this change
- `n`: Skip this change
- `e`: Edit the replacement
- `q`: Quit session

## 5. Complex Rule Construction (YAML)

For queries too complex for CLI flags, generate a temporary rule file (`temp-rule.yml`):

- **Logical Composition:** Use `all`, `any`, and `not` for multi-condition logic.
- **Relational Anchors:** Use `inside` (ancestor) and `has` (descendant) to define scope.
- **Recursion Control:** Choose appropriate `stopBy` strategy:
  - `stopBy: end`: Search entire subtree (most common for complete traversal)
  - `stopBy: neighbor`: Search only immediate siblings (position-specific)
  - `stopBy: <RuleObject>`: Stop at nodes matching specific rule (bounded search)

## 6. Common Pitfalls

- **Do Not Use Regex for Logic:** Never use regex to parse nested brackets or block scopes.
- **Respect Context:** Do not split code chunks by lines; preserve full function/class bodies found by `ast-grep`.
- **Hallucination Check:** If `ast-grep` returns 0 results, assume the pattern is wrong, not that the code doesn't exist. Re-run with a looser pattern (e.g., just the function name) to verify.
- **StdIn Hang:** Don't use `--stdin` in TTY terminals unless you're actually piping input - it will hang waiting for input.
- **Metavariable Confusion:** Remember `$VAR` ≠ `$$$VAR` - use the right type for your matching needs.
