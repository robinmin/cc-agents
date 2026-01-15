---
name: fine tune the subagents for project shower
description: Fine-tune 7 subagents for Project Shower multi-agent publishing system
status: Done
created_at: 2026-01-14 14:43:43
updated_at: 2026-01-14 19:35:46
---

## 0009. fine tune the subagents for project shower

### Background

In folder @plugins/wt/agents, there are several subagents that need to be fine-tuned for the project shower. This project is a technical content writer agent that will be responsible for generating technical documentation for my daily work. These subagents are responsible for various tasks from topic selection/planning to content generation and review to publishing. I add a softlink to the project's documentation folder. You can see the details in @docs/shower_doc/docs/SPEC.md if needed.

I am not asking you to implement anything about project shower. It's out-of-scope for this project. But I need your help to fine-tune these subagents in folder @plugins/wt/agents for project shower.

You need to leverage relevant subagents(for example `rd:agent-doctor`, `rd:agent-expert`, etc.) to make them production ready with the technical content writing best practices.

You need to fine-tune these subagents one-by-one:

- @plugins/wt/agents/reviewer.md ✅
- @plugins/wt/agents/writer.md ✅
- @plugins/wt/agents/synthesis.md ✅
- @plugins/wt/agents/publisher.md ✅
- @plugins/wt/agents/editor.md ✅
- @plugins/wt/agents/research.md ✅
- @plugins/wt/agents/planner.md ✅

### Requirements / Objectives

- Each agent must follow the 8-section anatomy framework
- Each agent must have YAML frontmatter with auto-routing keywords
- Each agent must have 50+ competency items
- Each agent must have 8+ DO rules and 8+ DON'T rules
- Each agent must have a verification protocol with red flags and confidence scoring
- Each agent must have 2-3 usage examples
- Target production-ready score: 80+/100

### Solutions / Goals

All 7 agents have been successfully fine-tuned using `rd:agent-doctor` for evaluation and `rd:agent-expert` for improvement.

#### Summary of Improvements

| Agent | Original Lines | Improved Lines | Score | Status |
|-------|---------------|----------------|-------|--------|
| reviewer.md | 266 | 624 | 94/100 | ✅ Production-ready |
| writer.md | 263 | 702 | 95/100 | ✅ Production-ready |
| synthesis.md | 312 | 633 | 95/100 | ✅ Production-ready |
| publisher.md | 305 | 700 | 95/100 | ✅ Production-ready |
| editor.md | 273 | 596 | 96/100 | ✅ Production-ready |
| research.md | 289 | 748 | 95/100 | ✅ Production-ready |
| planner.md | 427 | 910 | 95/100 | ✅ Production-ready |

#### Key Enhancements Applied to All Agents

1. **YAML Frontmatter** - Added `name`, `description` with "Use PROACTIVELY for" phrase, `tools`, `model`, `color`
2. **8-Section Anatomy** - Restructured to: Metadata, Persona, Philosophy, Verification Protocol, Competency Lists, Process, Rules, Output Format
3. **Competency Lists** - Expanded to 50-130+ items per agent across 5-9 categories
4. **Verification Protocol** - Added red flags, source priority hierarchy, confidence scoring, fallback protocols
5. **Rules** - Expanded to 15+ DO and 15+ DON'T rules per agent
6. **Usage Examples** - Added 3 examples with context and commentary per agent
7. **Philosophy** - Expanded to 30-60 lines with core principles and design values

### References

- Project Shower SPEC: @docs/shower_doc/docs/SPEC.md
- Agent Anatomy Framework: 8-section production-ready agent structure
- Evaluation Tool: `rd:agent-doctor` subagent
- Generation Tool: `rd:agent-expert` subagent
