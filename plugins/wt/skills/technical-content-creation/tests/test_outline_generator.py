"""
Unit tests for outline-generator.py module.

Tests cover:
- OUTLINE_STYLES constant
- PROMPT_TEMPLATES constant
- parse_frontmatter() function
- read_research_brief() function
- generate_outline_prompt() function
- create_outline_option_frontmatter() function
- create_outline_content() function
- save_outline_option() function
- save_generation_materials() function
- copy_approved_outline() function
- present_options() function
- CLI commands (cmd_generate, cmd_approve, cmd_list)
"""

import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime

# Import shared module first (needed by outline_generator)
from shared.config import get_tcc_config, get_tcc_repo_root

from outline_generator import (
    OUTLINE_STYLES,
    PROMPT_TEMPLATES,
    OUTLINE_TEMPLATES,
    parse_frontmatter,
    read_research_brief,
    generate_outline_prompt,
    create_outline_option_frontmatter,
    create_outline_content,
    save_outline_option,
    save_generation_materials,
    copy_approved_outline,
    present_options,
    cmd_generate,
    cmd_approve,
    cmd_list
)

from shared.config import get_tcc_repo_root


# ============================================================================
# OUTLINE_STYLES Constant Tests
# ============================================================================

class TestOutlineStylesConstant:
    """Tests for OUTLINE_STYLES constant."""

    def test_three_styles_defined(self):
        """Test that exactly 3 styles are defined."""
        assert len(OUTLINE_STYLES) == 3
        assert 'a' in OUTLINE_STYLES
        assert 'b' in OUTLINE_STYLES
        assert 'c' in OUTLINE_STYLES

    def test_style_structure(self):
        """Test that each style has required keys."""
        required_keys = {"name", "id", "description", "best_for"}
        for style_id, style in OUTLINE_STYLES.items():
            assert required_keys.issubset(style.keys())

    def test_style_names(self):
        """Test that style names are correct."""
        assert OUTLINE_STYLES['a']['name'] == "Traditional/Structured"
        assert OUTLINE_STYLES['b']['name'] == "Narrative/Story-driven"
        assert OUTLINE_STYLES['c']['name'] == "Technical/Deep-dive"


# ============================================================================
# PROMPT_TEMPLATES Constant Tests
# ============================================================================

class TestPromptTemplatesConstant:
    """Tests for PROMPT_TEMPLATES constant."""

    def test_templates_for_all_styles(self):
        """Test that templates exist for all 3 styles."""
        assert 'a' in PROMPT_TEMPLATES
        assert 'b' in PROMPT_TEMPLATES
        assert 'c' in PROMPT_TEMPLATES

    def test_templates_contain_placeholders(self):
        """Test that templates contain required placeholders."""
        placeholders = ["{topic}", "{length}", "{research_brief}"]
        for template in PROMPT_TEMPLATES.values():
            for placeholder in placeholders:
                assert placeholder in template


# ============================================================================
# parse_frontmatter() Tests
# ============================================================================

class TestParseFrontmatter:
    """Tests for parse_frontmatter() function."""

    def test_parse_valid_frontmatter(self):
        """Test parsing valid YAML frontmatter."""
        content = """---
title: Test Title
status: draft
author: Test Author
---

Body content here."""
        frontmatter, body = parse_frontmatter(content)
        assert frontmatter["title"] == "Test Title"
        assert frontmatter["status"] == "draft"
        assert "Body content here" in body

    def test_parse_no_frontmatter(self):
        """Test handling content without frontmatter."""
        content = "Just body content\n\nNo frontmatter here."
        frontmatter, body = parse_frontmatter(content)
        assert frontmatter == {}
        assert body == "Just body content\n\nNo frontmatter here."

    def test_parse_empty_frontmatter(self):
        """Test handling empty frontmatter."""
        content = """---
---

Body content."""
        frontmatter, body = parse_frontmatter(content)
        assert frontmatter == {}
        assert "Body content" in body

    def test_parse_multiline_values(self):
        """Test parsing multiline values in frontmatter."""
        content = """---
description: |
  This is a
  multiline description
---

Body."""
        frontmatter, body = parse_frontmatter(content)
        assert "description" in frontmatter


# ============================================================================
# read_research_brief() Tests
# ============================================================================

