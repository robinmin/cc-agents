#!/usr/bin/env python3
"""
Repository configuration CLI for technical-content-creation.

Manages repository root detection, validation, and collection listing.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from shared.config import (
    get_tcc_config,
    set_tcc_config,
    get_tcc_repo_root,
    set_tcc_repo_root,
    WTConfigPath,
)


# Repository structure requirements
REQUIRED_FOLDERS = {
    "collections.json",
    "collections",
}

COLLECTIONS_FILE = "collections.json"


class RepoValidator:
    """Validates repository structure."""

    @staticmethod
    def validate_repo_root(repo_root: Path) -> tuple[bool, list[str]]:
        """
        Validate that a directory is a valid TCC repository.

        Args:
            repo_root: Path to validate

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        # Check if directory exists
        if not repo_root.exists():
            errors.append(f"Repository root does not exist: {repo_root}")
            return False, errors

        if not repo_root.is_dir():
            errors.append(f"Repository root is not a directory: {repo_root}")
            return False, errors

        # Check for required folders
        for item in REQUIRED_FOLDERS:
            item_path = repo_root / item
            if not item_path.exists():
                errors.append(f"Missing required item: {item}")

        return len(errors) == 0, errors

    @staticmethod
    def validate_collection_dir(collection_dir: Path) -> tuple[bool, list[str]]:
        """
        Validate a collection directory structure.

        Args:
            collection_dir: Path to collection directory

        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []

        if not collection_dir.exists():
            errors.append(f"Collection directory does not exist: {collection_dir}")
            return False, errors

        # Check for topic.md if it's a collection
        topic_md = collection_dir / "topic.md"
        if topic_md.exists():
            # It's a topic directory
            pass

        return len(errors) == 0, errors


def load_collections_json(repo_root: Path) -> dict:
    """
    Load the collections.json file.

    Args:
        repo_root: Path to repository root

    Returns:
        Parsed collections dictionary

    Raises:
        FileNotFoundError: If collections.json doesn't exist
        json.JSONDecodeError: If file is not valid JSON
    """
    collections_file = repo_root / COLLECTIONS_FILE

    if not collections_file.exists():
        raise FileNotFoundError(
            f"Collections file not found: {collections_file}"
        )

    with open(collections_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def list_collections(repo_root: Optional[Path] = None) -> list[dict]:
    """
    List all collections in the repository.

    Args:
        repo_root: Repository root path. Uses config if not provided.

    Returns:
        List of collection dictionaries

    Raises:
        FileNotFoundError: If repo root or collections.json not found
    """
    if repo_root is None:
        repo_root = get_tcc_repo_root()

    if repo_root is None:
        raise FileNotFoundError(
            "Repository root not configured. Use --set-root to configure."
        )

    collections_data = load_collections_json(repo_root)
    return collections_data.get("collections", [])


def list_topics_in_collection(
    collection_id: str,
    repo_root: Optional[Path] = None
) -> list[dict]:
    """
    List all topics in a specific collection.

    Args:
        collection_id: ID of the collection
        repo_root: Repository root path

    Returns:
        List of topic information dictionaries

    Raises:
        FileNotFoundError: If collection not found
    """
    if repo_root is None:
        repo_root = get_tcc_repo_root()

    if repo_root is None:
        raise FileNotFoundError("Repository root not configured")

    # Get collections path from config
    tcc_config = get_tcc_config()
    collections_path = tcc_config.get("collections_path", "collections")

    collection_dir = repo_root / collections_path / collection_id

    if not collection_dir.exists():
        raise FileNotFoundError(
            f"Collection not found: {collection_id}"
        )

    topics = []
    for item in collection_dir.iterdir():
        if item.is_dir() and (item / "topic.md").exists():
            # Load topic metadata
            topic_md = item / "topic.md"
            try:
                import re
                content = topic_md.read_text(encoding='utf-8')
                # Extract basic info from frontmatter
                name_match = re.search(r'name:\s*(\S+)', content)
                title_match = re.search(r'title:\s*(.+)', content)
                status_match = re.search(r'status:\s*(\S+)', content)

                topics.append({
                    "id": item.name,
                    "name": name_match.group(1) if name_match else item.name,
                    "title": title_match.group(1).strip() if title_match else "",
                    "status": status_match.group(1) if status_match else "unknown",
                    "path": str(item.relative_to(repo_root)),
                })
            except Exception:
                topics.append({
                    "id": item.name,
                    "name": item.name,
                    "title": "",
                    "status": "unknown",
                    "path": str(item.relative_to(repo_root)),
                })

    return sorted(topics, key=lambda t: t["id"])


def set_default_collection(collection_id: str) -> None:
    """
    Set the default collection in configuration.

    Args:
        collection_id: Collection ID to set as default

    Raises:
        ValueError: If collection doesn't exist
    """
    # Verify collection exists
    repo_root = get_tcc_repo_root()
    if repo_root is None:
        raise FileNotFoundError(
            "Repository root not configured. Use --set-root first."
        )

    collections = list_collections(repo_root)
    collection_ids = {c["id"] for c in collections}

    if collection_id not in collection_ids:
        raise ValueError(
            f"Collection '{collection_id}' not found. "
            f"Available collections: {', '.join(sorted(collection_ids))}"
        )

    set_tcc_config("default_collection", collection_id)


# CLI commands
def cmd_detect(args) -> None:
    """Detect and display current repository root."""
    repo_root = get_tcc_repo_root()

    if repo_root is None:
        print("Repository root: Not configured")
        print("\nHint: Use --set-root <path> to configure")
        sys.exit(1)
    else:
        print(f"Repository root: {repo_root}")

        # Validate the root
        validator = RepoValidator()
        is_valid, errors = validator.validate_repo_root(repo_root)

        if is_valid:
            print("Status: Valid repository structure")
        else:
            print("Status: Invalid repository structure")
            for error in errors:
                print(f"  - {error}")


def cmd_set_root(args) -> None:
    """Set the repository root path."""
    path = args.path

    # Expand user and resolve to absolute
    root_path = Path(path).expanduser().resolve()

    # Validate the path
    validator = RepoValidator()
    is_valid, errors = validator.validate_repo_root(root_path)

    if not is_valid:
        print(f"Error: Invalid repository structure at {root_path}")
        for error in errors:
            print(f"  - {error}")
        print("\nHint: Ensure the directory contains:")
        for item in REQUIRED_FOLDERS:
            print(f"  - {item}/")
        sys.exit(1)

    # Set the root
    set_tcc_repo_root(str(root_path))
    print(f"Repository root set to: {root_path}")
    print(f"Config saved to: {WTConfigPath.CONFIG_FILE}")


def cmd_validate(args) -> None:
    """Validate the repository structure."""
    repo_root = get_tcc_repo_root()

    if repo_root is None:
        print("Error: Repository root not configured")
        print("\nUse --set-root <path> to configure")
        sys.exit(1)

    validator = RepoValidator()
    is_valid, errors = validator.validate_repo_root(repo_root)

    if is_valid:
        print("Repository structure: Valid")
        print(f"Root: {repo_root}")
        sys.exit(0)
    else:
        print("Repository structure: Invalid")
        print(f"Root: {repo_root}")
        print("\nErrors:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)


def cmd_list_collections(args) -> None:
    """List all collections in the repository."""
    try:
        collections = list_collections()

        if not collections:
            print("No collections found")
            return

        print(f"Found {len(collections)} collection(s):\n")
        for col in collections:
            print(f"  {col['id']}")
            print(f"    Name: {col.get('name', 'N/A')}")
            print(f"    Description: {col.get('description', 'N/A')}")
            print(f"    Topics: {col.get('topic_count', 0)}")
            print()

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in collections.json: {e}")
        sys.exit(1)


def cmd_list_topics(args) -> None:
    """List topics in a collection."""
    collection_id = args.collection

    try:
        topics = list_topics_in_collection(collection_id)

        if not topics:
            print(f"No topics found in collection: {collection_id}")
            return

        print(f"Found {len(topics)} topic(s) in '{collection_id}':\n")
        for topic in topics:
            print(f"  {topic['id']}")
            if topic.get('title'):
                print(f"    Title: {topic['title']}")
            print(f"    Status: {topic['status']}")
            print()

    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)


def cmd_set_default_collection(args) -> None:
    """Set the default collection."""
    collection_id = args.name

    try:
        set_default_collection(collection_id)
        print(f"Default collection set to: {collection_id}")

        # Show current config
        tcc_config = get_tcc_config()
        print(f"\nCurrent TCC configuration:")
        print(f"  Repo Root: {tcc_config.get('tcc_repo_root')}")
        print(f"  Default Collection: {tcc_config.get('default_collection')}")

    except (FileNotFoundError, ValueError) as e:
        print(f"Error: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Technical Content Creation - Repository Configuration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Detect current repository root
  %(prog)s --detect

  # Set repository root
  %(prog)s --set-root /path/to/repo

  # Validate repository structure
  %(prog)s --validate

  # List all collections
  %(prog)s --list-collections

  # List topics in a collection
  %(prog)s --list-topics technical-tutorials

  # Set default collection
  %(prog)s --set-default-collection technical-tutorials
        """
    )

    parser.add_argument(
        "--detect",
        action="store_true",
        help="Detect and display current repository root"
    )
    parser.add_argument(
        "--set-root",
        metavar="PATH",
        dest="path",
        help="Set repository root path"
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Validate repository structure"
    )
    parser.add_argument(
        "--list-collections",
        action="store_true",
        help="List all collections"
    )
    parser.add_argument(
        "--list-topics",
        metavar="COLLECTION",
        dest="collection",
        help="List topics in a collection"
    )
    parser.add_argument(
        "--set-default-collection",
        metavar="NAME",
        dest="name",
        help="Set default collection"
    )

    args = parser.parse_args()

    # Route to appropriate command
    if args.detect:
        cmd_detect(args)
    elif args.path:
        cmd_set_root(args)
    elif args.validate:
        cmd_validate(args)
    elif args.list_collections:
        cmd_list_collections(args)
    elif args.collection:
        cmd_list_topics(args)
    elif args.name:
        cmd_set_default_collection(args)
    else:
        # No command specified, show help
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
