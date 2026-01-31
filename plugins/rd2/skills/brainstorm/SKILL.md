---
name: brainstorm
description: This skill should be used when the user asks to "brainstorm ideas", "explore solutions", "consider options", "research approaches", or mentions needing multiple solution options with trade-offs. Integrates research, ideation, and rd2 tasks CLI for automatic task file creation.
---

# rd2:brainstorm - Brainstorm Ideas Into Tasks

## Overview

Transform ideas and problems into structured solutions with automatic task file creation. This skill integrates research, ideation, and task management into a seamless 4-phase workflow.

**Key capability:** This skill integrates with the rd2 tasks CLI for automatic task file creation and kanban board management.

## Quick Start

```bash
# Via tasks-brainstorm command
/rd2:tasks-brainstorm "Add user authentication to the API"

# From task file
/rd2:tasks-brainstorm docs/prompts/0140_brainstorm_input_processing.md
```

## The 4-Phase Workflow

### Phase 1: Input Processing

Parse and validate input, extract context.

**Input Type Detection:**
```
IF input contains "/" or "\" AND ends with ".md":
    → Treat as file path
ELSE:
    → Treat as issue description
```

**For file paths:**
1. Resolve relative paths to absolute paths
2. Read task file content
3. Parse YAML frontmatter (status, WBS, name, description)
4. Extract sections: Background, Requirements, Solutions

**Validation & Clarification:**
- Check input is not empty
- Verify file exists if path provided
- Use `AskUserQuestion` to clarify ambiguous or insufficient information
- Confirm understanding with user before proceeding

**Clarification scenarios:**
- Input is too brief (<20 characters)
- Task file has empty Background or Requirements sections
- Technical terms are unclear or undefined
- Multiple valid interpretations exist

*For detailed input processing workflow, see `references/workflows.md`*

### Phase 2: Research & Ideation

Research and generate 2-3 solution approaches with trade-offs.

**Tool Priority Order:**
1. `ref_search_documentation` - API/library documentation
2. `WebSearch` - Recent facts, announcements (< 6 months)
3. `rd2:knowledge-seeker` - Literature review, cross-referencing

**Generate approaches:**
- Create 2-3 different solution options
- Document trade-offs (pros/cons)
- Mark recommended approach with reasoning
- Include implementation considerations

**Ask clarifying questions** (one at a time, prefer multiple choice)

**Document findings:**
- Cite all sources with dates
- Assign confidence levels (HIGH/MEDIUM/LOW)
- Record reasoning for approach selection

*For detailed research guidance and tool selection, see `references/workflows.md` and `references/tool-selection.md`*

### Phase 3: Structured Output

Format research findings into reviewable markdown.

**Generate markdown sections:**
1. **Overview** - Context and problem summary
2. **Approaches** - 2-3 options with trade-offs
3. **Recommendations** - Recommended approach with reasoning
4. **Next Steps** - Potential task items

**Present incrementally:**
- Show Overview → Ask "Does this look right?"
- Show Approaches → Ask "Any clarifications needed?"
- Show Recommendations → Ask "Ready for task creation?"

**Save output** (on confirmation):
- Path: `docs/plans/YYYY-MM-DD-<topic>-brainstorm.md`
- Use filename-safe topic names

*For detailed output templates and examples, see `references/workflows.md` and `examples/brainstorm-output.md`*

### Phase 4: Task Creation

Convert brainstorming output into task files via tasks CLI.

**Extract task-worthy items:**
- Parse brainstorming output for action items
- Filter for concrete, executable items
- Group related items logically
- Generate task names from descriptions

**Present to user** (via AskUserQuestion):
```
Found N potential tasks:
1. [Task 1] - [Brief description]
2. [Task 2] - [Brief description]
3. [Task 3] - [Brief description]

Options:
a) Create all N tasks
b) Select specific tasks
c) Skip task creation
```

**Batch create tasks:**
```bash
# Create tasks via Bash tool (direct CLI calls)
tasks create "[Task 1 name]"
tasks create "[Task 2 name]"
tasks create "[Task 3 name]"
tasks refresh
```

**CRITICAL: Update task files with context**
After creating each task file, immediately update it with:
- **Background**: Context from brainstorm session, why this task matters
- **Requirements**: Specific acceptance criteria, dependencies, success conditions
- **References**: Links to brainstorm output, research sources

**Report completion:**
- List created task files with WBS numbers
- Provide absolute file paths
- Confirm Background and Requirements were added
- Confirm kanban board updated
- Offer next steps

*For detailed task creation workflow, see `references/workflows.md`*

## Key Principles

1. **Two input modes** - File path or issue description
2. **Clarify ambiguities** - Use `AskUserQuestion` for unclear/insufficient input
3. **Anti-hallucination first** - Verify before generating (see `rd2:anti-hallucination`)
4. **Tool priority order** - ref → WebSearch → rd2:knowledge-seeker
5. **Multiple approaches** - Always generate 2-3 options
6. **One question at a time** - Don't overwhelm user
7. **Task CLI integration** - Use Bash tool with `tasks` CLI directly
8. **Populate task context** - Always add Background and Requirements to created tasks
9. **Graceful degradation** - Continue without unavailable tools
10. **Source citation** - Always cite with dates and confidence

## Tool Selection

| Research Need | Primary Tool | Fallback |
|--------------|--------------|----------|
| API/Library docs | `ref_search_documentation` | WebSearch → rd2:knowledge-seeker |
| Recent changes (<6mo) | `WebSearch` | `ref_search_documentation` |
| Literature review | `rd2:knowledge-seeker` | `WebSearch` |
| Local context | `Read`/`Grep` | - |

*For detailed tool selection guidance, see `references/tool-selection.md`*

## Error Handling

| Phase | Error | Action |
|-------|-------|--------|
| Input Processing | File not found | Clear error message, suggest checking path |
| Research | Tool unavailable | Continue with fallback, note reduced confidence |
| Output | Save fails | Display output, suggest manual save |
| Task Creation | Tasks CLI fails | Report error, suggest manual creation |

## Anti-Hallucination Protocol

Apply `rd2:anti-hallucination` protocol for all research:

**Before any claim:**
1. **Search** - Use `ref_search_documentation` first
2. **Verify** - Check version and recency
3. **Cite** - Include source with date
4. **Score** - Assign confidence level

**Confidence levels:**
- **HIGH** (>90%) - Direct quote from official docs (2024+)
- **MEDIUM** (70-90%) - Synthesized from multiple sources
- **LOW** (<70%) - Uncertain, needs verification

## References

### Detailed Workflows
- **`references/workflows.md`** - Complete 4-phase workflow with detailed steps, examples, and error recovery

### Tool Selection
- **`references/tool-selection.md`** - Comprehensive tool selection guide with decision trees and scenarios

### Examples
- **`examples/brainstorm-output.md`** - Sample brainstorm output for authentication implementation

### Related Skills
- **`rd2:anti-hallucination`** - Verification protocol for research and claims
- **`rd2:tasks`** - Task CLI for task file creation and management
- **`rd2:knowledge-seeker`** - Research specialist for literature review
