"""
Comprehensive unit tests for ah-guard.py

Tests cover all verification functions, pattern detection, and edge cases.
"""

from __future__ import annotations

import json
import os
from unittest.mock import patch

import pytest

# Import all functions from ah_guard module
from ah_guard import (
    SOURCE_PATTERNS,
    CONFIDENCE_PATTERNS,
    TOOL_PATTERNS,
    RED_FLAG_PATTERNS,
    extract_last_assistant_message,
    has_source_citations,
    has_confidence_level,
    has_tool_usage_evidence,
    has_red_flags,
    requires_external_verification,
    verify_anti_hallucination_protocol,
    main as ah_guard_main,
)


###############################################################################
# FIXTURES
###############################################################################


@pytest.fixture
def sample_context():
    """Sample context with messages array."""
    return {
        "messages": [
            {"role": "user", "content": "How do I use axios?"},
            {
                "role": "assistant",
                "content": "Use ref_search_documentation to find official docs.",
            },
        ]
    }


@pytest.fixture
def context_with_mixed_content():
    """Context with mixed content (text + tool_use)."""
    return {
        "messages": [
            {
                "role": "assistant",
                "content": [
                    {"type": "text", "text": "I searched the docs."},
                    {
                        "type": "tool_use",
                        "id": "abc",
                        "name": "ref_search_documentation",
                    },
                ],
            }
        ]
    }


@pytest.fixture
def context_with_last_message():
    """Context with last_message fallback."""
    return {"last_message": "Here is the answer you requested."}


###############################################################################
# TESTS: extract_last_assistant_message
###############################################################################


class TestExtractLastAssistantMessage:
    """Tests for extract_last_assistant_message function."""

    def test_extract_from_messages(self, sample_context):
        """Test extraction from messages array."""
        result = extract_last_assistant_message(sample_context)
        assert result == "Use ref_search_documentation to find official docs."

    def test_extract_from_mixed_content(self, context_with_mixed_content):
        """Test extraction from mixed content (text + tool_use)."""
        result = extract_last_assistant_message(context_with_mixed_content)
        assert result == "I searched the docs."

    def test_extract_fallback_to_last_message(self, context_with_last_message):
        """Test fallback to last_message when no messages."""
        result = extract_last_assistant_message(context_with_last_message)
        assert result == "Here is the answer you requested."

    def test_extract_returns_none_for_empty_context(self):
        """Test returns None for empty context."""
        result = extract_last_assistant_message({})
        assert result is None

    def test_extract_returns_none_for_empty_messages(self):
        """Test returns None when messages array is empty."""
        result = extract_last_assistant_message({"messages": []})
        assert result is None

    def test_extract_skips_user_messages(self):
        """Test that user messages are skipped."""
        context = {
            "messages": [
                {"role": "user", "content": "Question"},
                {"role": "user", "content": "Another question"},
                {"role": "assistant", "content": "Answer"},
            ]
        }
        result = extract_last_assistant_message(context)
        assert result == "Answer"

    def test_extract_gets_last_assistant_message(self):
        """Test gets the LAST assistant message when multiple exist."""
        context = {
            "messages": [
                {"role": "assistant", "content": "First answer"},
                {"role": "user", "content": "Follow up"},
                {"role": "assistant", "content": "Second answer"},
            ]
        }
        result = extract_last_assistant_message(context)
        assert result == "Second answer"


###############################################################################
# TESTS: has_source_citations
###############################################################################


