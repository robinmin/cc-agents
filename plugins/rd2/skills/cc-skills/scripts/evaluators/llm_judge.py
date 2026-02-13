"""LLM-as-Judge evaluation module.

Provides LLM-based grading for subjective dimensions with structured rubrics,
pass@k metrics, and cost reporting. Used with --deep flag for deep evaluation.

Requirements:
- Structured rubrics with 5-level scales and explicit criteria per level
- "Unknown" escape option per Anthropic's recommendation
- Support pass@k metrics for consistency measurement
- Graceful fallback when API unavailable
- Cost reporting (token usage and estimated cost)
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

# Handle both package import and direct execution
try:
    from ..skills import get_file_content
except ImportError:
    from skills import get_file_content  # type: ignore[no-redef, import-not-found]

# Import rubric components
try:
    from .base import DimensionScore, RubricLevel, RubricCriterion
except ImportError:
    from base import DimensionScore, RubricLevel, RubricCriterion  # type: ignore[no-redef, import-not-found]


# =============================================================================
# LLM CONFIGURATION
# =============================================================================

# Default model for LLM evaluation (can be overridden via environment)
DEFAULT_MODEL = os.environ.get("LLM_EVAL_MODEL", "claude-sonnet-4-20250514")

# Cost per 1M tokens (approximate for Claude models)
CLAUDE_COSTS = {
    "claude-opus-4-20250514": {"input": 30.00, "output": 150.00},  # $30/$150 per 1M
    "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},  # $3/$15 per 1M
    "claude-haiku-4-20250514": {"input": 0.25, "output": 1.25},  # $0.25/$1.25 per 1M
}


@dataclass
class CostReport:
    """Token usage and cost report for LLM evaluation."""
    model: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    passes: int = 1
    consistency_score: float = 0.0  # For pass@k

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "model": self.model,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.input_tokens + self.output_tokens,
            "estimated_cost_usd": round(self.estimated_cost_usd, 4),
            "passes": self.passes,
            "consistency_score": round(self.consistency_score, 2),
        }


@dataclass
class LLMEvaluationResult:
    """Result of LLM-based evaluation."""
    dimension: str
    score: float  # 0-100 scale
    level_name: str  # e.g., "excellent", "good", "fair", "poor", "unknown"
    reasoning: str  # LLM's explanation for the score
    rubric_criterion: str  # Which criterion was scored
    cost_report: CostReport = field(default_factory=CostReport)
    is_fallback: bool = False  # True if static analysis fallback used
    error_message: str = ""  # If API failed


# =============================================================================
# DEFAULT RUBRICS FOR LLM EVALUATION
# =============================================================================

# Instruction Clarity Rubric (5 levels + Unknown)
INSTRUCTION_CLARITY_RUBRIC = RubricCriterion(
    name="instruction_clarity",
    description="How clear, specific, and unambiguous the skill instructions are",
    weight=1.0,
    levels=[
        RubricLevel(
            "excellent",
            100,
            "Instructions are crystal clear with specific examples, exact triggers, "
            "and unambiguous guidance. No interpretation needed."
        ),
        RubricLevel(
            "good",
            75,
            "Instructions are mostly clear with good detail. Minor vagueness in "
            "some areas but overall understandable."
        ),
        RubricLevel(
            "fair",
            50,
            "Instructions are somewhat unclear in places. Some interpretation "
            "required to understand expected behavior."
        ),
        RubricLevel(
            "poor",
            25,
            "Instructions are confusing or incomplete. Multiple interpretations "
            "possible; guidance is vague or missing key details."
        ),
        RubricLevel(
            "missing",
            0,
            "Instructions are absent or completely unclear. Cannot determine "
            "what the skill does or how to use it."
        ),
        RubricLevel(
            "unknown",
            50,
            "Cannot determine due to missing context or skill content. "
            "Grading skipped - requires manual review."
        ),
    ],
)

# Value Add Rubric (5 levels + Unknown)
VALUE_ADD_RUBRIC = RubricCriterion(
    name="value_add",
    description="How much beyond base capability the skill provides",
    weight=1.0,
    levels=[
        RubricLevel(
            "exceptional",
            100,
            "Skill provides unique, hard-to-build capabilities that would require "
            "significant expertise to replicate. Substantially extends Claude's base abilities."
        ),
        RubricLevel(
            "significant",
            75,
            "Skill adds notable value beyond Claude's defaults. Provides useful "
            "abstractions or workflows that save substantial effort."
        ),
        RubricLevel(
            "moderate",
            50,
            "Skill provides some value but overlaps with Claude's existing "
            "capabilities. Offers convenience or organization but not unique power."
        ),
        RubricLevel(
            "minimal",
            25,
            "Skill offers minimal value beyond what Claude already does well. "
            "Mostly reorganizes basic functionality."
        ),
        RubricLevel(
            "none",
            0,
            "Skill provides no apparent value. Content could be replaced by "
            "standard Claude interactions without loss."
        ),
        RubricLevel(
            "unknown",
            50,
            "Cannot assess value due to missing context or skill content. "
            "Grading skipped - requires manual review."
        ),
    ],
)

# Collection of rubrics for LLM evaluation
LLM_RUBRICS: dict[str, RubricCriterion] = {
    "instruction_clarity": INSTRUCTION_CLARITY_RUBRIC,
    "value_add": VALUE_ADD_RUBRIC,
}


# =============================================================================
# LLM CLIENT ABSTRACTION
# =============================================================================

class LLMClient:
    """Abstract interface for LLM API calls."""

    def __init__(self, model: str = DEFAULT_MODEL):
        self.model = model
        self._client: Any = None

    def is_available(self) -> bool:
        """Check if LLM API is available."""
        raise NotImplementedError

    def count_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        # Rough estimate: ~4 characters per token
        return len(text) // 4

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost in USD."""
        costs = CLAUDE_COSTS.get(self.model, {"input": 3.00, "output": 15.00})
        return (input_tokens / 1_000_000) * costs["input"] + (
            output_tokens / 1_000_000
        ) * costs["output"]

    def call(self, prompt: str, max_tokens: int = 1000) -> tuple[str, int, int]:
        """Call LLM API and return (response, input_tokens, output_tokens)."""
        raise NotImplementedError


