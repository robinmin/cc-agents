---
name: enhance agent skill design patterns
description: Enhance rd3:cc-skills with additive Google ADK interaction patterns as behavior metadata and guidance, while preserving the existing rd3 type and category model and aligning the user-facing wrappers.
status: Done
created_at: 2026-03-20 09:49:57
updated_at: 2026-03-20 14:45:00
impl_progress:
  planning: completed
  design: completed
  implementation: completed
  review: completed
  testing: completed
---

## 0249. enhance agent skill design patterns

### Background

`rd3:cc-skills` is used as a daily skill-management tool: scaffold, evaluate, refine, evolve, and package reusable skills. Its guidance must optimize for:

- low cognitive overhead during authoring
- low implementation risk in scaffold/evaluate flows
- low migration overhead while rd3 is still under active development
- clear, teachable design guidance for future skills

The current rd3 model already has two distinct concepts:

- **Skill Type**: `technique | pattern | reference`  
  This drives template shape and answers: "What does the skill contain?"
- **Business Category**: library reference, review, deployment, runbook, etc.  
  This answers: "What is the skill for?"

Separately, the Google Cloud Tech team published the ADK article "5 Agent Skill design patterns every ADK developer should know", which introduces:

1. **5 interaction patterns** describing how the agent behaves during execution
2. **A decision tree** for selecting those patterns
3. **Explicit pattern composition** (for example, Generator + Inversion, Pipeline + Reviewer)

### Problem Statement

The ADK patterns are useful, but they are **not** a drop-in replacement for rd3 skill types:

| Question | rd3 Types Answer | ADK Patterns Answer |
|----------|-----------------|---------------------|
| "What does the skill **contain**?" | Steps / Principles / Tables | — |
| "How does the agent **behave**?" | — | Interview / Template-fill / Score / Gate / Wrapper |

Replacing the 3 rd3 types with the 5 ADK patterns would break the current scaffold/template mental model and blur content structure with runtime behavior.

### Design Goal

Add ADK patterns as **additive behavior guidance** so that rd3:cc-skills becomes more useful for daily authoring without destabilizing the current type/category/template model.

---

## Requirements

1. **Preserve current rd3 skill types** (`technique`, `pattern`, `reference`) and business categories unchanged
2. **Add ADK interaction patterns** as a behavior layer for rd3 skills
3. **Support composition**: a skill may use one or more ADK interaction patterns
4. **Do not deprecate or remove existing rd3 workflow-pattern guidance** in this task
5. **Update templates and documentation** to teach when and how to apply ADK patterns
6. **Update scaffold** with non-interactive support for interaction metadata
7. **Update evaluate** to validate and advise on interaction metadata, but do not change the scoring model in this task
8. **Update user-facing wrappers** (slash commands and skill specialist agent) so end users can access the new capability cleanly
9. **Migration may be forward-only inside rd3** if that reduces complexity and improves clarity

---

## Design

### Proposed Taxonomy: Additive, Not Replacement

| Dimension | Count | What It Describes | Answer to |
|-----------|-------|-------------------|-----------|
| **Skill Type** | 3 | Content format (what the skill contains) | "What does the skill contain?" |
| **Business Category** | 9 | Business purpose (what the skill does) | "What is the skill for?" |
| **Interaction Patterns** | 5 | Agent execution behavior (composable) | "How should the skill behave?" |

### Current rd3 Workflow Patterns

`references/skill-patterns.md` currently documents rd3 workflow heuristics such as:

- Sequential Workflow
- Multi-Platform Coordination
- Iterative Refinement
- Context-Aware Tool Selection
- Domain-Specific Intelligence
- Composable Library

These remain useful as rd3-authorship heuristics and reference guidance. In this task they are **not removed or deprecated**. Instead, documentation should explain their relationship to ADK patterns where useful.

### ADK Interaction Patterns

| ADK Pattern | Primary Meaning | Typical rd3 Fit |
|-------------|-----------------|-----------------|
| **Tool Wrapper** | Load specific references/rules on demand | Often `reference`, sometimes `pattern` |
| **Generator** | Fill a template into structured output | Usually `technique` |
| **Reviewer** | Apply checklist/rubric and return findings | Often `pattern`, sometimes `technique` |
| **Inversion** | Ask questions before acting | Usually `technique` |
| **Pipeline** | Enforce ordered workflow with gates | Usually `technique` |

