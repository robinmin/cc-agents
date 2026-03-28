---
name: migrate rd2:knowledge-seeker into plugin rd3
description: Absorb rd2:knowledge-seeker capabilities into rd3:knowledge-extraction skill, then create thin wrapper agent and command
status: Backlog
created_at: 2026-03-28T00:01:29.820Z
updated_at: 2026-03-27T00:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: pending
  review: pending
  testing: pending
---

## 0273. Migrate rd2:knowledge-seeker into plugin rd3

### Background

The rd2 plugin has a fat subagent `rd2:knowledge-seeker` (~640 lines, `plugins/rd2/agents/knowledge-seeker.md`) that embeds extensive research methodology, verification protocols, and output templates directly in its agent definition. This violates the rd3 "fat skills, thin wrappers" principle.

Meanwhile, rd3 already has `rd3:knowledge-extraction` skill (`plugins/rd3/skills/knowledge-extraction/`) which covers extraction workflows, synthesis patterns, tool selection, validation methods, conflict resolution, and deduplication. However, it lacks several capabilities that the rd2 agent has.

The existing `wt:info-seek` command (`plugins/wt/commands/info-seek.md`) currently delegates to `rd2:knowledge-seeker`. After this migration, `wt:info-seek` should be updated to delegate to the new `rd3:knowledge-seeker` agent instead.

### Requirements

#### R1: Enhance rd3:knowledge-extraction skill

Absorb the following capabilities from `rd2:knowledge-seeker` into `rd3:knowledge-extraction`:

**R1.1 — Research Methodology (NEW reference file)**
Create `references/research-methodology.md` containing:
- Systematic Literature Review (PRISMA methodology, search strategy design, inclusion/exclusion criteria)
- Meta-Analysis patterns (effect size synthesis, statistical aggregation, heterogeneity assessment)
- Research Question Formulation (PICO framework, PICo for qualitative, SMART criteria)
- Search Strategy Design (Boolean operators, search string construction, database selection)
- Knowledge Synthesis Patterns: scoping review, rapid review, realist review, systematic mapping, narrative synthesis, thematic analysis, critical appraisal, evidence mapping, state-of-the-art review
- Specialized Research Techniques: snowballing/citation chaining, database-specific syntax (PubMed, IEEE Xplore, Google Scholar), annotated bibliographies, research logs

**R1.2 — Research Process Phases (NEW reference file)**
Create `references/research-process.md` containing the 5-phase research process:
1. **Define Scope** — Clarify research question, identify source requirements, determine recency needs, assess scope constraints, establish confidence threshold
2. **Design Search Strategy** — Select tools, construct queries, identify target sources, plan verification, set quality thresholds
3. **Execute Systematic Search** — Execute primary searches, gather sources, assess quality, extract information, document methodology
4. **Synthesize and Verify** — Cross-reference claims, resolve conflicts, assess evidence quality, synthesize findings, identify knowledge gaps
5. **Present Results** — Structure response, cite all sources, assign confidence levels, acknowledge limitations, provide context

Also include the decision framework table mapping situations to actions (e.g., "Conflicting information -> Cross-reference -> Assess source quality -> Note conflicts").

**R1.3 — Source Evaluation (NEW reference file)**
Create `references/source-evaluation.md` containing:
- Source Credibility Assessment (author credentials, publication venue, peer review status)
- Publication Bias Detection (positive results bias, file drawer problem)
- Conflict of Interest Identification (funding sources, author affiliations)
- Citation Analysis (citation count, h-index, citation context)
- Publication Venue Assessment (journal impact factor, conference ranking, predatory journal detection)
- Preprint Evaluation (arXiv, bioRxiv status)
- Gray Literature Assessment (white papers, technical reports)
- Evidence Hierarchy: Peer-reviewed > Industry white papers > Technical blogs > Community forums; Recent (<2yr) > Older; Primary > Secondary > Tertiary

**R1.4 — Citation and Attribution (NEW reference file)**
Create `references/citation-attribution.md` containing:
- Citation Style Guides (APA, MLA, Chicago, IEEE, ACM)
- In-Text Citation Formats (parenthetical, narrative, footnote)
- DOI and URL Handling (permanent links, access dates, link rot)
- Quotation vs Paraphrase guidelines
- Secondary Citations ("as cited in" format)
- Attribution Best Practices and plagiarism prevention

