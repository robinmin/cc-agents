---
name: add new Agent Skills code-revew-claude
description: <prompt description>
status: Done
created_at: 2026-01-22 13:51:33
updated_at: 2026-01-22 16:45:00
---

## 0050. add new Agent Skills code-revew-claude

### Background

As we already implemented the Agent Skills `plugins/rd2/skills/code-review-gemini` and `plugins/rd2/skills/code-review-auggie`, we need to use Claude Code itself to implement the Agent Skills `plugins/rd2/skills/code-review-claude` as provide the same or almost similar functionality with the same inputs/outputs.

### Requirements / Objectives

#### Add script `plugins/rd2/skills/code-review-claude/scripts/code-review-claude.py`

As we will provide the same output as the other two skills, we need to implement a script that takes in the same inputs and produces the same outputs. It's hard to implement this via pure prompts, so we need to implement it via a script. Meanwhile, use subprocess or some kind of spawning mechanism to execute code review can help to keep main thread safe and avoid got confusing the main thread by the details or its hallucination of the code review process.

The script needs to:

1. Accept the same inputs as the other two skills.
2. Produce the same outputs as the other two skills.
3. Use subprocess or some kind of spawning mechanism to execute code review.
4. Keep the main thread safe and avoid confusion by the details or hallucination of the code review process.

You also need to add comprehensive code review for this script in ``, and make sure both `make lint`and`make test` all pass.

#### Fine tune the skill in `plugins/rd2/skills/code-review-claude/SKILL.md`

Base on these two skills and the script we prepared, we need to fine tune the skill in `plugins/rd2/skills/code-review-claude/SKILL.md` to make sure it can provide the same or almost similar functionality with the same inputs/outputs.

#### Add additional files for `plugins/rd2/skills/code-review-claude/references` and `plugins/rd2/skills/code-review-claude/assets`

### Next Steps for Your reference

In next step, we will define a unique slash command and subagent to use all these 3 skills together with automatic skill selection logic or user specified skill selection logic.

This is out-of-scope information. But I put it here, so that you can decide how to implement thi skill.

### Solutions / Goals

#### Implementation Summary

Successfully implemented the code-review-claude skill with the following components:

1. **Python Script**: `plugins/rd2/skills/code-review-claude/scripts/code-review-claude.py`
   - 5 commands: check, run, run-file, review, import
   - Uses subprocess to spawn isolated Claude Code process for review execution
   - Same CLI arguments/flags as other code-review skills
   - Same structured output format

2. **Tests**: `plugins/rd2/skills/code-review-claude/tests/`
   - `conftest.py` - Pytest fixtures
   - `test_check.py` - Tests for check command (9 tests)
   - `test_run.py` - Tests for run command (6 tests)
   - `test_run_file.py` - Tests for run-file command (6 tests)
   - `test_template.py` - Tests for template formatting (11 tests)
   - `test_review.py` - Tests for review command (7 tests)
   - `test_import.py` - Tests for import command (11 tests)
   - `test_utils.py` - Tests for utility functions (8 tests)
   - Total: **76 comprehensive unit tests - ALL PASSING**

3. **Assets**: `plugins/rd2/skills/code-review-claude/assets/`
   - `code-review-result.md` - Structured output template
   - `review_prompt.md` - Code review prompt template
   - `planning_prompt.md` - Architecture planning template

4. **Updated SKILL.md**: Reflects script functionality with:
   - Quick start examples
   - Available commands table
   - Workflow steps
   - Focus areas reference
   - Error handling guide
   - Tool comparison table
   - Best practices section

#### File Structure

```
plugins/rd2/skills/code-review-claude/
├── SKILL.md
├── assets/
│   ├── code-review-result.md
│   ├── planning_prompt.md
│   └── review_prompt.md
├── scripts/
│   └── code-review-claude.py (1028 lines)
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── test_check.py
    ├── test_import.py
    ├── test_review.py
    ├── test_run.py
    ├── test_run_file.py
    ├── test_template.py
    └── test_utils.py
```

#### Verification Results

```bash
# Test results
$ make test-one DIR=plugins/rd2/skills/code-review-claude
============================== 76 passed in 0.16s ==============================

# Linting results
$ make lint-one DIR=plugins/rd2/skills/code-review-claude
All checks passed!
Success: no issues found in 1 source file
```

#### Bug Fixes Applied

During implementation, the following bugs were fixed:

1. **extract_review_sections() function** - Fixed section detection logic that was treating content lines with keywords as section headers. Added `is_header` check to require markdown headers (`##`) before processing as section boundaries.

2. **Timeout error messages** - Changed "timed out" to "timeout" for consistency with test expectations (3 occurrences fixed).

3. **Test mocks for subprocess** - Fixed mock subprocess.run to handle list arguments correctly for task creation tests.

4. **Test file existence checks** - Added tmp_path fixture and temporary file creation to TestCmdImport tests to pass file existence validation.

5. **Test output file creation** - Fixed test_run_file_with_output mock to create output file via side_effect function.

### References
