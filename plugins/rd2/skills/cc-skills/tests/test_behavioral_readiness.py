"""Tests for Behavioral Readiness evaluator."""

import pytest
from pathlib import Path
import tempfile
import os

# Add scripts directory to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

from evaluators.behavioral_readiness import BehavioralReadinessEvaluator, evaluate_behavioral_readiness


def create_skill_md(content: str) -> Path:
    """Create a temporary skill directory with SKILL.md."""
    tmp_dir = Path(tempfile.mkdtemp())
    skill_dir = tmp_dir / "test-skill"
    skill_dir.mkdir()
    skill_md = skill_dir / "SKILL.md"
    skill_md.write_text(content)
    return skill_dir


class TestBehavioralReadinessEvaluator:
    """Test cases for BehavioralReadinessEvaluator."""

    def test_skill_with_examples(self):
        """Test skill with code examples and scenarios."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Overview

This skill handles file processing.

## Example

```python
result = process_file("input.json")
if result.error:
    fallback()
```

Given an input file, then process it.
When the file is missing, then report an error.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score > 20
        assert any("code" in f.lower() or "example" in f.lower() for f in result.findings)

    def test_skill_with_anti_patterns(self):
        """Test skill documenting what NOT to do."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Common Mistakes

- Don't skip validation.
- Never use raw SQL.
- Don't forget to handle exceptions.
- Avoid memory leaks.

❌ Bad: `eval(user_input)`
✅ Good: `ast.literal_eval(user_input)`
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert any("don't" in f.lower() or "mistake" in f.lower() or "anti" in f.lower()
                    for f in result.findings)

    def test_error_handling_guidance(self):
        """Test skill with error handling guidance."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Error Handling

If the script fails, try the fallback. If timeout occurs, retry up to 3 times.

```python
try:
    result = run()
except Exception as e:
    log_error(e)
    fallback()
```

## Troubleshooting

Check logs for error messages.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert any("error" in f.lower() or "fallback" in f.lower() for f in result.findings)
        assert result.score > 20

    def test_edge_case_coverage(self):
        """Test skill covering edge cases."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Edge Cases

- When input is null, return empty result.
- If maximum size is exceeded, truncate.
- For empty strings, use default value.
- Handle missing optional parameters.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert any("edge" in f.lower() or "boundary" in f.lower() for f in result.findings)

    def test_bare_skill_no_content(self):
        """Test bare skill with minimal content."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

This is a simple skill.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        # Should score low
        assert result.score < 30

    def test_missing_skill_md(self):
        """Test with missing SKILL.md."""
        skill = Path("/nonexistent/skill")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert result.score == 0.0
        assert "SKILL.md not found" in result.findings

    def test_dimension_properties(self):
        """Test evaluator has correct name and weight."""
        evaluator = BehavioralReadinessEvaluator()

        assert evaluator.name == "behavioral_readiness"
        assert 0 < evaluator.weight <= 1.0

    def test_test_infrastructure(self):
        """Test skill with tests directory."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Tests

Run `pytest tests/` to verify.
""")
        # Create tests directory with files
        tests_dir = skill / "tests"
        tests_dir.mkdir()
        (tests_dir / "test_main.py").write_text("def test_example():\n    pass\n")
        (tests_dir / "scenarios.yaml").write_text("test: example\n")

        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert "tests/" in str(result.findings) or any("scenario" in f.lower() for f in result.findings)

    def test_backward_compat_function(self):
        """Test standalone function works."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

Don't forget to handle errors.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluate_behavioral_readiness(skill)

        assert result.name == "behavioral_readiness"
        assert 0 <= result.score <= 100

    def test_trigger_tests_in_scenarios(self):
        """Test skill with trigger tests in scenarios.yaml."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Tests

Has trigger testing coverage.
""")
        # Create tests directory with trigger tests
        tests_dir = skill / "tests"
        tests_dir.mkdir()
        (tests_dir / "scenarios.yaml").write_text("""
trigger_tests:
  should_trigger:
    - query: "Create a skill"
      confidence: 0.9
  should_not_trigger:
    - query: "What's the weather?"
      reason: "Unrelated"
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert any("trigger" in f.lower() for f in result.findings)
        # Trigger tests + test infrastructure = at least 15 points
        assert result.score >= 15  # Should get bonus for trigger tests

    def test_negative_trigger_guidance(self):
        """Test skill with negative trigger guidance in docs."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## When NOT to Use

Do not use this skill for general coding tasks.
This skill should not trigger for debugging.

Don't trigger on unrelated queries.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        assert any("negative" in f.lower() or "trigger" in f.lower() for f in result.findings)

    def test_performance_tests_in_scenarios(self):
        """Test skill with performance tests in scenarios.yaml (checks test infrastructure)."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Performance

This skill reduces tool calls by 50%.
Under 2000 tokens for efficiency.
""")
        # Create tests directory with performance tests
        tests_dir = skill / "tests"
        tests_dir.mkdir()
        (tests_dir / "scenarios.yaml").write_text("""
performance_tests:
  baseline_without_skill:
    tool_calls: 15
    tokens: 12000
  with_skill:
    tool_calls: 2
    tokens: 6000
  pass_criteria:
    tool_call_reduction: ">50%"
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        # Performance tests contribute to test infrastructure
        assert any("test_infrastructure" in f.lower() or "scenario" in f.lower() for f in result.findings)

    def test_token_efficiency_guidance(self):
        """Test skill with token efficiency guidance (checks edge cases/boundaries)."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Token Budget

Keep SKILL.md under 1500 tokens for efficiency.
This reduces context window usage.
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        # Token guidance relates to boundaries/limits which is an edge case concern
        # Also check for test_infrastructure or trigger_testing which may appear
        assert any("edge" in f.lower() or "boundary" in f.lower() or 
                   "test_infrastructure" in f.lower() or "trigger" in f.lower() 
                   for f in result.findings)

    def test_comprehensive_behavioral_readiness(self):
        """Test skill with all behavioral readiness components."""
        skill = create_skill_md("""---
name: test-skill
description: Test skill
---

# Test Skill

## Example

```python
result = process()
if result.error:
    fallback()
```

## Common Mistakes

Don't skip validation. Never use raw input.

## Error Handling

If the process fails, retry with backoff.

## Edge Cases

When input is null, return empty.

## When NOT to Use

Do not trigger for general queries.
""")
        # Create tests directory with comprehensive tests
        tests_dir = skill / "tests"
        tests_dir.mkdir()
        (tests_dir / "scenarios.yaml").write_text("""
trigger_tests:
  should_trigger:
    - query: "Process data"
  should_not_trigger:
    - query: "Debug code"

performance_tests:
  with_skill:
    tool_calls: 2
""")
        evaluator = BehavioralReadinessEvaluator()
        result = evaluator.evaluate(skill)

        # Should score high with all components
        assert result.score > 50


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