class TestReadResearchBrief:
    """Tests for read_research_brief() function."""

    def test_read_with_frontmatter_title(self, mock_research_brief):
        """Test reading brief with title in frontmatter."""
        brief = read_research_brief(mock_research_brief)
        assert brief["title"] == "Test Topic for Outlines"
        assert "content" in brief
        assert "frontmatter" in brief
        assert "path" in brief

    def test_extract_title_from_body(self, tmp_path):
        """Test extracting title from body when not in frontmatter."""
        research_dir = tmp_path / "1-research"
        research_dir.mkdir()
        brief_file = research_dir / "research-brief.md"
        brief_file.write_text("# Body Title\n\nContent here.")

        brief = read_research_brief(brief_file)
        assert brief["title"] == "Body Title"

    def test_default_title_when_none_found(self, tmp_path):
        """Test default title when no title found."""
        research_dir = tmp_path / "1-research"
        research_dir.mkdir()
        brief_file = research_dir / "research-brief.md"
        brief_file.write_text("Content without title.")

        brief = read_research_brief(brief_file)
        assert brief["title"] == "Untitled Topic"

    def test_file_not_found(self, tmp_path):
        """Test FileNotFoundError for missing file."""
        with pytest.raises(FileNotFoundError, match="Research brief not found"):
            read_research_brief(tmp_path / "nonexistent.md")


# ============================================================================
# generate_outline_prompt() Tests
# ============================================================================

class TestGenerateOutlinePrompt:
    """Tests for generate_outline_prompt() function."""

    def test_generate_prompt_option_a(self, mock_research_brief):
        """Test generating prompt for option 'a'."""
        brief = read_research_brief(mock_research_brief)
        prompt = generate_outline_prompt('a', "Test Topic", "long", brief)
        assert "Generate a traditional, structured outline" in prompt
        assert "Test Topic" in prompt
        assert "long" in prompt

    def test_generate_prompt_option_b(self, mock_research_brief):
        """Test generating prompt for option 'b'."""
        brief = read_research_brief(mock_research_brief)
        prompt = generate_outline_prompt('b', "Test Topic", "short", brief)
        assert "narrative, story-driven" in prompt
        assert "Test Topic" in prompt

    def test_generate_prompt_option_c(self, mock_research_brief):
        """Test generating prompt for option 'c'."""
        brief = read_research_brief(mock_research_brief)
        prompt = generate_outline_prompt('c', "Test Topic", "long", brief)
        assert "technical, comprehensive" in prompt
        assert "Test Topic" in prompt

    def test_defaults_to_option_a(self, mock_research_brief):
        """Test defaulting to option 'a' for invalid option."""
        brief = read_research_brief(mock_research_brief)
        prompt = generate_outline_prompt('invalid', "Test", "short", brief)
        # Should use option 'a' template
        assert "Hierarchical" in prompt


# ============================================================================
# create_outline_option_frontmatter() Tests
# ============================================================================

class TestCreateOutlineOptionFrontmatter:
    """Tests for create_outline_option_frontmatter() function."""

    def test_creates_valid_frontmatter(self):
        """Test creating valid frontmatter."""
        frontmatter = create_outline_option_frontmatter(
            'a', "Test Topic", "1-research/research-brief.md", "HIGH"
        )
        assert "---" in frontmatter
        assert "title:" in frontmatter
        assert "source_research:" in frontmatter
        assert "option: a" in frontmatter
        assert "style:" in frontmatter
        assert "created_at:" in frontmatter
        assert "status: draft" in frontmatter
        assert "confidence: HIGH" in frontmatter

    def test_includes_style_name(self):
        """Test that frontmatter includes style name."""
        frontmatter = create_outline_option_frontmatter(
            'b', "Test", "path", "MEDIUM"
        )
        assert "Narrative/Story-driven" in frontmatter

    def test_default_confidence(self):
        """Test default confidence level."""
        frontmatter = create_outline_option_frontmatter(
            'c', "Test", "path"
        )
        assert "confidence: MEDIUM" in frontmatter


# ============================================================================
# create_outline_content() Tests
# ============================================================================

