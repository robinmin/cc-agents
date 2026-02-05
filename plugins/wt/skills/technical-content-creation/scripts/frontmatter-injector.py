#!/usr/bin/env python3
"""
Frontmatter injection utility for Technical Content Workflow.

Ensures all generated markdown files have proper YAML frontmatter
by checking existing files and injecting frontmatter as needed.
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.config import get_tcc_config


# Template mapping
TEMPLATE_MAP = {
    "research-brief": "research-brief.tpl.md",
    "outline-option": "outline-option.tpl.md",
    "outline-approved": "outline-approved.tpl.md",
    "draft-article": "draft-article.tpl.md",
    "article-adaptation": "article-adaptation.tpl.md",
    "article-published": "article-published.tpl.md",
}

# Required fields by template type
REQUIRED_FIELDS = {
    "research-brief": ["title", "topic", "research_type", "confidence"],
    "outline-option": ["title", "option", "style", "confidence"],
    "outline-approved": ["title", "selected_option", "approved_by"],
    "draft-article": ["title", "topic", "style_profile", "confidence"],
    "article-adaptation": ["title", "platform", "source"],
    "article-published": ["title", "published_at", "status"],
}


def load_template(template_name: str, templates_dir: Path) -> Optional[str]:
    """Load a frontmatter template file."""
    template_file = templates_dir / TEMPLATE_MAP.get(template_name, template_name)
    if template_file.exists():
        return template_file.read_text(encoding='utf-8')
    return None


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown content."""
    import re
    frontmatter_match = re.match(r'^---\n(.*?)\n---\n(.*)$', content, re.DOTALL)
    if frontmatter_match:
        frontmatter_str = frontmatter_match.group(1)
        body = frontmatter_match.group(2)
        return _parse_yaml_simple(frontmatter_str), body
    return {}, content


def _parse_yaml_simple(yaml_str: str) -> dict:
    """Parse simple YAML-like frontmatter (key: value pairs only)."""
    frontmatter = {}
    for line in yaml_str.strip().split('\n'):
        line = line.strip()
        if ':' in line and not line.startswith('#'):
            key, value = line.split(':', 1)
            frontmatter[key.strip()] = value.strip()
    return frontmatter


def has_frontmatter(content: str) -> bool:
    """Check if content has frontmatter."""
    return content.strip().startswith('---')


def inject_frontmatter(
    content: str,
    template_name: str,
    metadata: dict,
    templates_dir: Path
) -> str:
    """
    Inject frontmatter into markdown content.

    Args:
        content: Markdown content (without frontmatter)
        template_name: Type of template to use
        metadata: Metadata values to substitute in template
        templates_dir: Directory containing templates

    Returns:
        Content with frontmatter added
    """
    template = load_template(template_name, templates_dir)
    if not template:
        # Fallback: create basic frontmatter
        now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
        frontmatter = f"""---
title: "{metadata.get('title', 'Untitled')}"
topic: {metadata.get('topic', 'unknown')}
created_at: {now}
status: draft
---
"""
        return frontmatter + content

    # Substitute placeholders in template
    now = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
    metadata.setdefault('created_at', now)
    metadata.setdefault('updated_at', now)
    metadata.setdefault('version', 1)
    metadata.setdefault('status', 'draft')
    metadata.setdefault('confidence', 'MEDIUM')

    frontmatter = template
    for key, value in metadata.items():
        placeholder = f"{{{key}}}"
        frontmatter = frontmatter.replace(placeholder, str(value))

    # Handle the {content} placeholder
    if "{content}" in frontmatter:
        frontmatter = frontmatter.replace("{content}", "")

    return frontmatter + content


def validate_frontmatter(content: str, template_name: str) -> tuple[bool, list[str]]:
    """
    Validate frontmatter in content.

    Args:
        content: Markdown content with frontmatter
        template_name: Expected template type

    Returns:
        Tuple of (is_valid, list of errors)
    """
    errors = []

    if not has_frontmatter(content):
        return False, ["File missing frontmatter (no --- at start)"]

    frontmatter, _ = parse_frontmatter(content)
    required = REQUIRED_FIELDS.get(template_name, [])

    for field in required:
        if field not in frontmatter:
            errors.append(f"Missing required field: {field}")

    return len(errors) == 0, errors


def process_file(
    file_path: Path,
    template_name: str,
    metadata: dict,
    templates_dir: Path,
    validate_only: bool = False
) -> tuple[bool, str]:
    """
    Process a single markdown file for frontmatter.

    Args:
        file_path: Path to markdown file
        template_name: Type of template to use
        metadata: Metadata values
        templates_dir: Directory containing templates
        validate_only: If True, only validate (don't inject)

    Returns:
        Tuple of (success, message)
    """
    if not file_path.exists():
        return False, f"File not found: {file_path}"

    content = file_path.read_text(encoding='utf-8')

    if has_frontmatter(content):
        if validate_only:
            is_valid, errors = validate_frontmatter(content, template_name)
            if is_valid:
                return True, f"Frontmatter valid: {file_path.name}"
            else:
                return False, f"Frontmatter errors in {file_path.name}: {', '.join(errors)}"
        else:
            return True, f"Frontmatter already present: {file_path.name}"

    # No frontmatter - inject it
    if validate_only:
        return False, f"Missing frontmatter: {file_path.name}"

    new_content = inject_frontmatter(content, template_name, metadata, templates_dir)
    file_path.write_text(new_content, encoding='utf-8')
    return True, f"Injected frontmatter: {file_path.name}"