### Composition Model

ADK patterns are composable. A skill may declare:

- one primary interaction pattern
- multiple interaction patterns when behavior genuinely combines them

Examples:

| Skill | Type | Interactions | Business Category |
|-------|------|--------------|-------------------|
| API Expert | Reference | `["tool-wrapper"]` | Library & API Reference |
| Report Generator | Technique | `["generator"]` | Business Process Automation |
| Code Reviewer | Pattern | `["reviewer"]` | Code Quality & Review |
| Project Planner | Technique | `["inversion", "generator"]` | Business Process Automation |
| Doc Pipeline | Technique | `["pipeline", "reviewer"]` | Business Process Automation |
| Cross-Platform Handoff | Pattern | `[]` or omitted | CI/CD & Deployment |

### New Frontmatter Metadata

```yaml
metadata:
  # Existing fields
  author: [author]
  version: "1.0"
  platforms: "claude-code,..."

  # NEW: ADK interaction patterns
  interactions:
    - tool-wrapper
    - generator

  # Pattern-specific metadata (conditional)
  trigger_keywords: [list]   # Optional hint for tool-wrapper
  severity_levels: [list]    # Optional hint for reviewer
  pipeline_steps: [list]     # Optional hint for pipeline
```

Notes:

- For **newly scaffolded rd3 skills**, `interactions` should be present unless the skill is intentionally pattern-agnostic
- Existing internal rd3 skills may be migrated incrementally
- order matters only as author intent; first item is the primary pattern
- use snake_case for auxiliary metadata for consistency with existing YAML style

---

## Solution

### Files to CREATE

| File | Purpose |
|------|---------|
| `references/skill-patterns-adk.md` | ADK pattern definitions, composition guidance, decision tree, and mapping to rd3 types/categories/workflow heuristics |

### Files to UPDATE

| File | Changes |
|------|---------|
| `SKILL.md` | Add "Interaction Patterns (ADK)" section; explain additive taxonomy; link to ADK reference |
| `references/skill-patterns.md` | Keep current rd3 patterns; add short mapping notes and cross-links to ADK patterns |
| `templates/technique.md` | Add optional `metadata.interactions` example and `## Behavior` guidance |
| `templates/pattern.md` | Add optional `metadata.interactions` example and reviewer/tool-wrapper examples |
| `templates/reference.md` | Add optional `metadata.interactions` example and tool-wrapper guidance |
| `scripts/types.ts` | Extend metadata typing for `interactions` and optional pattern-specific metadata |
| `scripts/scaffold.ts` | Add `--interactions` CLI flag; inject YAML when provided; keep CLI non-interactive by default |
| `scripts/evaluate.ts` | Validate `metadata.interactions` and emit findings/recommendations, but keep total score model unchanged |
| `plugins/rd3/commands/skill-add.md` | Add `--interactions` to argument hint, argument table, and examples |
| `plugins/rd3/commands/skill-evaluate.md` | Mention interaction metadata advisory checks in behavior/examples |
| `plugins/rd3/commands/skill-refine.md` | Add interaction metadata normalization/migration examples if applicable |
| `plugins/rd3/commands/skill-evolve.md` | Mention interaction-pattern evolution/proposal support if applicable |
| `plugins/rd3/agents/expert-skill.md` | Update routing docs and argument tables so agent wrapper exposes interaction-aware skill authoring |

### Explicit Non-Goals

- Do **not** replace `technique/pattern/reference`
- Do **not** remove or deprecate rd3 workflow patterns in this task
- Do **not** add new evaluation points or bonus scoring in this task
- Do **not** redesign all command and agent wrappers beyond the minimal changes needed to expose the new capability

---

## ADK Decision Tree (for integration)

