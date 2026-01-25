# Migration Guide: 0.0 to 0.1

Upgrade guide for migrating from rd2 plugin 0.0 to 0.1, covering breaking changes, new features, and migration steps.

## Overview

Version 0.1 introduces significant enhancements to the rd2 plugin, including:

- Enhanced task file structure (Task 0061)
- Two-level review process (Solution Review + Code Review)
- New super-* agents (super-architect, super-designer, super-planner)
- Super-coder 17-step implementation workflow
- Improved task-decomposition skill

## Breaking Changes

### 1. Task File Frontmatter

**Old Format (0.0):**
```yaml
---
name: task-name
status: Backlog
---
```

**New Format (0.1):**
```yaml
---
name: task-name
description: brief description
status: Backlog | Todo | WIP | Testing | Done
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
wbs: 0047
dependencies: []
parent: null
---
```

**Migration Impact:**
- Old task files will still work but missing new fields
- New tasks will use enhanced structure automatically
- Recommended: Update existing tasks to new format

**Migration Command:**
```bash
# Backup existing tasks
cp -r docs/prompts docs/prompts.backup

# Update task files (manual or script)
# See: Task File Migration section below
```

### 2. Skill Naming Convention

**Old (0.0):**
- `cc-skills`
- `cc-agents`
- `anti-hallucination2`

**New (0.1):**
- `rd2:cc-skills` (with `rd2:` prefix)
- `rd2:cc-agents`
- `rd2:anti-hallucination` (renamed from `anti-hallucination2`)

**Migration Impact:**
- Old skill references in commands/agents need updating
- Hooks configuration needs path updates

**Migration Steps:**
1. Update skill references in command frontmatter
2. Update skill references in agent frontmatter
3. Update hooks.json paths
4. Test invocation of all skills

### 3. Review Process Changes

**Old (0.0):**
- Single-level code review (super-code-reviewer only)

**New (0.1):**
- Two-level review process:
  - Solution Review (super-architect, Step 3, Optional)
  - Code Review (super-code-reviewer, Step 9-10, Mandatory)

**Migration Impact:**
- Workflow now includes optional solution review step
- Code review happens after implementation (not before)
- Clarified scope: Solution review = architecture, Code review = implementation

**Migration Steps:**
1. Review current workflow for code review timing
2. Adjust workflow to include solution review if needed
3. Update documentation to reflect two-level process

## New Features

### 1. Enhanced Task File Structure

New task files include:

**Q&A Section:**
```markdown
#### Q&A

[Clarifications from user, decisions made during implementation]
```

**Plan Subsection:**
```markdown
#### Plan

[Step-by-step implementation plan]
```

**References Section:**
```markdown
### References

[Documentation links, code examples, similar implementations]
```

**Benefits:**
- Better documentation of decisions
- Clear implementation roadmap
- Easy reference lookup

### 2. Super-Coder 17-Step Workflow

New implementation workflow with explicit steps:

**Steps 1-6: Understand & Clarify**
- Read task file thoroughly
- Ask clarifying questions
- Verify requirements

**Steps 7-10: Design & Plan**
- Select code generation approach
- Apply TDD workflow
- Create implementation plan

**Step 11: Mark as WIP**
- Update task file status

**Steps 12-17: Execute & Verify**
- Implement code
- Generate tests
- Debug issues
- Verify completion

### 3. New Agents

**super-planner:**
- Coordinates task decomposition
- Assesses scale and complexity
- Delegates to specialists (super-architect, super-designer)
- Orchestrates implementation workflow

**super-architect:**
- Handles solution architecture
- Performs solution review (Step 3)
- Creates Architecture Decision Records (ADRs)

**super-designer:**
- Handles UI/UX design
- Creates component specifications
- Ensures accessibility compliance (WCAG AA)

### 4. Enhanced task-decomposition Skill

New capabilities:
- Automatic WBS# assignment
- Hierarchical task numbering
- Dependency tracking
- Enhanced task file generation
- Scale-based decomposition strategies

## Migration Steps

### Step 1: Backup Existing Data

```bash
# Backup task files
cp -r docs/prompts docs/prompts.backup.0.0

# Backup plugin configuration
cp -r plugins/rd2 plugins/rd2.backup.0.0

# Note current task count
ls docs/prompts/*.md | wc -l
```

### Step 2: Update Plugin

```bash
# Pull latest rd2 plugin
# (Method depends on your installation)

# Verify new version
cat plugins/rd2/VERSION  # Should show 0.1
```

### Step 3: Update Task Files

**Option A: Manual Update (Recommended for few tasks)**

For each existing task file:

1. Add missing frontmatter fields:
```yaml
---
description: [one-line summary]
created_at: 2026-01-23
updated_at: 2026-01-23
wbs: 0047
dependencies: []
parent: null
---
```

2. Add new sections:
```markdown
#### Q&A

[Empty or populate from context]

#### Plan

[Empty or populate from context]

### References

[Empty or populate from context]
```

**Option B: Script Update (Recommended for many tasks)**

