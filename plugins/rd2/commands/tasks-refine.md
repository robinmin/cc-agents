---
description: Task refinement via quality check and user interaction
skills:
  - rd2:tasks
argument-hint: "<task-file.md>" [--force-refine]
---

# Tasks Refine

Refine incomplete or unclear task files through quality checks, gap detection, and user approval. Ensures tasks are ready for decomposition and implementation.

**IMPORTANT:** This command helps improve task quality before planning or implementation. It detects gaps, suggests improvements, and gets your approval before making changes.

## Quick Start

```bash
# Refine a task file automatically detects issues
/rd2:tasks-refine docs/prompts/0047_feature.md

# Force refinement even if task looks complete
/rd2:tasks-refine docs/prompts/0047_feature.md --force-refine

# Refine by WBS number
/rd2:tasks-refine --task 0047
```

## When to Use

**Activate this command when:**

- Task file has empty/missing sections:
  - Empty `description` field in frontmatter
  - Missing or empty `Requirements` section
  - Missing or empty `Solutions` section
  - Missing or empty `References` section
- Requirements are vague or incomplete:
  - Brief content (< 50 characters in Requirements)
  - No clear acceptance criteria
  - Ambiguous or conflicting requirements
- Task status is "Backlog" and never worked on
- Need user clarification before decomposition
- Preparing for `rd2:tasks-design` or `rd2:tasks-plan`

**Do NOT use for:**

- Tasks that are already refined (use `--skip-refinement` in `rd2:tasks-plan`)
- Tasks in "WIP" or later status (content may be intentionally minimal)
- Simple tasks with clear, complete requirements

## Red Flags Checked

The refinement process checks for these quality issues:

| Category | Red Flag | Threshold |
|----------|----------|----------|
| **Frontmatter** | Empty description | description = "" or < 10 chars |
| **Frontmatter** | Missing status | status field not present |
| **Content** | Empty Requirements section | < 10 chars |
| **Content** | Empty Solutions section | < 10 chars |
| **Content** | Empty References section | < 10 chars |
| **Content** | No Q&A subsection | Task is WIP but no Q&A documented |
| **Quality** | Very brief Requirements | < 50 chars total |
| **Quality** | No acceptance criteria | No "done when:" or similar |

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `task-file.md` | No* | Path to task file to refine |
| `--task <WBS>` | No* | WBS number as alternative to file path |
| `--force-refine` | No | Force refinement even if no red flags detected |

**Note:** Either file path or WBS must be provided.

## Workflow

This command delegates to the **super-planner** agent using the Task tool:

```python
Task(
  subagent_type="rd2:super-planner",
  prompt="""Refine task file: {task_file}

Mode: refinement-only
Flags: {force_refine}

Steps:
1. Load task file
2. Quality check (red flag detection)
3. If red flags found OR --force-refine:
   - Generate refinement draft
   - Ask user for approval via AskUserQuestion
   - Options: Approve all, Review section by section, Skip changes
4. Apply approved changes to task file
5. Report completion with changes summary
""",
  description="Refine task file quality"
)
```

### Detailed Workflow Steps

1. **Load task file** - Parse frontmatter and sections
2. **Quality check** - Detect red flags (see table above)
3. **Generate refinement draft** (if red flags OR `--force-refine`):
   - Identify gaps and missing content
   - Suggest improvements for each gap
   - Present diff-style preview of changes
4. **User interaction** via `AskUserQuestion`:
   - Show detected issues and suggestions
   - Options: "Approve all", "Review section by section", "Skip changes"
5. **Apply changes** - Update task file with approved improvements
6. **Report completion** - Summary of changes made

## Output

### Success Output

```markdown
## Refinement Complete

**Task:** docs/prompts/0047_add_auth.md
**Changes Applied:** 3 sections updated

### Changes Made

1. ✅ Enhanced Requirements section
   - Added 2 acceptance criteria
   - Expanded technical requirements
   - Added performance considerations

2. ✅ Added References section
   - Included OAuth2 documentation links
   - Added JWT library reference

3. ✅ Updated frontmatter
   - Enhanced description clarity
```

### No Changes Output

```markdown
## Refinement Complete

**Task:** docs/prompts/0047_add_auth.md
**Status:** No changes needed

Task file quality check passed. All required sections present and complete.
```

## Examples

### Example 1: Auto-detect and refine

