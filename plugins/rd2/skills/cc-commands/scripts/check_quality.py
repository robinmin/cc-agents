#!/usr/bin/env python3
"""Command quality checker - runs evaluation on command files."""

import sys
import yaml
from pathlib import Path


def check_quality_issues(content: str) -> dict:
    """Check for common quality issues in command files."""
    issues = []
    warnings = []

    try:
        lines = content.split('\n')
        line_count = len([l for l in lines if l.strip()])

        # Check length
        if line_count > 150:
            warnings.append(f"Command exceeds 150 lines ({line_count})")

        # Check frontmatter
        if not content.startswith('---'):
            issues.append("Missing frontmatter")

        # Check description
        if 'description:' not in content:
            issues.append("Missing description field")
    except Exception as e:
        issues.append(f"Error analyzing content: {e}")

    return {
        'issues': issues,
        'warnings': warnings,
        'line_count': line_count
    }


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: check_quality.py <command-file>")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Error: File not found: {path}")
        sys.exit(1)

    content = path.read_text()
    result = check_quality_issues(content)

    print(yaml.dump(result, default_flow_style=False))

    if result['issues']:
        sys.exit(1)


if __name__ == "__main__":
    main()