**R1.5 — Output Templates (NEW reference file)**
Create `references/output-templates.md` containing 4 structured templates:
1. **Research Synthesis Template** — Topic, search date, methodology, key findings with per-claim confidence, conflicts/gaps, synthesis, limitations, categorized sources
2. **Quick Verification Template** — Claim, finding, primary + supporting sources, confidence, caveats, recommendation
3. **Literature Review Template** — Abstract, introduction, methodology (PRISMA-style), results with thematic findings, discussion, conclusions, references
4. **Error Response Template** — Research question, barriers, partial findings, unverifiable items, suggested next steps

**R1.6 — Update SKILL.md**
- Add "When to Use" entries for: systematic literature reviews, meta-analysis, evidence synthesis, knowledge gap identification, research methodology guidance, citation and attribution, fact-checking
- Add references to new files in the "Reference Files" section and `see_also` frontmatter
- Add a new "Research Workflows" section linking to the 5-phase process
- Bump version to 2.1.0

**R1.7 — Anti-Hallucination Workflow Enhancement**
Merge the rd2 agent's 7-step anti-hallucination workflow (IDENTIFY CLAIMS -> PLAN VERIFICATION -> EXECUTE SEARCH -> ASSESS EVIDENCE -> SYNTHESIZE -> SCORE CONFIDENCE -> REVISE IF NEEDED) into existing `references/synthesis-patterns.md` as a new section, complementing the existing Chain-of-Verification pattern. Also merge the "Red Flags" table (8 patterns with risk levels and required actions) and the "Fallback Protocol" (tool unavailability handling).

#### R2: Create rd3:knowledge-seeker agent

Create `plugins/rd3/agents/knowledge-seeker.md` as a **thin wrapper** (~80-120 lines) following the rd3 agent pattern (see `plugins/rd3/agents/expert-agent.md` for reference).

**Frontmatter:**
```yaml
name: knowledge-seeker
description: |
  Research specialist and knowledge synthesizer. Use PROACTIVELY for systematic literature reviews,
  multi-source verification, evidence synthesis, knowledge gap identification, research methodology
  guidance, citation and attribution, fact-checking, cross-reference validation, and anti-hallucination
  protocols for research tasks.

  <example>
  Context: User needs comprehensive research on a technical topic with verifiable sources
  user: "I need to understand the current state of LLM hallucination detection techniques for a research paper"
  assistant: "I'll conduct a systematic literature review on LLM hallucination detection, synthesizing information from peer-reviewed sources with proper citations..."
  <commentary>knowledge-seeker activates for systematic research requiring multi-source verification and evidence synthesis.</commentary>
  </example>

  <example>
  Context: User needs to verify conflicting information across sources
  user: "I'm seeing conflicting information about whether React Server Components support all React hooks"
  assistant: "I'll investigate this by cross-referencing official React documentation, React team blog posts, and recent conference talks to provide a verified answer..."
  <commentary>knowledge-seeker handles verification of conflicting claims through systematic source evaluation.</commentary>
  </example>

  <example>
  Context: User needs a literature review for evidence synthesis
  user: "Create a literature review on the effectiveness of Chain-of-Thought prompting for mathematical reasoning"
  assistant: "I'll conduct a systematic literature review, searching for relevant papers, extracting key findings, synthesizing evidence across sources, and identifying knowledge gaps..."
  <commentary>knowledge-seeker specializes in literature review methodology and evidence synthesis.</commentary>
  </example>

  <example>
  Context: User asks about recent developments in a fast-moving field
  user: "What are the latest techniques for reducing LLM hallucination in production systems?"
  assistant: "I'll search for recent papers, industry blog posts, and implementation guides from the last 6 months to synthesize current best practices..."
  <commentary>knowledge-seeker prioritizes recent, authoritative sources for rapidly evolving topics.</commentary>
  </example>
tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
  - WebFetch
  - ref_search_documentation
  - ref_read_url
  - mcp__grep__searchGitHub
model: inherit
color: cyan
skills:
  - rd3:knowledge-extraction
  - rd3:anti-hallucination
  - rd3:verification-chain
```

