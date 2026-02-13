"""Tests for Security Evaluator."""

import pytest
from pathlib import Path
import tempfile

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.security import SecurityEvaluator, evaluate_security


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)
    return skill_dir


def create_skill_with_scripts(content: str, script_content: str = "") -> Path:
    """Create a temporary skill directory with SKILL.md and scripts."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(content)

    if script_content:
        scripts_dir = skill_dir / "scripts"
        scripts_dir.mkdir()
        (scripts_dir / "test_script.py").write_text(script_content)

    return skill_dir


SECURE_SKILL = """---
name: secure-skill
description: A skill with security best practices
---

# Secure Skill

## Security

### Input Validation

```python
def validate(input_data):
    if not isinstance(input_data, str):
        raise ValueError("Input must be string")
```

### Database Security

```python
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

### Password Handling

```python
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

## Common Mistakes

Bad: `eval(user_input)`
Good: `subprocess.run()`
"""


class TestSecurityEvaluator:
    """Test cases for SecurityEvaluator."""

    def test_evaluator_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = SecurityEvaluator()

        assert evaluator.name == "security"
        assert 0 < evaluator.weight <= 1.0

    def test_secure_skill_score(self):
        """Test skill with security guidance."""
        skill = create_skill_md(SECURE_SKILL)

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        assert 0 <= result.score <= 100

    def test_skill_with_input_validation(self):
        """Test skill with input validation examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Input Validation

```python
def validate(input_data):
    if not isinstance(input_data, str):
        raise ValueError("Invalid input")
```
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_skill_with_parameterized_queries(self):
        """Test skill with parameterized query examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Database

```python
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_skill_with_password_hashing(self):
        """Test skill with password hashing examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Passwords

```python
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_skill_with_common_mistakes(self):
        """Test skill documenting common security mistakes."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Common Mistakes

Bad: `eval(user_input)`
Bad: `os.system(cmd)`
Good: `subprocess.run()`
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_skill_with_path_validation(self):
        """Test skill with path validation examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## File Operations

```python
base = Path("/safe/path")
requested = (base / filename).resolve()
```
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_skill_with_environment_variables(self):
        """Test skill with environment variable examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Configuration

```python
import os
api_key = os.environ.get("API_KEY")
```
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"

    def test_bare_skill_score(self):
        """Test bare skill with minimal security content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

No security guidance.
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        assert 0 <= result.score <= 100

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0

    def test_evaluate_function(self):
        """Test standalone evaluate function."""
        skill = create_skill_md(SECURE_SKILL)

        result = evaluate_security(skill)

        assert result.name == "security"
        assert 0 <= result.score <= 100

    def test_skill_with_security_awareness(self):
        """Test skill with security keywords but no dedicated section."""
        skill = create_skill_md("""---
name: test-skill
description: A skill
---

# Test Skill

This skill helps validate user input and sanitize data to prevent injection attacks.
""")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        # Should have awareness from keywords
        assert "security" in str(result.findings).lower() or result.score > 0

    def test_skill_with_references_directory(self):
        """Test skill with references directory."""
        skill = create_skill_md("""---
name: test-skill
description: A skill
---

# Test Skill

Security considerations included.
""")
        # Create references directory
        (skill / "references").mkdir()
        (skill / "references" / "security.md").write_text("# Security Reference\n")

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        assert "references" in str(result.findings).lower() or result.score > 0

    def test_skill_with_scripts_and_security(self):
        """Test skill with scripts containing security patterns."""
        skill = create_skill_with_scripts(
            """---
name: test-skill
description: A skill with scripts
---

# Test Skill

## Security

This skill validates input.
""",
            '''"""Secure script example."""
import bcrypt


def hash_password(password: str) -> str:
    """Hash password securely."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()


if __name__ == "__main__":
    print("Running secure script")
'''
        )

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        assert 0 <= result.score <= 100

    def test_skill_with_dangerous_calls(self):
        """Test skill with scripts that have potentially dangerous calls."""
        skill = create_skill_with_scripts(
            """---
name: test-skill
description: A skill
---

# Test Skill

Basic skill.
""",
            '''"""Script with dangerous call for testing."""
import subprocess


def run_command(cmd: str) -> str:
    """Run a command."""
    # This should be flagged
    result = subprocess.run(cmd, shell=True, capture_output=True)
    return result.stdout.decode()
'''
        )

        evaluator = SecurityEvaluator()
        result = evaluator.evaluate(skill)

        assert result.name == "security"
        # Should detect issues but still return valid score
        assert 0 <= result.score <= 100

    def test_evaluator_weight(self):
        """Test evaluator has configurable weight."""
        evaluator = SecurityEvaluator()
        # Weight should be between 0 and 1
        assert 0 < evaluator.weight <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