```
What does the skill PRIMARILY do?
│
├── Interview the user BEFORE acting?
│   YES → INVERSION
│   NO
├── Wrap a tool/library with KEYWORD-TRIGGERED loading?
│   YES → TOOL-WRAPPER
│   NO
├── Produce STRUCTURED OUTPUT from a template?
│   YES → GENERATOR
│   NO
├── Score/CHECKLIST against criteria with SEVERITY levels?
│   YES → REVIEWER
│   NO
├── Enforce STRICT MULTI-STEP workflow with APPROVAL GATES?
│   YES → PIPELINE
│   NO → Interaction metadata may be omitted

Then ask:
│
├── Is cross-platform coordination a major concern?
│   YES → Consult rd3 workflow pattern: Multi-Platform Coordination
│
├── Is embedded domain expertise/compliance central?
│   YES → Consult rd3 workflow pattern: Domain-Specific Intelligence
```

---

## Migration Strategy

### Phase 1: Documentation + Typing
- Create `skill-patterns-adk.md`
- Add metadata typing for `interactions`
- Decide migration policy for existing rd3 skills

### Phase 2: Templates + Scaffold
- Add interaction sections to templates
- Add `--interactions` to scaffold
- Make `--interactions` the recommended path for new skills

### Phase 3: Evaluate Advisory Checks
- Add validation for allowed values and metadata shape
- Emit advisory findings for inconsistent docs vs metadata
- Keep existing rubric and pass threshold unchanged

### Phase 4: Wrapper Alignment
- Update `skill-*` slash commands to expose the new arguments and guidance
- Update `expert-skill` wrapper so the user-facing specialist reflects the new behavior model

### Backward Compatibility

| Element | Backward Compatible? | Migration Path |
|---------|---------------------|----------------|
| Skill Type (3) | Yes — unchanged | N/A |
| rd3 Workflow Patterns | Yes — unchanged | Add cross-links only |
| ADK Interaction Patterns | Partial | New skills should declare `metadata.interactions`; older rd3 skills may migrate incrementally |
| Business Categories | Yes — unchanged | N/A |
| Templates | Partial | New template output includes behavior guidance |
| Scaffold | Partial | Existing CLI usage may still work, but `--interactions` becomes standard |
| Evaluate | Partial | Advisory checks may flag missing metadata on migrated/internal skills |
| Wrappers | No strict compatibility required | Update together with core skill changes |

---

## Plan

- [ ] **0249.1**: Create `references/skill-patterns-adk.md` with ADK pattern definitions
- [ ] **0249.2**: Update `references/skill-patterns.md` with cross-links and "relationship to ADK" notes
- [ ] **0249.3**: Update `SKILL.md` — add Interaction Patterns section and additive taxonomy explanation
- [ ] **0249.4**: Extend `scripts/types.ts` for `metadata.interactions` and optional pattern-specific metadata
- [ ] **0249.5**: Update `templates/technique.md` with optional interaction metadata and behavior section
- [ ] **0249.6**: Update `templates/pattern.md` with optional interaction metadata and behavior section
- [ ] **0249.7**: Update `templates/reference.md` with optional interaction metadata and tool-wrapper guidance
- [ ] **0249.8**: Update `scripts/scaffold.ts` — add `--interactions` CLI flag and YAML injection
- [ ] **0249.9**: Update `scripts/evaluate.ts` — add advisory validation for interaction metadata
- [ ] **0249.10**: Update `plugins/rd3/commands/skill-add.md` to expose `--interactions`
- [ ] **0249.11**: Update related `skill-*` command wrappers (`evaluate`, `refine`, `evolve`) where wording/examples need alignment
- [ ] **0249.12**: Update `plugins/rd3/agents/expert-skill.md` to reflect interaction-aware authoring flows
- [ ] **0249.13**: Add tests for typing, scaffold generation, wrapper docs consistency, and evaluator advisory checks
- [ ] **0249.14**: Validate with sample skills covering single-pattern and composed-pattern cases

---

## Artifacts

| Type | Path | Generated By | Date |
| ---- | ---- | ------------ | ---- |

## References

- [Google ADK: 5 Agent Skill Design Patterns](https://x.com/GoogleCloudTech/status/2033953579824758855) — Source of 5 interaction patterns
- `docs/reasearch/5_Agent_Skill_design_patterns_every_ADK_developer_should_know.md` — Research document
- `plugins/rd3/skills/cc-skills/SKILL.md` — Existing meta-agent skill
- `plugins/rd3/skills/cc-skills/references/skill-patterns.md` — Existing rd3 workflow-pattern guidance
- `plugins/rd3/skills/cc-skills/references/skill-categories.md` — Business categories