class TestCreateOutlineContent:
    """Tests for create_outline_content() function."""

    def test_traditional_short_outline(self, mock_research_brief):
        """Test generating traditional short outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('a', "Test Topic", "short", brief)
        assert "## 1. Introduction" in content
        assert "## 2. Main Content" in content
        assert "## 3. Conclusion" in content

    def test_traditional_long_outline(self, mock_research_brief):
        """Test generating traditional long outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('a', "Test Topic", "long", brief)
        assert "## 1. Introduction" in content
        assert "## 2. Background" in content
        assert "## 3. Core Topics" in content
        assert "## 7. Best Practices" in content
        assert "## 8. Conclusion" in content

    def test_narrative_short_outline(self, mock_research_brief):
        """Test generating narrative short outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('b', "Test Topic", "short", brief)
        assert "## 1. The Hook" in content
        assert "## 2. The Journey" in content
        assert "## 3. The Takeaway" in content

    def test_narrative_long_outline(self, mock_research_brief):
        """Test generating narrative long outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('b', "Test Topic", "long", brief)
        assert "## 1. The Hook" in content
        assert "## 2. Setting the Scene" in content
        assert "## 7. The Turning Point" in content

    def test_technical_short_outline(self, mock_research_brief):
        """Test generating technical short outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('c', "Test Topic", "short", brief)
        assert "## 1. Technical Overview" in content
        assert "## 2. Technical Details" in content
        assert "## 3. Technical Summary" in content

    def test_technical_long_outline(self, mock_research_brief):
        """Test generating technical long outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('c', "Test Topic", "long", brief)
        assert "## 1. Technical Overview" in content
        assert "## 2. Deep Dive: Foundations" in content
        assert "## 7. Advanced Topics" in content

    def test_includes_topic_name(self, mock_research_brief):
        """Test that topic name is included in outline."""
        brief = read_research_brief(mock_research_brief)
        content = create_outline_content('a', "Custom Topic", "short", brief)
        assert "Custom Topic" in content


# ============================================================================
# save_outline_option() Tests
# ============================================================================

class TestSaveOutlineOption:
    """Tests for save_outline_option() function."""

    def test_saves_outline_file(self, mock_research_brief, mock_outline_dir):
        """Test saving outline option file."""
        brief = read_research_brief(mock_research_brief)
        outline_file = save_outline_option(
            'a', "Test Topic", "short", brief, mock_outline_dir, "HIGH"
        )
        assert outline_file.exists()
        assert outline_file.name == "outline-option-a.md"

    def test_creates_frontmatter(self, mock_research_brief, mock_outline_dir):
        """Test that frontmatter is created."""
        brief = read_research_brief(mock_research_brief)
        outline_file = save_outline_option(
            'b', "Test", "long", brief, mock_outline_dir
        )
        content = outline_file.read_text()
        assert "---" in content
        assert "title:" in content

    def test_creates_header(self, mock_research_brief, mock_outline_dir):
        """Test that style header is created."""
        brief = read_research_brief(mock_research_brief)
        outline_file = save_outline_option(
            'c', "Test", "short", brief, mock_outline_dir
        )
        content = outline_file.read_text()
        assert "# Outline Option C" in content
        assert "Technical/Deep-dive" in content


# ============================================================================
# save_generation_materials() Tests
# ============================================================================

class TestSaveGenerationMaterials:
    """Tests for save_generation_materials() function."""

    def test_creates_materials_directory(self, tmp_path):
        """Test that materials directory is created."""
        materials_dir = tmp_path / "materials"
        brief = {"path": "1-research/research-brief.md"}
        save_generation_materials("Test", "long", ['a', 'b'], brief, materials_dir)
        assert materials_dir.exists()

    def test_saves_prompts_used(self, tmp_path):
        """Test that prompts-used.md is saved."""
        materials_dir = tmp_path / "materials"
        brief = {"path": "1-research/research-brief.md"}
        save_generation_materials("Test", "long", ['a'], brief, materials_dir)
        prompts_file = materials_dir / "prompts-used.md"
        assert prompts_file.exists()
        content = prompts_file.read_text()
        assert "Outline Generation Prompts" in content

    def test_saves_generation_params(self, tmp_path):
        """Test that generation-params.json is saved."""
        materials_dir = tmp_path / "materials"
        brief = {"path": "1-research/research-brief.md", "frontmatter": {}}
        save_generation_materials("Test", "short", ['a', 'b'], brief, materials_dir)
        params_file = materials_dir / "generation-params.json"
        assert params_file.exists()
        data = json.loads(params_file.read_text())
        assert "generated_at" in data
        assert "topic" in data
        assert "options_generated" in data


# ============================================================================
# copy_approved_outline() Tests
# ============================================================================

