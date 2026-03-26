---
name: enhance cc-magents in plugin rd3
description: enhance cc-magents in plugin rd3
status: completed
created_at: 2026-03-26T00:35:09.053Z
updated_at: 2026-03-25 18:07:24
folder: docs/tasks
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0261. Enhance cc-magents in Plugin rd3

### Background

The `rd3:cc-magents` skill currently manages main agent configuration files (AGENTS.md, CLAUDE.md, etc.) across 23+ platforms using a Universal Main Agent Model (UMAM). Two recent practitioner articles reveal a richer workspace file architecture emerging in the OpenClaw ecosystem that our skill should absorb to stay current with industry best practices.

**Source Materials:**
1. **"How to Make Your OpenClaw Agent Useful and Secure"** — Aman Khan (Substack, Feb 17 2026). Covers security hardening, workspace file architecture (SOUL.md/AGENTS.md/USER.md/MEMORY.md/BOOTSTRAP.md), memory system design, progressive adoption patterns, and prompt injection defense.
2. **"OpenClaw Workspace Files Explained"** — Roberto Capodieci (Medium, Mar 10 2026). Comprehensive guide to 7 workspace files (SOUL.md, IDENTITY.md, AGENTS.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md), common mistakes, security guardrails, and config generation workflows.

**Current State:**
- UMAM supports section-based flexible headings but does not model the semantic separation between personality (SOUL), identity (IDENTITY), procedures (AGENTS), user context (USER), tool permissions (TOOLS), scheduled tasks (HEARTBEAT), and memory (MEMORY)
- Templates (dev-agent, research-agent, etc.) generate monolithic configs without personality/procedure separation guidance
- Evaluation framework (5 dimensions: Coverage, Operability, Grounding, Safety, Maintainability) lacks signals for bootstrap quality, memory architecture, tool scoping, and heartbeat design
- OpenClaw is not yet a supported platform in the adapt operation

**Goal:** Extract actionable patterns from both sources and merge them into cc-magents to produce a more sophisticated, industry-aligned meta-agent skill for main agent configuration management.

---

### Requirements

#### R1. Knowledge Extraction and Synthesis

Extract and codify the following patterns from source materials into referenceable documents:

**R1.1 Workspace File Taxonomy**
- Document the 7-file workspace model: SOUL.md, IDENTITY.md, AGENTS.md, USER.md, TOOLS.md, HEARTBEAT.md, MEMORY.md
- Define the purpose, scope, and content boundaries of each file
- Map separation-of-concerns: personality vs procedures vs identity vs user context vs tool permissions vs scheduled tasks vs memory
- **Acceptance:** New reference file `references/workspace-file-taxonomy.md` exists with clear definitions and boundary rules

**R1.2 Security Hardening Patterns**
- Codify security patterns: gateway binding, token auth, file permissions, Tailscale rules, group chat behavior, prompt injection defense
- Categorize by severity tier: Critical / Important / Recommended
- Map to evaluation framework Safety dimension
- **Acceptance:** `references/security-hardening.md` exists; Safety dimension scoring rubric updated to check for these patterns

**R1.3 Memory Architecture Patterns**
- Document daily memory files (`memory/YYYY-MM-DD.md`), long-term curation into MEMORY.md, compound learning effect
- Define memory seeding best practices (pre-load known facts)
- Document the "Remember what we just talked about" prompting pattern
- **Acceptance:** `references/memory-architecture.md` exists; Maintainability dimension checks for memory design patterns

**R1.4 Bootstrap/Onboarding Patterns**
- Document bootstrap-first pattern: first message triggers setup, not real work
- Document progressive adoption timeline (Days 1-7 progression)
- Document the BOOTSTRAP.md guided interview pattern
- **Acceptance:** `references/bootstrap-patterns.md` exists

**R1.5 Common Mistakes Catalog**
- Merge common mistakes from both sources into `references/red-flags.md` (extend existing file):
  - Putting procedures in SOUL.md
  - Leaving USER.md empty
  - Not seeding MEMORY.md
  - Over-engineering HEARTBEAT.md
  - Sharing workspace files without redacting USER.md
  - Dumping everything into SOUL.md when it belongs in AGENTS.md
- **Acceptance:** `references/red-flags.md` updated with new anti-patterns sourced from both articles

---

#### R2. UMAM Model Enhancement

