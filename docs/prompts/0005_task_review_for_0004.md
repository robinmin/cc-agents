---
name: task review for 0004
description: Comprehensive review and enhancement of expert agent implementation from 0004, focusing on token efficiency, script alignment with `tasks` tool, and industry best practices
status: Done
current_phase: 6
verify_cmd:
impl_progress:
  phase_1: completed
  phase_2: completed
  phase_3: completed
  phase_4: completed
  phase_5: completed
  phase_6: completed
created_at: 2026-01-12 16:08:40
updated_at: 2026-01-12 16:45:46
---

## 0005. task review for 0004

### Background

As the 0004 tasks caused lots of changes, we need to review and enhance the implementation based on the original papers and the industry best practices ans SOTA techniques:

### Requirements / Objectives

According to the requests defined in @docs/prompts/0004_expert_based_agent_architecture.md, we need to have a comprehensive review on the following implementation based on the original papers and the industry best practices ans SOTA techniques:

#### Config Files

- @docs/prompts/0004/global_CLAUDE.md: The global CLAUDE.md
- @docs/prompts/0004/global_settings.json: The global settings.json

#### Subagents

For the following subagents, we need to evaluate whether we need to simplify and optimize them for better token efficiency:

- @plugins/rd/agnts/agent-expert.md
- @plugins/rd/agnts/agent-doctor.md
- @plugins/rd/agnts/mcp-expert.md
- @plugins/rd/agnts/python-expert.md
- @plugins/rd/agnts/task-decomposition-expert.md: we majorly use `tasks` (which defined in @plugins/rd/scripts/tasks.sh to do task management), so we need enhance this subagent to improve token efficiency, and align with us to use the same `tasks` tool to manage tasks.
- @plugins/rd/agnts/typescript-expert.md

#### Scripts

For the following scripts, some of them already implemented, we need to review and enhance them if needed. Some of them are just placeholders now, we need to implement them first.

- @plugins/rd/scripts/install.sh: need to be reviewed and enhanced.
- @plugins/rd/scripts/session-init.sh: need to be reviewed and enhanced.
- @plugins/rd/scripts/validate-bash.sh: need to align with @docs/prompts/0004/global_settings.json file, then we need to review and enhance it.
- @plugins/rd/scripts/validate-write.sh: need to be reviewed and enhanced.

#### Agent Skills

For the following skills files, some of them already implemented, we need to review and enhance them if needed. Some of them are just placeholders now, we need to implement them first.

- @plugins/rd/skills/anti-hallucination/SKILL.md: need to be reviewed and enhanced.
- @plugins/rd/skills/code-patterns/SKILL.md: Partial implementation, need to be reviewed and enhanced.
  For example, TODO: [... continues with Docker, CI/CD, database patterns ...] and their relevant files:
  - @plugins/rd/skills/code-patterns/api-patterns.md
  - @plugins/rd/skills/code-patterns/database-patterns.md
  - @plugins/rd/skills/code-patterns/docker-patterns.md
  - @plugins/rd/skills/code-patterns/other-patterns.md

### User Decisions (via interview)

- **Review Depth**: Comprehensive - Full review with detailed improvements and implementation
- **Tasks Alignment**: Full Integration - Reference all tasks commands in task-decomposition-expert
- **Hook Approach**: Performance Priority - Bash script preferred to avoid LLM round-trips
- **Verification**: Skip - Manual review of outputs

### Solutions / Goals

#### Architecture Overview

This review task focuses on enhancing the 0004 implementation across six areas:

