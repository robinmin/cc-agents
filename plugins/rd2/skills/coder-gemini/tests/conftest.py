"""Pytest fixtures for coder-gemini tests."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    from typing import Generator

# Import coder-gemini.py module using importlib (handles hyphens)
SCRIPT_DIR = Path(__file__).parent.parent / "scripts"
SCRIPT_PATH = SCRIPT_DIR / "coder-gemini.py"

spec = importlib.util.spec_from_file_location("coder_gemini", SCRIPT_PATH)
if spec is None or spec.loader is None:
    raise ImportError(f"Cannot load module from {SCRIPT_PATH}")
coder_gemini = importlib.util.module_from_spec(spec)
sys.modules["coder_gemini"] = coder_gemini
spec.loader.exec_module(coder_gemini)


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
def mock_plans_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Mock the PLANS_DIR to use a temporary directory."""
    import coder_gemini

    plans_dir = tmp_path / ".claude" / "plans"
    plans_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(coder_gemini, "PLANS_DIR", plans_dir)
    return plans_dir
