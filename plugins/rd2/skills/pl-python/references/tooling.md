# Modern Python Tooling

Complete guide to modern Python development tools and configuration.

## Table of Contents

1. [Package Management](#package-management)
2. [Code Quality Pipeline](#code-quality-pipeline)
3. [Testing Tools](#testing-tools)
4. [Pre-commit Hooks](#pre-commit-hooks)
5. [CI/CD Configuration](#cicd-configuration)
6. [Development Workflow](#development-workflow)

---

## Package Management

### uv Package Manager (Recommended)

**Why uv:** 10-100x faster than pip, written in Rust, compatible with pip.

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment
uv venv

# Activate (varies by shell)
source .venv/bin/activate  # bash/zsh
.venv\Scripts\activate     # Windows

# Install package
uv pip install fastapi

# Install with dev dependencies
uv pip install -e ".[dev]"

# Generate lockfile (reproducible builds)
uv pip compile pyproject.toml -o requirements.lock

# Install from lockfile
uv pip sync requirements.lock
```

### pyproject.toml (Modern Standard)

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myproject"
version = "0.1.0"
description = "Project description"
readme = "README.md"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "Your Name", email = "you@example.com"}
]

# Core dependencies
dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.6.0",
    "pydantic-settings>=2.2.0",
    "httpx>=0.27.0",
    "sqlalchemy>=2.0.0",
]

# Optional dependency groups
[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-cov>=4.1.0",
    "hypothesis>=6.98.0",
]
lint = [
    "mypy>=1.8.0",
    "ruff>=0.3.0",
]
all = [
    "myproject[dev,lint]",
]

# CLI entry points
[project.scripts]
myapp = "myproject.cli:main"

# Tool configurations
[tool.ruff]
target-version = "py311"
line-length = 88
select = [
    "E",    # pycodestyle errors
    "W",    # pycodestyle warnings
    "F",    # Pyflakes
    "I",    # isort
    "B",    # flake8-bugbear
    "C4",   # flake8-comprehensions
    "UP",   # pyupgrade
    "ARG",  # flake8-unused-arguments
    "SIM",  # flake8-simplify
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = [
    "-ra",
    "--strict-markers",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html",
]

[tool.coverage.run]
source = ["src"]
branch = true
omit = [
    "*/tests/*",
    "*/test_*.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

### Dependency Groups

```toml
# pyproject.toml
[project.optional-dependencies]
# Development tools
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.1",
    "hypothesis>=6.98",
]
# Linting and formatting
lint = [
    "ruff>=0.3.0",
    "mypy>=1.8.0",
]
# Documentation
docs = [
    "mkdocs>=1.5",
    "mkdocs-material>=9.0",
]
# All together
all = ["myproject[dev,lint,docs]"]

# Install specific group
uv pip install -e ".[dev]"
uv pip install -e ".[dev,lint]"
```

---

## Code Quality Pipeline

### ruff (Linter + Formatter)

**Why ruff:** Replaces black, flake8, isort, pyupgrade - 10-100x faster.

```bash
# Check code
ruff check src/

# Auto-fix issues
ruff check --fix src/

# Format code
ruff format src/

# Check and format
ruff check --fix src/ && ruff format src/
```

### ruff Configuration

```toml
[tool.ruff]
# Target Python version
target-version = "py311"

# Line length
line-length = 88

# Directories to exclude
exclude = [
    ".git",
    ".venv",
    "__pycache__",
    "build",
    "dist",
]

# Enable specific rule sets
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # Pyflakes
    "I",      # isort
    "N",      # pep8-naming
    "UP",     # pyupgrade
    "B",      # flake8-bugbear
    "C4",     # flake8-comprehensions
    "SIM",    # flake8-simplify
    "RUF",    # Ruff-specific rules
]

# Ignore specific rules
ignore = [
    "E501",   # Line too long (formatter handles)
    "B008",   # Do not perform function calls in argument defaults
]
```

### mypy (Type Checker)

```bash
# Check code
mypy src/

# Strict mode
mypy --strict src/

# Specific file
mypy src/module.py

# Show error codes
mypy --show-error-codes src/

# Generate HTML report
mypy --html-report ./mypy-report src/
```

### mypy Configuration

```toml
[tool.mypy]
# Python version
python_version = "3.11"

# Strict mode
strict = true

# Warnings
warn_return_any = true
warn_unused_configs = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_no_return = true

# Disallow
disallow_untyped_defs = true
disallow_incomplete_defs = true
disallow_any_generics = true
disallow_untyped_calls = false  # Allow for third-party
check_untyped_defs = true

# Follow imports
follow_imports = "normal"
ignore_missing_imports = false

# Per-module overrides
[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false

[[tool.mypy.overrides]]
module = "third_party_lib.*"
ignore_missing_imports = true
```

### Alternative: basedpyright

**Stricter defaults than mypy, better VS Code integration.**

```bash
# Install
uv pip install basedpyright

# Run
basedpyright src/
```

---

## Testing Tools

### pytest (Test Runner)

```bash
# Run all tests
pytest

# Run specific file
pytest tests/test_module.py

# Run with coverage
pytest --cov=src --cov-report=html

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run specific test
pytest tests/test_module.py::test_function

# Run by marker
pytest -m "not slow"
```

### pytest-asyncio (Async Tests)

```bash
# Install
uv pip install pytest-asyncio

# Auto mode (recommended)
# pyproject.toml:
# [tool.pytest.ini_options]
# asyncio_mode = "auto"
```

### pytest Configuration

```toml
[tool.pytest.ini_options]
# Async mode
asyncio_mode = "auto"

# Test discovery
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

# Output options
addopts = [
    "-ra",                      # Show summary of all results
    "--strict-markers",         # Error on unknown markers
    "--strict-config",          # Error on invalid config
    "--cov=src",                # Coverage source
    "--cov-report=term-missing",# Coverage in terminal
    "--cov-report=html",        # Coverage HTML report
]

# Markers
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests as integration tests",
    "unit: marks tests as unit tests",
]
```

### hypothesis (Property-Based Testing)

```python
# Install
uv pip install hypothesis

# Usage
from hypothesis import given, strategies as st

@given(st.lists(st.integers()))
def test_sorted_is_idempotent(xs):
    """Sorted twice equals sorted once."""
    assert sorted(sorted(xs)) == sorted(xs)

@given(st.text(min_size=1))
def test_roundtrip(s):
    """Encoding then decoding returns original."""
    assert decode(encode(s)) == s
```

---

## Pre-commit Hooks

### .pre-commit-config.yaml

```yaml
# .pre-commit-config.yaml
repos:
  # Ruff - linter and formatter
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  # mypy - type checker
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
        additional_dependencies:
          - pydantic>=2.0
          - types-requests

  # Check for large files
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-json
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: check-merge-conflict
      - id: check-case-conflict
      - id: detect-private-key
      - id: mixed-line-ending
```

### Installing Pre-commit Hooks

```bash
# Install pre-commit
uv pip install pre-commit

# Install hooks
pre-commit install

# Run on all files
pre-commit run --all-files

# Update hooks
pre-commit autoupdate
```

---

## CI/CD Configuration

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12", "3.13"]

    steps:
    - uses: actions/checkout@v4

    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v5
      with:
        python-version: ${{ matrix.python-version }}
        cache: 'pip'

    - name: Install uv
      run: |
        curl -LsSf https://astral.sh/uv/install.sh | sh
        echo "$HOME/.cargo/bin" >> $GITHUB_PATH

    - name: Install dependencies
      run: |
        uv pip install -e ".[dev]"

    - name: Run ruff
      run: |
        ruff check .
        ruff format --check .

    - name: Run mypy
      run: mypy src/

    - name: Run pytest
      run: |
        pytest --cov=src --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v4
      with:
        file: ./coverage.xml
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  image: python:3.12
  parallel:
    matrix:
      - PYTHON_VERSION: ["3.11", "3.12", "3.13"]
  before_script:
    - pip install uv
    - uv venv
    - source .venv/bin/activate
    - uv pip install -e ".[dev]"
  script:
    - ruff check .
    - ruff format --check .
    - mypy src/
    - pytest --cov=src --cov-report=term
  coverage: '/TOTAL.*\s+(\d+%)$/'
```

---

## Development Workflow

### Makefile

```makefile
# Makefile
.PHONY: help install lint test format clean

help:
	@echo "Available targets:"
	@echo "  install    - Install dependencies"
	@echo "  lint       - Run linters"
	@echo "  test       - Run tests"
	@echo "  format     - Format code"
	@echo "  clean      - Clean build artifacts"

install:
	uv pip install -e ".[dev]"

lint:
	ruff check .
	mypy src/

test:
	pytest

format:
	ruff check --fix .
	ruff format .

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name '*.pyc' -delete
	find . -type f -name '*.coverage' -delete
	rm -rf .pytest_cache .mypy_cache htmlcov dist build *.egg-info
```

### VS Code Settings

```json
// .vscode/settings.json
{
  "[python]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliemarshall.ruff",
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "ruff.lint.args": ["--fix"],
  "ruff.format.args": ["--line-length=88"],
  "mypy-type-checker.args": ["--strict"],
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  "python.testing.unittestEnabled": false
}
```

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| **Install dependencies** | `uv pip install -e ".[dev]"` |
| **Run linting** | `ruff check .` |
| **Auto-fix linting** | `ruff check --fix .` |
| **Format code** | `ruff format .` |
| **Type check** | `mypy src/` |
| **Run tests** | `pytest` |
| **Test with coverage** | `pytest --cov=src` |
| **Install pre-commit** | `pre-commit install` |
| **Run pre-commit** | `pre-commit run --all-files` |

### Tool Equivalents

| Old Tool | New Tool | Why Switch |
|----------|----------|------------|
| pip | uv | 10-100x faster |
| black | ruff format | 10-100x faster |
| flake8 | ruff check | 10-100x faster |
| isort | ruff check (I) | Unified tool |
| pyupgrade | ruff check (UP) | Unified tool |
| pylint | ruff | Faster, fewer false positives |

### Recommended Tool Versions

| Tool | Minimum Version | Latest Stable |
|------|----------------|---------------|
| Python | 3.11+ | 3.13 |
| uv | 0.1+ | 0.5+ |
| ruff | 0.3+ | 0.8+ |
| mypy | 1.8+ | 1.11+ |
| pytest | 8.0+ | 8.3+ |
| hypothesis | 6.98+ | 6.115+ |

---

## References

- [uv documentation](https://github.com/astral-sh/uv)
- [ruff documentation](https://docs.astral.sh/ruff/)
- [mypy documentation](https://mypy.readthedocs.io/)
- [pytest documentation](https://docs.pytest.org/)
- [pre-commit documentation](https://pre-commit.com/)