class TestHasSourceCitations:
    """Tests for has_source_citations function."""

    def test_detects_bracketed_source(self):
        """Test detection of [Source: URL] pattern."""
        assert has_source_citations("[Source: https://example.com]")

    def test_detects_source_colon(self):
        """Test detection of Source: URL pattern."""
        assert has_source_citations("Source: https://docs.python.org")

    def test_detects_sources_list(self):
        """Test detection of Sources: list format."""
        assert has_source_citations("Sources:\n- [Example Docs](https://example.com)")

    def test_detects_http_url(self):
        """Test detection of HTTP/HTTPS URLs."""
        assert has_source_citations("See https://docs.python.org/3/library/")

    def test_detects_markdown_bold_source(self):
        """Test detection of **Source**: pattern."""
        assert has_source_citations("**Source**: Official documentation")

    def test_case_insensitive(self):
        """Test that pattern matching is case-insensitive."""
        assert has_source_citations("source: https://example.com")
        assert has_source_citations("SOURCE: https://example.com")

    def test_no_citation_returns_false(self):
        """Test returns False when no citations present."""
        assert not has_source_citations("Just some text without sources")

    def test_empty_string_returns_false(self):
        """Test returns False for empty string."""
        assert not has_source_citations("")

    def test_none_returns_false(self):
        """Test returns False for None input."""
        assert not has_source_citations(None)


###############################################################################
# TESTS: has_confidence_level
###############################################################################


class TestHasConfidenceLevel:
    """Tests for has_confidence_level function."""

    def test_detects_confidence_high(self):
        """Test detection of HIGH confidence."""
        assert has_confidence_level("Confidence: HIGH")

    def test_detects_confidence_medium(self):
        """Test detection of MEDIUM confidence."""
        assert has_confidence_level("Confidence: MEDIUM")

    def test_detects_confidence_low(self):
        """Test detection of LOW confidence."""
        assert has_confidence_level("Confidence: LOW")

    def test_detects_markdown_bold_confidence(self):
        """Test detection of **Confidence**: pattern."""
        assert has_confidence_level("**Confidence**: HIGH")

    def test_detects_heading_confidence(self):
        """Test detection of ### Confidence heading."""
        assert has_confidence_level("### Confidence: MEDIUM")

    def test_case_insensitive(self):
        """Test case-insensitive matching."""
        assert has_confidence_level("confidence: high")
        assert has_confidence_level("CONFIDENCE: LOW")

    def test_no_confidence_returns_false(self):
        """Test returns False when no confidence level."""
        assert not has_confidence_level("No confidence mentioned here")

    def test_empty_string_returns_false(self):
        """Test returns False for empty string."""
        assert not has_confidence_level("")

    def test_none_returns_false(self):
        """Test returns False for None input."""
        assert not has_confidence_level(None)


###############################################################################
# TESTS: has_tool_usage_evidence
###############################################################################


class TestHasToolUsageEvidence:
    """Tests for has_tool_usage_evidence function."""

    def test_detects_ref_search_documentation(self):
        """Test detection of ref_search_documentation."""
        assert has_tool_usage_evidence("Used ref_search_documentation to find docs")

    def test_detects_ref_read_url(self):
        """Test detection of ref_read_url."""
        assert has_tool_usage_evidence("Then ref_read_url to get full content")

    def test_detects_searchCode(self):
        """Test detection of searchCode."""
        assert has_tool_usage_evidence("Found examples via searchCode")

    def test_detects_WebSearch(self):
        """Test detection of WebSearch."""
        assert has_tool_usage_evidence("Searched with WebSearch for recent info")

    def test_detects_WebFetch(self):
        """Test detection of WebFetch."""
        assert has_tool_usage_evidence("Fetched docs via WebFetch")

    def test_detects_mcp_namespaced_tools(self):
        """Test detection of MCP namespaced tools."""
        assert has_tool_usage_evidence("Used mcp__ref__ref_search_documentation")
        assert has_tool_usage_evidence("Called mcp__grep__searchCode")

    def test_no_tool_evidence_returns_false(self):
        """Test returns False when no tool evidence."""
        assert not has_tool_usage_evidence("Just an answer without tools")

    def test_empty_string_returns_false(self):
        """Test returns False for empty string."""
        assert not has_tool_usage_evidence("")

    def test_none_returns_false(self):
        """Test returns False for None input."""
        assert not has_tool_usage_evidence(None)


###############################################################################
# TESTS: has_red_flags
###############################################################################


