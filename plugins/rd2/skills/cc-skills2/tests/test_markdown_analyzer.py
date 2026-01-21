"""Tests for markdown security analyzer."""


from skills import extract_python_code_blocks, analyze_markdown_security


class TestExtractPythonCodeBlocks:
    """Tests for extract_python_code_blocks function."""

    def test_extracts_python_blocks(self):
        """Should extract Python code blocks."""
        content = """# Header

Some text.

```python
x = 1
```

More text.
"""
        blocks = extract_python_code_blocks(content)
        assert len(blocks) == 1
        assert "x = 1" in blocks[0][0]

    def test_ignores_non_python_blocks(self):
        """Should ignore non-Python code blocks."""
        content = """# Header

```bash
echo "hello"
```

```javascript
const x = 1;
```
"""
        blocks = extract_python_code_blocks(content)
        assert len(blocks) == 0

    def test_extracts_multiple_blocks(self):
        """Should extract multiple Python blocks."""
        content = """# Header

```python
x = 1
```

Middle text.

```python
y = 2
```
"""
        blocks = extract_python_code_blocks(content)
        assert len(blocks) == 2

    def test_handles_py_shorthand(self):
        """Should handle ```py as well as ```python."""
        content = """```py
x = 1
```
"""
        blocks = extract_python_code_blocks(content)
        assert len(blocks) == 1


class TestAnalyzeMarkdownSecurity:
    """Tests for analyze_markdown_security function."""

    def test_ignores_prose_text(self, tmp_path):
        """Should ignore prose text mentioning patterns."""
        skill_md = tmp_path / "SKILL.md"
        skill_md.write_text("""---
name: test-skill
description: Test skill
---

# Security Notes

Never use dangerous patterns. They are risky.
""")
        findings = analyze_markdown_security(skill_md)
        assert len(findings) == 0

    def test_handles_invalid_python_blocks(self, tmp_path):
        """Should handle code blocks with invalid Python syntax."""
        skill_md = tmp_path / "SKILL.md"
        skill_md.write_text("""---
name: test-skill
description: Test skill
---

```python
def broken(:
    pass
```
""")
        findings = analyze_markdown_security(skill_md)
        # Should not crash, should return empty
        assert len(findings) == 0

    def test_analyzes_valid_python_blocks(self, tmp_path):
        """Should analyze valid Python code blocks."""
        skill_md = tmp_path / "SKILL.md"
        skill_md.write_text("""---
name: test-skill
description: Test skill
---

```python
x = 1 + 1
print(x)
```
""")
        findings = analyze_markdown_security(skill_md)
        # No dangerous calls, no findings
        assert len(findings) == 0

    def test_handles_nonexistent_file(self, tmp_path):
        """Should handle nonexistent files gracefully."""
        nonexistent = tmp_path / "nonexistent.md"
        findings = analyze_markdown_security(nonexistent)
        assert findings == []
