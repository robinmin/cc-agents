#!/usr/bin/env python3
"""
Outline generator script for technical-content-creation.

Generates 2-3 alternative outline options in parallel from a research brief,
allowing user selection of the preferred option.
"""

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.config import get_tcc_config, get_tcc_repo_root


# Outline option styles
OUTLINE_STYLES = {
    "a": {
        "name": "Traditional/Structured",
        "id": "traditional-structured",
        "description": "Hierarchical, logical progression",
        "best_for": "Technical documentation, tutorials",
    },
    "b": {
        "name": "Narrative/Story-driven",
        "id": "narrative-story-driven",
        "description": "Storytelling, engaging flow",
        "best_for": "Blog posts, opinion pieces",
    },
    "c": {
        "name": "Technical/Deep-dive",
        "id": "technical-deep-dive",
        "description": "Comprehensive, detail-oriented",
        "best_for": "In-depth guides, reference docs",
    },
}

# Prompt templates for each style
PROMPT_TEMPLATES = {
    "a": """Generate a traditional, structured outline for "{topic}" based on the research brief.

Style guidelines:
- Hierarchical structure with clear sections
- Logical progression from fundamentals to advanced topics
- Formal, organized presentation
- Focus on clarity and completeness

Length: {length}
Research brief: {research_brief}""",
    "b": """Generate a narrative, story-driven outline for "{topic}" based on the research brief.

Style guidelines:
- Storytelling approach with engaging hooks
- Real-world scenarios and examples
- Conversational tone
- Focus on reader engagement

Length: {length}
Research brief: {research_brief}""",
    "c": """Generate a technical, comprehensive outline for "{topic}" based on the research brief.

Style guidelines:
- Comprehensive coverage of all aspects
- Technical depth and detail
- Advanced topics and edge cases
- Focus on thoroughness

Length: {length}
Research brief: {research_brief}""",
}

# Outline structure templates
OUTLINE_TEMPLATES = {
    "short": """1. Introduction
2. Main Content (2-3 sections)
3. Conclusion""",
    "long": """1. Introduction (hook, context, thesis)
2. Background (historical, current)
3. Core Topic 1
4. Core Topic 2
5. Core Topic 3
6. Best Practices
7. Common Pitfalls
8. Conclusion (summary, future)""",
}


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """
    Parse YAML frontmatter from markdown content.

    Args:
        content: Markdown content with frontmatter

    Returns:
        Tuple of (frontmatter dict, body content)
    """
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
    if frontmatter_match:
        frontmatter_str = frontmatter_match.group(1)
        body = frontmatter_match.group(2)

        # Parse simple YAML-like frontmatter
        frontmatter = {}
        for line in frontmatter_str.split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                frontmatter[key.strip()] = value.strip()

        return frontmatter, body
    return {}, content


def read_research_brief(research_brief_path: Path) -> dict:
    """
    Read and parse the research brief file.

    Args:
        research_brief_path: Path to research-brief.md

    Returns:
        Dictionary with title, content, and metadata
    """
    if not research_brief_path.exists():
        raise FileNotFoundError(
            f"Research brief not found: {research_brief_path}"
        )

    content = research_brief_path.read_text(encoding='utf-8')
    frontmatter, body = parse_frontmatter(content)

    title = frontmatter.get('title', '')
    if not title:
        # Try to extract title from body
        title_match = re.search(r'^#\s+(.+)$', body, re.MULTILINE)
        title = title_match.group(1) if title_match else 'Untitled Topic'

    return {
        'title': title,
        'content': body,
        'frontmatter': frontmatter,
        'path': str(research_brief_path),
    }


def generate_outline_prompt(
    option: str,
    topic: str,
    length: str,
    research_brief: dict
) -> str:
    """
    Generate the prompt for creating an outline option.

    Args:
        option: Option identifier (a, b, or c)
        topic: Topic title
        length: Outline length (short or long)
        research_brief: Research brief dictionary

    Returns:
        Prompt string for outline generation
    """
    template = PROMPT_TEMPLATES.get(option, PROMPT_TEMPLATES['a'])
    research_brief_path = research_brief.get('path', '1-research/research-brief.md')

    return template.format(
        topic=topic,
        length=length,
        research_brief=research_brief_path
    )