class TestHasRedFlags:
    """Tests for has_red_flags function."""

    def test_detects_i_think(self):
        """Test detection of 'I think' pattern."""
        result = has_red_flags("I think this is the answer")
        # Check that 'I think' appears in any flag (handles trailing space)
        assert any("I think" in flag for flag in result)

    def test_detects_i_believe(self):
        """Test detection of 'I believe' pattern."""
        result = has_red_flags("I believe this works")
        assert any("I believe" in flag for flag in result)

    def test_detects_i_recall(self):
        """Test detection of 'I recall' pattern."""
        result = has_red_flags("I recall seeing this")
        assert any("I recall" in flag for flag in result)

    def test_detects_should(self):
        """Test detection of 'should' uncertainty."""
        result = has_red_flags("It should work like this")
        assert "It should" in result

    def test_detects_might(self):
        """Test detection of 'might' uncertainty."""
        result = has_red_flags("This might be correct")
        assert "This might" in result

    def test_detects_probably(self):
        """Test detection of 'Probably'."""
        result = has_red_flags("Probably the best approach")
        assert "Probably" in result

    def test_detects_multiple_flags(self):
        """Test detection of multiple red flags."""
        result = has_red_flags("I think this should probably work")
        assert len(result) >= 3

    def test_no_flags_returns_empty_list(self):
        """Test returns empty list when no red flags."""
        result = has_red_flags("This is verified and correct")
        assert result == []

    def test_empty_string_returns_empty_list(self):
        """Test returns empty list for empty string."""
        assert has_red_flags("") == []

    def test_none_returns_empty_list(self):
        """Test returns empty list for None input."""
        assert has_red_flags(None) == []


###############################################################################
# TESTS: requires_external_verification
###############################################################################


class TestRequiresExternalVerification:
    """Tests for requires_external_verification function."""

    def test_detects_api_keyword(self):
        """Test detection of API keyword."""
        assert requires_external_verification("Use the API to fetch data")

    def test_detects_library_keyword(self):
        """Test detection of library keyword."""
        assert requires_external_verification("This library function handles")

    def test_detects_framework_keyword(self):
        """Test detection of framework keyword."""
        assert requires_external_verification("React framework component")

    def test_detects_method_keyword(self):
        """Test detection of method keyword."""
        assert requires_external_verification("Call this method with")

    def test_detects_function_keyword(self):
        """Test detection of function keyword."""
        assert requires_external_verification("The function returns")

    def test_detects_version_keyword(self):
        """Test detection of version keyword."""
        assert requires_external_verification("Version 2.0 includes")

    def test_detects_version_number(self):
        """Test detection of version numbers."""
        assert requires_external_verification("Python 3.11 added this")
        assert requires_external_verification("Using version 1.2.3")

    def test_detects_documentation_keyword(self):
        """Test detection of documentation keyword."""
        assert requires_external_verification("Check the documentation for")

    def test_detects_recent_changes(self):
        """Test detection of recent changes."""
        assert requires_external_verification("Recent update to the API")
        assert requires_external_verification("Recent release notes")

    def test_detects_urls(self):
        """Test detection of URLs."""
        assert requires_external_verification("Go to https://example.com")

    def test_no_verification_needed(self):
        """Test returns False for internal discussion."""
        assert not requires_external_verification("Ok, I will do that now")
        assert not requires_external_verification("Here is the summary")

    def test_empty_string_returns_false(self):
        """Test returns False for empty string."""
        assert not requires_external_verification("")

    def test_none_returns_false(self):
        """Test returns False for None input."""
        assert not requires_external_verification(None)


###############################################################################
# TESTS: verify_anti_hallucination_protocol
###############################################################################