class TestCopyApprovedOutline:
    """Tests for copy_approved_outline() function."""

    def test_copies_selected_option(self, mock_outline_dir):
        """Test copying selected option to approved."""
        # Create source file
        source_file = mock_outline_dir / "outline-option-a.md"
        source_content = """---
title: Option A
---

# Outline Content
"""
        source_file.write_text(source_content)

        approved_file = copy_approved_outline(mock_outline_dir, 'a', "user")
        assert approved_file.exists()
        assert approved_file.name == "outline-approved.md"

    def test_updates_frontmatter(self, mock_outline_dir):
        """Test that frontmatter is updated."""
        source_file = mock_outline_dir / "outline-option-b.md"
        source_content = """---
title: Option B
---

Content"""
        source_file.write_text(source_content)

        approved_file = copy_approved_outline(mock_outline_dir, 'b', "reviewer")
        content = approved_file.read_text()
        assert "selected_option: b" in content
        assert "approved_by: reviewer" in content
        assert "status: approved" in content

    def test_raises_error_for_missing_source(self, mock_outline_dir):
        """Test error when source file doesn't exist."""
        with pytest.raises(FileNotFoundError, match="Source outline not found"):
            copy_approved_outline(mock_outline_dir, 'c')


# ============================================================================
# present_options() Tests
# ============================================================================

class TestPresentOptions:
    """Tests for present_options() function."""

    def test_presents_single_option(self):
        """Test presenting single option."""
        prompt = present_options(['a'])
        assert "Which outline option would you like to approve?" in prompt
        assert "[Option A]" in prompt
        assert "Traditional/Structured" in prompt

    def test_presents_multiple_options(self):
        """Test presenting multiple options."""
        prompt = present_options(['a', 'b', 'c'])
        assert "[Option A]" in prompt
        assert "[Option B]" in prompt
        assert "[Option C]" in prompt

    def test_includes_selection_prompt(self):
        """Test that selection prompt is included."""
        prompt = present_options(['a'])
        assert "Please enter your selection" in prompt


# ============================================================================
# CLI Commands Tests
# ============================================================================

class TestCmdGenerate:
    """Tests for cmd_generate() function."""

    def test_generates_three_options(self, mock_repo_root, mock_research_brief, capsys):
        """Test generating 3 outline options."""
        # Setup: Create topic structure with research brief
        collection_dir = mock_repo_root / "collections" / "test-collection"
        collection_dir.mkdir(parents=True, exist_ok=True)
        topic_dir = collection_dir / "test-topic"
        topic_dir.mkdir(parents=True, exist_ok=True)

        # Copy research brief to topic
        research_dir = topic_dir / "1-research"
        research_dir.mkdir(parents=True, exist_ok=True)
        brief_content = mock_research_brief.read_text()
        (research_dir / "research-brief.md").write_text(brief_content)

        # Create outline directory
        outline_dir = topic_dir / "2-outline"
        outline_dir.mkdir(parents=True, exist_ok=True)

        args = MagicMock()
        args.options = 3
        args.length = "long"
        args.interactive = False
        args.confidence = "MEDIUM"

        with patch('outline_generator.Path.cwd', return_value=topic_dir), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root):
            cmd_generate(args)
            captured = capsys.readouterr()

        assert "Generating 3 outline option" in captured.out or "Outline Options Generated" in captured.out

    def test_error_when_not_in_topic(self, mock_repo_root):
        """Test error when not in a topic folder."""
        args = MagicMock()

        with patch('outline_generator.Path.cwd', return_value=mock_repo_root), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root):
            with pytest.raises(SystemExit):
                cmd_generate(args)


