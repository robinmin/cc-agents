"""Default scoring weights for rd2 skills."""

from dataclasses import dataclass


@dataclass
class DimensionWeights:
    """Weights for different quality dimensions."""
    name: str
    weight: float
    description: str


# Default weights for skills
SKILL_WEIGHTS = [
    DimensionWeights("behavioral", 0.10, "Workflows and behavioral scenarios"),
    DimensionWeights("behavioral_readiness", 0.08, "Examples, anti-patterns, error handling"),
    DimensionWeights("best_practices", 0.04, "Naming, documentation, TODOs"),
    DimensionWeights("code_quality", 0.07, "Error handling, type hints, main guard"),
    DimensionWeights("content", 0.17, "Content length, core sections, workflow"),
    DimensionWeights("efficiency", 0.05, "Token efficiency, redundancy, conciseness"),
    DimensionWeights("frontmatter", 0.00, "Required fields, naming convention"),
    DimensionWeights("instruction_clarity", 0.11, "Imperative form, actionability"),
    DimensionWeights("security", 0.14, "Code security, awareness"),
    DimensionWeights("structure", 0.00, "Progressive disclosure, heading hierarchy"),
    DimensionWeights("trigger_design", 0.14, "Trigger phrases, third-person form"),
    DimensionWeights("value_add", 0.10, "Artifacts, specificity, custom workflows"),
]

# Agent-specific weights (higher weight on competencies)
AGENT_WEIGHTS = [
    DimensionWeights("behavioral", 0.10, "Workflows and behavioral scenarios"),
    DimensionWeights("behavioral_readiness", 0.08, "Examples, anti-patterns, error handling"),
    DimensionWeights("best_practices", 0.04, "Naming, documentation, TODOs"),
    DimensionWeights("code_quality", 0.07, "Error handling, type hints, main guard"),
    DimensionWeights("content", 0.17, "Content length, core sections, workflow"),
    DimensionWeights("efficiency", 0.05, "Token efficiency, redundancy, conciseness"),
    DimensionWeights("frontmatter", 0.00, "Required fields, naming convention"),
    DimensionWeights("instruction_clarity", 0.11, "Imperative form, actionability"),
    DimensionWeights("security", 0.14, "Code security, awareness"),
    DimensionWeights("structure", 0.00, "Progressive disclosure, heading hierarchy"),
    DimensionWeights("trigger_design", 0.14, "Trigger phrases, third-person form"),
    DimensionWeights("value_add", 0.10, "Artifacts, specificity, custom workflows"),
]


def get_weights(skill_type: str) -> list[DimensionWeights]:
    """Get weights for a skill type."""
    if skill_type == "agent":
        return AGENT_WEIGHTS
    return SKILL_WEIGHTS


def calculate_weighted_score(dimension_scores: dict[str, float], weights: list[DimensionWeights]) -> float:
    """Calculate weighted score from dimension scores."""
    total = 0.0
    for dw in weights:
        score = dimension_scores.get(dw.name, 0.0)
        total += score * dw.weight
    return total
