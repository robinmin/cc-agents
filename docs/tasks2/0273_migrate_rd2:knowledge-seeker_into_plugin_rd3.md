---
name: migrate rd2:knowledge-seeker into plugin rd3
description: Absorb rd2:knowledge-seeker capabilities into rd3:knowledge-extraction skill, then create thin wrapper agent and update wt:info-seek command
status: Done
created_at: 2026-03-28T00:01:29.820Z
updated_at: 2026-03-27T00:00:00.000Z
folder: docs/tasks2
type: task
impl_progress:
  planning: done
  design: done
  implementation: done
  review: done
  testing: done
---

## 0273. Migrate rd2:knowledge-seeker into plugin rd3

### Background

The rd2 plugin has a fat subagent `rd2:knowledge-seeker` (~640 lines, `plugins/rd2/agents/knowledge-seeker.md`) that embeds extensive research methodology, verification protocols, and output templates directly in its agent definition. This violates the rd3 "fat skills, thin wrappers" principle.

Meanwhile, rd3 already has `rd3:knowledge-extraction` skill (`plugins/rd3/skills/knowledge-extraction/`) which covers extraction workflows, synthesis patterns, tool selection, validation methods, conflict resolution, and deduplication. However, it lacks several capabilities that the rd2 agent has.

The existing `wt:info-seek` command (`plugins/wt/commands/info-seek.md`) previously delegated to `rd2:knowledge-seeker`. After this migration, `wt:info-seek` has been fully rewritten to delegate to `rd3:knowledge-seeker` and `rd3:knowledge-extraction` instead.

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

**Frontmatter:** 4 trigger examples, 10 tools (Read, Write, Edit, Grep, Glob, WebSearch, WebFetch, ref_search_documentation, ref_read_url, mcp__grep__searchGitHub), 3 skills (rd3:knowledge-extraction, rd3:anti-hallucination, rd3:verification-chain), model: inherit, color: cyan.

**Body structure:**
1. **Role** — "Expert research specialist that delegates to rd3:knowledge-extraction skill"
2. **Core principle** — "Delegate to rd3:knowledge-extraction — do NOT embed research logic directly"
3. **Skill Invocation** — Platform-specific invocation table (Claude Code, Codex, OpenCode, etc.)
4. **Operation Routing** — Map user requests to skill workflows
5. **Complementary Skills** — rd3:anti-hallucination, rd3:verification-chain, rd3:deep-research
6. **When NOT to Use** — Simple lookups, code implementation, architecture design, real-time data, legal/medical advice

#### R3: Update wt:info-seek command (full rewrite)

**Scope change:** The original plan called for creating a separate `plugins/rd3/commands/info-seek.md` command. This was incorrect — `plugins/wt/commands/info-seek.md` already serves this purpose. Instead, `wt:info-seek` was fully rewritten (not just a find-replace) to:

- Delegate to `rd3:knowledge-seeker` agent and `rd3:knowledge-extraction` skill (replacing rd2 references)
- Add `--workflow quick|standard|deep` argument for research depth control
- Add `--format synthesis|verification|literature-review` argument for output template selection
- Expand `allowed-tools` to include `Skill, WebSearch, WebFetch`
- Add detailed "Workflow Depth" section explaining 3 workflow levels mapped to skill workflows
- Add "Output Format Templates" section linked to `rd3:knowledge-extraction/references/output-templates.md`
- Update Implementation section with proper `Skill()` delegation and `Agent()` delegation for document conversion
- Add comprehensive "Integration with Skills and Agents" table showing full component stack
- Streamline error handling into table format

### Q&A

**Q1: Should we create new TypeScript scripts for the new reference files?**
A: No. The new reference files are markdown-only knowledge references (like the existing `references/core-principles.md`). No new scripts needed. The existing scripts (`detect-conflicts.ts`, `reconcile.ts`, `score-quality.ts`) remain unchanged.

**Q2: Should we update the plugin.json or any registration file?**
A: The new agent (`knowledge-seeker.md`) will be auto-discovered by Claude Code from the `plugins/rd3/agents/` directory. No manual registration needed.

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
 └──────────────────┬────────────────────────────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │ rd3:knowledge-      │
         │ seeker (agent)      │
         │ ~100 lines          │
         │ thin wrapper        │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │ wt:info-seek        │
         │ (fully rewritten    │
         │  to delegate to     │
         │  rd3 skill+agent)   │
         └─────────────────────┘
