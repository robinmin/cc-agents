---
allowed-tools: ["Bash"]
description: Generate conventional commit message from staged changes
argument-hint: "[--amend] [--breaking]"
model: inherit
---

# Dev Gitmsg

Generate conventional commit messages from staged changes. Read-only analysis of git context — does NOT execute commits.

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

## Message Guidelines

### Subject Line (Required)

- **Imperative mood**: "add feature" not "added feature"
- **No capitalization**: Start lowercase
- **No period**: Omit trailing punctuation
- **Max 50 characters**: Be concise (72 char hard limit)

### Scope (Recommended)

- Use consistent module/component names from folder structure
- Examples: `auth`, `api`, `ui`, `db`, `config`, `deps`

### Body (When Needed)

- Blank line after subject
- Wrap at 72 characters
- Explain motivation, not just what changed

## Anti-Patterns

| Bad | Good | Why |
|-----|------|-----|
| `fix: fixed bug` | `fix(parser): handle empty input arrays` | Be specific |
| `update stuff` | `refactor(auth): extract token validation` | Use proper type |
| `WIP` | `feat(draft): add user preferences skeleton` | No WIP commits |
| `misc changes` | Split into multiple focused commits | Atomic commits |

## Output Format

Present the generated message in a code block for easy copying.

**Note:** This command only generates the commit message. User must manually run `git commit`.

## Pipeline Integration

This is a **standalone git utility**, not a pipeline phase shortcut. It does not delegate to `rd3:orchestration-v2`. Use it independently before committing, or alongside any pipeline phase as needed.

## See Also

- **/rd3:dev-changelog**: Generate changelog from commits
- **/rd3:dev-run**: Profile-driven pipeline execution

## References

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)
- [Semantic Versioning 2.0.0](https://semver.org/)