**R2.1 Semantic Section Categories**
- Extend the UMAM `MagentSection` type to support semantic category tags that map to workspace file concepts:
  - `personality` (SOUL.md content)
  - `identity` (IDENTITY.md content)
  - `procedures` (AGENTS.md content)
  - `user-context` (USER.md content)
  - `tools` (TOOLS.md content)
  - `heartbeat` (HEARTBEAT.md content)
  - `memory` (MEMORY.md content)
  - `bootstrap` (BOOTSTRAP.md content)
- These categories are metadata — they do NOT change the section-based storage model, only enrich it for platforms that use multi-file architectures
- **Acceptance:** `scripts/types.ts` updated with new category enum; existing adapters continue to work unchanged

**R2.2 Multi-File Platform Support**
- Extend UMAM to model platforms that use multiple workspace files (OpenClaw) vs single-file platforms (Claude Code, Cursor)
- Add `fileMapping` field to platform adapter output: which UMAM sections map to which output files
- Single-file platforms merge all sections into one file (current behavior, unchanged)
- Multi-file platforms split sections by semantic category into separate files
- **Acceptance:** Types support multi-file output; existing single-file adapters unaffected

---

#### R3. OpenClaw Platform Adapter

**R3.1 OpenClaw Adapter (Tier 1)**
- Create `scripts/adapters/openclaw.ts` adapter
- Support both parse and generate for 7 workspace files
- Parse: read workspace directory, merge files into UMAM with semantic categories
- Generate: split UMAM sections into 7 files by semantic category
- Handle missing files gracefully (not all 7 are required)
- **Acceptance:** `bun scripts/adapt.ts AGENTS.md --to openclaw --output ./openclaw-workspace/` produces valid workspace file set; `bun scripts/adapt.ts ./openclaw-workspace/ --to agents-md --output AGENTS.md` round-trips correctly

**R3.2 Platform Registration**
- Register openclaw in the platform tier matrix as Tier 1 (Full: Parse + Generate + Validate)
- Update SKILL.md platform tables
- Update `references/platform-compatibility.md`
- **Acceptance:** `bun scripts/adapt.ts --list-platforms` includes openclaw; docs updated

---

#### R4. Template Enrichment

**R4.1 Personality/Procedure Separation Guidance**
- Update all 6 templates to include guidance on separating personality (tone, values, limits) from procedures (workflows, decision trees, tools)
- Add anti-pattern warnings: "Do not put numbered workflows in personality sections"
- **Acceptance:** Each template in `templates/` contains explicit separation guidance

**R4.2 Bootstrap Section in Templates**
- Add optional bootstrap/onboarding section to templates
- Include first-run setup guidance, progressive adoption timeline, identity creation prompts
- **Acceptance:** Templates include `## Bootstrap` section with sensible defaults

**R4.3 Security Hardening Section in Templates**
- Add security hardening section with tiered rules (Critical/Important/Recommended)
- Include: secret handling, tool permission scoping, prompt injection defense, external content treatment
- **Acceptance:** Templates include `## Security` section with at least Critical-tier rules

**R4.4 Memory Architecture Section in Templates**
- Add memory section with daily/long-term memory patterns
- Include memory seeding guidance and curation rules
- **Acceptance:** Templates include `## Memory` section with daily + long-term patterns

---

#### R5. Evaluation Framework Enhancement

**R5.1 Enhanced Safety Scoring**
- Add security hardening checks to Safety dimension:
  - Prompt injection defense rules present
  - Secret handling rules present
  - Tool permission scoping defined
  - External content treatment rules present
- **Acceptance:** `scripts/evaluation.config.ts` updated; configs with security hardening score higher on Safety

**R5.2 Enhanced Maintainability Scoring**
- Add memory architecture checks to Maintainability dimension:
  - Daily memory pattern defined
  - Long-term curation rules present
  - Memory seeding guidance present
  - Bootstrap/onboarding pattern present
- **Acceptance:** Configs with proper memory architecture score higher on Maintainability

**R5.3 Enhanced Coverage Scoring**
- Add workspace file separation checks to Coverage dimension:
  - Personality vs procedure separation (or explicit guidance if single-file)
  - User context section present
  - Tool usage section present
- Update P0/P1/P2 priority categories to reflect new expected sections
- **Acceptance:** Coverage dimension scoring rubric updated in `references/evaluation-framework.md`

**R5.4 New Red Flags**
- Add common-mistakes from R1.5 as negative scoring signals in evaluation
- **Acceptance:** Evaluation detects and penalizes anti-patterns from both source articles