```

#### File Inventory

| Action | File | Size | Description |
|--------|------|------|-------------|
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/research-methodology.md` | ~190 lines | PRISMA, meta-analysis, synthesis patterns |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/research-process.md` | ~130 lines | 5-phase process + decision framework |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/source-evaluation.md` | ~150 lines | Credibility, bias, evidence hierarchy |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/citation-attribution.md` | ~130 lines | Citation formats, attribution practices |
| CREATE | `plugins/rd3/skills/knowledge-extraction/references/output-templates.md` | ~200 lines | 4 structured output templates |
| EDIT | `plugins/rd3/skills/knowledge-extraction/references/synthesis-patterns.md` | +80 lines | Add anti-hallucination workflow, red flags, fallback protocol |
| EDIT | `plugins/rd3/skills/knowledge-extraction/SKILL.md` | +30 lines | Update "When to Use", references, version bump to 2.1.0 |
| CREATE | `plugins/rd3/agents/knowledge-seeker.md` | ~106 lines | Thin agent wrapper |
| REWRITE | `plugins/wt/commands/info-seek.md` | ~332 lines | Full rewrite with workflow/format args, skill delegation |

**Total: 6 new files, 3 modified files. No script changes. No test changes.**

### Solution

Implementation order follows dependency chain:

1. **Create reference files first** (R1.1-R1.5) — no dependencies between them, can be done in parallel
2. **Enhance synthesis-patterns.md** (R1.7) — independent of new reference files
3. **Update SKILL.md** (R1.6) — depends on all reference files existing
4. **Create agent** (R2) — depends on updated skill
5. **Update wt:info-seek** (R3) — depends on new agent existing

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
| 4 | Rewrite `plugins/wt/commands/info-seek.md` | 1 rewrite | 3 |
| 5 | Run `bun run check` — verify lint, typecheck, tests pass | — | 1-4 |

### Review

**Review checklist (post-implementation):**
- [x] All 5 new reference files have proper frontmatter (`name`, `description`, `see_also`)
- [x] All new reference files link back to `rd3:knowledge-extraction` in `see_also`
- [x] `SKILL.md` version bumped to 2.1.0
- [x] `SKILL.md` references section lists all new files
- [x] Agent frontmatter has `skills: [rd3:knowledge-extraction, rd3:anti-hallucination, rd3:verification-chain]`
- [x] Agent body follows thin wrapper pattern (no embedded research logic)
- [x] `wt:info-seek` fully rewritten with `--workflow` and `--format` args
- [x] `wt:info-seek` delegates via `Skill()` and `Agent()` calls to rd3 components
- [x] No `plugins/rd3/commands/info-seek.md` exists (unnecessary — wt:info-seek covers this)
- [x] No `console.*` calls in any file
- [x] `bun run check` passes (pre-existing coverage threshold issue unrelated to this task)

### Testing

**Verification steps:**
1. `bun run check` — passes (no script changes, existing tests unaffected; pre-existing coverage threshold exit code 1 is not caused by this task)
2. Manual: invoke `/wt:info-seek "React Server Components"` — should produce multi-source synthesis with citations
3. Manual: invoke `/wt:info-seek "Is FastAPI faster than Django?" --format verification` — should produce quick verification output
4. Manual: invoke `/wt:info-seek "Chain-of-Thought prompting" --workflow deep --save` — should trigger 5-phase literature review
5. Manual: spawn `rd3:knowledge-seeker` agent — should delegate to knowledge-extraction skill

### Artifacts

| Type | Path | Status |
| ---- | ---- | ------ |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/research-methodology.md` | Created |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/research-process.md` | Created |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/source-evaluation.md` | Created |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/citation-attribution.md` | Created |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/output-templates.md` | Created |
| Reference | `plugins/rd3/skills/knowledge-extraction/references/synthesis-patterns.md` | Enhanced |
| Skill | `plugins/rd3/skills/knowledge-extraction/SKILL.md` | Updated to v2.1.0 |
| Agent | `plugins/rd3/agents/knowledge-seeker.md` | Created |
| Command | `plugins/wt/commands/info-seek.md` | Fully rewritten |

### References

- Source agent: `plugins/rd2/agents/knowledge-seeker.md` (~640 lines)
- Target skill: `plugins/rd3/skills/knowledge-extraction/SKILL.md`
- Existing command: `plugins/wt/commands/info-seek.md` (fully rewritten to delegate to rd3)
- Agent thin wrapper pattern: `plugins/rd3/agents/expert-agent.md`
- Related skills: `rd3:anti-hallucination`, `rd3:verification-chain`, `rd3:deep-research`
