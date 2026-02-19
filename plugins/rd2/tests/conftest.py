"""Pytest configuration for rd2 tests."""

import pytest
from pathlib import Path
import sys

# Add common scripts directory to path for imports
scripts_dir = Path(__file__).parent.parent / "scripts"
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

# Also add the parent scripts if needed
parent_scripts = Path(__file__).parent.parent.parent / "scripts"
if parent_scripts.exists() and str(parent_scripts) not in sys.path:
    sys.path.insert(0, str(parent_scripts))
