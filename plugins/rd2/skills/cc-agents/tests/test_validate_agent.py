"""Tests for validate_agent.py script."""

import sys
import tempfile
from pathlib import Path

# Add scripts to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from validate_agent import validate_agent, validate_name, validate_description, validate_model, validate_color, validate_tools, validate_frontmatter, parse_frontmatter


def test_validate_agent_missing_file():
    """Test validation of non-existent file."""
    result = validate_agent(Path("/nonexistent/agent.md"))
    assert result["valid"] is False
    assert "File not found" in result["errors"][0]


def test_validate_agent_valid_structure():
    """Test validation of agent with all 8 sections."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

## METADATA

Test metadata.

## PERSONA

Test persona.

## PHILOSOPHY

Test philosophy.

## VERIFICATION

Test verification.

## COMPETENCIES

- Competency 1
- Competency 2

## PROCESS

Test process.

## RULES

DO: Do something
DON'T: Don't do something

## OUTPUT

Test output.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert result["valid"] is True
    assert len(result["sections_found"]) >= 2


def test_validate_agent_missing_sections():
    """Test validation of agent missing sections."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## METADATA

Only metadata section.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert len(result["sections_missing"]) > 0
    assert "PERSONA" in result["sections_missing"]


def test_validate_agent_low_line_count():
    """Test validation with low line count."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Small Agent

Just a few lines here.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert any("Low line count" in w for w in result["warnings"])


def test_validate_agent_low_competencies():
    """Test validation with low competency count."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

- Item 1
- Item 2

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert any("Low competency" in w for w in result["warnings"])


def test_validate_agent_no_frontmatter():
    """Test validation without frontmatter."""
    content = """# Test Agent

## METADATA

Content without frontmatter.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert any("No frontmatter" in w for w in result["warnings"])


def test_validate_agent_high_line_count():
    """Test validation with high line count."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

""" + "\n".join([f"## Section {i}\n\n" + "\n".join([f"Line {j}" for j in range(80)]) for i in range(10)])

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert any("High line count" in w for w in result["warnings"])


def test_validate_agent_with_many_competencies():
    """Test validation with many competency items."""
    competencies = "\n".join([f"- Competency {i}" for i in range(25)])
    content = f"""---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

{competencies}

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert not any("Low competency" in w for w in result["warnings"])


def test_validate_agent_persona_section():
    """Test validation detecting PERSONA section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## Agent

role: test
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "PERSONA" in result["sections_found"]


def test_validate_agent_process_section():
    """Test validation detecting PROCESS section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## process

Step 1: Do something
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "PROCESS" in result["sections_found"]


def test_validate_agent_output_section():
    """Test validation detecting OUTPUT section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## Example

response format
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "OUTPUT" in result["sections_found"]


def test_validate_agent_philosophy_section():
    """Test validation detecting PHILOSOPHY section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## principles

design values
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "PHILOSOPHY" in result["sections_found"]


def test_validate_agent_verification_section():
    """Test validation detecting VERIFICATION section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## Quality

check: verify sources
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "VERIFICATION" in result["sections_found"]


def test_validate_agent_competencies_section():
    """Test validation detecting COMPETENCIES section."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## skill

Can read files
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert "COMPETENCIES" in result["sections_found"]


def test_validate_agent_all_sections():
    """Test validation with all sections found."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

## METADATA

Metadata info.

## Agent

role: test

## principles

Core principles.

## Quality

Verification

Skill 1

## protocol.

## skill workflow

Workflow steps.

## Rules

DO: Do this.

## Example

Output format.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert result["valid"] is True
    assert len(result["sections_found"]) >= 7


def test_validate_agent_invalid_path_handling():
    """Test validation handles invalid paths gracefully."""
    # Test with a path that exists but is not a valid agent
    content = """# Small Agent

Just a tiny bit of content.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        # Test with non-existent file path appended
        result = validate_agent(Path(f.name + ".nonexistent"))

    assert result["valid"] is False
    assert len(result["errors"]) > 0


def test_validate_agent_with_empty_file():
    """Test validation with empty file."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write("")
        f.flush()
        result = validate_agent(Path(f.name))

    # Should have warnings but be valid
    assert len(result["warnings"]) > 0


def test_validate_agent_line_count_boundary():
    """Test validation line count boundaries."""
    # Test with exactly 300 lines (boundary case)
    lines = ["content line"] * 300
    content = "---\nname: test\ndescription: test\n---\n\n" + "\n".join(lines)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    # 300 lines should not trigger any line count warning
    assert not any("line count" in w.lower() for w in result["warnings"])


def test_validate_agent_line_count_700_boundary():
    """Test validation line count at 700 boundary."""
    # Test with exactly 701 lines (boundary case - first value that triggers high)
    lines = ["content line"] * 701
    content = "---\nname: test\ndescription: test\n---\n\n" + "\n".join(lines)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    # 701 lines should trigger high line count warning
    assert any("High line count" in w for w in result["warnings"])


def test_validate_agent_exactly_50_competencies():
    """Test validation with exactly 50 competencies."""
    competencies = "\n".join([f"- Competency {i}" for i in range(50)])
    content = f"""---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

