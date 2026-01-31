"""Debug test to check import paths."""

import sys
from pathlib import Path

def test_path_check():
    """Check sys.path and scripts directory."""
    print("sys.path entries:")
    for i, p in enumerate(sys.path[:5]):
        print(f"  [{i}] {p}")

    # Check scripts directory
    scripts_dir = Path(__file__).parent.parent / "scripts"
    print(f"\nScripts directory: {scripts_dir}")
    print(f"Scripts exists: {scripts_dir.exists()}")
    print(f"Scripts is dir: {scripts_dir.is_dir()}")

    # List files in scripts
    print("\nFiles in scripts:")
    for f in sorted(scripts_dir.glob("*.py")):
        print(f"  - {f.name}")

def test_import_context_validator():
    """Test that context_validator can be imported."""
    try:
        import context_validator
        print("context_validator imported successfully")
        print(f"context_validator.STAGES: {list(context_validator.STAGES.keys())[:3]}...")
    except Exception as e:
        print(f"Failed to import context_validator: {e}")
        raise
