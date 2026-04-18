---
name: transfer
description: "Generate structured transfer documents for strategic work reallocation without blockers. Used for token limits, expertise mismatch, capacity, or timezone changes."
license: Apache-2.0
version: 1.0.0
created_at: 2026-04-17
updated_at: 2026-04-17
platform: rd3
tags: [transfer, handover, context, documentation, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - write-only
  openclaw:
    emoji: "🔄"
see_also:
  - rd3:dev-handover
  - rd3:dev-transfer
  - rd3:handover
  - rd3:tasks
---

# rd3:transfer — Strategic Work Transfer Document Generator

Generate structured transfer documents for strategic work reallocation without blockers. Used when the work is going well but needs to move to a different agent.

## When to Use

**Trigger phrases:** "transfer", "token limit", "handoff", "capacity", "expertise", "timezone"

This skill is the inverse of `rd3:handover`:
- **`handover`** = Reactive: blocked by an issue, need to document context for next agent
- **`transfer`** = Proactive: strategic reallocation (token limits, expertise mismatch, etc.)

## Overview

The transfer skill:
1. Collects context from task file and git
2. Prompts user for mandatory sections not auto-detectable
3. Generates a timestamped markdown document
4. Outputs the file path for reference

## Quick Start

```bash
# Basic transfer
bun plugins/rd3/skills/transfer/scripts/transfer.ts "Token limit reached, continue auth module"

# With task file context
bun plugins/rd3/skills/transfer/scripts/transfer.ts "Expertise mismatch for Go migration" --task docs/.tasks/0256.md
```

## Workflows

### Phase 1: Collect Context
1. Parse `--task` flag → read task file for goal, background
2. Run `git diff --stat` → capture source code changes
3. Run `git status --porcelain` → detect related files

### Phase 2: Prompt for Missing Sections
Interactive prompts for mandatory sections not auto-detected:
- Reason (why transfer: token_limit, expertise_mismatch, capacity, timezone, other)
- Recommendation (why the next agent should take this)

### Phase 3: Generate Document
Assemble sections into timestamped markdown file at `docs/handovers/`

### Phase 4: Validate & Output
- Verify all mandatory sections populated
- Display output path to user

## Transfer Reasons

| Reason | When to Use |
|--------|-------------|
| `token_limit` | Approaching token limit, need fresh context |
| `expertise_mismatch` | Different agent has better context/skills |
| `capacity` | Different priority work emerged |
| `timezone` | Availability changed |
| `other` | Any other reason |

## Input Modes

| Input Pattern | Behavior |
|---------------|----------|
| `--task <file.md>` | Extract goal, progress from task file |
| `--description <text>` | Use as Description section |
| Neither provided | Prompt interactively for all sections |

## Output

**File:** `docs/handovers/YYYY-MM-DD-transfer-<slug>.md`

**Sections:**

| Section | Mandatory | Source |
|---------|-----------|--------|
| Description | Yes | User-provided argument |
| Goal | Yes | Task file or user input |
| Progress | Yes | Task file + git diff |
| Source Code Changes | Yes | git diff --stat |
| Reason | Yes | User input |
| Recommendation | Yes | User input |
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
Skill(skill="rd3:transfer", args="--description 'Token limit reached, continue migration' --task docs/.tasks/0256.md")
```

### Other Platforms
Read the skill file and follow the workflow manually.