```bash
/rd2:tasks-refine docs/prompts/0047_feature.md

# Output:
# → Loading task 0047...
# → Quality check: 3 red flags detected
# → Red Flag 1: Requirements section is empty
# → Red Flag 2: Solutions section is missing
# → Red Flag 3: References section is empty
#
# → Presenting refinement draft...
# ? Approve suggested changes? (Select option)
#   [x] Approve all
#   [ ] Review section by section
#   [ ] Skip changes
#
# [USER selects: Approve all]
# → Applying 3 changes to task file...
# ✓ Complete
```

### Example 2: Force refinement

```bash
/rd2:tasks-refine --task 0047 --force-refine

# Output:
# → Loading task 0047...
# → --force-refine flag: skipping quality check
# → Generating refinement suggestions...
# → Presenting refinement draft...
# ? Approve suggested changes? (Select option)
#   [x] Approve all
#   [ ] Review section by section
#   [ ] Skip changes
#
# [USER selects: Review section by section]
# → Section 1: Requirements enhancements
#   [x] Approve
#   [ ] Modify
#   [ ] Skip
# → Section 2: Architecture recommendations
#   [x] Approve
#   [ ] Modify
#   [ ] Skip
# → Complete
```

### Example 3: Task needs no refinement

```bash
/rd2:tasks-refine docs/prompts/0047_complete_task.md

# Output:
# → Loading task 0047_complete_task.md...
# → Quality check: No red flags detected
# → Task file is complete and clear
# → No changes needed
# ✓ Complete
```

## Integration with Other Commands

This command is typically used as part of the full planning workflow:

```bash
# Manual workflow
/rd2:tasks-refine docs/prompts/0047.md
/rd2:tasks-design --task 0047
rd2:tasks create "Subtask 1"
rd2:tasks create "Subtask 2"

# Automated workflow (recommended)
/rd2:tasks-plan "Implement feature"  # Automatically calls refine + design
```

Or use `--skip-refinement` flag to skip this step:

```bash
/rd2:tasks-plan --task 0047 --skip-refinement
```

## Refinement Draft Format

When red flags are detected, a structured draft is presented:

```markdown
## Refinement Draft for Task 0047

### Detected Issues (3)

1. **Requirements section empty**
   - Current: (empty)
   - Suggested: Add requirements with acceptance criteria

2. **References section missing**
   - Current: (not present)
   - Suggested: Add documentation links and code references

3. **Description too brief**
   - Current: "Add auth"
   - Suggested: "Add OAuth2 authentication with Google provider"

### Proposed Changes

#### Requirements Section
```diff
+ ### Requirements / Objectives
+ - Implement OAuth2 authentication with Google
+ - Support JWT token management
+ - Add user profile CRUD operations
+
+ #### Acceptance Criteria
+ - [ ] User can authenticate via Google OAuth2
+ - [ ] JWT tokens are properly validated
+ - [ ] User profile can be created and updated
```

#### References Section
```diff
+ ### References
+ - [OAuth2 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
+ - [Google OAuth2 docs](https://developers.google.com/identity/protocols/oauth2)
+ - Existing auth module: src/auth/README.md
```

#### Frontmatter
```diff
- description: Add auth
+ description: Implement OAuth2 authentication with Google provider for user login
```

### Approval Options

Choose how to proceed:
- **Approve all**: Apply all suggested changes at once
- **Review section by section**: Review and approve each section individually
- **Skip changes**: Leave task file unchanged
```

## Design Philosophy

**Task Quality First** - Better planning starts with better task files. This command ensures tasks are complete and clear before expensive planning and implementation work.

**User in Control** - All changes are presented for approval before being applied. Users can approve all, review section by section, or skip entirely.

**Non-Destructive** - Original task content is preserved. Changes are additive (filling gaps) rather than replacing existing content.

**Progressive Enhancement** - Refinement can be run multiple times as understanding improves. Each run builds on the previous state.

## Error Handling

| Error | Resolution |
|-------|------------|
| Task file not found | Check WBS number or file path. Use `tasks list` to see available tasks. |
| Task file corrupted | Check markdown syntax. Ensure frontmatter is valid YAML. |
| User cancels refinement | Task file remains unchanged. Can retry later with `--force-refine`. |
| rd2:tasks skill unavailable | Report error, suggest manual task file editing. |

## See Also

- **super-planner agent**: `../agents/super-planner.md` - Agent that handles refinement logic
- **/rd2:tasks-design**: Architecture and design phase coordination
- **/rd2:tasks-plan**: Full workflow orchestration (refine → design → decompose → orchestrate)
- **rd2:tasks**: Task file operations and WBS management
- **`../plugins/rd/commands/task-runner.md`**: Reference orchestration command (old rd plugin)
