---
name: add new Agent Skills code-revew-opencode
description: Add opencode as a new supported Agent Skill for Code Review following the same pattern as existing skills
status: Done
created_at: 2026-01-22 14:33:35
updated_at: 2026-01-22 22:05:41
---

## 0052. add new Agent Skills code-revew-opencode

### Background

As we already have the following Agent Skills for code review with different ways.

| Skill Name               | Location                              | Requirement                                                  |
| ------------------------ | ------------------------------------- | ------------------------------------------------------------ |
| `rd2:code-review-auggie` | plugins/rd2/skills/code-review-auggie | docs/prompts/0049_add_new_Agent_Skills_code-revew-auggie.md  |
| `rd2:code-review-claude` | plugins/rd2/skills/code-review-claude | docs/prompts/0050_add_new_Agent_Skills_code-revew-claude.md  |
| `rd2:code-review-gemini` | plugins/rd2/skills/code-review-gemini | docs/prompts/0048_customize_and_enhance_code-revew-gemini.md |

And we also have the following subagent and slash command:

- @plugins/rd2/agents/super-code-reviewer.md
- @plugins/rd2/commands/super-code-reviewer.md

### Requirements / Objectives

Add `opencode` as a new supported Agent Skill for Code Review, following the same pattern as the existing three skills (code-review-gemini, code-review-claude, code-review-auggie).

**Reference:** https://opencode.ai/docs/cli/

### Solutions / Goals

#### Phase 1: Directory Structure Creation
- Create `plugins/rd2/skills/code-review-opencode/` directory
- Create subdirectories: `scripts/`, `tests/`, `assets/`, `references/`

#### Phase 2: Python Script Implementation
Create `plugins/rd2/skills/code-review-opencode/scripts/code-review-opencode.py` with the following commands:

| Command    | Purpose                               |
| ---------- | ------------------------------------- |
| `check`    | Validate OpenCode CLI availability    |
| `run`      | Execute short prompts via OpenCode    |
| `run-file` | Execute long prompts from file        |
| `review`   | Comprehensive code review             |
| `import`   | Convert review results to task files  |

**OpenCode CLI commands to wrap:**
- `opencode run "prompt"` - Non-interactive mode
- `opencode run -f file.txt` - Attach file
- `opencode run --format json` - JSON output
- `opencode models` - List available models
- `opencode auth login` - Configure credentials

#### Phase 3: Unit Tests
Create comprehensive unit tests in `tests/` directory:
- `test_check.py` - Test check command
- `test_run.py` - Test run command
- `test_run_file.py` - Test run-file command
- `test_review.py` - Test review command
- `test_utils.py` - Test utility functions

All tests must pass: `make test-one`

#### Phase 4: SKILL.md Creation
Create `SKILL.md` following best practices (target Grade A) with:
- Quick start examples
- Model selection guide (OpenCode supports multiple providers)
- Workflow documentation
- Focus areas (security, performance, testing, quality, architecture)
- Error handling
- Usage examples

#### Phase 5: Assets and References
- `assets/planning_prompt.md` - Architecture planning template
- `assets/review_prompt.md` - Code review template
- `assets/code-review-result.md` - Structured output template
- `references/opencode-flags.md` - OpenCode CLI flag reference

#### Phase 6: Integration
- Update `plugins/rd2/agents/super-code-reviewer.md` to include `rd2:code-review-opencode` in skills list
- Update tool selection heuristics to include opencode
- Verify compatibility with super-code-reviewer

#### Phase 7: Verification
- Run `make test-one` - All tests must pass
- Run `make lint-one` - Linting must pass
- Invoke `rd2:agent-doctor` to evaluate the skill

### OpenCode CLI Reference

Key commands from https://opencode.ai/docs/cli/:

```bash
# Non-interactive mode
opencode run "Explain how closures work in JavaScript"

# Attach file
opencode run -f file.txt

# JSON output
opencode run --format json "List 5 code smells"

# List models
opencode models [provider]

# Authentication
opencode auth login
```

### References

- [OpenCode CLI Documentation](https://opencode.ai/docs/cli/)
- Existing skills: code-review-gemini, code-review-claude, code-review-auggie
