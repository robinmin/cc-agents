---
name: create super-coder ecosystem
description: Create a multi-tool coding ecosystem (gemini/claude/auggie/opencode) following the super-code-reviewer pattern with unified coordinator
status: Done
created_at: 2026-01-22 22:24:22
updated_at: 2026-01-24 09:29:50
---

## 0059. create super-coder ecosystem

### Background

The `super-code-reviewer` ecosystem demonstrates a successful pattern for multi-tool orchestration:

**Existing super-code-reviewer ecosystem (in `plugins/rd2/`):**
- 4 Agent Skills: `code-review-gemini`, `code-review-claude`, `code-review-auggie`, `code-review-opencode`
- 1 Subagent: `super-code-reviewer.md` (unified coordinator with auto-selection)
- 1 Slash Command: `super-code-reviewer.md` (user interface)

**Existing super-coder (in `plugins/rd/skills/super-coder/`):**
- Methodology skill (178 lines) focused on software engineering principles
- Decision priority, working loop, change rules, verification guardrails
- Not a multi-tool ecosystem - just a methodology reference

**Gap:** No multi-tool code generation ecosystem exists. Users must manually choose which AI tool to use for code generation tasks.

### Requirements / Objectives

Create a `super-coder` ecosystem in `plugins/rd2/` that mirrors the `super-code-reviewer` pattern:

#### 1. Four Agent Skills (Fat Skills)

| Skill | AI Backend | Best For |
|-------|------------|----------|
| `coder-gemini` | Google Gemini API | Complex multi-file generation, architecture |
| `coder-claude` | Claude native | Quick implementations, no external setup |
| `coder-auggie` | Auggie MCP | Codebase-aware generation with semantic context |
| `coder-opencode` | OpenCode CLI | Multi-model access, external AI perspective |

Each skill must:
- Follow `rd2:cc-skills` best practices
- Have SKILL.md, scripts/, assets/, tests/, references/
- Implement the existing `super-coder` methodology principles
- Support common options: `--tdd`, `--focus`, `--output`
- Generate code-generation-result.md output files

#### 2. One Subagent (Thin Wrapper)

`super-coder.md` agent that:
- Follows 8-section anatomy (`rd2:cc-agents`)
- Implements "Fat Skills, Thin Wrappers" principle
- Auto-selects optimal tool based on task characteristics
- Delegates to `rd2:coder-*` skills
- Respects explicit `--tool` choice

**Auto-Selection Heuristics:**

| Task Characteristic | Recommended Tool | Rationale |
|---------------------|------------------|-----------|
| Simple function/class | claude | Fast, no setup |
| Multi-file feature | gemini | Handles complexity |
| Needs codebase context | auggie | Semantic indexing |
| Security-sensitive | gemini (pro) | Thorough analysis |
| External perspective | opencode | Multi-model access |

#### 3. One Slash Command

`/rd2:super-coder` command that:
- Provides unified interface to all coder skills
- Supports `--tool`, `--tdd`, `--focus`, `--output` options
- Documents auto-selection logic
- Shows examples and error handling

#### 4. Methodology Integration

All skills must embed the existing `super-coder` methodology:
- Decision Priority: Correctness → Simplicity → Testability → Maintainability → Performance
- Working Loop: Clarify → Map impact → Plan minimal diff → Implement → Validate → Refactor → Report
- Two Hats Rule: Never add features and refactor simultaneously
- Verification Guardrail: Tests required for logic changes

### Solutions / Goals

#### Phase 1: Create Agent Skills (4 skills)

1. **coder-gemini** - Gemini API integration for code generation
   - SKILL.md with comprehensive documentation
   - Python script with Gemini API calls
   - TDD mode support
   - Tests with 90%+ coverage

2. **coder-claude** - Claude native code generation
   - SKILL.md with methodology integration
   - Python script leveraging Claude's capabilities
   - No external API required
   - Tests with 90%+ coverage

3. **coder-auggie** - Auggie MCP semantic code generation
   - SKILL.md with codebase-aware documentation
   - Python script using Auggie context engine
   - Semantic understanding of existing code
   - Tests with 90%+ coverage

4. **coder-opencode** - OpenCode CLI multi-model generation
   - SKILL.md with multi-model guidance
   - Python script wrapping OpenCode CLI
   - Model selection recommendations
   - Tests with 90%+ coverage

#### Phase 2: Create Subagent

5. **super-coder agent** (`plugins/rd2/agents/super-coder.md`)
   - 8-section anatomy compliance
   - Tool selection heuristics
   - Delegation patterns
   - Fallback protocols

#### Phase 3: Create Slash Command

6. **super-coder command** (`plugins/rd2/commands/super-coder.md`)
   - Argument parsing
   - Quick start examples
   - Error handling documentation
   - See Also references

#### Phase 4: Cross-Component Validation

7. **Consistency checks**
   - All skills reference each other in Related Skills
   - All skills have code-generation-result.md template
   - All tests pass
   - Agent references all skills
   - Command documents all skills

### Deliverables

```
plugins/rd2/
├── skills/
│   ├── coder-gemini/
│   │   ├── SKILL.md
│   │   ├── scripts/coder-gemini.py
│   │   ├── assets/code-generation-result.md
│   │   ├── tests/
│   │   └── references/
│   ├── coder-claude/
│   │   ├── SKILL.md
│   │   ├── scripts/coder-claude.py
│   │   ├── assets/code-generation-result.md
│   │   ├── tests/
│   │   └── references/
│   ├── coder-auggie/
│   │   ├── SKILL.md
│   │   ├── scripts/coder-auggie.py
│   │   ├── assets/code-generation-result.md
│   │   ├── tests/
│   │   └── references/
│   └── coder-opencode/
│       ├── SKILL.md
│       ├── scripts/coder-opencode.py
│       ├── assets/code-generation-result.md
│       ├── tests/
│       └── references/
├── agents/
│   └── super-coder.md
└── commands/
    └── super-coder.md
```

### Success Criteria

- [ ] All 4 coder skills pass `rd2:skill-doctor` validation
- [ ] super-coder agent passes `rd2:agent-doctor` validation
- [ ] All tests pass (90%+ coverage per skill)
- [ ] Auto-selection works correctly for different task types
- [ ] Methodology principles embedded in all skills
- [ ] Cross-component references complete
- [ ] `/rd2:super-coder` command functional

### References

**Pattern Sources:**
- @plugins/rd2/skills/code-review-gemini (reference implementation)
- @plugins/rd2/skills/code-review-claude (reference implementation)
- @plugins/rd2/skills/code-review-auggie (reference implementation)
- @plugins/rd2/skills/code-review-opencode (reference implementation)
- @plugins/rd2/agents/super-code-reviewer.md (agent pattern)
- @plugins/rd2/commands/super-code-reviewer.md (command pattern)

**Methodology Source:**
- @plugins/rd/skills/super-coder/SKILL.md (principles to embed)
- @plugins/rd/skills/super-coder/REFERENCE.md (detailed rationale)

**Guidelines:**
- @plugins/rd2/skills/cc-skills (skill creation guidelines)
- @plugins/rd2/skills/cc-agents (agent creation guidelines)
