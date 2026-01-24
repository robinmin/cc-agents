---
description: Unified code generation with auto-selection of gemini/claude/auggie/opencode tools and 17-step implementation workflow
skills:
  - rd2:cc-agents
argument-hint: "<requirements>" | --task <wbs_number_or_path> [--tool auto|gemini|claude|auggie|opencode] [--no-tdd] [--output name]
---

# Code Generate

Unified code generation coordinator that intelligently selects the optimal generation tool (gemini/claude/auggie/opencode) based on task characteristics, or uses explicit tool choice. Supports both **direct requirements** and **task-driven workflow** (via `rd2:tasks`) with complete **17-step implementation process**. Implements super-coder methodology: Correctness > Simplicity > Testability > Maintainability > Performance.

**IMPORTANT** [Q4 FROM TASK 0061]: This handles **CODE GENERATION** (implementation at Step 7), not **CODE REVIEW** (implementation quality at Step 9-10 - handled by `/rd2:code-review` command).

## Quick Start

```bash
# Auto-select best tool (recommended)
/rd2:code-generate "Implement user authentication module"

# Task-driven mode (by WBS#) - TDD enabled by default
/rd2:code-generate --task 0047

# Task-driven mode (by file path) - extracts WBS# from filename
/rd2:code-generate --task docs/prompts/0047_add_auth.md

# Task-driven WITHOUT TDD (explicit opt-out)
/rd2:code-generate --task 0047 --no-tdd

# Specify tool explicitly
/rd2:code-generate --tool gemini "Design microservices event bus"
/rd2:code-generate --tool claude "Create simple utility function"
/rd2:code-generate --tool auggie "Add feature matching existing patterns"
/rd2:code-generate --tool opencode "Implement with external AI perspective"
```

## Arguments

| Argument        | Required | Description                                                                                              |
| --------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| `requirements`  | No*      | What to generate (description of feature/code) — required if `--task` not specified                      |
| `--task`        | No*      | WBS# (e.g., `0047`) OR task file path — reads from `docs/prompts/` or direct path                            |
| `--tool`        | No       | Tool: `auto` (default), `gemini`, `claude`, `auggie`, `opencode`                                         |
| `--no-tdd`      | No       | Disable TDD mode (opt-out from task-driven default; TDD only available in task-driven mode)             |
| `--output`      | No       | Custom output file name                                                                                  |
| `--context`     | No       | Path to additional context file                                                                          |

*Either `requirements` or `--task` must be specified, but not both.

**Mode Defaults:**
- **Task-driven mode** (`--task`): TDD enabled by default; use `--no-tdd` to disable
- **Direct requirements**: Standard mode only (TDD not available - use task-driven mode for TDD)

## Tool Selection (Auto Mode)

When `--tool auto` or not specified:

| Characteristics          | Tool           | Best For                      | Speed    | Setup       |
| ------------------------ | -------------- | ----------------------------- | -------- | ----------- |
| Simple function/class    | `claude`       | Quick implementations         | Fast     | None        |
| Multi-file feature       | `gemini`       | Complex architecture          | Moderate | CLI install |
| Codebase context needed  | `auggie`       | Pattern-matching generation   | Fast     | MCP server  |
| Security-sensitive       | `gemini` (pro) | Thorough security analysis    | Moderate | CLI install |
| External perspective     | `opencode`     | Multi-model comparison        | Variable | CLI + auth  |

## Workflow

This command delegates to the **super-coder agent** which implements the complete 17-step implementation workflow. The command handles:
- Argument parsing and validation
- Agent invocation with appropriate parameters
- Result presentation to user

**For detailed workflow documentation**, see: `plugins/rd2/agents/super-coder.md`

## 17-Step Implementation Workflow

When `--task <wbs_number_or_path>` is specified, super-coder follows:

