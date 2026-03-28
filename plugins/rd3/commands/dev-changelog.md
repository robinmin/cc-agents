---
description: Generate changelog from git commits
argument-hint: "[output-file] [--since <tag|commit>] [--until <tag|commit>] [--version <version>]"
model: inherit
allowed-tools: ["Bash", "Write"]
---

# Dev Changelog

Generate concise, user-friendly changelogs from git commits. Translates technical commits into customer-facing release notes.

## Quick Start

```bash
# Generate changelog for commits since last tag
/dev-changelog

# Generate for specific version
/dev-changelog --version 2.5.0

# Generate for date range
/dev-changelog --since v2.4.0

# Write to custom output file
/dev-changelog RELEASE_NOTES.md
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `output-file` | No | Output file path (default: append to CHANGELOG.md) |
| `--since` | No | Start reference (tag/commit, default: last tag) |
| `--until` | No | End reference (tag/commit, default: HEAD) |
| `--version` | No | Version number for header (default: auto-detect) |

## Workflow

### Phase 1: Gather Context

```bash
git log --oneline --since="<since>" --until="<until>"
git diff --stat <since>..<until>
git tag --sort=-version:refname | head -1
```

### Phase 2: Analyze and Categorize

1. Scan commits in the specified range
2. Categorize changes by conventional commit type
3. Filter internal noise (refactor, tests, chores)
4. Translate to user-friendly language

### Phase 3: Generate and Write

```markdown
## [version] - YYYY-MM-DD

### New Features
- **Feature Name**: User-facing description

### Improvements
- **Improvement**: Customer benefit

### Bug Fixes
- Fixed issue description

### Breaking Changes
- Breaking change with migration notes

### Security
- Security fix description
```

## Categories and Commit Mapping

| Conventional Commit | Category |
|---------------------|----------|
| `feat` | New Features |
| `refactor`, `perf` | Improvements |
| `fix` | Bug Fixes |
| `feat!`, `BREAKING CHANGE` | Breaking Changes |
| `security` | Security |

## Error Handling

| Error | Resolution |
|-------|------------|
| Not a git repository | Run from git repository root |
| Invalid tag/commit | Verify with `git tag -l` or `git log --oneline` |
| No commits in range | Check `--since`/`--until` values |
| Empty changelog | No user-facing commits in range |

## Pipeline Integration

This is a **standalone git utility**, not a pipeline phase shortcut. It does not delegate to `rd3:orchestration-dev`. Use it independently when preparing releases, or alongside any pipeline phase as needed.

> **Note:** This command uses the `Write` tool (to write changelogs to disk), unlike pipeline phase commands that use `Read`, `Glob`, `Bash`, `Skill`.

## See Also

- **/dev-gitmsg**: Generate conventional commit messages
- **/dev-run**: Profile-driven pipeline execution
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
