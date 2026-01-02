---
allowed-tools: Bash(rm:*), Bash(mv:*), Bash(mkdir:*)
description: Identify and remove dead code, orphan files, and unused dependencies safely
argument-hint: [--dry-run] [--scope files|deps|code|all]
---

# Codebase Cleanup

Systematically identify and remove dead code, orphan files, and unused dependencies to reduce technical debt. Uses a **triage-first approach** - files are moved to a staging area for verification before permanent deletion.

## Arguments

- `--dry-run`: Analyze and report without making changes
- `--scope`: Limit cleanup scope
  - `files`: Orphan and unreferenced files only
  - `deps`: Unused dependencies only
  - `code`: Dead code within files only
  - `all`: Everything (default)

## Why Dead Code Matters

Dead code contributes to technical debt through:
- **Increased cognitive load** - developers must read and understand unused code
- **Slower builds** - more code to compile and bundle
- **Security risk** - unpatched vulnerabilities in unused code paths
- **False coverage** - inflated metrics hide actual test gaps

> Target: **0% dead code** - any unused code is technical debt.

## CRITICAL: Pre-Flight Safety Checks

**MUST complete before ANY cleanup operations:**

### 1. Git Status Check

```bash
# Verify working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ ERROR: Uncommitted changes detected. Commit or stash first."
  exit 1
fi
```

### 2. Backup Verification

- [ ] Project is in version control (git)
- [ ] Remote backup exists: `git remote -v`
- [ ] If no git: `tar -czf backup_$(date +%Y%m%d).tar.gz .`

### 3. Branch Safety

```bash
# Never run on protected branches
current_branch=$(git branch --show-current)
if [[ "$current_branch" =~ ^(main|master|develop)$ ]]; then
  echo "⚠️ Creating cleanup branch..."
  git checkout -b cleanup/$(date +%Y%m%d)
fi
```

## Dead Code Categories

| Category | Description | Risk Level | Detection Method |
|----------|-------------|------------|------------------|
| **Orphan files** | Created but never imported | Medium | Static import analysis |
| **Deprecated files** | Replaced but not deleted | Low | Git history + references |
| **Unused dependencies** | Installed but not imported | Low | Package manager analysis |
| **Dead exports** | Exported but never imported | Medium | Export/import graph |
| **Unreachable code** | Logic that cannot execute | High | Control flow analysis |
| **Feature flags** | Disabled features still in code | Medium | Config + code analysis |

## Configuration

If verification commands are not auto-detected, Claude will ask for them:

| Config | Example | Purpose |
|--------|---------|---------|
| `test-cmd` | `npm test`, `pytest`, `go test ./...` | Verify no regressions |
| `typecheck-cmd` | `tsc --noEmit`, `mypy .`, `go vet` | Type safety check |
| `lint-cmd` | `eslint .`, `ruff check`, `clippy` | Code quality check |
| `build-cmd` | `npm run build`, `cargo build` | Build verification |

## Analysis Workflow

```
Phase 1: Detect → Phase 2: Analyze Deps → Phase 3: Analyze Files → Phase 4: Analyze Code → Phase 5: Triage
```

### Phase 1: Detect Project Type

Auto-detect from config files:

| Indicator | Stack | Detection Tools |
|-----------|-------|-----------------|
| `package.json` + `bun.lockb` | Bun/TypeScript | `knip`, `depcheck` |
| `package.json` + `package-lock.json` | Node.js | `knip`, `depcheck`, `unimported` |
| `Cargo.toml` | Rust | `cargo-machete`, `cargo-udeps` |
| `go.mod` | Go | `go mod tidy`, `deadcode` |
| `pyproject.toml` | Python | `vulture`, `autoflake` |
| `pom.xml` / `build.gradle` | Java | `unused-dependency-plugin` |

### Phase 2: Dependency Analysis

| Package Manager | Unused Detection | Remove Command |
|-----------------|------------------|----------------|
| npm/yarn/pnpm/bun | `knip`, `depcheck` | `npm uninstall <pkg>` |
| cargo | `cargo machete` | `cargo remove <pkg>` |
| go | `go mod tidy` | `go get <pkg>@none` |
| pip/poetry | `pip-autoremove` | `pip uninstall <pkg>` |

**Prefer automated tools** over manual grep - they handle dynamic imports, re-exports, and complex dependency graphs.

### Phase 3: File Reference Analysis

**Safe to Remove (High Confidence):**
- No imports found anywhere in codebase
- Not referenced in package.json (main, bin, exports)
- Not an entry point pattern (`index.*`, `main.*`, `app.*`)

**Requires Review (Medium Confidence):**
- Only referenced in string literals (possible dynamic import)
- Referenced in comments only
- Has matching test file but test also appears unused

