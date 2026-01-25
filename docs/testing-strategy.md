# Testing Strategy

Comprehensive testing strategy for the rd2 plugin, including test coverage, testing approach by skill type, and CI/CD integration.

## Overview

The rd2 plugin follows a comprehensive testing strategy with emphasis on:
- High test coverage for critical skills
- Integration testing for multi-skill workflows
- End-to-end testing for agent coordination
- Manual testing for user-facing commands

## Test Coverage Summary

### Overall Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| **code-review-gemini** | 98% (98/98 tests) | Excellent |
| **code-review-opencode** | 95%+ | Excellent |
| **anti-hallucination** | 98% (115 tests) | Excellent |
| **coder-* skills** | 0% | Not Tested |
| **code-review-claude** | 0% | Not Tested |
| **code-review-auggie** | 0% | Not Tested |
| **task-decomposition** | 0% | Not Tested |
| **tdd-workflow** | N/A | Documentation only |
| **super-* agents** | N/A | Manual testing |

**Overall Plugin Health:** ~60% coverage (weighted by criticality)

### Coverage by Type

| Type | Coverage | Notes |
|------|----------|-------|
| **Script Logic** | 95%+ | Excellent coverage for Python scripts |
| **Skill Behavior** | 0% | No automated testing of skill invocation |
| **Agent Coordination** | 0% | No automated testing of agent workflows |
| **CLI Commands** | 0% | No automated testing of slash commands |
| **Documentation** | Manual | Reviewed for accuracy |

## Testing Strategy by Skill Type

### 1. Code Generation Skills (coder-*)

**Status:** NOT TESTED (0% coverage)

**Challenges:**
- Requires external CLI tools (Gemini, OpenCode, Auggie MCP)
- Tests would need to mock external tool calls
- Or use actual tool calls (expensive, slow)

**Recommended Approach:**

**Phase 1: Unit Tests (Mocked)**
```python
# Test: Skill selects correct model
def test_coder_gemini_model_selection():
    skill = CoderGemini()
    assert skill.select_model(complexity="high") == "gemini-2.5-pro"
    assert skill.select_model(complexity="low") == "gemini-2.5-flash"

# Test: Skill generates correct command
def test_coder_gemini_command_generation():
    skill = CoderGemini()
    cmd = skill.generate_command("Create auth API")
    assert "gemini" in cmd
    assert "generate" in cmd
```

**Phase 2: Integration Tests (Real Tools)**
```python
# Test: Actual code generation (slow, requires API keys)
@pytest.mark.slow
@pytest.mark.requires_api_key
def test_coder_gemini_real_generation():
    skill = CoderGemini()
    result = skill.generate("Create a hello world function")
    assert "def" in result or "function" in result
```

**Phase 3: Manual Testing**
- Use skills in real workflows
- Verify output quality
- Document edge cases

### 2. Code Review Skills (code-review-*)

**Status:** PARTIALLY TESTED

**code-review-gemini:**
- ✅ 98% coverage (98/98 tests passing)
- ✅ Tests cover: script logic, parsing, output formatting
- ❌ Tests do NOT cover: actual Gemini CLI invocation

**code-review-opencode:**
- ✅ 95%+ coverage (7 test files)
- ✅ Most comprehensive test suite
- ❌ Tests do NOT cover: actual OpenCode CLI invocation

**code-review-claude:**
- ❌ No automated tests
- ⚠️ Manual testing only

**code-review-auggie:**
- ❌ No automated tests
- ⚠️ Manual testing only

**Recommended Approach:**

**For code-review-claude and code-review-auggie:**

Follow the code-review-gemini pattern:

```python
# tests/test_code_review_claude.py
def test_claude_review_parsing():
    # Test: Parse review output format
    pass

def test_claude_focus_areas():
    # Test: Focus area mapping
    pass

def test_claude_quality_scoring():
    # Test: Quality score calculation
    pass

# Target: 90%+ coverage matching code-review-gemini
```

### 3. Workflow Skills (tdd-workflow, task-decomposition)

**Status:** NOT TESTED (0% coverage)

