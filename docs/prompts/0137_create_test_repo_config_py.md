---
name: create-test-repo-config-py
description: Create pytest unit tests for repo-config.py (RepoValidator, list_collections, list_topics_in_collection, CLI commands)
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
tags: [testing, pytest, repo-config, validation]
---

## 0137. Create test_repo_config.py

### Background

The `repo-config.py` script (465 lines) provides repository configuration management and validation. Key functionality includes:
- Repository structure validation (RepoValidator class)
- Collection listing
- Topic listing within collections
- Default collection management
- CLI commands for repository operations

This script ensures the TCC repository structure is valid and provides navigation tools.

### Requirements / Objectives

**Classes/Functions to Test:**
- `RepoValidator` class
  - `validate_repo_root(repo_root)` - Validate repository structure
  - `validate_collection_dir(collection_dir)` - Validate collection directory
- `load_collections_json(repo_root)` - Load collections.json
- `list_collections(repo_root)` - List all collections
- `list_topics_in_collection(collection_id, repo_root)` - List topics
- `set_default_collection(collection_id)` - Set default collection
- CLI commands:
  - `cmd_detect(args)` - Detect repository root
  - `cmd_set_root(args)` - Set repository root
  - `cmd_validate(args)` - Validate repository
  - `cmd_list_collections(args)` - List collections
  - `cmd_list_topics(args)` - List topics
  - `cmd_set_default_collection(args)` - Set default

**Test Cases Required:**

1. **RepoValidator.validate_repo_root()**
   - [ ] Returns (True, []) for valid repository
   - [ ] Returns (False, [errors]) for missing directory
   - [ ] Returns (False, [errors]) when not a directory
   - [ ] Returns (False, [errors]) when collections.json missing
   - [ ] Returns (False, [errors]) when collections/ missing

2. **RepoValidator.validate_collection_dir()**
   - [ ] Returns (True, []) for valid collection
   - [ ] Returns (False, [errors]) for missing directory

3. **load_collections_json()**
   - [ ] Loads valid collections.json
   - [ ] Raises FileNotFoundError when missing
   - [ ] Raises JSONDecodeError for malformed JSON

4. **list_collections()**
   - [ ] Returns list of collections
   - [ ] Returns empty list when no collections
   - [ ] Raises FileNotFoundError when repo_root not configured
   - [ ] Uses configured repo_root if not provided

5. **list_topics_in_collection()**
   - [ ] Returns list of topics with metadata
   - [ ] Parses topic.md frontmatter
   - [ ] Handles topics without topic.md
   - [ ] Returns empty list for collection with no topics
   - [ ] Raises FileNotFoundError for missing collection
   - [ ] Sorts topics by ID

6. **set_default_collection()**
   - [ ] Sets default collection in config
   - [ ] Raises ValueError for non-existent collection
   - [ ] Raises FileNotFoundError when repo_root not configured

7. **cmd_detect()**
   - [ ] Prints configured root
   - [ ] Prints validation status
   - [ ] Prints hint when not configured

8. **cmd_set_root()**
   - [ ] Sets repository root after validation
   - [ ] Expands user path (~)
   - [ ] Resolves to absolute path
   - [ ] Prints error for invalid structure
   - [ ] Prints success message

9. **cmd_validate()**
   - [ ] Exits 0 for valid repository
   - [ ] Exits 1 for invalid repository
   - [ ] Prints validation errors

10. **cmd_list_collections()**
    - [ ] Lists all collections with metadata
    - [ ] Handles empty collections list
    - [ ] Handles FileNotFoundError

11. **cmd_list_topics()**
    - [ ] Lists topics in collection
    - [ ] Shows title and status
    - [ ] Handles empty topic list

12. **cmd_set_default_collection()**
    - [ ] Sets default collection
    - [ ] Shows current config after setting
    - [ ] Handles errors

13. **Edge Cases**
    - [ ] Empty collections.json
    - [ ] Collections with no topics
    - [ ] Topics without topic.md
    - [ ] Malformed topic.md frontmatter
    - [ ] Special characters in collection/topic names

