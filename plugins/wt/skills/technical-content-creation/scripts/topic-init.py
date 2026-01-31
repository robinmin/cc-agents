#!/usr/bin/env python3
"""
Topic initialization script for technical-content-creation.

Creates new topics with the 7-stage folder structure and proper frontmatter.
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
from shared.config import (
    get_tcc_config,
    get_tcc_repo_root,
    set_tcc_config,
)


# 7-stage folder structure
STAGE_FOLDERS = [
    "0-materials",
    "1-research",
    "2-outline",
    "3-draft",
    "4-illustration",
    "5-adaptation",
    "6-publish",
]

# Additional subfolders to create
STAGE_SUBFOLDERS = {
    "3-draft": ["draft-revisions"],
    "4-illustration": ["images"],
    "6-publish": ["published", "assets"],
    "2-outline": ["materials"],
}

# Default topic.md frontmatter template
TOPIC_TEMPLATE = """---
name: {name}
title: {title}
description: {description}
collection: {collection}
created_at: {created_at}
updated_at: {updated_at}
status: draft
author:
  name: {author_name}
  email: {author_email}
tags:
  - {primary_tag}
keywords:
  - {primary_keyword}
stage: 0
version: 1.0.0
review:
  last_reviewed_at: null
  reviewer: null
  status: pending
  feedback: []
links:
  materials: 0-materials/materials-extracted.md
  research: 1-research/research-brief.md
  outline: 2-outline/outline-approved.md
  draft: 3-draft/draft-article.md
  illustration: 4-illustration/
  adaptation: 5-adaptation/
  publish: 6-publish/article.md
stats:
  word_count: null
  reading_time: null
  source_count: 0
  image_count: 0
---

## Additional Notes

{notes}

## Stage Progression

Track progress through stages:

