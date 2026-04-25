---
description: Task-oriented verification combining Phase 7 SECU review + Phase 8 requirements traceability.
argument-hint: "<task-ref> [--mode <full|review-only|func-only>] [--focus <all|security|efficiency|correctness|usability>] [--fix <none|blockers-first|all>] [--bdd] [--auto] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Verify

Task-oriented verification combining **Phase 7 SECU code review** and **Phase 8 requirements traceability**. This command is a thin wrapper that delegates to the `rd3:code-verification` skill.

## When to Use

**Activate `rd3:dev-verify` for:**
- Task implementation verification against task requirements
- Combined Phase 7 (SECU review) + Phase 8 (requirements traceability)
- Alignment check between task file and source code
- Optional: auto-fix pass after verdict (with `--fix`)
- Findings written back to the original task file

**Activate `rd3:dev-review` instead for:**
- Source-oriented review without a task file
- Review of arbitrary paths or directories
- Optional fix-pass with auto-fix capability

## Usage

```
/rd3:dev-verify <task-ref> [--mode <full|review-only|func-only>] [--focus <all|security|efficiency|correctness|usability>] [--fix <none|blockers-first|all>] [--bdd] [--auto] [--channel <channel>]
```

## Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `task-ref` | **Yes** | — | WBS number or `.md` file path |
| `--mode` | No | `full` | `full` (Phase 7 + 8), `review-only` (Phase 7), `func-only` (Phase 8) |
| `--focus` | No | `all` | SECU dimensions for Phase 7: `all`, `security`, `efficiency`, `correctness`, `usability`, or comma-separated |
| `--fix` | No | `none` | Auto-fix strategy after verdict: `none`, `blockers-first`, `all` |
| `--bdd` | No | `false` | Enable BDD scenario check if feature list exists in task |
| `--auto` | No | `false` | Skip confirmations (for CI/scripting) |
| `--channel` | No | `auto` | Execution channel: `auto`, `current`, or remote agent |

## Delegation

This command delegates all work to the `rd3:code-verification` skill.

```
Skill(skill="rd3:code-verification", args="--mode verify --task-ref $TASK_REF --mode-verify $MODE --focus $FOCUS --fix $FIX --bdd $BDD --auto $AUTO --channel $CHANNEL")
```

### Channel Resolution

| Value | Meaning |
|-------|---------|
| `auto` | `current` for small scope; delegate via `run-acp` for large scope |
| `current` | Execute both phases inline |
| Remote agent | Delegate Phase 7 to that agent; run Phase 8 inline |

## Examples

```bash
# Full verification (Phase 7 + 8, full SECU scan)
/rd3:dev-verify 0274

# Security audit on task scope
/rd3:dev-verify 0274 --mode review-only --focus security

# With auto-fix after verdict (fix blockers + warnings)
/rd3:dev-verify 0274 --fix blockers-first

# Fix all findings after verdict
/rd3:dev-verify 0274 --fix all

# Efficiency review on task scope
/rd3:dev-verify 0274 --mode review-only --focus efficiency

# Requirements traceability only
/rd3:dev-verify 0274 --mode func-only

# With BDD check
/rd3:dev-verify 0274 --bdd

# CI mode
/rd3:dev-verify 0274 --mode full --auto

# Delegate heavy review to Codex
/rd3:dev-verify 0274 --channel codex --auto
```

## See Also

- **rd3:code-verification**: Skill implementing SECU analysis, requirements traceability, findings management, and verdict logic
- **rd3:bdd-workflow**: Optional BDD scenario check (if feature list exists)
- **rd3:run-acp**: Cross-channel delegation
- **rd3:dev-review**: Source-oriented code review (path-based, creates new task)

## Platform Notes

| Platform | Skill() | acpx | Recommended |
|----------|---------|------|-------------|
| Claude Code | ✅ | ✅ | `Skill()` |
| pi | ❌ | ✅ | `acpx <agent> exec` |
| Codex/OpenCode | ❌ | ✅ | `acpx <agent> exec` |
| OpenClaw | ❌ | ✅ | `acpx <agent> exec` |

**Dogfood rule**: When verifying code that includes `rd3:code-verification` or `rd3:run-acp`, use `--channel current` to avoid circular delegation.
