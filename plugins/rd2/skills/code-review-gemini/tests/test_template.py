"""Tests for template formatting in code-review-gemini.py."""
from __future__ import annotations

from pathlib import Path

import code_review_gemini as crg


class TestExtractReviewSections:
    """Tests for extract_review_sections function."""

    def test_extracts_critical_issues(self) -> None:
        """Test extraction of critical issues section."""
        content = """
### Critical (Must Fix)
- Issue 1: SQL injection vulnerability
- Issue 2: Memory leak
"""
        sections = crg.extract_review_sections(content)
        assert "sql injection" in sections["critical_issues"].lower()

    def test_extracts_quality_score(self) -> None:
        """Test extraction of quality score."""
        content = """
Quality Score: 8.5/10
Recommendation: Approve
"""
        sections = crg.extract_review_sections(content)
        assert sections["quality_score"] == "8.5"

    def test_extracts_recommendation(self) -> None:
        """Test extraction of recommendation."""
        content = """
Recommendation: Request Changes
"""
        sections = crg.extract_review_sections(content)
        assert sections["recommendation"] == "Request Changes"

    def test_extracts_security_analysis(self) -> None:
        """Test extraction of security analysis section."""
        content = """
### Security Analysis
- Input validation is missing
- No SQL injection protection
"""
        sections = crg.extract_review_sections(content)
        assert "input validation" in sections["security_analysis"].lower()

    def test_handles_empty_content(self) -> None:
        """Test handling of empty content."""
        content = ""
        sections = crg.extract_review_sections(content)
        assert isinstance(sections, dict)
        assert all(isinstance(v, str) for v in sections.values())

    def test_fallback_to_executive_summary(self) -> None:
        """Test that unstructured content goes to executive summary."""
        content = "This is a simple review without sections."
        sections = crg.extract_review_sections(content)
        assert "simple review" in sections["executive_summary"].lower()


class TestFormatReviewWithTemplate:
    """Tests for format_review_with_template function."""

    def test_formats_with_all_sections(
        self, tmp_path: Path, monkeypatch
    ) -> None:
        """Test formatting with all sections present."""
        # Create a simple template
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        template_path = assets_dir / "code-review-result.md"
        template_content = """---
type: gemini-code-review
model: {{MODEL}}
target: {{TARGET}}
---
# Review
{{EXECUTIVE_SUMMARY}}
"""
        template_path.write_text(template_content)

        # Mock get_assets_dir
        monkeypatch.setattr(crg, "get_assets_dir", lambda: assets_dir)

        content = "This is a test review."
        result = crg.format_review_with_template(
            content=content,
            target="test.py",
            model="gemini-2.5-pro",
            mode="review",
            focus_areas=["security"],
            files_count=1,
        )

        assert "gemini-2.5-pro" in result
        assert "test.py" in result
        assert "gemini-code-review" in result

    def test_formats_with_missing_template(self) -> None:
        """Test formatting when template is missing (uses actual template)."""
        content = "Review content"
        result = crg.format_review_with_template(
            content=content,
            target="test.py",
            model="gemini-2.5-pro",
            mode="review",
        )

        assert "gemini-2.5-pro" in result
        assert "test.py" in result
        # With the actual template, content should be in executive summary
        assert "Code Review Result" in result or "Review content" in result

    def test_formats_planning_mode(self, tmp_path: Path, monkeypatch) -> None:
        """Test formatting for planning mode."""
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        monkeypatch.setattr(crg, "get_assets_dir", lambda: assets_dir)

        content = "Implementation plan details"
        result = crg.format_review_with_template(
            content=content,
            target="feature-x",
            model="gemini-2.5-pro",
            mode="planning",
        )

        assert "planning" in result.lower()
        assert "feature-x" in result

    def test_includes_focus_areas(self, tmp_path: Path, monkeypatch) -> None:
        """Test that focus areas are included."""
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        template_path = assets_dir / "code-review-result.md"
        template_content = "Focus: {{FOCUS_AREAS_LIST}}"
        template_path.write_text(template_content)

        monkeypatch.setattr(crg, "get_assets_dir", lambda: assets_dir)

        result = crg.format_review_with_template(
            content="Review",
            target="test.py",
            model="gemini-2.5-pro",
            mode="review",
            focus_areas=["security", "performance"],
        )

        assert "security" in result.lower()
        assert "performance" in result.lower()

    def test_includes_files_count(self, tmp_path: Path, monkeypatch) -> None:
        """Test that files count is included."""
        assets_dir = tmp_path / "assets"
        assets_dir.mkdir()
        template_path = assets_dir / "code-review-result.md"
        template_content = "Files: {{FILES_COUNT}}"
        template_path.write_text(template_content)

        monkeypatch.setattr(crg, "get_assets_dir", lambda: assets_dir)

        result = crg.format_review_with_template(
            content="Review",
            target="src/",
            model="gemini-2.5-pro",
            mode="review",
            files_count=15,
        )

        assert "15" in result


class TestSaveToPlanUpdated:
    """Tests for updated save_to_plan function."""

    def test_saves_without_adding_duplicate_metadata(
        self, mock_plans_dir: Path
    ) -> None:
        """Test that save_to_plan doesn't add duplicate headers."""
        content = """---
type: gemini-review
model: gemini-2.5-pro
---

# Review Content
"""
        plan_path = crg.save_to_plan(content, "test-plan")

        saved_content = plan_path.read_text()
        # Should not have duplicate frontmatter
        assert saved_content.count("---") == 2  # Only the original pair

    def test_saves_formatted_content(self, mock_plans_dir: Path) -> None:
        """Test saving formatted content."""
        content = "# Formatted Review\n\nContent here"
        plan_path = crg.save_to_plan(content, "formatted-plan")

        saved_content = plan_path.read_text()
        assert "Formatted Review" in saved_content
        assert plan_path.exists()
