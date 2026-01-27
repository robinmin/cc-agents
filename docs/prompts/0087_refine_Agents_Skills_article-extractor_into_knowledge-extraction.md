---
name: refine Agents Skills article-extractor into knowledge-extraction
description: Task: refine Agents Skills article-extractor into knowledge-extraction
status: Done
task_type: auto
created_at: 2026-01-26 21:43:26
updated_at: 2026-01-27 10:45:00
impl_progress:
  phase_0_interview:
    status: completed
  phase_1_refinement:
    status: completed
  phase_2_design:
    status: completed
  phase_3_decomposition:
    status: completed
  phase_4_orchestration:
    status: completed
---

## 0087. refine Agents Skills article-extractor into knowledge-extraction

### Background

We already have a Agent Skill article-extractor in `plugins/rd/skills/article-extractor/SKILL.md`.

But it combines with external tools to load data from websites. Meanwhile, we already have our own Agent Skill in `plugins/wt/skills/markitdown-browser` which leverages agent-browser with markitdown to extract data from websites and then convert it into a markdown format.

So what we only need from this Agent Skill is to how to extract knowledge from a given website markdown file.

Meanwhile, we also have a Agent Skill in `plugins/rd2/skills/knowledge-extraction` which be design to extract knowledge from a given website markdown file.

We need to merge the knowledge about how to extract knowledge from `plugins/rd/skills/article-extractor/SKILL.md` into `plugins/rd2/skills/knowledge-extraction` after validation if any valuable information.

### Q&A (Interview Phase)

**Q: Should we merge article-extractor patterns into knowledge-extraction?**
**A:** After analysis, article-extractor focuses on external tool installation (reader, trafilatura) and website data loading, which is redundant with markitdown-browser. The knowledge-extraction skill already handles knowledge extraction from markdown with proper verification. No merging needed - article-extractor can be considered deprecated in favor of markitdown-browser + knowledge-extraction.

**Q: What is the actual requirement?**
**A:** Create a unified `info-seek` command that orchestrates knowledge-extraction + markitdown-browser to extract knowledge from file paths/URLs or search via ref MCP.

### Requirements / Objectives

- Extract knowledge from `plugins/rd/skills/article-extractor/SKILL.md`

- Use mcp ref and other tools to do validation works.

- Merge the valid knowledge into `plugins/rd2/skills/knowledge-extraction` if any.

- use slash command `/rd2:command-add wt info-seek` to use Agents SKills(knowledge-extraction, markitdown-browser and etc) to extract knowledge from a given file path/URL or a set of description to search from website via mcp ref.

### Solutions / Goals

**Analysis Summary:**

After analyzing `article-extractor` and `knowledge-extraction` skills:

1. **article-extractor** (plugins/rd/skills/article-extractor/SKILL.md):
   - Focus: Website data loading with external tools (reader, trafilatura)
   - Redundant: markitdown-browser already handles website→markdown conversion
   - No unique knowledge extraction patterns to merge

2. **knowledge-extraction** (plugins/rd2/skills/knowledge-extraction/SKILL.md):
   - Already well-designed for knowledge extraction from markdown
   - Has comprehensive verification, triangulation, and citation patterns
   - Uses MCP tools (ref, searchGitHub, WebSearch) for validation

3. **markitdown-browser** (plugins/wt/skills/markitdown-browser/SKILL.md):
   - Handles website→markdown conversion
   - Supports PDFs, Office docs, and web pages

**Conclusion:** No merging needed. The real value is creating a unified `info-seek` command that orchestrates these skills.

**Implementation Approach:**

Create `/wt:info-seek` command that:
1. Accepts file path, URL, or search description as input
2. Routes to appropriate workflow:
   - **File path**: Read markdown → knowledge-extraction
   - **URL**: markitdown-browser → markdown → knowledge-extraction
   - **Description**: ref MCP search → extract from results
3. Outputs verified knowledge with citations and confidence levels

#### Plan

**Phase 1: Analysis & Validation** (COMPLETE)
- [x] Read and analyze article-extractor skill
- [x] Read and analyze knowledge-extraction skill
- [x] Read and analyze markitdown-browser skill
- [x] Determine no merging needed (article-extractor is redundant)

**Phase 2: Create info-seek Command** (COMPLETE)
- [x] Create `/wt:info-seek` command with proper frontmatter
- [x] Define input parameters (file path/URL/description)
- [x] Implement routing logic for different input types
- [x] Add error handling and validation

**Phase 3: Test & Verify**
- [ ] Test with file path input
- [ ] Test with URL input
- [ ] Test with description search
- [ ] Verify output format matches knowledge-extraction standards

### Artifacts

- **Created:** `/wt:info-seek` command in `plugins/wt/commands/info-seek.md`

### References
