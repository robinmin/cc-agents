---
description: Fix all lint, type, and test errors in a project using deterministic single-pass workflow
argument-hint: [validation-command] (e.g., "npm run check", "make lint test")
---

# Fix All Issues

Systematically resolve all validation errors (lint, typecheck, tests) using a deterministic workflow that maximizes auto-fix and minimizes cascading failures.

## Quick Start

```bash
/rd:task-fixall "biome check --write . && tsc --noEmit && vitest run"
```

If no command provided, auto-detect from config files and confirm with user.

## Auto-Detection

| Config File | Commands |
|-------------|----------|
| `biome.json` | `biome check --write .` |
| `.eslintrc.*` | `eslint . --fix` |
| `tsconfig.json` | `tsc --noEmit` |
| `pyproject.toml` | `ruff check . --fix && mypy .` |
| `Cargo.toml` | `cargo fmt && cargo clippy && cargo test` |
| `go.mod` | `gofmt -w . && go vet ./... && go test ./...` |

## Workflow

```
Phase 1: Discover → Phase 2: Auto-Fix → Phase 3: Manual Fix → Phase 4: Validate
```

### Phase 1: Discovery

1. Run validation to capture all errors
2. Parse and categorize by type (lint/type/test), severity, auto-fixability
3. Create todo list with `TodoWrite`
4. Report breakdown:
   ```
   Found 23 issues: 12 auto-fixable, 8 type errors, 3 test failures
   ```

### Phase 2: Auto-Fix First

**Critical**: Run ALL auto-fix tools BEFORE manual edits to establish clean baseline.

| Language | Auto-Fix Command |
|----------|------------------|
| JS/TS | `biome check --write .` or `eslint --fix && prettier --write` |
| Python | `ruff check --fix . && ruff format .` |
| Rust | `cargo fmt` |
| Go | `gofmt -w . && goimports -w .` |

Re-run validation, update todo list.

### Phase 3: Manual Fixes

For each remaining issue:

1. **Read file** - understand context before fixing
2. **Apply minimal fix** - change only what's necessary
3. **Validate immediately** - catch regressions early
4. **Update todo** - mark complete or note blockers

**Fix Priority:**
1. Build/compile errors (blocks everything)
2. Type errors (may cause test failures)
3. Test failures
4. Lint warnings

### Phase 4: Final Validation

1. Run full validation suite
2. Verify zero errors
3. Run tests to confirm no regressions
4. Report summary

## Language Patterns

### TypeScript/JavaScript

| Issue | Fix Strategy |
|-------|--------------|
| `any` type | Add proper annotation or `unknown` |
| Unused variable | Remove or prefix with `_` |
| Missing return type | Add explicit annotation |
| Unsafe access | Add null check or `?.` |

### Python

| Issue | Fix Strategy |
|-------|--------------|
| Type error (mypy) | Add type hints or `# type: ignore[code]` with reason |
| Missing docstring | Add docstring or `# noqa: D100` |

### Rust

| Issue | Fix Strategy |
|-------|--------------|
| Dead code | Remove or `#[allow(dead_code)]` with reason |
| Clippy lint | Follow suggestion or `#[allow(...)]` |

## Suppress vs Fix

| Suppress When | Fix When |
|---------------|----------|
| False positive | Genuine issue |
| Intentional pattern | Unintentional oversight |
| Legacy code (add TODO) | New/modified code |

**Always document suppressions:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- External API returns untyped
const response: any = await externalApi.fetch();
```

## Anti-Patterns

| Avoid | Instead |
|-------|---------|
| Manual formatting | Let auto-formatter handle |
| Batch edits without validation | Fix and validate incrementally |
| Guessing at types | Read code to understand actual type |
| Suppressing without comment | Always document why |

## Completion

Done when:
- All validation commands pass (zero errors)
- Todo list complete or blockers documented
- No regressions (tests pass)

## Output Format

```markdown
## Fix Summary

**Auto-Fixed (12):** Import ordering (8), formatting (4)
**Manually Fixed (8):** Type errors (6), test failures (2)
**Suppressed (0):** none
**Remaining (0):** none

✅ All validations pass
```
