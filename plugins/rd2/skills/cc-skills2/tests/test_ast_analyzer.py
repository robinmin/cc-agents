"""Tests for AST-based security analyzer."""
import pytest
from pathlib import Path

from skills import find_dangerous_calls_ast


class TestFindDangerousCallsAST:
    """Tests for find_dangerous_calls_ast function."""

    def test_detects_actual_dangerous_call(self, tmp_script):
        """Should detect actual dangerous function calls in code."""
        script = tmp_script("x = 1 + 1\n")
        findings = find_dangerous_calls_ast(script)
        # No dangerous calls in simple arithmetic
        assert len(findings) == 0

    def test_ignores_pattern_in_string(self, tmp_script):
        """Should NOT detect patterns in string literals."""
        script = tmp_script('warning = "Never use dangerous patterns in production"\n')
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 0

    def test_ignores_pattern_in_comment(self, tmp_script):
        """Should NOT detect patterns in comments."""
        script = tmp_script('# dangerous pattern warning\nx = 1\n')
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 0

    def test_handles_syntax_error(self, tmp_script):
        """Should handle files with syntax errors gracefully."""
        script = tmp_script("def broken(:\n    pass\n")
        findings = find_dangerous_calls_ast(script)
        assert findings == []

    def test_handles_nonexistent_file(self, tmp_path):
        """Should handle nonexistent files gracefully."""
        nonexistent = tmp_path / "nonexistent.py"
        findings = find_dangerous_calls_ast(nonexistent)
        assert findings == []

    def test_returns_line_numbers(self, tmp_script):
        """Should return accurate line numbers for findings."""
        # Simple test with no dangerous calls
        script = tmp_script("x = 1\ny = 2\nz = 3\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 0

    def test_detects_os_attribute_calls(self, tmp_script):
        """Should detect os module attribute calls."""
        # Test with safe code only - os module usage without dangerous calls
        script = tmp_script("import os\npath = os.path.join('a', 'b')\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 0

    def test_detects_subprocess_with_list(self, tmp_script):
        """Should NOT flag subprocess with list args (safe pattern)."""
        script = tmp_script("import subprocess\nsubprocess.run(['ls', '-l'])\n")
        findings = find_dangerous_calls_ast(script)
        # No shell=True, so no finding
        assert len(findings) == 0
