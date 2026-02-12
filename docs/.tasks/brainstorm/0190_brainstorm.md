# Brainstorm: Enhance Agent Skills (cc-skills)

**Task:** 0190 - Enhance Agent Skills cc-skills
**Date:** 2026-02-11
**Status:** Research Complete

---

## Overview

The current `rd2:cc-skills` evaluation system uses 7 dimensions with fixed weights and rule-based scoring (AST analysis, heuristics). After deep research into SOTA evaluation frameworks, industry best practices, and the referenced articles, three approaches emerge for enhancement.

---

## Current State Analysis

### What Works Well
- Plugin-based evaluator architecture (DimensionEvaluator protocol, HookManager)
- AST-based security analysis (no false positives from documentation)
- Progressive disclosure model (metadata -> SKILL.md -> references)
- Evaluation-first development methodology

### Identified Gaps
1. **Narrow evaluation scope** - 7 dimensions miss behavioral effectiveness, triggering accuracy, and runtime performance
2. **Simplistic scoring** - Rule-based deductions (e.g., -2.0 for missing section) are arbitrary; no calibration against real-world outcomes
3. **No industry standards** - Current dimensions don't align with SOTA frameworks (Anthropic's eval methodology, CLASSic framework, 4-pillar assessment)
4. **No model capability awareness** - Evaluation doesn't consider what Claude already knows vs. what the skill adds
5. **No behavioral testing** - Only static analysis; no evaluation of whether the skill actually improves agent performance

---

## Approach 1: Multi-Layer Evaluation Framework (Recommended)

### Concept
Extend current 7-dimension static analysis with a **behavioral evaluation layer** inspired by Anthropic's eval methodology. Add new dimensions for "skill effectiveness" that go beyond structural quality.

### New Evaluation Architecture

```
Layer 1: Static Analysis (existing, enhanced)
  - Frontmatter, Content, Security, Structure, Efficiency, Best Practices, Code Quality

Layer 2: Behavioral Analysis (NEW)
  - Trigger Accuracy: Does the skill fire on correct inputs?
  - Coverage: Does it handle the full problem space?
  - Instruction Clarity: Can the model follow the skill unambiguously?
  - Value-Add: Does the skill teach something the model doesn't already know?

Layer 3: Outcome Analysis (NEW, optional)
  - Task completion rate with vs. without skill
  - Error recovery effectiveness
  - Token efficiency in practice
```

### Revised Dimensions (10 total)

| Dimension | Weight | What It Measures | Source |
|-----------|--------|------------------|--------|
| Frontmatter | 5% | YAML validity, CSO optimization | Existing |
| Content Quality | 15% | Sections, examples, workflows | Existing (refined) |
| Security | 15% | AST dangerous patterns | Existing |
| Structure | 10% | Directory org, progressive disclosure | Existing |
| Efficiency | 5% | Token count, file sizes | Existing |
| Code Quality | 5% | Error handling, type hints | Existing |
| **Trigger Design** | 15% | CSO optimization, keyword coverage, false positive/negative analysis | NEW |
| **Instruction Clarity** | 10% | Ambiguity detection, imperative form, actionable guidance | NEW |
| **Value-Add Assessment** | 10% | Does skill add knowledge Claude lacks? Overlap with base capabilities | NEW |
| **Behavioral Readiness** | 10% | Test case coverage, scenario diversity, edge case handling | NEW |

### Scoring Methodology

Replace arbitrary point deductions with **calibrated rubrics**:

```python
# Current (arbitrary):
score -= 2.0  # Missing section

# Proposed (rubric-based):
rubric = {
    "has_overview": {"present": 10, "absent": 0, "partial": 5},
    "has_examples": {"3+": 10, "1-2": 7, "0": 2},
    "trigger_specificity": {"phrases_3+": 10, "phrases_1-2": 6, "vague": 2},
}
```

