"""Pytest fixtures for code-review-claude tests."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from typing import Generator

# Import code-review-claude.py module using importlib (handles hyphens)
SCRIPT_DIR = Path(__file__).parent.parent / "scripts"
SCRIPT_PATH = SCRIPT_DIR / "code-review-claude.py"

spec = importlib.util.spec_from_file_location("code_review_claude", SCRIPT_PATH)
if spec is None or spec.loader is None:
    raise ImportError(f"Cannot load module from {SCRIPT_PATH}")
code_review_claude = importlib.util.module_from_spec(spec)
sys.modules["code_review_claude"] = code_review_claude
spec.loader.exec_module(code_review_claude)


@pytest.fixture
def temp_file(tmp_path: Path) -> Generator[Path, None, None]:
    """Provide a temporary file path."""
    file_path = tmp_path / "test.txt"
    yield file_path
    if file_path.exists():
        file_path.unlink()


@pytest.fixture
def temp_dir(tmp_path: Path) -> Path:
    """Provide a temporary directory."""
    return tmp_path


@pytest.fixture
def sample_code() -> str:
    """Provide sample code for testing."""
    return '''def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

def subtract(a: int, b: int) -> int:
    """Subtract two numbers."""
    return a - b
'''


@pytest.fixture
def mock_plans_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Mock the PLANS_DIR to use a temporary directory."""
    import code_review_claude

    plans_dir = tmp_path / ".claude" / "plans"
    plans_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(code_review_claude, "PLANS_DIR", plans_dir)
    return plans_dir
