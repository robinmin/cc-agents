---
description: Fix all lint, type, and test errors in a project using deterministic single-pass workflow
argument-hint: <validation-command> (e.g., "npm run check", "bun test", "make lint test")
---

# Fix All Issues

Systematically resolve all validation errors (lint, typecheck, tests) in a project using a deterministic, single-pass workflow that maximizes auto-fix usage and minimizes cascading failures.

## Configuration

**Validation Command:** `$ARGUMENTS`

If no command provided, Claude will:
1. Detect project type from config files
2. Ask user to confirm the validation command

### Auto-Detection Heuristics

| Config File | Likely Commands |
|-------------|-----------------|
| `biome.json` | `biome check .` (lint+format), `biome check --write .` (auto-fix) |
| `.eslintrc.*`, `eslint.config.*` | `eslint .`, `eslint . --fix` |
| `tsconfig.json` | `tsc --noEmit` |
| `pyproject.toml` (ruff) | `ruff check .`, `ruff check . --fix` |
| `pyproject.toml` (mypy) | `mypy .` |
| `Cargo.toml` | `cargo clippy`, `cargo test` |
| `go.mod` | `go vet ./...`, `go test ./...` |

> **Tip**: Combine commands for efficiency: `biome check --write . && tsc --noEmit && vitest run`

## Workflow (Single-Pass Strategy)

```
Phase 1: Discovery → Phase 2: Auto-Fix → Phase 3: Manual Fix → Phase 4: Validate
```

### Phase 1: Discovery & Planning

1. **Run validation** to capture the initial error list
2. **Parse and categorize** errors by:
   - **Type**: lint, format, typecheck, test, build
   - **Severity**: error vs warning
   - **Auto-fixability**: can tool fix it automatically?
3. **Create todo list** with `TodoWrite` to track all issues
4. **Estimate scope**: Report total count and breakdown

**Output Example:**
```
Found 23 issues:
- 12 auto-fixable (lint/format)
- 8 type errors
- 3 test failures
```

### Phase 2: Auto-Fix First (Critical)

**Why auto-fix first?** Manual edits can introduce formatting issues that create cascading errors. Running auto-fix first establishes a clean baseline.

4. **Run ALL auto-fix tools** before any manual edits:

   | Tool | Auto-Fix Command |
   |------|------------------|
   | Biome | `biome check --write .` |
   | ESLint | `eslint . --fix` |
   | Prettier | `prettier --write .` |
   | Ruff | `ruff check . --fix && ruff format .` |
   | rustfmt | `cargo fmt` |
   | gofmt | `gofmt -w .` |

5. **Re-run validation** to confirm auto-fix results
6. **Update todo list** - mark auto-fixed items complete

### Phase 3: Manual Fixes (Remaining Issues)

For each remaining issue:

1. **Read the file** to understand surrounding context
2. **Understand the error** - don't guess at fixes
3. **Apply minimal fix** - change only what's necessary
4. **Run validation immediately** - catch regressions early
5. **Update todo list** - mark item complete or note blockers

**Fix Priority Order:**
1. Build/compile errors (blocks everything)
2. Type errors (may cause test failures)
3. Test failures
4. Lint warnings

### Phase 4: Final Validation

7. **Run full validation suite**
8. **Verify zero errors** in all categories
9. **Run tests** to confirm no regressions
10. **Report summary** of changes made

## Language-Specific Patterns

### TypeScript/JavaScript

| Issue | Auto-Fix | Manual Fix Strategy |
|-------|----------|---------------------|
| Import order | ✅ | N/A |
| Formatting | ✅ | N/A |
| `any` type | ❌ | Add proper type annotation or `unknown` |
| Unused variable | ✅/❌ | Remove, or prefix with `_` if intentional |
| Missing return type | ❌ | Add explicit return type annotation |
| Unsafe member access | ❌ | Add null check or optional chaining |

### Python

| Issue | Auto-Fix | Manual Fix Strategy |
|-------|----------|---------------------|
| Import sorting | ✅ `isort`/`ruff` | N/A |
| Formatting | ✅ `black`/`ruff format` | N/A |
| Unused import | ✅ `autoflake`/`ruff` | N/A |
| Type error (mypy) | ❌ | Add type hints or `# type: ignore` with reason |
| Missing docstring | ❌ | Add docstring or `# noqa: D100` |

### Rust

| Issue | Auto-Fix | Manual Fix Strategy |
|-------|----------|---------------------|
| Formatting | ✅ `cargo fmt` | N/A |
| Unused variable | ✅ | Prefix with `_` |
| Dead code | ❌ | Remove or add `#[allow(dead_code)]` |
| Clippy lint | ✅/❌ | Follow clippy suggestion or `#[allow(...)]` |

### Go

| Issue | Auto-Fix | Manual Fix Strategy |
|-------|----------|---------------------|
| Formatting | ✅ `gofmt` | N/A |
| Unused import | ✅ `goimports` | N/A |
| Unused variable | ❌ | Remove or use `_` |
| Vet warning | ❌ | Fix the underlying issue |

## Best Practices

### During Manual Edits

1. **Match existing code style** - follow patterns in surrounding code
2. **Let formatters handle style** - don't manually adjust whitespace
3. **Minimal changes only** - fix the error, nothing more
4. **One fix per validation cycle** - catch cascading issues early

### Suppress vs Fix Decision

| Suppress When | Fix When |
|---------------|----------|
| False positive from tool | Genuine issue |
| Intentional pattern (with comment) | Unintentional oversight |
| Legacy code (with TODO) | New or actively modified code |
| External constraint | Within your control |

**If suppressing, always add explanation:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- External API returns untyped data
const response: any = await externalApi.fetch();
```

## Error Handling

### Fix Introduces New Issues

1. **Analyze relationship** - is new issue caused by the fix?
2. **If related**: Revise fix to address both
3. **If unrelated**: Add to todo list, fix separately
4. **If flaky**: Note for user review, continue

### Circular Dependencies

Some errors only appear after others are fixed. If this occurs:
1. Document the dependency
2. Fix in correct order
3. May require multiple passes

### Unfixable Issues

If an issue cannot be fixed:
1. Document why in todo list
2. Suggest suppression with justification
3. Flag for user decision

## Anti-Patterns

| ❌ Avoid | ✅ Instead |
|----------|------------|
| Manual formatting | Let auto-formatter handle |
| Batch edits without validation | Fix and validate incrementally |
| Guessing at types | Read code to understand actual type |
| Suppressing without comment | Always document why suppressed |
| Ignoring test failures | Fix tests or confirm intentional change |

## Completion Criteria

Command is complete when:

- [ ] All validation commands pass with zero errors
- [ ] Todo list shows all items completed or documented as unfixable
- [ ] No regressions introduced (tests pass)
- [ ] Summary report provided to user

## Output Format

```
## Fix Summary

### Auto-Fixed (12 issues)
- Import ordering (8 files)
- Formatting (4 files)

### Manually Fixed (8 issues)
- Type errors: 6 (added annotations)
- Test failures: 2 (fixed assertions)

### Suppressed (0 issues)
(none)

### Remaining (0 issues)
(none)

✅ All validations pass
```
