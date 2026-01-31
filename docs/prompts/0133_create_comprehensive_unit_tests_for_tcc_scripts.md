---
name: create-comprehensive-unit-tests-for-tcc-scripts
description: Orchestrate creation of comprehensive unit tests (85%+ coverage) for Python scripts in technical-content-creation skill
status: Done
created_at: 2026-01-30
updated_at: 2026-01-30
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: pending
  testing: completed
dependencies: [0134, 0135, 0136, 0137, 0138]
tags: [testing, pytest, unit-tests, tcc-skill]
---

## 0133. Create Comprehensive Unit Tests for TCC Scripts

### Background

The technical-content-creation skill contains 5 Python scripts that require comprehensive unit test coverage. These scripts handle critical functionality including configuration management, context validation, topic initialization, repository configuration, and outline generation.

**Scripts requiring tests:**
- `scripts/shared/config.py` (284 lines)
- `scripts/context-validator.py` (489 lines)
- `scripts/topic-init.py` (452 lines)
- `scripts/repo-config.py` (465 lines)
- `scripts/outline-generator.py` (840 lines)

Currently, only integration tests exist (see `tests/TEST_RESULTS.md`). No pytest-based unit tests have been written.

### Requirements / Objectives

**Functional Requirements:**
- Create pytest-based unit tests for all 5 Python scripts
- Achieve 85%+ code coverage measured by pytest-cov
- Use fixtures for common test setup (temp directories, mock configs)
- Mock external dependencies (file system, config files, CLI args)
- Test both success and failure paths
- Include edge cases (empty files, invalid paths, malformed JSON)

**Non-Functional Requirements:**
- Tests should be fast (< 5 seconds total execution)
- Tests should be isolated (no shared state)
- Tests should be maintainable and readable

**Test Structure Requirements:**
```
tests/
├── __init__.py
├── conftest.py                 # Shared fixtures
├── test_config.py              # Tests for shared/config.py
├── test_context_validator.py   # Tests for context-validator.py
├── test_topic_init.py          # Tests for topic-init.py
├── test_repo_config.py         # Tests for repo-config.py
└── test_outline_generator.py   # Tests for outline-generator.py
```

**Acceptance Criteria:**
- [ ] All 5 test files created with appropriate test cases
- [ ] pytest runs successfully with 0 failures
- [ ] pytest-cov reports 85%+ coverage for each module
- [ ] Edge cases covered (empty files, invalid paths, malformed JSON)
- [ ] Success and failure paths tested
- [ ] Fixtures properly abstract common setup

### Q&A

**Q:** Should tests mock the json-comment library or use the real implementation?
**A:** Tests should mock json-comment for predictable behavior, but also test the fallback behavior when the library is not available.

**Q:** Should CLI commands be tested via subprocess or direct function calls?
**A:** Test both - direct function calls for unit tests, subprocess calls for integration-style tests of CLI behavior.

### Design

**Technology Stack:**
- pytest >= 9.0.2 (already in pyproject.toml)
- pytest-cov >= 6.0.0 (already in pyproject.toml)
- freezegun >= 1.5.1 (already in pyproject.toml)
- pytest-mock for mocking

**Implementation Approach:**
1. Create conftest.py with shared fixtures
2. Create individual test files for each module
3. Use pytest's tmp_path and tmp_path_factory for file system mocking
4. Use unittest.mock.patch for external dependencies
5. Use pytest.mark.parametrize for data-driven tests

**Key Fixtures to Create:**
- `mock_config_dir` - Temporary config directory
- `mock_repo_root` - Temporary repository root with collections.json
- `mock_topic_dir` - Temporary topic directory with stage folders
- `mock_collections_json` - Mock collections.json data
- `mock_tcc_config` - Mock TCC configuration

### Plan

**Phase 1: Foundation** (Task 0134)
- [ ] Create tests/__init__.py
- [ ] Create tests/conftest.py with shared fixtures
- [ ] Create tests/test_config.py for shared/config.py

**Phase 2: Context Validator Tests** (Task 0135)
- [ ] Create tests/test_context_validator.py
- [ ] Test find_repo_root() function
- [ ] Test find_topic_context() function
- [ ] Test get_stage_status() function
- [ ] Test detect_current_stage() function
- [ ] Test verify_dependencies() function
- [ ] Test CLI commands (cmd_validate, cmd_status, etc.)

**Phase 3: Topic Init Tests** (Task 0136)
- [ ] Create tests/test_topic_init.py
- [ ] Test slugify() function
- [ ] Test load_collections_json() / save_collections_json()
- [ ] Test find_collection_by_id_or_name()
- [ ] Test create_collection()
- [ ] Test register_topic()
- [ ] Test create_topic_structure()
- [ ] Test cmd_init() CLI command

**Phase 4: Repo Config Tests** (Task 0137)
- [ ] Create tests/test_repo_config.py
- [ ] Test RepoValidator class methods
- [ ] Test load_collections_json()
- [ ] Test list_collections()
- [ ] Test list_topics_in_collection()
- [ ] Test set_default_collection()
- [ ] Test CLI commands (cmd_detect, cmd_set_root, etc.)

**Phase 5: Outline Generator Tests** (Task 0138)
- [ ] Create tests/test_outline_generator.py
- [ ] Test parse_frontmatter()
- [ ] Test read_research_brief()
- [ ] Test generate_outline_prompt()
- [ ] Test create_outline_option_frontmatter()
- [ ] Test create_outline_content()
- [ ] Test save_outline_option()
- [ ] Test copy_approved_outline()
- [ ] Test CLI commands (cmd_generate, cmd_approve, cmd_list)

**Phase 6: Coverage Verification**
- [ ] Run pytest with coverage: `pytest --cov=plugins/wt/skills/technical-content-creation/scripts --cov-report=html`
- [ ] Verify 85%+ coverage for all modules
- [ ] Review uncovered lines and add tests as needed

### Artifacts

| Type | Path | Generated By | Date |
|------|------|--------------|------|
| Test Foundation | tests/__init__.py | super-coder | 2026-01-30 |
| Shared Fixtures | tests/conftest.py | super-coder | 2026-01-30 |
| Config Tests | tests/test_config.py | super-coder | 2026-01-30 |
| Context Validator Tests | tests/test_context_validator.py | super-coder | 2026-01-30 |
| Topic Init Tests | tests/test_topic_init.py | super-coder | 2026-01-30 |
| Repo Config Tests | tests/test_repo_config.py | super-coder | 2026-01-30 |
| Outline Generator Tests | tests/test_outline_generator.py | super-coder | 2026-01-30 |
| Coverage Report | htmlcov/index.html | pytest-cov | 2026-01-30 |

### References

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Target Scripts](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/scripts/)
- [Integration Test Results](/Users/robin/projects/cc-agents/plugins/wt/skills/technical-content-creation/tests/TEST_RESULTS.md)
- [Project pyproject.toml](/Users/robin/projects/cc-agents/pyproject.toml)
