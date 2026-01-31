#!/usr/bin/env python3
"""
Unit tests for template_engine.py

Tests template parsing, variable substitution, validation,
and error handling for the image generation template system.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from yaml import safe_dump

# Import template engine components
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from template_engine import (
    TemplateEngine,
    Template,
    TemplateConfig,
    TemplateError,
    TemplateNotFoundError,
    TemplateParseError,
    TemplateValidationError,
    CircularReferenceError,
    create_template
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def temp_dir():
    """Create a temporary directory for test templates."""
    dir_path = Path(tempfile.mkdtemp())
    yield dir_path
    shutil.rmtree(dir_path)


@pytest.fixture
def template_engine(temp_dir):
    """Create a template engine with a temporary templates directory."""
    return TemplateEngine(
        project_templates_dir=temp_dir,
        skill_templates_dir=temp_dir
    )


@pytest.fixture
def valid_template_content():
    """Return valid template content."""
    return """---
name: test
description: Test template
width: 1024
height: 768
style: vibrant
backend: huggingface
steps: 50
output_filename: "{{title | test}}.png"
variables:
  title:
    description: Image title
    default: "test"
  mood:
    description: Image mood
    default: "peaceful"
keywords: ["8K", "high-quality"]
---

Test image of {{title}} with {{mood}} mood.
{{detail_level | Highly detailed}} and professional quality.
"""


@pytest.fixture
def minimal_template_content():
    """Return minimal valid template content."""
    return """---
name: minimal
description: Minimal template
width: 512
height: 512
style: sketch
---