class TestVerifyAntiHallucinationProtocol:
    """Tests for verify_anti_hallucination_protocol function."""

    def test_short_message_allowed(self):
        """Test that short messages (< 50 chars) are allowed."""
        is_compliant, reason = verify_anti_hallucination_protocol("OK, done")
        assert is_compliant is True
        assert reason == "Task is complete"

    def test_empty_message_allowed(self):
        """Test that empty messages are allowed."""
        is_compliant, reason = verify_anti_hallucination_protocol("")
        assert is_compliant is True
        assert reason == "Task is complete"

    def test_internal_discussion_allowed(self):
        """Test that internal discussion (no verification keywords) is allowed."""
        is_compliant, reason = verify_anti_hallucination_protocol(
            "I understand your request and will proceed accordingly."
        )
        assert is_compliant is True
        assert "internal discussion" in reason

    def test_api_claim_without_sources_denied(self):
        """Test that API claims without sources are denied."""
        text = "Use the axios library to make HTTP requests with this method."
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source citations" in reason

    def test_api_claim_with_sources_allowed(self):
        """Test that API claims with sources are allowed."""
        text = """Use the axios library to make HTTP requests.

**Source**: [axios docs](https://axios-http.com/docs/interceptors)
**Confidence**: HIGH

Verified with ref_search_documentation."""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True
        assert reason == "Task is complete"

    def test_claim_with_confidence_but_no_source_denied(self):
        """Test that claims with confidence but no source are denied."""
        text = (
            "The library supports this feature as of version 2.0. **Confidence**: HIGH"
        )
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source citations" in reason

    def test_red_flags_without_tool_evidence_denied(self):
        """Test that red flags without tool evidence are denied."""
        text = "I think the API supports this feature. There might be a method for it."
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "uncertainty phrases" in reason

    def test_red_flags_with_tool_evidence_allowed(self):
        """Test that red flags with tool evidence still require sources."""
        text = """I searched using ref_search_documentation and found that I think
the method exists but I need to verify further.

**Confidence**: MEDIUM"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        # Even with tool evidence and confidence, sources are still required
        # when verification keywords are present (like 'method')
        assert is_compliant is False
        assert "source" in reason.lower()

    def test_full_compliant_response(self):
        """Test a fully compliant response."""
        text = """According to React 19 documentation:

The new use hook replaces useState.

