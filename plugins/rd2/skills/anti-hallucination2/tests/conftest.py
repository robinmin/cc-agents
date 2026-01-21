"""
pytest configuration and fixtures.
"""

from pathlib import Path
import sys

# Add scripts directory to path for imports
scripts_dir = Path(__file__).parent.parent / "scripts"
sys.path.insert(0, str(scripts_dir))
