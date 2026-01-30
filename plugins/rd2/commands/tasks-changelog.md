---
allowed-tools:
  - Bash
description: This command should be used when the user asks to "generate changelog", "create release notes", or "write changelog from git commits". Analyzes git history, categorizes changes by type, and translates technical commits into user-friendly release notes.
argument-hint: [output-file] [--since <tag|commit>] [--until <tag|commit>] [--version <version>]
version: 1.0.0
model: inherit
---

# Tasks Changelog

Generate concise, user-friendly changelogs from git commits. Translates technical commits into customer-facing release notes.

## Quick Start

```bash
# Generate changelog for commits since last tag
/rd2:tasks-changelog

# Generate for specific version
/rd2:tasks-changelog --version 2.5.0

# Generate for date range (since last release tag)
/rd2:tasks-changelog --since v2.4.0

# Write to custom output file
/rd2:tasks-changelog RELEASE_NOTES.md

# Full specification
/rd2:tasks-changelog CHANGELOG.md --since v2.4.0 --until v2.5.0 --version 2.5.0
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `output-file` | No | Output file path (default: append to CHANGELOG.md) |
| `--since` | No | Start reference (tag/commit, default: last tag) |
| `--until` | No | End reference (tag/commit, default: HEAD) |
| `--version` | No | Version number for header (default: auto-detect) |

## Workflow

This command analyzes git history and generates user-friendly changelogs using the following methodology:

### Phase 1: Gather Context

```bash
# Get git context
git log --oneline --since="<since>" --until="<until>"
git diff --stat <since>..<until>
git tag --sort=-version:refname | head -1
```

### Phase 2: Analyze & Categorize

1. **Scan commits** in the specified range
2. **Categorize changes**:
   - ✨ New Features
   - 🔧 Improvements
   - 🐛 Bug Fixes
   - 💥 Breaking Changes
   - 🔒 Security Fixes
3. **Filter noise**: Exclude internal commits (refactor, tests, chores)
4. **Translate to user language**: Convert technical to customer-friendly

### Phase 3: Generate & Write

Generate structured changelog:

```markdown
## [version] - YYYY-MM-DD

### ✨ New Features

- **Feature Name**: User-facing description

### 🔧 Improvements

- **Improvement**: Customer benefit

### 🐛 Fixes

- Fixed issue description

### 💥 Breaking Changes

- Breaking change with migration notes

### 🔒 Security

- Security fix description
```

Write to specified output file (append to CHANGELOG.md by default).

## Categories & Commit Mapping

| Conventional Commit | Category | Emoji |
|---------------------|----------|-------|
| `feat` | New Features | ✨ |
| `refactor`, `perf` | Improvements | 🔧 |
| `fix` | Bug Fixes | 🐛 |
| `feat!`, `BREAKING CHANGE` | Breaking Changes | 💥 |
| `security` | Security Fixes | 🔒 |

## Examples

### Basic Usage

```bash
/rd2:tasks-changelog

# Analyzes commits since last tag, generates:
# - Auto-detects version from git describe
# - Categorizes all commits
# - Appends to CHANGELOG.md
```

### Specific Version

```bash
/rd2:tasks-changelog --version 2.5.0

# Output:
## [2.5.0] - 2024-03-15

### ✨ New Features
...
```

### Date Range

```bash
/rd2:tasks-changelog --since v2.4.0 --until v2.5.0

# Only includes commits between v2.4.0 and v2.5.0
```

### Custom Output File

```bash
/rd2:tasks-changelog RELEASE_NOTES.md

# Writes to RELEASE_NOTES.md instead of CHANGELOG.md
# Creates file if it doesn't exist
```

## Commit Message Guidelines

For best changelog results, use conventional commits:

```bash
# Good - gets categorized
feat(auth): add OAuth2 support
fix(api): resolve timeout on large requests
refactor(db): optimize query performance

# Skipped - internal noise
chore: update dependencies
test: add unit tests for auth
style: format code with prettier
```

## Error Handling

| Error | Resolution |
|-------|------------|
| Not a git repository | Run from git repository root directory |
| Invalid git tag/commit | Verify reference exists with `git tag -l` or `git log --oneline` |
| No commits in range | Check `--since`/`--until` values, ensure range contains commits |
| Write permission denied | Check file path permissions and directory exists |
| Empty changelog | No user-facing commits in range (internal-only changes) |

## Implementation

This command implements the changelog generation methodology directly:

1. **Gather git history** using `git log --oneline` with date filters
2. **Parse conventional commits** to categorize changes automatically
3. **Filter internal noise** (chore, test, style, refactor commits)
4. **Generate user-friendly descriptions** from technical commit messages
5. **Format structured output** with emoji categories and proper markdown

The command is self-contained and does not depend on external skills.

## Tips

- Run from git repository root
- Use conventional commits for better categorization
- Review generated changelog before publishing
- Specify `--since` as last release tag for accurate changes
- Use `--version` for explicit version headers
- Custom output files are created if they don't exist

## See Also

- **/rd2:tasks-gitmsg**: Generate conventional commit messages
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