def cmd_validate(args) -> None:
    """Validate frontmatter in markdown files."""
    repo_root = Path.cwd()
    templates_dir = repo_root / "plugins/wt/skills/technical-content-creation/assets/templates"

    errors_found = 0
    files_checked = 0

    # Stage-specific validation
    stage_files = {
        "research-brief": ["1-research/research-brief.md"],
        "outline-option": ["2-outline/outline-option-a.md", "2-outline/outline-option-b.md", "2-outline/outline-option-c.md"],
        "outline-approved": ["2-outline/outline-approved.md"],
        "draft-article": ["3-draft/draft-article.md"],
    }

    for template_name, files in stage_files.items():
        for file_rel in files:
            file_path = repo_root / file_rel
            if file_path.exists():
                files_checked += 1
                success, message = process_file(
                    file_path, template_name, {}, templates_dir, validate_only=True
                )
                if not success:
                    errors_found += 1
                    print(f"  ERROR: {message}")
                else:
                    print(f"  OK: {message}")

    print(f"\nValidation complete: {files_checked} files checked, {errors_found} errors")


def cmd_inject(args) -> None:
    """Inject frontmatter into markdown files."""
    repo_root = Path.cwd()
    templates_dir = repo_root / "plugins/wt/skills/technical-content-creation/assets/templates"

    metadata = {
        "topic": args.topic or "unknown",
        "collection": args.collection or "unknown",
        "title": args.title or "Untitled",
        "confidence": args.confidence or "MEDIUM",
        "research_type": args.research_type or "systematic",
        "platform": args.platform or "blog",
        "style_profile": args.style or "technical-writer",
    }

    files_injected = 0
    files_skipped = 0

    # Stage-specific injection
    if args.stage == "all" or args.stage == "1":
        success, msg = process_file(
            repo_root / "1-research/research-brief.md",
            "research-brief", metadata, templates_dir
        )
        if success:
            files_injected += 1
        else:
            files_skipped += 1

    if args.stage == "all" or args.stage == "2":
        for opt in ['a', 'b', 'c']:
            success, _ = process_file(
                repo_root / f"2-outline/outline-option-{opt}.md",
                "outline-option", metadata | {"option": opt, "style": f"style-{opt}"}, templates_dir
            )
            if success:
                files_injected += 1
            else:
                files_skipped += 1
        success, _ = process_file(
            repo_root / "2-outline/outline-approved.md",
            "outline-approved", metadata | {"selected_option": "a", "approved_by": "user"}, templates_dir
        )
        success, _ = process_file(
            repo_root / "2-outline/outline-approved.md",
            "outline-approved", metadata | {"selected_option": "a", "approved_by": "user"}, templates_dir
        )
        if success:
            files_injected += 1
        else:
            files_skipped += 1

    if args.stage == "all" or args.stage == "3":
        success, _ = process_file(
            repo_root / "3-draft/draft-article.md",
            "draft-article", metadata | {"version": 1}, templates_dir
        )
        if success:
            files_injected += 1
        else:
            files_skipped += 1

    if args.stage == "all" or args.stage == "5":
        for platform in ['twitter', 'linkedin', 'devto', 'medium']:
            file_path = repo_root / f"5-adaptation/article-{platform}.md"
            if file_path.exists():
                success, _ = process_file(
                    file_path, "article-adaptation",
                    metadata | {"platform": platform, "original_length": 0, "adapted_length": 0},
                    templates_dir
                )
                if success:
                    files_injected += 1
                else:
                    files_skipped += 1

    if args.stage == "all" or args.stage == "6":
        success, _ = process_file(
            repo_root / "6-publish/article.md",
            "article-published", metadata | {"published_at": datetime.now().isoformat(), "word_count": 0}, templates_dir
        )
        if success:
            files_injected += 1
        else:
            files_skipped += 1

    print(f"Frontmatter injection complete:")
    print(f"  - Files processed: {files_injected + files_skipped}")
    print(f"  - Frontmatter injected: {files_injected}")
    print(f"  - Already had frontmatter: {files_skipped}")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Frontmatter injection utility for Technical Content Workflow",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate all stage files for frontmatter
  %(prog)s --validate

  # Inject frontmatter into all files
  %(prog)s --inject --topic my-topic --collection tutorials

  # Inject frontmatter into specific stage
  %(prog)s --inject --stage 3 --topic my-topic --collection tutorials
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate frontmatter in markdown files")
    validate_parser.set_defaults(command="validate")

    # Inject command
    inject_parser = subparsers.add_parser("inject", help="Inject frontmatter into markdown files")
    inject_parser.set_defaults(command="inject")
    inject_parser.add_argument("--stage", "-s", choices=["1", "2", "3", "5", "6", "all"], default="all",
                              help="Stage to process (default: all)")
    inject_parser.add_argument("--topic", "-t", help="Topic name for metadata")
    inject_parser.add_argument("--collection", "-c", help="Collection name for metadata")
    inject_parser.add_argument("--title", help="Article title for metadata")
    inject_parser.add_argument("--confidence", choices=["HIGH", "MEDIUM", "LOW"], default="MEDIUM",
                              help="Confidence level")
    inject_parser.add_argument("--research-type", default="systematic", help="Research type")
    inject_parser.add_argument("--platform", default="blog", help="Platform name")
    inject_parser.add_argument("--style", default="technical-writer", help="Style profile")

    args = parser.parse_args()

    if args.command == "validate":
        cmd_validate(args)
    elif args.command == "inject":
        cmd_inject(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
