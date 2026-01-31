# Brainstorm 4-Phase Workflow

This document provides detailed guidance for each phase of the brainstorm workflow. For a quick overview, see the main SKILL.md.

## Phase 1: Input Processing

**Goal:** Parse and validate input, extract context.

### Input Type Detection

```
IF input contains "/" or "\" AND ends with ".md":
    → Treat as file path
ELSE:
    → Treat as issue description
```

### Reading Task Files

When a file path is detected:

1. **Resolve path** - Convert relative paths to absolute paths
2. **Read content** - Use Read tool to get file contents
3. **Parse frontmatter** - Extract YAML fields:
   - `status`: Current task status
   - `wbs`: Work breakdown structure number
   - `name`: Task identifier
   - `description`: Brief summary
4. **Extract sections** - Parse markdown body:
   - Background context
   - Requirements
   - Existing solutions (if any)

### Validation Checklist

- [ ] Input is not empty
- [ ] File exists (if path provided)
- [ ] YAML frontmatter is valid
- [ ] Required fields present (status, wbs, name)
- [ ] Content has meaningful length (>50 characters)

### Context Preparation

Structure extracted context for next phase:

```yaml
type: "file" | "description"
content: "<extracted content>"
metadata:
  wbs: "0140"
  name: "brainstorm-input-processing"
  description: "Add input processing capability"
sections:
  background: "Current brainstorm skill only accepts text..."
  requirements: "- Support file path input\n- Parse YAML..."
  solutions: "None yet"
```

### Clarification via AskUserQuestion

Before proceeding to research phase, use `AskUserQuestion` to clarify:

**When to clarify:**
- Input is too brief (<20 characters)
- Background section is empty or missing key context
- Requirements are vague or incomplete
- Technical terms are undefined
- Multiple valid interpretations exist

**Example clarifications:**
```yaml
# Insufficient context detected
AskUserQuestion:
  - question: "What type of authentication do you need?"
    header: "Auth Type"
    options:
      - label: "JWT tokens"
        description: "Stateless, good for APIs, requires careful key management"
      - label: "Session-based"
        description: "Server-managed, simpler, good for traditional web apps"
      - label: "OAuth2/OIDC"
        description: "Third-party login (Google, GitHub), more complex setup"
    multiSelect: false
```

### Error Handling

| Error | Action |
|-------|--------|
| Empty input | Prompt user for issue description or file path |
| File not found | Provide clear error with absolute path, suggest checking file location |
| Invalid YAML | Report parsing error, suggest validating frontmatter |
| Missing fields | List missing required fields, ask if task file is incomplete |

---

## Phase 2: Research & Ideation

**Goal:** Research and generate 2-3 solution approaches with trade-offs.

### Research Need Detection

Identify what needs verification:

1. **Technical terms** - APIs, libraries, frameworks, protocols
2. **Version sensitivity** - Features that changed in last 6 months
3. **Best practices** - Architecture patterns, security considerations
4. **Comparisons** - Between different approaches or tools

### Tool Selection Priority

Follow this order for research:

```
1. ref_search_documentation
   └─ For API/library documentation
   └─ Most authoritative source

2. WebSearch
   └─ For recent facts, announcements (< 6 months)
   └─ When docs unavailable or unclear

3. rd2:knowledge-seeker (wt:super-researcher)
   └─ For literature review, cross-referencing
   └─ For complex research requiring synthesis
```

See `references/tool-selection.md` for detailed tool usage guidance.

### Approach Generation

Generate 2-3 distinct solution options:

**Approach Structure:**
```markdown
#### Approach 1: [Descriptive Name] ⭐ Recommended (if preferred)

**Description:** 2-3 sentences explaining the approach

**Trade-offs:**
- **Pros:**
  - Advantage 1
  - Advantage 2
- **Cons:**
  - Disadvantage 1
  - Disadvantage 2

**Implementation Notes:**
- Key technical considerations
- Dependencies or prerequisites
- Estimated complexity

**Confidence:** HIGH/MEDIUM/LOW
```

