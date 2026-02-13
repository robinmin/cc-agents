"""Tests for Value-Add Assessment evaluator."""

import pytest
from pathlib import Path
import tempfile
import os

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.value_add import ValueAddEvaluator, evaluate_value_add


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(content)
    return skill_dir


class TestValueAddEvaluator:
    """Test cases for ValueAddEvaluator."""

    def test_skill_with_artifacts(self):
        """Test skill with scripts and references."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

This skill provides custom file processing.

## Steps

1. Run `python3 scripts/process.py input.json`
2. Check output with `./scripts/validate.sh`
3. Import `processor.process()` from the module
""")
        # Create scripts directory with files
        scripts_dir = skill / "scripts"
        scripts_dir.mkdir()
        (scripts_dir / "process.py").write_text("#!/usr/bin/env python3\n")
        (scripts_dir / "validate.sh").write_text("#!/bin/bash\n")

        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        assert "scripts/" in str(result.findings)
        assert result.score > 30

    def test_bare_skill_no_artifacts(self):
        """Test bare skill with no artifacts."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

This is a generic skill that follows best practices. Use good coding style and proper formatting. Make sure to handle errors appropriately and follow standards.
""")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        # Should score low - generic content, no artifacts
        assert result.score < 50

    def test_specific_content(self):
        """Test skill with specific code examples."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

Use this command to process:

```python
import subprocess
result = subprocess.run(["python3", "scripts/process.py", "--input", "data.json"], capture_output=True)
```

Run with: `python3 ${CLAUDE_PLUGIN_ROOT}/skills/test-skill/scripts/main.py`
""")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        assert any("specificity" in f.lower() or "specific" in f.lower() for f in result.findings)

    def test_generic_advice(self):
        """Test skill with too much generic advice."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

Follow best practices when writing code. Use proper coding style. Keep code clean and simple. Make sure to handle errors properly. Be consistent with naming conventions. Write tests for your code.

This is about software engineering in general.
""")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        # Should detect low specificity (which indicates generic content)
        assert any("specificity" in f.lower() and "poor" in f.lower() for f in result.findings)

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert "SKILL.md not found" in result.findings

    def test_dimension_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = ValueAddEvaluator()

        assert evaluator.name == "value_add"
        assert 0 < evaluator.weight <= 1.0

    def test_custom_workflows(self):
        """Test custom workflow detection."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Custom Workflow

1. Run `python3 scripts/preprocess.py --input data/`
2. Then execute the main processor
3. Check error code in `result.returncode`
4. If error, fallback to `scripts/alt_process.py`
""")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        assert any("workflow" in f.lower() for f in result.findings)

    def test_backward_compat_function(self):
        """Test standalone function works."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Use `python3 scripts/main.py` to run.
""")
        (skill / "scripts").mkdir()
        (skill / "scripts" / "main.py").write_text("#!/usr/bin/env python3\n")

        result = evaluate_value_add(skill)

        assert result.name == "value_add"
        assert 0 <= result.score <= 100

    def test_wrapper_only_skill(self):
        """Test wrapper-only skill detection."""
        skill = create_skill_md("""---
name: test-skill
description: This skill provides guidance for writing code. Use best practices, follow standards, write clean code. This skill should be used when the user asks for coding help.
---

# Test Skill

This is a wrapper skill that just describes what to do without any specific tools or workflows.
""")
        evaluator = ValueAddEvaluator()
        result = evaluator.evaluate(skill)

        # Should flag as wrapper-only or low value-add
        assert result.score < 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
