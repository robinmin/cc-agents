"""Pytest configuration and fixtures."""

import pytest
from pathlib import Path
import sys

# Add scripts directory to path for imports
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))


@pytest.fixture
def skill_root():
    """Return path to cc-skills2 root directory."""
    return Path(__file__).parent.parent


@pytest.fixture
def tmp_script(tmp_path):
    """Create a temporary Python script file."""

    def _create(content: str, name: str = "test.py"):
        script = tmp_path / name
        script.write_text(content)
        return script

    return _create


@pytest.fixture
def tmp_skill(tmp_path):
    """Create a temporary skill directory with SKILL.md."""

    def _create(skill_md_content: str):
        skill_dir = tmp_path / "test-skill"
        skill_dir.mkdir()
        skill_md = skill_dir / "SKILL.md"
        skill_md.write_text(skill_md_content)
        return skill_dir

    return _create