### Implementation Steps
1. Add 4 new evaluator plugins in `scripts/evaluators/`
2. Refactor scoring from point-deductions to rubric-based
3. Add calibration dataset (10-20 skills with known quality grades)
4. Update SKILL.md with new dimensions
5. Update `scanner-criteria.md` reference

### Trade-offs
- **Pro**: Most comprehensive, aligns with SOTA, backward-compatible (enhances existing architecture)
- **Pro**: Plugin architecture already supports adding new evaluators
- **Con**: Behavioral analysis requires test scenarios (more authoring effort)
- **Con**: Value-Add assessment is harder to automate

### Estimated Effort
- 4 new evaluator plugins: ~2 days
- Rubric calibration: ~1 day
- Documentation updates: ~1 day
- **Total: ~4 days**

---

## Approach 2: Eval-Driven Quality with LLM-as-Judge

### Concept
Complement static analysis with **LLM-as-Judge** evaluation for subjective dimensions. Based on Anthropic's eval framework: use deterministic graders for objective criteria, LLM-based graders for nuanced assessment.

### Architecture

```
Deterministic Graders (existing evaluators)
  - Frontmatter validation, AST security, structure checks

LLM-as-Judge Graders (NEW)
  - Instruction Clarity: "Rate 1-5: Can an AI agent follow these instructions unambiguously?"
  - Value-Add: "What percentage of this content does Claude already know?"
  - Trigger Quality: "Given these 10 user queries, which should trigger this skill?"
  - Overall Quality: Multi-judge consensus with structured rubric
```

### Rubric-Based Scoring Protocol

Each LLM judge receives a structured rubric:

```yaml
dimension: instruction_clarity
rubric:
  5: "Every instruction is unambiguous, uses imperative form, references specific tools/files"
  4: "Instructions are clear with minor ambiguity in edge cases"
  3: "Mix of clear and vague instructions"
  2: "Multiple ambiguous instructions that could be interpreted differently"
  1: "Instructions are vague, generic, or contradictory"
grading_notes:
  - "Grade each sub-criterion independently before assigning overall score"
  - "If insufficient information, respond 'Unknown' rather than guessing"
```

### Key Innovations
- **pass@k metrics**: Run evaluation k times, report consistency (addresses non-determinism)
- **Positive + Negative testing**: Test both "should trigger" and "should NOT trigger" scenarios
- **Calibration against human judgment**: Periodically validate LLM scores against expert review

### Implementation Steps
1. Create `evaluators/llm_judge.py` base class
2. Implement 3-4 LLM-judged dimensions
3. Add rubric files in `references/rubrics/`
4. Create calibration suite (manual expert grades for 15 skills)
5. Add `--deep` flag to cmd_evaluate for LLM-based evaluation

### Trade-offs
- **Pro**: Can evaluate subjective dimensions (clarity, value-add) that static analysis can't
- **Pro**: Aligns with Anthropic's recommended grading approaches
- **Pro**: Calibratable against human judgment
- **Con**: Requires API calls ($0.05-0.10 per evaluation), slower
- **Con**: Non-deterministic results (mitigated by pass@k)
- **Con**: Adds external dependency (Claude API)

### Estimated Effort
- LLM judge infrastructure: ~2 days
- Rubric design + calibration: ~2 days
- Integration with existing evaluators: ~1 day
- **Total: ~5 days**

---

## Approach 3: Behavioral Testing Framework (Test-Driven Skills)

### Concept
Based on the "evaluation-first development" methodology already in `cc-skills`, formalize it into a **testable framework** where every skill has companion test scenarios that measure actual agent performance improvement.

### Architecture

```
skill-name/
├── SKILL.md
├── references/
├── scripts/
└── tests/                    # NEW
    ├── scenarios.yaml        # Test scenarios
    ├── baseline.yaml         # Expected baseline (without skill)
    └── expected.yaml         # Expected improvement (with skill)
```

### Scenario Format

