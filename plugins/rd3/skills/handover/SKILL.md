---
name: handover
description: "Generate structured handover documents for agent-to-agent work transfer when blocked by issues. Captures goal, progress, blocker, rejected approaches, and next steps."
license: Apache-2.0
version: 1.0.0
created_at: 2026-04-17
updated_at: 2026-04-17
platform: rd3
tags: [handover, transfer, context, documentation, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - write-only
  openclaw:
    emoji: "📋"
see_also:
  - rd3:dev-transfer
  - rd3:dev-handover
  - rd3:sys-debugging
  - rd3:tasks
---

# rd3:handover — Structured Handover Document Generator

Generate structured handover documents for agent-to-agent work transfer. Used when an issue blocks continued work and the next agent needs full context to continue.

## When to Use

**Trigger phrases:** "handover", "blocked", "can't continue", "stuck", "transfer work", "escalate", "hand off"

This skill is the inverse of `rd3:dev-transfer`:
- **`handover`** = Reactive: blocked by an issue, need to document context for next agent
- **`dev-transfer`** = Proactive: strategic reallocation (token limits, expertise mismatch, etc.)

## Overview

The handover skill:
1. Collects context from task file and git
2. Prompts user for mandatory sections not auto-detectable
3. Generates a timestamped markdown document
4. Outputs the file path for reference

## Quick Start

```bash
# Basic handover
bun plugins/rd3/skills/handover/scripts/handover.ts "Build fails with TypeScript error"

# With task file context
bun plugins/rd3/skills/handover/scripts/handover.ts "Auth middleware broken" --task docs/.tasks/0256.md
```

## Workflows

### Phase 1: Collect Context
1. Parse `--task` flag → read task file for goal, background
2. Run `git diff --stat` → capture source code changes
3. Run `git status --porcelain` → detect related files

### Phase 2: Prompt for Missing Sections
Interactive prompts for mandatory sections not auto-detected:
- Blocker (what stopped you)
- Rejected Approaches (what was tried, why it failed)
- Next Steps (recommended path forward)

### Phase 3: Generate Document
Assemble sections into timestamped markdown file at `docs/handovers/`

### Phase 4: Validate & Output
- Verify all mandatory sections populated
- Display output path to user

## Input Modes

| Input Pattern | Behavior |
|---------------|----------|
| `--task <file.md>` | Extract goal, progress from task file |
| `--description <text>` | Use as Description section |
| Neither provided | Prompt interactively for all sections |

## Output

**File:** `docs/handovers/YYYY-MM-DD-handover-<slug>.md`

**Sections:**

| Section | Mandatory | Source |
|---------|-----------|--------|
| Description | Yes | User-provided argument |
| Goal | Yes | Task file or user input |
| Progress | Yes | Task file + git diff |
| Source Code Changes | Yes | git diff --stat |
| Blocker | Yes | User input |
| Rejected Approaches | Yes | User input |
| Next Steps | Yes | User input |
| Environment | No | Auto-detected |
| Related Files | No | git status |

## Key Distinction

```
Handover = "I'm stuck, here's the full context"
Transfer = "I'm fine, but someone else should take this"
```

## Platform Notes

### Claude Code (primary)
```bash
Skill(skill="rd3:handover", args="--description 'TypeScript error in build' --task docs/.tasks/0256.md")
```

### Other Platforms
Read the skill file and follow the workflow manually.