class TestCmdApprove:
    """Tests for cmd_approve() function."""

    def test_approves_valid_option(self, tmp_path):
        """Test approving a valid outline option."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()
        source_file = outline_dir / "outline-option-a.md"
        source_file.write_text("---\ntitle: Test\n---\n\nContent")

        args = MagicMock()
        args.approve = 'a'
        args.approved_by = "user"

        with patch('outline_generator.Path.cwd', return_value=tmp_path), \
             patch('outline_generator.get_tcc_repo_root', return_value=tmp_path):
            cmd_approve(args)

        approved_file = outline_dir / "outline-approved.md"
        assert approved_file.exists()

    def test_errors_for_invalid_option(self, tmp_path):
        """Test error for invalid option."""
        args = MagicMock()
        args.approve = 'z'

        with pytest.raises(SystemExit):
            cmd_approve(args)


class TestCmdList:
    """Tests for cmd_list() function."""

    def test_lists_existing_options(self, tmp_path, capsys):
        """Test listing existing outline options."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()

        # Create option files
        for opt in ['a', 'b']:
            (outline_dir / f"outline-option-{opt}.md").write_text(
                f"---\nstyle: option-{opt}\nstatus: draft\n---"
            )

        args = MagicMock()

        with patch('outline_generator.Path.cwd', return_value=tmp_path):
            cmd_list(args)
            captured = capsys.readouterr()

        assert "Outline Options:" in captured.out
        assert "Option A" in captured.out or "option-a" in captured.out

    def test_shows_approved_status(self, tmp_path, capsys):
        """Test showing approved outline status."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()
        (outline_dir / "outline-approved.md").write_text(
            "---\nselected_option: a\n---"
        )

        args = MagicMock()

        with patch('outline_generator.Path.cwd', return_value=tmp_path):
            cmd_list(args)
            captured = capsys.readouterr()

        assert "Approved" in captured.out


# ============================================================================
# Edge Cases Tests
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and special scenarios."""

    def test_empty_research_brief(self, tmp_path):
        """Test handling empty research brief."""
        brief_file = tmp_path / "empty.md"
        brief_file.write_text("---\ntitle: Empty\n---\n\n")

        brief = read_research_brief(brief_file)
        assert brief["title"] == "Empty"

    def test_unicode_in_research_brief(self, tmp_path):
        """Test handling unicode in research brief."""
        brief_file = tmp_path / "unicode.md"
        brief_file.write_text("---\ntitle: 你好世界\n---\n\nContent")

        brief = read_research_brief(brief_file)
        assert "你好世界" in brief["title"]

    def test_invalid_option_letter(self, tmp_path):
        """Test handling invalid option letter."""
        brief = {"path": "test", "content": "## Theme 1\n", "frontmatter": {}}
        # Invalid options should raise KeyError
        with pytest.raises(KeyError):
            content = create_outline_content('z', "Test", "short", brief)


