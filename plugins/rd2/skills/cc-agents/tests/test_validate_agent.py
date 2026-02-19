"""Tests for validate_agent.py script."""

import sys
import tempfile
from pathlib import Path

# Add scripts to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent.parent / "scripts"))

# Import validation functions from the updated script and common library
from validate_agent import validate_agent
from schema.base import SkillType
from schema.frontmatter import (
    validate_name,
    validate_description,
    validate_model,
    validate_color,
    validate_tools,
    validate_frontmatter,
    parse_frontmatter,
)


def test_validate_agent_missing_file():
    """Test validation of non-existent file."""
    result = validate_agent(Path("/nonexistent/agent.md"))
    assert result["valid"] is False
    assert "File not found" in result["errors"][0]


def test_validate_agent_valid_structure():
    """Test validation with valid structure."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write("""---
name: test-agent
description: Use this agent when testing
model: sonnet
color: blue
---
# Test Agent
## Persona
Test persona
## Philosophy
Test philosophy
## Verification
Test verification
## Competencies
- Item 1
- Item 2
## Process
Test process
## Rules
DO: Test
DON'T: Test
## Output
Test output
""")
        f.flush()
        result = validate_agent(Path(f.name))
        Path(f.name).unlink()

    assert result["valid"] is True or len(result["errors"]) == 0


def test_validate_name_valid():
    """Test valid name."""
    issues = validate_name("test-agent")
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_name_too_short():
    """Test name too short."""
    issues = validate_name("ab")
    assert any("too short" in i.message for i in issues)


def test_validate_name_too_long():
    """Test name too long."""
    issues = validate_name("a" * 51)
    assert any("too long" in i.message for i in issues)


def test_validate_name_none():
    """Test None name."""
    issues = validate_name(None)
    assert any("required" in i.message.lower() for i in issues)


def test_validate_description_valid():
    """Test valid description."""
    issues = validate_description("Use this agent when testing")
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_description_too_short():
    """Test description too short."""
    issues = validate_description("short")
    assert any("too short" in i.message for i in issues)


def test_validate_description_none():
    """Test None description."""
    issues = validate_description(None)
    assert any("required" in i.message.lower() for i in issues)


def test_validate_model_valid():
    """Test valid model values."""
    for model in ["inherit", "sonnet", "opus", "haiku"]:
        issues = validate_model(model)
        assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_model_invalid():
    """Test invalid model."""
    issues = validate_model("gpt-4")
    assert any("must be one of" in i.message for i in issues)


def test_validate_color_valid():
    """Test valid color values."""
    for color in ["blue", "cyan", "green", "yellow", "magenta", "red", "teal", "crimson", "purple"]:
        issues = validate_color(color)
        assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_color_invalid():
    """Test invalid color."""
    issues = validate_color("rainbow")
    assert any("must be one of" in i.message for i in issues)


def test_validate_tools_valid():
    """Test valid tools array."""
    issues = validate_tools(["Read", "Write"])
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_tools_invalid():
    """Test invalid tools (not array)."""
    issues = validate_tools("Read,Write")
    assert any("array" in i.message.lower() for i in issues)


def test_parse_frontmatter_with_content():
    """Test parsing with frontmatter."""
    content = """---
name: test-agent
description: Test agent
---
# Agent Content
"""
    fm, body = parse_frontmatter(content)
    assert fm["name"] == "test-agent"
    assert "# Agent Content" in body


def test_parse_frontmatter_without_content():
    """Test parsing without frontmatter."""
    content = "# Just content"
    fm, body = parse_frontmatter(content)
    assert fm == {}
    assert body == "# Just content"


def test_validate_frontmatter_agent_valid():
    """Test valid agent frontmatter."""
    fm = {
        "name": "test-agent",
        "description": "Use this agent when testing",
        "model": "sonnet",
        "color": "blue",
    }
    issues = validate_frontmatter(fm, SkillType.AGENT)
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_frontmatter_agent_missing_model():
    """Test agent missing model is valid (optional per official schema)."""
    fm = {
        "name": "test-agent",
        "description": "Test",
        "color": "blue",
    }
    issues = validate_frontmatter(fm, SkillType.AGENT)
    # model is optional - should have no errors
    model_errors = [i for i in issues if i.field == "model" and i.severity == "error"]
    assert len(model_errors) == 0, f"Expected no model errors, got: {model_errors}"


def test_validate_frontmatter_agent_missing_color():
    """Test agent missing color is valid (not in official schema)."""
    fm = {
        "name": "test-agent",
        "description": "Test",
        "model": "sonnet",
    }
    issues = validate_frontmatter(fm, SkillType.AGENT)
    # color is NOT in official schema - should have no errors
    color_errors = [i for i in issues if i.field == "color" and i.severity == "error"]
    assert len(color_errors) == 0, f"Expected no color errors, got: {color_errors}"


def test_validate_frontmatter_skill_valid():
    """Test valid skill frontmatter."""
    fm = {
        "name": "test-skill",
        "description": "Use this skill when testing",
    }
    issues = validate_frontmatter(fm, SkillType.SKILL)
    assert len([i for i in issues if i.severity == "error"]) == 0


def test_validate_agent_extended_colors():
    """Test validation with extended colors."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write("""---
name: test-agent
description: Use this agent when testing
model: sonnet
color: teal
---
# Test Agent
## Persona
Test persona
## Philosophy
Test philosophy
## Verification
Test verification
## Competencies
- Item 1
- Item 2
## Process
Test process
## Rules
DO: Test
DON'T: Test
## Output
Test output
""")
        f.flush()
        result = validate_agent(Path(f.name))
        Path(f.name).unlink()

    assert result["valid"] is True


def test_validate_agent_extended_colors_crimson():
    """Test validation with crimson color."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write("""---
name: test-agent
description: Use this agent when testing
model: sonnet
color: crimson
---
# Test Agent
## Persona
Test persona
## Philosophy
Test philosophy
## Verification
Test verification
## Competencies
- Item 1
- Item 2
## Process
Test process
## Rules
DO: Test
DON'T: Test
## Output
Test output
""")
        f.flush()
        result = validate_agent(Path(f.name))
        Path(f.name).unlink()

    assert result["valid"] is True