def create_outline_option_frontmatter(
    option: str,
    topic: str,
    research_brief_path: str,
    confidence: str = "MEDIUM"
) -> str:
    """
    Create frontmatter for an outline option.

    Args:
        option: Option identifier (a, b, or c)
        topic: Topic title
        research_brief_path: Path to source research brief
        confidence: Confidence level

    Returns:
        YAML frontmatter string
    """
    style = OUTLINE_STYLES[option]
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

    return f"""---
title: Outline Option {option.upper()} - {style['name']}
source_research: {research_brief_path}
option: {option}
style: {style['id']}
created_at: {now}
status: draft
confidence: {confidence}
---"""


def create_outline_content(
    option: str,
    topic: str,
    length: str,
    research_brief: dict
) -> str:
    """
    Generate the outline content for an option.

    Note: This is a placeholder implementation. In actual use,
    this would call an LLM to generate the outline based on
    the research brief content and style guidelines.

    Args:
        option: Option identifier (a, b, or c)
        topic: Topic title
        length: Outline length (short or long)
        research_brief: Research brief dictionary

    Returns:
        Generated outline content
    """
    style = OUTLINE_STYLES[option]

    # Extract key themes from research brief
    brief_content = research_brief['content']
    theme_match = re.findall(r'##\s+(.+)', brief_content)
    themes = [t.strip() for t in theme_match if t.strip()] if theme_match else [
        "Key Theme 1",
        "Key Theme 2",
        "Key Theme 3",
    ]

    # Build outline based on style and length
    if option == "a":
        # Traditional/Structured
        if length == "short":
            sections = [
                "## 1. Introduction",
                f"   - Overview of {topic}",
                "   - Why this topic matters",
                "   - Who this guide is for",
                "",
                "## 2. Main Content",
            ]
            for i, theme in enumerate(themes[:2], 1):
                sections.append(f"   - {theme}")
            sections.extend([
                "",
                "## 3. Conclusion",
                "   - Key takeaways",
                "   - Next steps",
            ])
        else:  # long
            sections = [
                "## 1. Introduction",
                f"   - Overview of {topic}",
                "   - Why this topic matters",
                "   - Who this guide is for",
                "",
                "## 2. Background",
                "   - Historical context",
                "   - Current state",
                "",
                "## 3. Core Topics",
            ]
            for i, theme in enumerate(themes[:3], 1):
                sections.extend([
                    f"## {3+i}. {theme}",
                    f"   - Key concept {i}",
                    f"   - Practical application",
                    f"   - Common considerations",
                ])
            sections.extend([
                "",
                "## 7. Best Practices",
                "   - Recommended approaches",
                "   - Industry standards",
                "",
                "## 8. Conclusion",
                "   - Summary of key points",
                "   - Future considerations",
            ])

    elif option == "b":
        # Narrative/Story-driven
        if length == "short":
            sections = [
                "## 1. The Hook",
                f"   - A compelling story about {topic}",
                "   - Why you should care",
                "",
                "## 2. The Journey",
                "   - Setting the scene",
                "   - Building understanding",
                "",
                "## 3. The Takeaway",
                "   - Lessons learned",
                "   - Action items",
            ]
        else:  # long
            sections = [
                "## 1. The Hook",
                f"   - A personal story about {topic}",
                "   - Why this matters to you",
                "",
                "## 2. Setting the Scene",
                "   - The challenge we face",
                "   - The opportunity ahead",
                "",
                "## 3. The Journey Begins",
            ]
            for i, theme in enumerate(themes[:3], 1):
                sections.extend([
                    f"## {3+i}. Exploring {theme}",
                    f"   - Real-world example",
                    f"   - What I learned",
                ])
            sections.extend([
                "",
                "## 7. The Turning Point",
                "   - Key insights",
                "   - Aha moments",
                "",
                "## 8. The Takeaway",
                "   - Final lessons",
                "   - Call to action",
            ])

    else:  # option == "c"
        # Technical/Deep-dive
        if length == "short":
            sections = [
                "## 1. Technical Overview",
                f"   - Definition of {topic}",
                "   - Core concepts",
                "",
                "## 2. Technical Details",
                "   - Implementation specifics",
                "   - Technical considerations",
                "",
                "## 3. Technical Summary",
                "   - Key technical points",
                "   - Recommendations",
            ]
        else:  # long
            sections = [
                "## 1. Technical Overview",
                f"   - Definition of {topic}",
                "   - Architecture/components",
                "   - Technical prerequisites",
                "",
                "## 2. Deep Dive: Foundations",
                "   - Underlying mechanisms",
                "   - Technical specifications",
                "   - Standards and protocols",
                "",
                "## 3. Implementation Details",
            ]
            for i, theme in enumerate(themes[:3], 1):
                sections.extend([
                    f"## {3+i}. {theme}: Technical Analysis",
                    f"   - Technical specifications",
                    f"   - Edge cases and considerations",
                    f"   - Performance implications",
                ])
            sections.extend([
                "",
                "## 7. Advanced Topics",
                "   - Optimization techniques",
                "   - Scalability considerations",
                "",
                "## 8. Technical Summary",
                "   - Best practices",
                "   - Common pitfalls",
                "   - Future developments",
            ])

    return '\n'.join(sections)


