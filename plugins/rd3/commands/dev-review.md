---
description: Source-oriented code review. Reviews code quality via SECU framework on a path or directory.
argument-hint: "[<path>] [--focus <all|security|efficiency|correctness|usability>] [--fix <none|blockers-first|all>] [--auto] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Review

Source-oriented code review using the **SECU framework** (Security, Efficiency, Correctness, Usability). This command is a thin wrapper that delegates to the `rd3:code-verification` skill.

**No task-reference input.** Provide a path or directory. If none given, defaults to `src/`. Findings are always written to a newly created task file.

## When to Use

**Activate `rd3:dev-review` for:**
- Code quality review of a specific path or directory
- Full project SECU scan (no arguments)
- Findings written to a new task file
- Optional auto-fix pass (blockers-first or all)

**Activate `rd3:dev-verify` instead for:**
- Task-oriented verification (Phase 7 + Phase 8 combined)
- Requirements traceability against a task file
- BDD scenario checking

## Usage

```
/rd3:dev-review <path>              # Review a path or directory
/rd3:dev-review                     # Review entire src/
/rd3:dev-review <path> --fix all   # Review with auto-fix
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `path` | No | `src/` | Directory or file path to review |
| `--focus` | No | `all` | SECU dimensions: `all`, `security`, `efficiency`, `correctness`, `usability`, or comma-separated |
| `--fix` | No | `none` | Fix strategy: `none`, `blockers-first`, `all` |
| `--auto` | No | `false` | Skip all confirmations |
| `--channel` | No | `auto` | Execution channel: `auto`, `current`, or remote agent |

## Delegation

This command delegates all work to the `rd3:code-verification` skill.

```
Skill(skill="rd3:code-verification", args="--mode source --input $INPUT --focus $FOCUS --fix $FIX_MODE --auto $AUTO --channel $CHANNEL")
```

### Input Resolution

| Input | Action |
|-------|--------|
| `src/auth/` or `src/auth` | Review that directory |
| `plugins/rd3/skills/` | Review that directory |
| A specific file (`src/config.ts`) | Review that file |
| Empty | Default to `src/` |

## Examples

```bash
# Review a directory (full SECU scan)
/rd3:dev-review src/auth/

# Security audit only
/rd3:dev-review src/auth/ --focus security

# Security + Correctness (logic bugs)
/rd3:dev-review src/auth/ --focus security,correctness

# Performance review
/rd3:dev-review src/api/ --focus efficiency

# Review specific file
/rd3:dev-review src/config.ts

# Review with auto-fix
/rd3:dev-review src/auth/ --fix all --auto

# Review + fix blockers first
/rd3:dev-review src/auth/ --fix blockers-first

# Delegate heavy review to Codex
/rd3:dev-review src/api/ --channel codex --auto
```

## See Also

- **rd3:code-verification**: Skill implementing SECU analysis, findings management, and verdict logic
- **rd3:dev-fixall**: Systematic lint/type/test fixer (used in fix pass)
- **rd3:run-acp**: Cross-channel delegation
- **rd3:dev-verify**: Task-oriented verification (Phase 7 + Phase 8)

## Platform Notes

| Platform | Skill() | acpx | Recommended |
|----------|---------|------|-------------|
| Claude Code | ✅ | ✅ | `Skill()` |
| pi | ❌ | ✅ | `acpx <agent> exec` |
| Codex/OpenCode | ❌ | ✅ | `acpx <agent> exec` |
| OpenClaw | ❌ | ✅ | `acpx <agent> exec` |

**Dogfood rule**: When reviewing code that includes `rd3:code-verification` or `rd3:run-acp`, use `--channel current` to avoid circular delegation.