1. **Config Files** - Global CLAUDE.md and settings.json optimization
2. **Subagents** - Token efficiency optimization (target: 400-600 lines)
3. **Scripts** - Alignment with permissions system and `tasks` tool
4. **Skills** - Complete placeholder implementations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REVIEW SCOPE                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CONFIG FILES                                                               │
│  ├── global_CLAUDE.md (298 lines) ✓ Well-structured                        │
│  └── global_settings.json (254 lines) → Needs permission expansion         │
│                                                                             │
│  SUBAGENTS (Target: 400-600 lines each)                                    │
│  ├── agent-expert.md (709 lines) → OVER LIMIT, needs condensing            │
│  ├── agent-doctor.md (410 lines) ✓ Within range                            │
│  ├── mcp-expert.md (416 lines) ✓ Within range                              │
│  ├── python-expert.md (460 lines) ✓ Within range                           │
│  ├── typescript-expert.md (454 lines) ✓ Within range                       │
│  └── task-decomposition-expert.md (418 lines) → Needs tasks tool alignment │
│                                                                             │
│  SCRIPTS                                                                    │
│  ├── install.sh (507 lines) ✓ Comprehensive                                │
│  ├── session-init.sh (34 lines) → Needs enhancement                        │
│  ├── validate-bash.sh (47 lines) → Needs permission alignment              │
│  └── validate-write.sh (44 lines) ✓ Adequate                               │
│                                                                             │
│  SKILLS                                                                     │
│  ├── anti-hallucination/SKILL.md (34 lines) → Needs expansion              │
│  └── code-patterns/ → All placeholder files empty                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Findings

##### 1. Config Files Analysis

**global_CLAUDE.md** - Good structure, minor improvements:
- Tool priority is well-defined
- Agent routing keywords are clear
- Anti-hallucination protocol is comprehensive
- Minor: Consider adding more specific examples

**global_settings.json** - Needs significant enhancement:
- **Permissions.allow**: Git read operations covered ✓
- **Permissions.ask**: Git write operations covered ✓
- **Permissions.deny**: Missing `gh` handling (currently denies all `gh *`)
- **PostToolUse hooks**: Good coverage for JS/TS/Python/Go/Rust/Markdown/YAML/SQL/HTML/CSS/TOML/Dockerfile/Shell
- **PreToolUse hooks**: Uses bash scripts which aligns with performance priority
- **Issue**: `gh` (GitHub CLI) is blanket-denied but should have read/write separation

##### 2. Subagents Analysis

| Agent | Lines | Status | Issue |
|-------|-------|--------|-------|
| agent-expert.md | 709 | OVER | Exceeds 400-600 limit by 109 lines |
| agent-doctor.md | 410 | OK | Within range |
| mcp-expert.md | 416 | OK | Within range |
| python-expert.md | 460 | OK | Within range |
| typescript-expert.md | 454 | OK | Within range |
| task-decomposition-expert.md | 418 | OK | Missing `tasks` tool integration |

**agent-expert.md optimization targets**:
- Section 5 (Competency Lists) is ~250 lines - can condense tables
- Section templates have redundant examples - consolidate
- Remove some boilerplate comments

**task-decomposition-expert.md enhancement**:
- Add `tasks` tool to competency lists
- Reference all commands: init, create, list, update, refresh, open
- Add task WBS numbering patterns

##### 3. Scripts Analysis

**install.sh** - Well-implemented ✓
- Covers all PostToolUse tool requirements
- Proper OS detection (Darwin/Linux)
- Modular installation functions
- Good error handling

**session-init.sh** - Needs enhancement:
- Currently only exports PROJECT_ROOT
- Could initialize tools availability check
- Could set up session-specific aliases

**validate-bash.sh** - Needs permission alignment:
- Current: Only checks dangerous patterns
- Missing: Integration with permissions.allow/ask/deny from settings.json
- Should read permissions from settings file dynamically

**validate-write.sh** - Adequate ✓
- Blocks protected paths
- Warns on config file modifications

##### 4. Skills Analysis

**anti-hallucination/SKILL.md** - Too brief:
- Only 34 lines
- Missing: Confidence scoring integration
- Missing: Source citation templates
- Missing: Red flag detection workflow

