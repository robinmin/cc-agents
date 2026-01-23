"""Tests for template-related functions in code-review-opencode.py."""
from __future__ import annotations

from pathlib import Path

import pytest

import code_review_opencode as cro


class TestSaveToPlan:
    """Tests for save_to_plan function."""

    def test_save_to_plan_file(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test saving content to a plan file."""
        # Mock PLANS_DIR
        plans_dir = tmp_path / ".claude" / "plans"
        plans_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        content = "---\ntest: plan\n---\n# Content"
        result = cro.save_to_plan(content, "test-plan")

        assert result == plans_dir / "test-plan.md"
        assert result.exists()
        assert result.read_text() == content

    def test_save_sanitizes_name(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that plan names are sanitized."""
        plans_dir = tmp_path / ".claude" / "plans"
        plans_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        content = "Test content"
        result = cro.save_to_plan(content, "test/plan:with@special#chars")

        # Should sanitize special characters
        assert "test-plan-with-special-chars" in result.name
        assert result.exists()

    def test_save_adds_md_extension(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that .md extension is added if not present."""
        plans_dir = tmp_path / ".claude" / "plans"
        plans_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        content = "Test content"
        result = cro.save_to_plan(content, "test-plan")

        assert result.suffix == ".md"

    def test_save_creates_directory_if_needed(self, tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
        """Test that save_to_plan creates directory if needed."""
        # Set PLANS_DIR to a non-existent directory
        plans_dir = tmp_path / ".claude" / "plans" / "nested"
        monkeypatch.setattr(cro, "PLANS_DIR", plans_dir)

        content = "Test content"
        result = cro.save_to_plan(content, "test")

        assert result.exists()
        assert result.parent == plans_dir