- Stage 0: Materials - Collect and organize research sources
- Stage 1: Research - Analyze and synthesize findings
- Stage 2: Outline - Create content structure
- Stage 3: Draft - Write initial content
- Stage 4: Illustration - Create visual aids
- Stage 5: Adaptation - Adapt for different platforms
- Stage 6: Publish - Finalize and publish content
"""


def slugify(text: str) -> str:
    """
    Convert text to URL-friendly slug.

    Args:
        text: Input text

    Returns:
        Slugified string
    """
    # Convert to lowercase and replace spaces with hyphens
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text


def load_collections_json(repo_root: Path) -> dict:
    """Load the collections.json file."""
    collections_file = repo_root / "collections.json"

    if not collections_file.exists():
        raise FileNotFoundError(
            f"Collections file not found: {collections_file}"
        )

    with open(collections_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_collections_json(repo_root: Path, data: dict) -> None:
    """Save the collections.json file."""
    collections_file = repo_root / "collections.json"

    data["last_updated"] = datetime.now().isoformat()

    with open(collections_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def find_collection_by_id_or_name(
    collections_data: dict,
    identifier: str
) -> Optional[dict]:
    """
    Find a collection by ID or name.

    Args:
        collections_data: Parsed collections.json data
        identifier: Collection ID or name

    Returns:
        Collection dict if found, None otherwise
    """
    collections = collections_data.get("collections", [])

    # Try exact ID match first
    for col in collections:
        if col["id"] == identifier:
            return col

    # Try name match
    for col in collections:
        if col.get("name") == identifier:
            return col

    return None


def create_collection(
    repo_root: Path,
    collections_data: dict,
    collection_name: str
) -> dict:
    """
    Create a new collection.

    Args:
        repo_root: Repository root path
        collections_data: Parsed collections.json data
        collection_name: Name for the new collection

    Returns:
        Created collection dictionary
    """
    # Generate collection ID from name
    collection_id = slugify(collection_name)

    # Check if collection already exists
    existing = find_collection_by_id_or_name(collections_data, collection_id)
    if existing:
        raise ValueError(f"Collection already exists: {collection_id}")

    # Get collections path from config
    tcc_config = get_tcc_config()
    collections_path = tcc_config.get("collections_path", "collections")

    # Create collection directory
    collection_dir = repo_root / collections_path / collection_id
    collection_dir.mkdir(parents=True, exist_ok=True)

    # Create collection entry
    new_collection = {
        "id": collection_id,
        "name": collection_name,
        "description": f"Collection: {collection_name}",
        "path": f"{collections_path}/{collection_id}",
        "created_at": datetime.now().strftime("%Y-%m-%d"),
        "updated_at": datetime.now().strftime("%Y-%m-%d"),
        "topic_count": 0,
        "published_count": 0,
        "tags": []
    }

    # Add to collections
    collections_data["collections"].append(new_collection)
    save_collections_json(repo_root, collections_data)

    return new_collection


def register_topic(
    repo_root: Path,
    collection_id: str,
    topic_id: str
) -> None:
    """
    Register a topic in collections.json (increment topic count).

    Args:
        repo_root: Repository root path
        collection_id: Collection ID
        topic_id: Topic ID
    """
    collections_data = load_collections_json(repo_root)

    for col in collections_data.get("collections", []):
        if col["id"] == collection_id:
            col["topic_count"] = col.get("topic_count", 0) + 1
            col["updated_at"] = datetime.now().strftime("%Y-%m-%d")
            break

    save_collections_json(repo_root, collections_data)


def create_topic_structure(
    repo_root: Path,
    collection_id: str,
    topic_id: str,
    topic_data: dict
) -> Path:
    """
    Create the topic directory structure and topic.md file.

    Args:
        repo_root: Repository root path
        collection_id: Collection ID
        topic_id: Topic identifier
        topic_data: Topic metadata (title, description, etc.)

    Returns:
        Path to created topic directory
    """
    # Get collections path from config
    tcc_config = get_tcc_config()
    collections_path = tcc_config.get("collections_path", "collections")

    # Create topic directory
    topic_dir = repo_root / collections_path / collection_id / topic_id
    topic_dir.mkdir(parents=True, exist_ok=True)

    # Create stage folders
    for stage in STAGE_FOLDERS:
        stage_dir = topic_dir / stage
        stage_dir.mkdir(exist_ok=True)

        # Create subfolders if defined
        if stage in STAGE_SUBFOLDERS:
            for subfolder in STAGE_SUBFOLDERS[stage]:
                (stage_dir / subfolder).mkdir(exist_ok=True)

    # Create topic.md
    now = datetime.now().strftime("%Y-%m-%d")
    topic_content = TOPIC_TEMPLATE.format(
        name=topic_id,
        title=topic_data.get("title", topic_id.replace("-", " ").title()),
        description=topic_data.get("description", ""),
        collection=collection_id,
        created_at=now,
        updated_at=now,
        author_name=topic_data.get("author_name", "Author"),
        author_email=topic_data.get("author_email", "author@example.com"),
        primary_tag=topic_data.get("primary_tag", "technical"),
        primary_keyword=topic_data.get("primary_keyword", topic_id),
        notes=topic_data.get("notes", ""),
    )

    topic_md = topic_dir / "topic.md"
    topic_md.write_text(topic_content, encoding='utf-8')

    return topic_dir


def cmd_init(args) -> None:
    """Initialize a new topic."""
    # Get repository root
    repo_root = get_tcc_repo_root()

    if repo_root is None:
        print("Error: Repository root not configured")
        print("\nUse repo-config.py --set-root <path> to configure")
        sys.exit(1)

    # Load collections
    try:
        collections_data = load_collections_json(repo_root)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        sys.exit(1)

    # Find or create collection
    collection_id = args.collection
    collection = find_collection_by_id_or_name(collections_data, collection_id)

    if collection is None:
        # Check if auto-create is enabled
        tcc_config = get_tcc_config()
        auto_create = tcc_config.get("auto_create_collections", True)

        if auto_create:
            print(f"Creating new collection: {collection_id}")
            try:
                collection = create_collection(repo_root, collections_data, collection_id)
                print(f"  Collection ID: {collection['id']}")
                print(f"  Path: {collection['path']}")
            except ValueError as e:
                print(f"Error: {e}")
                sys.exit(1)
        else:
            print(f"Error: Collection '{collection_id}' not found")
            print("\nAvailable collections:")
            for col in collections_data.get("collections", []):
                print(f"  - {col['id']}: {col.get('name', 'N/A')}")
            print("\nEnable auto_create_collections in config to create collections automatically.")
            sys.exit(1)

    collection_id = collection["id"]

    # Generate topic ID
    topic_id = args.topic if args.topic else slugify(args.title or "untopic")
    topic_id = slugify(topic_id)

    # Prepare topic data
    topic_data = {
        "title": args.title or topic_id.replace("-", " ").title(),
        "description": args.description or "",
        "author_name": args.author or "Author",
        "author_email": args.email or "author@example.com",
        "primary_tag": args.tag or "technical",
        "primary_keyword": topic_id,
        "notes": args.notes or "",
    }

    # Create topic structure
    try:
        topic_dir = create_topic_structure(repo_root, collection_id, topic_id, topic_data)
    except Exception as e:
        print(f"Error creating topic structure: {e}")
        sys.exit(1)

    # Register topic in collections.json
    register_topic(repo_root, collection_id, topic_id)

    # Success
    print(f"Topic created successfully!")
    print(f"  Topic ID: {topic_id}")
    print(f"  Title: {topic_data['title']}")
    print(f"  Collection: {collection['name']} ({collection_id})")
    print(f"  Path: {topic_dir.relative_to(repo_root)}")
    print()
    print("Stage folders created:")
    for stage in STAGE_FOLDERS:
        print(f"  - {stage}/")
    print()
    print(f"Topic metadata: topic.md")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Technical Content Creation - Topic Initialization",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a new topic
  %(prog)s --topic microservices-guide --collection technical-tutorials \\
            --title "Microservices Architecture Guide" \\
            --description "A comprehensive guide to microservices"

  # Create with all options
  %(prog)s --topic ai-coding --collection tutorials \\
            --title "AI Coding Best Practices" \\
            --description "Guide for using AI coding assistants" \\
            --author "Your Name" \\
            --email "you@example.com" \\
            --tag "ai" \\
            --notes "Focus on Claude Code and GitHub Copilot"
        """
    )

    parser.add_argument(
        "--topic",
        required=True,
        help="Topic identifier (will be slugified if needed)"
    )
    parser.add_argument(
        "--collection",
        required=True,
        help="Collection name or ID"
    )
    parser.add_argument(
        "--title",
        help="Human-readable title"
    )
    parser.add_argument(
        "--description",
        help="Topic description"
    )
    parser.add_argument(
        "--author",
        help="Author name"
    )
    parser.add_argument(
        "--email",
        help="Author email"
    )
    parser.add_argument(
        "--tag",
        help="Primary tag"
    )
    parser.add_argument(
        "--notes",
        help="Additional notes"
    )

    args = parser.parse_args()

    cmd_init(args)


if __name__ == "__main__":
    main()
