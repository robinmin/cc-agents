"""Behavioral test scenario evaluation module.

Parses and validates tests/scenarios.yaml files in skill directories,
scores coverage and quality of behavioral test scenarios.
"""

from __future__ import annotations

import yaml
from pathlib import Path
from dataclasses import dataclass, field
from typing import Any

try:
    from .base import DimensionScore, RubricCriterion, RubricLevel, RubricScorer
except ImportError:
    from base import DimensionScore, RubricCriterion, RubricLevel, RubricScorer


# Minimum scenarios per skill type
SCENARIO_MINIMUMS = {
    "technique": 3,
    "pattern": 2,
    "reference": 2,
    "workflow": 4,
    "default": 2,
}

# Difficulty weight multipliers
DIFFICULTY_WEIGHTS = {
    "beginner": 1.0,
    "intermediate": 1.2,
    "advanced": 1.5,
}


@dataclass
class Scenario:
    """A single behavioral test scenario."""
    name: str
    input: str
    expected_behaviors: list[str]
    anti_behaviors: list[str] = field(default_factory=list)
    difficulty: str = "beginner"
    tags: list[str] = field(default_factory=list)


@dataclass  
class ScenarioSet:
    """A validated set of scenarios from tests/scenarios.yaml."""
    version: str = "1.0"
    scenarios: list[Scenario] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class ScenarioParser:
    """Parses and validates tests/scenarios.yaml files."""
    
    SCHEMA_VERSION = "1.0"
    
    @staticmethod
    def parse(yaml_content: str) -> ScenarioSet:
        """Parse YAML content into ScenarioSet.
        
        Args:
            yaml_content: Raw YAML string from scenarios.yaml
            
        Returns:
            ScenarioSet with validated scenarios or errors
        """
        result = ScenarioSet()
        
        try:
            data = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            result.errors.append(f"Invalid YAML: {e}")
            return result
        
        if not isinstance(data, dict):
            result.errors.append("Root must be a dictionary with 'scenarios' key")
            return result
        
        # Check version
        result.version = data.get("version", "1.0")
        
        scenarios_data = data.get("scenarios", [])
        if not scenarios_data:
            result.errors.append("No scenarios defined")
            return result
        
        if not isinstance(scenarios_data, list):
            result.errors.append("'scenarios' must be a list")
            return result
        
        for i, s in enumerate(scenarios_data):
            scenario, errors = ScenarioParser._parse_single(s, i)
            result.scenarios.append(scenario)
            result.errors.extend(errors)
        
        return result
    
    @staticmethod
    def _parse_single(data: dict, index: int) -> tuple[Scenario, list[str]]:
        """Parse a single scenario entry."""
        errors = []
        name = data.get("name", f"Scenario {index + 1}")
        
        if not data.get("input"):
            errors.append(f"Scenario '{name}': missing 'input' field")
        
        if not data.get("expected_behaviors"):
            errors.append(f"Scenario '{name}': missing 'expected_behaviors'")
        
        scenario = Scenario(
            name=name,
            input=data.get("input", ""),
            expected_behaviors=data.get("expected_behaviors", []),
            anti_behaviors=data.get("anti_behaviors", []),
            difficulty=data.get("difficulty", "beginner"),
            tags=data.get("tags", []),
        )
        
        return scenario, errors


