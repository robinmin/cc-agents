# Python Module Registration for Dashed Filenames

## Overview

When Python script files use hyphens in their filenames (e.g., `context-validator.py`), they cannot be imported directly because Python module names must use underscores (e.g., `context_validator`). This pattern shows how to register these modules in `conftest.py` for pytest testing.

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

# Get the scripts directory
_scripts_dir = Path(__file__).parent.parent / "scripts"
_scripts_dir_abs = _scripts_dir.resolve()

# Register modules (hyphenated filename -> underscored module name)
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

### 1. Use Absolute Paths

Always resolve to absolute paths to avoid import resolution issues:

```python
_scripts_dir_abs = _scripts_dir.resolve()
```

### 2. Check Module Exists Before Registration

```python
if _module_file.exists():
    # Register module
```

### 3. Handle Exceptions Gracefully

```python
try:
    # Registration code
except Exception as e:
    print(f"Warning: Could not register module {_module_name}: {e}")
```

### 4. Avoid Re-Registration

```python
if _module_name not in sys.modules:
    # Register module
```

### 5. Group Related Modules

Organize modules by feature or directory:

```python
# Auth modules
_auth_modules = {
    'auth_service': 'auth-service',
    'auth_middleware': 'auth-middleware',
}

# Utility modules
_util_modules = {
    'context_validator': 'context-validator',
    'string_utils': 'string-utils',
}
```

## Alternative: setup.py Approach

For packages, use `setup.py` with `find_packages()` and custom package discovery:

```python
# setup.py
from setuptools import setup, find_packages

setup(
    name='my-package',
    packages=find_packages(),
    # Custom package mapping for dashed names
    package_dir={'': 'src'},
)
```

## Verification

Test that module registration works:

```python
# tests/test_module_import.py
def test_module_import():
    """Verify that dashed module can be imported."""
    import context_validator
    assert hasattr(context_validator, 'validate')
```

## Common Issues

### Issue: Module Not Found After Registration

**Cause:** Registration happens after test collection

**Fix:** Ensure registration is at module level in `conftest.py`, not inside a fixture

### Issue: Relative Import Errors

**Cause:** Scripts directory not in Python path

**Fix:** Add to sys.path if needed:

```python
import sys
_scripts_dir = str(Path(__file__).parent.parent / "scripts")
if _scripts_dir not in sys.path:
    sys.path.insert(0, _scripts_dir)
```

### Issue: Circular Import

**Cause:** Module imports another module that hasn't been registered yet

**Fix:** Order registration to handle dependencies first:

```python
# Register dependencies first
_script_modules = [
    ('utils', 'utils'),           # Register first
    ('service', 'my-service'),    # Depends on utils
]
```

## Sources

- [Python importlib Documentation](https://docs.python.org/3/library/importlib.html)
- [Pytest Conftest Documentation](https://docs.pytest.org/en/stable/reference/fixtures.html)
- [PEP 8 -- Style Guide for Python Code](https://peps.python.org/pep-0008/)
