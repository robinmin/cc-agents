---
name: create-test-outline-generator-py
description: Create pytest unit tests for outline-generator.py (parse_frontmatter, read_research_brief, create_outline_content, CLI commands)
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: pending
dependencies: []
tags: [testing, pytest, outline-generator, frontmatter]
---

## 0138. Create test_outline_generator.py

### Background

The `outline-generator.py` script (840 lines) generates multi-option outlines for the technical-content-creation workflow. Key functionality includes:
- YAML frontmatter parsing
- Research brief reading
- Outline option generation (3 styles: traditional, narrative, technical)
- Outline approval workflow
- Materials saving (prompts, parameters)
- CLI commands for generation and approval

This script is the largest and most complex, requiring comprehensive test coverage.

### Requirements / Objectives

**Constants to Test:**
- `OUTLINE_STYLES` - Style definitions (a, b, c)
- `PROMPT_TEMPLATES` - Prompt templates for each style
- `OUTLINE_TEMPLATES` - Outline structure templates

**Functions to Test:**
- `parse_frontmatter(content)` - Parse YAML frontmatter
- `read_research_brief(research_brief_path)` - Read research brief
- `generate_outline_prompt(option, topic, length, research_brief)` - Generate prompt
- `create_outline_option_frontmatter(option, topic, research_brief_path, confidence)` - Create frontmatter
- `create_outline_content(option, topic, length, research_brief)` - Generate outline
- `save_outline_option(option, topic, length, research_brief, outline_dir, confidence)` - Save outline
- `save_generation_materials(topic, length, options, research_brief, materials_dir)` - Save materials
- `copy_approved_outline(outline_dir, selected_option, approved_by)` - Copy approved outline
- `present_options(options)` - Present options for selection
- CLI commands:
  - `cmd_generate(args)` - Generate outline options
  - `cmd_approve(args)` - Approve outline option
  - `cmd_list(args)` - List outline options

**Test Cases Required:**

1. **OUTLINE_STYLES constant**
   - [ ] Verify 3 styles defined (a, b, c)
   - [ ] Each style has name, id, description, best_for

2. **PROMPT_TEMPLATES constant**
   - [ ] Verify templates for all 3 styles
   - [ ] Templates contain placeholders for topic, length, research_brief

3. **parse_frontmatter()**
   - [ ] Parses valid YAML frontmatter
   - [ ] Returns frontmatter dict and body
   - [ ] Returns empty dict and full content when no frontmatter
   - [ ] Handles simple key: value pairs