def save_outline_option(
    option: str,
    topic: str,
    length: str,
    research_brief: dict,
    outline_dir: Path,
    confidence: str = "MEDIUM"
) -> Path:
    """
    Generate and save an outline option file.

    Args:
        option: Option identifier (a, b, or c)
        topic: Topic title
        length: Outline length (short or long)
        research_brief: Research brief dictionary
        outline_dir: Directory to save outline files
        confidence: Confidence level

    Returns:
        Path to saved outline file
    """
    research_brief_path = research_brief.get('path', '1-research/research-brief.md')

    # Create frontmatter
    frontmatter = create_outline_option_frontmatter(
        option, topic, research_brief_path, confidence
    )

    # Generate outline content
    content = create_outline_content(option, topic, length, research_brief)

    # Style header
    style = OUTLINE_STYLES[option]
    header = f"# Outline Option {option.upper()}: {style['name']} Approach\n"

    # Combine and save
    full_content = frontmatter + '\n' + header + content

    outline_file = outline_dir / f"outline-option-{option}.md"
    outline_file.write_text(full_content, encoding='utf-8')

    return outline_file


def save_generation_materials(
    topic: str,
    length: str,
    options: list[str],
    research_brief: dict,
    materials_dir: Path
) -> None:
    """
    Save generation materials (prompts and parameters).

    Args:
        topic: Topic title
        length: Outline length
        options: List of option identifiers generated
        research_brief: Research brief dictionary
        materials_dir: Directory to save materials
    """
    # Ensure materials directory exists
    materials_dir.mkdir(parents=True, exist_ok=True)

    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")

    # Save prompts-used.md
    prompts_content = f"""# Outline Generation Prompts

**Generated**: {now}
**Research Brief**: {research_brief.get('path', '1-research/research-brief.md')}
**Topic**: {topic}
**Length**: {length}

---

"""
    for opt in options:
        style = OUTLINE_STYLES[opt]
        prompt = generate_outline_prompt(opt, topic, length, research_brief)

        prompts_content += f"""## Option {opt.upper()}: {style['name']}

**Style ID**: {style['id']}
**Description**: {style['description']}

**Prompt Template**:
```
{PROMPT_TEMPLATES[opt]}
```

**Actual Prompt Used**:
```
{prompt}
```

---

"""

    prompts_file = materials_dir / "prompts-used.md"
    prompts_file.write_text(prompts_content, encoding='utf-8')

    # Save generation-params.json
    params = {
        "generated_at": now,
        "topic": topic,
        "length": length,
        "options_generated": options,
        "source_research": research_brief.get('path'),
        "styles": [
            {
                "option": opt,
                "name": OUTLINE_STYLES[opt]['name'],
                "id": OUTLINE_STYLES[opt]['id'],
            }
            for opt in options
        ],
        "research_brief_frontmatter": research_brief.get('frontmatter', {}),
    }

    params_file = materials_dir / "generation-params.json"
    params_file.write_text(json.dumps(params, indent=2, ensure_ascii=False), encoding='utf-8')


