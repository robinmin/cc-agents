---
name: create-test-context-validator-py
description: Create pytest unit tests for context-validator.py (find_repo_root, TopicContext, get_stage_status, CLI commands)
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
tags: [testing, pytest, context-validator, stages]
---

## 0135. Create test_context_validator.py

### Background

The `context-validator.py` script (489 lines) provides topic context detection and stage status validation. Key functionality includes:
- Finding TCC repository root
- Detecting current topic context
- Checking stage completion status
- Detecting current active stage
- Verifying stage dependencies
- CLI commands for validation and status reporting

This script is central to the 7-stage workflow, so thorough testing is critical.

### Requirements / Objectives

**Functions/Classes to Test:**
- `STAGES` constant (stage definitions)
- `TopicContext` class
- `find_repo_root(start_dir)` - Find TCC repository root
- `find_topic_context(start_dir)` - Find topic context
- `get_stage_status(topic_dir, stage_num)` - Get stage completion
- `detect_current_stage(topic_dir)` - Detect current active stage
- `verify_dependencies(topic_dir, target_stage)` - Check dependencies
- `get_stage_completion_percentage(topic_dir)` - Calculate completion
- `print_status_report(topic_dir)` - Print status (capture output)
- `cmd_validate(args)` - Validate context CLI
- `cmd_status(args)` - Show status CLI
- `cmd_detect_stage(args)` - Detect stage CLI
- `cmd_verify_dependencies(args)` - Verify dependencies CLI

**Test Cases Required:**

1. **STAGES constant**
   - [ ] Verify all 7 stages defined (0-6)
   - [ ] Verify each stage has name, folder, key_files, key_outputs

2. **TopicContext class**
   - [ ] __init__ creates object with repo_root, topic_dir, topic_id
   - [ ] __bool__ returns valid attribute
   - [ ] collection_dir set correctly

3. **find_repo_root()**
   - [ ] Returns configured root from get_tcc_repo_root()
   - [ ] Searches upward for collections.json
   - [ ] Returns None if not found
   - [ ] Stops at filesystem root

4. **find_topic_context()**
   - [ ] Returns valid context when in topic folder
   - [ ] Returns context with repo_root but no topic_dir
   - [ ] Validates topic.md exists
   - [ ] Validates stage folders exist
   - [ ] Returns None when not in repo

5. **get_stage_status()**
   - [ ] Returns complete=True when all key_files exist
   - [ ] Returns complete=False when files missing
   - [ ] Returns list of existing_files
   - [ ] Returns list of missing_files
   - [ ] Raises ValueError for invalid stage_num

6. **detect_current_stage()**
   - [ ] Returns 0 when no stages complete
   - [ ] Returns 6 when all stages complete
   - [ ] Returns first incomplete stage
   - [ ] Returns last complete stage if all complete

7. **verify_dependencies()**
   - [ ] Returns (True, []) when all satisfied
   - [ ] Returns (False, [unmet]) when dependencies missing
   - [ ] Lists all incomplete stages before target

8. **get_stage_completion_percentage()**
   - [ ] Returns 0 when no stages complete
   - [ ] Returns 100 when all stages complete
   - [ ] Returns correct percentage for partial completion

9. **print_status_report()**
   - [ ] Prints topic status (capture with capsys)
   - [ ] Prints stage-by-stage status
   - [ ] Prints completion percentage
   - [ ] Prints detected current stage

10. **CLI Commands**
    - [ ] cmd_validate: exits 0 when valid, 1 when invalid
    - [ ] cmd_status: prints status report
    - [ ] cmd_detect_stage: outputs stage number
    - [ ] cmd_detect_stage --json: outputs JSON
    - [ ] cmd_verify_dependencies: checks dependencies

11. **Edge Cases**
    - [ ] Topic.md exists but no stage folders
    - [ ] Stage folders exist but no topic.md
    - [ ] Empty stage folders
    - [ ] Partial stage completion
    - [ ] Collections.json malformed

