# Decision Tree

Tool selection heuristic for code search and rewrite.

## Decision Flow

```
                    ┌─────────────────────────────┐
                    │  Start: Query received      │
                    └──────────────┬──────────────┘
                                   ▼
              ┌────────────────────────────────────┐
              │  1. Is code structure needed?      │
              │     (function/class/method/async)  │
              └──────────────┬────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
    ┌─────────────────┐          ┌─────────────────────┐
    │  Use ast-grep   │          │  2. Literal/regex?  │
    │  (sg)           │          └──────────┬────────────┘
    └─────────────────┘                     │
                              ┌─────────────┴─────────────┐
                              │ YES                      │ NO
                              ▼                          ▼
                    ┌─────────────────┐       ┌─────────────────────┐
                    │  Use ripgrep    │       │  3. Non-code file?  │
                    │  (rg)           │       │  (JSON/YAML/MD)    │
                    └─────────────────┘       └──────────┬──────────┘
                                                          │
                                              ┌───────────┴───────────┐
                                              │ YES                  │ NO
                                              ▼                       ▼
                                    ┌─────────────────┐   ┌─────────────────┐
                                    │  Use ripgrep    │   │  4. Quick scan? │
                                    │  (rg)           │   └────────┬────────┘
                                    └─────────────────┘            │
                                                     ┌─────────────┴─────────────┐
                                                     │ YES                      │ NO
                                                     ▼                          ▼
                                           ┌─────────────────┐      ┌─────────────────┐
                                           │  Use ripgrep    │      │ Default: ripgrep│
                                           │  (rg)           │      │  (rg)           │
                                           └─────────────────┘      └─────────────────┘
```

## Tool Selection Summary

| Query Type | Tool | Example |
|------------|------|---------|
| Code structure | `sg` | "find all async functions" |
| Literal string | `rg` | "find all 'TODO' comments" |
| Regex pattern | `rg` | "find variable names matching 'user.*'" |
| Non-code file | `rg` | "search in JSON config" |
| Quick reconnaissance | `rg` | "what files mention X" |
| Refactor/rewrite | `sg` | "replace console.log with logger" |

## Keyword Triggers

### Use `sg` when query contains:
- function, class, method, constructor
- async, await, Promise
- try-catch, throw, error handling
- import from, export, inherit
- interface, type alias
- "inside", "nested", "before", "after"

### Use `rg` when query contains:
- string, comment, TODO, FIXME
- config, variable name
- "grep for", "find all", "search"
- "count", "list all"
- JSON, YAML, TOML file paths

## Fallback

```
rg unavailable → native grep
sg unavailable → rg with regex approximation
```

## Quick Reference

```bash
# ripgrep - fast text search
rg "pattern" -n -C 3

# ast-grep - structural search
sg run --pattern 'console.log($$$)' --lang javascript
sg scan --rule references/rules/console-log.yml

# ast-grep rewrite
sg run --pattern 'console.log($$$)' --rewrite 'logger.log($$$)' --lang javascript
```