**Body structure:**
1. **Role** — "Expert research specialist that delegates to rd3:knowledge-extraction skill"
2. **Core principle** — "Delegate to rd3:knowledge-extraction — do NOT embed research logic directly"
3. **Skill Invocation** — Platform-specific invocation table (Claude Code, Codex, OpenCode, etc.)
4. **Operation Routing** — Map user requests to skill workflows:
   - "verify X" / "fact-check X" -> Single Source + Verify workflow
   - "research X" / "what is X" -> Multi-Source Synthesis workflow
   - "compare X and Y" -> Multi-Source Synthesis with conflict resolution
   - "literature review on X" -> Full 5-phase research process
   - "extract from <file/URL>" -> Aspect-Based Extraction workflow
   - "reconcile X and Y" -> Multi-Source Reconciliation workflow
5. **When NOT to Use** — Same exclusions as rd2 version (simple lookups, code implementation, architecture design, real-time data, legal/medical advice)

#### R3: Create rd3:info-seek command

Create `plugins/rd3/commands/info-seek.md` as a **thin command wrapper** following rd3 command patterns (see `plugins/rd3/commands/skill-evaluate.md` for reference).

**Frontmatter:**
```yaml
description: Extract, verify, and synthesize knowledge from files, URLs, or search queries
argument-hint: "<input> [--aspect <aspect>] [--workflow <type>] [--format <template>] [--save] [--output <path>]"
allowed-tools: ["Read", "Write", "Edit", "Bash", "Skill", "WebSearch", "WebFetch"]
```

**Body structure:**
1. **Quick Start** — 5-6 example invocations
2. **When to Use** — Extract from documents, verify information, research topics, conduct literature reviews
3. **Arguments** — Table of all arguments:
   - `<input>` (required) — File path, URL, or search query
   - `--aspect` — Focus filter: architecture, performance, security, examples, API, configuration, troubleshooting
   - `--workflow` — Workflow type: quick (single source), standard (multi-source, default), deep (full 5-phase literature review)
   - `--format` — Output template: synthesis (default), verification, literature-review, error
   - `--save` — Save output to 0-materials/ for Technical Content Workflow
   - `--output` — Custom output path (implies --save)
4. **Implementation** — Delegates to rd3:knowledge-extraction:
   ```
   Skill(skill="rd3:knowledge-extraction", args="$ARGUMENTS")
   ```
   The command parses `--workflow` to route to the appropriate extraction workflow in the skill. `--format` selects from the output templates in `references/output-templates.md`.
5. **Input Detection** — URL (starts with http/https) -> file path (path exists or contains /) -> description (default)
6. **Workflow Routing**:
   - `--workflow quick` -> Workflow 1 (Single Source Extraction)
   - `--workflow standard` -> Workflow 2 (Multi-Source Synthesis) — default
   - `--workflow deep` -> Full 5-phase research process from `references/research-process.md`
7. **Output Format** — Standard format from rd3:knowledge-extraction, respecting `--format` selection
8. **Error Handling** — File not found, URL inaccessible, no search results
9. **Related Commands** — `wt:info-seek`, `wt:info-research`, `rd3:deep-research`

#### R4: Update wt:info-seek delegation target

Update `plugins/wt/commands/info-seek.md`:
- Replace all references to `rd2:knowledge-seeker` with `rd3:knowledge-seeker`
- Keep the existing `--save` workflow integration intact
- This is a minimal change (find-and-replace) to redirect delegation

### Q&A

**Q1: Should we create new TypeScript scripts for the new reference files?**
A: No. The new reference files are markdown-only knowledge references (like the existing `references/core-principles.md`). No new scripts needed. The existing scripts (`detect-conflicts.ts`, `reconcile.ts`, `score-quality.ts`) remain unchanged.

**Q2: Should we update the plugin.json or any registration file?**
A: The new agent (`knowledge-seeker.md`) and command (`info-seek.md`) will be auto-discovered by Claude Code from the `plugins/rd3/agents/` and `plugins/rd3/commands/` directories. No manual registration needed.