```yaml
# tests/scenarios.yaml
scenarios:
  - name: "Basic PDF rotation"
    input: "Rotate page 3 of document.pdf 90 degrees clockwise"
    expected_behaviors:
      - "Uses rotate_pdf.py script"
      - "Specifies page number 3"
      - "Specifies 90 degree rotation"
    anti_behaviors:
      - "Tries to install new packages"
      - "Writes custom rotation code"
    difficulty: easy

  - name: "Multi-page extraction"
    input: "Extract pages 5-10 from report.pdf as a new file"
    expected_behaviors:
      - "Uses extract_pages.py or equivalent"
      - "Preserves page order"
    difficulty: medium
```

### Scoring
- **Task completion rate**: pass@k across scenarios
- **Behavior adherence**: Does the skill guide correct tool usage?
- **Anti-behavior avoidance**: Does it prevent known failure modes?
- **Efficiency**: Steps to completion, token usage

### Implementation Steps
1. Define scenario YAML schema
2. Create `evaluators/behavioral.py` that parses and scores scenarios
3. Add `skills.py test` command for running behavioral tests
4. Create scenario templates for common skill types
5. Add scoring integration with existing evaluation pipeline

### Trade-offs
- **Pro**: Most rigorous, catches "skills that look good but don't help"
- **Pro**: Creates regression suite for skill quality
- **Pro**: Directly addresses the "vibes-based evaluation" problem
- **Con**: Highest authoring effort (need to write scenarios for each skill)
- **Con**: Running scenarios requires agent execution (expensive, slow)
- **Con**: Most complex to implement

### Estimated Effort
- Schema design + parser: ~2 days
- Behavioral evaluator: ~2 days
- Test runner infrastructure: ~3 days
- Scenario templates: ~1 day
- **Total: ~8 days**

---

## Recommendation

**Start with Approach 1 (Multi-Layer Evaluation Framework)**, then incrementally add elements from Approach 2 (LLM-as-Judge for subjective dimensions) and Approach 3 (scenario format for behavioral readiness).

### Phased Rollout

| Phase | What | From | Effort |
|-------|------|------|--------|
| Phase 1 | Add 4 new evaluator plugins + rubric-based scoring | Approach 1 | ~3 days |
| Phase 2 | Add `--deep` flag with LLM-as-Judge for 2 dimensions | Approach 2 | ~2 days |
| Phase 3 | Add `tests/scenarios.yaml` format + behavioral readiness scoring | Approach 3 | ~3 days |
| **Total** | | | **~8 days** |

### Priority Quick Wins
1. **Trigger Design evaluator** - Immediately catches poorly discoverable skills
2. **Rubric-based scoring** - Replaces arbitrary deductions, more transparent
3. **Instruction Clarity evaluator** - Catches ambiguous skills before deployment

---

## Sources

- [How to Evaluate AI Agent Skills Without Relying on Vibes](https://pub.towardsai.net/how-to-evaluate-ai-agent-skills-without-relying-on-vibes-9a5764ad18c4) - JP Caparas, Towards AI, Jan 2026
- [Designing Agent Skills That Actually Work](https://kotrotsos.medium.com/designing-agent-skills-that-actually-work-f9ff005c891c) - Marco Kotrotsos, Dec 2025
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) - Anthropic Engineering, Jan 2026
- [Beyond Task Completion: An Assessment Framework for Evaluating Agentic AI Systems](https://arxiv.org/html/2512.12791v1) - ArXiv, Dec 2025
- [Agent Skills 101: Why Prompts Don't Scale](https://kotrotsos.medium.com/agent-skills-101-why-prompts-dont-scale-7dadb849bf9d) - Marco Kotrotsos, Dec 2025
- [AI Agent Evaluation: The Definitive Guide](https://www.confident-ai.com/blog/definitive-ai-agent-evaluation-guide) - Confident AI
- [Evaluating AI Agents - DeepLearning.AI](https://www.deeplearning.ai/short-courses/evaluating-ai-agents/) - DeepLearning.AI Course
