---
name: python-module-registration
description: "Python dashed-filename import pattern: register hyphenated Python modules in conftest.py for pytest."
license: Apache-2.0
version: 1.2.0
created_at: 2026-03-24
updated_at: 2026-03-24
tags: [testing, python, pytest, engineering-core]
metadata:
  author: cc-agents
  platforms: "claude-code,codex,antigravity,opencode,openclaw"
  category: engineering-core
  interactions:
    - knowledge-only
see_also:
  - rd3:sys-testing
  - rd3:sys-testing/test-generation-patterns
  - rd3:sys-testing/coverage-analysis
---

# Python Module Registration for Dashed Filenames

When Python script files use hyphens in their filenames (e.g., `context-validator.py`), they cannot be imported directly because Python module names must use underscores. This pattern shows how to register these modules in `conftest.py` for pytest testing.

## Problem

```python
# File: context-validator.py (exists)
# File: context_validator.py (does not exist)

import context_validator  # ModuleNotFoundError: No module named 'context_validator'
```

## Solution: Dynamic Module Registration

Use `importlib.util.spec_from_file_location()` in `conftest.py` to map module names to file names:

### Basic Pattern (Single Module)

```python
# tests/conftest.py
import importlib.util
import sys
from pathlib import Path

_scripts_dir = Path(__file__).parent.parent / "scripts"
_module_file = _scripts_dir / "context-validator.py"
_module_name = "context_validator"

spec = importlib.util.spec_from_file_location(_module_name, _module_file)
if spec and spec.loader:
    module = importlib.util.module_from_spec(spec)
    if _module_name not in sys.modules:
        sys.modules[_module_name] = module
        spec.loader.exec_module(module)
```

### Production Pattern (Multiple Modules)

```python
# tests/conftest.py
"""
Pytest configuration and fixtures.
Handles module registration for scripts with dashes in their names.
"""

import importlib.util
import sys
from pathlib import Path

_scripts_dir = Path(__file__).parent.parent / "scripts"
_scripts_dir_abs = _scripts_dir.resolve()

_script_modules = {
    'context_validator': 'context-validator',
    'outline_generator': 'outline-generator',
    'repo_config': 'repo-config',
    'topic_init': 'topic-init',
}

for _module_name, _file_name in _script_modules.items():
    _module_file = _scripts_dir_abs / f"{_file_name}.py"
    if _module_file.exists():
        try:
            spec = importlib.util.spec_from_file_location(_module_name, _module_file)
            if spec and spec.loader:
                module = importlib.util.module_from_spec(spec)
                if _module_name not in sys.modules:
                    sys.modules[_module_name] = module
                    spec.loader.exec_module(module)
        except Exception as e:
            print(f"Warning: Could not register module {_module_name}: {e}")
```

## Best Practices

1. **Use absolute paths** — Always resolve to absolute paths to avoid import resolution issues
2. **Check module exists before registration** — Guard with `if _module_file.exists()`
3. **Handle exceptions gracefully** — Catch and log instead of crashing test suite
4. **Avoid re-registration** — Check `if _module_name not in sys.modules`
5. **Group related modules** — Organize modules by feature or directory

## Verification

```python
# tests/test_module_import.py
def test_module_import():
    """Verify that dashed module can be imported."""
    import context_validator
    assert hasattr(context_validator, 'validate')
```

## Common Issues

### Module Not Found After Registration

**Cause:** Registration happens after test collection.

**Fix:** Ensure registration is at module level in `conftest.py`, not inside a fixture.

### Relative Import Errors

**Cause:** Scripts directory not in Python path.

**Fix:** Add to sys.path if needed:

```python
import sys
_scripts_dir = str(Path(__file__).parent.parent / "scripts")
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)
```

### Circular Import

**Cause:** Module imports another module that hasn't been registered yet.

**Fix:** Order registration to handle dependencies first:

```python
_script_modules = [
    ('utils', 'utils'),              # Register first
    ('service', 'my-service'),      # Depends on utils
]
```

## Sources

- [Python importlib Documentation](https://docs.python.org/3/library/importlib.html)
- [Pytest Conftest Documentation](https://docs.pytest.org/en/stable/reference/fixtures.html)