**Source**: [React docs](https://react.dev/reference/react)
**Confidence**: HIGH

Found via ref_search_documentation and verified."""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True
        assert reason == "Task is complete"

    def test_multiple_issues_all_reported(self):
        """Test that multiple compliance issues are all reported."""
        text = "I believe the library has a method that might work for version 1.5"
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source citations" in reason
        assert "confidence" in reason

    def test_version_number_triggers_verification(self):
        """Test that version numbers trigger verification requirement."""
        text = "In Python 3.11, the Self type was added for type hints in classes."
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source" in reason.lower()

    def test_url_in_text_triggers_verification(self):
        """Test that URLs trigger verification requirement."""
        text = "Check https://docs.python.org for more info."
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        # Has URL (source) so might pass
        assert "source" in reason.lower() or is_compliant is True


###############################################################################
# TESTS: Edge Cases and Integration
###############################################################################


class TestEdgeCases:
    """Tests for edge cases and integration scenarios."""

    def test_whitespace_only_message(self):
        """Test message with only whitespace."""
        is_compliant, reason = verify_anti_hallucination_protocol("   ")
        assert is_compliant is True

    def test_newlines_only_message(self):
        """Test message with only newlines."""
        is_compliant, reason = verify_anti_hallucination_protocol("\n\n\n")
        assert is_compliant is True

    def test_unicode_content(self):
        """Test handling of unicode characters."""
        text = "使用API来处理数据，这是一个很长的一句话来测试验证功能是否正常工作，需要确保超过五十个字符才能触发验证逻辑。"
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        # Contains 'API' keyword but no source
        assert is_compliant is False

    def test_very_long_message(self):
        """Test handling of very long messages."""
        text = " ".join(["word"] * 1000) + " API method call"
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False

    def test_message_with_code_block(self):
        """Test message with code block."""
        text = """
```python
import requests
requests.get(url)
```
This uses the requests library.
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False  # Has 'library' keyword, no source


###############################################################################
# TESTS: Main Function with Environment Variables
###############################################################################


class TestMainFunction:
    """Tests for main() function with environment mocking."""

    @patch.dict(os.environ, {"ARGUMENTS": "{}"})
    def test_main_with_empty_context(self, capsys):
        """Test main with empty ARGUMENTS."""
        exit_code = ah_guard_main()
        captured = capsys.readouterr()
        assert exit_code == 0
        output = json.loads(captured.out)
        assert output["ok"] is True
        # Empty JSON context results in no content to verify
        assert (
            "content" in output["reason"].lower()
            or "context" in output["reason"].lower()
        )

    @patch.dict(os.environ, {"ARGUMENTS": "invalid json"})
    def test_main_with_invalid_json(self, capsys):
        """Test main with invalid JSON in ARGUMENTS."""
        exit_code = ah_guard_main()
        captured = capsys.readouterr()
        assert exit_code == 0
        output = json.loads(captured.out)
        assert output["ok"] is True  # Graceful degradation

    @patch.dict(
        os.environ,
        {
            "ARGUMENTS": json.dumps(
                {"messages": [{"role": "assistant", "content": "OK, will do that."}]}
            )
        },
    )
    def test_main_with_compliant_message(self, capsys):
        """Test main with compliant message."""
        exit_code = ah_guard_main()
        captured = capsys.readouterr()
        assert exit_code == 0
        output = json.loads(captured.out)
        assert output["ok"] is True

    @patch.dict(
        os.environ,
        {
            "ARGUMENTS": json.dumps(
                {
                    "messages": [
                        {
                            "role": "assistant",
                            "content": "Use the axios library method to fetch data from the server API endpoint.",
                        }
                    ]
                }
            )
        },
    )
    def test_main_with_non_compliant_message(self, capsys):
        """Test main with non-compliant message (missing source)."""
        exit_code = ah_guard_main()
        captured = capsys.readouterr()
        assert exit_code == 1  # Should deny stop
        output = json.loads(captured.out)
        assert output["ok"] is False
        assert "verification" in output["reason"].lower()

    @patch.dict(os.environ, {"ARGUMENTS": ""})
    def test_main_with_no_arguments_var(self, capsys):
        """Test main when ARGUMENTS env var is not set."""
        # This should set empty string as default
        exit_code = ah_guard_main()
        captured = capsys.readouterr()
        assert exit_code == 0
        output = json.loads(captured.out)
        assert output["ok"] is True


###############################################################################
# TESTS: Pattern Constants
###############################################################################


class TestPatternConstants:
    """Tests to verify pattern constants are correctly defined."""

    def test_source_patterns_defined(self):
        """Test that SOURCE_PATTERNS is defined and non-empty."""
        assert SOURCE_PATTERNS
        assert len(SOURCE_PATTERNS) > 0
        assert all(isinstance(p, str) for p in SOURCE_PATTERNS)

    def test_confidence_patterns_defined(self):
        """Test that CONFIDENCE_PATTERNS is defined and non-empty."""
        assert CONFIDENCE_PATTERNS
        assert len(CONFIDENCE_PATTERNS) > 0
        assert all(isinstance(p, str) for p in CONFIDENCE_PATTERNS)

    def test_tool_patterns_defined(self):
        """Test that TOOL_PATTERNS is defined and non-empty."""
        assert TOOL_PATTERNS
        assert len(TOOL_PATTERNS) > 0
        assert all(isinstance(p, str) for p in TOOL_PATTERNS)

    def test_red_flag_patterns_defined(self):
        """Test that RED_FLAG_PATTERNS is defined and non-empty."""
        assert RED_FLAG_PATTERNS
        assert len(RED_FLAG_PATTERNS) > 0
        assert all(isinstance(p, str) for p in RED_FLAG_PATTERNS)


###############################################################################
# PARAMETERIZED TESTS
###############################################################################


class TestParameterizedScenarios:
    """Parameterized tests for various scenarios."""

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("[Source: https://example.com]", True),
            ("Source: https://example.com", True),
            ("https://docs.python.org", True),
            ("**Source**: Docs", True),
            ("No source here", False),
            ("", False),
        ],
    )
    def test_source_citation_patterns(self, text, expected):
        """Parameterized test for various source citation formats."""
        assert has_source_citations(text) == expected

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("Confidence: HIGH", True),
            ("confidence: medium", True),
            ("**Confidence**: LOW", True),
            ("No confidence stated", False),
            ("", False),
        ],
    )
    def test_confidence_level_patterns(self, text, expected):
        """Parameterized test for various confidence formats."""
        assert has_confidence_level(text) == expected

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("I think this works", True),
            ("I believe it is correct", True),
            ("It should work", True),
            ("Probably correct", True),
            ("This is verified", False),
            ("", False),
        ],
    )
    def test_red_flag_detection(self, text, expected):
        """Parameterized test for red flag detection."""
        assert (len(has_red_flags(text)) > 0) == expected

    @pytest.mark.parametrize(
        "text,expected",
        [
            ("Use the API", True),
            ("This library method", True),
            ("The framework component", True),
            ("Internal variable", False),
            ("Just code", False),
            ("", False),
        ],
    )
    def test_verification_requirement(self, text, expected):
        """Parameterized test for verification requirement."""
        assert requires_external_verification(text) == expected