def copy_approved_outline(
    outline_dir: Path,
    selected_option: str,
    approved_by: str = "user"
) -> Path:
    """
    Copy the selected option to outline-approved.md with updated frontmatter.

    Args:
        outline_dir: Directory containing outline files
        selected_option: Option identifier (a, b, or c)
        approved_by: Who approved the outline

    Returns:
        Path to approved outline file
    """
    source_file = outline_dir / f"outline-option-{selected_option}.md"
    approved_file = outline_dir / "outline-approved.md"

    if not source_file.exists():
        raise FileNotFoundError(f"Source outline not found: {source_file}")

    # Read source content
    content = source_file.read_text(encoding='utf-8')
    frontmatter, body = parse_frontmatter(content)

    # Update frontmatter for approved version
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    style = OUTLINE_STYLES[selected_option]

    approved_frontmatter = f"""---
title: Outline Approved: {frontmatter.get('title', 'Topic')}
source_research: {frontmatter.get('source_research', '1-research/research-brief.md')}
selected_option: {selected_option}
selected_style: {style['id']}
approved_at: {now}
approved_by: {approved_by}
status: approved
confidence: {frontmatter.get('confidence', 'MEDIUM')}
---
"""

    # Combine and save
    approved_content = approved_frontmatter + body
    approved_file.write_text(approved_content, encoding='utf-8')

    return approved_file


def present_options(options: list[str]) -> str:
    """
    Present outline options for user selection.

    Args:
        options: List of option identifiers

    Returns:
        Formatted prompt for user selection
    """
    prompt = "Which outline option would you like to approve?\n\n"
    for opt in options:
        style = OUTLINE_STYLES[opt]
        prompt += f"[Option {opt.upper()}] {style['name']} - {style['description']}\n"
    prompt += "\nPlease enter your selection (a, b, or c):"

    return prompt


def cmd_generate(args) -> None:
    """Generate outline options."""
    # Get repository root
    repo_root = get_tcc_repo_root()

    if repo_root is None:
        print("Error: Repository root not configured")
        print("\nUse repo-config.py --set-root <path> to configure")
        sys.exit(1)

    # Get current working directory relative to repo root
    cwd = Path.cwd()
    try:
        rel_path = cwd.relative_to(repo_root)
    except ValueError:
        print("Error: Current directory is not within the configured repository")
        sys.exit(1)

    # Validate we're in a topic folder
    if not rel_path.parts or 'collections' not in str(rel_path):
        print("Error: Please run this command from within a topic folder")
        print("Expected path structure: <repo>/collections/<collection>/<topic>/")
        sys.exit(1)

    # Find research brief
    research_brief_path = cwd / "1-research" / "research-brief.md"
    if not research_brief_path.exists():
        print(f"Error: Research brief not found at: {research_brief_path}")
        print("\nPlease complete Stage 1 (Research) before generating outlines.")
        sys.exit(1)

    # Create outline directory
    outline_dir = cwd / "2-outline"
    outline_dir.mkdir(exist_ok=True)
    materials_dir = outline_dir / "materials"

    # Read research brief
    research_brief = read_research_brief(research_brief_path)
    topic = research_brief['title']

    # Determine options to generate
    num_options = args.options
    options_list = ['a', 'b', 'c'][:num_options]
    length = args.length

    print(f"Generating {num_options} outline option(s) for: {topic}")
    print(f"Length: {length}")
    print()

    # Generate outline options
    generated_files = []
    for opt in options_list:
        style = OUTLINE_STYLES[opt]
        print(f"  Generating Option {opt.upper()}: {style['name']}...")

        outline_file = save_outline_option(
            opt, topic, length, research_brief, outline_dir, args.confidence
        )
        generated_files.append(outline_file)

        print(f"    Saved to: {outline_file.relative_to(cwd)}")

    # Save generation materials
    save_generation_materials(topic, length, options_list, research_brief, materials_dir)
    print(f"  Materials saved to: {materials_dir.relative_to(cwd)}")
    print()

    # Present options for selection
    print("Outline Options Generated:")
    print()
    for opt in options_list:
        style = OUTLINE_STYLES[opt]
        print(f"  [Option {opt.upper()}] {style['name']}")
        print(f"               {style['description']}")
        print(f"               Best for: {style['best_for']}")
    print()

    if args.interactive:
        # Interactive selection
        while True:
            selection = input(present_options(options_list)).strip().lower()
            if selection in options_list:
                break
            print(f"Invalid selection. Please choose from: {', '.join(options_list)}")

        # Copy selected option to approved
        approved_file = copy_approved_outline(outline_dir, selection)
        print()
        print(f"Approved outline saved to: {approved_file.relative_to(cwd)}")
    else:
        # Non-interactive: show command to approve
        print("To approve an option, run:")
        print(f"  {sys.argv[0]} --approve <option>  # e.g., --approve b")