{competencies}

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    # 50 competencies should not trigger low warning
    assert not any("Low competency" in w for w in result["warnings"])


def test_validate_agent_single_competency_marker():
    """Test detection of various competency markers."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
---

# Test Agent

## skill

* Item 1
1. Item 2
- Item 3
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    # Should find competencies with different markers (uses "skill" pattern)
    assert "COMPETENCIES" in result["sections_found"]


def test_validate_agent_partial_frontmatter():
    """Test validation with partial frontmatter."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

## METADATA

Content.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    # Should be valid with complete frontmatter but missing body sections
    assert result["valid"] is True


def test_main_with_valid_file(monkeypatch, tmp_path):
    """Test main function with valid agent file."""
    from validate_agent import main

    agent_file = tmp_path / "test-agent.md"
    agent_file.write_text("""---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

- Skill 1
- Skill 2
- Skill 3
- Skill 4
- Skill 5
- Skill 6
- Skill 7
- Skill 8
- Skill 9
- Skill 10

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
""")

    monkeypatch.setattr("sys.argv", ["validate_agent.py", str(agent_file)])
    result = main()
    assert result == 0


def test_main_with_missing_file(monkeypatch, tmp_path):
    """Test main function with missing file."""
    from validate_agent import main

    monkeypatch.setattr("sys.argv", ["validate_agent.py", str(tmp_path / "nonexistent.md")])
    result = main()
    assert result == 1


def test_main_with_strict_mode(monkeypatch, tmp_path):
    """Test main function with strict mode."""
    from validate_agent import main

    agent_file = tmp_path / "test-agent.md"
    agent_file.write_text("""---
name: test-agent
description: Test
---

# Test

Just a few lines.
""")

    monkeypatch.setattr("sys.argv", ["validate_agent.py", str(agent_file), "--strict"])
    result = main()
    assert result == 1


def test_main_keyboard_interrupt(monkeypatch, tmp_path):
    """Test main function handles KeyboardInterrupt."""
    from validate_agent import main

    monkeypatch.setattr("sys.argv", ["validate_agent.py", str(tmp_path / "test.md")])

    # Create a mock that raises KeyboardInterrupt
    def mock_validate(path):
        raise KeyboardInterrupt()

    import validate_agent
    monkeypatch.setattr(validate_agent, "validate_agent", mock_validate)

    result = main()
    assert result == 130


def test_main_exception_handling(monkeypatch, tmp_path):
    """Test main function handles exceptions."""
    from validate_agent import main

    monkeypatch.setattr("sys.argv", ["validate_agent.py", str(tmp_path / "test.md")])

    # Create a mock that raises an exception
    def mock_validate(path):
        raise ValueError("Test error")

    import validate_agent
    monkeypatch.setattr(validate_agent, "validate_agent", mock_validate)

    result = main()
    assert result == 1