Simple {{subject | landscape}} image.
"""


# =============================================================================
# TemplateConfig Tests
# =============================================================================

class TestTemplateConfig:
    """Tests for TemplateConfig dataclass."""

    def test_from_dict_valid(self):
        """Test creating config from valid dictionary."""
        data = {
            "name": "test",
            "description": "Test template",
            "width": 1024,
            "height": 768,
            "style": "vibrant"
        }
        config = TemplateConfig.from_dict(data)

        assert config.name == "test"
        assert config.description == "Test template"
        assert config.width == 1024
        assert config.height == 768
        assert config.style == "vibrant"
        assert config.steps == 50  # Default value
        assert config.backend is None  # Not specified

    def test_from_dict_missing_required_field(self):
        """Test that missing required fields raise validation error."""
        data = {
            "name": "test",
            "description": "Test template",
            # Missing: width, height, style
        }
        with pytest.raises(TemplateValidationError) as exc_info:
            TemplateConfig.from_dict(data)
        assert "Missing required frontmatter fields" in str(exc_info.value)

    def test_from_dict_invalid_width_type(self):
        """Test that non-integer width raises validation error."""
        data = {
            "name": "test",
            "description": "Test template",
            "width": "1024",  # String instead of int
            "height": 768,
            "style": "vibrant"
        }
        with pytest.raises(TemplateValidationError) as exc_info:
            TemplateConfig.from_dict(data)
        assert "must be integers" in str(exc_info.value)

    def test_from_dict_negative_resolution(self):
        """Test that negative resolution raises validation error."""
        data = {
            "name": "test",
            "description": "Test template",
            "width": -100,
            "height": 768,
            "style": "vibrant"
        }
        with pytest.raises(TemplateValidationError) as exc_info:
            TemplateConfig.from_dict(data)
        assert "must be positive" in str(exc_info.value)

    def test_resolution_property(self):
        """Test resolution property returns correct tuple."""
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1920,
            height=817,
            style="vibrant"
        )
        assert config.resolution == (1920, 817)

    def test_merge_variables_with_defaults(self):
        """Test merging user variables with template defaults."""
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1024,
            height=768,
            style="vibrant",
            variables={
                "title": {"default": "Default Title"},
                "mood": {"default": "peaceful"},
                "custom": {"default": "value"}
            }
        )

        # Merge with user variables
        merged = config.merge_variables({"title": "User Title"})

        assert merged["title"] == "User Title"  # User override
        assert merged["mood"] == "peaceful"  # Template default
        assert merged["custom"] == "value"  # Template default

    def test_merge_variables_string_defaults(self):
        """Test merging with string variable defaults."""
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1024,
            height=768,
            style="vibrant",
            variables={
                "title": "Direct Value",
                "mood": "Direct Mood"
            }
        )

        merged = config.merge_variables({"title": "Override"})

        assert merged["title"] == "Override"
        assert merged["mood"] == "Direct Mood"


# =============================================================================
# Template Tests
# =============================================================================

class TestTemplate:
    """Tests for Template class."""

    def test_render_prompt_basic(self):
        """Test basic prompt rendering with variables."""
        config = TemplateConfig.from_dict({
            "name": "test",
            "description": "Test",
            "width": 1024,
            "height": 768,
            "style": "vibrant",
            "keywords": ["8K", "high-quality"]
        })

        template = Template(
            config=config,
            body="Test of {{title}} with {{mood}} mood.",
            source_path=Path("test.tpl.md")
        )

        rendered = template.render_prompt({"title": "My Title", "mood": "happy"})
        assert "My Title" in rendered
        assert "happy" in rendered
        assert "8K" in rendered  # Keywords appended
        assert "high-quality" in rendered

    def test_render_prompt_with_defaults(self):
        """Test rendering with default variable values."""
        config = TemplateConfig.from_dict({
            "name": "test",
            "description": "Test",
            "width": 1024,
            "height": 768,
            "style": "vibrant"
        })

        template = Template(
            config=config,
            body="{{title | Default Title}} and {{mood | calm}}",
            source_path=Path("test.tpl.md")
        )

        rendered = template.render_prompt({})
        assert "Default Title" in rendered
        assert "calm" in rendered

    def test_render_prompt_missing_variable(self):
        """Test that missing variables are left as-is."""
        config = TemplateConfig.from_dict({
            "name": "test",
            "description": "Test",
            "width": 1024,
            "height": 768,
            "style": "vibrant"
        })

        template = Template(
            config=config,
            body="Test {{title}} and {{missing_var}}",
            source_path=Path("test.tpl.md")
        )

        rendered = template.render_prompt({"title": "Present"})
        assert "Present" in rendered
        assert "{{missing_var}}" in rendered  # Left as-is

    def test_render_output_filename(self):
        """Test output filename rendering."""
        config = TemplateConfig.from_dict({
            "name": "test",
            "description": "Test",
            "width": 1024,
            "height": 768,
            "style": "vibrant",
            "output_filename": "{{title}}_{{index | 001}}.png"
        })

        template = Template(
            config=config,
            body="Test",
            source_path=Path("test.tpl.md")
        )

        filename = template.render_output_filename({"title": "Image", "index": "042"})
        assert filename == "Image_042.png"

    def test_render_output_filename_with_defaults(self):
        """Test output filename with default values."""
        config = TemplateConfig.from_dict({
            "name": "test",
            "description": "Test",
            "width": 1024,
            "height": 768,
            "style": "vibrant",
            "output_filename": "{{title | cover}}.png"
        })

        template = Template(
            config=config,
            body="Test",
            source_path=Path("test.tpl.md")
        )

        # No user variables
        filename = template.render_output_filename({})
        assert filename == "cover.png"

        # With user override
        filename = template.render_output_filename({"title": "MyCover"})
        assert filename == "MyCover.png"

    def test_get_style_prompt(self):
        """Test getting style modifier strings."""
        for style, expected_part in [
            ("technical-diagram", "technical illustration"),
            ("minimalist", "minimalist design"),
            ("vibrant", "bold colors"),
            ("sketch", "hand-drawn"),
            ("photorealistic", "photorealistic")
        ]:
            config = TemplateConfig(
                name="test",
                description="Test",
                width=1024,
                height=768,
                style=style
            )
            template = Template(config=config, body="Test", source_path=Path("test.tpl.md"))
            style_prompt = template.get_style_prompt()
            assert expected_part in style_prompt

    def test_get_style_prompt_unknown_style(self):
        """Test getting style prompt for unknown style returns empty string."""
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1024,
            height=768,
            style="unknown-style"
        )
        template = Template(config=config, body="Test", source_path=Path("test.tpl.md"))
        style_prompt = template.get_style_prompt()
        assert style_prompt == ""

    def test_load_styles_from_yaml(self, temp_dir):
        """Test loading custom styles from YAML file."""
        # Create a custom styles.yaml file
        styles_yaml = temp_dir / "styles.yaml"
        styles_yaml.write_text("""---
