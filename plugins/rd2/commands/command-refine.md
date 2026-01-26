---
description: Refine commands to fix quality issues
skills: [rd2:cc-commands, rd2:anti-hallucination]
argument-hint: <command-file>
allowed-tools: [Read, Write, Edit, Grep, Glob]
---

# Refine Command

Thin wrapper command for `rd2:command-expert` agent. Improves existing commands by addressing quality issues and applying best practices.

## Quick Start

```bash
# Via slash command (recommended)
/rd2:command-refine .claude/commands/my-command.md
/rd2:command-refine plugins/rd2/commands/deploy
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<command-file>` | Path to command file (relative or absolute) |

## Validation

Verify command file before refinement:

1. **Check file exists**: Verify command file path is valid
2. **Validate file type**: Ensure .md extension
3. **Parse frontmatter**: Check YAML syntax is valid
4. **Check write access**: Ensure file can be modified

If validation fails:
- Show clear error message with file path
- Suggest checking file path and permissions
- Indicate YAML syntax errors with line numbers

## Workflow

This command follows the command refinement process:

1. **Evaluate Current Quality** - Identify gaps and issues
2. **Review Findings** - Check all dimensions, especially low scores
3. **Determine Action**:
   - Frontmatter issues? → Fix YAML, add required fields
   - Description weak? → Add specific trigger phrases, improve clarity
   - Content issues? → Use imperative form, clarify instructions
   - Missing validation? → Add input checks, error handling
4. **Implement Fixes** - Edit command file
5. **Re-evaluate** - Run quality assessment again
6. **Repeat** - Continue until Grade A/B achieved

## Common Improvements by Dimension

| Dimension | Typical Fixes |
|-----------|---------------|
| Frontmatter | Add missing fields, fix YAML syntax |
| Description | Shorten (<60 chars), add specificity |
| Content | Use imperative form, add clarity |
| Structure | Improve organization, add examples |
| Validation | Add input checks, error handling |
| Best Practices | Fix naming, add documentation |

## Refinement Example

**Before (Grade: C):**
```markdown
---
description: This is a command that will review your code and check for bugs
---

You should review the code for bugs and suggest improvements.
```

**After (Grade: A):**
```markdown
---
description: Review code for bugs and security issues
argument-hint: [file-path]
allowed-tools: Read, Grep
---

Review this code for:
- Potential bugs
- Security vulnerabilities
- Best practices violations

Provide specific line numbers and actionable suggestions.
```

## Output Format

```markdown
# Command Refinement: {command-name}

## Changes Made

### Frontmatter
- {Changes to YAML fields}

### Description
- **Before**: "{old description}"
- **After**: "{new description}"

### Content
- {Content improvements}

### Validation
- {Validation additions}

## New Score

| Dimension | Before | After |
|-----------|--------|-------|
| Frontmatter | X/20 | Y/20 |
| Description | X/25 | Y/25 |
| Content | X/25 | Y/25 |
| Structure | X/15 | Y/15 |
| Validation | X/10 | Y/10 |
| Best Practices | X/5 | Y/5 |
| **Overall** | **X.X/100** | **Y.Y/100** |

## Grade Improved: {old-grade} → {new-grade}
```

## Read vs Write

This command MODIFIES files:
- Edits command file to apply improvements
- Makes changes to fix identified issues

Use `/rd2:command-evaluate` first to assess quality without modifying.

## Implementation

This command delegates to the **rd2:command-expert** agent for command refinement:

```
Task(
    subagent_type="rd2:command-expert",
    prompt="""Refine and improve the command at: {command_file}

Steps:
1. Evaluate current quality across all dimensions
2. Identify gaps and issues (especially low-scoring areas)
3. Apply fixes by dimension:
   - Frontmatter: Fix YAML, add required fields
   - Description: Improve clarity, add specificity
   - Content: Use imperative form, clarify instructions
   - Structure: Improve organization
   - Validation: Add input checks, error handling
   - Best Practices: Fix naming, add documentation
4. Edit command file to apply improvements
5. Re-evaluate to confirm Grade A/B achieved

Follow rd2:cc-commands best practices throughout.
   """,
    description="Refine {command_file} command"
)
```

## See Also

- `rd2:command-expert` - Agent that handles command refinement
- `/rd2:command-evaluate` - Assess command quality (read-only)
- `/rd2:command-add` - Create new commands
- `rd2:cc-commands` - Best practices reference
