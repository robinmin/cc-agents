---
name: create-test-topic-init-py
description: Create pytest unit tests for topic-init.py (slugify, create_collection, register_topic, create_topic_structure, cmd_init)
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
tags: [testing, pytest, topic-init, collections]
---

## 0136. Create test_topic_init.py

### Background

The `topic-init.py` script (452 lines) handles topic and collection initialization for the technical-content-creation skill. Key functionality includes:
- URL-friendly slug generation
- Collection management (create, find)
- Topic registration in collections.json
- 7-stage folder structure creation
- topic.md file generation with frontmatter

This script creates the foundational structure for all new topics.

### Requirements / Objectives

**Functions to Test:**
- `slugify(text)` - Convert text to URL-friendly slug
- `load_collections_json(repo_root)` - Load collections.json
- `save_collections_json(repo_root, data)` - Save collections.json
- `find_collection_by_id_or_name(collections_data, identifier)` - Find collection
- `create_collection(repo_root, collections_data, collection_name)` - Create new collection
- `register_topic(repo_root, collection_id, topic_id)` - Register topic
- `create_topic_structure(repo_root, collection_id, topic_id, topic_data)` - Create topic structure
- `cmd_init(args)` - Initialize topic CLI command

**Test Cases Required:**

1. **slugify()**
   - [ ] Converts spaces to hyphens
   - [ ] Removes special characters
   - [ ] Converts to lowercase
   - [ ] Handles multiple consecutive spaces/hyphens
   - [ ] Handles leading/trailing spaces
   - [ ] Handles empty string

2. **load_collections_json() / save_collections_json()**
   - [ ] Load valid collections.json
   - [ ] Save collections.json with proper formatting
   - [ ] Update last_updated timestamp
   - [ ] FileNotFoundError when file missing
   - [ ] JSONDecodeError for malformed JSON

3. **find_collection_by_id_or_name()**
   - [ ] Find by exact ID
   - [ ] Find by name
   - [ ] Return None when not found
   - [ ] Handle empty collections list

4. **create_collection()**
   - [ ] Create collection directory
   - [ ] Add collection to collections.json
   - [ ] Set proper metadata (created_at, updated_at, topic_count)
   - [ ] Use slugified ID from name
   - [ ] Raise ValueError if collection exists
   - [ ] Save updated collections.json

5. **register_topic()**
   - [ ] Increment topic_count for collection
   - [ ] Update updated_at timestamp
   - [ ] Save updated collections.json

6. **create_topic_structure()**
   - [ ] Create all 7 stage folders
   - [ ] Create subfolders (draft-revisions, images, etc.)
   - [ ] Create topic.md with proper frontmatter
   - [ ] Use topic_data for frontmatter fields
   - [ ] Handle custom collections_path from config

7. **cmd_init()**
   - [ ] Create topic with minimal args
   - [ ] Create topic with all args
   - [ ] Auto-create collection if enabled
   - [ ] Error if collection not found and auto-create disabled
   - [ ] Error if repo_root not configured
   - [ ] Print success message

8. **Edge Cases**
   - [ ] Collection name with special characters
   - [ ] Topic ID conflicts (existing topic directory)
   - [ ] Empty collections.json
   - [ ] Malformed collections.json
   - [ ] Missing collections directory
   - [ ] Unicode in topic data

**Acceptance Criteria:**
- [ ] 85%+ code coverage for topic-init.py
- [ ] All functions tested with success and failure paths
- [ ] Topic structure verification (all folders created)
- [ ] Frontmatter validation (topic.md content)

### Design

**Key Fixtures Needed:**
```python
# In conftest.py
@pytest.fixture
def mock_collections_json(tmp_path):
    """Create a mock collections.json file."""
    repo_root = tmp_path / "repo"
    repo_root.mkdir()
    collections_dir = repo_root / "collections"
    collections_dir.mkdir()

    collections_file = repo_root / "collections.json"
    collections_data = {
        "collections": [
            {
                "id": "test-collection",
                "name": "Test Collection",
                "path": "collections/test-collection",
                "topic_count": 0,
                "created_at": "2026-01-30",
                "updated_at": "2026-01-30"
            }
        ]
    }
    collections_file.write_text(json.dumps(collections_data, indent=2))

    return repo_root

@pytest.fixture
def mock_args():
    """Create mock CLI arguments."""
    return MagicMock(
        topic="test-topic",
        collection="test-collection",
        title="Test Topic",
        description="A test topic",
        author="Test Author",
        email="test@example.com",
        tag="test",
        notes="Test notes"
    )
```

**Test Structure:**
```python
# tests/test_topic_init.py
import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from plugins.wt.skills.technical_content_creation.scripts.topic_init import (
    slugify,
    load_collections_json,
    save_collections_json,
    # ... other imports
)

class TestSlugify:
    def test_slugify_simple_text(self):
        assert slugify("Hello World") == "hello-world"

    def test_slugify_special_chars(self):
        assert slugify("Hello, World!") == "hello-world"

    # ... more tests

class TestCollectionsJson:
    def test_load_collections_json(self, mock_collections_json):
        data = load_collections_json(mock_collections_json)
        assert "collections" in data
        assert len(data["collections"]) == 1

    # ... more tests

class TestCreateCollection:
    def test_create_new_collection(self, mock_collections_json):
        data = load_collections_json(mock_collections_json)
        new_col = create_collection(mock_collections_json, data, "New Collection")
        assert new_col["id"] == "new-collection"
        assert (mock_collections_json / "collections" / "new-collection").exists()

    # ... more tests
```

### Plan

1. **Setup** (5 minutes)
   - Create test file structure
   - Add imports
   - Create test class structure

2. **slugify() Tests** (10 minutes)
   - Test simple text
   - Test special characters
   - Test edge cases (empty, multiple spaces, etc.)

3. **load_collections_json() / save_collections_json() Tests** (10 minutes)
   - Test load/save
   - Test timestamp update
   - Test error cases

4. **find_collection_by_id_or_name() Tests** (10 minutes)
   - Test find by ID
   - Test find by name
   - Test not found

5. **create_collection() Tests** (15 minutes)
   - Test successful creation
   - Test directory creation
   - Test collections.json update
   - Test duplicate error

6. **register_topic() Tests** (10 minutes)
   - Test topic count increment
   - Test timestamp update

7. **create_topic_structure() Tests** (20 minutes)
   - Test all stage folders created
   - Test subfolders created
   - Test topic.md content
   - Test frontmatter validation

8. **cmd_init() Tests** (20 minutes)
   - Test basic topic creation
   - Test with all options
   - Test auto-create collection
   - Test error cases

9. **Edge Cases** (10 minutes)
   - Test special characters
   - Test unicode
   - Test missing collections.json

10. **Coverage Verification** (5 minutes)
    - Run pytest with coverage
    - Address uncovered lines

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test File | tests/test_topic_init.py | super-coder | 2026-01-30 |

### References

- [topic-init.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/topic-init.py)
- [shared/config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py)