**Acceptance Criteria:**
- [ ] 85%+ code coverage for repo-config.py
- [ ] All functions tested with success and failure paths
- [ ] CLI command tests use capsys for output capture
- [ ] Error cases properly tested

### Design

**Key Fixtures Needed:**
```python
# In conftest.py
@pytest.fixture
def mock_valid_repo(tmp_path):
    """Create a valid TCC repository structure."""
    repo_root = tmp_path / "repo"
    repo_root.mkdir()

    # Create collections.json
    collections_json = {
        "collections": [
            {
                "id": "test-collection",
                "name": "Test Collection",
                "path": "collections/test-collection",
                "topic_count": 2
            }
        ]
    }
    (repo_root / "collections.json").write_text(json.dumps(collections_json, indent=2))

    # Create collections directory
    collections_dir = repo_root / "collections"
    collections_dir.mkdir()
    collection_dir = collections_dir / "test-collection"
    collection_dir.mkdir()

    # Create topics
    for i in range(2):
        topic_dir = collection_dir / f"topic-{i}"
        topic_dir.mkdir()
        (topic_dir / "topic.md").write_text(
            f"---\nname: topic-{i}\ntitle: Topic {i}\nstatus: draft\n---"
        )

    return repo_root

@pytest.fixture
def mock_invalid_repo(tmp_path):
    """Create an invalid repository (missing required files)."""
    repo_root = tmp_path / "invalid-repo"
    repo_root.mkdir()
    # Missing collections.json and collections/
    return repo_root
```

**Test Structure:**
```python
# tests/test_repo_config.py
import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from plugins.wt.skills.technical_content_creation.scripts.repo_config import (
    RepoValidator,
    load_collections_json,
    list_collections,
    list_topics_in_collection,
    # ... other imports
)

class TestRepoValidator:
    def test_validate_valid_repo_root(self, mock_valid_repo):
        validator = RepoValidator()
        is_valid, errors = validator.validate_repo_root(mock_valid_repo)
        assert is_valid
        assert len(errors) == 0

    def test_validate_missing_directory(self, tmp_path):
        validator = RepoValidator()
        is_valid, errors = validator.validate_repo_root(tmp_path / "nonexistent")
        assert not is_valid
        assert len(errors) > 0

    # ... more tests

class TestListCollections:
    def test_list_collections(self, mock_valid_repo):
        collections = list_collections(mock_valid_repo)
        assert len(collections) == 1
        assert collections[0]["id"] == "test-collection"

    # ... more tests
```

### Plan

1. **Setup** (5 minutes)
   - Create test file structure
   - Add imports
   - Create test class structure

2. **RepoValidator Tests** (15 minutes)
   - Test validate_repo_root (valid, invalid, missing)
   - Test validate_collection_dir

3. **load_collections_json() Tests** (5 minutes)
   - Test load, error cases

4. **list_collections() Tests** (10 minutes)
   - Test listing collections
   - Test empty list
   - Test repo_root from config

5. **list_topics_in_collection() Tests** (15 minutes)
   - Test listing topics
   - Test frontmatter parsing
   - Test topics without topic.md
   - Test sorting

6. **set_default_collection() Tests** (10 minutes)
   - Test setting default
   - Test invalid collection

7. **cmd_detect() Tests** (10 minutes)
   - Test detect with configured root
   - Test detect without configured root

8. **cmd_set_root() Tests** (10 minutes)
   - Test setting valid root
   - Test setting invalid root
   - Test path expansion

9. **cmd_validate() Tests** (5 minutes)
   - Test valid repository
   - Test invalid repository

10. **cmd_list_collections() Tests** (5 minutes)
    - Test listing collections

11. **cmd_list_topics() Tests** (5 minutes)
    - Test listing topics

12. **cmd_set_default_collection() Tests** (5 minutes)
    - Test setting default

13. **Edge Cases** (10 minutes)
    - Empty collections.json
    - Topics without topic.md
    - Malformed frontmatter

14. **Coverage Verification** (5 minutes)
    - Run pytest with coverage
    - Address uncovered lines

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test File | tests/test_repo_config.py | super-coder | 2026-01-30 |

### References

- [repo-config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/repo-config.py)
- [shared/config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py)
