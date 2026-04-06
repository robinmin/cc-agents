---
description: Comprehensive code review for a task scope, optionally on another execution channel
argument-hint: "<task-ref> [--auto] [--channel <auto|current|claude-code|codex|openclaw|opencode|antigravity|pi>]"
allowed-tools: ["Read", "Glob", "Bash", "Edit", "Skill"]
---

# Dev Review

Execute phase 7 (Code Review) of the 9-phase pipeline. Reviews implementation quality for a specific task scope.

**Shortcut for:** `/rd3:dev-run {task-ref} --preset review`

## When to Use

- After implementation is complete
- Reviewing code quality before merging
- Checking for security, performance, or architecture issues

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-ref` | Yes | WBS number or task file path |
| `--auto` | No | Auto-approve gates (no pauses) |
| `--channel <auto\|current\|claude-code\|codex\|openclaw\|opencode\|antigravity\|pi>` | No | Execution channel for Phase 7. Default: `auto` |

### Smart Positional Detection

| Input Pattern | Detection | Example |
|---------------|-----------|---------|
| Digits only | WBS number | `0274` |
| Ends with `.md` | File path (task file) | `docs/tasks/0274_*.md` |

## Workflow

### Step 1: Resolve Task Scope

Pass `task-ref` directly to `orchestrator`; it already accepts a WBS number or task-file path.

If you need the task contents for inline review, do **not** glob `docs/tasks2`. Use the configured task-folder resolver instead:

```bash
if [[ "$TASK_REF" == *.md ]]; then
  sed -n '1,240p' "$TASK_REF"
else
  tasks show "$TASK_REF"
fi
```

Read the task frontmatter or body to determine which files were modified.

### Step 2: Run Code Review

#### Claude Code Invocation

```bash
Skill(skill="rd3:orchestration-v2", args="$TASK_REF --preset review --channel $CHANNEL --auto")
```

#### Non-Claude-Code / CLI Invocation

```bash
orchestrator run "$TASK_REF" \
  --preset review \
  --channel "${CHANNEL:-auto}" \
  --auto \
  2>&1
```

### Step 3: Inline Fallback (If CLI Unavailable)

If neither `Skill()` nor CLI is available, run the review inline:

1. **Read task file** → get modified files from frontmatter or `git diff --name-only`
2. **Run gate**: `bun run check`
3. **Review dimensions**:
   - Security: Search for injection patterns, hardcoded secrets, auth bypass
   - Performance: Check algorithm complexity, N+1 patterns
   - Quality: Readability, DRY violations, missing error handling
   - Architecture: Coupling, circular dependencies, missing abstractions
   - Testing: Coverage gaps, missing edge cases
4. **Report findings** in severity order: blocker → warning → info

### Step 4: Merge with Functional Review (Optional)

If invoked from `/rd3:dev-verify`, coordinate with Phase 8:

- Run Phase 7 and Phase 8 **in parallel** (separate Bash processes or background jobs)
- Wait for both to complete
- Merge into unified verification report

## Review Dimensions

| Dimension | What It Checks |
|-----------|----------------|
| Security | Injection, auth flaws, data exposure, hardcoded secrets |
| Performance | Algorithm complexity, N+1 queries, missing indexes |
| Quality | Readability, maintainability, DRY, error handling |
| Architecture | Coupling, cohesion, patterns, circular deps |
| Testing | Coverage gaps, edge cases, missing assertions |

## Report Format

```text
## Phase 7: Code Review — {task-ref}
**Status:** {passed|<n> findings}
**Channel:** {auto|current|<agent>}

### Findings
| Severity | Title | Location | Recommendation |
|----------|-------|----------|---------------|
| blocker | {title} | {file:line} | {fix} |
| warning | {title} | {file:line} | {fix} |
| info | {title} | {file:line} | {suggestion} |

### Gate Status
- `bun run check`: {pass|fail}
- Coverage: {n}%
```

## Examples

```bash
# Standard review (auto channel, auto-approve)
/rd3:dev-review 0274 --auto

# Review on specific channel
/rd3:dev-review 0274 --channel codex

# Review with file path
/rd3:dev-review docs/tasks/0274_add_dev_slash_commands.md
```

## See Also

- **/rd3:dev-run**: Profile-driven pipeline execution
- **rd3:code-review-common**: Code review skill
- **rd3:run-acp**: ACP executor used by orchestration when a delegated phase runs remotely
- **/rd3:dev-verify**: Run Phase 7 + Phase 8 together

## Platform Notes

| Platform | Skill() | CLI | Recommended Invocation |
|---------|---------|-----|--------------------|
| Claude Code | ✅ | ✅ | `Skill()` |
| pi | ❌ | ✅ | CLI directly |
| Codex | ❌ | ✅ | CLI via `acpx codex exec` |
| OpenCode | ❌ | ✅ | CLI directly |
| OpenClaw | ❌ | ✅ | CLI directly |

**Dogfood rule**: When verifying orchestration or ACP plumbing itself, do not use unsupported `--local` or `--channel local` fallbacks. If delegated execution is the thing being fixed, run Step 3 inline after loading the task through `tasks show <wbs>` (or a direct `.md` path), then validate with `bun run check`.