**Q3: How much content should be copied verbatim vs restructured?**
A: Restructure for the rd3 reference file format. Don't copy the rd2 agent's 8-section anatomy verbatim — extract the *knowledge content* (methodology, competency lists, templates, protocols) and organize it into focused reference files. Each reference file should have proper frontmatter with `name`, `description`, `see_also` linking back to `rd3:knowledge-extraction`.

**Q4: Should we add tests?**
A: No new test scripts are needed. The existing `tests/benchmark.test.ts`, `tests/reconcile-cli.test.ts`, `tests/detect-conflicts-cli.test.ts`, and `tests/score-quality-cli.test.ts` cover the script functionality. The new reference files are passive knowledge — they don't execute. Verify with `bun run check` after changes.

**Q5: What about the `rd3:deep-research` skill?**
A: `rd3:deep-research` is a separate skill focused on enterprise-grade multi-source research with structured output (HTML reports, citation tracking). It complements `rd3:knowledge-extraction` but has a different scope. No changes needed to `rd3:deep-research`.

### Design

#### Architecture: Fat Skill, Thin Wrappers

```
                   rd3:knowledge-extraction (fat skill, v2.1.0)
 ┌────────────────────────────────────────────────────────────────────┐
 │  SKILL.md (main)                                                  │
 │  references/                                                      │
 │    ├── core-principles.md          (existing)                     │
 │    ├── extraction-workflows.md     (existing)                     │
 │    ├── tool-selection.md           (existing)                     │
 │    ├── validation-methods.md       (existing)                     │
 │    ├── conflict-resolution.md      (existing)                     │
 │    ├── deduplication.md            (existing)                     │
 │    ├── synthesis-patterns.md       (existing, enhanced per R1.7)  │
 │    ├── usage-examples.md           (existing)                     │
 │    ├── anti-patterns.md            (existing)                     │
 │    ├── research-methodology.md     (NEW — R1.1)                   │
 │    ├── research-process.md         (NEW — R1.2)                   │
 │    ├── source-evaluation.md        (NEW — R1.3)                   │
 │    ├── citation-attribution.md     (NEW — R1.4)                   │
 │    └── output-templates.md         (NEW — R1.5)                   │
 │  scripts/  (unchanged)                                            │
 │  tests/    (unchanged)                                            │
 └──────────────────┬─────────────────────────┬──────────────────────┘
                    │                         │
         ┌──────────▼──────────┐   ┌──────────▼──────────┐
         │ rd3:knowledge-      │   │ rd3:info-seek        │
         │ seeker (agent)      │   │ (command)            │
         │ ~100 lines          │   │ ~120 lines           │
         │ thin wrapper        │   │ thin wrapper         │
         └──────────┬──────────┘   └─────────────────────┘
                    │
         ┌──────────▼──────────┐
         │ wt:info-seek        │
         │ (updated to         │
         │  delegate to        │
         │  rd3 agent)         │
         └─────────────────────┘
```

#### File Inventory