**code-patterns/** - All placeholder files are empty:
- api-patterns.md (empty)
- testing-patterns.md (empty)
- docker-patterns.md (empty)
- database-patterns.md (empty)
- other-patterns.md (referenced but doesn't exist)

##### 5. Hook Approach Analysis (Bash vs Prompt)

**Bash Script Approach (Current + Enhanced)**:

| Pros | Cons |
|------|------|
| Fast execution (~10ms) | Limited context awareness |
| Deterministic results | Cannot reason about intent |
| No LLM API costs | Pattern-based only |
| Works offline | Updates require code changes |
| Predictable behavior | Cannot handle edge cases |

**Prompt-Based Approach**:

| Pros | Cons |
|------|------|
| Context-aware decisions | Latency (~1-3s per check) |
| Can reason about intent | LLM API costs |
| Handles edge cases | Non-deterministic |
| Natural language rules | Requires LLM availability |
| Self-documenting | May hallucinate decisions |

**Recommendation**: Use bash scripts (per user preference) with these enhancements:
1. Read permissions from global_settings.json dynamically
2. Add pattern matching for common dangerous operations
3. Exit codes: 0=allow, 1=warn, 2=deny (already implemented)

#### Implementation Plan

##### Phase 1: Config File Enhancement [Complexity: Medium]

**Goal**: Optimize global_settings.json permissions and fix gh CLI handling

**Status**: completed

- [x] Fix `gh` permissions - add read operations to allow, write to ask
- [x] Add additional dangerous command patterns to deny
- [x] Add common risky operations (curl piped to sh, wget to sh)
- [x] Verify JSON schema compliance
- [x] Update global_CLAUDE.md with any missing best practices

**Deliverable**: Updated config files with comprehensive permissions
**Dependencies**: None

---

##### Phase 2: Subagent Token Optimization [Complexity: High]

**Goal**: Reduce agent-expert.md to 400-600 lines, align task-decomposition-expert with tasks tool

**Status**: completed

- [x] Condense agent-expert.md competency list tables
- [x] Remove redundant template examples in agent-expert.md
- [x] Consolidate boilerplate content in agent-expert.md
- [x] Target: reduce from 709 to 423 lines ✓
- [x] Add tasks tool commands to task-decomposition-expert.md
- [x] Add WBS numbering pattern to task-decomposition-expert.md
- [x] Verify all agents stay within 400-600 line range (418→475 lines)

**Deliverable**: Optimized subagent files within line limits
**Dependencies**: None

---

##### Phase 3: Script Enhancement [Complexity: Medium]

**Goal**: Align validate-bash.sh with permissions, enhance session-init.sh

**Status**: completed

- [x] Enhance validate-bash.sh with DENY and ASK pattern arrays
- [x] Add permission pattern matching to validate-bash.sh
- [x] Enhance session-init.sh with tool availability check
- [x] Add helpful environment variables to session-init.sh
- [x] Scripts follow bash best practices (shellcheck not installed)

**Deliverable**: Enhanced scripts aligned with permission system
**Dependencies**: Phase 1 (settings.json must be finalized first)

---

##### Phase 4: Anti-Hallucination Skill Enhancement [Complexity: Medium]

**Goal**: Expand anti-hallucination skill with comprehensive verification workflow

**Status**: completed

- [x] Expand SKILL.md to include confidence scoring workflow
- [x] Add source citation templates
- [x] Add red flag detection decision tree
- [x] Add verification tool priority (ref → WebSearch → local)
- [x] Include example verification scenarios

**Deliverable**: Comprehensive anti-hallucination skill
**Dependencies**: None

---

##### Phase 5: Code Patterns Implementation [Complexity: High]

**Goal**: Implement all placeholder code pattern files

**Status**: completed

- [x] Implement api-patterns.md (REST, GraphQL, error handling, pagination)
- [x] Implement testing-patterns.md (unit, integration, E2E, mocking)
- [x] Implement docker-patterns.md (multi-stage, security, compose)
- [x] Implement database-patterns.md (migrations, queries, ORM)
- [x] other-patterns.md not needed (covered in existing files)
- [x] Update SKILL.md index

**Deliverable**: Complete code patterns skill library
**Dependencies**: None

---

##### Phase 6: Integration Verification [Complexity: Low]

**Goal**: Verify all components work together

**Status**: completed

- [x] Verify agent files are within line limits (423, 410, 416, 460, 454, 475 lines)
- [x] validate-bash.sh enhanced with DENY/ASK patterns (194 lines)
- [x] JSON settings validated as correct
- [x] tasks tool integration added to task-decomposition-expert
- [x] Removed backup file (agent-expert copy.md)

**Deliverable**: Verified, integrated expert agent system
**Dependencies**: Phases 1-5

### References

- [0004 Original Task](docs/prompts/0004_expert_based_agent_architecture.md)
- [Claude Code Settings Schema](https://json.schemastore.org/claude-code-settings.json)
- [Claude Code Hooks Documentation](https://github.com/anthropics/claude-code/blob/main/docs/hooks.md)
