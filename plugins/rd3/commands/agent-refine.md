---
description: Evaluate and fix agent issues in one step
argument-hint: "<agent-path> [description] [--eval] [--best-practices] [--migrate] [--dry-run]"
allowed-tools: ["Read", "Write", "Glob", "Bash", "Skill"]
---

# Agent Refine

Wraps **rd3:cc-agents** skill.

Run evaluation, apply deterministic fixes, then perform LLM quality checklist — all in one step.

## When to Use

- Improve agent quality after scaffolding
- Fix agent issues without running evaluate separately
- Migrate existing rd2 agents to rd3 format

## Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `agent-path` | Path to the agent .md file | (required) |
| `description` | Optional free-text goal to guide LLM refinement | (none) |
| `--eval` | Run evaluation before refinement | false |
| `--best-practices` | Auto-fix TODOs, formatting, best practices | false |
| `--migrate` | Migrate rd2 to rd3 format | false |
| `--output` | Output directory | in-place |
| `--dry-run` | Preview changes without applying | false |
| `--verbose` | Show detailed output | false |

## Examples

```bash
# Refine an agent (evaluate + fix + LLM checklist)
/rd3:agent-refine ./agents/my-agent.md

# Refine with a goal description to guide improvements
/rd3:agent-refine ./agents/expert-foo.md "Thin wrapper delegating to rd3:cc-foo skill"

# Migrate rd2 agent to rd3 format
/rd3:agent-refine ./agents/my-agent.md --migrate
```

## Implementation

**See [Refine Workflow](references/workflows.md#refine-workflow) for full step details.**

This command has THREE phases: script fixes (deterministic) then LLM checklist (fuzzy) then re-evaluate.

### Phase 1: Script Fixes

Pass `$ARGUMENTS` to the underlying skill for processing.

Delegates to **rd3:cc-agents** skill:

```
Skill(skill="rd3:cc-agents", args="refine $ARGUMENTS")
```

**Direct script execution:**
```bash
bun plugins/rd3/skills/cc-agents/scripts/refine.ts $ARGUMENTS
```

### Phase 2: LLM Quality Checklist

After script fixes complete, YOU (the invoking agent) MUST walk through this checklist and fix any failures by editing the agent file directly:

| # | Item | What to Check | Applies To |
|---|------|---------------|------------|
| 1 | Description pattern | Starts with "Use PROACTIVELY" with trigger phrases | specialist, skill-delegating |
| 2 | Trigger phrases | 3+ quoted phrases in description | all |
| 3 | Example blocks | 2+ `<example>` with `<commentary>` in description | standard, specialist |
| 4 | Voice consistency | Imperative voice, no "I can help you" | all |
| 5 | Persona specificity | Domain-specific role, not generic "helpful assistant" | specialist |
| 6 | Competency depth | 20+ items (specialist), 10+ (standard) | standard, specialist |
| 7 | Rules completeness | 8+ DO and 8+ DON'T (specialist), 4+ each (standard) | all except minimal |
| 8 | Verification protocol | Has confidence scoring, red flags | specialist |
| 9 | Output format | Concrete template with success/error examples | standard, specialist |
| 10 | Line budget | Within tier: minimal (20-50), standard (80-200), specialist (200-500) | all |

#### Skill-Delegating Agent Checks

For agents with `skills` in frontmatter (delegates to one or more skills), also verify:

| # | Item | What to Check |
|---|------|---------------|
| 11 | Platform invocation table | All 5 platforms listed (Claude, Gemini, Codex, OpenCode, OpenClaw) |
| 12 | Operation routing table | Maps user phrases to skill operations |
| 13 | Operation argument tables | Documents arguments for each operation |
| 14 | Delegation principle | States "do NOT implement logic directly" |
| 15 | No unnecessary tools | tools should be `[Read, Glob]` unless the agent genuinely needs more |

### Phase 3: Re-evaluate

After applying checklist fixes, re-run evaluation to verify improvement:

```bash
bun plugins/rd3/skills/cc-agents/scripts/evaluate.ts <agent-path> --scope full
```

If score dropped, retry Phase 2 (max 2 retries).

## Platform Notes

- Claude Code: Invoke via `Skill()` delegation
- Other platforms: Run script directly via Bash tool
