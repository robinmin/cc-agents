---
description: Review code on a path across SECU + architecture lenses.
argument-hint: "[<path>] [--focus <dims>] [--depth <level>] [--fix <mode>] [--auto] [--channel <ch>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Review

Review source code on a path across **five peer dimensions**. Set `--focus` to pick any subset.

| Dimension | Surfaces | Skill |
|-----------|----------|-------|
| `security` | Vulnerabilities, unsafe patterns, secrets | `rd3:code-verification` |
| `efficiency` | Performance issues, hot-path costs | `rd3:code-verification` |
| `correctness` | Logic bugs, wrong invariants, edge gaps | `rd3:code-verification` |
| `usability` | API ergonomics, readability, DX friction | `rd3:code-verification` |
| `architecture` | Shallow modules, refactor candidates, deepening | `rd3:code-improvement` |

Run `--focus all` (default) for all five. Comma-separate to mix (e.g. `security,architecture`). Read this command as a thin wrapper; logic lives in the delegated skills.

## When to Use

- Run a quick PR-style review on a path → omit flags
- Run a targeted audit → `--focus security` / `--focus efficiency`
- Find refactor opportunities → `--focus architecture`
- Run a pre-merge sweep → omit flags or `--focus all`

Run `/rd3:dev-verify` instead for task-driven verification (Phase 7 + 8 + BDD).

## Usage

```
/rd3:dev-review [<path>] [--focus <dims>] [--depth <level>] [--fix <mode>] [--auto] [--channel <ch>]
```

Set `<path>` or omit to default to `src/`. Pass the full argument string through as `$ARGUMENTS` to the underlying skill(s).

## Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `<path>` | `src/` | File or directory to review |
| `--focus` | `all` | Subset of `security`, `efficiency`, `correctness`, `usability`, `architecture` (comma-separated), or `all` |
| `--depth` | `survey` | Set `survey` to list architecture candidates; set `deep` to enter grilling loop on top candidate. Applies only when `architecture` is in `--focus`. |
| `--fix` | `none` | Set auto-fix strategy: `none`, `blockers-first`, `all`. Applies only to non-architecture dimensions. |
| `--auto` | off | Skip confirmations and grilling loops |
| `--channel` | `auto` | Set execution channel: `auto`, `current`, or remote agent (`codex`, `openclaw`, ...) |

Ignore flags that do not apply to the active focus set silently. Raise no errors.

## Delegation

Split `--focus` into two skill invocations and run them in order. Run architecture first so its proposals inform the SECU pass.

```
# When --focus contains "architecture":
Skill(skill="rd3:code-improvement", args="$ARGUMENTS")

# When --focus contains any of security|efficiency|correctness|usability|all:
Skill(skill="rd3:code-verification", args="--mode source $ARGUMENTS")
```

Let the skills parse `<path>`, `--focus`, `--depth`, `--fix`, `--auto`, `--channel` from `$ARGUMENTS`. Do not pre-parse in the command.

## Examples

```bash
# Full review on src/auth/ — all five dimensions
/rd3:dev-review src/auth/

# Security audit, fix blockers automatically
/rd3:dev-review src/auth/ --focus security --fix blockers-first

# Architectural deepening with interactive grilling loop
/rd3:dev-review src/auth/ --focus architecture --depth deep

# Mix: security holes plus refactor opportunities
/rd3:dev-review src/auth/ --focus security,architecture

# Pre-merge sweep, fix everything fixable, fully automated
/rd3:dev-review src/auth/ --fix all --auto

# Delegate a heavy review to Codex
/rd3:dev-review src/api/ --channel codex --auto
```

## See Also

- `rd3:code-verification` — SECU analysis, findings, verdict logic
- `rd3:code-improvement` — Architectural deepening, shallow-module detection, ADR drafting
- `rd3:dev-verify` — Task-oriented Phase 7 + Phase 8 verification
- `rd3:dev-fixall` — Drives lint/type/test repair under `--fix`

## Platform Notes

| Platform | `Skill()` | `acpx` | Recommended |
|----------|-----------|--------|-------------|
| Claude Code | ✅ | ✅ | `Skill()` |
| Codex / OpenCode / OpenClaw / pi | ❌ | ✅ | `acpx <agent> exec` |

Read `$ARGUMENTS` as Claude Code-specific. Replace it with direct argument passing under `acpx` on other platforms; the skills consume the same flags either way.

**Dogfood rule**: when reviewing code that includes `rd3:code-verification`, `rd3:code-improvement`, or `rd3:run-acp`, set `--channel current` to avoid circular delegation.