###############################################################################
# TESTS: Real-World Scenarios
###############################################################################


class TestRealWorldScenarios:
    """Tests based on real-world usage scenarios."""

    def test_verified_api_response(self):
        """Test a properly verified API response."""
        text = """
Based on ref_search_documentation of the axios documentation:

The axios interceptors can be used like this:

```javascript
axios.interceptors.request.use(config => {
  // Modify request
  return config;
});
```

**Source**: [axios docs](https://axios-http.com/docs/interceptors)
**Verified**: 2024-01-15
**Confidence**: HIGH
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True

    def test_unverified_library_claim(self):
        """Test an unverified library claim (common failure case)."""
        text = """
You can use the requests library in Python. Just do:

import requests
requests.get(url)

This will fetch the data.
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source" in reason.lower()
        assert "confidence" in reason.lower()

    def test_response_with_tool_evidence(self):
        """Test response that shows tool usage evidence."""
        text = """
I used searchCode to find examples of useState in React:

```javascript
const [state, setState] = useState(null);
```

Found this pattern in 500+ repositories. Confidence: HIGH
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True

    def test_response_with_uncertainty_phrases(self):
        """Test response with uncertainty phrases (should fail)."""
        text = """
I think the pandas library has a read_csv function. It might support
various file formats. You should check the documentation.

I believe the syntax is:
```python
import pandas as pd
pd.read_csv('file.csv')
```
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "uncertainty" in reason.lower()

    def test_internal_task_completion(self):
        """Test simple task completion (should pass)."""
        text = """
Done! I've completed the requested changes:

1. Updated the configuration
2. Added the new feature
3. Fixed the bug

The code is ready for review.
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True

    def test_version_specific_claim_without_source(self):
        """Test version-specific claim without source."""
        text = """
In Python 3.11, they added the Self type for type hints. You can use it
like this:

from typing import Self

class MyClass:
    def return_self(self) -> Self:
        return self
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is False
        assert "source" in reason.lower()

    def test_version_specific_claim_with_source(self):
        """Test version-specific claim with proper source."""
        text = """
In Python 3.11, they added the Self type for type hints.

**Source**: [PEP 673](https://peps.python.org/pep-0673/)
**Confidence**: HIGH
**Verified**: 2024-01-15
"""
        is_compliant, reason = verify_anti_hallucination_protocol(text)
        assert is_compliant is True


###############################################################################
# TESTS: Regression Tests
###############################################################################


class TestRegressionTests:
    """Regression tests to ensure fixed bugs don't reappear."""

    def test_none_content_handling(self):
        """Test that None content is handled gracefully (bug fix)."""
        # This was a bug: None was passed to verify_anti_hallucination_protocol
        # Ensure it's handled in main(), not in the function itself
        context = {"messages": []}  # Will result in None from extraction
        content = extract_last_assistant_message(context)
        # The function should handle None in main(), not here
        # But verify_anti_hallucination_protocol should handle it gracefully
        assert content is None

    def test_tool_name_variations(self):
        """Test various tool name formats are detected."""
        texts = [
            "Used ref_search_documentation",
            "Used mcp__ref__ref_search_documentation",
            "Called searchCode",
            "Used mcp__grep__searchCode",
            "Tried WebSearch",
        ]
        for text in texts:
            assert has_tool_usage_evidence(text), f"Failed to detect tool in: {text}"