class AnthropicClient(LLMClient):
    """Anthropic API client for LLM evaluation."""

    def is_available(self) -> bool:
        """Check if Anthropic API is configured."""
        return bool(os.environ.get("ANTHROPIC_API_KEY"))

    def call(self, prompt: str, max_tokens: int = 1000) -> tuple[str, int, int]:
        """Call Anthropic API."""
        try:
            import anthropic
        except ImportError:
            raise ImportError(
                "Anthropic SDK not installed. Install with: pip install anthropic"
            )

        client = anthropic.Anthropic()
        input_tokens = self.count_tokens(prompt)

        response = client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        output_tokens = response.usage.output_tokens
        return response.content[0].text, input_tokens, output_tokens


class OpenAIClient(LLMClient):
    """OpenAI API client for LLM evaluation."""

    def is_available(self) -> bool:
        """Check if OpenAI API is configured."""
        return bool(os.environ.get("OPENAI_API_KEY"))

    def call(self, prompt: str, max_tokens: int = 1000) -> tuple[str, int, int]:
        """Call OpenAI API."""
        try:
            from openai import OpenAI
        except ImportError:
            raise ImportError(
                "OpenAI SDK not installed. Install with: pip install openai"
            )

        client = OpenAI()
        input_tokens = self.count_tokens(prompt)

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )

        output_tokens = response.usage.completion_tokens
        return response.choices[0].message.content, input_tokens, output_tokens


def get_llm_client(model: str = DEFAULT_MODEL) -> LLMClient | None:
    """Get available LLM client."""
    # Try Anthropic first
    client = AnthropicClient(model)
    if client.is_available():
        return client

    # Try OpenAI as fallback
    client = OpenAIClient(model)
    if client.is_available():
        return client

    return None


# =============================================================================
# PROMPT BUILDERS
# =============================================================================

def build_evaluation_prompt(
    skill_name: str,
    skill_content: str,
    rubric: RubricCriterion,
    dimension: str,
) -> str:
    """Build evaluation prompt for LLM."""
    levels_text = "\n".join(
        f'- Level "{level.name}": {level.description} (score: {level.score})'
        for level in rubric.levels
    )

    return f"""You are evaluating a Claude Code skill for quality assessment.

## Skill Name: {skill_name}

## Skill Content:
```
{skill_content[:8000]}  # Truncated for token limits
```

## Rubric: {rubric.name}
{rubric.description}

{levels_text}

## Task
Evaluate this skill according to the rubric above. Provide your assessment in JSON format:
{{
    "level_name": "exact level name from rubric",
    "reasoning": "brief explanation of why this level fits",
    "confidence": 0.0-1.0
}}

Respond ONLY with the JSON object, no additional text."""