styles:
  custom-style: "custom modifiers, unique look, special style"
  technical-diagram: "overridden technical style"
""")

        # Create template with custom style
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1024,
            height=768,
            style="custom-style"
        )

        # Mock the style loading to use our temp directory
        template = Template(config=config, body="Test", source_path=Path("test.tpl.md"))

        # Mock _load_styles to return custom styles
        original_load = template._load_styles
        template._load_styles = lambda: {
            "custom-style": "custom modifiers, unique look, special style",
            "technical-diagram": "overridden technical style"
        }

        style_prompt = template.get_style_prompt()
        assert "custom modifiers" in style_prompt

        # Test that built-in style can be overridden
        config.style = "technical-diagram"
        template2 = Template(config=config, body="Test", source_path=Path("test.tpl.md"))
        template2._load_styles = template._load_styles
        style_prompt = template2.get_style_prompt()
        assert "overridden technical style" in style_prompt

    def test_load_styles_fallback_to_defaults(self):
        """Test that built-in defaults are used when YAML file not found."""
        config = TemplateConfig(
            name="test",
            description="Test",
            width=1024,
            height=768,
            style="vibrant"
        )

        template = Template(config=config, body="Test", source_path=Path("test.tpl.md"))

        # If YAML file doesn't exist, should use built-in defaults
        # Mock _load_styles to return None (simulating file not found)
        template._load_styles = lambda: {}

        style_prompt = template.get_style_prompt()
        # Should return empty string when style not found in loaded styles
        assert style_prompt == ""


# =============================================================================
# TemplateEngine Tests
# =============================================================================

class TestTemplateEngine:
    """Tests for TemplateEngine class."""

    def test_list_templates_empty(self, template_engine):
        """Test listing templates when none exist."""
        templates = template_engine.list_templates()
        assert templates == []

    def test_create_and_list_template(self, template_engine, temp_dir):
        """Test creating a template and listing it."""
        # Create a template file
        template_path = temp_dir / "test.tpl.md"
        template_path.write_text("""---
name: test
description: Test template
width: 1024
height: 768
style: vibrant
---
Test template
""")

        templates = template_engine.list_templates()
        assert "test" in templates

    def test_resolve_template_path_by_name(self, template_engine, temp_dir):
        """Test resolving template by name."""
        # Create template
        template_path = temp_dir / "cover.tpl.md"
        template_path.write_text(valid_template_content())

        resolved = template_engine._resolve_template_path("cover")
        assert resolved == template_path

    def test_resolve_template_path_by_absolute(self, template_engine, temp_dir):
        """Test resolving template by absolute path."""
        # Create template
        template_path = temp_dir / "custom.tpl.md"
        template_path.write_text(valid_template_content())

        resolved = template_engine._resolve_template_path(str(template_path))
        assert resolved == template_path

    def test_resolve_template_not_found(self, template_engine):
        """Test resolving non-existent template raises error."""
        with pytest.raises(TemplateNotFoundError) as exc_info:
            template_engine._resolve_template_path("nonexistent")
        assert "not found" in str(exc_info.value)

    def test_load_template_valid(self, template_engine, temp_dir):
        """Test loading a valid template."""
        template_path = temp_dir / "test.tpl.md"
        template_path.write_text(valid_template_content())

        template = template_engine.load_template("test")

        assert template.config.name == "test"
        assert "Test image of" in template.body
        assert template.config.width == 1024

    def test_load_template_invalid_yaml(self, template_engine, temp_dir):
        """Test loading template with invalid YAML."""
        template_path = temp_dir / "bad.tpl.md"
        template_path.write_text("""---
