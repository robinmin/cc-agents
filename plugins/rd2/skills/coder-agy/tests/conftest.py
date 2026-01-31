"""
Pytest configuration and fixtures for coder-agy tests.

This module handles module registration for scripts with dashes in their names.
"""

import importlib.util
import sys
from pathlib import Path


# Get the scripts directory
_scripts_dir = Path(__file__).parent.parent / "scripts"
_scripts_dir_abs = _scripts_dir.resolve()

# Register the coder-agy module (hyphenated filename -> underscored module name)
_module_file = _scripts_dir_abs / "coder-agy.py"
_module_name = "coder_agy"

if _module_file.exists():
    try:
        spec = importlib.util.spec_from_file_location(_module_name, _module_file)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            if _module_name not in sys.modules:
                sys.modules[_module_name] = module
                spec.loader.exec_module(module)
    except Exception as e:
        print(f"Warning: Could not pre-register module {_module_name}: {e}")