def cmd_approve(args) -> None:
    """Approve a specific outline option."""
    # Get repository root
    repo_root = get_tcc_repo_root()

    if repo_root is None:
        print("Error: Repository root not configured")
        sys.exit(1)

    # Get current working directory
    cwd = Path.cwd()

    # Find outline directory
    outline_dir = cwd / "2-outline"
    if not outline_dir.exists():
        print(f"Error: Outline directory not found at: {outline_dir}")
        sys.exit(1)

    # Validate selection
    selection = args.approve.lower()
    if selection not in ['a', 'b', 'c']:
        print("Error: Invalid option. Must be 'a', 'b', or 'c'")
        sys.exit(1)

    # Check if source file exists
    source_file = outline_dir / f"outline-option-{selection}.md"
    if not source_file.exists():
        print(f"Error: Outline option {selection.upper()} not found")
        print(f"Expected file: {source_file.relative_to(cwd)}")
        sys.exit(1)

    # Copy to approved
    approved_file = copy_approved_outline(outline_dir, selection, args.approved_by)

    # Read style name for confirmation
    content = source_file.read_text(encoding='utf-8')
    frontmatter, _ = parse_frontmatter(content)
    style_name = frontmatter.get('title', '').split(' - ')[1] if ' - ' in frontmatter.get('title', '') else OUTLINE_STYLES[selection]['name']

    print(f"Approved Outline Option {selection.upper()}: {style_name}")
    print(f"Saved to: {approved_file.relative_to(cwd)}")


def cmd_list(args) -> None:
    """List existing outline options."""
    # Get current working directory
    cwd = Path.cwd()

    # Find outline directory
    outline_dir = cwd / "2-outline"
    if not outline_dir.exists():
        print("Error: Outline directory not found")
        sys.exit(1)

    # Check for approved outline
    approved_file = outline_dir / "outline-approved.md"

    print("Outline Options:")
    print()

    for opt in ['a', 'b', 'c']:
        opt_file = outline_dir / f"outline-option-{opt}.md"
        if opt_file.exists():
            content = opt_file.read_text(encoding='utf-8')
            frontmatter, _ = parse_frontmatter(content)
            status = frontmatter.get('status', 'draft')
            style = frontmatter.get('style', OUTLINE_STYLES[opt]['id'])
            print(f"  [Option {opt.upper()}] {style}")
            print(f"               Status: {status}")

    if approved_file.exists():
        content = approved_file.read_text(encoding='utf-8')
        frontmatter, _ = parse_frontmatter(content)
        selected = frontmatter.get('selected_option', '?')
        print(f"\n  Approved: Option {selected.upper()}")
    else:
        print("\n  No approved outline")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Technical Content Creation - Outline Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate 3 outline options interactively
  %(prog)s --options 3 --length long --interactive

  # Generate 2 outline options (non-interactive)
  %(prog)s --options 2 --length short

  # Approve a specific option
  %(prog)s --approve b

  # List existing options
  %(prog)s --list

Outline Styles:
  [A] Traditional/Structured - Hierarchical, logical progression
  [B] Narrative/Story-driven  - Storytelling, engaging flow
  [C] Technical/Deep-dive     - Comprehensive, detail-oriented
        """
    )

    parser.add_argument(
        "--options", "-o",
        type=int,
        choices=[2, 3],
        default=3,
        help="Number of outline options to generate (default: 3)"
    )
    parser.add_argument(
        "--length", "-l",
        choices=["short", "long"],
        default="long",
        help="Outline length (default: long)"
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Interactive mode - prompt for option selection"
    )
    parser.add_argument(
        "--approve",
        metavar="OPTION",
        help="Approve a specific option (a, b, or c)"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List existing outline options"
    )
    parser.add_argument(
        "--confidence", "-c",
        choices=["HIGH", "MEDIUM", "LOW"],
        default="MEDIUM",
        help="Confidence level for generated outlines (default: MEDIUM)"
    )
    parser.add_argument(
        "--approved-by",
        default="user",
        help="Who is approving the outline (for --approve mode)"
    )

    args = parser.parse_args()

    # Route to appropriate command
    if args.list:
        cmd_list(args)
    elif args.approve:
        cmd_approve(args)
    else:
        cmd_generate(args)


if __name__ == "__main__":
    main()