**tdd-workflow:**
- N/A - Documentation/guidance only
- Testing happens in actual TDD execution

**task-decomposition:**
- ❌ No automated tests
- ⚠️ Manual testing only

**Recommended Approach:**

**For task-decomposition:**

```python
# tests/test_task_decomposition.py
def test_wbs_assignment():
    # Test: WBS# auto-assignment
    decomposer = TaskDecomposition()
    wbs = decomposer.get_next_wbs()
    assert wbs == "0001"  # First task

def test_task_file_generation():
    # Test: Task file creation
    decomposer = TaskDecomposition()
    tasks = decomposer.decompose("Add auth")
    files = decomposer.create_task_files(tasks, dry_run=True)
    assert len(files) > 0

def test_dependency_tracking():
    # Test: Dependency resolution
    decomposer = TaskDecomposition()
    # Add task with dependencies
    # Verify circular dependency detection
    pass

# Target: 80%+ coverage
```

### 4. Coordination Layer (super-* agents)

**Status:** NOT TESTED (0% coverage)

**Challenges:**
- Agents orchestrate multiple skills
- Requires mocking all delegated skills
- Complex workflow states

**Recommended Approach:**

**Phase 1: Unit Tests (Mocked)**
```python
# tests/test_super_coder.py
def test_super_coder_tool_selection():
    # Test: Auto-selection logic
    agent = SuperCoder()
    tool = agent.select_tool(loc=100, complexity="simple")
    assert tool == "claude"

def test_super_coder_workflow_steps():
    # Test: 17-step workflow state machine
    agent = SuperCoder()
    assert agent.current_step == 1
    agent.advance_step()
    assert agent.current_step == 2

# Target: 70%+ coverage for decision logic
```

**Phase 2: Integration Tests (Real Skills)**
```python
# tests/integration/test_super_coder_workflow.py
@pytest.mark.integration
def test_super_coder_complete_workflow():
    # Test: Full workflow with real skills
    agent = SuperCoder()
    result = agent.execute_task("Create hello world")
    assert result["status"] == "done"

# Target: Manual testing only (too complex for automated)
```

### 5. CLI Commands (slash commands)

**Status:** NOT TESTED (0% coverage)

**Challenges:**
- Commands are markdown files with frontmatter
- Invocation depends on Claude Code runtime
- No direct programmatic entry point

**Recommended Approach:**

**Manual Testing Checklist:**
- [ ] `/super-coder "test"` works correctly
- [ ] `/super-planner "test"` works correctly
- [ ] `/super-code-reviewer src/` works correctly
- [ ] Task file paths are resolved correctly
- [ ] Error messages are helpful

**Future: CLI Testing Framework**
```python
# Potential future: Claude Code CLI testing framework
def test_super_coder_command():
    runner = ClaudeCommandRunner()
    result = runner.run("/super-coder test")
    assert result.exit_code == 0
```

## CI/CD Integration

### Current Status

**No CI/CD integration exists for the rd2 plugin.**

### Recommended CI/CD Setup

**Phase 1: Basic Testing Pipeline**

```yaml
# .github/workflows/rd2-tests.yml
name: RD2 Plugin Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install pytest pytest-cov mypy

      - name: Run code-review-gemini tests
        run: |
          pytest plugins/rd2/skills/code-review-gemini/tests/

      - name: Run anti-hallucination tests
        run: |
          pytest plugins/rd2/skills/anti-hallucination/tests/

      - name: Check test coverage
        run: |
          pytest --cov=plugins/rd2/skills --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

**Phase 2: Extended Testing Pipeline**

```yaml
# Additions for Phase 2

      - name: Run all skill tests
        run: |
          pytest plugins/rd2/skills/*/tests/

      - name: Type checking
        run: |
          mypy plugins/rd2/skills/*/scripts/

      - name: Linting
        run: |
          ruff check plugins/rd2/