name: test
description: bad yaml
width: [invalid
---
Bad YAML
""")

        with pytest.raises(TemplateParseError) as exc_info:
            template_engine.load_template("bad")
        assert "yaml" in str(exc_info.value).lower()

    def test_load_template_missing_frontmatter(self, template_engine, temp_dir):
        """Test loading template without frontmatter."""
        template_path = temp_dir / "nofront.tpl.md"
        template_path.write_text("No frontmatter here")

        with pytest.raises(TemplateParseError) as exc_info:
            template_engine.load_template("nofront")
        assert "frontmatter" in str(exc_info.value).lower()

    def test_render_template_convenience(self, template_engine, temp_dir):
        """Test render_template convenience method."""
        template_path = temp_dir / "test.tpl.md"
        template_path.write_text(valid_template_content())

        prompt, config = template_engine.render_template(
            "test",
            variables={"title": "Custom Title"}
        )

        assert "Custom Title" in prompt
        assert config.name == "test"


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestErrorHandling:
    """Tests for error handling and edge cases."""

    def test_template_with_whitespace_in_defaults(self, template_engine, temp_dir):
        """Test template with whitespace around default values."""
        template_path = temp_dir / "spacey.tpl.md"
        template_path.write_text("""---
name: spacey
description: Whitespace test
width: 100
height: 100
style: sketch
---
Test {{ title | Default }}
""")

        template = template_engine.load_template("spacey")
        rendered = template.render_prompt({})
        assert "Default" in rendered

    def test_template_multiple_variables(self, template_engine, temp_dir):
        """Test template with multiple variables."""
        template_path = temp_dir / "multi.tpl.md"
        template_path.write_text("""---
name: multi
description: Multiple variables
width: 100
height: 100
style: vibrant
variables:
  a: {default: "A"}
  b: {default: "B"}
  c: {default: "C"}
---
{{a}}, {{b}}, {{c}}
""")

        template = template_engine.load_template("multi")
        rendered = template.render_prompt({"b": "B_Override"})
        assert "A, B_Override, C" in rendered

    def test_template_empty_keywords(self, template_engine, temp_dir):
        """Test template with empty keywords list."""
        template_path = temp_dir / "nokey.tpl.md"
        template_path.write_text("""---
name: nokey
description: No keywords
width: 100
height: 100
style: sketch
keywords: []
---
Test {{subject | image}}
""")

        template = template_engine.load_template("nokey")
        rendered = template.render_prompt({})
        # Should not have trailing comma
        assert not rendered.endswith(",")

    def test_circular_reference_self_reference(self, template_engine, temp_dir):
        """Test circular reference detection when template references itself."""
        # Create a template that would try to load itself
        # Note: This is a simplified test that checks the circular reference mechanism
        template_engine._loaded_templates.add("self_ref:" + str(temp_dir / "self_ref.tpl.md"))

        # Trying to load again should detect circular reference
        with pytest.raises(CircularReferenceError) as exc_info:
            template_engine._check_circular_reference("self_ref", temp_dir / "self_ref.tpl.md")

        assert "Circular reference detected" in str(exc_info.value)
        assert "self_ref" in str(exc_info.value)

    def test_circular_reference_between_templates(self, template_engine, temp_dir):
        """Test circular reference detection between two templates."""
        # Simulate template A being loaded, then template B tries to load A
        template_engine._loaded_templates.add("template_a:" + str(temp_dir / "a.tpl.md"))
        template_engine._loaded_templates.add("template_b:" + str(temp_dir / "b.tpl.md"))

        # If template_b tries to reference template_a again, it should be caught
        with pytest.raises(CircularReferenceError) as exc_info:
            template_engine._check_circular_reference("template_a", temp_dir / "a.tpl.md")

        assert "Circular reference detected" in str(exc_info.value)

    def test_circular_reference_indirect_chain(self, template_engine, temp_dir):
        """Test circular reference detection in indirect chain (A -> B -> C -> A)."""
        # Simulate a chain: A -> B -> C
        template_engine._loaded_templates.add("template_a:" + str(temp_dir / "a.tpl.md"))
        template_engine._loaded_templates.add("template_b:" + str(temp_dir / "b.tpl.md"))
        template_engine._loaded_templates.add("template_c:" + str(temp_dir / "c.tpl.md"))

        # Now if C tries to reference A, we should detect the circular reference
        with pytest.raises(CircularReferenceError) as exc_info:
            template_engine._check_circular_reference("template_a", temp_dir / "a.tpl.md")

        assert "Circular reference detected" in str(exc_info.value)
        assert "template_a" in str(exc_info.value)

    def test_no_circular_reference_normal_loading(self, template_engine, temp_dir):
        """Test that normal template loading doesn't trigger circular reference error."""
        # Loading a new template should not trigger circular reference error
        try:
            template_engine._check_circular_reference("new_template", temp_dir / "new.tpl.md")
            # Should not raise any error
        except CircularReferenceError:
            pytest.fail("Should not raise CircularReferenceError for new template")


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests for complete workflows."""

    def test_full_template_workflow(self, template_engine, temp_dir):
        """Test complete workflow: create, load, render."""
        # Create template using helper
        template_path = temp_dir / "integration.tpl.md"
        create_template(
            name="integration",
            description="Integration test template",
            width=800,
            height=600,
            style="technical-diagram",
            body="{{concept}} diagram with {{style_detail | clean}} lines.",
            output_path=template_path,
            steps=40
        )

        # Load and verify
        template = template_engine.load_template("integration")
        assert template.config.width == 800
        assert template.config.steps == 40

        # Render with variables
        rendered = template.render_prompt({
            "concept": "Architecture",
            "style_detail": "precise"
        })
        assert "Architecture diagram" in rendered
        assert "precise lines" in rendered

    def test_cover_template_simulation(self, template_engine, temp_dir):
        """Simulate using the cover template."""
        template_path = temp_dir / "cover.tpl.md"
        template_path.write_text("""---
name: cover
description: Article cover
width: 1920
height: 817
style: vibrant
output_filename: "{{title | cover}}.png"
variables:
  title: {default: "Article"}
  subtitle: {default: ""}
  topics: {default: "technology"}
---
Cover for "{{title}}"{{subtitle | - {{subtitle}}}}.
{{topics | Tech}} focused design.
""")

        template = template_engine.load_template("cover")

        # Render with variables
        rendered = template.render_prompt({
            "title": "Microservices Architecture",
            "subtitle": "A Complete Guide",
            "topics": "cloud computing"
        })

        assert "Microservices Architecture" in rendered
        assert "A Complete Guide" in rendered
        assert "cloud computing" in rendered

        # Check output filename
        filename = template.render_output_filename({"title": "My Article"})
        assert filename == "My Article.png"


# =============================================================================
# Helper Functions
# =============================================================================

def valid_template_content():
    """Helper to generate valid template content."""
    return """---
name: test
description: Test template
width: 1024
height: 768
style: vibrant
backend: huggingface
steps: 50
output_filename: "{{title | test}}.png"
variables:
  title:
    description: Image title
    default: "test"
  mood:
    description: Image mood
    default: "peaceful"
keywords: ["8K", "high-quality"]
---

Test image of {{title}} with {{mood}} mood.
{{detail_level | Highly detailed}} and professional quality.
"""


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