**Never Flag as Unused:**
- Configuration files (`*.config.*`, `.*rc`, `tsconfig.json`)
- Package manifests (`package.json`, `Cargo.toml`, `go.mod`)
- Lockfiles (`*.lock`, `*-lock.*`)
- Documentation (`README*`, `LICENSE*`, `docs/**`)
- CI/CD files (`.github/**`, `.gitlab-ci.yml`)
- Entry points and framework-specific patterns

### Phase 4: Code-Level Dead Code

| Language | Tool | What It Finds |
|----------|------|---------------|
| TypeScript | `knip` | Unused exports, files, deps, types |
| TypeScript | `ts-prune` | Unused exports only |
| Python | `vulture` | Unreachable code, unused vars |
| Python | `autoflake` | Unused imports and vars |
| Rust | `cargo clippy` | Dead code, unused imports |
| Rust | `cargo-udeps` | Unused dependencies |
| Go | `deadcode` | Unreachable functions |
| Go | `staticcheck` | Unused code patterns |

**Combine static + dynamic analysis** for best results - static analysis may miss dynamically loaded code.

## Safety Protocol (Triage-First)

**CRITICAL: Never delete files directly. Always move to triage folder first.**

### Phase 5: Triage Staging

```bash
# Create triage structure
mkdir -p _cleanup_triage/{files,deps,code}

# Move files preserving structure
mkdir -p _cleanup_triage/files/$(dirname path/to/file.ts)
mv path/to/file.ts _cleanup_triage/files/path/to/file.ts
```

### Generate MANIFEST.md

Create `_cleanup_triage/MANIFEST.md` documenting each item:

```markdown
# Cleanup Triage Manifest

Generated: YYYY-MM-DD HH:MM
Branch: cleanup/YYYYMMDD

## Files Moved

| File | Reason | Confidence | Restore Command |
|------|--------|------------|-----------------|
| `src/old-util.ts` | No imports found | High | `mv _cleanup_triage/files/src/old-util.ts src/` |
| `lib/helper.py` | String literal ref only | Medium | `mv _cleanup_triage/files/lib/helper.py lib/` |

## Dependencies Removed

| Package | Reason | Restore Command |
|---------|--------|-----------------|
| `lodash` | No imports | `npm install lodash` |

## Code Changes

| File | Change | Line |
|------|--------|------|
| `src/api.ts` | Removed unused export `oldFn` | L45 |
```

### Verification Sequence

```bash
# After moving files to triage
<test-cmd>       # Must pass
<typecheck-cmd>  # Must pass
<lint-cmd>       # Must pass
<build-cmd>      # Must succeed
```

### Restoration Commands

```bash
# Restore specific file
mv _cleanup_triage/files/path/to/file.ext path/to/file.ext

# Restore all files
cp -r _cleanup_triage/files/* .

# Permanently delete after verification
rm -rf _cleanup_triage
```

## Execution Protocol

### Step 1: Analysis (No Changes)

```
Detecting project type...
Running dead code analysis...
Generating triage recommendations...
```

Output analysis report with confidence levels.

### Step 2: User Review

Present findings and **wait for confirmation** before any changes:

```
Found 12 candidates for cleanup:
- 5 high confidence (safe to remove)
- 4 medium confidence (review recommended)
- 3 low confidence (skip unless confirmed)

Proceed with high-confidence items? [y/n/all]
```

### Step 3: Execute with Verification

For each batch:
1. Move files to triage
2. Run verification commands
3. Report success/failure
4. If failure: restore and investigate

### Step 4: Final Report

```markdown
## Cleanup Summary

### Completed
- Removed 3 unused dependencies (-2.1 MB)
- Triaged 8 orphan files (423 lines)
- Removed 12 dead exports

### Verification
- ✅ Tests pass (142/142)
- ✅ Type check pass
- ✅ Lint pass
- ✅ Build succeeds

### Next Steps
- Review `_cleanup_triage/MANIFEST.md`
- Run application smoke test
- If OK: `rm -rf _cleanup_triage && git add -A && git commit`
- If issues: restore from triage
```

## Common False Positives

| Pattern | Why It's False | How to Handle |
|---------|----------------|---------------|
| Dynamic imports | `import(variable)` | Check for `import()` calls |
| Plugin systems | Loaded by convention | Check plugin directories |
| CLI entry points | Called externally | Check `bin` in package.json |
| Test fixtures | Used by test runner | Check test config |
| Generated code | Re-created on build | Check build scripts |
| Feature flags | Conditionally loaded | Check feature flag config |

## Completion Criteria

- [ ] All verification commands pass
- [ ] MANIFEST.md documents all changes
- [ ] User has reviewed medium/low confidence items
- [ ] Triage folder ready for deletion or restoration

## References

- [Meta: Automating Dead Code Cleanup](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)
- [Exposing Dead Code: Strategies for Detection](https://vfunction.com/blog/dead-code/)
- [Dead Code: Impact and Remediation](https://sternumiot.com/iot-blog/dead-code-causes-and-remediation-strategies/)
- [Knip: Find Dead Code in TypeScript](https://knip.dev/)
