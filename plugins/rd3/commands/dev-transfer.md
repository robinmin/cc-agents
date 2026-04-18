---
description: Generate a structured transfer document for strategic work reallocation. Used when handing off work without a blocker (token limits, expertise mismatch, capacity, etc.).
argument-hint: "<description> [--task <file.md>]"
allowed-tools: ["Read", "Glob", "Grep", "Bash", "Edit", "Write", "Skill"]
---

# Dev Transfer

Generate a structured transfer document for strategic work reallocation. Used when handing off work without a blocker — the work is going well, but a different agent should take over.

## When to Use

- Token limit approaching, need to continue work in new session
- Expertise mismatch — another agent has better context
- Capacity planning — different priority work emerged
- Timezone or availability changes

**Not for:** Issue-driven handover (use `rd3:dev-handover` instead)

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `description` | Yes | Brief summary of work being transferred |
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
  [1] Goal           — What are you working on?
  [2] Progress       — What has been completed?
  [3] Reason         — Why transfer? (token_limit, expertise_mismatch, capacity, timezone, other)
  [4] Recommendation — Why should the next agent take this?
```

### Phase 2: Generate Document

Assemble sections into `docs/handovers/YYYY-MM-DD-transfer-<slug>.md`

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
| **Reason** | Yes | User input |
| **Recommendation** | Yes | User input |
| **Environment** | No | Auto-detected |
| **Related Files** | No | From git status |

## Transfer Reasons

| Reason | When to Use |
|--------|-------------|
| `token_limit` | Approaching token limit, need fresh context |
| `expertise_mismatch` | Different agent has better context/skills |
| `capacity` | Different priority work emerged |
| `timezone` | Availability changed |
| `other` | Any other reason |

## Examples

```bash
# Basic transfer with description
/rd3:dev-transfer "Continue implementing auth module refactor"

# Transfer with task file context
/rd3:dev-transfer "Token limit reached, continue TypeScript migration" --task docs/.tasks/0256.md
```

## Output

```
▶ Transfer document created:
  docs/handovers/2026-04-17-transfer-auth-module-refactor.md

  Sections: 8 (6 mandatory, 2 optional)
  Next Step: Hand off to another agent with the generated document
```

## See Also

- **rd3:dev-handover**: Issue-driven handover (blocked by problem)
- **rd3:tasks**: Task file management
