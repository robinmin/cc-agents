#!/usr/bin/env python3
"""Command validation helper for cc-commands skill."""

import sys
import yaml
import re
from pathlib import Path


def validate_frontmatter(content: str) -> dict:
    """Validate command frontmatter."""
    errors = []
    warnings = []

    # Extract frontmatter
    if not content.startswith('---'):
        return {'valid': True, 'errors': [], 'warnings': ['No frontmatter found']}

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {'valid': False, 'errors': ['Invalid frontmatter format'], 'warnings': []}

    try:
        fm = yaml.safe_load(parts[1])
    except yaml.YAMLError as e:
        return {'valid': False, 'errors': [f'YAML parse error: {e}'], 'warnings': []}

    # Check required fields
    if 'description' not in fm:
        errors.append('Missing required field: description')

    # Check description length
    if 'description' in fm and len(fm['description']) > 60:
        warnings.append('Description exceeds 60 characters')

    # Check for invalid fields
    invalid_fields = ['skills', 'subagents', 'agent', 'context', 'user-invocable', 'triggers']
    for field in invalid_fields:
        if field in fm:
            errors.append(f'Invalid field: {field}')

    return {'valid': len(errors) == 0, 'errors': errors, 'warnings': warnings}


def check_imperative_form(content: str) -> dict:
    """Check if content uses imperative form."""
    lines = content.split('\n')
    imperative_count = 0

    # Patterns that indicate imperative form
    imperative_patterns = [
        r'^[A-Z][a-z]+\s+(create|use|add|remove|check|verify|ensure|follow|apply)',
        r'^(Create|Use|Add|Check|Verify|Ensure|Follow|Apply)',
        r'\b(do|make|build|write)\b',
    ]

    for line in lines:
        for pattern in imperative_patterns:
            if re.search(pattern, line):
                imperative_count += 1
                break

    percentage = (imperative_count / len(lines)) * 100 if lines else 0

    return {
        'imperative_lines': imperative_count,
        'total_lines': len(lines),
        'percentage': percentage,
        'pass': percentage >= 40
    }


def validate_command(path: str) -> dict:
    """Validate a command file."""
    path = Path(path)

    if not path.exists():
        return {'valid': False, 'errors': [f'File not found: {path}'], 'warnings': []}

    content = path.read_text()

    fm_result = validate_frontmatter(content)
    imp_result = check_imperative_form(content)

    return {
        'file': str(path),
        'frontmatter': fm_result,
        'imperative_form': imp_result,
        'valid': fm_result['valid'] and imp_result['pass']
    }


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: validate_command.py <command-file>")
        sys.exit(1)

    result = validate_command(sys.argv[1])
    print(yaml.dump(result, default_flow_style=False))


if __name__ == "__main__":
    main()