class BehavioralEvaluator:
    """Evaluates behavioral test scenario coverage and quality."""
    
    def __init__(self):
        self._name = "behavioral"
        # Use default weight if not in DIMENSION_WEIGHTS
        try:
            from ..skills import DIMENSION_WEIGHTS
            self._weight = DIMENSION_WEIGHTS.get("behavioral", 0.10)
        except ImportError:
            self._weight = 0.10
        
        self._scenario_minimums = SCENARIO_MINIMUMS
    
    @property
    def name(self) -> str:
        """Dimension name."""
        return self._name
    
    @property
    def weight(self) -> float:
        """Weight in overall score."""
        return self._weight
    
    def evaluate(self, skill_path: Path) -> DimensionScore:
        """Evaluate behavioral scenario coverage for a skill.
        
        Args:
            skill_path: Path to the skill directory
            
        Returns:
            DimensionScore with findings, recommendations, and score
        """
        findings: list[str] = []
        recommendations: list[str] = []
        
        # Find scenarios.yaml
        scenarios_file = skill_path / "tests" / "scenarios.yaml"
        if not scenarios_file.exists():
            findings.append("No tests/scenarios.yaml file found")
            recommendations.append(
                "Add a tests/scenarios.yaml file with at least 2-3 behavioral test scenarios"
            )
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=findings,
                recommendations=recommendations,
            )
        
        # Parse scenarios
        try:
            yaml_content = scenarios_file.read_text()
        except Exception as e:
            findings.append(f"Could not read scenarios.yaml: {e}")
            return DimensionScore(
                name=self.name,
                score=0.0,
                weight=self.weight,
                findings=findings,
                recommendations=["Fix file read permissions or format"],
            )
        
        scenario_set = ScenarioParser.parse(yaml_content)
        
        if scenario_set.errors:
            for error in scenario_set.errors[:5]:  # Limit to first 5
                findings.append(error)
            recommendations.extend(
                f"Fix validation error: {e}" for e in scenario_set.errors[:3]
            )
            # Partial credit for valid scenarios
            if scenario_set.scenarios:
                partial = len(scenario_set.scenarios) * 10
                findings.append(f"Partial credit: {len(scenario_set.scenarios)} scenarios parsed")
            else:
                return DimensionScore(
                    name=self.name,
                    score=0.0,
                    weight=self.weight,
                    findings=findings,
                    recommendations=recommendations,
                )
        else:
            findings.append(f"Found {len(scenario_set.scenarios)} valid scenarios")
        
        # Score based on coverage
        scenario_count = len(scenario_set.scenarios)
        minimum = self._scenario_minimums.get("default", 2)
        
        # Base score from count
        if scenario_count >= minimum:
            base_score = 100.0
        elif scenario_count >= 1:
            base_score = (scenario_count / minimum) * 100.0
        else:
            base_score = 0.0
        
        # Bonus for difficulty variety
        difficulty_bonus = 0.0
        difficulties = set(s.difficulty for s in scenario_set.scenarios)
        if len(difficulties) >= 3:
            difficulty_bonus = 10.0
        elif len(difficulties) == 2:
            difficulty_bonus = 5.0
        
        # Bonus for anti-behavior coverage
        anti_behavior_count = sum(
            len(s.anti_behaviors) for s in scenario_set.scenarios
        )
        anti_bonus = min(10.0, anti_behavior_count * 2.0) if anti_behavior_count > 0 else 0.0
        
        # Bonus for tags usage
        tagged_count = sum(1 for s in scenario_set.scenarios if s.tags)
        tag_bonus = min(5.0, tagged_count * 2.5)
        
        total_score = min(100.0, base_score + difficulty_bonus + anti_bonus + tag_bonus)
        
        # Generate findings and recommendations
        findings.append(f"Scenario count: {scenario_count} (minimum: {minimum})")
        findings.append(f"Difficulty levels: {sorted(difficulties)}")
        findings.append(f"Anti-behavior checks: {anti_behavior_count}")
        
        if scenario_count < minimum:
            recommendations.append(
                f"Add {minimum - scenario_count} more scenarios to reach minimum coverage"
            )
        
        if not difficulties:
            recommendations.append("Add difficulty levels to categorize scenarios")
        
        if anti_behavior_count == 0:
            recommendations.append("Add anti-behaviors to specify what should NOT happen")
        
        if tagged_count == 0:
            recommendations.append("Add tags for scenario categorization and filtering")
        
        return DimensionScore(
            name=self.name,
            score=total_score,
            weight=self.weight,
            findings=findings,
            recommendations=recommendations,
        )
    
    def get_rubric_criteria(self) -> list[RubricCriterion]:
        """Get rubric criteria for LLM-as-Judge evaluation."""
        return [
            RubricCriterion(
                name="scenario_presence",
                description="Skill has tests/scenarios.yaml file",
                weight=0.25,
                levels=[
                    RubricLevel("excellent", 100, "4+ scenarios with varied difficulty"),
                    RubricLevel("good", 75, "2-3 scenarios covering basics"),
                    RubricLevel("minimal", 50, "1 scenario present"),
                    RubricLevel("missing", 0, "No scenarios.yaml file"),
                ],
            ),
            RubricCriterion(
                name="scenario_quality",
                description="Quality of scenario definitions",
                weight=0.35,
                levels=[
                    RubricLevel("excellent", 100, "Clear inputs, behaviors, and anti-behaviors"),
                    RubricLevel("good", 75, "Clear inputs and expected behaviors"),
                    RubricLevel("fair", 50, "Basic scenarios with minimal detail"),
                    RubricLevel("poor", 25, "Vague or incomplete scenarios"),
                ],
            ),
            RubricCriterion(
                name="behavioral_coverage",
                description="Coverage of different behavioral scenarios",
                weight=0.25,
                levels=[
                    RubricLevel("comprehensive", 100, "Beginner, intermediate, and advanced scenarios"),
                    RubricLevel("moderate", 75, "Multiple difficulty levels"),
                    RubricLevel("limited", 50, "Single difficulty level"),
                    RubricLevel("minimal", 25, "Only basic scenarios"),
                ],
            ),
            RubricCriterion(
                name="anti_patterns",
                description="Documentation of anti-behaviors and edge cases",
                weight=0.15,
                levels=[
                    RubricLevel("complete", 100, "Multiple anti-behaviors documented"),
                    RubricLevel("present", 75, "At least one anti-behavior documented"),
                    RubricLevel("minimal", 50, "Anti-behaviors mentioned but not detailed"),
                    RubricLevel("missing", 0, "No anti-behavior documentation"),
                ],
            ),
        ]


# Backward compatibility function
def evaluate_behavioral(skill_path: str | Path) -> DimensionScore:
    """Evaluate behavioral scenario coverage for a skill.
    
    Args:
        skill_path: Path to the skill directory
        
    Returns:
        DimensionScore with findings and recommendations
    """
    evaluator = BehavioralEvaluator()
    return evaluator.evaluate(Path(skill_path))
