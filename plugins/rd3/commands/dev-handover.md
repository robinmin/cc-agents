---
description: Generate a structured handover document when blocked by an issue. Captures goal, progress, blocker, rejected approaches, and next steps.
argument-hint: "<description> [--task <file.md>]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write", "Skill"]
---

# Dev Handover

Generate a structured handover document when an issue blocks continued work. The next agent can pick up exactly where you left off.

## When to Use

- A blocker prevents further progress
- Need to transfer work to another agent for a fresh perspective
- Debugging attempts have failed and escalation is needed

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `description` | Yes | Brief description of the issue/blocker |
| `--task <file>` | No | Task file path for context extraction |

## Workflow

### Phase 1: Collect Context

1. **Parse arguments** — Extract `description` and optional `--task` path
2. **Auto-detect** (if `--task` provided):
   - Read task file for `Goal` and `Background`
   - Extract `Progress` from task status
   - Detect `Source Code Changes` via git diff
3. **Prompt for missing sections** (interactive):

```
Sections requiring input:
  [1] Goal           — What were you trying to achieve?
  [2] Progress       — What has been completed so far?
  [3] Blocker        — What issue is blocking progress?
  [4] Rejected       — What approaches were tried? Why did they fail?
  [5] Next Steps     — What should the next agent try?
```

### Phase 2: Generate Document

Assemble sections into `docs/handovers/YYYY-MM-DD-handover-<slug>.md`

### Phase 3: Validate

- All mandatory sections populated
- File written successfully
- Display output path to user

## Output Sections

| Section | Mandatory | Auto-Detectable |
|---------|-----------|-----------------|
| **Description** | Yes | No (user-provided) |
| **Goal** | Yes | From task file |
| **Progress** | Yes | From task file + git diff |
| **Source Code Changes** | Yes | From git diff |
| **Blocker** | Yes | User input |
| **Rejected Approaches** | Yes | User input |
| **Next Steps** | Yes | User input |
| **Environment** | No | Auto-detected |
| **Related Files** | No | From git status |

## Examples

```bash
# Basic handover with description
/rd3:dev-handover "TypeScript compilation fails in build step"

# Handover with task file context
/rd3:dev-handover "Auth middleware not propagating context" --task docs/.tasks/0256.md
```

## Output

```
▶ Handover document created:
  docs/handovers/2026-04-17-handover-typescript-compile-fail.md

  Sections: 9 (7 mandatory, 2 optional)
  Next Step: Hand off to another agent with /rd3:dev-transfer or continue debugging
```

## See Also

- **rd3:dev-transfer**: Strategic work reallocation (not issue-driven)
- **rd3:sys-debugging**: Debugging methodology before escalation
- **rd3:tasks**: Task file management
