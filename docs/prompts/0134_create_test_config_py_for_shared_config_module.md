---
name: create-test-config-py-for-shared-config-module
description: Create pytest unit tests for shared/config.py module (load_jsonc, save_jsonc, get_tcc_config, etc.)
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
tags: [testing, pytest, config, jsonc]
---

## 0134. Create test_config.py for shared/config.py

### Background

The `shared/config.py` module (284 lines) provides core configuration management functionality for the technical-content-creation skill. It handles:
- JSONC (JSON with Comments) parsing using the json-comment library
- Configuration file loading and saving
- TCC-specific configuration management
- Repository root path management

This module is a dependency for all other scripts, so testing it first provides confidence for subsequent tests.

### Requirements / Objectives

**Functions/Classes to Test:**
- `WTConfigPath` class (CONFIG_DIR, CONFIG_FILE, TCC_SECTION attributes)
- `load_jsonc(file_path)` - Load JSONC files
- `save_jsonc(data, file_path, pretty=True)` - Save as JSONC
- `ensure_config_exists()` - Create default config
- `get_wt_config()` - Load entire wt configuration
- `get_tcc_config()` - Get TCC section with defaults
- `set_tcc_config(key, value)` - Update TCC config key
- `get_tcc_repo_root()` - Get repo root path
- `set_tcc_repo_root(path)` - Set repo root path
- `print_config()` - Print configuration (CLI output)

**Test Cases Required:**

1. **WTConfigPath class**
   - [ ] Verify CONFIG_DIR path is correct (~/.claude/wt)
   - [ ] Verify CONFIG_FILE path is correct
   - [ ] Verify TCC_SECTION constant

2. **load_jsonc()**
   - [ ] Valid JSONC file loads successfully
   - [ ] FileNotFoundError raised for missing file
   - [ ] JSONDecodeError raised for malformed JSONC
   - [ ] With json-comment library: comments are stripped
   - [ ] Without json-comment library: error message suggests installation

3. **save_jsonc()**
   - [ ] Valid data saved correctly
   - [ ] Pretty printing with indent=2
   - [ ] Header added to new files
   - [ ] Parent directories created as needed
   - [ ] Existing files updated without duplicate header

4. **ensure_config_exists()**
   - [ ] Creates config directory if missing
   - [ ] Creates config file with defaults if missing
   - [ ] Does not overwrite existing config

5. **get_wt_config()**
   - [ ] Returns loaded config dict
   - [ ] Returns empty dict if config doesn't exist
   - [ ] Raises JSONDecodeError for malformed config

6. **get_tcc_config()**
   - [ ] Returns TCC section with all required keys
   - [ ] Adds missing keys with defaults
   - [ ] Handles empty TCC section

7. **set_tcc_config()**
   - [ ] Updates valid key successfully
   - [ ] Raises ValueError for invalid key
   - [ ] Updates last_updated timestamp
   - [ ] Creates TCC section if missing

8. **get_tcc_repo_root()**
   - [ ] Returns Path object when configured
   - [ ] Returns None when not configured

9. **set_tcc_repo_root()**
   - [ ] Sets valid path successfully
   - [ ] Expands user path (~)
   - [ ] Resolves to absolute path
   - [ ] Raises FileNotFoundError for non-existent path

10. **Edge Cases**
    - [ ] Empty JSONC file
    - [ ] JSONC with only comments
    - [ ] Malformed JSON (trailing commas)
    - [ ] Unicode content in config
    - [ ] Path with spaces
    - [ ] Path with special characters

**Acceptance Criteria:**
- [ ] 85%+ code coverage for shared/config.py
- [ ] All functions tested with success and failure paths
- [ ] Edge cases covered
- [ ] Mocks used appropriately (tmp_path for file operations, patch for json-comment)

### Design

**Key Fixtures Needed:**
```python
# In conftest.py
@pytest.fixture
def mock_config_dir(tmp_path):
    """Temporary config directory for testing."""
    config_dir = tmp_path / ".claude" / "wt"
    config_dir.mkdir(parents=True)
    return config_dir

@pytest.fixture
def mock_jsonc_file(mock_config_dir):
    """Create a sample JSONC file."""
    config_file = mock_config_dir / "config.jsonc"
    config_file.write_text("// Comment\n{\n  \"key\": \"value\"\n}")
    return config_file
```

**Test Structure:**
```python
# tests/test_config.py
import pytest
from pathlib import Path
from unittest.mock import patch
from plugins.wt.skills.technical_content_creation.scripts.shared.config import (
    load_jsonc,
    save_jsonc,
    get_tcc_config,
    # ... other imports
)

class TestLoadJsonc:
    def test_load_valid_jsonc(self, mock_jsonc_file):
        # Test loading valid JSONC
        pass

    def test_load_file_not_found(self, tmp_path):
        # Test FileNotFoundError
        pass

    # ... more tests

class TestSaveJsonc:
    def test_save_with_pretty_print(self, tmp_path):
        # Test saving with indentation
        pass

    # ... more tests
```

### Plan

1. **Setup** (5 minutes)
   - Create test file structure
   - Add imports
   - Create test class structure

2. **WTConfigPath Tests** (5 minutes)
   - Test class attributes

3. **load_jsonc() Tests** (15 minutes)
   - Success case: valid JSONC
   - Failure cases: missing file, malformed JSON
   - Edge cases: comments, empty file

4. **save_jsonc() Tests** (15 minutes)
   - Success case: save valid data
   - Test header creation
   - Test directory creation
   - Test existing file handling

5. **ensure_config_exists() Tests** (10 minutes)
   - Test directory creation
   - Test file creation with defaults

6. **get_wt_config() / get_tcc_config() Tests** (10 minutes)
   - Test loading config
   - Test defaults
   - Test empty config

7. **set_tcc_config() Tests** (10 minutes)
   - Test valid key update
   - Test invalid key error
   - Test timestamp update

8. **get_tcc_repo_root() / set_tcc_repo_root() Tests** (10 minutes)
   - Test path resolution
   - Test user expansion
   - Test validation

9. **Edge Cases** (10 minutes)
   - Empty files
   - Malformed JSON
   - Unicode content

10. **Coverage Verification** (5 minutes)
    - Run pytest with coverage
    - Address uncovered lines

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test File | tests/test_config.py | super-coder | 2026-01-30 |

### References

- [shared/config.py](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/shared/config.py)
- [json-comment library](https://pypi.org/project/json-comment/)
- [pytest tmp_path fixture](https://docs.pytest.org/en/stable/how-to/tmpdir.html)
