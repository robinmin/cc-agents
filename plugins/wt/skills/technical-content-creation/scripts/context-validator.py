#!/usr/bin/env python3
"""
Context validation script for technical-content-creation.

Validates that the current directory is within a valid topic structure
and reports the completion status of all 7 stages.
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
from shared.config import get_tcc_repo_root


# Stage definitions
STAGES = {
    0: {
        "name": "Materials",
        "folder": "0-materials",
        "key_files": ["materials.json", "materials-extracted.md"],
        "key_outputs": ["materials-extracted.md"],
    },
    1: {
        "name": "Research",
        "folder": "1-research",
        "key_files": ["sources.json", "research-brief.md"],
        "key_outputs": ["research-brief.md"],
    },
    2: {
        "name": "Outline",
        "folder": "2-outline",
        "key_files": ["outline-approved.md"],
        "key_outputs": ["outline-approved.md"],
    },
    3: {
        "name": "Draft",
        "folder": "3-draft",
        "key_files": ["draft-article.md"],
        "key_outputs": ["draft-article.md"],
    },
    4: {
        "name": "Illustration",
        "folder": "4-illustration",
        "key_files": ["captions.json"],
        "key_outputs": ["captions.json"],
    },
    5: {
        "name": "Adaptation",
        "folder": "5-adaptation",
        "key_files": ["article-twitter.md", "article-linkedin.md", "article-devto.md"],
        "key_outputs": ["article-twitter.md", "article-linkedin.md"],
    },
    6: {
        "name": "Publish",
        "folder": "6-publish",
        "key_files": ["article.md", "publish-log.json"],
        "key_outputs": ["article.md", "publish-log.json"],
    },
}

# Topic folder marker files
TOPIC_MARKERS = ["topic.md"]


class TopicContext:
    """Represents the current topic context."""

    def __init__(self, repo_root: Optional[Path], topic_dir: Optional[Path]):
        self.repo_root = repo_root
        self.topic_dir = topic_dir
        self.topic_id = topic_dir.name if topic_dir else None
        self.collection_dir = topic_dir.parent if topic_dir else None
        self.valid = False

    def __bool__(self) -> bool:
        return self.valid


def find_repo_root(start_dir: Path) -> Optional[Path]:
    """
    Find the TCC repository root by searching upward from start_dir.

    Args:
        start_dir: Directory to start searching from

    Returns:
        Repository root path if found, None otherwise
    """
    # Check if configured root exists
    configured_root = get_tcc_repo_root()
    if configured_root and configured_root.exists():
        return configured_root

    # Search upward for collections.json
    current = start_dir.resolve()
    while current != current.parent:
        if (current / "collections.json").exists():
            return current
        current = current.parent

    return None


def find_topic_context(start_dir: Path) -> TopicContext:
    """
    Find the topic context from the current directory.

    Args:
        start_dir: Directory to start searching from

    Returns:
        TopicContext object with repository and topic info
    """
    # First find repo root
    repo_root = find_repo_root(start_dir)

    if repo_root is None:
        return TopicContext(None, None)

    # Search for topic.md upward from current directory
    current = start_dir.resolve()
    while current != repo_root.parent and current != current.parent:
        if (current / "topic.md").exists():
            # Verify it's in a valid topic structure (has stage folders)
            has_stage_folders = any(
                (current / stage["folder"]).exists()
                for stage in STAGES.values()
            )
            if has_stage_folders:
                context = TopicContext(repo_root, current)
                context.valid = True
                return context
        current = current.parent

    # No valid topic context found
    return TopicContext(repo_root, None)


def get_stage_status(topic_dir: Path, stage_num: int) -> dict:
    """
    Get the completion status of a specific stage.

    Args:
        topic_dir: Path to topic directory
        stage_num: Stage number (0-6)

    Returns:
        Status dictionary with keys: complete, missing_files, existing_files
    """
    if stage_num not in STAGES:
        raise ValueError(f"Invalid stage number: {stage_num}")

    stage = STAGES[stage_num]
    stage_dir = topic_dir / stage["folder"]

    if not stage_dir.exists():
        return {
            "complete": False,
            "missing_files": stage["key_files"],
            "existing_files": [],
        }

    existing = []
    missing = []

    for file_name in stage["key_files"]:
        file_path = stage_dir / file_name
        if file_path.exists():
            existing.append(file_name)
        else:
            missing.append(file_name)

    # Check if all key outputs exist
    complete = all(
        (stage_dir / f).exists()
        for f in stage["key_outputs"]
    )

    return {
        "complete": complete,
        "missing_files": missing,
        "existing_files": existing,
    }


def detect_current_stage(topic_dir: Path) -> Optional[int]:
    """
    Detect the current active stage based on folder contents.

    The current stage is the highest incomplete stage, or the last complete stage.

    Args:
        topic_dir: Path to topic directory

    Returns:
        Stage number (0-6) or None if no stages are complete
    """
    highest_complete = -1
    first_incomplete = -1

    for stage_num in range(7):
        status = get_stage_status(topic_dir, stage_num)
        if status["complete"]:
            highest_complete = max(highest_complete, stage_num)
        else:
            if first_incomplete == -1:
                first_incomplete = stage_num

    # If all stages complete, return 6 (publish)
    if highest_complete == 6:
        return 6

    # If no stages complete, return 0 (materials)
    if highest_complete == -1:
        return 0

    # Otherwise, current stage is first incomplete
    return first_incomplete if first_incomplete != -1 else highest_complete


def verify_dependencies(topic_dir: Path, target_stage: int) -> tuple[bool, list[str]]:
    """
    Verify that all dependencies for a stage are satisfied.

    Args:
        topic_dir: Path to topic directory
        target_stage: Target stage to verify

    Returns:
        Tuple of (all_satisfied, list_of_unmet_dependencies)
    """
    unmet = []

    for stage_num in range(target_stage):
        status = get_stage_status(topic_dir, stage_num)
        if not status["complete"]:
            stage_name = STAGES[stage_num]["name"]
            unmet.append(f"Stage {stage_num} ({stage_name})")

    return len(unmet) == 0, unmet


def get_stage_completion_percentage(topic_dir: Path) -> float:
    """
    Calculate the overall completion percentage across all stages.

    Args:
        topic_dir: Path to topic directory

    Returns:
        Completion percentage (0-100)
    """
    complete_count = 0
    total_count = len(STAGES)

    for stage_num in range(total_count):
        status = get_stage_status(topic_dir, stage_num)
        if status["complete"]:
            complete_count += 1

    return (complete_count / total_count) * 100


def print_status_report(topic_dir: Path) -> None:
    """Print a comprehensive status report for the topic."""
    print(f"Topic Status Report")
    print(f"=" * 50)
    print(f"Topic ID: {topic_dir.name}")
    print(f"Path: {topic_dir}")
    print()

    # Load topic metadata
    topic_md = topic_dir / "topic.md"
    if topic_md.exists():
        content = topic_md.read_text(encoding='utf-8')
        title_match = re.search(r'title:\s*(.+)', content)
        status_match = re.search(r'status:\s*(\S+)', content)
        stage_match = re.search(r'stage:\s*(\d+)', content)

        if title_match:
            print(f"Title: {title_match.group(1).strip()}")
        if status_match:
            print(f"Status: {status_match.group(1)}")
        if stage_match:
            current_stage = int(stage_match.group(1))
            print(f"Current Stage: {current_stage} - {STAGES[current_stage]['name']}")

    print()

    # Stage-by-stage status
    print("Stage Status:")
    print("-" * 50)

    for stage_num, stage in STAGES.items():
        status = get_stage_status(topic_dir, stage_num)
        status_symbol = "✓" if status["complete"] else "✗"
        status_text = "Complete" if status["complete"] else "Incomplete"

        print(f"  [{status_symbol}] Stage {stage_num}: {stage['name']} ({status_text})")

        if not status["complete"] and status["missing_files"]:
            print(f"       Missing: {', '.join(status['missing_files'])}")
        elif status["existing_files"]:
            print(f"       Files: {', '.join(status['existing_files'][:3])}{'...' if len(status['existing_files']) > 3 else ''}")

    print()

    # Overall completion
    completion = get_stage_completion_percentage(topic_dir)
    print(f"Overall Completion: {completion:.0f}%")
    print()

    # Current stage
    current = detect_current_stage(topic_dir)
    print(f"Detected Current Stage: {current} - {STAGES[current]['name']}")
    print()


def cmd_validate(args) -> None:
    """Validate the current context."""
    context = find_topic_context(Path.cwd())

    if not context.valid:
        if context.repo_root is None:
            print("Error: Not in a valid TCC repository")
            print("\nHint: Configure repository root using:")
            print("  python repo-config.py --set-root <path>")
        elif context.topic_dir is None:
            print("Error: Not in a valid topic folder")
            print("\nHint: Navigate to a topic folder (contains topic.md)")
            print(f"Repository root: {context.repo_root}")
        sys.exit(1)

    print("Valid topic context detected")
    print(f"  Repository: {context.repo_root}")
    print(f"  Collection: {context.collection_dir.name if context.collection_dir else 'N/A'}")
    print(f"  Topic: {context.topic_id}")
    sys.exit(0)


def cmd_status(args) -> None:
    """Show completion status of all stages."""
    context = find_topic_context(Path.cwd())

    if not context.valid:
        print("Error: Not in a valid topic folder")
        print("\nUse --validate to check context")
        sys.exit(1)

    print_status_report(context.topic_dir)


def cmd_detect_stage(args) -> None:
    """Detect and output the current stage."""
    context = find_topic_context(Path.cwd())

    if not context.valid:
        print("Error: Not in a valid topic folder")
        sys.exit(1)

    current_stage = detect_current_stage(context.topic_dir)
    stage_info = STAGES[current_stage]

    # Output just the stage number for scripting
    if args.json:
        output = json.dumps({
            "stage": current_stage,
            "name": stage_info["name"],
            "folder": stage_info["folder"],
        })
        print(output)
    else:
        print(current_stage)


def cmd_verify_dependencies(args) -> None:
    """Verify dependencies for a target stage."""
    context = find_topic_context(Path.cwd())

    if not context.valid:
        print("Error: Not in a valid topic folder")
        sys.exit(1)

    # Default to current stage + 1 (next stage)
    if args.stage is None:
        current_stage = detect_current_stage(context.topic_dir)
        target_stage = min(current_stage + 1, 6)
    else:
        target_stage = args.stage

    all_satisfied, unmet = verify_dependencies(context.topic_dir, target_stage)

    if all_satisfied:
        print(f"All dependencies satisfied for Stage {target_stage}")
        sys.exit(0)
    else:
        print(f"Unmet dependencies for Stage {target_stage}:")
        for dep in unmet:
            print(f"  - {dep}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Technical Content Creation - Context Validation",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate current context
  %(prog)s --validate

  # Show status of all stages
  %(prog)s --status

  # Detect current stage
  %(prog)s --detect-stage

  # Detect current stage (JSON output)
  %(prog)s --detect-stage --json

  # Verify dependencies for next stage
  %(prog)s --verify-dependencies

  # Verify dependencies for specific stage
  %(prog)s --verify-dependencies --stage 3
        """
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Check if in valid topic folder"
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show completion status of all stages"
    )
    parser.add_argument(
        "--detect-stage",
        action="store_true",
        help="Detect and output current stage"
    )
    parser.add_argument(
        "--verify-dependencies",
        action="store_true",
        help="Verify dependencies for target stage"
    )
    parser.add_argument(
        "--stage",
        type=int,
        choices=range(7),
        metavar="STAGE",
        help="Target stage for dependency verification (0-6)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output in JSON format (for --detect-stage)"
    )

    args = parser.parse_args()

    # Route to appropriate command
    if args.validate:
        cmd_validate(args)
    elif args.status:
        cmd_status(args)
    elif args.detect_stage:
        cmd_detect_stage(args)
    elif args.verify_dependencies:
        cmd_verify_dependencies(args)
    else:
        # No command specified, show help
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
