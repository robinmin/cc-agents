"""Pytest configuration and fixtures for workflow-orchestration tests."""

import json
import re
from pathlib import Path

import pytest

# Project paths
# __file__ = .../plugins/rd2/skills/workflow-orchestration/tests/conftest.py
# Go up to plugins/rd2/ (the plugin root containing agents/, commands/, skills/)
PLUGIN_ROOT = Path(__file__).parent.parent.parent.parent  # plugins/rd2/
SKILL_DIR = Path(__file__).parent.parent
SKILL_MD = SKILL_DIR / "SKILL.md"
AGENTS_DIR = PLUGIN_ROOT / "agents"
COMMANDS_DIR = PLUGIN_ROOT / "commands"
REGISTRY_JSON = SKILL_DIR / "references" / "registry.json"
SUPER_PLANNER_MD = AGENTS_DIR / "super-planner.md"
TASKS_PLAN_MD = COMMANDS_DIR / "tasks-plan.md"


def parse_yaml_frontmatter(filepath: Path) -> dict:
    """Parse YAML frontmatter from a markdown file.

    Returns a dict with raw key-value pairs from the frontmatter.
    Handles multiline values (like description with |) by joining lines.
    """
    content = filepath.read_text()
    if not content.startswith("---"):
        return {}

    # Find closing ---
    end_idx = content.index("---", 3)
    frontmatter_text = content[3:end_idx].strip()

    result = {}
    current_key = None
    current_value_lines = []

    for line in frontmatter_text.split("\n"):
        # Check for top-level key: value
        key_match = re.match(r"^(\w[\w-]*)\s*:\s*(.*)", line)
        if key_match and not line.startswith(" ") and not line.startswith("\t"):
            # Save previous key if any
            if current_key is not None:
                result[current_key] = "\n".join(current_value_lines).strip()
            current_key = key_match.group(1)
            current_value_lines = [key_match.group(2)]
        elif current_key is not None:
            current_value_lines.append(line)

    # Save last key
    if current_key is not None:
        result[current_key] = "\n".join(current_value_lines).strip()

    return result


def parse_tools_list(filepath: Path) -> list[str]:
    """Extract the tools list from YAML frontmatter.

    Handles the list format:
    tools:
      - Tool1
      - Tool2
    """
    content = filepath.read_text()
    if not content.startswith("---"):
        return []

    end_idx = content.index("---", 3)
    frontmatter_text = content[3:end_idx]

    tools = []
    in_tools = False
    for line in frontmatter_text.split("\n"):
        if line.strip().startswith("tools:"):
            in_tools = True
            # Check for inline list: tools: [A, B, C]
            inline_match = re.match(r"\s*tools:\s*\[(.*)\]", line)
            if inline_match:
                tools = [t.strip() for t in inline_match.group(1).split(",")]
                break
            continue
        if in_tools:
            item_match = re.match(r"\s+-\s+(.*)", line)
            if item_match:
                tools.append(item_match.group(1).strip())
            elif line.strip() and not line.startswith(" ") and not line.startswith("\t"):
                break  # New top-level key, done with tools

    return tools


def extract_json_block(filepath: Path, marker: str = "```json") -> dict | None:
    """Extract and parse the first JSON code block from a markdown file."""
    content = filepath.read_text()
    start = content.find(marker)
    if start == -1:
        return None
    start += len(marker)
    end = content.find("```", start)
    if end == -1:
        return None
    json_text = content[start:end].strip()
    return json.loads(json_text)


@pytest.fixture
def skill_content():
    """Return the full text content of SKILL.md."""
    return SKILL_MD.read_text()


@pytest.fixture
def planner_content():
    """Return the full text content of super-planner.md."""
    return SUPER_PLANNER_MD.read_text()


@pytest.fixture
def command_content():
    """Return the full text content of tasks-plan.md."""
    return TASKS_PLAN_MD.read_text()


@pytest.fixture
def workflow_registry():
    """Load the workflow template registry from references/registry.json."""
    assert REGISTRY_JSON.exists(), f"Missing: {REGISTRY_JSON}"
    return json.loads(REGISTRY_JSON.read_text())


@pytest.fixture
def planner_tools():
    """Extract and return the tools list from super-planner.md frontmatter."""
    return parse_tools_list(SUPER_PLANNER_MD)


@pytest.fixture
def planner_frontmatter():
    """Extract and return the frontmatter from super-planner.md."""
    return parse_yaml_frontmatter(SUPER_PLANNER_MD)