4. **read_research_brief()**
   - [ ] Reads research brief with frontmatter
   - [ ] Extracts title from frontmatter
   - [ ] Extracts title from body (# header) if not in frontmatter
   - [ ] Returns dict with title, content, frontmatter, path
   - [ ] Raises FileNotFoundError for missing file

5. **generate_outline_prompt()**
   - [ ] Generates correct prompt for option 'a'
   - [ ] Generates correct prompt for option 'b'
   - [ ] Generates correct prompt for option 'c'
   - [ ] Includes topic, length, research_brief path

6. **create_outline_option_frontmatter()**
   - [ ] Creates valid YAML frontmatter
   - [ ] Includes all required fields (title, source_research, option, style, created_at, status, confidence)
   - [ ] Uses correct style name from OUTLINE_STYLES

7. **create_outline_content()**
   - [ ] Generates traditional outline (option 'a', short)
   - [ ] Generates traditional outline (option 'a', long)
   - [ ] Generates narrative outline (option 'b', short)
   - [ ] Generates narrative outline (option 'b', long)
   - [ ] Generates technical outline (option 'c', short)
   - [ ] Generates technical outline (option 'c', long)
   - [ ] Extracts themes from research brief

8. **save_outline_option()**
   - [ ] Creates outline file with frontmatter
   - [ ] Includes style header
   - [ ] Includes outline content
   - [ ] Returns path to saved file

9. **save_generation_materials()**
   - [ ] Creates materials directory
   - [ ] Saves prompts-used.md with all prompts
   - [ ] Saves generation-params.json with parameters
   - [ ] Includes correct metadata (topic, length, options, styles)

10. **copy_approved_outline()**
    - [ ] Copies selected option to outline-approved.md
    - [ ] Updates frontmatter (approved_at, approved_by, status)
    - [ ] Raises FileNotFoundError for missing source
    - [ ] Returns path to approved file

11. **present_options()**
    - [ ] Returns formatted prompt for user selection
    - [ ] Lists all options with descriptions

12. **cmd_generate()**
    - [ ] Generates 2 or 3 outline options
    - [ ] Creates outline directory
    - [ ] Saves outline files
    - [ ] Saves generation materials
    - [ ] Prints summary
    - [ ] Interactive mode: prompts for selection
    - [ ] Non-interactive: shows approval command

13. **cmd_approve()**
    - [ ] Copies selected option to approved
    - [ ] Validates selection (a, b, c)
    - [ ] Checks source file exists
    - [ ] Prints success message

14. **cmd_list()**
    - [ ] Lists existing outline options
    - [ ] Shows approved option if exists
    - [ ] Shows status for each option

15. **Edge Cases**
    - [ ] Research brief without frontmatter
    - [ ] Research brief without title
    - [ ] Empty research brief content
    - [ ] Invalid option letter
    - [ ] Missing outline directory
    - [ ] Outline option file doesn't exist
    - [ ] Unicode in research brief

**Acceptance Criteria:**
- [ ] 85%+ code coverage for outline-generator.py
- [ ] All functions tested with success and failure paths
- [ ] Outline content verification (structure, sections)
- [ ] Frontmatter validation
- [ ] CLI command tests use appropriate mocking

### Design

**Key Fixtures Needed:**
```python
# In conftest.py
@pytest.fixture
def mock_research_brief(tmp_path):
    """Create a mock research brief file."""
    research_dir = tmp_path / "1-research"
    research_dir.mkdir()
    brief_file = research_dir / "research-brief.md"
    brief_content = """---
title: Test Topic
source_materials: 0-materials/materials-extracted.md
---

# Test Topic

## Key Theme 1
Content for theme 1.

## Key Theme 2
Content for theme 2.

## Key Theme 3
Content for theme 3.
"""
    brief_file.write_text(brief_content)
    return brief_file

@pytest.fixture
def mock_outline_dir(tmp_path):
    """Create a mock outline directory."""
    outline_dir = tmp_path / "2-outline"
    outline_dir.mkdir()
    return outline_dir

@pytest.fixture
def mock_args_generate():
    """Create mock CLI arguments for cmd_generate."""
    return MagicMock(
        options=3,
        length="long",
        interactive=False,
        confidence="MEDIUM"
    )

@pytest.fixture
def mock_args_approve():
    """Create mock CLI arguments for cmd_approve."""
    return MagicMock(
        approve="b",
        approved_by="user"
    )
```

**Test Structure:**
```python
# tests/test_outline_generator.py
import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from plugins.wt.skills.technical_content_creation.scripts.outline_generator import (
    parse_frontmatter,
    read_research_brief,
    generate_outline_prompt,
    create_outline_content,
    # ... other imports
)

class TestParseFrontmatter:
    def test_parse_valid_frontmatter(self):
        content = "---\ntitle: Test\nstatus: draft\n---\n\nBody content"
        frontmatter, body = parse_frontmatter(content)
        assert frontmatter["title"] == "Test"
        assert frontmatter["status"] == "draft"
        assert body == "\n\nBody content"

    def test_parse_no_frontmatter(self):
        content = "Just body content"
        frontmatter, body = parse_frontmatter(content)
        assert frontmatter == {}
        assert body == "Just body content"

    # ... more tests

class TestReadResearchBrief:
    def test_read_with_frontmatter_title(self, mock_research_brief):
        brief = read_research_brief(mock_research_brief)
        assert brief["title"] == "Test Topic"
        assert "content" in brief
        assert "frontmatter" in brief

    # ... more tests

class TestCreateOutlineContent:
    def test_traditional_short(self, mock_research_brief):
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content("a", "Test Topic", "short", brief)
        assert "## 1. Introduction" in content
        assert "## 2. Main Content" in content
        assert "## 3. Conclusion" in content

    # ... more tests
```

### Plan

1. **Setup** (5 minutes)
   - Create test file structure
   - Add imports
   - Create test class structure

2. **parse_frontmatter() Tests** (10 minutes)
   - Test valid frontmatter
   - Test no frontmatter
   - Test empty frontmatter

3. **read_research_brief() Tests** (10 minutes)
   - Test with frontmatter title
   - Test with body title
   - Test missing title
   - Test missing file

4. **generate_outline_prompt() Tests** (5 minutes)
   - Test all 3 options
   - Verify template usage

5. **create_outline_option_frontmatter() Tests** (5 minutes)
   - Test frontmatter generation
   - Verify all fields

6. **create_outline_content() Tests** (30 minutes)
   - Test option 'a' (short, long)
   - Test option 'b' (short, long)
   - Test option 'c' (short, long)
   - Test theme extraction

7. **save_outline_option() Tests** (10 minutes)
   - Test saving outline
   - Verify file structure

8. **save_generation_materials() Tests** (10 minutes)
   - Test prompts-used.md
   - Test generation-params.json

9. **copy_approved_outline() Tests** (10 minutes)
   - Test copying approved outline
   - Test frontmatter update

10. **present_options() Tests** (5 minutes)
    - Test option presentation

11. **cmd_generate() Tests** (20 minutes)
    - Test generation (2 options, 3 options)
    - Test short/long length
    - Test interactive mode
    - Test non-interactive mode

12. **cmd_approve() Tests** (10 minutes)
    - Test approve option
    - Test invalid option
    - Test missing source file

13. **cmd_list() Tests** (10 minutes)
    - Test listing options
    - Test with approved outline

14. **Edge Cases** (15 minutes)
    - Test various edge cases

15. **Coverage Verification** (5 minutes)
    - Run pytest with coverage
    - Address uncovered lines

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test File | tests/test_outline_generator.py | super-coder | 2026-01-30 |

### References

- [outline-generator.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/outline-generator.py)
- [shared/config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py)
- [PyYAML Documentation](https://pyyaml.org/)