| Action | File | Size | Description |
|--------|------|------|-------------|
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/research-methodology.md` | ~150 lines | PRISMA, meta-analysis, synthesis patterns |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/research-process.md` | ~120 lines | 5-phase process + decision framework |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/source-evaluation.md` | ~100 lines | Credibility, bias, evidence hierarchy |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/citation-attribution.md` | ~80 lines | Citation formats, attribution practices |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/output-templates.md` | ~180 lines | 4 structured output templates |
| EDIT | `plugins/rd3/skills/knowledge-extraction/references/synthesis-patterns.md` | +50 lines | Add anti-hallucination workflow, red flags, fallback protocol |
| EDIT | `plugins/rd3/skills/knowledge-extraction/SKILL.md` | +30 lines | Update "When to Use", references, version bump |
| CREATE | `plugins/rd3/agents/knowledge-seeker.md` | ~100 lines | Thin agent wrapper |
| CREATE | `plugins/rd3/commands/info-seek.md` | ~120 lines | Thin command wrapper |
| EDIT | `plugins/wt/commands/info-seek.md` | ~5 lines changed | Replace rd2 -> rd3 delegation |

**Total: 5 new files, 3 edited files. No script changes. No test changes.**

### Solution

Implementation order follows dependency chain:

1. **Create reference files first** (R1.1-R1.5) — no dependencies between them, can be done in parallel
2. **Enhance synthesis-patterns.md** (R1.7) — independent of new reference files
3. **Update SKILL.md** (R1.6) — depends on all reference files existing
4. **Create agent** (R2) — depends on updated skill
5. **Create command** (R3) — depends on updated skill
6. **Update wt:info-seek** (R4) — depends on new agent existing

### Plan

| Step | Task | Files | Depends On |
|------|------|-------|------------|
| 1a | Create `references/research-methodology.md` | 1 new | — |
| 1b | Create `references/research-process.md` | 1 new | — |
| 1c | Create `references/source-evaluation.md` | 1 new | — |
| 1d | Create `references/citation-attribution.md` | 1 new | — |
| 1e | Create `references/output-templates.md` | 1 new | — |
| 1f | Enhance `references/synthesis-patterns.md` | 1 edit | — |
| 2 | Update `SKILL.md` (version, references, "When to Use") | 1 edit | 1a-1f |
| 3 | Create `agents/knowledge-seeker.md` | 1 new | 2 |
| 4 | Create `commands/info-seek.md` | 1 new | 2 |
| 5 | Update `plugins/wt/commands/info-seek.md` (rd2->rd3) | 1 edit | 3 |
| 6 | Run `bun run check` — verify lint, typecheck, tests pass | — | 1-5 |

### Review

**Review checklist (post-implementation):**
- [ ] All 5 new reference files have proper frontmatter (`name`, `description`, `see_also`)
- [ ] All new reference files link back to `rd3:knowledge-extraction` in `see_also`
- [ ] `SKILL.md` version bumped to 2.1.0
- [ ] `SKILL.md` references section lists all new files
- [ ] Agent frontmatter has `skills: [rd3:knowledge-extraction, rd3:anti-hallucination, rd3:verification-chain]`
- [ ] Agent body follows thin wrapper pattern (no embedded research logic)
- [ ] Command frontmatter has `argument-hint` and `allowed-tools`
- [ ] Command delegates via `Skill(skill="rd3:knowledge-extraction", args="$ARGUMENTS")`
- [ ] `wt:info-seek` updated to reference `rd3:knowledge-seeker` (not rd2)
- [ ] No `console.*` calls in any file
- [ ] `bun run check` passes (lint + typecheck + test)

### Testing

**Verification steps:**
1. `bun run check` — must pass (no script changes, so existing tests should be unaffected)
2. Manual: invoke `/rd3:info-seek "React Server Components"` — should produce multi-source synthesis with citations
3. Manual: invoke `/rd3:info-seek paper.pdf --workflow deep` — should trigger 5-phase literature review
4. Manual: spawn `rd3:knowledge-seeker` agent — should delegate to knowledge-extraction skill
5. Manual: invoke `/wt:info-seek "test topic"` — should now delegate to rd3:knowledge-seeker

### Artifacts

| Type | Path | Agent | Date |
| ---- | ---- | ----- | ---- |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/research-methodology.md` | — | — |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/research-process.md` | — | — |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/source-evaluation.md` | — | — |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/citation-attribution.md` | — | — |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/output-templates.md` | — | — |
| Skill | `plugins/rd3/skills/knowledge-extraction/SKILL.md` | — | — |
| Agent | `plugins/rd3/agents/knowledge-seeker.md` | — | — |
| Command | `plugins/rd3/commands/info-seek.md` | — | — |
| Command | `plugins/wt/commands/info-seek.md` (edit) | — | — |

### References

- Source agent: `plugins/rd2/agents/knowledge-seeker.md` (~640 lines)
- Target skill: `plugins/rd3/skills/knowledge-extraction/SKILL.md`
- Existing command pattern: `plugins/wt/commands/info-seek.md` (delegates to rd2:knowledge-seeker)
- Agent thin wrapper pattern: `plugins/rd3/agents/expert-agent.md`
- Command thin wrapper pattern: `plugins/rd3/commands/skill-evaluate.md`
- Related skills: `rd3:anti-hallucination`, `rd3:verification-chain`, `rd3:deep-research`