# =============================================================================
# LLM JUDGE EVALUATOR
# =============================================================================

class LLMJudgeEvaluator:
    """LLM-based evaluator for subjective dimensions.

    Usage:
        evaluator = LLMJudgeEvaluator(model="claude-sonnet-4-20250514")
        result = evaluator.evaluate_dimension(
            skill_path=Path("./skills/my-skill"),
            dimension="instruction_clarity",
            rubric=INSTRUCTION_CLARITY_RUBRIC,
        )
    """

    def __init__(
        self,
        model: str = DEFAULT_MODEL,
        pass_k: int = 1,
        verbose: bool = False,
    ):
        """Initialize LLM judge evaluator.

        Args:
            model: LLM model to use for evaluation
            pass_k: Number of passes for consistency measurement (pass@k)
            verbose: Print progress messages
        """
        self.model = model
        self.pass_k = pass_k
        self.verbose = verbose
        self.client = get_llm_client(model)

    def evaluate_dimension(
        self,
        skill_path: Path,
        dimension: str,
        rubric: RubricCriterion,
        skill_content: str | None = None,
    ) -> LLMEvaluationResult:
        """Evaluate a single dimension using LLM grading.

        Args:
            skill_path: Path to skill directory
            dimension: Dimension name (e.g., "instruction_clarity")
            rubric: RubricCriterion to evaluate against
            skill_content: Optional pre-loaded skill content

        Returns:
            LLMEvaluationResult with score, reasoning, and cost report
        """
        # Load skill content
        skill_md = skill_path / "SKILL.md"
        if skill_content is None:
            if not skill_md.exists():
                return LLMEvaluationResult(
                    dimension=dimension,
                    score=0.0,
                    level_name="missing",
                    reasoning="SKILL.md not found",
                    rubric_criterion=rubric.name,
                    error_message="SKILL.md not found",
                )
            skill_content = skill_md.read_text()

        skill_name = skill_path.name

        # Build prompt
        prompt = build_evaluation_prompt(skill_name, skill_content, rubric, dimension)

        # Try LLM evaluation
        if self.client and self.client.is_available():
            return self._evaluate_with_llm(
                skill_path, dimension, rubric, prompt, skill_content
            )

        # Fallback to static analysis
        return self._evaluate_fallback(skill_path, dimension, rubric, skill_content)

    def _evaluate_with_llm(
        self,
        skill_path: Path,
        dimension: str,
        rubric: RubricCriterion,
        prompt: str,
        skill_content: str,
    ) -> LLMEvaluationResult:
        """Evaluate using LLM API with pass@k support."""
        total_cost = 0.0
        total_input_tokens = 0
        total_output_tokens = 0
        scores: list[float] = []
        level_names: list[str] = []
        reasoning: str = ""

        for pass_idx in range(self.pass_k):
            if self.verbose:
                print(f"  Pass {pass_idx + 1}/{self.pass_k}...", file=sys.stderr)

            try:
                response, input_tokens, output_tokens = self.client.call(
                    prompt, max_tokens=500
                )

                total_input_tokens += input_tokens
                total_output_tokens += output_tokens

                # Parse response
                result = self._parse_response(response, rubric)

                if result is None:
                    # Parsing failed, use fallback
                    if self.verbose:
                        print(f"  Warning: Failed to parse LLM response", file=sys.stderr)
                    continue

                level_names.append(result["level_name"])
                scores.append(result["score"])
                if pass_idx == 0:
                    reasoning = result["reasoning"]

            except Exception as e:
                if self.verbose:
                    print(f"  Warning: LLM call failed: {e}", file=sys.stderr)
                continue

        # Calculate consistency (for pass@k)
        consistency = 0.0
        if len(scores) > 1:
            mean_score = sum(scores) / len(scores)
            variance = sum((s - mean_score) ** 2 for s in scores) / len(scores)
            consistency = max(0.0, 100.0 - variance)

        # Calculate cost
        estimated_cost = self.client.estimate_cost(
            total_input_tokens, total_output_tokens
        )

        # Determine final result
        if scores:
            # Use average score
            avg_score = sum(scores) / len(scores)
            final_level = max(set(level_names), key=level_names.count)
        else:
            # All passes failed, use fallback
            return self._evaluate_fallback(skill_path, dimension, rubric, skill_content)

        return LLMEvaluationResult(
            dimension=dimension,
            score=avg_score,
            level_name=final_level,
            reasoning=reasoning,
            rubric_criterion=rubric.name,
            cost_report=CostReport(
                model=self.model,
                input_tokens=total_input_tokens,
                output_tokens=total_output_tokens,
                estimated_cost_usd=estimated_cost,
                passes=self.pass_k,
                consistency_score=consistency,
            ),
        )

    def _evaluate_fallback(
        self,
        skill_path: Path,
        dimension: str,
        rubric: RubricCriterion,
        skill_content: str,
    ) -> LLMEvaluationResult:
        """Static fallback when LLM is unavailable."""
        content_lower = skill_content.lower()

        if dimension == "instruction_clarity":
            # Proxy: Check for specific, actionable content
            has_examples = "example:" in content_lower or "```" in content_lower
            has_triggers = "trigger" in content_lower
            has_steps = any(kw in content_lower for kw in ["step", "when", "how"])

            if has_examples and has_triggers and has_steps:
                level = "good"
                score = 75.0
                reasoning = "Static analysis: Contains examples, triggers, and step guidance"
            elif has_examples or has_triggers:
                level = "fair"
                score = 50.0
                reasoning = "Static analysis: Some clarity indicators present"
            else:
                level = "poor"
                score = 25.0
                reasoning = "Static analysis: Limited clarity indicators"

        elif dimension == "value_add":
            # Proxy: Check for unique features
            has_dependencies = "requires:" in content_lower
            has_artifacts = "artifacts:" in content_lower
            has_custom_workflows = "workflow" in content_lower

            if has_dependencies and has_artifacts and has_custom_workflows:
                level = "significant"
                score = 75.0
                reasoning = "Static analysis: Shows unique dependencies, artifacts, and workflows"
            elif any([has_dependencies, has_artifacts]):
                level = "moderate"
                score = 50.0
                reasoning = "Static analysis: Some value indicators present"
            else:
                level = "minimal"
                score = 25.0
                reasoning = "Static analysis: Limited value indicators"

        else:
            level = "unknown"
            score = 50.0
            reasoning = f"Unknown dimension '{dimension}' - requires manual review"

        return LLMEvaluationResult(
            dimension=dimension,
            score=score,
            level_name=level,
            reasoning=reasoning,
            rubric_criterion=rubric.name,
            is_fallback=True,
        )

    def _parse_response(
        self, response: str, rubric: RubricCriterion
    ) -> dict[str, Any] | None:
        """Parse LLM response into structured result."""
        try:
            # Try to extract JSON
            response = response.strip()

            # Handle markdown code blocks
            if response.startswith("```"):
                lines = response.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response = "\n".join(lines)

            data = json.loads(response)

            # Validate required fields
            if "level_name" not in data:
                return None

            # Map level name to score
            level_name = data["level_name"]
            score = 50.0  # Default for unknown
            for level in rubric.levels:
                if level.name == level_name:
                    score = level.score
                    break

            return {
                "level_name": level_name,
                "score": score,
                "reasoning": data.get("reasoning", ""),
                "confidence": data.get("confidence", 0.5),
            }

        except (json.JSONDecodeError, KeyError):
            return None


def evaluate_with_llm(
    skill_path: Path,
    dimension: str,
    model: str = DEFAULT_MODEL,
    pass_k: int = 1,
    verbose: bool = False,
) -> LLMEvaluationResult:
    """Evaluate a skill dimension using LLM grading (convenience function)."""
    if dimension not in LLM_RUBRICS:
        raise ValueError(f"Unknown dimension: {dimension}. Available: {list(LLM_RUBRICS.keys())}")

    rubric = LLM_RUBRICS[dimension]
    evaluator = LLMJudgeEvaluator(model=model, pass_k=pass_k, verbose=verbose)

    return evaluator.evaluate_dimension(skill_path, dimension, rubric)


# For stderr access in the module
import sys