**Acceptance Criteria:**
- [ ] 85%+ code coverage for context-validator.py
- [ ] All functions tested with success and failure paths
- [ ] CLI command tests use capsys for output capture
- [ ] Uses tmp_path for file system mocking

### Design

**Key Fixtures Needed:**
```python
# In conftest.py
@pytest.fixture
def mock_repo_root(tmp_path):
    """Create a mock TCC repository root."""
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    (repo_root / "collections.json").write_text('{"collections": []}')
    (repo_root / "collections").mkdir()
    return repo_root

@pytest.fixture
def mock_topic_dir(mock_repo_root):
    """Create a mock topic directory with all stages."""
    collection_dir = mock_repo_root / "collections" / "test-collection"
    collection_dir.mkdir()
    topic_dir = collection_dir / "test-topic"
    topic_dir.mkdir()

    # Create topic.md
    (topic_dir / "topic.md").write_text(
        "---\nname: test-topic\ntitle: Test Topic\nstage: 0\n---"
    )

    # Create stage folders
    for i in range(7):
        stage_dir = topic_dir / f"{i}-{'materialsresearchoutlinedraftillustrationadaptationpublish'[i*9:i*9+9]}"
        stage_dir.mkdir()

        # Add key files for stages 0-2
        if i == 0:
            (stage_dir / "materials.json").write_text('{}')
        elif i == 1:
            (stage_dir / "sources.json").write_text('{}')
            (stage_dir / "research-brief.md").write_text('# Research')

    return topic_dir
```

**Test Structure:**
```python
# tests/test_context_validator.py
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from plugins.wt.skills.technical_content_creation.scripts.context_validator import (
    find_repo_root,
    find_topic_context,
    get_stage_status,
    # ... other imports
)

class TestFindRepoRoot:
    def test_returns_configured_root(self, mock_repo_root):
        with patch('context_validator.get_tcc_repo_root', return_value=mock_repo_root):
            result = find_repo_root(Path.cwd())
            assert result == mock_repo_root

    # ... more tests

class TestTopicContext:
    def test_initialization(self):
        context = TopicContext(Path("/repo"), Path("/repo/collections/test/topic"))
        assert context.repo_root == Path("/repo")
        assert context.topic_dir == Path("/repo/collections/test/topic")
        assert context.topic_id == "topic"

    # ... more tests
```

### Plan

1. **Setup** (5 minutes)
   - Create test file structure
   - Add imports
   - Create test class structure

2. **find_repo_root() Tests** (10 minutes)
   - Test configured root
   - Test upward search for collections.json
   - Test not found case

3. **find_topic_context() Tests** (15 minutes)
   - Test valid topic context
   - Test no topic folder
   - Test invalid topic (no stage folders)

4. **get_stage_status() Tests** (15 minutes)
   - Test complete stage
   - Test incomplete stage
   - Test missing stage folder
   - Test invalid stage_num

5. **detect_current_stage() Tests** (10 minutes)
   - Test no stages complete
   - Test all stages complete
   - Test partial completion

6. **verify_dependencies() Tests** (10 minutes)
   - Test all satisfied
   - Test unmet dependencies
   - Test list of unmet stages

7. **get_stage_completion_percentage() Tests** (5 minutes)
   - Test 0%, 50%, 100%

8. **print_status_report() Tests** (10 minutes)
   - Test output with capsys

9. **CLI Commands Tests** (20 minutes)
   - Test cmd_validate
   - Test cmd_status
   - Test cmd_detect_stage
   - Test cmd_detect_stage --json
   - Test cmd_verify_dependencies

10. **Edge Cases** (10 minutes)
    - Malformed topic.md
    - Empty stage folders
    - Missing collections.json

11. **Coverage Verification** (5 minutes)
    - Run pytest with coverage
    - Address uncovered lines

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test File | tests/test_context_validator.py | super-coder | 2026-01-30 |

### References

- [context-validator.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/context-validator.py)
- [shared/config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py)