```

**Phase 3: Integration Testing Pipeline**

```yaml
# Additions for Phase 3

      - name: Integration tests (requires API keys)
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          pytest plugins/rd2/integration-tests/ --slow
```

### Test Execution Requirements

**Local Testing:**

```bash
# Run all tests
pytest plugins/rd2/skills/*/tests/

# Run specific skill tests
pytest plugins/rd2/skills/code-review-gemini/tests/

# Run with coverage
pytest --cov=plugins/rd2/skills --cov-report=html

# Run slow tests (requires API keys)
pytest --slow -m "not slow"
```

**Pre-commit Hooks:**

```bash
# .git/hooks/pre-commit
#!/bin/bash
# Run fast tests before commit
pytest plugins/rd2/skills/*/tests/ -m "not slow"
```

## Test Quality Standards

### Code Coverage Targets

| Component Type | Target Coverage | Rationale |
|----------------|-----------------|-----------|
| **Critical scripts** | 90%+ | High business impact |
| **Skill logic** | 80%+ | Moderate complexity |
| **Agent coordination** | 70%+ | Complex, hard to test |
| **CLI commands** | 0% | Manual testing only |

### Test Naming Conventions

```python
# Good test names
def test_wbs_assignment_returns_next_available_number()
def test_gemini_review_output_parses_quality_score()
def test_super_coder_selects_claude_for_simple_tasks()

# Bad test names
def test_wbs()
def test_parse()
def test_selection()
```

### Test Organization

```
plugins/rd2/skills/{skill}/
├── scripts/
│   └── {skill}.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Shared fixtures
│   ├── test_{skill}.py      # Unit tests
│   ├── test_integration.py  # Integration tests
│   └── fixtures/
│       └── test_data.md     # Sample inputs
└── SKILL.md
```

## Testing Best Practices

### 1. Mock External Dependencies

```python
# Good: Mock external CLI calls
@patch('subprocess.run')
def test_gemini_availability(mock_run):
    mock_run.return_value = CompletedProcess([], 0)
    skill = CoderGemini()
    assert skill.check() == True

# Bad: Real external call
def test_gemini_availability():
    skill = CoderGemini()
    assert skill.check() == True  # Fails if Gemini not installed
```

### 2. Use Fixtures for Shared Data

```python
# conftest.py
@pytest.fixture
def sample_review_output():
    return """
    ---
    type: code-review
    quality_score: 8
    ---
    """

# test_code_review.py
def test_parse_review(sample_review_output):
    result = parse_review(sample_review_output)
    assert result["quality_score"] == 8
```

### 3. Test Error Cases

```python
# Test: Handle missing tool gracefully
def test_gemini_unavailable_fallback():
    skill = CoderGemini()
    with patch.object(skill, 'check', return_value=False):
        tool = skill.select_tool()
        assert tool == "claude"  # Fallback
```

### 4. Parameterized Tests

```python
@pytest.mark.parametrize("loc,expected_tool", [
    (100, "claude"),
    (800, "gemini-flash"),
    (2500, "gemini-pro"),
])
def test_super_coder_tool_selection(loc, expected_tool):
    agent = SuperCoder()
    tool = agent.select_tool(loc=loc)
    assert tool == expected_tool
```

## Roadmap

### Immediate (Q1 2026)

- [ ] Add tests for code-review-claude (target: 90% coverage)
- [ ] Add tests for code-review-auggie (target: 90% coverage)
- [ ] Add tests for task-decomposition (target: 80% coverage)
- [ ] Set up basic CI/CD pipeline

### Short-term (Q2 2026)

- [ ] Add unit tests for coder-* skills (mocked)
- [ ] Add unit tests for super-* agents (mocked)
- [ ] Extend CI/CD with integration tests
- [ ] Add pre-commit hooks

### Long-term (Q3-Q4 2026)

- [ ] Achieve 80%+ overall coverage
- [ ] Implement CLI testing framework
- [ ] Add end-to-end workflow tests
- [ ] Performance testing for large-scale tasks

## Related Documentation

- **TDD Workflow**: `plugins/rd2/skills/tdd-workflow/SKILL.md`
- **Workflow**: `docs/rd2-workflow.md`
- **Architecture**: `docs/rd2-architecture.md`
