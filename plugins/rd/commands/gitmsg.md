---
allowed-tools: Bash(git:*)
description: Generate conventional commit message following Conventional Commits 1.0.0 specification
argument-hint: [--amend] [--breaking]
---

# Smart Git Commit

Generate semantic commit messages that enable automated versioning, changelog generation, and clear communication of changes.

## Context Analysis

```
Gathering git context...
```

- Current git status: !`git status --porcelain`
- Staged changes: !`git diff --cached --name-only`
- Recent commits: !`git log --oneline -5`
- Current branch: !`git branch --show-current`

## Arguments

- `--amend`: Generate message for amending the most recent commit
- `--breaking`: Include BREAKING CHANGE footer (triggers MAJOR version bump)

## Workflow

### Phase 1: Analyze Changes

1. **Review staged changes** to understand what was modified
2. **Identify the primary change type** (see Types below)
3. **Determine scope** from affected module/component
4. **Check for breaking changes** in API signatures, config formats, or behavior

### Phase 2: Generate Message

Generate a commit message following [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Commit Types (SemVer Mapping)

| Type | Description | SemVer Impact |
|------|-------------|---------------|
| `feat` | New feature or capability | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | PATCH |
| `style` | Formatting, whitespace (no logic change) | PATCH |
| `refactor` | Code restructuring (no behavior change) | PATCH |
| `perf` | Performance improvement | PATCH |
| `test` | Adding or updating tests | PATCH |
| `build` | Build system or dependencies | PATCH |
| `ci` | CI/CD configuration | PATCH |
| `chore` | Maintenance tasks | PATCH |
| `revert` | Reverting a previous commit | PATCH |

**Breaking Changes:** Add `!` after type/scope OR include `BREAKING CHANGE:` footer → triggers MAJOR bump

## Message Guidelines

### Subject Line (Required)

- **Imperative mood**: "add feature" not "added feature" or "adds feature"
- **No capitalization**: Start lowercase
- **No period**: Omit trailing punctuation
- **Max 50 characters**: Be concise (72 char hard limit)
- **Complete the sentence**: "If applied, this commit will _____"

### Scope (Recommended)

- Use consistent, recognizable module/component names
- Examples: `auth`, `api`, `ui`, `db`, `config`, `deps`
- Derive from folder structure, package name, or domain entity

### Body (When Needed)

Include body when:
- Change requires explanation of "why" not just "what"
- Multiple related changes in one commit
- Non-obvious implementation decisions

Format:
- Blank line after subject
- Wrap at 72 characters
- Explain motivation and contrast with previous behavior

### Footer (When Applicable)

```text
BREAKING CHANGE: <description of what breaks and migration path>
Refs: #123, #456
Co-authored-by: Name <email>
```

## Examples

### Simple Fix
```
fix(auth): prevent session timeout on idle

Sessions were expiring during long form submissions. Extended
idle timeout to 30 minutes and added activity heartbeat.

Refs: #234
```

### New Feature
```
feat(api): add batch processing endpoint

- POST /api/v1/batch accepts array of operations
- Processes up to 100 items per request
- Returns partial success with detailed error array
```

### Breaking Change
```
feat(config)!: migrate to YAML configuration format

BREAKING CHANGE: JSON configuration files are no longer supported.
Run `migrate-config` to convert existing config.json to config.yaml.

Migration guide: docs/migration/v3-config.md
```

### Dependency Update
```
build(deps): bump fastify from 4.26.0 to 4.28.1

Security fix for CVE-2024-XXXX (request smuggling).
```

## Anti-Patterns to Avoid

| ❌ Bad | ✅ Good | Why |
|--------|---------|-----|
| `fix: fixed bug` | `fix(parser): handle empty input arrays` | Be specific |
| `update stuff` | `refactor(auth): extract token validation` | Use proper type |
| `WIP` | `feat(draft): add user preferences skeleton` | No WIP commits |
| `Fix #123` | `fix(api): validate request body\n\nRefs: #123` | Describe the change |
| `misc changes` | Split into multiple focused commits | Atomic commits |

## Output Format

Present the generated message in a code block for easy copying:

```text
<generated message>
```

Then ask: "Ready to commit with this message? [y/n/edit]"

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning 2.0.0](https://semver.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
