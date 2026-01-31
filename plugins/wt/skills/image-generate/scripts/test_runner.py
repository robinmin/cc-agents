#!/usr/bin/env python3
"""
Quick test runner for template_engine.py

Runs basic tests to verify the template system works correctly.
"""

import sys
from pathlib import Path

# Add scripts directory to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from template_engine import TemplateEngine, TemplateConfig, create_template

def test_basic_template_loading():
    """Test basic template loading."""
    print("Testing basic template loading...")

    engine = TemplateEngine(
        project_templates_dir=scripts_dir.parent / "assets" / "templates",
        skill_templates_dir=scripts_dir.parent / "assets" / "templates"
    )

    templates = engine.list_templates()
    print(f"  Found {len(templates)} templates: {templates}")

    assert "default" in templates, "default template not found"
    assert "cover" in templates, "cover template not found"
    assert "illustrator" in templates, "illustrator template not found"

    print("  ✓ Template listing works")

def test_template_rendering():
    """Test template rendering with variables."""
    print("\nTesting template rendering...")

    engine = TemplateEngine(
        project_templates_dir=scripts_dir.parent / "assets" / "templates",
        skill_templates_dir=scripts_dir.parent / "assets" / "templates"
    )

    # Load cover template
    template = engine.load_template("cover")
    print(f"  Loaded template: {template.config.name}")
    print(f"  Resolution: {template.config.width}x{template.config.height}")

    # Render with variables
    prompt = template.render_prompt({
        "title": "Test Article",
        "topics": "AI",
        "mood": "modern"
    })

    print(f"  Rendered prompt: {prompt[:100]}...")
    assert "Test Article" in prompt
    assert "AI" in prompt

    # Test output filename
    filename = template.render_output_filename({"title": "My Cover"})
    print(f"  Output filename: {filename}")
    assert filename == "My Cover.png"

    print("  ✓ Template rendering works")

def test_template_with_defaults():
    """Test template default values."""
    print("\nTesting template defaults...")

    engine = TemplateEngine(
        project_templates_dir=scripts_dir.parent / "assets" / "templates",
        skill_templates_dir=scripts_dir.parent / "assets" / "templates"
    )

    template = engine.load_template("default")

    # Render without variables (use defaults)
    prompt = template.render_prompt({})

    assert "landscape" in prompt  # Default subject
    print("  ✓ Template defaults work")

def test_variable_substitution():
    """Test variable substitution syntax."""
    print("\nTesting variable substitution...")

    from template_engine import Template

    config = TemplateConfig(
        name="test",
        description="Test",
        width=100,
        height=100,
        style="vibrant"
    )

    template = Template(
        config=config,
        body="{{required}} and {{optional | default value}}",
        source_path=Path("test.tpl.md")
    )

    # With only required variable
    result = template._substitute_variables(template.body, {"required": "present"})
    assert result == "present and default value"

    # With both variables
    result = template._substitute_variables(template.body, {
        "required": "present",
        "optional": "custom"
    })
    assert result == "present and custom"

    # Missing required variable (left as-is)
    result = template._substitute_variables(template.body, {})
    assert "{{required}}" in result

    print("  ✓ Variable substitution works")

def main():
    """Run all tests."""
    print("=" * 60)
    print("Template Engine Test Suite")
    print("=" * 60)

    try:
        test_basic_template_loading()
        test_template_rendering()
        test_template_with_defaults()
        test_variable_substitution()

        print("\n" + "=" * 60)
        print("All tests passed! ✓")
        print("=" * 60)
        return 0

    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