class TestAdditionalCoverage:
    """Additional tests for improved coverage."""

    def test_cmd_generate_missing_research_brief(self, mock_repo_root, capsys):
        """Test cmd_generate when research brief is missing."""
        args = MagicMock()
        args.options = 2
        args.length = "short"
        args.interactive = False
        args.confidence = "MEDIUM"

        # Create topic but no research brief
        collection_dir = mock_repo_root / "collections" / "test-collection"
        collection_dir.mkdir(parents=True, exist_ok=True)
        topic_dir = collection_dir / "test-topic"
        topic_dir.mkdir(parents=True, exist_ok=True)
        (topic_dir / "2-outline").mkdir(parents=True, exist_ok=True)

        with patch('outline_generator.Path.cwd', return_value=topic_dir), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root):
            with pytest.raises(SystemExit):
                cmd_generate(args)
            captured = capsys.readouterr()
            assert "Research brief not found" in captured.out

    def test_cmd_generate_invalid_repo_root(self, capsys):
        """Test cmd_generate when repo root is None."""
        args = MagicMock()

        with patch('outline_generator.get_tcc_repo_root', return_value=None):
            with pytest.raises(SystemExit):
                cmd_generate(args)
            captured = capsys.readouterr()
            assert "Repository root not configured" in captured.out

    def test_cmd_approve_missing_outline_file(self, tmp_path, capsys):
        """Test cmd_approve when outline option file doesn't exist."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()

        args = MagicMock()
        args.approve = 'a'

        with patch('outline_generator.get_tcc_repo_root', return_value=tmp_path), \
             patch('outline_generator.Path.cwd', return_value=tmp_path):
            with pytest.raises(SystemExit):
                cmd_approve(args)
            captured = capsys.readouterr()
            assert "not found" in captured.out.lower()

    def test_cmd_approve_invalid_option(self, tmp_path, capsys):
        """Test cmd_approve with invalid option."""
        args = MagicMock()
        args.approve = 'z'

        with pytest.raises(SystemExit):
            cmd_approve(args)

    def test_cmd_list_missing_outline_dir(self, tmp_path, capsys):
        """Test cmd_list when outline directory doesn't exist."""
        args = MagicMock()

        with patch('outline_generator.Path.cwd', return_value=tmp_path):
            with pytest.raises(SystemExit):
                cmd_list(args)
            captured = capsys.readouterr()
            assert "not found" in captured.out.lower()

    def test_generate_outline_prompt_with_all_options(self, mock_research_brief):
        """Test generate_outline_prompt for all three options."""
        brief = read_research_brief(mock_research_brief)
        for option in ['a', 'b', 'c']:
            prompt = generate_outline_prompt(option, "Test", "long", brief)
            assert "Test" in prompt
            assert "long" in prompt

    def test_copy_approved_outline_malformed_frontmatter(self, mock_outline_dir):
        """Test copy_approved_outline with malformed frontmatter."""
        source_file = mock_outline_dir / "outline-option-a.md"
        source_file.write_text("No frontmatter here\n\nContent")

        # Should still work
        approved_file = copy_approved_outline(mock_outline_dir, 'a', "user")
        assert approved_file.exists()

    def test_save_generation_materials_with_brief_path(self, tmp_path):
        """Test save_generation_materials preserves brief path."""
        materials_dir = tmp_path / "materials"
        brief = {
            "path": "1-research/custom-brief.md",
            "frontmatter": {"title": "Test"}
        }
        save_generation_materials("Topic", "long", ['a'], brief, materials_dir)

        params_file = materials_dir / "generation-params.json"
        assert params_file.exists()
        data = json.loads(params_file.read_text())
        assert data["source_research"] == "1-research/custom-brief.md"

    def test_cmd_generate_with_relative_path_error(self, mock_repo_root, capsys):
        """Test cmd_generate when cwd is not relative to repo root."""
        args = MagicMock()
        args.options = 2
        args.length = "short"
        args.interactive = False
        args.confidence = "MEDIUM"

        outside_dir = mock_repo_root / "outside"
        outside_dir.mkdir()

        with patch('outline_generator.Path.cwd', return_value=outside_dir), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root):
            with pytest.raises(SystemExit):
                cmd_generate(args)
            captured = capsys.readouterr()
            assert "within a topic folder" in captured.out

    def test_main_no_command_generates_by_default(self, mock_repo_root, mock_research_brief, capsys):
        """Test main() defaults to cmd_generate when no command specified."""
        collection_dir = mock_repo_root / "collections" / "test-collection"
        collection_dir.mkdir(parents=True, exist_ok=True)
        topic_dir = collection_dir / "test-topic"
        topic_dir.mkdir(parents=True, exist_ok=True)

        research_dir = topic_dir / "1-research"
        research_dir.mkdir(parents=True, exist_ok=True)
        brief_content = mock_research_brief.read_text()
        (research_dir / "research-brief.md").write_text(brief_content)

        with patch('sys.argv', ['outline-generator.py', '--options', '2']), \
             patch('outline_generator.Path.cwd', return_value=topic_dir), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root):
            from outline_generator import main
            main()
            captured = capsys.readouterr()
            assert "Generating" in captured.out or "Outline Options Generated" in captured.out

    def test_main_with_list_command(self, tmp_path, capsys):
        """Test main() with --list command."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()

        with patch('sys.argv', ['outline-generator.py', '--list']), \
             patch('outline_generator.Path.cwd', return_value=tmp_path):
            from outline_generator import main
            main()
            captured = capsys.readouterr()
            assert "Outline Options:" in captured.out

    def test_main_with_approve_command(self, tmp_path, capsys):
        """Test main() with --approve command."""
        outline_dir = tmp_path / "2-outline"
        outline_dir.mkdir()
        source_file = outline_dir / "outline-option-a.md"
        source_file.write_text("---\ntitle: Test\n---\n\nContent")

        with patch('sys.argv', ['outline-generator.py', '--approve', 'a']), \
             patch('outline_generator.get_tcc_repo_root', return_value=tmp_path), \
             patch('outline_generator.Path.cwd', return_value=tmp_path):
            from outline_generator import main
            main()
            captured = capsys.readouterr()
            assert "Approved" in captured.out

    def test_cmd_generate_interactive_with_selection(self, mock_repo_root, mock_research_brief, capsys):
        """Test cmd_generate in interactive mode with user selection."""
        collection_dir = mock_repo_root / "collections" / "test-collection"
        collection_dir.mkdir(parents=True, exist_ok=True)
        topic_dir = collection_dir / "test-topic"
        topic_dir.mkdir(parents=True, exist_ok=True)

        research_dir = topic_dir / "1-research"
        research_dir.mkdir(parents=True, exist_ok=True)
        brief_content = mock_research_brief.read_text()
        (research_dir / "research-brief.md").write_text(brief_content)

        args = MagicMock()
        args.options = 2
        args.length = "short"
        args.interactive = True
        args.confidence = "MEDIUM"

        # Mock input to select option 'a'
        with patch('outline_generator.Path.cwd', return_value=topic_dir), \
             patch('outline_generator.get_tcc_repo_root', return_value=mock_repo_root), \
             patch('builtins.input', return_value='a'):
            cmd_generate(args)
            captured = capsys.readouterr()
            assert "Generating" in captured.out
