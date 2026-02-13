---
name: enhance Agent Skills cc-skills
description: Enhance rd2:cc-skills evaluation framework with new dimensions, rubric-based scoring, LLM-as-Judge, and behavioral testing
status: Done
created_at: 2026-02-11 10:33:01
updated_at: 2026-02-12 20:36:19
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0190. enhance Agent Skills cc-skills

### Background

`rd2:cc-skills` is the foundation for my AI tool chain, enabling rapid creating, evaluation and refining of skills. But after the last update, I realized that the tool was not as effective as I had hoped. I decided to enhance it based on some deep research and analysis of the current state of AI agent skills. The key issues I identified were(but not limited to):

- The evaluation aspects twoo narrow;
- The evaluation scoring process are too simplistic and excessively subjective and arbitrary.
- Lack of a industry best practices and SOAT standards.
- Lack a comprehensive understanding of the model's capabilities and limitations.

I also find two references that may help me enhance the tool(Or helplessly, need to evaluate them):

- [How to Evaluate AI Agent Skills Without Relying on Vibes](https://pub.towardsai.net/how-to-evaluate-ai-agent-skills-without-relying-on-vibes-9a5764ad18c4)
- [Designing Agent Skills That Actually Work](https://kotrotsos.medium.com/designing-agent-skills-that-actually-work-f9ff005c891c)

### Requirements


## Requirements (Updated 2026-02-12)

- [x] Expand evaluation from 7 to 10+ dimensions (add Trigger Design, Instruction Clarity, Value-Add, Behavioral Readiness)
- [x] Replace arbitrary point-deduction scoring with calibrated rubric-based scoring
- [x] Add LLM-as-Judge capability for subjective dimensions (--deep flag)
- [x] Add behavioral test scenario format (tests/scenarios.yaml)
- [x] Update all documentation (SKILL.md, scanner-criteria.md, evaluation.md)
- [x] All existing tests pass with updated scoring (200 tests passing)

**NEW (from Official Guide Analysis - 2026-02-12):**
- [x] Add trigger testing to behavioral readiness evaluator
- [x] Add performance comparison to behavioral readiness evaluator
- [x] Enhance scenario schema with trigger_tests and performance_tests sections
- [x] Create follow-up tasks for documentation gaps (0200-0203)

## Plan (Updated 2026-02-12)

**Phase 1: New Evaluators + Rubric Scoring** -- COMPLETE
- [x] 0191: Add Trigger Design evaluator plugin (15% weight)
- [x] 0192: Add Instruction Clarity evaluator plugin (10% weight)
- [x] 0193: Add Value-Add Assessment evaluator plugin (10% weight)
- [x] 0194: Add Behavioral Readiness evaluator plugin (5% weight)
- [x] 0195: Refactor scoring from point-deductions to rubric-based

**Phase 2: LLM-as-Judge** -- COMPLETE
- [x] 0196: Add LLM-as-Judge evaluation with --deep flag

**Phase 3: Behavioral Testing** -- COMPLETE
- [x] 0197: Add behavioral test scenario format and runner

**Final: Documentation** -- COMPLETE
- [x] 0198: Update cc-skills SKILL.md and references for new dimensions

**Follow-up Tasks (from Official Guide Analysis):**
- [ ] 0200: Add skill patterns reference (5 official patterns)
- [ ] 0201: Add troubleshooting reference
- [ ] 0202: Add MCP enhancement guidance
- [ ] 0203: Add distribution guidance

### Q&A

Q: Should we add pattern-specific evaluation criteria?
A: Not in this task. Consider for future enhancement if patterns prove useful.

Q: Should troubleshooting be in SKILL.md or references/?
A: Brief workflow in SKILL.md, detailed guide in references/troubleshooting.md

### Design


## Design

### Architecture Overview

The cc-skills evaluation framework has been enhanced with:

1. **10 Evaluation Dimensions** (up from 7):
   - Core: frontmatter (5%), structure (10%)
   - Content: content (15%), trigger_design (15%), instruction_clarity (10%), value_add (10%), behavioral_readiness (5%)
   - Technical: security (15%), code_quality (5%)
   - Process: efficiency (5%), best_practices (5%)

2. **Rubric-Based Scoring**:
   - Each dimension uses `RubricScorer` from `base.py`
   - Criteria have 5 levels: Excellent/Good/Fair/Poor/Missing (100/75/50/25/0)
   - Weights normalized to sum to 1.0

3. **LLM-as-Judge** (via `--deep` flag):
   - `llm_judge.py` evaluates subjective dimensions
   - Supports instruction_clarity and value_add dimensions
   - Includes cost reporting and graceful fallback

4. **Behavioral Test Scenarios**:
   - YAML format in `tests/scenarios.yaml`
   - Supports trigger_tests (should_trigger/should_not_trigger)
   - Supports performance_tests (baseline vs with-skill comparison)

### Key Files

| File | Purpose |
|------|---------|
| `evaluators/base.py` | RubricScorer, RubricCriterion, RubricLevel classes |
| `evaluators/trigger_design.py` | Trigger phrase and CSO coverage evaluation |
| `evaluators/instruction_clarity.py` | Ambiguity, imperative form, actionability |
| `evaluators/value_add.py` | Artifacts, specificity, custom workflows |
| `evaluators/behavioral_readiness.py` | Examples, anti-patterns, error handling, tests |
| `evaluators/llm_judge.py` | LLM-based evaluation with --deep flag |
| `skills.py` | Main CLI, dimension aggregation |
| `tests/` | 200+ unit tests for all evaluators |

### Solution


Approach: Implement 4 new evaluator dimensions (Trigger Design, Instruction Clarity, Value-Add Assessment, Behavioral Readiness) as plugin evaluators following the existing DimensionEvaluator protocol. Then refactor the scoring system from point-deduction to rubric-based, add LLM-as-Judge deep evaluation, add behavioral test scenarios, and update documentation.

Key decisions:
- Each evaluator follows the existing pattern in `plugins/rd2/skills/cc-skills/scripts/evaluators/`
- New evaluators implement the DimensionEvaluator protocol with `name`, `weight`, and `evaluate(skill_path)` methods
- Scoring refactor changes from deduction-based (start at 100, subtract) to rubric-based (rate each dimension positively)
- LLM-as-Judge is gated behind `--deep` flag to avoid cost for routine evaluations
- Behavioral tests use a YAML/JSON scenario format with expected outcomes

**Enhanced Behavioral Readiness (from Official Guide):**
- Trigger testing: should_trigger/should_not_trigger queries with 90% target rate
- Performance comparison: baseline vs with-skill metrics (tool calls, tokens, prompts)
- Negative trigger guidance in documentation

Files to create/modify:
- `plugins/rd2/skills/cc-skills/scripts/evaluators/trigger_design.py` -- New evaluator
- `plugins/rd2/skills/cc-skills/scripts/evaluators/instruction_clarity.py` -- New evaluator
- `plugins/rd2/skills/cc-skills/scripts/evaluators/value_add.py` -- New evaluator
- `plugins/rd2/skills/cc-skills/scripts/evaluators/behavioral_readiness.py` -- Enhanced evaluator
- `plugins/rd2/skills/cc-skills/scripts/evaluators/__init__.py` -- Export new evaluators
- `plugins/rd2/skills/cc-skills/scripts/skills.py` -- Scoring refactor + LLM-as-Judge integration
- `plugins/rd2/skills/cc-skills/tests/` -- New tests for each evaluator
- `plugins/rd2/skills/cc-skills/SKILL.md` -- Updated documentation
- `plugins/rd2/skills/cc-skills/references/scenario-schema.yaml` -- Enhanced with trigger/perf tests
- `plugins/rd2/skills/cc-skills/references/scanner-criteria.md` -- Updated rubric criteria

Acceptance criteria:
- All 4 new evaluators pass unit tests
- Existing evaluator tests continue to pass
- Scoring produces rubric-based results
- `--deep` flag triggers LLM evaluation
- Behavioral test scenarios can be defined and run
- SKILL.md reflects all new dimensions

### Plan

**Phase 1: New Evaluators + Rubric Scoring (~3 days)**
- [x] 0191: Add Trigger Design evaluator plugin (15% weight)
- [x] 0192: Add Instruction Clarity evaluator plugin (10% weight)
- [x] 0193: Add Value-Add Assessment evaluator plugin (10% weight)
- [x] 0194: Add Behavioral Readiness evaluator plugin (10% weight)
- [ ] 0195: Refactor scoring from point-deductions to rubric-based

**Phase 2: LLM-as-Judge (~2 days)**
- [ ] 0196: Add LLM-as-Judge evaluation with --deep flag

**Phase 3: Behavioral Testing (~3 days)**
- [x] 0197: Add behavioral test scenario format and runner

**Final: Documentation**
- [ ] 0198: Update cc-skills SKILL.md and references for new dimensions

**Follow-up Tasks (from Official Guide Analysis):**
- [ ] 0200: Add skill patterns reference (5 official patterns)
- [ ] 0201: Add troubleshooting reference
- [ ] 0202: Add MCP enhancement guidance
- [ ] 0203: Add distribution guidance

### Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |
| Brainstorm | docs/.tasks/brainstorm/0190_brainstorm.md | super-brain | 2026-02-11 |
| Enhanced Schema | plugins/rd2/skills/cc-skills/references/scenario-schema.yaml | super-coder | 2026-02-12 |
| Follow-up Tasks | docs/tasks/0200-0203_*.md | super-brain | 2026-02-12 |

### References

- [How to Evaluate AI Agent Skills Without Relying on Vibes](https://pub.towardsai.net/how-to-evaluate-ai-agent-skills-without-relying-on-vibes-9a5764ad18c4) - JP Caparas, Towards AI, Jan 2026
- [Designing Agent Skills That Actually Work](https://kotrotsos.medium.com/designing-agent-skills-that-actually-work-f9ff005c891c) - Marco Kotrotsos, Dec 2025
- [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) - Anthropic Engineering, Jan 2026
- [Beyond Task Completion: Assessment Framework for Agentic AI](https://arxiv.org/html/2512.12791v1) - ArXiv, Dec 2025
- [Agent Skills 101: Why Prompts Don't Scale](https://kotrotsos.medium.com/agent-skills-101-why-prompts-dont-scale-7dadb849bf9d) - Marco Kotrotsos, Dec 2025
- [AI Agent Evaluation: The Definitive Guide](https://www.confident-ai.com/blog/definitive-ai-agent-evaluation-guide) - Confident AI
- [Evaluating AI Agents - DeepLearning.AI](https://www.deeplearning.ai/short-courses/evaluating-ai-agents/) - DeepLearning.AI
- [The Complete Guide to Building Skills for Claude](../../vendors/The-Complete-Guide-to-Building-Skill-for-Claude.md) - Anthropic, Jan 2026