def test_script_entry_point():
    """Test script can be run as entry point."""
    import subprocess
    from pathlib import Path

    # Get the scripts directory
    script_dir = Path(__file__).parent.parent / "scripts"
    agent_file = Path(__file__).parent.parent / "test_temp_agent.md"
    agent_file.write_text("""---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

- Skill 1
- Skill 2
- Skill 3
- Skill 4
- Skill 5
- Skill 6
- Skill 7
- Skill 8
- Skill 9
- Skill 10

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
""")

    try:
        result = subprocess.run(
            ["python3", str(script_dir / "validate_agent.py"), str(agent_file)],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0
    finally:
        agent_file.unlink(missing_ok=True)


# Tests for frontmatter validation functions

def test_validate_name_valid():
    """Test valid name validation."""
    errors = validate_name("code-reviewer")
    assert len(errors) == 0

    errors = validate_name("test-agent-v2")
    assert len(errors) == 0


def test_validate_name_too_short():
    """Test name validation with too short name."""
    errors = validate_name("ag")
    assert len(errors) > 0
    assert any("too short" in e for e in errors)


def test_validate_name_too_long():
    """Test name validation with too long name."""
    errors = validate_name("a" * 51)
    assert len(errors) > 0
    assert any("too long" in e for e in errors)


def test_validate_name_with_underscore():
    """Test name validation with underscore."""
    errors = validate_name("my_agent")
    assert len(errors) > 0
    assert any("underscore" in e.lower() or "can only contain" in e for e in errors)


def test_validate_name_with_hyphen_start():
    """Test name validation starting with hyphen."""
    errors = validate_name("-agent")
    assert len(errors) > 0


def test_validate_name_missing():
    """Test name validation with missing name."""
    errors = validate_name(None)
    assert len(errors) > 0
    assert any("required" in e for e in errors)


def test_validate_description_valid():
    """Test valid description validation."""
    desc = "Use this agent when testing code. Examples: <example>test</example>"
    errors = validate_description(desc)
    assert len(errors) == 0


def test_validate_description_missing():
    """Test description validation with missing description."""
    errors = validate_description(None)
    assert len(errors) > 0
    assert any("required" in e for e in errors)


def test_validate_description_no_trigger():
    """Test description validation without trigger phrase."""
    desc = "This is a test agent"
    errors = validate_description(desc)
    assert len(errors) > 0
    assert any("Use this agent when" in e for e in errors)


def test_validate_description_no_example():
    """Test description validation without example."""
    desc = "Use this agent when testing code"
    errors = validate_description(desc)
    assert len(errors) > 0
    assert any("<example>" in e for e in errors)


def test_validate_model_valid():
    """Test valid model validation."""
    for model in ["inherit", "sonnet", "opus", "haiku"]:
        errors = validate_model(model)
        assert len(errors) == 0


def test_validate_model_invalid():
    """Test invalid model validation."""
    errors = validate_model("gpt4")
    assert len(errors) > 0
    assert any("must be one of" in e for e in errors)


def test_validate_model_missing():
    """Test model validation with missing model."""
    errors = validate_model(None)
    assert len(errors) > 0


def test_validate_color_valid():
    """Test valid color validation."""
    for color in ["blue", "cyan", "green", "yellow", "magenta", "red"]:
        errors = validate_color(color)
        assert len(errors) == 0


def test_validate_color_invalid():
    """Test invalid color validation."""
    errors = validate_color("purple")
    assert len(errors) > 0
    assert any("must be one of" in e for e in errors)


def test_validate_color_missing():
    """Test color validation with missing color."""
    errors = validate_color(None)
    assert len(errors) > 0


def test_validate_tools_valid():
    """Test valid tools validation."""
    errors = validate_tools(["Read", "Write"])
    assert len(errors) == 0

    errors = validate_tools(None)
    assert len(errors) == 0


def test_validate_tools_invalid():
    """Test invalid tools validation."""
    errors = validate_tools("Read, Write")
    assert len(errors) > 0
    assert any("array" in e for e in errors)


def test_validate_frontmatter_complete():
    """Test frontmatter validation with complete valid frontmatter."""
    frontmatter = {
        "name": "test-agent",
        "description": "Use this agent when testing. Examples: <example>test</example>",
        "model": "inherit",
        "color": "blue",
    }
    errors = validate_frontmatter(frontmatter)
    assert len(errors) == 0


def test_validate_frontmatter_invalid_fields():
    """Test frontmatter validation with invalid fields."""
    frontmatter = {
        "name": "test-agent",
        "description": "Use this agent when testing. Examples: <example>test</example>",
        "model": "inherit",
        "color": "blue",
        "agent": "something",  # Invalid field
        "subagents": ["a", "b"],  # Invalid field
    }
    errors = validate_frontmatter(frontmatter)
    assert len(errors) > 0
    assert any("Invalid frontmatter field" in e for e in errors)


def test_parse_frontmatter_with_yaml():
    """Test parsing frontmatter from content."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent

Content here.
"""
    fm, body = parse_frontmatter(content)
    assert fm.get("name") == "test-agent"
    assert fm.get("model") == "inherit"
    assert "# Test Agent" in body


def test_parse_frontmatter_without_frontmatter():
    """Test parsing content without frontmatter."""
    content = """# Test Agent

Content here.
"""
    fm, body = parse_frontmatter(content)
    assert fm == {}
    assert "Test Agent" in body


def test_validate_agent_with_valid_frontmatter():
    """Test full agent validation with valid frontmatter."""
    content = """---
name: code-reviewer
description: Use this agent when reviewing code. Examples: <example>test</example>
model: inherit
color: blue
---

# Code Reviewer

## METADATA

Test.

## PERSONA

Test.

## PHILOSOPHY

Test.

## VERIFICATION

Test.

## COMPETENCIES

- Skill 1
- Skill 2

## PROCESS

Test.

## RULES

DO: Do this

## OUTPUT

Test.
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert result["valid"] is True
    assert result["frontmatter"].get("name") == "code-reviewer"
    assert result["frontmatter"].get("model") == "inherit"


def test_validate_agent_with_invalid_name():
    """Test full agent validation with invalid name."""
    content = """---
name: my_agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: inherit
color: blue
---

# Test Agent
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert result["valid"] is False
    assert any("name" in e.lower() for e in result["errors"])


def test_validate_agent_with_invalid_model():
    """Test full agent validation with invalid model."""
    content = """---
name: test-agent
description: "Use this agent when testing. Examples: <example>test</example>"
model: gpt4
color: blue
---

# Test Agent
"""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(content)
        f.flush()
        result = validate_agent(Path(f.name))

    assert result["valid"] is False
    assert any("model" in e.lower() for e in result["errors"])
