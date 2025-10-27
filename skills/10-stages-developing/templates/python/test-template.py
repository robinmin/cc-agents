"""
Tests for [module_name].

This module contains comprehensive tests for [module_name] functions.
"""

import pytest
from module_name import function_name


class TestFunctionName:
    """Test suite for function_name."""

    def test_function_name_smoke(self):
        """Smoke test for function_name."""
        result = function_name("test", 10)
        assert result is not None
        assert isinstance(result, dict)

    def test_function_name_valid_input(self):
        """Test with valid input parameters."""
        result = function_name("hello", 42)

        assert result["key1"] == "processed_hello"
        assert result["key2"] == 84

    def test_function_name_empty_string(self):
        """Test with empty string parameter."""
        with pytest.raises(ValueError, match="cannot be empty"):
            function_name("", 10)

    def test_function_name_negative_number(self):
        """Test with negative number parameter."""
        with pytest.raises(ValueError, match="must be non-negative"):
            function_name("test", -1)

    def test_function_name_zero(self):
        """Test with zero as parameter."""
        result = function_name("test", 0)
        assert result["key2"] == 0

    def test_function_name_large_number(self):
        """Test with large number parameter."""
        result = function_name("test", 1000000)
        assert result["key2"] == 2000000


# Parametrized tests for multiple inputs
@pytest.mark.parametrize("input_str,input_num,expected_key1,expected_key2", [
    ("hello", 10, "processed_hello", 20),
    ("world", 5, "processed_world", 10),
    ("test", 0, "processed_test", 0),
])
def test_function_name_parametrized(input_str, input_num, expected_key1, expected_key2):
    """Test with multiple parameter combinations."""
    result = function_name(input_str, input_num)
    assert result["key1"] == expected_key1
    assert result["key2"] == expected_key2
