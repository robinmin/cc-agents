#!/usr/bin/env python3
"""
Anti-Hallucination Guard - Stop Hook for Claude Code

This script enforces the anti-hallucination protocol by verifying that
Claude's responses include proper source citations, confidence levels,
and evidence of verification tool usage.

Environment Variables:
    ARGUMENTS    - JSON string containing Stop hook context with:
                   - messages: Array of conversation messages
                   - last_message: Most recent assistant message

Exit Codes:
    0 - Allow stop (protocol followed)
    1 - Deny stop (protocol not followed, outputs JSON with reason)

Output Format (stdout):
    {"ok": true, "reason": "Task is complete"}           # Allow stop
    {"ok": false, "reason": "Add verification for ..."}  # Deny stop
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any


###############################################################################
# VERIFICATION PATTERNS
###############################################################################

# Source citation patterns
SOURCE_PATTERNS = [
    r"\[Source:\s*[^\]]+\]",  # [Source: URL or Title]
    r"Source:\s*\[?[^\n]+\]?",  # Source: URL or Title
    r"Sources:\s*\n\s*-\s*\[?[^\n]+\]",  # Sources: list format
    r"https?://[^\s\)]+",  # Any HTTP/HTTPS URL
    r"\*\*Source\*\*:\s*[^\n]+",  # Markdown bold Source:
]

# Confidence level patterns
CONFIDENCE_PATTERNS = [
    r"Confidence:\s*(HIGH|MEDIUM|LOW)",
    r"\*\*Confidence\*\*:\s*(HIGH|MEDIUM|LOW)",
    r"### Confidence",
]

# Verification tool usage patterns (evidence tools)
TOOL_PATTERNS = [
    r"ref_search_documentation",
    r"ref_read_url",
    r"searchCode",
    r"WebSearch",
    r"WebFetch",
    r"mcp__ref__ref_search_documentation",
    r"mcp__ref__ref_read_url",
    r"mcp__grep__searchCode",
]

# Red flags - patterns that indicate claims without verification
RED_FLAG_PATTERNS = [
    r"I (?:think|believe|recall) (?:that|the)?",
    r"(?:It|This) (?:should|might|may|could)",
    r"Probably|Likely|Possibly",
    r"(?:As far as|If I) (?:know|recall)",
]

###############################################################################
# VERIFICATION FUNCTIONS
###############################################################################


def extract_last_assistant_message(context: dict[str, Any]) -> str | None:
    """Extract the last assistant message from the context."""
    messages = context.get("messages", [])

    # Find the last assistant message in messages array
    for message in reversed(messages):
        if message.get("role") == "assistant":
            content = message.get("content", "")
            if isinstance(content, list):
                # Handle mixed content (text + tool_use)
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                return "\n".join(text_parts)
            return str(content)

    # Fallback to last_message if provided
    last_msg = context.get("last_message")
    if last_msg:
        return str(last_msg)

    return None


def has_source_citations(text: str) -> bool:
    """Check if text contains source citations."""
    if not text:
        return False

    for pattern in SOURCE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def has_confidence_level(text: str) -> bool:
    """Check if text includes confidence scoring."""
    if not text:
        return False

    for pattern in CONFIDENCE_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False


def has_tool_usage_evidence(text: str) -> bool:
    """Check if text shows evidence of verification tool usage."""
    if not text:
        return False

    for pattern in TOOL_PATTERNS:
        if re.search(pattern, text):
            return True
    return False


def has_red_flags(text: str) -> list[str]:
    """Find red flags indicating unverified claims."""
    if not text:
        return []

    found_flags = []
    for pattern in RED_FLAG_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            found_flags.extend(matches)

    return found_flags


def requires_external_verification(text: str) -> bool:
    """Check if the content requires external verification."""
    if not text:
        return False

    # Keywords that indicate external info is needed (all lowercase for text_lower search)
    verification_keywords = [
        r"api",
        r"library",
        r"framework",
        r"method",
        r"function",
        r"version",
        r"documentation",
        r"official",
        r"recent\s+(?:change|update|release)",
        r"\d+\.\d+(?:\.\d+)?",  # Version numbers like 1.2.3
        r"https?://",  # URLs mentioned
    ]

    text_lower = text.lower()
    for keyword in verification_keywords:
        if re.search(keyword, text_lower):
            return True

    return False


def verify_anti_hallucination_protocol(text: str) -> tuple[bool, str]:
    """
    Verify if the anti-hallucination protocol was followed.

    Returns:
        (is_compliant, reason_message)
    """
    if not text or len(text.strip()) < 50:
        # Empty or very short messages are OK
        return True, "Task is complete"

    # Check if content requires verification
    needs_verification = requires_external_verification(text)

    if not needs_verification:
        # Internal discussion, no verification needed
        return True, "Task is complete (internal discussion)"

    # Check for source citations
    has_sources = has_source_citations(text)

    # Check for confidence levels
    has_confidence = has_confidence_level(text)

    # Check for tool usage evidence
    has_tools = has_tool_usage_evidence(text)

    # Check for red flags
    red_flags = has_red_flags(text)

    # Decision logic
    issues = []

    if not has_sources:
        issues.append("source citations for API/library claims")

    if not has_confidence:
        issues.append("confidence level (HIGH/MEDIUM/LOW)")

    if red_flags and not has_tools:
        issues.append(f"uncertainty phrases detected: {', '.join(set(red_flags[:3]))}")

    if issues:
        reason = f"Add verification for: {', '.join(issues)}"
        return False, reason

    # If all checks pass
    return True, "Task is complete"


###############################################################################
# MAIN ENTRY POINT
###############################################################################


def main() -> int:
    """Main entry point for the Stop hook."""
    # Read context from ARGUMENTS environment variable
    arguments_json = os.environ.get("ARGUMENTS", "{}")

    try:
        context = json.loads(arguments_json)
    except json.JSONDecodeError:
        # If ARGUMENTS is not valid JSON, check if it's empty
        if not arguments_json or arguments_json == "{}":
            # No context available - allow stop
            output = {"ok": True, "reason": "Task is complete (no context)"}
            print(json.dumps(output))
            return 0
        else:
            # Invalid JSON - warn but allow
            output = {
                "ok": True,
                "reason": "Task is complete (invalid context ignored)",
            }
            print(json.dumps(output))
            return 0

    # Extract the last assistant message
    content = extract_last_assistant_message(context)

    # Handle case where content couldn't be extracted
    if content is None:
        output = {"ok": True, "reason": "No content to verify"}
        print(json.dumps(output))
        return 0

    # Verify anti-hallucination protocol
    is_compliant, reason = verify_anti_hallucination_protocol(content)

    output = {"ok": is_compliant, "reason": reason}

    print(json.dumps(output))

    # Exit code: 0 = allow stop, 1 = deny stop
    return 0 if is_compliant else 1


if __name__ == "__main__":
    sys.exit(main())