```python
#!/usr/bin/env python3
"""
Migrate task files from 0.0 to 0.1 format
"""

import re
from pathlib import Path
from datetime import datetime

PROMPTS_DIR = Path("docs/prompts")

def migrate_task_file(filepath):
    """Migrate a single task file to 0.1 format."""
    content = filepath.read_text()
    lines = content.splitlines()

    # Find frontmatter
    fm_start = None
    fm_end = None
    for i, line in enumerate(lines):
        if line.strip() == "---":
            if fm_start is None:
                fm_start = i
            else:
                fm_end = i
                break

    if fm_start is None or fm_end is None:
        print(f"Skipping {filepath.name}: No frontmatter found")
        return

    # Extract existing frontmatter
    existing_fm = lines[fm_start+1:fm_end]

    # Check if already migrated
    if any("wbs:" in line for line in existing_fm):
        print(f"Skipping {filepath.name}: Already migrated")
        return

    # Parse existing fields
    name = None
    status = "Backlog"
    for line in existing_fm:
        if line.startswith("name:"):
            name = line.split(":", 1)[1].strip()
        elif line.startswith("status:"):
            status = line.split(":", 1)[1].strip()

    # Extract WBS from filename
    wbs_match = re.match(r"(\d{4})", filepath.name)
    wbs = wbs_match.group(1) if wbs_match else "0000"

    # Build new frontmatter
    new_fm = f"""---
name: {name or filepath.stem}
description: [Add description]
status: {status}
created_at: {datetime.now().strftime('%Y-%m-%d')}
updated_at: {datetime.now().strftime('%Y-%m-%d')}
wbs: {wbs}
dependencies: []
parent: null
---
"""

    # Rebuild content
    new_content = new_fm + "\n".join(lines[fm_end+1:])

    # Add new sections if not present
    if "#### Q&A" not in new_content:
        # Find Requirements section
        req_match = re.search(r"### Requirements", new_content)
        if req_match:
            insert_pos = req_match.end()
            new_content = (new_content[:insert_pos] +
                          "\n\n#### Q&A\n\n[Clarifications from user]\n" +
                          new_content[insert_pos:])

    if "#### Plan" not in new_content:
        # Find Solutions section
        sol_match = re.search(r"### Solutions", new_content)
        if sol_match:
            insert_pos = sol_match.end()
            new_content = (new_content[:insert_pos] +
                          "\n\n#### Plan\n\n[Step-by-step implementation plan]\n" +
                          new_content[insert_pos:])

    if "### References" not in new_content:
        new_content += "\n\n### References\n\n[Documentation links]\n"

    # Write updated file
    filepath.write_text(new_content)
    print(f"Migrated {filepath.name}")

# Migrate all task files
for filepath in PROMPTS_DIR.glob("*.md"):
    migrate_task_file(filepath)
```

### Step 4: Update Skill References

Update command and agent files:

**Files to update:**
- `plugins/rd2/commands/*.md`
- `plugins/rd2/agents/*.md`

**Find and replace:**
```
cc-skills → rd2:cc-skills
cc-agents → rd2:cc-agents
anti-hallucination2 → rd2:anti-hallucination
```

**Example:**
```bash
# Update commands
sed -i '' 's/cc-skills/rd2:cc-skills/g' plugins/rd2/commands/*.md
sed -i '' 's/cc-agents/rd2:cc-agents/g' plugins/rd2/commands/*.md

# Update agents
sed -i '' 's/cc-skills/rd2:cc-skills/g' plugins/rd2/agents/*.md
sed -i '' 's/cc-agents/rd2:cc-agents/g' plugins/rd2/agents/*.md
```

### Step 5: Update Hooks Configuration

Update `plugins/rd2/hooks/hooks.json`:

**Old paths:**
```
skills/anti-hallucination2/scripts/ah_guard.py
```

**New paths:**
```
skills/anti-hallucination/scripts/ah_guard.py
```

### Step 6: Refresh Kanban

```bash
# Sync updated tasks to TodoWrite
tasks refresh
```

### Step 7: Verify Migration

```bash
# Check task files
tasks list

# Verify new agents work (via commands)
/rd2:tasks-plan "test"

# Verify super-coder workflow (via code-generate command)
/rd2:code-generate --task 0047

# Verify code review (via code-review command)
/rd2:code-review src/
```

## Rollback Procedure

If migration fails:

```bash
# Restore backup
rm -rf docs/prompts
mv docs/prompts.backup.0.0 docs/prompts

rm -rf plugins/rd2
mv plugins/rd2.backup.0.0 plugins/rd2

# Reinstall old version
```

## Post-Migration Checklist

- [ ] All task files updated to new format
- [ ] Skill references updated in commands and agents
- [ ] Hooks configuration updated
- [ ] Kanban board refreshed successfully
- [ ] New super-* agents tested
- [ ] Super-coder 17-step workflow tested
- [ ] Two-level review process understood
- [ ] Task-decomposition skill tested
- [ ] All existing tasks still accessible
- [ ] Documentation reviewed

## Known Issues

### Issue 1: Old Task Files Without WBS#

**Problem:** Task files created before 0.1 may not have WBS# in filename

**Solution:** Rename files to include WBS#

```bash
# Find files without WBS prefix
for f in docs/prompts/!([0-9]*).md; do
    # Assign new WBS#
    # Rename file
done
```

### Issue 2: Missing Status Values

**Problem:** Old task files may have custom status values

**Solution:** Map to new status values

```python
status_map = {
    "New": "Backlog",
    "InProgress": "WIP",
    "Review": "Testing",
    "Complete": "Done"
}
```

### Issue 3: TodoWrite Sync Conflicts

**Problem:** Kanban board may show different status than task files

**Solution:** Run `tasks refresh` to sync from task files (source of truth)

## Support

For migration issues:

1. Check this guide's Known Issues section
2. Review `docs/rd2-workflow.md` for workflow changes
3. Review `docs/task-cli-integration.md` for task CLI changes
4. Check task file format in `plugins/rd2/skills/task-decomposition/SKILL.md`

## Version History

### 0.1 (Current)

- Enhanced task file structure
- Two-level review process
- New super-* agents
- Super-coder 17-step workflow
- Improved task-decomposition skill

### 0.0 (Previous)

- Basic task file structure
- Single-level code review
- Initial super-* agents
- Basic task-decomposition
