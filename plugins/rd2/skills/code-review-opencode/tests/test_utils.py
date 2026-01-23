"""Tests for utility functions in code-review-opencode.py."""
from __future__ import annotations

from pathlib import Path

import pytest

# Import the module under test
import code_review_opencode as cro


class TestGenerateTempPath:
    """Tests for generate_temp_path function."""

    def test_generates_unique_paths(self) -> None:
        """Test that generate_temp_path generates unique paths."""
        path1 = cro.generate_temp_path()
        path2 = cro.generate_temp_path()
        assert path1 != path2

    def test_uses_prefix(self) -> None:
        """Test that generate_temp_path uses the provided prefix."""
        path = cro.generate_temp_path("test-prefix")
        assert "test-prefix" in path.name

    def test_creates_txt_extension(self) -> None:
        """Test that generate_temp_path creates .txt files."""
        path = cro.generate_temp_path()
        assert path.suffix == ".txt"

    def test_uses_temp_directory(self) -> None:
        """Test that paths are in the system temp directory."""
        import tempfile

        path = cro.generate_temp_path()
        assert path.parent == Path(tempfile.gettempdir())


class TestEnsurePlansDir:
    """Tests for ensure_plans_dir function."""

    def test_creates_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that ensure_plans_dir creates the directory."""
        plans_dir = tmp_path / ".claude" / "plans"
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        result = cro.ensure_plans_dir()

        assert result == plans_dir
        assert plans_dir.exists()
        assert plans_dir.is_dir()

    def test_returns_existing_directory(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that ensure_plans_dir returns existing directory."""
        plans_dir = tmp_path / ".claude" / "plans"
        plans_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        result = cro.ensure_plans_dir()

        assert result == plans_dir


class TestGetScriptDir:
    """Tests for get_script_dir function."""

    def test_returns_scripts_directory(self) -> None:
        """Test that get_script_dir returns the scripts directory."""
        script_dir = cro.get_script_dir()
        assert script_dir.name == "scripts"
        assert script_dir.exists()


class TestGetAssetsDir:
    """Tests for get_assets_dir function."""

    def test_returns_assets_directory(self) -> None:
        """Test that get_assets_dir returns the assets directory."""
        assets_dir = cro.get_assets_dir()
        assert assets_dir.name == "assets"


class TestLoadPromptTemplate:
    """Tests for load_prompt_template function."""

    def test_loads_existing_template(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test loading an existing template."""
        # Create a mock assets directory with a template
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        template_path = assets_dir / "test_prompt.md"
        template_content = "This is a test template with {{PLACEHOLDER}}"
        template_path.write_text(template_content)

        # Mock get_assets_dir to return our temp assets dir
        monkeypatch.setattr(cro, "get_assets_dir", lambda: assets_dir)

        result = cro.load_prompt_template("test_prompt")

        assert result == template_content

    def test_returns_none_for_missing_template(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that missing template returns None."""
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        monkeypatch.setattr(cro, "get_assets_dir", lambda: assets_dir)

        result = cro.load_prompt_template("nonexistent")

        assert result is None