### Clarifying Questions

Ask one question at a time, prefer multiple choice:

**Good examples:**
- "Should performance or simplicity be prioritized?"
  - a) Performance (may add complexity)
  - b) Simplicity (may impact performance)
  - c) Balanced approach

- "What's your experience level with [technology]?"
  - a) Expert (comfortable with advanced patterns)
  - b) Intermediate (familiar but need guidance)
  - c) Beginner (need detailed explanations)

**Avoid:**
- Asking multiple questions at once
- Open-ended questions without options
- Questions answerable from context

### Source Citation Format

```markdown
### Sources
- [FastAPI Authentication](https://fastapi.tiangolo.com/tutorial/security/) - Verified: 2024-11-15
- [OAuth 2.0 Specification](https://oauth.net/2/) - Verified: 2024-10-20
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725) - Verified: 2024-09-05
```

### Confidence Scoring

| Level | Range | Criteria |
|-------|-------|----------|
| **HIGH** | >90% | Direct quote from official docs (2024+) |
| **MEDIUM** | 70-90% | Synthesized from multiple authoritative sources |
| **LOW** | <70% | Uncertain, memory-based, or needs verification |

---

## Phase 3: Structured Output

**Goal:** Format research findings into reviewable markdown.

### Section Generation

Create four main sections:

1. **Overview** (100-150 words)
   - Context and problem summary
   - Why this matters
   - Current state

2. **Approaches** (200-300 words each)
   - 2-3 options with trade-offs
   - Implementation considerations
   - Confidence levels

3. **Recommendations** (100-150 words)
   - Recommended approach with reasoning
   - Key factors in decision
   - When to consider alternatives

4. **Next Steps** (bulleted list)
   - Potential task items
   - Research needs
   - Implementation prerequisites

### Interactive Presentation

Present sections incrementally:

```
1. Show Overview → "Does this accurately capture the problem?"
2. Show Approaches → "Any clarifications needed on these options?"
3. Show Recommendations → "Ready to proceed with task creation?"
```

### File Saving

**Naming convention:**
```
docs/plans/YYYY-MM-DD-<topic>-brainstorm.md
```

**Example:**
```
docs/plans/2024-11-20-authentication-brainstorm.md
docs/plans/2024-11-20-task-cli-integration-brainstorm.md
```

**Filename-safe topics:**
- Replace spaces with hyphens
- Remove special characters
- Limit to 50 characters
- Use lowercase

### Output Template

```markdown
# Brainstorm: [Topic]

**Date:** YYYY-MM-DD
**WBS:** [Task WBS if applicable]

## Overview

[Context and problem summary]

## Approaches

### Approach 1: [Name] ⭐ Recommended

**Description:** [2-3 sentences]

**Trade-offs:**
- **Pros:**
  - [Advantage 1]
  - [Advantage 2]
- **Cons:**
  - [Disadvantage 1]
  - [Disadvantage 2]

**Implementation Notes:**
- [Technical considerations]
- [Dependencies]

**Confidence:** HIGH/MEDIUM/LOW
**Sources:** [Citations]

### Approach 2: [Name]

[Same structure as above]

## Recommendations

[Recommended approach with reasoning]

## Next Steps (Potential Tasks)

1. [Task item 1]
2. [Task item 2]
3. [Task item 3]

---

**Generated by:** rd2:brainstorm
**Anti-hallucination:** Applied via rd2:anti-hallucination
```

---

## Phase 4: Task Creation

**Goal:** Convert brainstorming output into task files via tasks CLI.

### Task Extraction

Parse brainstorming output for action items:

**Task-worthy criteria:**
- Concrete and executable
- Has clear completion condition
- Can be assigned to someone
- Estimated effort >30 minutes

**Filter examples:**
- ✓ "Implement input parsing for file paths"
- ✓ "Add YAML frontmatter validation"
- ✗ "Consider performance implications" (too vague)
- ✗ "Research options" (already done)

### Task Naming

Generate names from descriptions:

**Pattern:** `<verb>-<object>`

**Examples:**
- "Implement input parsing" → `input-parsing`
- "Add YAML validation" → `yaml-validation`
- "Create task CLI integration" → `task-cli-integration`

### Interactive Task Selection

Present via AskUserQuestion:

```
Found N potential tasks:

1. input-parsing - Parse file paths and issue descriptions
2. yaml-validation - Validate YAML frontmatter structure
3. task-cli-integration - Connect to tasks CLI for automatic task creation

Options:
a) Create all N tasks
b) Select specific tasks (enter numbers)
c) Skip task creation
d) Modify task names/descriptions
```

### Batch Task Creation

Use tasks CLI via Bash tool to create tasks:

```bash
# Create each task via Bash tool
tasks create "input-parsing"
tasks create "yaml-validation"
tasks create "task-cli-integration"

# Refresh kanban board
tasks refresh
```

### CRITICAL: Populate Task Context

After creating each task file, **MUST** update it with Background and Requirements:

**For each created task file:**
1. Read the newly created task file
2. Update `Background` section with:
   - Context from brainstorm session
   - Why this task matters
   - How it connects to overall goal
3. Update `Requirements` section with:
   - Specific acceptance criteria
   - Dependencies on other tasks
   - Success conditions
   - Relevant constraints

**Example update:**
```markdown
## Background

Generated from brainstorm session on 2024-11-20. The brainstorm identified input parsing as Phase 1 of the 4-phase workflow. This task enables the brainstorm skill to accept both file paths and issue descriptions as input.

## Requirements

- Detect file paths by checking for "/" or "\" and ".md" extension
- Resolve relative paths to absolute paths
- Read and parse YAML frontmatter from task files
- Extract Background, Requirements, and Solutions sections
- Validate input is not empty
- Use AskUserQuestion to clarify ambiguous or insufficient information
- Handle file-not-found errors gracefully
```

### Completion Report

Provide comprehensive summary:

```markdown
## Task Creation Complete

Created 3 tasks (with Background and Requirements populated):

- **0144**: input-parsing
  - Path: /Users/robin/projects/cc-agents/docs/prompts/0144_input-parsing.md
  - Status: todo
  - Background: Added (context from brainstorm session)
  - Requirements: Added (4 acceptance criteria defined)

- **0145**: yaml-validation
  - Path: /Users/robin/projects/cc-agents/docs/prompts/0145_yaml-validation.md
  - Status: todo
  - Background: Added (context from brainstorm session)
  - Requirements: Added (3 acceptance criteria defined)

- **0146**: task-cli-integration
  - Path: /Users/robin/projects/cc-agents/docs/prompts/0146_task-cli-integration.md
  - Status: todo
  - Background: Added (context from brainstorm session)
  - Requirements: Added (5 acceptance criteria defined)

Kanban board updated: docs/prompts/.kanban.md

Next steps:
- /rd2:tasks-plan --task 0144 --execute
- Review and prioritize tasks in kanban board
```

### Error Handling

| Error | Action |
|-------|--------|
| Tasks CLI unavailable | Display task list, suggest manual creation |
| Task creation fails | Report specific error, offer retry |
| Kanban update fails | Confirm tasks created, suggest manual refresh |
| Duplicate task name | Suggest alternative name, confirm with user |

---

## Error Recovery

### Graceful Degradation

When tools are unavailable:

1. **Continue with available tools** - Don't fail completely
2. **Note reduced confidence** - Inform user of limitations
3. **Suggest manual steps** - Provide fallback instructions

### Retry Logic

For transient failures:

1. **Wait** - 2-3 seconds before retry
2. **Retry** - Up to 3 attempts
3. **Fallback** - To alternative tool or manual process
4. **Report** - Clear explanation of what failed

### Partial Success Handling

When some steps succeed and others fail:

1. **Report successes** - Confirm what worked
2. **Report failures** - Explain what didn't work
3. **Provide recovery options** - How to complete remaining steps
4. **Save intermediate state** - Don't lose progress