### Understand & Clarify (Steps 1-6)
1. Read Task File (WBS#, Background, Requirements, Solutions, References)
2. Understand Context (Background section)
3. Parse Requirements (extract objectives)
4. Clarify Ambiguities (ask user if needed)
5. Document Q&A (add to task file)
6. Research Existing Code (for enhancements)

### Design & Plan (Steps 7-10)
7. Design Solution (technical approach)
8. Update Solutions Section (write design)
9. Create Implementation Plan (add Plan subsection)
10. Add References (documentation, patterns)

### Status Transition (Step 11)
11. Mark Task as WIP (update frontmatter)

### Execute & Verify (Steps 12-17)
12. Select Code Generation (delegate to appropriate coder skill)
13. Apply TDD Workflow (use `rd2:tdd-workflow`)
14. Implement Code (write implementation)
15. Generate Tests (create unit tests)
16. Debug Issues (use `rd2:sys-debugging` if needed)
17. Verify Completion (ensure tests pass)

## Examples

### Task-Driven Workflow (TDD by Default)

```bash
# Task-driven with auto-selected tool (TDD enabled by default)
/rd2:code-generate --task 0047

# Task-driven with auto-selected tool (by file path, TDD enabled)
/rd2:code-generate --task docs/prompts/0047_add_auth.md

# Task-driven WITHOUT TDD (explicit opt-out)
/rd2:code-generate --task 0047 --no-tdd

# Task-driven with explicit tool
/rd2:code-generate --task 0047 --tool gemini
```

### Direct Requirements Workflow (Standard Mode)

```bash
# User authentication (auto-selects based on complexity)
/rd2:code-generate "Implement user authentication with JWT tokens"

# Quick utility (auto-selects claude for speed)
/rd2:code-generate "Create a function to parse and validate ISO 8601 dates"

# Architecture design (explicit gemini for complexity)
/rd2:code-generate --tool gemini "Design a microservices event bus"

# Codebase-aware (auggie for existing patterns)
/rd2:code-generate --tool auggie "Add password reset feature matching existing patterns"
```

## Output Format

Results saved to `.claude/plans/[name].md` with YAML frontmatter:

**Task-driven mode (`--task`):**
```yaml
---
type: {tool}-code-generation
wbs_number: {WBS#}
task_name: {task_name}
model: {model_name}
requirements: {extracted_from_task}
mode: {standard|tdd}
methodology: super-coder
workflow: 17-step implementation process
---
```

**Direct requirements mode:**
```yaml
---
type: {tool}-code-generation
model: {model_name}
requirements: {requirements}
mode: {standard|tdd}
methodology: super-coder
---
```

## Error Handling

| Error                     | Resolution                                             |
| ------------------------ | ---------------------------------------------------- |
| Task file not found       | Check WBS#, verify file exists in `docs/prompts/`        |
| Task file malformed       | Show expected format, ask to fix                         |
| Invalid WBS# format         | WBS# must be 4 digits (e.g., 0047, 0152)                |
| Tool unavailable          | Suggests alternative, offers to switch                    |
| Requirements unclear        | Asks for clarification                                 |
| Invalid option             | Displays valid options with examples                    |
| Both task and requirements | Ask to use one or the other                             |

## Design Philosophy

**Fat Skills, Thin Wrappers** - This command is a thin wrapper (~50 lines); all generation logic, methodology, workflows, and competencies live in the **super-coder agent** (`plugins/rd2/agents/super-coder.md`). This ensures:
- Single source of truth for implementation logic
- Easy maintenance (update agent, not command)
- Consistent behavior across all entry points

**Super-Coder Methodology** - The agent enforces: Correctness > Simplicity > Testability > Maintainability > Performance

## See Also

- **super-coder agent**: `/Users/robin/projects/cc-agents/plugins/rd2/agents/super-coder.md` - Complete implementation logic
- `rd2:coder-gemini` - Gemini-based code generation (skill)
- `rd2:coder-claude` - Claude native code generation (skill)
- `rd2:coder-auggie` - Auggie semantic code generation (skill)
- `rd2:coder-opencode` - OpenCode multi-model code generation (skill)
- `/rd2:code-review` - Code review command (Step 9-10)
- `rd2:tdd-workflow` - Test-driven development workflow
- `rd2:sys-debugging` - Systematic debugging for test failures
