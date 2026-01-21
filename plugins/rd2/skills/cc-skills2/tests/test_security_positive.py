"""Positive security tests: verify dangerous patterns ARE detected.

H5 remediation: Comprehensive test suite for security detection.
Tests verify that find_dangerous_calls_ast correctly identifies dangerous
code patterns including eval(), exec(), subprocess shell=True, os.system(),
pickle.loads(), and __import__(). Also verifies line number accuracy and
false positive prevention.
"""


from skills import find_dangerous_calls_ast


class TestSecurityPositiveDetection:
    """Test that dangerous patterns ARE properly detected."""

    def test_detects_eval_call(self, tmp_script):
        """Should detect eval() calls."""
        script = tmp_script("result = eval(user_input)\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "eval" in findings[0][0].lower()
        assert "injection" in findings[0][2].lower()

    def test_detects_exec_call(self, tmp_script):
        """Should detect exec() calls."""
        script = tmp_script("exec(user_code)\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "exec" in findings[0][0].lower()
        assert "injection" in findings[0][2].lower()

    def test_detects_import_call(self, tmp_script):
        """Should detect __import__() calls."""
        script = tmp_script("module = __import__('os')\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "__import__" in findings[0][0].lower()
        assert "injection" in findings[0][2].lower()

    def test_detects_shell_injection(self, tmp_script):
        """Should detect subprocess with shell=True."""
        script = tmp_script("import subprocess\nsubprocess.run(cmd, shell=True)\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "shell=true" in findings[0][0].lower()
        assert "injection" in findings[0][2].lower()

    def test_detects_os_system(self, tmp_script):
        """Should detect os.system() calls."""
        script = tmp_script("import os\nos.system('rm -rf /')\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "os.system" in findings[0][0].lower()
        assert "injection" in findings[0][2].lower()

    def test_detects_os_popen(self, tmp_script):
        """Should detect os.popen() calls."""
        script = tmp_script("import os\nos.popen('cat file.txt')\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "os.popen" in findings[0][0].lower()

    def test_detects_pickle_loads(self, tmp_script):
        """Should detect pickle.loads() calls."""
        script = tmp_script("import pickle\ndata = pickle.loads(untrusted_data)\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert "pickle.loads" in findings[0][0].lower()
        assert "execution" in findings[0][2].lower()

    def test_detects_multiple_issues(self, tmp_script):
        """Should detect multiple dangerous patterns in one file."""
        script = tmp_script(
            "import subprocess\n"
            "import os\n"
            "eval(user_input)\n"
            "os.system('ls')\n"
            "subprocess.run('cmd', shell=True)\n"
        )
        findings = find_dangerous_calls_ast(script)
        # Should find: eval, os.system, subprocess with shell=True
        assert len(findings) >= 3

    def test_line_numbers_accurate(self, tmp_script):
        """Should report accurate line numbers."""
        script = tmp_script(
            "# Line 1\nx = 1  # Line 2\neval('test')  # Line 3\ny = 2  # Line 4\n"
        )
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        assert findings[0][1] == 3  # Line number should be 3

    def test_distinguishes_safe_subprocess(self, tmp_script):
        """Should NOT flag subprocess without shell=True."""
        script = tmp_script(
            "import subprocess\n"
            "subprocess.run(['ls', '-l'])  # Safe - list args\n"
            "subprocess.run('cmd', shell=False)  # Safe - explicit False\n"
        )
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 0

    def test_context_messages_helpful(self, tmp_script):
        """Should provide helpful context messages."""
        script = tmp_script("eval('1+1')\n")
        findings = find_dangerous_calls_ast(script)
        assert len(findings) == 1
        # Context should mention the risk
        context = findings[0][2].lower()
        assert "injection" in context or "risk" in context
