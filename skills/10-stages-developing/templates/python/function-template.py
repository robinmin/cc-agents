"""
Module for [module_name].

[Brief description of what this module does]
"""

from typing import List, Dict, Any, Optional


def function_name(param1: str, param2: int) -> Dict[str, Any]:
    """
    [Brief description of what the function does].

    Args:
        param1: [Description of param1]
        param2: [Description of param2]

    Returns:
        Dictionary containing:
        - key1: [Description of key1]
        - key2: [Description of key2]

    Raises:
        ValueError: If [condition for ValueError]
        TypeError: If [condition for TypeError]

    Examples:
        >>> function_name("example", 42)
        {'key1': 'value1', 'key2': 'value2'}
    """
    # Input validation
    if not param1:
        raise ValueError("param1 cannot be empty")

    if param2 < 0:
        raise ValueError("param2 must be non-negative")

    # Implementation
    result = {
        "key1": f"processed_{param1}",
        "key2": param2 * 2
    }

    return result