---

#### R6. LLM Content Refinement

After all structural changes are merged, perform a content quality pass:

**R6.1 SKILL.md Refinement**
- Update SKILL.md to reflect all new capabilities (OpenClaw adapter, enhanced evaluation, new reference files)
- Ensure description accurately captures the expanded scope
- **Acceptance:** SKILL.md is current and accurate

**R6.2 Reference File Quality**
- Review all reference files for clarity, consistency, and completeness
- Remove duplicated content across reference files
- Ensure cross-references between files are correct
- **Acceptance:** No broken cross-references; no duplicated content

**R6.3 Template Content Quality**
- Review template content against SOTA agent configuration practices
- Ensure templates produce configs that score B+ or higher on evaluation
- **Acceptance:** Generated configs from all 6 templates pass evaluation with grade >= B

---

### Q&A

- **Q: Should OpenClaw be added as a new adapter or should the existing `metadata.openclaw` file be extended?**
  A: New adapter at `scripts/adapters/openclaw.ts`. The existing `metadata.openclaw` file contains OpenClaw-specific skill metadata, which is separate from the platform adapter.

- **Q: Should UMAM be restructured to use multi-file as the primary model?**
  A: No. UMAM remains section-based. Multi-file support is an output concern handled by adapters. Semantic categories are metadata tags on sections, not a structural change.

- **Q: Should we add new evaluation dimensions beyond the existing 5?**
  A: No. The 5 dimensions (Coverage, Operability, Grounding, Safety, Maintainability) are MECE. New signals are added as sub-checks within existing dimensions, not as new dimensions.

---

### Design

To be completed during design phase. Key decisions:
1. UMAM type extensions (semantic categories, multi-file mapping)
2. OpenClaw adapter architecture (directory-based parse/generate)
3. Evaluation config changes (new sub-checks per dimension)
4. Template structure changes (new sections)

---

### Solution

To be completed during implementation phase.

---

### Plan

**Phase 1: Knowledge Extraction (R1)** — ~2h
- Create new reference files from source materials
- Update existing red-flags.md
- No code changes

**Phase 2: UMAM Model Enhancement (R2)** — ~3h
- Extend types with semantic categories
- Add multi-file platform support to types
- Update existing tests

**Phase 3: OpenClaw Adapter (R3)** — ~4h
- Implement openclaw adapter with parse + generate
- Add tests for round-trip conversion
- Register in platform matrix

**Phase 4: Template Enrichment (R4)** — ~2h
- Update all 6 templates with new sections
- Add separation guidance, bootstrap, security, memory sections

**Phase 5: Evaluation Enhancement (R5)** — ~3h
- Update evaluation config with new sub-checks
- Update scoring rubrics
- Add anti-pattern detection
- Update evaluation tests

**Phase 6: Content Refinement (R6)** — ~1h
- Final quality pass on SKILL.md, references, templates
- Verify generated configs score B+ or higher

**Total estimated effort: ~15h across 6 phases**

---

### Review

To be completed after implementation.

---

### Testing

1. **Unit Tests**: All new/modified scripts have corresponding test files
2. **Adapter Tests**: OpenClaw adapter round-trip test (AGENTS.md -> openclaw workspace -> AGENTS.md)
3. **Evaluation Tests**: Updated evaluation config produces expected scores for test fixtures
4. **Template Tests**: All 6 templates generate configs that pass evaluation with grade >= B
5. **Regression**: All existing tests continue to pass

---

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Source | /Users/robin/Documents/karacache/generic/amankhan1.substack.com_4c700845_20260324_230332.pdf | - | 2026-03-24 |
| Source | /Users/robin/Documents/karacache/medium/capodieci.medium.com_291248ae_20260324_232510.pdf | - | 2026-03-24 |

### References

- [AGENTS.md Official Specification](https://agents.md/)
- [Agentic AI Foundation](https://aaif.io)
- Existing skill: `plugins/rd3/skills/cc-magents/SKILL.md`
- Evaluation framework: `plugins/rd3/skills/cc-magents/references/evaluation-framework.md`
- Workflows: `plugins/rd3/skills/cc-magents/references/workflows.md`
- Red flags: `plugins/rd3/skills/cc-magents/references/red-flags.md`
- Platform compatibility: `plugins/rd3/skills/cc-magents/references/platform-compatibility.md`
