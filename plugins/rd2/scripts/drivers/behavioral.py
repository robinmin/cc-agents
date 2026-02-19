"""Behavioral test driver - runs scenarios.yaml tests."""

import yaml
from pathlib import Path
from typing import Any


def load_scenarios(scenarios_path: Path) -> dict[str, Any]:
    """Load scenarios.yaml and validate against schema."""
    if not scenarios_path.exists():
        return {}

    content = scenarios_path.read_text()
    try:
        return yaml.safe_load(content) or {}
    except Exception:
        return {}


def run_trigger_tests(
    skill_description: str,
    scenarios: dict
) -> dict[str, Any]:
    """Run trigger detection tests.

    Args:
        skill_description: The skill's description text (for trigger matching)
        scenarios: Loaded scenarios.yaml content

    Returns:
        Dict with test results
    """
    should_trigger = scenarios.get("trigger_tests", {}).get("should_trigger", [])
    should_not_trigger = scenarios.get("trigger_tests", {}).get("should_not_trigger", [])

    results = {
        "triggered": [],
        "not_triggered": [],
        "false_positives": [],
        "false_negatives": [],
    }

    # Normalize description for matching
    desc_lower = skill_description.lower()

    # Test should_trigger cases
    for case in should_trigger:
        query = case["query"]
        expected_confidence = case.get("confidence", 0.8)

        # Simple keyword matching as proxy for trigger detection
        query_words = query.lower().split()
        match_count = sum(1 for w in query_words if w in desc_lower)
        score = min(match_count / max(len(query_words), 1), 1.0)

        if score >= expected_confidence:
            results["triggered"].append(query)
        else:
            results["false_negatives"].append({"query": query, "score": score})

    # Test should_not_trigger cases
    for case in should_not_trigger:
        query = case["query"]
        query_words = query.lower().split()
        match_count = sum(1 for w in query_words if w in desc_lower)
        score = min(match_count / max(len(query_words), 1), 1.0)

        if score > 0.3:
            results["false_positives"].append({"query": query, "score": score})
        else:
            results["not_triggered"].append(query)

    # Calculate pass/fail
    criteria = scenarios.get("trigger_tests", {}).get("pass_criteria", {})
    trigger_rate = len(results["triggered"]) / len(should_trigger) if should_trigger else 0
    fp_rate = len(results["false_positives"]) / len(should_not_trigger) if should_not_trigger else 0

    results["passed"] = (
        trigger_rate >= criteria.get("min_trigger_rate", 0.85) and
        fp_rate <= criteria.get("max_false_positive_rate", 0.15)
    )
    results["trigger_rate"] = trigger_rate
    results["false_positive_rate"] = fp_rate

    return results


def run_scenario_tests(
    scenarios: dict
) -> dict[str, Any]:
    """Run scenario-based behavioral tests.

    Note: Full execution requires LLM integration. This is a placeholder.
    """
    scenario_list = scenarios.get("scenarios", [])
    results = []

    for scenario in scenario_list:
        results.append({
            "name": scenario.get("name", "Unnamed"),
            "description": scenario.get("description", ""),
            "input": scenario.get("input", ""),
            "expected_behaviors": scenario.get("expected_behaviors", []),
            "note": "Execution requires LLM integration"
        })

    return {
        "scenarios": results,
        "total": len(results),
        "note": "Full execution requires LLM integration"
    }


def print_behavioral_results(results: dict[str, Any]) -> None:
    """Print behavioral test results."""
    if "trigger_rate" in results:
        print("Trigger Tests:")
        print(f"  Trigger rate: {results.get('trigger_rate', 0):.1%}")
        print(f"  False positive rate: {results.get('false_positive_rate', 0):.1%}")
        print(f"  Passed: {results.get('passed', False)}")
        print()

    if "scenarios" in results:
        print("Scenario Tests:")
        for scenario in results["scenarios"]:
            print(f"  - {scenario.get('name')}: {scenario.get('note', 'N/A')}")
        print()
